# FinFlow

Personal finance dashboard with Indonesian NLU-first transaction parsing, deliberate data-dense UI, real-time calculation engines, and budget pacing controls.

## Features
- **Natural Language Transaction Parsing:** Shorthand Indonesian parsing (`kopi 22rb gopay`, `bonus 500rb bca`, `listrik 150rb`).
- **Financial Calculation Engine:** Automated computation for Net Worth, monthly totals, category breakdown, runway months, and savings rate.
- **Budget Pacing & Threshold Tracking:** Real-time budget progress bar, remaining daily spend recommendations, and safe/warning/exceeded status alerts.
- **Strict Anti-AI-Slop UI:** Warm editorial palette, tabular figures (`font-variant-numeric: tabular-nums`), quiet panels, and content-first typography.
- **Database & Serverless Ready:** Drizzle ORM schema with Zod validations and Neon Serverless Postgres integration with SSL pooler.

## Stack & Architecture
- **Framework:** Next.js 16 (App Router) + React 19 + TypeScript
- **Styling:** Tailwind CSS v4 with Warm Editorial tokens
- **ORM / Database:** Drizzle ORM + Neon Serverless Postgres (`@neondatabase/serverless`)
- **Test Runner:** Vitest with comprehensive test coverage for engine calculations, budget rules, and NLU parser

## Deployment
Live production URL: [https://fin-flow-nine-lovat.vercel.app](https://fin-flow-nine-lovat.vercel.app) (Hosted on Vercel)

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
