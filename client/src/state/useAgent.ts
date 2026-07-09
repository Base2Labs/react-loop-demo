import { useCallback, useReducer } from "react";
import { streamChat } from "../api/stream";
import { appReducer, initialState } from "./appState";

/** Owns the app state and the client side of a turn: stream events in,
 * reduce them into dashboard + debug state. */
export function useAgent() {
  const [state, dispatch] = useReducer(appReducer, initialState);

  const send = useCallback(async (prompt: string, model: string) => {
    dispatch({ type: "turn_start" });
    try {
      for await (const event of streamChat(prompt, model)) {
        dispatch({ type: "loop_event", event });
      }
    } catch (err) {
      dispatch({
        type: "loop_event",
        event: { type: "error", message: (err as Error).message },
      });
    } finally {
      dispatch({ type: "turn_end" });
    }
  }, []);

  const reset = useCallback(async () => {
    await fetch("/api/reset", { method: "POST" });
    dispatch({ type: "reset" });
  }, []);

  return { state, send, reset };
}
