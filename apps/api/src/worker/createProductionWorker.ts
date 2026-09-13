import Anthropic from "@anthropic-ai/sdk";
import { createAnthropicAiClient } from "./anthropicAiClient.js";
import { createFeedbackWorker } from "./feedbackWorker.js";
import type { FeedbackStore } from "./types.js";
import type { FeedbackWorker } from "./types.js";

export interface ProductionWorkerConfig {
  store: FeedbackStore;
  maxRetries: number;
  anthropicApiKey: string;
}

export function createProductionWorker({
  store,
  maxRetries,
  anthropicApiKey,
}: ProductionWorkerConfig): FeedbackWorker {
  const client = new Anthropic({ apiKey: anthropicApiKey });
  const aiClient = createAnthropicAiClient(client);

  return createFeedbackWorker({ store, aiClient, maxRetries });
}
