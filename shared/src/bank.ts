/** Mock banking domain: accounts and transactions the dashboard visualizes. */

export type AccountType = "checking" | "savings" | "credit";

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  openingBalance: number;
}

export type Category =
  | "groceries"
  | "dining"
  | "rent"
  | "utilities"
  | "transport"
  | "entertainment"
  | "income"
  | "transfers";

export interface Transaction {
  id: string;
  accountId: string;
  date: string; // ISO date, e.g. "2026-03-14"
  description: string;
  category: Category;
  /** Positive = money in, negative = money out. */
  amount: number;
}
