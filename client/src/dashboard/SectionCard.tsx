import type { Section } from "shared";
import { BalanceCard } from "./BalanceCard";
import { TransactionsTable } from "./TransactionsTable";
import { ChartCard } from "./ChartCard";

export function SectionCard({ section }: { section: Section }) {
  return (
    <section className={`section-card color-${section.color}`}>
      <header className="section-header">
        <h2>{section.title}</h2>
      </header>
      <div className="section-body">{renderWidget(section)}</div>
    </section>
  );
}

function renderWidget(section: Section) {
  const widget = section.widget;
  if (!widget) return <p className="placeholder">Empty section</p>;
  switch (widget.kind) {
    case "balance":
      return <BalanceCard widget={widget} />;
    case "transactions":
      return <TransactionsTable widget={widget} />;
    case "chart":
      return <ChartCard widget={widget} />;
  }
}
