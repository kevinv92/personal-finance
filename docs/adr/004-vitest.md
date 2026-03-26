# ADR 004: Vitest for Testing

## Status

Accepted

## Context

We needed a test framework for both the Fastify backend and the Next.js frontend.

- **Jest**: Battle-tested, large ecosystem, official Next.js support. But ESM/TypeScript support is clunky (needs `ts-jest` or SWC transforms), painful config in monorepos.
- **Vitest**: Native ESM and TypeScript support, Jest-compatible API, fast (uses Vite's transform pipeline), first-class monorepo workspace config.

## Decision

Use Vitest for both backend and frontend testing.

## Consequences

- Single test framework across the entire monorepo
- Jest-compatible API means existing Jest knowledge transfers directly
- Native TypeScript — no extra transform config needed
- Next.js doesn't officially support Vitest, but works well with `@vitejs/plugin-react`
- Vitest uses Vite's transform pipeline for tests, while Next.js uses SWC for builds — different transforms, but rarely causes issues in practice
