# Evinova test challenge

## Acceptance criteria

object returned by the AI API:
```JSON
{
  "id": "UUID",
  "submittedAt": "2026-06-29T10:00:00Z",
  "category": "bug | feature_request | praise | other",
  "sentiment": "positive | neutral | negative",
  "severity": "low | medium | high",
  "summary": "One-line summary of the feedback.",
  "suggestedAction": "Short suggested next step.",
}
```

``` gherkin
Feature: AI feedback extraction

  Scenario: AI model returns a valid structured response
    Given a feedback record exists with processingState "pending"
    When the AI processing worker runs for that record
    And the AI model returns output conforming to the FeedbackContent schema
    Then the record's processingState becomes "succeeded"
    And the record's content fields match the AI response

  Scenario: AI model returns output that fails the contract
    Given a feedback record exists with processingState "pending" and retries at 0
    When the AI processing worker runs for that record
    And the AI model returns output that fails the FeedbackContent schema
    Then the record's processingState reverts to "pending"
    And the record's retries increments by 1
    And the lastAttemptAt is set to current timestamp
```

## Design plan

- in memory storage of submitted entries with two schema shapes
    - after submission:
        - originalText
        - additional fields:
            - AI processing state (pending|processing|succeeded|failed)
            - max retries (from an env variable)
            - last attempt
    - after ai processing
        - fields specified in the document
    - leaving out:
        - in the real world I would use a mysql storage with 2 tables:
            - one for raw feedback
            - one for the AI processing
        - ... they would be separated due to the ownership by two different entities - one is owned by the data submission endpoint and CRUD service, while the other by the AI analysis worker. Both would be separate entities in Kubernetes to avoid taking one down along with the other
- endpoints:
    - submit entry
        - basic Zod validation on the content body - if text is at least 15 chars long.
            - leaving out: check for malicious content (SQL injections / prompt injections / regex for profanity)
    - list all records accepting aggregation flag for category and severity: `?aggregate=category`
        - for unprocessed entites - bucket them as uncategorised
    - get one by id `/:id`
        - basic validation for id
- AI workflow:
    - use Claude (I pay for it and so does the company)
        - Claude offers structured outputs out of the box to make sure the data contract is protected
        - it has a Zod built-in helper
    - implement a worker that gets called directly after the text submission;
    - implement a job that periodically checks for records that are either:
        - processingState "pending" (including never-yet-attempted, lastAttemptAt null), or
        - processingState "processing" with lastAttemptAt more than 3 minutes old (a stale
          claim — e.g. the process died mid-call)
      so jobs don't fall through the cracks and retries get picked back up
    - both of the above claim the record before processing: a synchronous, in-memory
      check-and-flip from pending/stale-processing to processing, so only one caller
      (the submit trigger or the sweep) ever processes a given record at a time. No
      locking infra needed since it's a single process; IRL with a real DB this becomes
      an atomic `UPDATE ... WHERE state = 'pending'` row update.

## App design:
    - monorepo for frontend and backend fast prototyping
    - API
        - Express.js
        - one process with two modules:
            - CRUD for submitted entries
            - logic handling the AI processing
                - directly after submission
                - setInterval job checking for job processing
        - leaving out: separation to multiple services as it would complicate the in-memory sharing; feasible choice for when SQL is in place
    - UI - React / AntDesign
        - two views
            - list with aggregation by category / sort by timestamp (default)
                - trade-offs: no pagination due to in-mem storage; IRL - pagination present
            - get one
    - testing
        - vitest (fast and furious)
    - infra:
        - CDK per brief