# ADR 001: Turborepo Monorepo

## Status

Accepted

## Context

This project has a separate frontend (Next.js) and backend (Fastify) that share TypeScript configs, ESLint configs, and will share types and utilities. We needed a way to manage multiple packages in a single repository.

## Decision

Use Turborepo with pnpm workspaces.

## Consequences

- Shared packages (tsconfig, eslint-config) are referenced as workspace dependencies
- Single `pnpm dev` starts both apps via Turbo's task pipeline
- Build caching speeds up CI and local rebuilds
- Adding new shared packages is straightforward (create in `packages/`, reference via `workspace:*`)
