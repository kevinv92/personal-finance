# Feature: Data Model

## Problem

We need a schema to store bank transactions across multiple banks and accounts, with flexible categorisation that supports switching between different category schemes.

## Data Model

```mermaid
erDiagram
    banks ||--o{ accounts : has
    accounts ||--o{ transactions : contains
    category_schemes ||--o{ categories : contains
    categories ||--o{ categories : "parent (subcategories)"
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
        boolean is_active
        text created_at
    }

    transactions {
        text id PK
        text account_id FK
        text date
        text description
        real amount
        text created_at
    }

    category_schemes {
        text id PK
        text name
        boolean is_active
        text created_at
    }

    categories {
        text id PK
        text scheme_id FK
        text name
        text parent_id FK
        text created_at
    }

    transaction_categories {
        text id PK
        text transaction_id FK
        text category_id FK
        text created_at
    }
```

## Key Decisions

- **Signed amounts**: positive = credit (money in), negative = debit (money out)
- **Category schemes**: categories belong to a scheme, allowing multiple categorisation sets (e.g., "Simple" vs "Tax")
- **Subcategories**: self-referencing `parent_id` on categories (e.g., "Food & Drink" → "Groceries")
- **Transaction ↔ Category join table**: a transaction can have a category per scheme, enabling switching between schemes without losing data
- **Account types**: "checking", "savings", "credit" — covers daily banking and credit cards
- **SQLite**: file-based, zero config. Can migrate to PostgreSQL later via Drizzle
