# CLAUDE.md

## Your role

You're my coding assistant. This is your working style:

- You are conscious of tech stack decisions and you provide advantages and disadvantages of each tech stack. You allow me to make the final decisions.
- You outline first the things you're going to do, ask me first to confirm if you're going to do them.
- You consider meaningful git commits. You follow conventional commits standard.

## Project Overview

Personal finance application.

This is my personal finance application that I'd like to also use for some learning that I can apply to my work.

I want to be able to import my bank statements and get insights from them. This could be through transactions categorisation or determining recurring transactions or visualising filtered transactions from one or multiple banks, and also multiple accounts per bank.

## Tech Stack

Node / Typescript.
Use `pnpm` as the package manager.

The Backend:

- fastify backend
- Drizzle as ORM
- SQLite as database to start

The Frontend:

- Use Next.js framework for the frontend.
- Tailwind CSS for styling

## Project Structure

Turbo monorepo with Typescript.

- apps/api - Backend
- apps/web - Frontend
- packages/\* - things in between like shared or common

## Development

### Setup

```bash
pnpm install
cd apps/api && pnpm db:reset   # nuke DB, migrate, seed, import CSVs from data/
```

Note: `pnpm db:reset` requires port 3001 to be free (stop dev server first). It will start a temporary server to import CSV files from `apps/api/data/`.

### Running

```bash
pnpm dev   # starts both API (port 3001) and web (port 3000)
```

### Database

```bash
cd apps/api
pnpm db:reset      # nuke DB, migrate, seed from presets + seed-config, import CSVs
pnpm db:generate   # generate Drizzle migration from schema changes
pnpm db:migrate    # apply migrations
pnpm db:seed       # seed without nuking (banks/accounts from presets, categories/rules from data/seed-config.ts)
pnpm db:studio     # open Drizzle Studio
pnpm mcp           # start MCP server (requires API running on port 3001)
```

### MCP Server

An MCP server is available for AI assistants to interact with the API. It exposes tools for listing transactions, categories, rules, creating rules, and applying categorisation. Requires the API to be running (`pnpm dev`).

Configured in `.mcp.json` at the project root — Claude Code will auto-detect it.

### Recurring Detection

The recurring system detects recurring transactions (subscriptions, bills, salary, etc.) by:

- Grouping transactions by a composite `payee + memo` key (memo is included when meaningful, excluded when generic like card numbers)
- Detecting frequency via median interval analysis (weekly/fortnightly/monthly/quarterly/annual)
- Checking amount consistency within a configurable tolerance (default 10%)

Key concepts:

- `matchKey` on the `recurring` table stores the grouping pattern used for matching (format: `PAYEE` or `PAYEE|||MEMO`)
- `recurringId` on the `transactions` table links transactions to their recurring item
- Detection logic lives in `apps/api/src/lib/recurring-detection.ts`
- Filter state on `/transactions` is URL-synced via base64-encoded `?filters=` query param (`apps/web/src/lib/filter-url.ts`)

### Testing

Adhere to "enterprise" standards and do unit testing whenever possible.

- Use Vitest as the testing framework for both backend and frontend.

### Linting / Formatting

Refer to best practices.

- Include `husky` to precommit hooks, running linting and checking for commit message "correctness"

## Code Style & Conventions

TBD

## Architecture Decisions

Refer to `docs/adr/` for all architecture decision records. Read these before suggesting changes to the tech stack or project structure.

## Actions Log

Maintain an `actions.log` file at the project root. This file is gitignored and local only. Use it to track what you've done and whether each task is finished, so work can be resumed exactly if a session is interrupted.

## Common Pitfalls

TBD
