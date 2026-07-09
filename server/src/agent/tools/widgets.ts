import { z } from "zod";
import { defineTool } from "./types";
import {
  requireSection,
  specSummary,
  validateAccountIds,
  zAccountIds,
  zCategories,
  zDateRange,
} from "./helpers";

/** Tools that put content into a section (one widget per section). */

export const setBalanceWidget = defineTool({
  name: "set_balance_widget",
  description:
    "Show account balance(s) in a section: one card per account, or a single aggregated total.",
  schema: z.object({
    sectionId: z.string(),
    accountIds: z
      .union([z.literal("all"), zAccountIds])
      .describe('Specific account ids, or "all"'),
    aggregate: z
      .boolean()
      .default(false)
      .describe("true = one summed total, false = one card per account"),
  }),
  execute: (input, { spec }) => {
    const section = requireSection(spec, input.sectionId);
    if (input.accountIds !== "all") validateAccountIds(input.accountIds);
    section.widget = {
      kind: "balance",
      accountIds: input.accountIds,
      aggregate: input.aggregate,
    };
    return `Section "${input.sectionId}" now shows balances.\n${specSummary(spec)}`;
  },
});

export const setTransactionsWidget = defineTool({
  name: "set_transactions_widget",
  description:
    "Show a filterable, sortable, paginated transaction table in a section.",
  schema: z.object({
    sectionId: z.string(),
    filters: z
      .object({
        accountIds: zAccountIds.optional(),
        categories: zCategories.optional(),
        dateRange: zDateRange.optional(),
        minAmount: z.number().optional().describe("Inclusive; outflows are negative"),
        maxAmount: z.number().optional().describe("Inclusive; outflows are negative"),
        search: z.string().optional().describe("Substring match on description"),
      })
      .default({})
      .describe("Omit any filter to leave it open"),
    sort: z
      .object({
        field: z.enum(["date", "amount", "description", "category"]),
        dir: z.enum(["asc", "desc"]),
      })
      .default({ field: "date", dir: "desc" }),
    pageSize: z.number().int().min(1).max(50).default(10),
    rowLimit: z
      .number()
      .int()
      .min(1)
      .optional()
      .describe("Hard cap on total rows across all pages"),
  }),
  execute: (input, { spec }) => {
    const section = requireSection(spec, input.sectionId);
    if (input.filters.accountIds) validateAccountIds(input.filters.accountIds);
    section.widget = {
      kind: "transactions",
      filters: input.filters,
      sort: input.sort,
      pageSize: input.pageSize,
      rowLimit: input.rowLimit,
    };
    return `Section "${input.sectionId}" now shows a transaction table.\n${specSummary(spec)}`;
  },
});

export const setChartWidget = defineTool({
  name: "set_chart_widget",
  description:
    "Show a line or bar chart in a section: balance over time (per account) or spending over time (per category).",
  schema: z.object({
    sectionId: z.string(),
    chartType: z.enum(["line", "bar"]),
    metric: z
      .enum(["balance", "spending"])
      .describe("balance = account balance over time; spending = money out per category"),
    accountIds: zAccountIds.optional().describe("Omit for all accounts"),
    categories: zCategories
      .optional()
      .describe("Only for metric=spending; omit for all spending categories"),
    interval: z.enum(["day", "week", "month"]).default("month"),
    dateRange: zDateRange.optional().describe("Omit for the full data range"),
  }),
  execute: (input, { spec }) => {
    const section = requireSection(spec, input.sectionId);
    if (input.accountIds) validateAccountIds(input.accountIds);
    section.widget = {
      kind: "chart",
      chartType: input.chartType,
      metric: input.metric,
      accountIds: input.accountIds,
      categories: input.categories,
      interval: input.interval,
      dateRange: input.dateRange,
    };
    return `Section "${input.sectionId}" now shows a ${input.chartType} chart of ${input.metric}.\n${specSummary(spec)}`;
  },
});
