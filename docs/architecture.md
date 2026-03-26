# Architecture Overview

## System Diagram

```mermaid
graph TD
    Browser[Browser] --> NextJS[Next.js Frontend<br/>Port 3000]
    NextJS --> Fastify[Fastify API<br/>Port 3001]
    Fastify --> SQLite[(SQLite)]

    subgraph Monorepo
        NextJS
        Fastify
        Shared[Shared Packages]
    end
```

## Project Structure

```
personal-finance/
├── apps/
│   ├── api/          # Fastify backend
│   └── web/          # Next.js frontend
├── packages/
│   ├── eslint-config/ # Shared ESLint configs
│   └── tsconfig/      # Shared TypeScript configs
└── docs/
    ├── adr/           # Architecture decision records
    └── design/        # Feature design docs
```

## Tech Stack

| Layer    | Technology        |
| -------- | ----------------- |
| Frontend | Next.js, React 19 |
| Styling  | Tailwind CSS      |
| Backend  | Fastify           |
| ORM      | Drizzle           |
| Database | SQLite            |
| Testing  | Vitest            |
| Monorepo | Turborepo, pnpm   |
| Language | TypeScript        |

## Data Flow

```mermaid
graph LR
    Upload[Bank Statement<br/>CSV/PDF] --> Parse[Parse &<br/>Validate]
    Parse --> Store[Store<br/>Transactions]
    Store --> Categorise[Categorise]
    Store --> Recurring[Detect<br/>Recurring]
    Store --> Visualise[Visualise &<br/>Filter]
```
