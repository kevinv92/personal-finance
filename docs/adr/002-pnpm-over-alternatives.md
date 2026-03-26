# ADR 002: pnpm Over npm and Bun

## Status

Accepted

## Context

We evaluated three package managers: npm, pnpm, and Bun.

- **npm**: Universal default, but flat `node_modules` allows phantom dependencies.
- **Bun**: Faster installs, built-in SQLite, but Next.js middleware has edge cases and Turborepo support is less battle-tested.
- **pnpm**: Strict `node_modules` prevents phantom dependencies, content-addressable store deduplicates across projects, first-class Turborepo support.

## Decision

Use pnpm as the package manager with Node.js as the runtime.

We considered using Bun as the package manager with Node as the runtime (hybrid approach), but the added complexity wasn't justified for a project of this size.

## Consequences

- Strict `node_modules` catches undeclared dependency usage early
- `pnpm-lock.yaml` for deterministic installs
- Corepack pins the pnpm version in `package.json` for consistency across machines
- pnpm v10 blocks install scripts by default — dependencies that need them must be allowlisted in `pnpm.onlyBuiltDependencies`
