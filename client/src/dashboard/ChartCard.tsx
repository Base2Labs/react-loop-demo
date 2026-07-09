import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ChartWidget } from "shared";
import { ACCOUNTS, DATA_RANGE, TRANSACTIONS, resolveAccounts } from "shared";
import { balanceSeries, spendingSeries, type SeriesRow } from "../data/series";
import { CHART_CHROME, colorForAccountName, colorForCategory, compactCurrency, currency } from "./palette";

export function ChartCard({ widget }: { widget: ChartWidget }) {
  const { rows, seriesKeys, colorFor } = useMemo(() => selectChart(widget), [widget]);

  if (rows.length === 0 || seriesKeys.length === 0) {
    return <p className="placeholder">No data for this chart.</p>;
  }

  const ChartComponent = widget.chartType === "line" ? LineChart : BarChart;

  return (
    <ResponsiveContainer width="100%" height={260}>
      <ChartComponent data={rows} margin={{ top: 8, right: 16, bottom: 0, left: 8 }}>
        <CartesianGrid stroke={CHART_CHROME.grid} vertical={false} />
        <XAxis
          dataKey="bucket"
          tick={{ fill: CHART_CHROME.axis, fontSize: 12 }}
          tickLine={false}
          axisLine={{ stroke: CHART_CHROME.grid }}
          minTickGap={24}
        />
        <YAxis
          tick={{ fill: CHART_CHROME.axis, fontSize: 12 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: number) => compactCurrency.format(v)}
          width={70}
        />
        <Tooltip formatter={(value) => currency.format(Number(value))} />
        {seriesKeys.length > 1 && <Legend />}
        {seriesKeys.map((key) =>
          widget.chartType === "line" ? (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              stroke={colorFor(key)}
              strokeWidth={2}
              dot={false}
            />
          ) : (
            <Bar key={key} dataKey={key} fill={colorFor(key)} radius={[4, 4, 0, 0]} maxBarSize={40} />
          ),
        )}
      </ChartComponent>
    </ResponsiveContainer>
  );
}

function selectChart(widget: ChartWidget): {
  rows: SeriesRow[];
  seriesKeys: string[];
  colorFor: (key: string) => string;
} {
  if (widget.metric === "balance") {
    const accounts = resolveAccounts(ACCOUNTS, widget.accountIds);
    return {
      rows: balanceSeries(ACCOUNTS, TRANSACTIONS, widget, DATA_RANGE),
      seriesKeys: accounts.map((a) => a.name),
      colorFor: colorForAccountName,
    };
  }
  const { rows, categories } = spendingSeries(TRANSACTIONS, widget, DATA_RANGE);
  return { rows, seriesKeys: categories, colorFor: colorForCategory };
}
