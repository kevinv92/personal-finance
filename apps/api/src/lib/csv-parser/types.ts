export type TransactionField =
  | "date"
  | "dateProcessed"
  | "externalId"
  | "type"
  | "payee"
  | "memo"
  | "amount";

/** Maps CSV header strings to known transaction fields */
export type ColumnMap = Record<string, TransactionField>;

export type AccountType = "checking" | "savings" | "credit";

export interface CSVMapperConfig {
  name: string;
  bank: string;
  accountType: AccountType;
  csvSignature: string;
  metaLines: { start: number; end: number };
  headerRow: number;
  dataStartRow: number;
  delimiter?: string;
  columnMap: ColumnMap;
  accountMetaLine: number;
  dateFormat?: string;
  invertAmount?: boolean;
}

export interface ParsedCSV {
  meta: string[];
  accountSignature: string | null;
  headers: string[];
  rows: TransactionRow[];
}

export interface TransactionRow {
  date: Date;
  dateProcessed?: Date;
  externalId: string;
  type: string;
  payee: string;
  memo?: string;
  amount: number;
}
