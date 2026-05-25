import { createClient } from 'jsr:@supabase/supabase-js@2';

// AI Contract Analysis — calls Claude Haiku 4.5 with tool use to force
// structured JSON output (category-tagged items + overall summary).
//
// Auth: caller must be a contract party (contractor or client). RLS on
// the contracts row enforces the same — but we double-check before
// burning model tokens.
//
// Privacy: contract data goes to Anthropic's API. Per Anthropic's
// commercial terms, API inputs are not used to train models.

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? 'https://www.pact.show',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const ANTHROPIC_MODEL = 'claude-haiku-4-5';
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

const ANALYSIS_TOOL = {
  name: 'return_contract_analysis',
  description:
    'Return a structured plain-English analysis of the contract for the user.',
  input_schema: {
    type: 'object',
    properties: {
      items: {
        type: 'array',
        description:
          '6-10 items covering payment terms, performance obligations, cancellation, scheduling, requirements, and notable clauses. Only include items with data present in the contract.',
        items: {
          type: 'object',
          properties: {
            category: {
              type: 'string',
              enum: [
                'payment',
                'performance',
                'cancellation',
                'schedule',
                'requirements',
                'general',
              ],
            },
            label: {
              type: 'string',
              description: 'Short title, 3-5 words max.',
            },
            value: {
              type: 'string',
              description:
                'Plain-English explanation (1-2 sentences). Include actual dollar amounts, dates, and times where available.',
            },
          },
          required: ['category', 'label', 'value'],
        },
      },
      overall_summary: {
        type: 'string',
        description:
          '2-3 sentence high-level summary of what this contract commits each party to.',
      },
    },
    required: ['items', 'overall_summary'],
  },
} as const;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) {
      return json({ error: 'AI analysis is not configured (missing API key)' }, 500);
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Unauthorized' }, 401);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: 'Unauthorized' }, 401);

    const body = await req.json().catch(() => ({}));
    const contractId = body?.contract_id;
    if (!contractId || typeof contractId !== 'string') {
      return json({ error: 'contract_id is required' }, 400);
    }

    const { data: contract, error: contractErr } = await supabase
      .from('contracts')
      .select('*')
      .eq('id', contractId)
      .single();

    if (contractErr || !contract) {
      return json({ error: 'Contract not found' }, 404);
    }

    // Ownership check — RLS should already enforce this, but verify
    // anyway so a misconfigured policy can't quietly leak.
    const { data: callerProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (
      !callerProfile ||
      (callerProfile.id !== contract.contractor_profile_id &&
        callerProfile.id !== contract.client_profile_id)
    ) {
      return json({ error: 'Only contract parties can analyze this contract' }, 403);
    }

    const contractText = buildContractText(contract);

    const anthropicReq = {
      model: ANTHROPIC_MODEL,
      max_tokens: 2048,
      tools: [ANALYSIS_TOOL],
      tool_choice: { type: 'tool', name: ANALYSIS_TOOL.name },
      system:
        "You are an expert contract analyst. Analyze the gig performance contract provided and call the return_contract_analysis tool to return a clear, plain-English breakdown that any non-lawyer would immediately understand. Be specific — include actual dollar amounts, dates, times, and named obligations. Skip items that don't have data in the contract.",
      messages: [
        {
          role: 'user',
          content: `CONTRACT:\n\n${contractText}`,
        },
      ],
    };

    const anthropicRes = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify(anthropicReq),
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      console.error('Anthropic API error:', anthropicRes.status, errText);
      return json({ error: 'AI analysis failed. Please try again.' }, 502);
    }

    const data = await anthropicRes.json();
    const toolUse = (data.content ?? []).find(
      (b: { type: string }) => b.type === 'tool_use',
    );

    if (!toolUse?.input) {
      console.error('Anthropic response missing tool_use block:', JSON.stringify(data));
      return json({ error: 'AI returned an unexpected response shape' }, 502);
    }

    return json(toolUse.input);
  } catch (err) {
    console.error('analyzeContract error:', err);
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});

function buildContractText(c: Record<string, unknown>): string {
  const lines: (string | null)[] = [
    `TITLE: ${c.title}`,
    `STATUS: ${c.status}`,
    `CONTRACTOR: ${c.contractor_name}${
      c.contractor_email ? ` (${c.contractor_email})` : ''
    }`,
    `CLIENT: ${c.client_name}${
      c.client_address ? ` at ${c.client_address}` : ''
    }`,
    c.client_email ? `CLIENT EMAIL: ${c.client_email}` : null,
    c.performance_date ? `PERFORMANCE DATE: ${c.performance_date}` : 'PERFORMANCE DATE: TBD',
    c.performance_end_date && c.performance_end_date !== c.performance_date
      ? `PERFORMANCE END DATE (multi-day): ${c.performance_end_date}`
      : null,
    c.performance_time ? `PERFORMANCE TIME: ${c.performance_time}` : null,
    c.load_in_time ? `LOAD-IN TIME: ${c.load_in_time}` : null,
    c.set_length ? `SET LENGTH: ${c.set_length}` : null,
    `TOTAL PAYMENT: $${Number(c.total_amount ?? 0).toLocaleString()}`,
    c.deposit_amount
      ? `DEPOSIT AMOUNT: $${Number(c.deposit_amount).toLocaleString()}`
      : null,
    c.deposit_due_date
      ? `DEPOSIT PAYMENT DATE (client must initiate by): ${c.deposit_due_date}`
      : null,
    c.balance_due_date
      ? `BALANCE PAYMENT DATE (client must initiate by): ${c.balance_due_date}`
      : null,
    c.fee_payer
      ? `PACT TRANSACTION FEE (2%) PAID BY: ${c.fee_payer}`
      : null,
    c.technical_requirements
      ? `TECHNICAL REQUIREMENTS: ${c.technical_requirements}`
      : null,
    c.hospitality_requirements
      ? `HOSPITALITY REQUIREMENTS: ${c.hospitality_requirements}`
      : null,
    c.additional_terms
      ? `ADDITIONAL TERMS & CONDITIONS: ${c.additional_terms}`
      : null,
    Array.isArray(c.contract_sections) && c.contract_sections.length > 0
      ? `CONTRACT CLAUSES:\n${
          (c.contract_sections as { title: string; content: string }[])
            .map((s) => `  - ${s.title}: ${s.content}`)
            .join('\n')
        }`
      : null,
  ];
  return lines.filter(Boolean).join('\n');
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
