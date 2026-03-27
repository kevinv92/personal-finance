import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { CSVParser } from "./csv-parser.js";
import { csvMapperPresets } from "./presets.js";
import type { CSVMapperConfig } from "./types.js";

const loadFixture = (filename: string) =>
  readFileSync(resolve(__dirname, "../../../data", filename), "utf-8");

const testDefaults: Pick<
  CSVMapperConfig,
  "bank" | "accountType" | "csvSignature" | "accountMetaLine"
> = {
  bank: "Test Bank",
  accountType: "checking",
  csvSignature: "test-signature",
  accountMetaLine: 1,
};

describe("CSVParser", () => {
  describe("ASB Streamline", () => {
    const parser = new CSVParser(csvMapperPresets["asb-streamline"]);
    const csv = loadFixture("Export20260327192214.csv");

    it("extracts meta lines as raw strings", () => {
      const result = parser.parse(csv);

      expect(result.meta).toHaveLength(6);
      expect(result.meta[0]).toContain("Created date / time");
      expect(result.meta[1]).toContain("Streamline");
    });

    it("extracts account signature from meta", () => {
      const result = parser.parse(csv);

      expect(result.accountSignature).toBe(
        "Bank 12; Branch 3162; Account 0156490-50 (Streamline)",
      );
    });

    it("extracts headers from the CSV", () => {
      const result = parser.parse(csv);

      expect(result.headers).toEqual([
        "Date",
        "Unique Id",
        "Tran Type",
        "Cheque Number",
        "Payee",
        "Memo",
        "Amount",
      ]);
    });

    it("parses all data rows", () => {
      const result = parser.parse(csv);

      expect(result.rows.length).toBeGreaterThan(0);
    });

    it("maps fields correctly for a transaction", () => {
      const result = parser.parse(csv);
      const first = result.rows[0];

      expect(first.date).toEqual(new Date("2026-01-02T00:00:00"));
      expect(first.externalId).toBe("2026010201");
      expect(first.type).toBe("INT");
      expect(first.payee).toBe("ASB BANK - INTEREST");
      expect(first.amount).toBe(-0.61);
    });

    it("returns Date objects for dates", () => {
      const result = parser.parse(csv);

      for (const row of result.rows) {
        expect(row.date).toBeInstanceOf(Date);
      }
    });

    it("does not set dateProcessed for streamline", () => {
      const result = parser.parse(csv);

      for (const row of result.rows) {
        expect(row.dateProcessed).toBeUndefined();
      }
    });

    it("preserves memo field", () => {
      const result = parser.parse(csv);
      const transfer = result.rows.find((r) => r.type === "TFR OUT");

      expect(transfer?.memo).toBe("TO CARD 0128 THANK YOU");
    });
  });

  describe("ASB Visa Rewards", () => {
    const parser = new CSVParser(csvMapperPresets["asb-visa"]);
    const csv = loadFixture("Export20260327192143.csv");

    it("extracts meta lines as raw strings", () => {
      const result = parser.parse(csv);

      expect(result.meta).toHaveLength(4);
      expect(result.meta[0]).toContain("Created date / time");
      expect(result.meta[1]).toContain("Visa Rewards");
    });

    it("extracts account signature from meta", () => {
      const result = parser.parse(csv);

      expect(result.accountSignature).toBe(
        "Card Number XXXX-XXXX-XXXX-0128 (Visa Rewards)",
      );
    });

    it("extracts headers from the CSV", () => {
      const result = parser.parse(csv);

      expect(result.headers).toEqual([
        "Date Processed",
        "Date of Transaction",
        "Unique Id",
        "Tran Type",
        "Reference",
        "Description",
        "Amount",
      ]);
    });

    it("parses all data rows", () => {
      const result = parser.parse(csv);

      expect(result.rows.length).toBeGreaterThan(0);
    });

    it("maps date and dateProcessed correctly", () => {
      const result = parser.parse(csv);
      const first = result.rows[0];

      expect(first.date).toEqual(new Date("2026-03-05T00:00:00"));
      expect(first.dateProcessed).toEqual(new Date("2026-03-07T00:00:00"));
    });

    it("inverts amounts (debits become negative)", () => {
      const result = parser.parse(csv);
      const debit = result.rows.find((r) => r.type === "DEBIT");
      const credit = result.rows.find((r) => r.type === "CREDIT");

      expect(debit?.amount).toBeLessThan(0);
      expect(credit?.amount).toBeGreaterThan(0);
    });

    it("handles quoted descriptions with commas", () => {
      const result = parser.parse(csv);
      const amazon = result.rows[0];

      expect(amazon.payee).toContain("AMAZON");
      expect(amazon.payee).toContain("Conversion Rate");
    });

    it("maps reference to memo", () => {
      const result = parser.parse(csv);

      for (const row of result.rows) {
        expect(row.memo).toBeDefined();
      }
    });
  });

  describe("error handling", () => {
    it("throws on missing header column", () => {
      const parser = new CSVParser({
        ...testDefaults,
        name: "Bad Config",
        metaLines: { start: 1, end: 1 },
        headerRow: 2,
        dataStartRow: 3,
        columnMap: { "NonExistent Column": "date" },
      });

      const csv = "meta line\nDate,Amount\n2026/01/01,100";

      expect(() => parser.parse(csv)).toThrow(
        'CSV header "NonExistent Column" not found',
      );
    });

    it("throws on invalid amount", () => {
      const parser = new CSVParser({
        ...testDefaults,
        name: "Test",
        metaLines: { start: 1, end: 1 },
        headerRow: 2,
        dataStartRow: 3,
        columnMap: {
          Date: "date",
          Id: "externalId",
          Type: "type",
          Payee: "payee",
          Amount: "amount",
        },
      });

      const csv =
        "meta\nDate,Id,Type,Payee,Amount\n2026/01/01,1,TFR,Test,notanumber";

      expect(() => parser.parse(csv)).toThrow("Invalid amount");
    });

    it("throws on missing header row", () => {
      const parser = new CSVParser({
        ...testDefaults,
        name: "Test",
        metaLines: { start: 1, end: 1 },
        headerRow: 99,
        dataStartRow: 100,
        columnMap: { Date: "date" },
      });

      expect(() => parser.parse("one line")).toThrow("Header row 99 not found");
    });
  });

  describe("date format handling", () => {
    const makeParser = (dateFormat?: string) =>
      new CSVParser({
        ...testDefaults,
        name: "Test",
        metaLines: { start: 1, end: 1 },
        headerRow: 2,
        dataStartRow: 3,
        dateFormat,
        columnMap: {
          Date: "date",
          Id: "externalId",
          Type: "type",
          Payee: "payee",
          Amount: "amount",
        },
      });

    const makeCsv = (date: string) =>
      `meta\nDate,Id,Type,Payee,Amount\n${date},1,TFR,Test,100`;

    const march15 = new Date("2026-03-15T00:00:00");

    it("parses dd/MM/yyyy when dateFormat is set", () => {
      const parser = makeParser("dd/MM/yyyy");
      const result = parser.parse(makeCsv("15/03/2026"));

      expect(result.rows[0].date).toEqual(march15);
    });

    it("parses MM/dd/yyyy when dateFormat is set", () => {
      const parser = makeParser("MM/dd/yyyy");
      const result = parser.parse(makeCsv("03/15/2026"));

      expect(result.rows[0].date).toEqual(march15);
    });

    it("parses ddMMyyyy (no separator) when dateFormat is set", () => {
      const parser = makeParser("ddMMyyyy");
      const result = parser.parse(makeCsv("15032026"));

      expect(result.rows[0].date).toEqual(march15);
    });

    it("parses dd-MM-yyyy with dash separator", () => {
      const parser = makeParser("dd-MM-yyyy");
      const result = parser.parse(makeCsv("15-03-2026"));

      expect(result.rows[0].date).toEqual(march15);
    });

    it("parses dd.MM.yyyy with dot separator", () => {
      const parser = makeParser("dd.MM.yyyy");
      const result = parser.parse(makeCsv("15.03.2026"));

      expect(result.rows[0].date).toEqual(march15);
    });

    it("auto-detects YYYY/MM/DD without dateFormat", () => {
      const parser = makeParser();
      const result = parser.parse(makeCsv("2026/03/15"));

      expect(result.rows[0].date).toEqual(march15);
    });

    it("auto-detects YYYYMMDD without dateFormat", () => {
      const parser = makeParser();
      const result = parser.parse(makeCsv("20260315"));

      expect(result.rows[0].date).toEqual(march15);
    });

    it("throws on ambiguous date without dateFormat", () => {
      const parser = makeParser();

      expect(() => parser.parse(makeCsv("15/03/2026"))).toThrow(
        "Ambiguous or unrecognised date format",
      );
    });
  });
});
