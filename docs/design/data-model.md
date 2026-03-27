# Feature: Data Model

## Problem

We need a schema to store bank transactions across multiple banks and accounts, with flexible categorisation and rule-based auto-categorisation.

## Data Model

```mermaid
erDiagram
    banks ||--o{ accounts : has
    accounts ||--o{ transactions : contains
    categories ||--o{ categories : "parent (subcategories)"
    categories ||--o{ category_rules : "matched by"
    transactions ||--o{ transaction_categories : tagged
    categories ||--o{ transaction_categories : applied

    banks {
        text id PK
        text name
        text created_at
    }

    accounts {
        text id PK
        text bank_id FK
        text name
        text account_number
        text type
        text currency
        text csv_signature
        boolean is_active
        text created_at
    }

    transactions {
        text id PK
        text account_id FK
        text external_id
        text date
        text date_processed
        text type
        text payee
        text memo
        real amount
        text created_at
    }

    categories {
        text id PK
        text name
        text parent_id FK
        text created_at
    }

    category_rules {
        text id PK
        text category_id FK
        text match_field
        text match_type
        text match_values JSON
        integer sort_order
        text created_at
    }

    transaction_categories {
        text id PK
        text transaction_id FK
        text category_id FK
        text created_at
    }

    saved_filters {
        text id PK
        text name
        text conditions JSON
        text created_at
    }
```

## Key Decisions

- **Signed amounts**: positive = credit (money in), negative = debit (money out)
- **Subcategories**: self-referencing `parent_id` on categories (e.g., "Food & Drink" -> "Groceries")
- **Transaction fields**: `payee` and `memo` split from the original `description` to match bank CSV formats; `external_id` for dedup on re-import; `date_processed` for credit card processing dates
- **CSV signature**: `csv_signature` on accounts stores the raw meta line from bank CSVs, enabling auto-detection of which account a CSV belongs to
- **Category rules**: `match_field` controls which field to check (`payee`, `memo`, or `both`). `match_values` is a JSON array of strings — any match triggers the rule. Rules are ordered by `sort_order` — first match wins. Supports `contains`, `exact`, and `startsWith` match types (case-sensitive). Rules can be applied on import or manually via the API/UI.
- **Transaction <-> Category join table**: a transaction can have categories assigned, either manually or via rules during CSV import
- **Account types**: "checking", "savings", "credit" — covers daily banking and credit cards
- **Saved filters**: reusable filter conditions stored as JSON. Supports relative dates (last 30 days, last month, etc.), text matching with multiple values, category/account selection, and amount ranges. Conditions are AND'd together. Designed to be referenced by future dashboards/reports.
- **SQLite**: file-based, zero config. Can migrate to PostgreSQL later via Drizzle
