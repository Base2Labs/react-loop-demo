import type { ChatNotice } from "../state/appState";
import { OptionChips } from "./OptionChips";

interface Props {
  notice: ChatNotice | null;
  running: boolean;
  currentTool: string | null;
  onOption: (option: string) => void;
}

/** The slim strip above the prompt bar: activity, agent summaries, questions. */
export function ChatStrip({ notice, running, currentTool, onOption }: Props) {
  if (running) {
    return (
      <div className="chat-strip">
        <span className="chat-activity">
          {currentTool ? `rendering: ${currentTool}…` : "thinking…"}
        </span>
      </div>
    );
  }
  if (!notice) return null;

  return (
    <div className={`chat-strip notice-${notice.kind}`}>
      <span className="chat-text">
        {notice.kind === "question" ? "🤔 " : ""}
        {notice.text}
      </span>
      {notice.kind === "question" && notice.options && (
        <OptionChips options={notice.options} onPick={onOption} />
      )}
    </div>
  );
}
