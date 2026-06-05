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

## AI Tutor layer

- The external chatflow token is used only from server code.
- Prompt construction is centralized under `src/server/ai/prompts` so long IELTS-specific instructions are not scattered across React components.
- The AI integration has four layers:
  - `ai-chatflow-client`: talks to the upstream chatflow API with timeout and safe parsing
  - prompt builders: compose task-specific IELTS Speaking instructions
  - services: load app context, enforce ownership, and parse structured sections
  - routes/UI: expose approved-user endpoints and render graceful fallbacks
- Structured AI features added on top of the base chat route:
  - Chunk Coach
  - Missing Chunk Recommendation
  - Speaking Simulator
  - Study Coach

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

## Advanced AI Tutor data

- `AiConversation` keeps the internal-to-upstream conversation mapping for general AI chat and speaking feedback.
- `AiSimulatorSession` stores:
  - user ownership
  - requested speaking part
  - optional topic or prompt context
  - target band and turn limit
  - upstream `conversation_id`
  - final feedback when the simulation ends
- `AiSimulatorMessage` stores the local transcript for the simulator so the app can render a mobile-friendly examiner chat history without trusting browser state.
- `AiStudyCoachSnapshot` stores:
  - a compact learner-profile hash
  - the latest generated study-coach answer
  - parsed sections when available
  - timestamps for cache reuse

## AI feature surfaces

- Chunk Coach can be opened from:
  - chunk library
  - practice production exercises
  - speaking prompt recommended chunks
- Missing Chunk Recommendation can be requested from:
  - speaking prompt answer coaching
  - `CREATE_SENTENCE`
  - `REWRITE_SENTENCE`
- Speaking Simulator is a dedicated learner route that keeps thread context through the stored upstream `conversation_id`.
- Study Coach builds a compact profile from dashboard and progress data, then caches the AI plan to reduce repeated token usage.

## Failure model

- Normal chunk learning, practice submission, and review flows remain server-owned and work even if AI routes fail.
- AI features are additive helpers:
  - plain-text fallback is rendered when structured parsing fails
  - friendly route errors are returned when the upstream service is unavailable
  - practice submission is never blocked by optional AI calls
