# ADR 007: CSV Import Design

## Status

Accepted (supersedes ADR 005)

## Context

Bank statement CSVs vary in structure, even within the same bank. For example, ASB's Streamline (checking) and Visa Rewards (credit card) accounts have different meta lines, header positions, column names, date formats, and amount sign conventions.

We need a flexible CSV import system that:

- Handles varying CSV structures without code changes
- Maps CSV columns to our transaction schema in a type-safe way
- Supports different date formats across banks
- Auto-matches imported files to existing accounts to avoid duplicates on re-import

## Decision

### CSVMapperConfig

A configuration-driven parser (`CSVParser`) that takes a `CSVMapperConfig` describing:

- **Bank and account identity**: `bank` (name), `accountType` (`checking`/`savings`/`credit`), and `csvSignature` (the raw meta line that uniquely identifies the account, e.g. `Bank 12; Branch 3162; Account 0156490-50 (Streamline)`)
- **Meta lines**: which rows contain bank/account metadata (stored as raw strings, not parsed)
- **Header row / data start row**: where the CSV headers and data begin
- **Column mapping**: a `Record<string, TransactionField>` mapping CSV header strings to typed transaction field names (`date`, `payee`, `amount`, etc.). Values are constrained to the `TransactionField` union type for compile-time safety.
- **Date format**: optional `date-fns` format string (e.g. `dd/MM/yyyy`). When set, dates are parsed explicitly. When omitted, the parser auto-detects unambiguous formats (`yyyy/MM/dd`, `yyyyMMdd`, `yyyy-MM-dd`) and throws on ambiguous ones.
- **Amount inversion**: optional flag for credit card CSVs where debits are positive
- **Account meta line**: which meta line identifies the account (used for auto-detection)

Preseeded configs are stored in `presets.ts` for known accounts. Each preset is account-specific (not just format-specific) — it carries the bank name, account type, and exact `csvSignature`. The seed script creates banks and accounts from these presets.

### Date handling

- `date-fns` library used for parsing (no regex for date operations)
- Parser returns native `Date` objects for easy manipulation in application code
- Dates are serialised to `YYYY-MM-DD` strings at the DB boundary, which is required for SQLite date functions and lexicographic sorting

### Account matching and auto-detection

- The `accounts` table has a `csvSignature` field storing the raw meta line that identifies the account
- On import (`POST /api/import/csv`), the system reads the CSV's meta line and matches it against all presets' `csvSignature` to auto-detect the correct preset
- The preset provides the bank name and account type, so banks are created with real names (not placeholders)
- If the account already exists (matched by `csvSignature`), transactions are imported into it
- Accounts can be moved between banks since transactions reference `accountId`, not `bankId`

### Transaction deduplication

- Each transaction has an `externalId` field (the bank's unique transaction ID from the CSV)
- On import, existing transactions with the same `externalId` are skipped
- The import response reports `imported`, `skipped`, and `total` counts

### Transaction schema changes

Added fields to support CSV data: `externalId` (bank's unique ID for dedup), `dateProcessed` (credit card processing date), `type` (transaction type), `memo` (secondary description). Renamed `description` to `payee`.

## Consequences

- New CSV formats require only a preset config object, no code changes
- Type-safe column mapping catches typos at compile time
- Auto-detection means users just upload a CSV — no format selection required
- `date-fns` dependency added but replaces fragile regex-based date parsing
- `papaparse` dependency added for robust CSV parsing (handles quoted fields, commas in values)
- `@fastify/multipart` dependency added for file upload handling
- `externalId` dedup prevents duplicate transactions on re-import
- Presets are account-specific; multiple accounts of the same format need separate presets
