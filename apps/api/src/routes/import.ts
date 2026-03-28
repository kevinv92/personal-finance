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

  // Preview a CSV file — returns raw lines and auto-detect result
  fastify.post(
    "/preview",
    {
      schema: {
        tags: ["Import"],
        description: "Preview a CSV file without importing",
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
      const lines = csvContent.split("\n").map((l) => l.trimEnd());

      // Try to find a matching mapper
      const mapper = findMapper(csvContent);

      return {
        fileName: file.filename,
        totalLines: lines.length,
        lines: lines.slice(0, 30),
        matchedMapper: mapper ? { id: mapper.id, name: mapper.name } : null,
      };
    },
  );

  // Test parse a CSV with a given config — returns parsed rows without importing
  fastify.post(
    "/test-parse",
    {
      schema: {
        tags: ["Import"],
        description: "Test parse a CSV with given mapper config",
        consumes: ["multipart/form-data"],
      },
    },
    async (request, reply) => {
      let csvContent = "";
      let configJson = "";

      const parts = request.parts();
      for await (const part of parts) {
        if (part.type === "file") {
          const buf = await part.toBuffer();
          csvContent = buf.toString("utf-8");
        } else {
          if (part.fieldname === "config") {
            configJson = part.value as string;
          }
        }
      }

      if (!csvContent) {
        return reply.status(400).send({ message: "No file uploaded" });
      }

      if (!configJson) {
        return reply
          .status(400)
          .send({ message: "Missing config field in form data" });
      }

      let config: CSVMapperConfig;
      try {
        const raw = JSON.parse(configJson);
        config = {
          name: raw.name ?? "Test",
          bank: raw.bank ?? "Unknown",
          accountType: raw.accountType ?? "checking",
          csvSignature: raw.csvSignature ?? "",
          metaLines: {
            start: raw.metaLineStart ?? 1,
            end: raw.metaLineEnd ?? 1,
          },
          headerRow: raw.headerRow ?? 1,
          dataStartRow: raw.dataStartRow ?? 2,
          accountMetaLine: raw.accountMetaLine ?? 1,
          delimiter: raw.delimiter ?? ",",
          columnMap: raw.columnMap ?? {},
          dateFormat: raw.dateFormat ?? undefined,
          invertAmount: raw.invertAmount ?? false,
        };
      } catch {
        return reply.status(400).send({ message: "Invalid config JSON" });
      }

      try {
        const parser = new CSVParser(config);
        const result = parser.parse(csvContent);

        return {
          meta: result.meta,
          accountSignature: result.accountSignature,
          headers: result.headers,
          rowCount: result.rows.length,
          sampleRows: result.rows.slice(0, 5).map((r) => ({
            ...r,
            date: r.date.toISOString().split("T")[0],
            dateProcessed: r.dateProcessed
              ? r.dateProcessed.toISOString().split("T")[0]
              : null,
          })),
        };
      } catch (err) {
        return reply.status(422).send({
          message: `Parse error: ${err instanceof Error ? err.message : String(err)}`,
        });
      }
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
