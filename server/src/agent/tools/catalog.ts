import { z } from "zod";
import { ACCOUNTS, CATEGORIES, DATA_RANGE, TRANSACTIONS, currentBalance } from "shared";
import { defineTool } from "./types";

/**
 * The observation tool: lets the model look up what data exists before
 * referencing accounts, categories, or dates.
 */
export const getDataCatalog = defineTool({
  name: "get_data_catalog",
  description:
    "List the available accounts (with ids and current balances), transaction categories, and the date range data exists for. Call this before referencing any account or category you have not seen in this conversation.",
  schema: z.object({}),
  execute: () => {
    const accounts = ACCOUNTS.map((a) => ({
      id: a.id,
      name: a.name,
      type: a.type,
      currentBalance: currentBalance(a, TRANSACTIONS),
    }));
    return JSON.stringify(
      { accounts, categories: CATEGORIES, dateRange: DATA_RANGE },
      null,
      2,
    );
  },
});
