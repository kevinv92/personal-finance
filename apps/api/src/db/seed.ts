import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { banks, accounts, categories } from "./schema/index.js";
import { csvMapperPresets } from "../lib/csv-parser/index.js";

const sqlite = new Database("local.db");
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");
const db = drizzle(sqlite);

const now = new Date().toISOString();

// Seed banks and accounts from CSV mapper presets
const bankCount = new Set<string>();
let accountCount = 0;

for (const preset of Object.values(csvMapperPresets)) {
  // Find or create bank
  let bank = db.select().from(banks).where(eq(banks.name, preset.bank)).get();

  if (!bank) {
    bank = { id: randomUUID(), name: preset.bank, createdAt: now };
    db.insert(banks).values(bank).run();
    bankCount.add(preset.bank);
  }

  // Create account from preset
  const existing = db
    .select()
    .from(accounts)
    .where(eq(accounts.csvSignature, preset.csvSignature))
    .get();

  if (!existing) {
    db.insert(accounts)
      .values({
        id: randomUUID(),
        bankId: bank.id,
        name: preset.name,
        type: preset.accountType,
        currency: "NZD",
        csvSignature: preset.csvSignature,
        isActive: true,
        createdAt: now,
      })
      .run();
    accountCount++;
  }
}

// Categories
const foodId = randomUUID();

db.insert(categories)
  .values([
    { id: randomUUID(), name: "Income", parentId: null, createdAt: now },
    { id: foodId, name: "Food & Drink", parentId: null, createdAt: now },
    { id: randomUUID(), name: "Groceries", parentId: foodId, createdAt: now },
    { id: randomUUID(), name: "Eating Out", parentId: foodId, createdAt: now },
    { id: randomUUID(), name: "Transport", parentId: null, createdAt: now },
    { id: randomUUID(), name: "Subscriptions", parentId: null, createdAt: now },
    { id: randomUUID(), name: "Shopping", parentId: null, createdAt: now },
    { id: randomUUID(), name: "Transfers", parentId: null, createdAt: now },
  ])
  .run();

console.log("Seed complete:");
console.log(`  ${bankCount.size} bank(s)`);
console.log(`  ${accountCount} account(s)`);
console.log("  8 categories");
