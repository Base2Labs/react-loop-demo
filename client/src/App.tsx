import { useEffect, useState } from "react";

/**
 * App shell for the demo: header, dashboard area, prompt bar.
 * Milestone 1: static placeholders + a health check proving the
 * client → server wiring works. The real pieces land in later milestones.
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
        <p className="placeholder">
          Your dashboard will appear here. Describe it in the prompt below.
        </p>
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
