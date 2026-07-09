import { Dashboard } from "./dashboard/Dashboard";
import { ChatStrip } from "./chat/ChatStrip";
import { PromptBar } from "./chat/PromptBar";
import { ModelPicker, useModels } from "./chat/ModelPicker";
import { useAgent } from "./state/useAgent";
import "./chat/chat.css";

export default function App() {
  const { state, send, reset } = useAgent();
  const { models, model, setModel } = useModels();

  const submit = (prompt: string) => send(prompt, model);

  return (
    <div className="app">
      <header className="app-header">
        <h1>ReAct Loop Demo</h1>
        <div className="header-actions">
          <button className="ghost-button" onClick={reset} disabled={state.running}>
            Reset
          </button>
        </div>
      </header>

      <main className="dashboard-area">
        <Dashboard spec={state.spec} />
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
