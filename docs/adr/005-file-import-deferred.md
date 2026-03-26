# ADR 005: File Import Support Deferred

## Status

Accepted

## Context

The app needs transaction data. We considered building CSV and OFX file import from the start, including an `imports` table to track uploaded files, file hashing for duplicate detection, and format-specific parsers.

OFX provides structured data (transaction types, unique IDs) but bank support varies. CSV is universal but formats differ per bank.

## Decision

Defer file import support. Transactions will be created via the API initially. File import (CSV first, OFX later) will be added as a separate feature when needed.

## Consequences

- Simpler initial scope — no parsing logic, no import tracking table
- Schema is designed to accommodate file imports later (adding `import_id` and `external_id` to transactions is a non-breaking migration)
- Manual transaction entry or API seeding for now
