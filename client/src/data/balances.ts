import type { Account, Transaction } from "shared";

/** Current balance = opening balance + every transaction on the account. */
export function currentBalance(account: Account, txs: Transaction[]): number {
  const sum = txs.reduce(
    (acc, tx) => (tx.accountId === account.id ? acc + tx.amount : acc),
    0,
  );
  return Math.round((account.openingBalance + sum) * 100) / 100;
}

export function resolveAccounts(
  accounts: Account[],
  accountIds: string[] | "all" | undefined,
): Account[] {
  if (!accountIds || accountIds === "all") return accounts;
  return accounts.filter((a) => accountIds.includes(a.id));
}
