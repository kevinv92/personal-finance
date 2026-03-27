import Papa from "papaparse";
import { parse, isValid } from "date-fns";
import type {
  CSVMapperConfig,
  ParsedCSV,
  TransactionRow,
  TransactionField,
} from "./types.js";

export class CSVParser {
  constructor(private config: CSVMapperConfig) {}

  parse(rawContent: string): ParsedCSV {
    const lines = rawContent.split("\n");

    const meta = this.extractMeta(lines);
    const accountSignature = this.extractAccountSignature(lines);
    const headers = this.extractHeaders(lines);
    const rows = this.extractRows(lines, headers);

    return { meta, accountSignature, headers, rows };
  }

  private extractMeta(lines: string[]): string[] {
    const { start, end } = this.config.metaLines;
    return lines.slice(start - 1, end).map((line) => line.trim());
  }

  private extractAccountSignature(lines: string[]): string | null {
    const { accountMetaLine } = this.config;
    if (!accountMetaLine) return null;

    const line = lines[accountMetaLine - 1];
    return line?.trim() ?? null;
  }

  private extractHeaders(lines: string[]): string[] {
    const headerLine = lines[this.config.headerRow - 1];
    if (!headerLine) {
      throw new Error(
        `Header row ${this.config.headerRow} not found in CSV file`,
      );
    }

    const delimiter = this.config.delimiter ?? ",";
    const parsed = Papa.parse<string[]>(headerLine, {
      delimiter,
      header: false,
    });

    return parsed.data[0] ?? [];
  }

  private extractRows(lines: string[], headers: string[]): TransactionRow[] {
    const dataLines = lines.slice(this.config.dataStartRow - 1);
    const csvContent = dataLines.join("\n");

    const delimiter = this.config.delimiter ?? ",";
    const parsed = Papa.parse<string[]>(csvContent, {
      delimiter,
      header: false,
      skipEmptyLines: true,
    });

    const fieldByIndex = this.buildFieldIndex(headers);

    return parsed.data.map((row, rowIndex) =>
      this.mapRow(row, fieldByIndex, rowIndex),
    );
  }

  private buildFieldIndex(headers: string[]): Map<number, TransactionField> {
    const fieldByIndex = new Map<number, TransactionField>();

    for (const [csvHeader, field] of Object.entries(this.config.columnMap)) {
      const index = headers.indexOf(csvHeader);
      if (index === -1) {
        throw new Error(
          `CSV header "${csvHeader}" not found. Available headers: ${headers.join(", ")}`,
        );
      }
      fieldByIndex.set(index, field);
    }

    return fieldByIndex;
  }

  private mapRow(
    row: string[],
    fieldByIndex: Map<number, TransactionField>,
    rowIndex: number,
  ): TransactionRow {
    const mapped: Record<string, string | number | Date | undefined> = {};

    for (const [index, field] of fieldByIndex) {
      const rawValue = row[index]?.trim() ?? "";

      if (field === "amount") {
        let amount = parseFloat(rawValue);
        if (isNaN(amount)) {
          throw new Error(
            `Invalid amount "${rawValue}" at data row ${rowIndex + 1}`,
          );
        }
        if (this.config.invertAmount) {
          amount = -amount;
        }
        mapped[field] = amount;
      } else if (field === "date" || field === "dateProcessed") {
        mapped[field] = this.parseDate(rawValue);
      } else {
        mapped[field] = rawValue;
      }
    }

    if (!mapped.date || !mapped.externalId || !mapped.payee) {
      throw new Error(
        `Missing required field(s) at data row ${rowIndex + 1}: date, externalId, and payee are required`,
      );
    }

    return {
      date: mapped.date as Date,
      dateProcessed: mapped.dateProcessed as Date | undefined,
      externalId: mapped.externalId as string,
      type: (mapped.type as string) ?? "",
      payee: mapped.payee as string,
      memo: mapped.memo as string | undefined,
      amount: mapped.amount as number,
    };
  }

  /** Unambiguous formats we can auto-detect without config */
  private static readonly AUTO_DETECT_FORMATS = [
    "yyyy/MM/dd",
    "yyyy-MM-dd",
    "yyyyMMdd",
  ];

  /**
   * Parses date strings into Date objects.
   * Uses dateFormat from config when set, otherwise auto-detects from unambiguous formats.
   */
  private parseDate(raw: string): Date {
    const referenceDate = new Date(2000, 0, 1);

    if (this.config.dateFormat) {
      const date = parse(raw, this.config.dateFormat, referenceDate);
      if (!isValid(date)) {
        throw new Error(
          `Date "${raw}" does not match expected format "${this.config.dateFormat}"`,
        );
      }
      return date;
    }

    for (const fmt of CSVParser.AUTO_DETECT_FORMATS) {
      const date = parse(raw, fmt, referenceDate);
      if (isValid(date)) {
        return date;
      }
    }

    throw new Error(
      `Ambiguous or unrecognised date format: "${raw}". Set dateFormat in the mapper config to resolve.`,
    );
  }
}
