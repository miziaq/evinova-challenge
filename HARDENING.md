# Hardening

Security and production-readiness gaps in the current implementation,
scoped out deliberately for this challenge (see [PLAN.md](PLAN.md) and
[DECISIONS.md](DECISIONS.md) for why) but worth tracking before this
went anywhere near real traffic or real user data.

## Input validation

- **No content sanitization.** no filtering for SQL or prompt-injection
  attempts, no profanity/PII scrubbing 
- **The `:id` path param is not format-validated.** `- 404s if not
  found.

## Transport & platform

- **No rate limiting.** `POST /api/records/new` can be called as fast
  as the network allows, each call kicking off Claude API request. 
  This exposed to both cost abuse and being used to exhaust the
  retries/sweeper cycle against a target record.
- **Secrets in `.env`** `ANTHROPIC_API_KEY` is a plaintext
  environment variable, fine for local dev (`.env` is gitignored) but
  not how a deployed App Runner service should receive it — see the
  note in `infra/lib/api-stack.ts` about `Secret.fromSecretsManager()`
  instead of a plaintext `imageConfiguration.environmentVariables`
  entry.

## Data handling

- **No auth on any endpoint.** (As per brief).
- **In-memory storage has no persistence or isolation.** a restart loses 
  all data, and there's no tenant/user scoping. In prod it should be an SQL
  db with ownership separated across two tables: feedback / 
  feedback_processed with the CRUD only touching one and worker - second; on 
  top of this workers should be separate processes from the API so one system
  allows the other to function while it is experiencing issues and they can 
  also scale independently as workers take slower to process jobs compare to 
  how fast they can be submitted; to avoid job duplication we would lock the 
  claimed jobs rows at the time they are picked up. 
  user_id should be added in owner column, so users can only see their own 
  (or their org's) requests. 
- **Error responses can leak schema detail.**  a public API would usually 
  want a narrower, stable 400 error contract instead of exposing internal
  validation structure. Fine for internal tooling / challegne task.
- **Webhooks for front-end refresh** on both details and listing pages for 
  always up-to-date state

## Observability

- **Errors are logged to stdout only.** Nothing captures or aggregates 
  errors today (Sentry/CloudWatch alarms/etc.)
- **No business metrics logged.** However we can extract the usage metrics
  from the record timestamps;
- **No performace metrics logged.** to make sure we have are not falling
  behind with the number of jobs being submitted and processed, we should
  at least monitor the delta between the pending and processed jobs as well
  as the ones that failed after the defined number of retries. 
 
