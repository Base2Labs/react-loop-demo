import { ACCOUNTS, CATEGORIES } from "shared";

/**
 * Series colors: validated categorical palette (CVD-safe in this fixed order).
 * Color follows the entity — an account/category always gets the same slot
 * regardless of which subset a chart shows.
 */
const SERIES_SLOTS = [
  "#2a78d6", // blue
  "#1baf7a", // aqua
  "#eda100", // yellow
  "#008300", // green
  "#4a3aa7", // violet
  "#e34948", // red
  "#e87ba4", // magenta
  "#eb6834", // orange
];

const slot = (index: number) => SERIES_SLOTS[index % SERIES_SLOTS.length];

export function colorForAccountName(name: string): string {
  const index = ACCOUNTS.findIndex((a) => a.name === name);
  return slot(index === -1 ? SERIES_SLOTS.length - 1 : index);
}

export function colorForCategory(category: string): string {
  const index = CATEGORIES.indexOf(category as (typeof CATEGORIES)[number]);
  return slot(index === -1 ? SERIES_SLOTS.length - 1 : index);
}

export const CHART_CHROME = {
  grid: "#e1e0d9",
  axis: "#898781",
};

export const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export const compactCurrency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});
