# Architecture

## Request flow

Browser -> Nginx -> PM2 -> Next.js -> Prisma -> MySQL

## Key modules

- `src/app`: routes and route handlers
- `src/components`: UI shell and feature views
- `src/server`: auth, Prisma access, and data services
- `src/lib`: shared validation, scheduling, CSV, logging, and utilities
- `prisma`: schema and migrations

## Security boundaries

- Authentication handled by NextAuth with Google OAuth
- Authorization enforced on the server through middleware and session guards
- Sensitive tokens and secrets are redacted from logs

## Chunk lifecycle

- Active chunks are available to library, practice, review, and dashboard flows.
- Admin CSV imports are validated first and imported transactionally.
- Duplicate imports upsert existing chunks instead of creating duplicates.
- Chunk removal is implemented as soft delete so practice answers and review schedules remain preserved.

## IELTS question bank

- `IeltsQuestion` stores normalized IELTS prompts with:
  - `skill`
  - `taskType`
  - `topic`
  - `subTopic`
  - `difficulty`
  - `targetBand`
  - `supportingPoints`
- `IeltsQuestionChunkMapping` links a question to recommended chunks without changing existing chunk or review behavior.
- Each mapping stores:
  - `usageRole`
  - `exampleSentence`
  - `sortOrder`
- Question import is admin-only and uses CSV validation plus transactional upsert so one bad row cannot partially write the bank.
- Learners can browse `/questions`, choose a speaking prompt, and inspect the recommended chunks before answering.
- Admins can browse `/admin/questions`, search the bank, import questions, and maintain the recommended chunk set for each prompt.

## Learn mode selection

- `REVIEW` mode still uses due chunks only.
- `LEARN` mode now uses a deterministic priority queue instead of recent updates.
- Unseen chunks are prioritized first.
- Weak chunks are force-included when space allows, based on low mastery or overdue low-confidence review state.
- Recently mastered chunks are pushed to the back so they are not repeated too often.

## Practice deck generation

- Deck generation no longer rotates exercise types by list index.
- The current schema already provides enough metadata through `reviewSchedule` to infer a chunk learning stage, so no schema change was required.
- Chunk progression now follows a structured path:
  - Recognition: `MULTIPLE_CHOICE` -> `FILL_IN_BLANK`
  - Recall: `VI_TO_CHUNK`
  - Production: `REWRITE_SENTENCE` -> `CREATE_SENTENCE`
- Deck ordering is deterministic for testing, but uses stable hashing so it is less mechanically predictable than fixed index rotation.
- Multiple-choice option ordering is also deterministic now.
