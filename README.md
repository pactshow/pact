# Pact.

Contract management + payments for live music gigs. Artists ↔ venues/promoters.

## Stack

- **Frontend:** React 18 + Vite, Tailwind, shadcn/Radix UI, TanStack Query, React Router v6
- **Backend:** Supabase (Postgres + Auth + Edge Functions + Storage)
- **Payments:** Stripe Connect Express (ACH via Financial Connections)
- **AI:** Anthropic API (Claude Haiku 4.5) for contract analysis

## Local development

```bash
npm install
npm run dev
```

Requires an `.env.local` with the publishable keys (see `.env.example`). Secrets (Stripe secret, Anthropic API key, Supabase service role) are stored in Supabase function secrets, not the repo.

## Deploying

- **Frontend:** Vercel, connected to this repo (auto-deploys on push to `main`).
- **Edge functions:** `npx supabase functions deploy <name>` per function.
- **DB migrations:** apply via the Supabase SQL editor — `db push` is not used here (see internal notes).
