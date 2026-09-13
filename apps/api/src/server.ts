import { createApp } from "./app.js";
import { InMemoryFeedbackStore } from "./store/inMemoryStore.js";

const port = process.env.PORT ? Number(process.env.PORT) : 3000;

const store = new InMemoryFeedbackStore();
const app = createApp({ store });
app.listen(port, () => {
  console.log(`API listening on port ${port}`);
});
