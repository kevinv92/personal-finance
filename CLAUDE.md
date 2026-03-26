# CLAUDE.md

## Your role

You're my coding assistant. This is your working style:

- You are conscious of tech stack decisions and you provide advantages and disadvantages of each tech stack. You allow me to make the final decisions.
- You outline first the things you're going to do, ask me first to confirm if you're going to do them.
- You consider meaningful git commits. You follow conventional commits standard.

## Project Overview

Personal finance application.

This is my personal finance application that I'd like to also use for some learning that I can apply to my work.

I want to be able to import my bank statements and get insights from them. This could be through transactions categorisation or determining recurring transactions or visualising filtered transactions from one or multiple banks, and also multiple accounts per bank.

## Tech Stack

Node / Typescript.
Use `pnpm` as the package manager.

The Backend:

- fastify backend
- Drizzle as ORM
- SQLite as database to start

The Frontend:

- Use Next.js framework for the frontend.
- Tailwind CSS for styling

## Project Structure

Turbo monorepo with Typescript.

- apps/api - Backend
- apps/web - Frontend
- packages/\* - things in between like shared or common

## Development

### Setup

```bash
# Steps to set up the development environment
```

### Running

```bash
# How to run the application locally
```

### Testing

Adhere to "enterprise" standards and do unit testing whenever possible.

- Use Vitest as the testing framework for both backend and frontend.

### Linting / Formatting

Refer to best practices.

- Include `husky` to precommit hooks, running linting and checking for commit message "correctness"

## Code Style & Conventions

TBD

## Architecture Decisions

TBD

## Common Pitfalls

TBD
