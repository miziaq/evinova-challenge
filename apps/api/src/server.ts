import { createApp } from "./app.js";
import { getMaxRetries, getStaleClaimThresholdMs, getSweepIntervalMs } from "./config.js";
import { InMemoryFeedbackStore } from "./store/inMemoryStore.js";
import { createProductionWorker } from "./worker/createProductionWorker.js";
import { createSweeper } from "./sweeper/sweeper.js";

const port = process.env.PORT ? Number(process.env.PORT) : 3000;

const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
if (!anthropicApiKey) {
  throw new Error("ANTHROPIC_API_KEY is required");
}

const staleClaimThresholdMs = getStaleClaimThresholdMs();
const store = new InMemoryFeedbackStore(staleClaimThresholdMs);
const worker = createProductionWorker({
  store,
  maxRetries: getMaxRetries(),
  anthropicApiKey,
});
const sweeper = createSweeper({ store, worker, staleClaimThresholdMs });

setInterval(() => {
  sweeper.sweep().catch((error: unknown) => {
    console.error("Sweep failed:", error);
  });
}, getSweepIntervalMs());

const app = createApp({ store, worker });
app.listen(port, () => {
  console.log(`API listening on port ${port}`);
});
