1. [x] Scaffold npm-workspaces monorepo (apps/api, apps/web, packages/contracts) in
   TypeScript throughout. Shared Zod schemas (pending + processed FeedbackRecord
   shapes) in packages/contracts. Bare-bones Express app in apps/api, TypeScript
   (ts-node/tsx or built via tsc), GET /health + test.
   commit: "chore: scaffold TypeScript monorepo, shared contracts, health check"

2. [x] Failing Gherkin-driven tests for the AI worker's two scenarios (valid → succeeded;
   invalid → pending, retries+1, lastAttemptAt updated). Worker built via factory
   createFeedbackWorker({ store, aiClient, maxRetries }), store and aiClient both mocked.
   commit: "test: AI worker scenarios (red)"

3. [x] Implement the worker factory against a placeholder in-memory store.
   Wire the real Anthropic client (structured outputs + zodOutputFormat) as the
   production aiClient, injected the same way the mock is.
   commit: "feat: AI worker satisfies scenarios (green)"

4. [x] Test: worker marks a record "failed" once retries reaches MAX_RETRIES
   (plain Vitest, loop-calling the worker against an always-invalid mock).
   commit: "test: worker marks failed at max retries (red)"

5. [x] Implement the retries-exhausted -> failed branch.
   commit: "feat: worker sets failed at max retries (green)"

6. [x] Add claim(id) to the store: synchronous check-and-flip from pending/stale-processing
   to processing, returns false if already claimed. Unit test: two concurrent claims
   on the same id, only one succeeds.
   commit: "feat: atomic claim guard on the store (with test)"

7. [x] Wire claim() into the worker's entry point — only calls the AI client if claim()
   returns true. Test that a failed claim short-circuits without calling aiClient.
   commit: "feat: worker calls claim() before processing"

8. [x] Failing tests for POST /api/records/new: 201 + Location header on success;
   body sets only id (uuid) + text, with system defaults processingState: "pending",
   retries: 0, lastAttemptAt: null; 400 when text is under 15 chars.
   commit: "test: submission endpoint (red)"

9. [x] Implement submission endpoint + GET /api/records/:id (200 / 404).
   commit: "feat: submission + get-by-id endpoints (green)"

10. [x] Test: POST triggers the worker without awaiting it — response returns before
    AI processing completes.
    commit: "test: submission fires worker without blocking response (red)"

11. [x] Wire the real worker into the POST handler as fire-and-forget
    (errors caught/logged, never thrown into the response cycle).
    commit: "feat: submission triggers AI worker asynchronously (green)"

12. [x] Test + implement GET /api/records/all, sorted by submittedAt.
    Register this route BEFORE /api/records/:id.
    commit: "feat: list-all endpoint, sorted by submittedAt"

13. [x] Test + implement ?aggregate=category and ?aggregate=severity on the list endpoint.
    Unprocessed records (pending/processing/failed) bucket under one consistent
    "unprocessed" label for both dimensions.
    commit: "feat: aggregation by category/severity"
14. [x] Scaffold apps/web: Vite + React + TypeScript, AntDesign (antd) installed,
    React Router configured with placeholder routes for "/" and "/details/:id"
    (no feature logic yet). Vite dev server proxy for /api → apps/api. Root-level
    concurrently script to run both apps with one command.
    commit: "chore: scaffold React frontend (Vite, AntDesign, Router)"

15. [x] Front-end: "/" list view via the unaggregated endpoint, AntDesign Table,
    all columns including text; empty state = header + "no records available".
    commit: "feat: list view"

16. [x] Front-end: submittedAt header click toggles client-side sort direction (same
    shape, no refetch needed). Separate explicit control (Select: "Group by:
    none / category / severity") swaps the table for the aggregate view.
    Above the table, when a grouping is active, render a one-line summary of the
    counts in the format "bug: 5, praise: 1, feature_request: 2, other: 0"
    (or the equivalent severity labels), built from the same aggregate response
    already fetched — no extra request.
    commit: "feat: sort toggle, aggregation control, and grouping summary text"

17. [x] Front-end: "/details/:id" via GET /api/records/:id, AntDesign List of all
    fields, error message on invalid/missing id, back button via useNavigate(-1).
    commit: "feat: record details view"

18. [x] Link id cells in the list view to the details view.
    commit: "feat: link list rows to details"

19. [x] Failing test for the sweeper's selection + claim logic. Describe the exact rule
    under test: a candidate record is one where EITHER (a) processingState is
    "pending" (regardless of lastAttemptAt — including lastAttemptAt: null, i.e.
    never yet attempted), OR (b) processingState is "processing" AND lastAttemptAt
    is more than 3 minutes old (a stale claim, e.g. the process died mid-call).
    For each candidate, the sweeper calls claim(id) — the same atomic check-and-flip
    from step 6 — and only invokes the worker if claim() returns true. Test asserts:
    a genuinely mid-flight record (processing, lastAttemptAt < 3 min old) is NOT
    selected; a stale-processing record IS selected and claimed; the worker is
    called exactly once per successfully claimed record, never for a skipped one.
    commit: "test: sweeper selection and claim logic (red)"

20. [x] Implement the sweeper: on each tick, find candidates per the rule above, call
    claim() per candidate, call the worker only on a successful claim.
    commit: "feat: sweeper implementation (green)"

21. [x] Front-end: setInterval refresh every 90s, refetching using whatever sort/
    aggregation mode is currently in state.
    commit: "feat: periodic front-end refresh"

22. [x] README.md: steps to run the app locally (install, env vars, start commands
    for apps/api and apps/web), and note what's mocked/stubbed (e.g. AI client
    in tests).
    commit: "docs: README run instructions"

23. [x] Add CDK IaC (describe-only, not deployed) provisioning this service as
    Lambda (Express via serverless-http) behind API Gateway.
    commit: "docs: CDK IaC description — Lambda + API Gateway"

24. [ ] Add empty HARDENING.md and DECISIONS.md as placeholders to be filled in
    after implementation is complete.
    commit: "docs: add empty HARDENING.md and DECISIONS.md"