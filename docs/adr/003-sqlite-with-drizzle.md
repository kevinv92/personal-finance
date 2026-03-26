# ADR 003: SQLite with Drizzle ORM

## Status

Accepted

## Context

This is a personal finance app that stores bank transactions, categories, and account metadata. We needed a database and an ORM.

### Database

- **PostgreSQL**: Production-grade, but requires a running server — overkill for a personal app.
- **SQLite**: Zero-config, file-based, fast for read-heavy workloads. Easy to back up (copy a file). Can migrate to PostgreSQL later if needed.

### ORM

- **Prisma**: Most popular, but heavier runtime (query engine binary), slower cold starts.
- **Drizzle**: Lightweight, SQL-like API, no runtime overhead. Works well with SQLite.
- **Kysely**: Query builder (not a full ORM), less ergonomic for migrations.

## Decision

Use SQLite as the database and Drizzle as the ORM.

## Consequences

- No database server to manage — just a file on disk
- Drizzle handles schema definitions and migrations in TypeScript
- Drizzle's SQL-like syntax means the ORM code reads close to actual SQL
- If we outgrow SQLite, Drizzle supports PostgreSQL and MySQL with minimal schema changes
