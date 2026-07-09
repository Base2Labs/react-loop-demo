import { useState } from "react";
import { Dashboard } from "./dashboard/Dashboard";
import { ChatStrip } from "./chat/ChatStrip";
import { PromptBar } from "./chat/PromptBar";
import { ModelPicker, useModels } from "./chat/ModelPicker";
import { DebugPanel } from "./debug/DebugPanel";
import { useAgent } from "./state/useAgent";
import "./chat/chat.css";

const DEBUG_KEY = "react-loop-demo.debug";

export default function App() {
  const { state, send, reset } = useAgent();
  const { models, model, setModel } = useModels();
  const [debugOpen, setDebugOpen] = useState(() => localStorage.getItem(DEBUG_KEY) === "1");

  const submit = (prompt: string) => send(prompt, model);
  const toggleDebug = () =>
    setDebugOpen((open) => {
      localStorage.setItem(DEBUG_KEY, open ? "0" : "1");
      return !open;
    });

  return (
    <div className="app">
      <header className="app-header">
        <h1>ReAct Loop Demo</h1>
        <div className="header-actions">
          <button
            className={debugOpen ? "ghost-button active" : "ghost-button"}
            onClick={toggleDebug}
          >
            Debug
          </button>
          <button className="ghost-button" onClick={reset} disabled={state.running}>
            Reset
          </button>
        </div>
      </header>

      <main className="app-main">
        <div className="dashboard-area">
          <Dashboard spec={state.spec} />
        </div>
        {debugOpen && (
          <DebugPanel events={state.events} spec={state.spec} running={state.running} />
        )}
      </main>

      <footer className="prompt-area">
        <ChatStrip
          notice={state.notice}
          running={state.running}
          currentTool={state.currentTool}
          onOption={submit}
        />
        <div className="prompt-bar">
          <ModelPicker
            models={models}
            model={model}
            onChange={setModel}
            disabled={state.running}
          />
          <PromptBar
            disabled={state.running || !model}
            placeholder={
              state.awaitingAnswer
                ? "Answer the agent's question…"
                : "e.g. Show my checking balance and a chart of grocery spending"
            }
            onSend={submit}
          />
        </div>
      </footer>
    </div>
  );
}
