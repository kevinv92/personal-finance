import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { randomUUID } from "crypto";
import {
  banks,
  accounts,
  transactions,
  categorySchemes,
  categories,
} from "./schema/index.js";

const sqlite = new Database("local.db");
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");
const db = drizzle(sqlite);

const now = new Date().toISOString();

// Banks
const anzId = randomUUID();
const commbankId = randomUUID();

db.insert(banks)
  .values([
    { id: anzId, name: "ANZ", createdAt: now },
    { id: commbankId, name: "CommBank", createdAt: now },
  ])
  .run();

// Accounts
const anzEverydayId = randomUUID();
const anzSavingsId = randomUUID();
const commbankVisaId = randomUUID();

db.insert(accounts)
  .values([
    {
      id: anzEverydayId,
      bankId: anzId,
      name: "Everyday",
      accountNumber: "****1234",
      type: "checking",
      currency: "AUD",
      isActive: true,
      createdAt: now,
    },
    {
      id: anzSavingsId,
      bankId: anzId,
      name: "Online Saver",
      accountNumber: "****5678",
      type: "savings",
      currency: "AUD",
      isActive: true,
      createdAt: now,
    },
    {
      id: commbankVisaId,
      bankId: commbankId,
      name: "Visa Platinum",
      accountNumber: "****9012",
      type: "credit",
      currency: "AUD",
      isActive: true,
      createdAt: now,
    },
  ])
  .run();

// Transactions
const txns = [
  // ANZ Everyday
  {
    id: randomUUID(),
    accountId: anzEverydayId,
    date: "2026-03-01",
    description: "WOOLWORTHS METRO SYDNEY",
    amount: -45.5,
    createdAt: now,
  },
  {
    id: randomUUID(),
    accountId: anzEverydayId,
    date: "2026-03-02",
    description: "SALARY DEPOSIT - ACME CORP",
    amount: 4200.0,
    createdAt: now,
  },
  {
    id: randomUUID(),
    accountId: anzEverydayId,
    date: "2026-03-03",
    description: "UBER EATS SYDNEY",
    amount: -32.9,
    createdAt: now,
  },
  {
    id: randomUUID(),
    accountId: anzEverydayId,
    date: "2026-03-05",
    description: "TRANSFER TO ONLINE SAVER",
    amount: -500.0,
    createdAt: now,
  },
  {
    id: randomUUID(),
    accountId: anzEverydayId,
    date: "2026-03-07",
    description: "OPAL CARD TOP UP",
    amount: -40.0,
    createdAt: now,
  },
  {
    id: randomUUID(),
    accountId: anzEverydayId,
    date: "2026-03-10",
    description: "NETFLIX.COM",
    amount: -22.99,
    createdAt: now,
  },
  {
    id: randomUUID(),
    accountId: anzEverydayId,
    date: "2026-03-12",
    description: "COLES EXPRESS SURRY HILLS",
    amount: -18.75,
    createdAt: now,
  },
  // ANZ Savings
  {
    id: randomUUID(),
    accountId: anzSavingsId,
    date: "2026-03-05",
    description: "TRANSFER FROM EVERYDAY",
    amount: 500.0,
    createdAt: now,
  },
  {
    id: randomUUID(),
    accountId: anzSavingsId,
    date: "2026-03-31",
    description: "INTEREST CREDIT",
    amount: 12.34,
    createdAt: now,
  },
  // CommBank Visa
  {
    id: randomUUID(),
    accountId: commbankVisaId,
    date: "2026-03-02",
    description: "AMAZON AU MARKETPLACE",
    amount: -89.99,
    createdAt: now,
  },
  {
    id: randomUUID(),
    accountId: commbankVisaId,
    date: "2026-03-06",
    description: "SPOTIFY PREMIUM",
    amount: -12.99,
    createdAt: now,
  },
  {
    id: randomUUID(),
    accountId: commbankVisaId,
    date: "2026-03-15",
    description: "PAYMENT RECEIVED - THANK YOU",
    amount: 102.98,
    createdAt: now,
  },
];

db.insert(transactions).values(txns).run();

// Category Scheme: Simple
const simpleSchemeId = randomUUID();
db.insert(categorySchemes)
  .values([
    { id: simpleSchemeId, name: "Simple", isActive: true, createdAt: now },
  ])
  .run();

// Categories
const incomeId = randomUUID();
const foodId = randomUUID();
const transportId = randomUUID();
const subscriptionsId = randomUUID();
const shoppingId = randomUUID();
const transfersId = randomUUID();

db.insert(categories)
  .values([
    {
      id: incomeId,
      schemeId: simpleSchemeId,
      name: "Income",
      parentId: null,
      createdAt: now,
    },
    {
      id: foodId,
      schemeId: simpleSchemeId,
      name: "Food & Drink",
      parentId: null,
      createdAt: now,
    },
    {
      id: randomUUID(),
      schemeId: simpleSchemeId,
      name: "Groceries",
      parentId: foodId,
      createdAt: now,
    },
    {
      id: randomUUID(),
      schemeId: simpleSchemeId,
      name: "Eating Out",
      parentId: foodId,
      createdAt: now,
    },
    {
      id: transportId,
      schemeId: simpleSchemeId,
      name: "Transport",
      parentId: null,
      createdAt: now,
    },
    {
      id: subscriptionsId,
      schemeId: simpleSchemeId,
      name: "Subscriptions",
      parentId: null,
      createdAt: now,
    },
    {
      id: shoppingId,
      schemeId: simpleSchemeId,
      name: "Shopping",
      parentId: null,
      createdAt: now,
    },
    {
      id: transfersId,
      schemeId: simpleSchemeId,
      name: "Transfers",
      parentId: null,
      createdAt: now,
    },
  ])
  .run();

console.log("Seed complete:");
console.log("  2 banks");
console.log("  3 accounts");
console.log(`  ${txns.length} transactions`);
console.log("  1 category scheme with 8 categories");
