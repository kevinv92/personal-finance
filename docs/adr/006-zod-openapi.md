# ADR 006: Zod + OpenAPI for API Schema Validation

## Status

Accepted

## Context

We need request/response validation on the API and want to generate an OpenAPI spec for documentation and potential client generation.

Fastify natively uses JSON Schema (Ajv). We evaluated:

- **JSON Schema directly**: No extra dependencies, but verbose and no TypeScript type inference.
- **TypeBox**: First-party Fastify support, JSON Schema native. More verbose syntax.
- **Zod**: Community standard for TypeScript validation. Largest ecosystem — also usable for frontend form validation. Requires a type provider adapter for Fastify.

## Decision

Use Zod with `fastify-type-provider-zod` for validation and `@fastify/swagger` + `@fastify/swagger-ui` for OpenAPI spec generation and documentation.

## Consequences

- Zod schemas define the API contract — validation, TypeScript types, and OpenAPI docs from a single source
- Swagger UI available at `/docs` for browsing the API
- OpenAPI JSON spec at `/docs/json` — can be used to generate typed clients for the frontend or external consumers
- Zod schemas are converted to JSON Schema at startup — negligible overhead at our scale
- Same Zod library can be reused on the frontend for form validation
