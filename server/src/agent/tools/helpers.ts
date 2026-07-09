import { z } from "zod";
import { ACCOUNTS, CATEGORIES } from "shared";
import type { DashboardSpec, Section } from "shared";
import { ToolError } from "./types";

export function requireSection(spec: DashboardSpec, id: string): Section {
  const section = spec.sections.find((s) => s.id === id);
  if (!section) {
    const known = spec.sections.map((s) => s.id).join(", ") || "(none)";
    throw new ToolError(
      `No section with id "${id}". Existing sections: ${known}. Create it first with upsert_section.`,
    );
  }
  return section;
}

export function validateAccountIds(ids: string[]): void {
  const known = new Set(ACCOUNTS.map((a) => a.id));
  const unknown = ids.filter((id) => !known.has(id));
  if (unknown.length > 0) {
    throw new ToolError(
      `Unknown account id(s): ${unknown.join(", ")}. Valid ids: ${[...known].join(", ")}. Use get_data_catalog to inspect accounts.`,
    );
  }
}

/** One line per section — appended to tool results so the model always knows
 * the current dashboard state without re-querying. */
export function specSummary(spec: DashboardSpec): string {
  if (spec.sections.length === 0) return "Dashboard is empty.";
  const lines = spec.sections.map(
    (s, i) => `${i + 1}. [${s.id}] "${s.title}" (${s.color}) — ${s.widget?.kind ?? "empty"}`,
  );
  return `Dashboard now:\n${lines.join("\n")}`;
}

/** Shared zod fragments used by several widget schemas. */
export const zDateRange = z
  .object({
    from: z.string().describe("ISO date, inclusive, e.g. 2026-01-01"),
    to: z.string().describe("ISO date, inclusive"),
  })
  .describe("Data available 2025-07-01 to 2026-06-30");

export const zAccountIds = z
  .array(z.string())
  .describe("Account ids from get_data_catalog");

export const zCategories = z.array(z.enum(CATEGORIES));
