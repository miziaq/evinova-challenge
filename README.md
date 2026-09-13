# Evinova Feedback Challenge

An AI-assisted feedback intake app: a submission endpoint accepts raw feedback
text, an async worker classifies it via Claude (category, sentiment, severity,
summary, suggested action), and a React frontend lists and inspects the
results.

See [PLAN.md](PLAN.md) for the design rationale and trade-offs.

## Prerequisites

- Node.js 22+ (pinned in `.nvmrc` — run `nvm use` if you use nvm)
- An Anthropic API key

## Install

```bash
nvm use
npm install
```

This installs dependencies for all workspaces (`apps/api`, `apps/web`,
`packages/contracts`) from the repo root.

## Environment variables

Copy `.env.example` to `.env` at the repo root and fill in your API key:

```bash
cp .env.example .env
```

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `ANTHROPIC_API_KEY` | yes | — | Used by the AI worker to classify submitted feedback. |
| `MAX_RETRIES` | no | `3` | Retry attempts before a record is marked `failed`. |
| `STALE_CLAIM_THRESHOLD_SECONDS` | no | `180` | How long a record can sit in `processing` before the sweeper treats it as stuck and re-claims it. |
| `SWEEP_INTERVAL_SECONDS` | no | `60` | How often the sweeper checks for pending/stale records. |

`apps/api`'s `dev`/`start` scripts load `.env` via Node's `--env-file` flag, so
no `dotenv` package is needed.

## Running locally

From the repo root, run both apps together:

```bash
npm run dev
```

This starts the API (`http://localhost:3000`) and the frontend
(`http://localhost:5173`) concurrently. The frontend's Vite dev server proxies
`/api/*` requests to the API, so just open **http://localhost:5173**.

To run them separately:

```bash
npm run dev -w @evinova/api   # API only, port 3000
npm run dev -w @evinova/web   # frontend only, port 5173
```

## Testing

```bash
npm test
```

Runs the test suite for every workspace that has one (currently `apps/api`,
via Vitest).

### What's mocked in tests

- **The Anthropic AI client is always mocked.** Tests inject a fake
  `aiClient: { extractFeedback }` into `createFeedbackWorker` instead of
  calling the real API — no test makes a network call or costs API credits.
  The production client (`apps/api/src/worker/anthropicAiClient.ts`) is only
  exercised by running the app for real.
- **The in-memory store is the real implementation, not a mock**, except
  where a test needs to control `claim()`/`getAll()` behavior directly (e.g.
  the sweeper tests), in which case a minimal fake object is used in place of
  `InMemoryFeedbackStore`.

## Other useful scripts

```bash
npm run typecheck -w @evinova/api   # tsc --noEmit for the API
npm run typecheck -w @evinova/web   # tsc --noEmit for the frontend
npm run build -w @evinova/api       # compile the API to apps/api/dist
npm run build -w @evinova/web       # production frontend build to apps/web/dist
```

## Infrastructure (describe-only)

`infra/` contains a CDK stack (`infra/lib/api-stack.ts`) describing the API as
a Lambda behind API Gateway. It is not deployed as part of this challenge —
`npm run synth -w @evinova/infra` renders the CloudFormation template locally
for review, but nothing here calls `cdk deploy`. See the comments at the top
of `api-stack.ts` for what would need to change (external store, no in-process
sweeper) before this shape could actually run on Lambda.
