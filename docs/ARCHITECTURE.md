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

## Family English module boundary

- `Family English` is a separate workspace branch under `/family`.
- It does not reuse IELTS question-bank tables, IELTS practice sessions, or IELTS review schedules.
- Phase 1 + Phase 2 introduce:
  - isolated family navigation
  - separate `src/server/family` services
  - separate family AI prompt builders under `src/server/ai/prompts`
  - private `FamilyProfile` persistence
- Phase 3 + Phase 4 add:
  - `FamilyScenario` data and CRUD
  - `FamilyConversation` data and AI generation flow
- Phase 5 adds:
  - `FamilyChunk` data and lifecycle
  - AI extraction from saved family conversations
  - separate review queue UI at `/family/chunks`
- Family practice and roleplay remain separate routes so later phases can add features without touching IELTS logic.

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
  - Sample Answer Generation
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

## Family English data

- `FamilyProfile` stores a private markdown profile for one user:
  - `title`
  - `profileMarkdown`
  - `isActive`
- The initial bootstrap profile for `dinhphuc.luu@garena.vn` is seeded from the Phuc family source profile and can also be lazily created on first family-route access.
- Other approved users receive a generic family-profile template instead of the Phuc-specific household profile.
- `FamilyScenario` stores private user-owned practice situations:
  - `title`
  - `category`
  - `childFocus`
  - `description`
  - `difficulty`
  - `isActive`
- `FamilyConversation` stores private AI-generated markdown conversations linked back to one `FamilyScenario` and one user.
- `FamilyChunk` stores private reusable daily-life expressions linked to one user and optionally to one `FamilyConversation`.
- `FamilyChunk` lifecycle is:
  - `SUGGESTED`
  - `APPROVED`
  - `ARCHIVED`
- `FamilyChunk` uses normalized per-user uniqueness so repeated extraction does not create duplicate rows.
- Default family scenarios are lazily upserted only for the bootstrap owner so Phuc-specific scenarios are not automatically pushed into unrelated users' accounts.

## Family conversation generation flow

- `/family/conversations` loads the current user's active scenarios plus saved family conversations.
- The generate form posts to `/api/family/conversations/generate`.
- The route:
  - requires authenticated and approved access
  - validates input with zod
  - loads the active `FamilyProfile`
  - loads an owned active `FamilyScenario`
  - builds a compact family-specific prompt
  - calls the shared server-side AI chatflow client
  - stores the markdown result in `FamilyConversation`
- The output is rendered with the shared safe AI Markdown renderer, so Markdown formatting is preserved without enabling raw HTML.

## Family chunk extraction flow

- `/family/conversations` now exposes `Extract Chunks` on the selected conversation detail panel.
- The extract request posts to `/api/family/chunks/extract`.
- The route:
  - requires authenticated and approved access
  - validates `conversationId` with zod
  - loads the owned `FamilyConversation`
  - loads compact `FamilyProfile` context when available
  - builds a family-only chunk extraction prompt
  - calls the shared server-side AI client
  - requires structured JSON before any write
  - filters duplicates by normalized chunk text
  - stores new rows as `SUGGESTED`
- `/family/chunks` renders a separate management surface for:
  - manual chunk creation
  - editing
  - approve/archive/restore transitions
  - bulk approve/archive actions
  - search and filter by status, child focus, speaker role, and scenario category
- None of these family chunk records are reused by IELTS chunk selection, IELTS review scheduling, or IELTS dashboard metrics.

## AI feature surfaces

- Chunk Coach can be opened from:
  - chunk library
  - practice production exercises
  - speaking prompt recommended chunks
- Missing Chunk Recommendation can be requested from:
  - speaking prompt answer coaching
  - `CREATE_SENTENCE`
  - `REWRITE_SENTENCE`
- Sample Answer Generation can be requested from:
  - learner speaking prompt detail
  - admin question preview drawer
- The sample-answer service keeps context bounded:
  - mapped chunks first
  - same-topic chunks second
  - high-value general chunks last
- The selected chunk set is capped before being sent to AI, and the response remains Markdown-only so it can be rendered safely through the shared AI Markdown component.
- Speaking Simulator is a dedicated learner route that keeps thread context through the stored upstream `conversation_id`.
- Study Coach builds a compact profile from dashboard and progress data, then caches the AI plan to reduce repeated token usage.

## Failure model

- Normal chunk learning, practice submission, and review flows remain server-owned and work even if AI routes fail.
- AI features are additive helpers:
  - plain-text fallback is rendered when structured parsing fails
  - friendly route errors are returned when the upstream service is unavailable
  - practice submission is never blocked by optional AI calls
