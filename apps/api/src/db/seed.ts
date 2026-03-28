import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { existsSync } from "fs";
import { resolve } from "path";
import {
  banks,
  accounts,
  categories,
  categoryRules,
  csvMappers,
} from "./schema/index.js";
import { csvMapperPresets } from "../lib/csv-parser/index.js";
import { SeedConfigSchema } from "./seed-config.schema.js";
import type { SeedConfig } from "./seed-config.schema.js";

const sqlite = new Database("local.db");
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");
const db = drizzle(sqlite);

const now = new Date().toISOString();

// Seed banks and accounts from CSV mapper presets
const bankCount = new Set<string>();
let accountCount = 0;

for (const preset of Object.values(csvMapperPresets)) {
  let bank = db.select().from(banks).where(eq(banks.name, preset.bank)).get();

  if (!bank) {
    bank = { id: randomUUID(), name: preset.bank, createdAt: now };
    db.insert(banks).values(bank).run();
    bankCount.add(preset.bank);
  }

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

// Seed CSV mappers from presets
let mapperCount = 0;
for (const preset of Object.values(csvMapperPresets)) {
  const existing = db
    .select()
    .from(csvMappers)
    .where(eq(csvMappers.csvSignature, preset.csvSignature))
    .get();

  if (!existing) {
    db.insert(csvMappers)
      .values({
        id: randomUUID(),
        name: preset.name,
        bank: preset.bank,
        accountType: preset.accountType,
        csvSignature: preset.csvSignature,
        metaLineStart: preset.metaLines.start,
        metaLineEnd: preset.metaLines.end,
        headerRow: preset.headerRow,
        dataStartRow: preset.dataStartRow,
        accountMetaLine: preset.accountMetaLine,
        delimiter: preset.delimiter ?? ",",
        columnMap: preset.columnMap,
        dateFormat: preset.dateFormat ?? null,
        invertAmount: preset.invertAmount ?? false,
        createdAt: now,
      })
      .run();
    mapperCount++;
  }
}

// Load optional seed config from data/seed-config.ts
let categoryCount = 0;
let ruleCount = 0;

const configPath = resolve(import.meta.dirname, "../../data/seed-config.ts");

if (existsSync(configPath)) {
  const module = await import(configPath);
  const result = SeedConfigSchema.safeParse(module.config);

  if (!result.success) {
    console.error("Seed config validation failed:");
    for (const issue of result.error.issues) {
      console.error(`  ${issue.path.join(".")}: ${issue.message}`);
    }
    process.exit(1);
  }

  const config: SeedConfig = result.data;

  // Seed categories
  if (config.categories) {
    for (const cat of config.categories) {
      const parentId = randomUUID();
      db.insert(categories)
        .values({
          id: parentId,
          name: cat.name,
          parentId: null,
          createdAt: now,
        })
        .run();
      categoryCount++;

      if (cat.children) {
        for (const childName of cat.children) {
          db.insert(categories)
            .values({
              id: randomUUID(),
              name: childName,
              parentId,
              createdAt: now,
            })
            .run();
          categoryCount++;
        }
      }
    }
  }

  // Seed category rules
  if (config.categoryRules) {
    // Build name → id lookup from all categories
    const allCategories = db.select().from(categories).all();
    const categoryByName = new Map(allCategories.map((c) => [c.name, c.id]));

    for (let i = 0; i < config.categoryRules.length; i++) {
      const rule = config.categoryRules[i];
      const categoryId = categoryByName.get(rule.category);
      if (!categoryId) {
        console.error(
          `  Warning: category "${rule.category}" not found, skipping rule for "${rule.matchValues.join(", ")}"`,
        );
        continue;
      }

      db.insert(categoryRules)
        .values({
          id: randomUUID(),
          categoryId,
          matchField: rule.matchField,
          matchType: rule.matchType,
          matchValues: rule.matchValues,
          sortOrder: i,
          createdAt: now,
        })
        .run();
      ruleCount++;
    }
  }

  console.log("  Loaded seed config from data/seed-config.ts");
} else {
  console.log("  No seed config found at data/seed-config.ts, skipping");
}

console.log("Seed complete:");
console.log(`  ${bankCount.size} bank(s)`);
console.log(`  ${accountCount} account(s)`);
console.log(`  ${mapperCount} csv mapper(s)`);
console.log(`  ${categoryCount} category(ies)`);
console.log(`  ${ruleCount} category rule(s)`);
