import { z } from "zod";
import { defineTool } from "./types";

/**
 * The human-in-the-loop tool. The loop intercepts this call by name: it ends
 * the turn, shows the question to the user, and feeds their reply back as
 * this call's tool result on the next request. `execute` never runs.
 */
export const ASK_USER = "ask_user";

export const askUser = defineTool({
  name: ASK_USER,
  description:
    "Ask the user ONE clarifying question when their request is ambiguous (which account, what timeframe, chart vs table). Provide options when the answer is a choice. Do not ask when a reasonable default exists.",
  schema: z.object({
    question: z.string(),
    options: z
      .array(z.string())
      .optional()
      .describe("Short answer choices shown as quick-reply buttons"),
  }),
  execute: () => {
    throw new Error("ask_user is handled by the loop, not executed");
  },
});
