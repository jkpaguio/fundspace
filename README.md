# FundSpace

FundSpace is a mobile-first financial operations app built for:

- personal finance
- shared or family finance
- small business and side hustle tracking

The project is being built in phases on top of React, Vite, TypeScript, Tailwind-style utility patterns, and Supabase.

## Current scope

Implemented so far:

- authentication screens and session flow
- workspace creation, switching, invite acceptance, and role updates
- accounts and categories
- transactions, transfers, and dashboard summaries
- savings buckets and budgets
- activity log and member spending report
- recurring templates
- debts and debt payments
- business costing, sales, business expenses, P&L, and ROI views

Current milestone focus:

- usability and process cleanup
- guided Home experience
- simplified daily navigation
- Quick Add flow for common money movement
- clearer user-facing "space" language for personal, family, shared, and business contexts
- calm premium UI polish across mobile and desktop

Still pending:

- CSV export
- AI insights via Supabase Edge Functions
- smart recommendations
- Android packaging verification

## Stack

- React 19
- Vite 8
- TypeScript
- `react-router-dom`
- `lucide-react`
- `sonner`
- Supabase
- Bun

## Project structure

```txt
src/
|-- app/
|-- components/
|-- constants/
|-- features/
|-- hooks/
|-- lib/
`-- types/
```

Planning and development guides live in `tmp/`.

Key files:

- `tmp/financial_app_development_plan.md`
- `tmp/development_progress_checklist.md`
- `tmp/ai_development_guidelines.md`
- `tmp/milestone_3_checklist.md`
- `tmp/milestone_2_checklist.md`
- `tmp/archive_delete_behavior.md`

## Local setup

1. Install dependencies:

```bash
bun install
```

2. Create local environment values in `.env`.

Expected client variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

3. Run the app:

```bash
bun run dev
```

## Verification

Useful commands:

```bash
bun run lint
bunx tsc -b
bun run build
```

## Environment note

As of April 29, 2026, the current workspace verifies cleanly with:

- `bun run lint`
- `bunx tsc -b`

`bun run build` is currently blocked by the local Node version. Vite 8 requires Node `20.19+` or `22.12+`, while this workspace is on Node `20.18.1`.

## Archive policy

FundSpace prefers archive over delete for important financial records.

Supported archive flows currently exist for:

- accounts
- custom categories
- savings buckets

For ledger-affecting records, use correction or reversal workflows rather than direct deletion. See `tmp/archive_delete_behavior.md`.
