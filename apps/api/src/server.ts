import { createApp } from "./app.js";
import { getMaxRetries } from "./config.js";
import { InMemoryFeedbackStore } from "./store/inMemoryStore.js";
import { createProductionWorker } from "./worker/createProductionWorker.js";

const port = process.env.PORT ? Number(process.env.PORT) : 3000;

const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
if (!anthropicApiKey) {
  throw new Error("ANTHROPIC_API_KEY is required");
}

const store = new InMemoryFeedbackStore();
const worker = createProductionWorker({
  store,
  maxRetries: getMaxRetries(),
  anthropicApiKey,
});
const app = createApp({ store, worker });
app.listen(port, () => {
  console.log(`API listening on port ${port}`);
});
