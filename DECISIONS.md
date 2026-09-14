# Decisions

Notable choices made while implementing TASKS.md, and the reasoning
behind them — mostly the points where the spec was ambiguous, or where
following it literally would have caused a real bug.

## TASKS.md 
Describes the iterative steps I decided to take upon the delivery of
the challenge in the same way I would plan the delivery of the task
if it was fully hand-rolled ad delivered by a team - split into atomic
deliverables, easy to roll back and review with TDD where it was 
equested in the brief.
Then I let Claude Code go through each step and was reviewing its effort
every time it paused after a completed task. 

## Stack
**Express.js + React**
I chose the minimum stack that is familiar not only to me but also to 
dev community and one that IMO would satisfy the requirements without 
re-inventing the wheel at the same time.
I chose the monorepo setup as it is good for fast prototyping and quick
E2E iterations on small teams.
I decided to commit directly to main branch without using PRs since I
have no community to review the code and the atomic commits reflect the
version history and the workflow perfectly well
I went for Anthropic API as we both use it alrady and Haiku model as the
task's complexity doesn't require more than that.

## Tests
Unit tests around the important parts of the logic with TDD where it
mattered and additional padding in the more relaxed areas added along 
with the code. For this size and complexity unit testing is good enough.
I used the DI composition to make the mocking of dependencies trivial 
and to have a single entry point for the dependency structure which makes
things clear for any new starter on the project. 

## The sweeper + claim mechanism

The sweeper is a protection mechanism against jobs that hang for
whatever reason (API error/timeout, network errors, app deploy/crash). 
In the in-memory scenario the claim mechanism could be omitted as single
threaded Node would not allow a race condition where there is no async
operation, however I wanted to show the mechanism would be necessary for
async storage.

## Aggregate response shape: bucket → records[], not counts

TASKS.md step 13 asks for `?aggregate=category`/`?aggregate=severity`
I implemented this parameter thinking about the server-side logic and
the fact the front-end wouldn't be the only consumer of the endpoint 
as well as the fact that if the data stored would scale to a point where
we would need paginated results, the endpoints become useful again to 
pull only the data we need. 
Initially I thought the UI table would also call the endpoint to
obtain an already aggregated data, however abandoned the idea due to 
the scale of the project and the amount of data being shown. The Table
component in AntD also does a very good job of filtering so I leveraged
its built-in capabilities to filter for categories and severity. 


## UI: 

**AntD Table** that renders after passing an object to the component offering
out-of-the-box features needed for this project. 
**Native column filters**, not a "Group by" Select - Changed this after
implementing step 16 to leverage the AntD table's native filtering for 
clearer UI, less code and no layout switching.
**Timestamp sorting** - useful from the perspective of quickly jumping to the
newest and most stale requests to make prioritisation calls.
**90-second refresh** to check for any jobs that changed state. 
**Back button on details page** leveraging the history API - at first I 
thougth the listing page would accept the aggregation parameters and it would
make sense to go back to the same view user came from and it seemed the 
cheapest way to implement it.


## CDK stack: App Runner, not Lambda + API Gateway

Step 23 names Lambda + API Gateway but in-mem store and sweeper both
assume a single long-lived process — neither survives Lambda's
per-invocation, so I switched the stack to App Runner. I was tired - sorry ;)