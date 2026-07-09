import type { DashboardSpec } from "shared";
import { SectionCard } from "./SectionCard";
import "./dashboard.css";

/** Pure view of the DashboardSpec — no agent logic lives here. */
export function Dashboard({ spec }: { spec: DashboardSpec }) {
  if (spec.sections.length === 0) {
    return (
      <p className="placeholder">
        Your dashboard will appear here. Describe it in the prompt below.
      </p>
    );
  }

  return (
    <div className="dashboard">
      {spec.sections.map((section) => (
        <SectionCard key={section.id} section={section} />
      ))}
    </div>
  );
}
