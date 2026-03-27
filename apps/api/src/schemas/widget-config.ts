import { z } from "zod/v4";

export const SummaryConfigSchema = z.object({
  showTransactionCount: z.boolean().default(true),
});

export const CategoryBreakdownConfigSchema = z.object({
  maxCategories: z.number().int().min(1).max(20).default(10),
  showTable: z.boolean().default(false),
});

export const TrendConfigSchema = z.object({
  groupBy: z.enum(["day", "week", "month"]).default("month"),
  chartType: z.enum(["line", "bar"]).default("bar"),
});

export const TransactionListConfigSchema = z.object({
  pageSize: z.number().int().min(5).max(100).default(10),
});

export const WidgetConfigSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("summary"), ...SummaryConfigSchema.shape }),
  z.object({
    type: z.literal("categoryBreakdown"),
    ...CategoryBreakdownConfigSchema.shape,
  }),
  z.object({ type: z.literal("trend"), ...TrendConfigSchema.shape }),
  z.object({
    type: z.literal("transactionList"),
    ...TransactionListConfigSchema.shape,
  }),
]);

export type SummaryConfig = z.infer<typeof SummaryConfigSchema>;
export type CategoryBreakdownConfig = z.infer<
  typeof CategoryBreakdownConfigSchema
>;
export type TrendConfig = z.infer<typeof TrendConfigSchema>;
export type TransactionListConfig = z.infer<typeof TransactionListConfigSchema>;
export type WidgetConfig = z.infer<typeof WidgetConfigSchema>;

export const widgetConfigDefaults: Record<string, WidgetConfig> = {
  summary: { type: "summary", showTransactionCount: true },
  categoryBreakdown: {
    type: "categoryBreakdown",
    maxCategories: 10,
    showTable: false,
  },
  trend: { type: "trend", groupBy: "month", chartType: "bar" },
  transactionList: { type: "transactionList", pageSize: 10 },
};
