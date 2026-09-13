import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { FeedbackContentSchema } from "@evinova/contracts";
import type { AiClient } from "./types.js";

const MODEL = "claude-haiku-4-5-20251001";

const SYSTEM_PROMPT =
  "You analyze end-user product feedback. Classify the feedback's category, " +
  "sentiment, and severity, then write a one-line summary and a short " +
  "suggested next step for the team.";

export function createAnthropicAiClient(client: Anthropic): AiClient {
  return {
    async extractFeedback(text: string): Promise<unknown> {
      const message = await client.messages.parse({
        model: MODEL,
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: text }],
        output_config: {
          format: zodOutputFormat(FeedbackContentSchema),
        },
      });

      return message.parsed_output;
    },
  };
}
