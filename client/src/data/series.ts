import type { Account, ChartWidget, DateRange, Transaction } from "shared";
import { resolveAccounts } from "./balances";

/**
 * Chart selectors: turn transactions into Recharts-shaped rows —
 * one object per time bucket, one key per series.
 */

export interface SeriesRow {
  bucket: string;
  [seriesKey: string]: string | number;
}

type Interval = ChartWidget["interval"];

/** Bucket key for a date: the day itself, the week's Monday, or "YYYY-MM". */
function bucketKey(isoDate: string, interval: Interval): string {
  if (interval === "day") return isoDate;
  if (interval === "month") return isoDate.slice(0, 7);
  const d = new Date(`${isoDate}T00:00:00Z`);
  const shift = (d.getUTCDay() + 6) % 7; // days since Monday
  d.setUTCDate(d.getUTCDate() - shift);
  return d.toISOString().slice(0, 10);
}

function nextBucket(bucket: string, interval: Interval): string {
  if (interval === "month") {
    const [y, m] = bucket.split("-").map(Number);
    return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
  }
  const d = new Date(`${bucket}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + (interval === "week" ? 7 : 1));
  return d.toISOString().slice(0, 10);
}

function listBuckets(range: DateRange, interval: Interval): string[] {
  const buckets: string[] = [];
  const last = bucketKey(range.to, interval);
  for (let b = bucketKey(range.from, interval); b <= last; b = nextBucket(b, interval)) {
    buckets.push(b);
  }
  return buckets;
}

function nextDay(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

function clampToRange(txs: Transaction[], range: DateRange): Transaction[] {
  return txs.filter((tx) => tx.date >= range.from && tx.date <= range.to);
}

/**
 * Balance over time: one series per account, value = balance at the end of
 * each bucket (replayed from the opening balance, so pre-range history counts).
 */
export function balanceSeries(
  accounts: Account[],
  txs: Transaction[],
  widget: Pick<ChartWidget, "accountIds" | "interval" | "dateRange">,
  fallbackRange: DateRange,
): SeriesRow[] {
  const selected = resolveAccounts(accounts, widget.accountIds);
  const range = widget.dateRange ?? fallbackRange;
  const buckets = listBuckets(range, widget.interval);

  return buckets.map((bucket, i) => {
    const row: SeriesRow = { bucket };
    // Balance at end of bucket = all transactions strictly before the cutoff.
    const cutoff =
      i === buckets.length - 1 ? nextDay(range.to) : nextBucket(bucket, widget.interval);
    for (const account of selected) {
      const upTo = txs.reduce(
        (acc, tx) =>
          tx.accountId === account.id && tx.date < cutoff ? acc + tx.amount : acc,
        account.openingBalance,
      );
      row[account.name] = Math.round(upTo * 100) / 100;
    }
    return row;
  });
}

/**
 * Spending over time: one series per category, value = money out (absolute)
 * per bucket. Categories default to every spending category in range.
 */
export function spendingSeries(
  txs: Transaction[],
  widget: Pick<ChartWidget, "accountIds" | "categories" | "interval" | "dateRange">,
  fallbackRange: DateRange,
): { rows: SeriesRow[]; categories: string[] } {
  const range = widget.dateRange ?? fallbackRange;
  const accountIds = widget.accountIds;
  const outflows = clampToRange(txs, range).filter(
    (tx) =>
      tx.amount < 0 &&
      tx.category !== "transfers" &&
      (!accountIds || accountIds.includes(tx.accountId)),
  );

  const categories =
    widget.categories ?? [...new Set(outflows.map((tx) => tx.category))].sort();

  const totals = new Map<string, Map<string, number>>();
  for (const tx of outflows) {
    if (!categories.includes(tx.category)) continue;
    const bucket = bucketKey(tx.date, widget.interval);
    const byCategory = totals.get(bucket) ?? new Map();
    byCategory.set(tx.category, (byCategory.get(tx.category) ?? 0) - tx.amount);
    totals.set(bucket, byCategory);
  }

  const rows = listBuckets(range, widget.interval).map((bucket) => {
    const row: SeriesRow = { bucket };
    for (const category of categories) {
      row[category] = Math.round((totals.get(bucket)?.get(category) ?? 0) * 100) / 100;
    }
    return row;
  });

  return { rows, categories };
}
