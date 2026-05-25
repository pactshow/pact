// Base44-shaped facade over Supabase.
//
// The original Base44 SDK exposed:
//   base44.entities.Foo.list(orderBy?, limit?)
//   base44.entities.Foo.filter({ field: value })
//   base44.entities.Foo.get(id)
//   base44.entities.Foo.create(data)
//   base44.entities.Foo.update(id, data)
//   base44.entities.Foo.delete(id)
//   base44.auth.me()
//   base44.auth.logout()
//   base44.auth.redirectToLogin()
//   base44.functions.invoke(name, body)
//   base44.integrations.Core.InvokeLLM({...})
//   base44.appLogs.logUserInApp(name)
//
// Keeping that surface lets the existing pages/components work unchanged
// while the actual storage moves to Supabase.

import { supabase } from '@/lib/supabase';

// Map entity name (Base44 PascalCase) to Postgres table name (snake plural).
const TABLE_MAP = {
  Contract: 'contracts',
  Payment: 'payments',
  Profile: 'profiles',
  Connection: 'connections',
  Notification: 'notifications',
  ContractTemplate: 'contract_templates',
  EventGroup: 'event_groups',
};

// Base44 sorted by `created_date`; our column is `created_at`.
const COLUMN_ALIASES = {
  created_date: 'created_at',
  updated_date: 'updated_at',
  paid_date: 'paid_date',
  due_date: 'due_date',
  performance_date: 'performance_date',
};

const aliasColumn = (name) => COLUMN_ALIASES[name] ?? name;

// Add `created_date` / `updated_date` aliases on returned rows so existing
// components reading those fields keep working.
const addLegacyDateAliases = (row) => {
  if (!row || typeof row !== 'object') return row;
  if (row.created_at && !('created_date' in row)) row.created_date = row.created_at;
  if (row.updated_at && !('updated_date' in row)) row.updated_date = row.updated_at;
  return row;
};

const aliasRows = (data) =>
  Array.isArray(data) ? data.map(addLegacyDateAliases) : addLegacyDateAliases(data);

const throwIfError = (error, context) => {
  if (error) {
    const e = new Error(`${context}: ${error.message}`);
    e.cause = error;
    throw e;
  }
};

// Translate Base44 orderBy ("-created_date" / "performance_date") to Supabase
// .order(column, { ascending }).
const applyOrder = (query, orderBy) => {
  if (!orderBy) return query;
  const ascending = !orderBy.startsWith('-');
  const col = aliasColumn(orderBy.replace(/^-/, ''));
  return query.order(col, { ascending });
};

const entity = (name) => {
  const table = TABLE_MAP[name];
  if (!table) throw new Error(`Unknown entity: ${name}`);

  return {
    async list(orderBy, limit) {
      let q = supabase.from(table).select('*');
      q = applyOrder(q, orderBy);
      if (limit) q = q.limit(limit);
      const { data, error } = await q;
      throwIfError(error, `${name}.list`);
      return aliasRows(data);
    },

    async filter(where = {}, orderBy, limit) {
      let q = supabase.from(table).select('*');
      for (const [k, v] of Object.entries(where)) {
        q = q.eq(aliasColumn(k), v);
      }
      q = applyOrder(q, orderBy);
      if (limit) q = q.limit(limit);
      const { data, error } = await q;
      throwIfError(error, `${name}.filter`);
      return aliasRows(data);
    },

    async get(id) {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .eq('id', id)
        .single();
      throwIfError(error, `${name}.get`);
      return aliasRows(data);
    },

    async create(values) {
      // Strip computed/server-managed fields a caller might have left in:
      const { id, created_date, updated_date, created_at, updated_at, ...payload } = values || {};
      // Stamp ownership on tables that have user_id / created_by.
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        if (table === 'contracts' && !payload.created_by) payload.created_by = user.id;
        if (
          (table === 'profiles' || table === 'notifications' || table === 'contract_templates')
          && !payload.user_id
        ) {
          payload.user_id = user.id;
        }
      }
      const { data, error } = await supabase
        .from(table)
        .insert(payload)
        .select()
        .single();
      throwIfError(error, `${name}.create`);
      return aliasRows(data);
    },

    async update(id, values) {
      const { id: _id, created_date, updated_date, created_at, updated_at, ...payload } = values || {};
      const { data, error } = await supabase
        .from(table)
        .update(payload)
        .eq('id', id)
        .select()
        .single();
      throwIfError(error, `${name}.update`);
      return aliasRows(data);
    },

    async delete(id) {
      const { error } = await supabase.from(table).delete().eq('id', id);
      throwIfError(error, `${name}.delete`);
    },
  };
};

const entities = new Proxy({}, {
  get: (_target, prop) => entity(prop),
});

const auth = {
  async me() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    if (!user) {
      const e = new Error('Not authenticated');
      e.status = 401;
      throw e;
    }
    return {
      id: user.id,
      email: user.email,
      full_name: user.user_metadata?.full_name,
      role: user.app_metadata?.role || 'user',
    };
  },

  async logout(_redirectUrl) {
    // The AuthProvider's onAuthStateChange listener will pick up the
    // SIGNED_OUT event and switch the UI to <SignIn /> — no redirect needed.
    await supabase.auth.signOut();
  },

  redirectToLogin() {
    // Used to be a full-page reload to /SignIn; now a no-op since the
    // unauthenticated branch shows SignIn whenever user is null. Callers
    // that hit this only fired it after observing a 401, by which point
    // the auth state is already null.
  },
};

const functions = {
  async invoke(name, body) {
    const { data, error } = await supabase.functions.invoke(name, { body });
    if (error) {
      // Supabase's FunctionsHttpError carries the response on .context.
      // Read the body so the caller sees the actual {error: "..."} the
      // edge function returned, not the generic "non-2xx status code".
      let detail = error.message;
      try {
        const ctx = error.context;
        if (ctx && typeof ctx.json === 'function') {
          const body = await ctx.json();
          if (body?.error) detail = body.error;
        }
      } catch { /* fall back to error.message */ }
      const e = new Error(`${name}: ${detail}`);
      e.cause = error;
      throw e;
    }
    return data;
  },
};

// AI / integrations not yet wired — fail loudly so we know to implement.
const integrations = {
  Core: {
    InvokeLLM(_args) {
      throw new Error('InvokeLLM is not implemented yet (Phase 3 follow-up).');
    },
  },
};

// Telemetry was Base44-specific. No-op so existing callers keep working.
const appLogs = {
  logUserInApp: async () => {},
};

export const base44 = { entities, auth, functions, integrations, appLogs };
