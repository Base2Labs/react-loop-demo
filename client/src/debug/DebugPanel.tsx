import { useEffect, useMemo, useState } from "react";
import type { DashboardSpec, LoopEvent } from "shared";
import { groupEvents } from "./groupEvents";
import { IterationCard } from "./IterationCard";
import { JsonView } from "./JsonView";
import "./debug.css";

type Tab = "loop" | "history" | "spec";
const TABS: { id: Tab; label: string }[] = [
  { id: "loop", label: "Loop" },
  { id: "history", label: "History" },
  { id: "spec", label: "Spec" },
];

interface Props {
  events: LoopEvent[];
  spec: DashboardSpec;
  running: boolean;
}

export function DebugPanel({ events, spec, running }: Props) {
  const [tab, setTab] = useState<Tab>("loop");
  const turns = useMemo(() => groupEvents(events), [events]);
  const history = useHistory(tab, running);

  return (
    <aside className="debug-panel">
      <nav className="debug-tabs">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            className={id === tab ? "debug-tab active" : "debug-tab"}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </nav>

      <div className="debug-body">
        {tab === "loop" &&
          (turns.length === 0 ? (
            <p className="debug-empty">Send a prompt to see the anatomy of the loop.</p>
          ) : (
            turns.map((turn, i) => (
              <section className="turn-group" key={i}>
                <div className="turn-label">Turn {i + 1}</div>
                {turn.iterations.map((it) => (
                  <IterationCard key={it.iteration} it={it} />
                ))}
                {turn.outcome && (
                  <div className={`turn-outcome ${turn.outcome.kind}`}>
                    {outcomeLabel[turn.outcome.kind]} {turn.outcome.text}
                  </div>
                )}
              </section>
            ))
          ))}
        {tab === "history" && <JsonView value={history} />}
        {tab === "spec" && <JsonView value={spec} />}
      </div>
    </aside>
  );
}

const outcomeLabel = { summary: "✓", question: "?", error: "✗" } as const;

/** The exact `messages` array the server sends to the API — fetched when the
 * tab opens and again when a turn finishes, so it tracks the conversation. */
function useHistory(tab: Tab, running: boolean): unknown {
  const [history, setHistory] = useState<unknown>(null);

  useEffect(() => {
    if (tab !== "history" || running) return;
    let stale = false;
    fetch("/api/history")
      .then((res) => res.json())
      .then((data) => {
        if (!stale) setHistory(data);
      })
      .catch((err: Error) => {
        if (!stale) setHistory({ error: err.message });
      });
    return () => {
      stale = true;
    };
  }, [tab, running]);

  return history;
}
