/**
 * The dashboard spec: a declarative JSON document that the agent's tools
 * mutate and the React app renders. The LLM never touches the DOM — this
 * document is the only contract between agent and UI.
 */

export const SECTION_COLORS = [
  "blue",
  "green",
  "amber",
  "rose",
  "violet",
  "slate",
] as const;

export type SectionColor = (typeof SECTION_COLORS)[number];

export interface DashboardSpec {
  /** Render order = array order. */
  sections: Section[];
}

export interface Section {
  /** Model-chosen slug, e.g. "checking-overview". */
  id: string;
  title: string;
  color: SectionColor;
  widget: Widget | null;
}

export type Widget = BalanceWidget | TransactionsWidget | ChartWidget;

export interface BalanceWidget {
  kind: "balance";
  /** One account, several, or every account. */
  accountIds: string[] | "all";
  /** Sum across accounts vs one card per account. */
  aggregate: boolean;
}

export interface DateRange {
  from: string; // ISO date
  to: string; // ISO date
}

export interface TransactionFilters {
  accountIds?: string[];
  categories?: string[];
  dateRange?: DateRange;
  minAmount?: number;
  maxAmount?: number;
  /** Substring match on description. */
  search?: string;
}

export type SortField = "date" | "amount" | "description" | "category";

export interface TransactionsWidget {
  kind: "transactions";
  filters: TransactionFilters;
  sort: { field: SortField; dir: "asc" | "desc" };
  /** Rows per page; the UI renders pagination controls. */
  pageSize: number;
  /** Hard cap across all pages. */
  rowLimit?: number;
}

export interface ChartWidget {
  kind: "chart";
  chartType: "line" | "bar";
  metric: "balance" | "spending";
  /** Default: all accounts. */
  accountIds?: string[];
  /** One series per category when metric = "spending". */
  categories?: string[];
  interval: "day" | "week" | "month";
  dateRange?: DateRange;
}

export const EMPTY_DASHBOARD: DashboardSpec = { sections: [] };
