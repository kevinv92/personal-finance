import type { CSVMapperConfig } from "./types.js";

export const csvMapperPresets: Record<string, CSVMapperConfig> = {
  "asb-streamline": {
    name: "ASB Streamline",
    bank: "ASB",
    accountType: "checking",
    csvSignature: "Bank 12; Branch 3162; Account 0156490-50 (Streamline)",
    metaLines: { start: 1, end: 6 },
    headerRow: 7,
    dataStartRow: 9,
    accountMetaLine: 2,
    columnMap: {
      Date: "date",
      "Unique Id": "externalId",
      "Tran Type": "type",
      Payee: "payee",
      Memo: "memo",
      Amount: "amount",
    },
  },
  "asb-visa": {
    name: "ASB Visa Rewards",
    bank: "ASB",
    accountType: "credit",
    csvSignature: "Card Number XXXX-XXXX-XXXX-0128 (Visa Rewards)",
    metaLines: { start: 1, end: 4 },
    headerRow: 5,
    dataStartRow: 7,
    accountMetaLine: 2,
    columnMap: {
      "Date of Transaction": "date",
      "Date Processed": "dateProcessed",
      "Unique Id": "externalId",
      "Tran Type": "type",
      Description: "payee",
      Reference: "memo",
      Amount: "amount",
    },
    invertAmount: true,
  },
};
