import type { Account, Category, Transaction } from "./bank";

/**
 * Seeded mock data: same accounts and transactions on every run, so demos are
 * reproducible and client/server always agree without an extra API round trip.
 */

export const ACCOUNTS: Account[] = [
  { id: "everyday-checking", name: "Everyday Checking", type: "checking", openingBalance: 4200 },
  { id: "joint-checking", name: "Joint Checking", type: "checking", openingBalance: 6800 },
  { id: "high-yield-savings", name: "High-Yield Savings", type: "savings", openingBalance: 18500 },
  { id: "credit-card", name: "Credit Card", type: "credit", openingBalance: -650 },
];

/** 12 months of data ending just before "today" in the demo. */
export const DATA_RANGE = { from: "2025-07-01", to: "2026-06-30" };

/** Fixed monthly items: same day and description every month. */
interface RecurringItem {
  day: number;
  description: string;
  category: Category;
  amount: number; // jittered ±10% unless income
}

/** Variable spending: N transactions per month within an amount range. */
interface SpendingPattern {
  category: Category;
  descriptions: string[];
  perMonth: number;
  min: number;
  max: number;
}

interface AccountProfile {
  accountId: string;
  recurring: RecurringItem[];
  spending: SpendingPattern[];
}

const GROCERIES = ["Whole Foods Market", "Trader Joe's", "Safeway", "Local Farmers Market"];
const DINING = ["Blue Bottle Coffee", "Chipotle", "Thai Basil", "La Taqueria", "Sushi Ran"];
const TRANSPORT = ["Uber", "Shell Gas", "Clipper Card", "City Parking"];
const ENTERTAINMENT = ["Netflix", "Spotify", "AMC Theatres", "Steam Games"];

const PROFILES: AccountProfile[] = [
  {
    accountId: "everyday-checking",
    recurring: [
      { day: 1, description: "Sunrise Apartments Rent", category: "rent", amount: -1850 },
      { day: 10, description: "ACME Corp Payroll", category: "income", amount: 2600 },
      { day: 25, description: "ACME Corp Payroll", category: "income", amount: 2600 },
      { day: 5, description: "PG&E Electric", category: "utilities", amount: -95 },
      { day: 12, description: "Comcast Internet", category: "utilities", amount: -80 },
      { day: 26, description: "Transfer to Savings", category: "transfers", amount: -400 },
    ],
    spending: [
      { category: "groceries", descriptions: GROCERIES, perMonth: 6, min: 30, max: 140 },
      { category: "dining", descriptions: DINING, perMonth: 7, min: 12, max: 70 },
      { category: "transport", descriptions: TRANSPORT, perMonth: 5, min: 8, max: 60 },
    ],
  },
  {
    accountId: "joint-checking",
    recurring: [
      { day: 15, description: "Riverside Consulting Invoice", category: "income", amount: 3200 },
      { day: 3, description: "Oakwood Lane Mortgage", category: "rent", amount: -1600 },
      { day: 8, description: "Municipal Water District", category: "utilities", amount: -60 },
    ],
    spending: [
      { category: "groceries", descriptions: GROCERIES, perMonth: 4, min: 40, max: 180 },
      { category: "dining", descriptions: DINING, perMonth: 3, min: 25, max: 110 },
    ],
  },
  {
    accountId: "high-yield-savings",
    recurring: [
      { day: 26, description: "Transfer from Checking", category: "transfers", amount: 400 },
      { day: 28, description: "Interest Payment", category: "income", amount: 62 },
    ],
    spending: [],
  },
  {
    accountId: "credit-card",
    recurring: [
      { day: 20, description: "Card Payment - Thank You", category: "transfers", amount: 640 },
    ],
    spending: [
      { category: "dining", descriptions: DINING, perMonth: 6, min: 15, max: 90 },
      { category: "entertainment", descriptions: ENTERTAINMENT, perMonth: 4, min: 10, max: 55 },
      { category: "transport", descriptions: TRANSPORT, perMonth: 3, min: 10, max: 45 },
      { category: "groceries", descriptions: GROCERIES, perMonth: 2, min: 25, max: 90 },
    ],
  },
];

/** Deterministic PRNG (mulberry32) so the dataset is identical on every run. */
function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function generateTransactions(): Transaction[] {
  const rand = mulberry32(42);
  const between = (min: number, max: number) => min + rand() * (max - min);
  const pick = <T,>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];
  const iso = (year: number, month: number, day: number) =>
    `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  // Months spanning DATA_RANGE: 2025-07 .. 2026-06.
  const months = Array.from({ length: 12 }, (_, i) => {
    const month = ((6 + i) % 12) + 1;
    return { year: month >= 7 ? 2025 : 2026, month };
  });

  const txs: Transaction[] = [];
  let id = 0;

  for (const profile of PROFILES) {
    for (const { year, month } of months) {
      for (const item of profile.recurring) {
        const jitter = item.category === "income" || item.category === "transfers" ? 1 : between(0.9, 1.1);
        txs.push({
          id: `t${++id}`,
          accountId: profile.accountId,
          date: iso(year, month, item.day),
          description: item.description,
          category: item.category,
          amount: Math.round(item.amount * jitter * 100) / 100,
        });
      }
      for (const pattern of profile.spending) {
        for (let i = 0; i < pattern.perMonth; i++) {
          txs.push({
            id: `t${++id}`,
            accountId: profile.accountId,
            date: iso(year, month, 1 + Math.floor(rand() * 28)),
            description: pick(pattern.descriptions),
            category: pattern.category,
            amount: -Math.round(between(pattern.min, pattern.max) * 100) / 100,
          });
        }
      }
    }
  }

  return txs.sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
}

export const TRANSACTIONS: Transaction[] = generateTransactions();
