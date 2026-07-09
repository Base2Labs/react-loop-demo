import type { DashboardSpec } from "shared";

/**
 * Milestone 2 only: a hard-coded spec exercising all three widget types.
 * Replaced by agent-driven specs in milestone 4.
 */
export const DEMO_SPEC: DashboardSpec = {
  sections: [
    {
      id: "accounts-overview",
      title: "Accounts Overview",
      color: "blue",
      widget: { kind: "balance", accountIds: "all", aggregate: false },
    },
    {
      id: "spending-by-category",
      title: "Monthly Spending — Groceries vs Dining",
      color: "amber",
      widget: {
        kind: "chart",
        chartType: "bar",
        metric: "spending",
        categories: ["groceries", "dining"],
        interval: "month",
      },
    },
    {
      id: "checking-balance-trend",
      title: "Checking Balance Over Time",
      color: "green",
      widget: {
        kind: "chart",
        chartType: "line",
        metric: "balance",
        accountIds: ["everyday-checking", "joint-checking"],
        interval: "week",
      },
    },
    {
      id: "recent-transactions",
      title: "Recent Transactions",
      color: "slate",
      widget: {
        kind: "transactions",
        filters: {},
        sort: { field: "date", dir: "desc" },
        pageSize: 8,
        rowLimit: 40,
      },
    },
  ],
};
