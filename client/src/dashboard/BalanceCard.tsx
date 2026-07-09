import type { BalanceWidget } from "shared";
import { ACCOUNTS, TRANSACTIONS } from "shared";
import { currentBalance, resolveAccounts } from "../data/balances";
import { currency } from "./palette";

export function BalanceCard({ widget }: { widget: BalanceWidget }) {
  const accounts = resolveAccounts(ACCOUNTS, widget.accountIds);

  if (widget.aggregate) {
    const total = accounts.reduce(
      (sum, account) => sum + currentBalance(account, TRANSACTIONS),
      0,
    );
    return (
      <div className="balance-hero">
        <span className="balance-amount">{currency.format(total)}</span>
        <span className="balance-caption">
          Total across {accounts.length} account{accounts.length === 1 ? "" : "s"}
        </span>
      </div>
    );
  }

  return (
    <div className="balance-grid">
      {accounts.map((account) => {
        const balance = currentBalance(account, TRANSACTIONS);
        return (
          <div key={account.id} className="balance-item">
            <span className="balance-name">{account.name}</span>
            <span className={`balance-amount ${balance < 0 ? "negative" : ""}`}>
              {currency.format(balance)}
            </span>
            <span className="balance-caption">{account.type}</span>
          </div>
        );
      })}
    </div>
  );
}
