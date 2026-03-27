import { FastifyInstance } from "fastify";
import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { format } from "date-fns";
import { db } from "../db/index.js";
import {
  banks,
  accounts,
  transactions,
  transactionCategories,
  csvMappers,
} from "../db/schema/index.js";
import { matchCategory } from "../lib/category-matcher.js";
import { CSVParser } from "../lib/csv-parser/index.js";
import type { CSVMapperConfig } from "../lib/csv-parser/index.js";

function dbMapperToConfig(
  mapper: typeof csvMappers.$inferSelect,
): CSVMapperConfig {
  return {
    name: mapper.name,
    bank: mapper.bank,
    accountType: mapper.accountType as CSVMapperConfig["accountType"],
    csvSignature: mapper.csvSignature,
    metaLines: { start: mapper.metaLineStart, end: mapper.metaLineEnd },
    headerRow: mapper.headerRow,
    dataStartRow: mapper.dataStartRow,
    accountMetaLine: mapper.accountMetaLine,
    delimiter: mapper.delimiter ?? ",",
    columnMap: mapper.columnMap as CSVMapperConfig["columnMap"],
    dateFormat: mapper.dateFormat ?? undefined,
    invertAmount: mapper.invertAmount,
  };
}

export async function importRoutes(fastify: FastifyInstance) {
  // List available CSV mappers from DB
  fastify.get(
    "/presets",
    {
      schema: {
        tags: ["Import"],
        description: "List available CSV mapper configurations",
      },
    },
    async () => {
      const mappers = db.select().from(csvMappers).all();
      return mappers.map((m) => ({
        key: m.id,
        name: m.name,
        bank: m.bank,
        accountType: m.accountType,
        csvSignature: m.csvSignature,
      }));
    },
  );

  fastify.post(
    "/csv",
    {
      schema: {
        tags: ["Import"],
        description: "Import transactions from a CSV file",
        consumes: ["multipart/form-data"],
      },
    },
    async (request, reply) => {
      const file = await request.file();
      if (!file) {
        return reply.status(400).send({ message: "No file uploaded" });
      }

      const content = await file.toBuffer();
      const csvContent = content.toString("utf-8");

      // Match mapper by csvSignature from DB
      const mapper = findMapper(csvContent);
      if (!mapper) {
        return reply.status(422).send({
          message:
            "No matching CSV mapper found. The CSV format is not recognised.",
        });
      }

      const config = dbMapperToConfig(mapper);

      // Parse CSV
      const parser = new CSVParser(config);
      const result = parser.parse(csvContent);

      // Find or create bank
      const bankId = findOrCreateBank(config.bank);

      // Find or create account
      const accountId = findOrCreateAccount(
        bankId,
        config,
        result.accountSignature,
      );

      // Insert transactions, skip duplicates by externalId
      let imported = 0;
      let skipped = 0;
      let categorised = 0;

      for (const row of result.rows) {
        const existing = db
          .select()
          .from(transactions)
          .where(eq(transactions.externalId, row.externalId))
          .get();

        if (existing) {
          skipped++;
          continue;
        }

        const txnId = randomUUID();
        db.insert(transactions)
          .values({
            id: txnId,
            accountId,
            externalId: row.externalId,
            date: format(row.date, "yyyy-MM-dd"),
            dateProcessed: row.dateProcessed
              ? format(row.dateProcessed, "yyyy-MM-dd")
              : null,
            type: row.type,
            payee: row.payee,
            memo: row.memo ?? null,
            amount: row.amount,
            createdAt: new Date().toISOString(),
          })
          .run();
        imported++;

        // Apply category rules
        const categoryId = matchCategory({
          payee: row.payee,
          memo: row.memo ?? null,
        });
        if (categoryId) {
          db.insert(transactionCategories)
            .values({
              id: randomUUID(),
              transactionId: txnId,
              categoryId,
              createdAt: new Date().toISOString(),
            })
            .run();
          categorised++;
        }
      }

      return reply.status(200).send({
        preset: config.name,
        bank: config.bank,
        accountSignature: result.accountSignature,
        imported,
        skipped,
        categorised,
        total: result.rows.length,
      });
    },
  );
}

function findMapper(content: string): typeof csvMappers.$inferSelect | null {
  const mappers = db.select().from(csvMappers).all();
  const lines = content.split("\n");

  for (const mapper of mappers) {
    const metaLine = lines[mapper.accountMetaLine - 1]?.trim();
    if (metaLine === mapper.csvSignature) {
      return mapper;
    }
  }
  return null;
}

function findOrCreateBank(bankName: string): string {
  const existing = db
    .select()
    .from(banks)
    .where(eq(banks.name, bankName))
    .get();

  if (existing) return existing.id;

  const id = randomUUID();
  db.insert(banks)
    .values({ id, name: bankName, createdAt: new Date().toISOString() })
    .run();
  return id;
}

function findOrCreateAccount(
  bankId: string,
  config: CSVMapperConfig,
  signature: string | null,
): string {
  if (signature) {
    const existing = db
      .select()
      .from(accounts)
      .where(eq(accounts.csvSignature, signature))
      .get();

    if (existing) return existing.id;
  }

  const id = randomUUID();
  db.insert(accounts)
    .values({
      id,
      bankId,
      name: config.name,
      type: config.accountType,
      currency: "NZD",
      csvSignature: signature,
      isActive: true,
      createdAt: new Date().toISOString(),
    })
    .run();
  return id;
}
