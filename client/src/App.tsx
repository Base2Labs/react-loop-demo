import { useEffect, useState } from "react";
import { Dashboard } from "./dashboard/Dashboard";
import { DEMO_SPEC } from "./demoSpec";

/**
 * App shell for the demo: header, dashboard area, prompt bar.
 * Milestone 2: dashboard renders a hard-coded spec — proving the rendering
 * engine works with no AI involved. The agent takes over in milestone 4.
 */
export default function App() {
  const [serverUp, setServerUp] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/health")
      .then((res) => res.json())
      .then((body) => setServerUp(body.ok === true))
      .catch(() => setServerUp(false));
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <h1>ReAct Loop Demo</h1>
        <span className={`server-status ${serverUp ? "up" : "down"}`}>
          {serverUp === null ? "connecting…" : serverUp ? "server up" : "server down"}
        </span>
      </header>

      <main className="dashboard-area">
        <Dashboard spec={DEMO_SPEC} />
      </main>

      <footer className="prompt-bar">
        <input
          type="text"
          placeholder="e.g. Show my checking balance and a chart of grocery spending"
          disabled
        />
        <button disabled>Send</button>
      </footer>
    </div>
  );
}
