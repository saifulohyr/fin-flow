# Changelog

All notable changes to FinFlow are documented here.

## [2026-10-31] - Daily Build & Feature Integration

### Added
- **Zod Schemas**: Validation schemas for transactions, accounts, and budgets (`src/lib/schemas`).
- **Database Schema**: Drizzle ORM SQLite definitions for core entities with relation mappings (`src/db/schema.ts`).
- **Financial Engine**: Pure calculation functions for Net Worth, savings rates, runway estimation, and monthly aggregates (`src/lib/engine.ts`).
- **Indonesian NLU Parser**: Natural language transaction parser supporting informal Indonesian idioms and shorthands (`src/lib/nlu.ts`).
- **Test Suite**: Vitest suite with 45 unit tests covering parser edge cases, financial calculations, and validation schemas.
- **Editorial UI Integration**: Dashboard connected to calculations and interactive NLU transaction input form.

### Verification
- **Tests**: 6 test files, 45 passed (100% pass rate).
- **Build**: Next.js 16 production build succeeded with Turbopack static prerendering.
- **Lint**: ESLint passed with 0 warnings/errors.
