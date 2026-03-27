import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { CategoryBreakdownWidget } from "./category-breakdown-widget";
import { WidgetStoryLayout } from "../widget-story-layout";
import type { WidgetData } from "../widget-data";

const categoryTotals = [
  { name: "Groceries", value: 1234.56 },
  { name: "Subscriptions & Digital", value: 987.32 },
  { name: "Eating Out", value: 654.21 },
  { name: "Transport", value: 432.1 },
  { name: "Shopping", value: 321.0 },
  { name: "Insurance", value: 243.04 },
  { name: "Health", value: 120.5 },
  { name: "Recreation", value: 89.0 },
  { name: "Fees", value: 45.2 },
  { name: "Donations", value: 45.0 },
];

const baseData: WidgetData = {
  transactions: [],
  totalIncome: 11002.11,
  totalExpenses: -4171.93,
  netAmount: 6830.18,
  categoryTotals,
};

const meta: Meta<typeof CategoryBreakdownWidget> = {
  title: "Widgets/CategoryBreakdown",
  component: CategoryBreakdownWidget,
};

export default meta;
type Story = StoryObj<typeof CategoryBreakdownWidget>;

export const Default: Story = {
  render: (args) => (
    <WidgetStoryLayout
      title="Spending by Category"
      widgetType="categoryBreakdown"
      filterName="Last Month"
      initialW={6}
      initialH={5}
      minW={3}
      minH={3}
    >
      {() => <CategoryBreakdownWidget {...args} />}
    </WidgetStoryLayout>
  ),
  args: {
    data: baseData,
    config: { maxCategories: 10, showTable: false },
  },
};

export const WithTable: Story = {
  render: (args) => (
    <WidgetStoryLayout
      title="Spending by Category"
      widgetType="categoryBreakdown"
      initialW={6}
      initialH={6}
      minW={3}
      minH={3}
    >
      {() => <CategoryBreakdownWidget {...args} />}
    </WidgetStoryLayout>
  ),
  args: {
    data: baseData,
    config: { maxCategories: 10, showTable: true },
  },
};

export const FewCategories: Story = {
  render: (args) => (
    <WidgetStoryLayout
      title="Top 3 Categories"
      widgetType="categoryBreakdown"
      initialW={4}
      initialH={4}
      minW={3}
      minH={3}
    >
      {() => <CategoryBreakdownWidget {...args} />}
    </WidgetStoryLayout>
  ),
  args: {
    data: {
      ...baseData,
      categoryTotals: categoryTotals.slice(0, 3),
    },
    config: { maxCategories: 5, showTable: false },
  },
};

export const NoData: Story = {
  render: (args) => (
    <WidgetStoryLayout
      title="No Data"
      widgetType="categoryBreakdown"
      initialW={6}
      initialH={4}
      minW={3}
      minH={3}
    >
      {() => <CategoryBreakdownWidget {...args} />}
    </WidgetStoryLayout>
  ),
  args: {
    data: {
      ...baseData,
      categoryTotals: [],
    },
    config: { maxCategories: 10, showTable: false },
  },
};
