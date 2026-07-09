import type { IterationView } from "./groupEvents";
import { JsonView, pretty } from "./JsonView";

/** One request/response cycle of the loop: Thought → Action(s) → Observation(s). */
export function IterationCard({ it }: { it: IterationView }) {
  return (
    <div className="iteration-card">
      <div className="iteration-header">
        <span>Iteration {it.iteration}</span>
        <span className="model-tag">{it.model}</span>
      </div>

      {it.reasoning ? (
        <p className="iteration-reasoning">{it.reasoning}</p>
      ) : (
        <p className="iteration-reasoning muted">model did not expose reasoning</p>
      )}

      {it.toolCalls.map((call) => (
        <div className="tool-call" key={call.id}>
          <div className="tool-call-name">{call.name}</div>
          <JsonView value={call.input} />
          {call.result !== null && (
            <pre className={call.isError ? "tool-result error" : "tool-result"}>
              {pretty(call.result)}
            </pre>
          )}
        </div>
      ))}

      {it.usage && (
        <div className="iteration-usage">
          {it.usage.promptTokens} prompt / {it.usage.completionTokens} completion tokens
          · finish: {it.usage.finishReason}
        </div>
      )}
    </div>
  );
}
