import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { SummaryWidget } from "./summary-widget";
import { WidgetStoryLayout } from "../widget-story-layout";
import type { WidgetData } from "../widget-data";

const baseData: WidgetData = {
  transactions: Array.from({ length: 56 }, (_, i) => ({
    id: `txn-${i}`,
    accountId: "acc-1",
    externalId: `ext-${i}`,
    date: "2026-03-01",
    dateProcessed: null,
    type: i % 5 === 0 ? "TFR IN" : "DEBIT",
    payee: `Payee ${i}`,
    memo: null,
    amount: i % 5 === 0 ? 3667.37 : -(Math.random() * 200),
    recurringId: null,
    categoryName: "Groceries",
    createdAt: new Date().toISOString(),
  })),
  totalIncome: 11002.11,
  totalExpenses: -8234.56,
  netAmount: 2767.55,
  categoryTotals: [],
};

const meta: Meta<typeof SummaryWidget> = {
  title: "Widgets/Summary",
  component: SummaryWidget,
};

export default meta;
type Story = StoryObj<typeof SummaryWidget>;

export const Positive: Story = {
  render: (args) => (
    <WidgetStoryLayout
      title="Total Net Last Month"
      widgetType="summary"
      initialW={4}
      initialH={3}
      minW={1}
      minH={1}
    >
      {(gridW, gridH) => (
        <SummaryWidget {...args} gridW={gridW} gridH={gridH} />
      )}
    </WidgetStoryLayout>
  ),
  args: {
    title: "Total Net Last Month",
    data: baseData,
    config: { showTransactionCount: true },
  },
};

export const Compact: Story = {
  render: (args) => (
    <WidgetStoryLayout
      title="Net"
      widgetType="summary"
      initialW={2}
      initialH={2}
      minW={1}
      minH={1}
    >
      {(gridW, gridH) => (
        <SummaryWidget {...args} gridW={gridW} gridH={gridH} />
      )}
    </WidgetStoryLayout>
  ),
  args: {
    title: "Net",
    data: baseData,
    config: { showTransactionCount: false },
  },
};

export const Wide: Story = {
  render: (args) => (
    <WidgetStoryLayout
      title="Full Year Overview 2026"
      widgetType="summary"
      initialW={8}
      initialH={4}
      minW={1}
      minH={1}
    >
      {(gridW, gridH) => (
        <SummaryWidget {...args} gridW={gridW} gridH={gridH} />
      )}
    </WidgetStoryLayout>
  ),
  args: {
    title: "Full Year Overview 2026",
    data: baseData,
    config: { showTransactionCount: true },
  },
};

export const Negative: Story = {
  render: (args) => (
    <WidgetStoryLayout
      title="Total Groceries This Week"
      widgetType="summary"
      initialW={4}
      initialH={3}
      minW={1}
      minH={1}
    >
      {(gridW, gridH) => (
        <SummaryWidget {...args} gridW={gridW} gridH={gridH} />
      )}
    </WidgetStoryLayout>
  ),
  args: {
    title: "Total Groceries This Week",
    data: {
      ...baseData,
      totalIncome: 3667.37,
      totalExpenses: -8234.56,
      netAmount: -4567.19,
    },
    config: { showTransactionCount: true },
  },
};

export const Zero: Story = {
  render: (args) => (
    <WidgetStoryLayout
      title="No Transactions Yet"
      widgetType="summary"
      initialW={4}
      initialH={3}
      minW={1}
      minH={1}
    >
      {(gridW, gridH) => (
        <SummaryWidget {...args} gridW={gridW} gridH={gridH} />
      )}
    </WidgetStoryLayout>
  ),
  args: {
    title: "No Transactions Yet",
    data: {
      ...baseData,
      transactions: [],
      totalIncome: 0,
      totalExpenses: 0,
      netAmount: 0,
    },
    config: { showTransactionCount: true },
  },
};
