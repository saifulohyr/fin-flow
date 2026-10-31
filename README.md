# FinFlow

Personal finance dashboard with Indonesian NLU-first transaction parsing, deliberate data-dense UI, and real-time calculation engines.

## Features
- **Natural Language Transaction Parsing:** Shorthand Indonesian parsing (`kopi 22rb gopay`, `bonus 500rb bca`, `listrik 150rb`).
- **Financial Calculation Engine:** Automated computation for Net Worth, monthly totals, category breakdown, runway months, and savings rate.
- **Strict Anti-AI-Slop UI:** Warm editorial palette, tabular figures (`font-variant-numeric: tabular-nums`), quiet panels, and content-first typography.
- **Database Ready:** Drizzle ORM schema with Zod type-safe validations for transactions, accounts, and budgets.

## Stack & Architecture
- **Framework:** Next.js 16 (App Router) + React 19 + TypeScript
- **Styling:** Tailwind CSS v4 with Warm Editorial tokens
- **ORM / Schemas:** Drizzle ORM + SQLite + Zod
- **Test Runner:** Vitest with comprehensive test coverage for engine calculations and NLU parser

## Getting Started

```bash
pnpm install
pnpm dev
```

Run test suite:
```bash
pnpm test
```

Production build:
```bash
pnpm build
```
