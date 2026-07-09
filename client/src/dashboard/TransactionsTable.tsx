import { useEffect, useMemo, useState } from "react";
import type { SortField, TransactionsWidget } from "shared";
import { ACCOUNTS, TRANSACTIONS } from "shared";
import { selectTableRows } from "../data/transactions";
import { currency } from "./palette";

const COLUMNS: { field: SortField; label: string }[] = [
  { field: "date", label: "Date" },
  { field: "description", label: "Description" },
  { field: "category", label: "Category" },
  { field: "amount", label: "Amount" },
];

const accountName = (id: string) =>
  ACCOUNTS.find((a) => a.id === id)?.name ?? id;

export function TransactionsTable({ widget }: { widget: TransactionsWidget }) {
  // Sort starts from the spec; header clicks override it locally until the
  // agent updates the widget again.
  const [sort, setSort] = useState(widget.sort);
  const [page, setPage] = useState(0);
  useEffect(() => {
    setSort(widget.sort);
    setPage(0);
  }, [widget]);

  const rows = useMemo(
    () => selectTableRows(TRANSACTIONS, { ...widget, sort }),
    [widget, sort],
  );

  const pageCount = Math.max(1, Math.ceil(rows.length / widget.pageSize));
  const clampedPage = Math.min(page, pageCount - 1);
  const pageRows = rows.slice(
    clampedPage * widget.pageSize,
    (clampedPage + 1) * widget.pageSize,
  );

  const toggleSort = (field: SortField) =>
    setSort((prev) => ({
      field,
      dir: prev.field === field && prev.dir === "desc" ? "asc" : "desc",
    }));

  return (
    <div className="tx-table">
      <table>
        <thead>
          <tr>
            {COLUMNS.map(({ field, label }) => (
              <th key={field} onClick={() => toggleSort(field)}>
                {label}
                {sort.field === field ? (sort.dir === "asc" ? " ↑" : " ↓") : ""}
              </th>
            ))}
            <th>Account</th>
          </tr>
        </thead>
        <tbody>
          {pageRows.map((tx) => (
            <tr key={tx.id}>
              <td>{tx.date}</td>
              <td>{tx.description}</td>
              <td>
                <span className="category-pill">{tx.category}</span>
              </td>
              <td className={tx.amount < 0 ? "amount negative" : "amount"}>
                {currency.format(tx.amount)}
              </td>
              <td className="muted">{accountName(tx.accountId)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <footer className="tx-footer">
        <span className="muted">
          {rows.length} transaction{rows.length === 1 ? "" : "s"}
          {widget.rowLimit !== undefined ? ` (capped at ${widget.rowLimit})` : ""}
        </span>
        {pageCount > 1 && (
          <span className="tx-pager">
            <button onClick={() => setPage(clampedPage - 1)} disabled={clampedPage === 0}>
              ‹ Prev
            </button>
            <span className="muted">
              {clampedPage + 1} / {pageCount}
            </span>
            <button
              onClick={() => setPage(clampedPage + 1)}
              disabled={clampedPage >= pageCount - 1}
            >
              Next ›
            </button>
          </span>
        )}
      </footer>
    </div>
  );
}
