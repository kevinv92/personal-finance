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
    dashboards ||--o{ dashboard_widgets : contains
    dashboard_widgets }o--o| saved_filters : "powered by"
    csv_mappers ||--o{ accounts : "maps to"

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

    dashboards {
        text id PK
        text name
        text created_at
    }

    dashboard_widgets {
        text id PK
        text dashboard_id FK
        text type
        text title
        text filter_id FK
        integer x
        integer y
        integer w
        integer h
        text config JSON
        text created_at
    }

    csv_mappers {
        text id PK
        text name
        text bank
        text account_type
        text csv_signature
        integer meta_line_start
        integer meta_line_end
        integer header_row
        integer data_start_row
        integer account_meta_line
        text delimiter
        text column_map JSON
        text date_format
        integer invert_amount
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
- **Saved filters**: reusable filter conditions stored as JSON. Supports relative dates (last 30 days, last month, etc.), text matching with multiple values and negative operators (`notContains`, `notEquals`), category/account/bank selection with `notIn`, and amount min/max ranges. Conditions are AND'd together. Designed to be referenced by future dashboards/reports.
- **CSV mappers**: stored in DB (not hardcoded). Each mapper defines the CSV structure (meta lines, header row, column mapping, date format, amount inversion). Mappers are matched to CSVs by `csv_signature` (the account meta line content). New mappers can be created via a step-by-step wizard that previews the raw file, auto-detects column mappings, and test-parses before saving.
- **SQLite**: file-based, zero config. Can migrate to PostgreSQL later via Drizzle
