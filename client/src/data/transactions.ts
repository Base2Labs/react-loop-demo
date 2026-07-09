import type { Transaction, TransactionFilters, TransactionsWidget } from "shared";

/** Pure selectors for the transactions table. */

export function applyFilters(
  txs: Transaction[],
  filters: TransactionFilters,
): Transaction[] {
  const search = filters.search?.toLowerCase();
  return txs.filter((tx) => {
    if (filters.accountIds && !filters.accountIds.includes(tx.accountId)) return false;
    if (filters.categories && !filters.categories.includes(tx.category)) return false;
    if (filters.dateRange) {
      if (tx.date < filters.dateRange.from || tx.date > filters.dateRange.to) return false;
    }
    if (filters.minAmount !== undefined && tx.amount < filters.minAmount) return false;
    if (filters.maxAmount !== undefined && tx.amount > filters.maxAmount) return false;
    if (search && !tx.description.toLowerCase().includes(search)) return false;
    return true;
  });
}

export function applySort(
  txs: Transaction[],
  sort: TransactionsWidget["sort"],
): Transaction[] {
  const dir = sort.dir === "asc" ? 1 : -1;
  return [...txs].sort((a, b) => {
    const va = a[sort.field];
    const vb = b[sort.field];
    const cmp = typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb));
    return cmp * dir;
  });
}

/** Filter + sort + rowLimit in one step — what the table actually renders. */
export function selectTableRows(
  txs: Transaction[],
  widget: TransactionsWidget,
): Transaction[] {
  const rows = applySort(applyFilters(txs, widget.filters), widget.sort);
  return widget.rowLimit !== undefined ? rows.slice(0, widget.rowLimit) : rows;
}
