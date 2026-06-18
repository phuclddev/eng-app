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
- Phase 6 adds:
  - `FamilyPracticeSession`, `FamilyPracticeAnswer`, and `FamilyReviewSchedule` data
  - separate family practice deck generation and answer evaluation
  - separate family spaced repetition scheduler
  - `/family/practice` mobile-first runner
  - family dashboard card on `/family`
  - optional AI feedback for `CONTINUE_CONVERSATION`
- Phase 7 adds:
  - `FamilyRoleplaySession` and `FamilyRoleplayMessage` data
  - separate AI roleplay flow with stored upstream `conversation_id`
  - `/family/roleplay` mobile-first chat UI
  - Markdown coach feedback at session end
- Phase 8 adds:
  - `FamilyFavorite` and `FamilyDailyPlanSnapshot` data
  - deterministic family recommendation engine
  - cached AI daily plan and on-demand weekly AI insights
  - `/family/today`, `/family/insights`, `/family/favorites` pages
  - child-focus selector (`KIWI`, `VIVI`, `BOTH`) on the daily coach

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

## Translation Recall Lab

- `TranslationScript` stores admin-imported scripts with `title`, `topic`, `bandLevel`, `fingerprint`, and a creator reference.
- `TranslationSentence` stores ordered `(englishText, vietnameseText)` pairs per script.
- `TranslationChunkMapping` links a sentence to a saved chunk and stores AI-extracted metadata for that mapping.
- `TranslationSentenceReview` stores per-user recall reviews with `easyCount`, `mediumCount`, `hardCount`, and `reviewCount` — independent from IELTS `ReviewSchedule`.
- The CSV import groups by `title + topic`, uses a SHA-1 fingerprint of that pair for idempotency, and rewrites sentences on re-upload. XLSX uploads are rejected; admins should export to CSV first.
- The "AI Extract Chunk" flow sends the script title/topic/band + the original sentence + the highlighted phrase to a separate prompt builder (`buildTranslationChunkExtractPrompt`) and parses strict JSON.
- "Save to Chunk Library" upserts the existing IELTS `Chunk` table by `(chunk, meaningVi)` so the Translation Recall flow feeds straight into the existing Chunk Library, Practice, and Review pipelines.
- Translation reviews never write to IELTS `ReviewSchedule`. Both review systems coexist independently.
- The learner UI ships with two modes:
  - Reveal mode hides English with a CSS blur until hover (desktop) or tap (mobile) and surfaces a selection toolbar for AI extraction or manual save.
  - Speaking mode keeps English hidden until the user taps Reveal, then offers Easy / Medium / Hard self-rating buttons that hit the review API.

## Translation Recall failure model

- The reveal flow does not depend on AI. Hover, tap, manual chunk save, and review tracking all work without `AI_CHATFLOW_TOKEN`.
- AI extraction failures return `503 AI_TUTOR_UNAVAILABLE`; the user can still manually save the highlighted phrase to the chunk library.
- Translation imports validate the whole CSV first and only write to the DB once the rows pass schema validation.

## Translation Recall active production (Compare with AI)

- `TranslationRecallAttempt` stores one user attempt per script (and optional sentence) with `mode` (`SENTENCE`/`PASSAGE`), `userAnswer`, `score`, and the full AI `feedbackMarkdown`. Indexes on `(userId, createdAt)` and `(userId, sentenceId, createdAt)` keep attempt history queries cheap.
- `POST /api/translation-recall/compare` is approved-user only. The server selects either a specific sentence (SENTENCE mode) or the full joined passage (PASSAGE mode), builds a strict Markdown prompt that asks the AI to grade in Vietnamese, parses the score from the `# Score` heading via regex, and parses the `# Missing Chunks` bullet list back into structured objects for the UI.
- The Compare mode is added alongside the existing Reveal and Speaking modes on `/translation/[id]`. The original English stays hidden until the learner taps "Reveal original" after seeing the score. AI failure does not block reveal, manual save, or review tracking — those flows continue working without AI.
- Missing chunks parsed from the feedback open the existing chunk-save modal pre-filled with the chunk text, Vietnamese meaning, example (the sentence English), suggested topic, and band estimate. Nothing is auto-saved; the user must confirm before saving to the IELTS Chunk Library.

## Question Bank → Translation Recall pipeline

- `TranslationScript` now carries `sourceType` (`MANUAL` or `SPEAKING_QUESTION`), an optional `sourceQuestionId` foreign key to `IeltsQuestion`, `generatedByAi`, a `version` counter, and a `usedChunkIds` JSON array.
- The "Create Translation Recall Script" button on `/questions` calls `POST /api/translation-recall/from-question`, which:
  - reuses the existing `selectSampleAnswerChunks` helper to bound the prompt context to recommended → topic → general chunks
  - hard-caps the shortlist at `30` chunks so the AI never receives the full library
  - asks the AI for one structured JSON response containing the English sample answer (with Markdown bold for chunks), Vietnamese translation, aligned sentence pairs, and a list of `usedChunks`
  - parses the JSON defensively: malformed JSON falls back to plain-text whole-script storage, and missing aligned sentences fall back to sentence-splitting heuristics
  - matches `usedChunks` back to real `Chunk` rows for highlight rendering
  - prevents duplicates by `(sourceQuestionId, bandLevel)` and returns the existing script unless `regenerate` is `true`, in which case it increments `version`
  - logs metadata only — no AI tokens, no full prompts, no full answers
- The Translation Recall reader joins `script.usedChunkIds` back to the IELTS Chunk Library at render time and highlights matching English text inside revealed sentences. Family English chunks and Family Practice flows are not involved.
- The Question Bank list shows a `n translation script(s)` tag and the question detail panel has a card with a one-tap link to open the latest script and a button to generate another version.

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
- Admins can browse `/admin/questions`, search the bank, import questions, generate new questions with AI, and maintain the recommended chunk set for each prompt.

## Speaking Idea Map

- `Speaking Idea Map` is a separate admin-only IELTS content-planning module under:
  - `/admin/ideas`
  - `/admin/ideas/new`
  - `/admin/ideas/[id]`
  - `/admin/ideas/map`
- It does not modify IELTS learner practice, IELTS review scheduling, or Family English data paths.
- `SpeakingIdea` stores the reusable core idea itself:
  - `title`
  - `shortLabel`
  - `descriptionVi`
  - `descriptionEn`
  - `popularityScore`
  - `reuseScore`
  - `status`
- `SpeakingIdeaVariant` stores band-oriented phrase variants for one idea.
- `SpeakingIdeaSupport` stores reusable support blocks such as:
  - `REASON`
  - `EXAMPLE`
  - `RESULT`
  - `CONTRAST`
  - `DETAIL`
  - `PERSONAL_EXPERIENCE`
- `SpeakingIdeaPattern` stores reusable answer skeletons and optional JSON variables.
- `SpeakingIdeaQuestionMap` links one idea to one `IeltsQuestion` with:
  - `relevanceScore`
  - `isPrimary`
  - optional `aiReason`
- `SpeakingIdea.aiReason` stores the AI's short Vietnamese rationale for why a generated idea is broadly reusable.
- `SpeakingIdea.generatedBatchId` groups one admin AI generation run without affecting learner-facing IELTS logic.
- The current phase uses server-side admin actions plus transactional nested rewrites:
  - save the parent `SpeakingIdea`
  - replace all nested variants
  - replace all nested supports
  - replace all nested patterns
  - replace all linked question mappings
- Validation rejects:
  - duplicate question links
  - more than one primary question mapping
  - malformed `variablesJson`
- Archiving an idea updates `SpeakingIdea.status` only; it does not delete linked IELTS questions or affect learner-facing question-bank behavior.
- The visual map view is intentionally client-side and schema-free:
  - root nodes are `SpeakingIdea` records
  - branch groups show variants, support points, and linked questions
  - node size is derived from `reuseScore`, `popularityScore`, and linked-question count
  - filters are applied in a pure transformation helper before rendering so the view stays testable and stable without introducing a graph dependency
- AI generation for reusable ideas is admin-only and flows through `POST /api/admin/ideas/generate`:
  - loads a bounded snapshot of existing idea titles and short labels
  - asks AI for reusable IELTS Speaking reasoning patterns rather than one-off prompts
  - dedupes by normalized `title` and normalized `shortLabel`
  - saves accepted ideas as `DRAFT`
  - does not auto-create `SpeakingIdeaQuestionMap` rows in this phase
- Phase 4 adds a two-way mapping workflow between reusable ideas and the IELTS Question Bank:
  - the idea detail editor can add, remove, reprioritize, and AI-suggest linked questions
  - the admin question detail drawer can add, remove, reprioritize, and AI-suggest linked ideas
  - both views operate on the same `SpeakingIdeaQuestionMap` table
- Manual mapping flows are admin-only and use dedicated API routes:
  - `POST /api/admin/ideas/map-question`
  - `PATCH /api/admin/ideas/question-map/:id`
  - `DELETE /api/admin/ideas/question-map/:id`
- AI-assisted mapping is admin-only and uses `POST /api/admin/ideas/suggest-question-mapping`:
  - `QUESTION_TO_IDEAS` loads one question plus a bounded pool of unmapped candidate ideas
  - `IDEA_TO_QUESTIONS` loads one reusable idea plus a bounded pool of unmapped approved/suggested questions
  - the prompt asks for reusable reasoning alignment rather than surface word overlap
  - suggestions are filtered back against the server-loaded candidate ids before the UI sees them
  - suggestions are never auto-saved
- Primary mapping behavior is enforced server-side:
  - one question can have many linked ideas
  - at most one linked idea per question may be marked primary
  - promoting one mapping to primary demotes the previous primary mapping for that question
- Phase 5 adds admin-only answer generation from a selected `question + idea` pair:
  - Question Bank detail can generate an answer from any linked/recommended idea
  - Idea detail can generate an answer for any linked question
  - the generation route is `POST /api/admin/ideas/generate-answer`
- The answer-generation prompt is separate from the generic sample-answer prompt:
  - it injects reusable idea descriptions, band variants, support points, answer patterns, and the optional question-mapping rationale
  - it still uses a bounded shortlist from the existing Chunk Library so the AI can naturally reuse useful chunks without forcing them
  - it explicitly asks for IELTS Speaking output, never Writing-style prose
- Current implementation is `generate-only` rather than persisted:
  - the server returns Markdown with `Sample Answer`, `Idea Used`, `Chunks / Phrases Used`, `Vietnamese Explanation`, and `Reusable Pattern`
  - the UI renders it with the shared safe Markdown component
- Phase 6 adds an admin-only coverage dashboard at `/admin/ideas/coverage`:
  - summary cards show total active ideas, mapped questions, unmapped questions, and ideas with no linked questions
  - `topIdeas` is derived from active ideas using `reuseScore`, `popularityScore`, and linked-question count
  - `weakTopics` is derived from approved IELTS speaking questions grouped by topic and compared against active idea mappings
  - `coverageByPart` reports `PART_1`, `PART_2`, and `PART_3` mapped vs unmapped counts without changing learner-facing question-bank behavior
  - unmapped-question actions stay admin-only and call the existing AI mapping suggestion route instead of auto-saving anything
  - weak-topic actions reuse the existing AI idea generation route to seed more `DRAFT` ideas for that topic
- Coverage intentionally does not persist generated-answer history in this phase:
  - `generatedAnswersCount` currently reports `0`
  - the UI labels this clearly as a generate-only phase so admins do not mistake it for saved analytics
  - admin can copy or regenerate the answer, but the result is not stored in a database table yet in this phase

### Question lifecycle and AI generation

- `IeltsQuestion.status` is one of `SUGGESTED`, `APPROVED`, or `ARCHIVED`. All learner-facing reads (`/questions`, Speaking Simulator prompt options, Translation Recall script generation) filter to `APPROVED` only.
- `IeltsQuestion.source` is one of `MANUAL`, `CSV_IMPORT`, or `AI_GENERATED`. Existing rows are backfilled to `MANUAL` / `APPROVED`. New CSV imports are saved as `CSV_IMPORT` / `APPROVED`.
- `POST /api/admin/questions/generate` is the AI generator. It is admin-only, hard-capped at 60 questions per request, and stores results with `status = SUGGESTED`, `source = AI_GENERATED`, a shared `generatedBatchId`, plus `aiReason`, `popularityScore`, and `predictedUsefulnessScore`.
- The generator hard-dedupes by `(skill, taskType, normalizedPrompt)` against both the existing bank and the in-batch set.
- The generator's AI prompt explicitly forbids claiming questions will appear on a real exam and forbids generating Writing Task 1/2.
- Recommended chunks returned by the AI are mapped against the existing `Chunk` table by normalized text. Unmatched chunks are reported in `warnings` and are not auto-created.
- The `QuestionChunkUsageRole` enum was extended with `OPENING`, `REASON`, `CONTRAST`, `DETAIL`, `EMOTION`, `STORYTELLING`, `SPECULATION`, `COMPARISON`, `ENDING`, and `FILLER`. The existing values (`HOOK`, `MAIN_IDEA`, `SUPPORTING_DETAIL`, `EXAMPLE`, `OPINION`, `CLOSING`) are preserved for backwards compatibility.
- `setIeltsQuestionStatus` and `bulkSetIeltsQuestionStatus` (admin-only) drive approval / archive / restore. Existing mapping APIs and CSV import paths are untouched.

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

## Family scenario AI generation flow

- `FamilyScenario` gained `status` (`SUGGESTED`/`APPROVED`/`ARCHIVED`), `source` (`MANUAL`/`AI`), `aiReason`, `suggestedGoals`, `suggestedChunks`, and `normalizedTitle` columns in migration `0014_family_scenario_ai_suggestions`. Existing rows are backfilled to `APPROVED` (if `isActive`) or `ARCHIVED`.
- The Suggested tab on `/family/scenarios` only renders rows with `status: "SUGGESTED"`. Conversation generation and roleplay continue to read `status: "APPROVED"` AND `isActive: true`.
- `POST /api/family/scenarios/generate`:
  - requires an active `FamilyProfile`
  - reads up to 60 existing scenario titles + categories when `includeExistingContext: true`
  - calls AI with `buildFamilyScenarioGeneratorPrompt` requesting strict JSON with `title`, `category`, `childFocus`, `description`, `difficulty`, `suggestedGoals`, `suggestedChunks`, and Vietnamese `aiReason`
  - dedupes by `normalizedTitle` against existing scenarios and inside the same batch
  - persists surviving rows as `status: "SUGGESTED"`, `source: "AI"`, `isActive: false`
  - logs only metadata — no AI token, no full profile, no full answer
- `setFamilyScenarioStatus` and `bulkSetFamilyScenarioStatus` keep `isActive` and `status` in sync (`APPROVED` ⇒ `isActive = true`, otherwise `false`). The legacy `setFamilyScenarioActiveState` still works for backwards compatibility.
- AI generation never updates IELTS tables or Family Practice / Roleplay / Conversation tables.

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

## Family conversation recall flow

- `/family/conversations/[id]/recall` is the per-conversation recall practice surface.
- Two new dedicated tables keep family recall data separate from IELTS Translation Recall:
  - `FamilyConversationRecallLine` — `conversationId`, `orderIndex`, `speaker`, `englishText`, `vietnameseText`, `usedChunks` JSON; unique on `(conversationId, orderIndex)`.
  - `FamilyConversationRecallAttempt` — `userId`, `conversationId`, `lineId` (nullable, `SET NULL` on line delete), `mode` (`LINE` or `FULL`), `userAnswer`, `score`, `feedbackMarkdown`.
- Both tables cascade-delete with the owning user / conversation.
- Create-recall flow (`POST /api/family/conversations/[id]/create-recall`):
  - approved-user gate; ownership check on the conversation
  - if recall lines already exist and `regenerate` is `false`, returns the existing script without calling AI
  - otherwise AI parses the conversation Markdown into strict-JSON lines and the service replaces lines transactionally (`deleteMany` then `createMany`)
- Compare flow (`POST /api/family/conversations/[id]/recall/compare`):
  - approved-user gate; ownership check on both the conversation and the line
  - strict-Markdown AI prompt returning `# Score`, `# Feedback`, `# Meaning Accuracy`, `# Natural Family English`, `# Better Version`, `# Useful Chunks`, `# Original English`
  - server parses the integer score and the `# Useful Chunks` bullets into structured missing chunks for the client
  - persists the attempt with the parsed score and full feedback Markdown
- The recall UI lets the learner save any missing chunk to the Family Chunk Library via the existing `saveFamilyChunkAction` (`status: "SUGGESTED"`, `sourceConversationId` set) — saved chunks NEVER land in the IELTS Chunk Library.
- Separation guarantees vs. IELTS Translation Recall:
  - dedicated tables, prompts, services, routes, and UI components
  - the IELTS `TranslationRecallAttempt` table is never touched
  - the IELTS Chunk Library is never written to from a family recall flow
- Privacy / logging:
  - approved-user only; per-line ownership check prevents cross-user line access
  - routes log metadata only (`userId`, `conversationId`, `lineId`, status) — never AI token, never family profile body, never user answer text, never AI body
- AI failure model: returns `code: "AI_TUTOR_UNAVAILABLE"` (`503`). The client surfaces a friendly notice; reveal/practice is not blocked.

## Family practice architecture

- `FamilyPracticeSession` stores one family practice attempt with:
  - `mode` (`DAILY`, `REVIEW`, `MIXED`)
  - aggregate `totalQuestions`, `correctAnswers`, `score`, `averageResponseMs`
  - `startedAt`, `completedAt`
- `FamilyPracticeAnswer` stores one answer:
  - `exerciseType` (`VI_TO_CHUNK`, `FILL_IN_DIALOG`, `NATURAL_RESPONSE`, `CONTINUE_CONVERSATION`, `FAMILY_CHUNK_RECALL`)
  - `prompt`, `expectedAnswer`, `userAnswer`
  - `isCorrect`, `responseTimeMs`, `confidenceLevel`
  - optional `feedback`
- `FamilyReviewSchedule` mirrors the IELTS scheduler shape but stays in its own table:
  - per `(userId, familyChunkId)` uniqueness
  - intervals snap to `1`, `3`, `7`, `14`, `30` days
  - mastery and ease factor evolve from confidence and response time
- Family practice deck generation:
  - reads only `APPROVED` `FamilyChunk` rows
  - joins per-chunk `FamilyReviewSchedule` snapshots
  - scores each chunk by: due review, personalization, frequency, weak mastery boost, new-chunk boost
  - sorts deterministically (priority then stable hash on chunk id and mode)
  - infers an exercise type per chunk from mastery progression
- Family practice answer evaluation:
  - exact normalized match for recall and recognition exercises
  - production exercises (`CONTINUE_CONVERSATION`) require the chunk to appear inside the answer plus a minimum word count
- Optional AI feedback for `CONTINUE_CONVERSATION`:
  - uses a separate family practice feedback prompt builder
  - never blocks session submission
  - returns Markdown only

## Family practice failure model

- Practice submission, session storage, and review scheduling work even when the AI service is unavailable.
- AI feedback failures return a friendly error to the runner without stopping the deck flow.
- Family practice never updates IELTS `PracticeSession`, IELTS `PracticeAnswer`, or IELTS `ReviewSchedule`.

## Family roleplay architecture

- `FamilyRoleplaySession` stores one in-character chat with:
  - `userRole` and `aiRole` (`FATHER`, `MOTHER`, `KIWI`, `VIVI`, `GRANDPARENT`)
  - `childFocus`, `targetLevel`, `turnsLimit`, `turnsTaken`
  - `externalConversationId` (server-side only)
  - `status` (`ACTIVE`, `COMPLETED`, `ARCHIVED`)
  - optional `scenarioId` linked to the user's own `FamilyScenario`
  - `finalFeedbackMarkdown` filled on `finish`
- `FamilyRoleplayMessage` stores one transcript line with `sender` (`USER` or `AI`), `roleLabel`, `content`, and `turnNumber`.
- The roleplay prompt builder has three modes:
  - start prompt (opens the scene in character)
  - turn prompt (continues the same character)
  - finish prompt (becomes a Vietnamese coach reviewing the transcript)
- Every roleplay turn reuses the stored `externalConversationId` so the AI keeps the same thread. The client cannot supply a conversation id.
- Ownership is enforced before any read, write, or AI call. Conversation hijacking is not possible because the upstream id is server-managed and tied to one `FamilyRoleplaySession` row.
- AI failures during a turn return a 503 to the runner and leave the session `ACTIVE` so the user can retry.
- AI failures during `finish` still complete the session, with a fallback placeholder note for the saved feedback.
- `FamilyChunk` now has an optional `sourceRoleplaySessionId` so a future Phase 7F can attach extracted chunks back to the roleplay that produced them, without touching IELTS tables.

## Family daily coach architecture

- `FamilyFavorite` stores polymorphic favorites with:
  - `targetType` (`CONVERSATION`, `CHUNK`, `ROLEPLAY`, `SCENARIO`)
  - per `(userId, targetType, targetId)` uniqueness
  - server-side ownership check on the underlying target before upsert
- `FamilyDailyPlanSnapshot` caches the AI daily plan with:
  - `childFocus` and a SHA-1 `sourceHash` over `{ date, childFocus, dueCount, weakCount, chunkIds, scenarioId, conversationId, roleplay }`
  - 12-hour TTL via `expiresAt`
  - cache lookup keyed by `(userId, childFocus, sourceHash)`
- The recommendation engine (`family-recommendation-service`) reads:
  - approved family chunks + family review schedules
  - active family scenarios
  - recent family conversations (last 7 days)
  - recent family roleplay sessions (last 7 days)
  - the latest family conversation overall
- The engine returns a `FamilyTodayRecommendations` object that drives both the AI prompt input and the UI action cards. It never reads IELTS tables.
- The daily plan prompt is family-specific: it instructs the AI to mix concise Vietnamese with English example phrases, bold useful family chunks, and avoid IELTS framing.
- Weekly insights use the same scoring + AI prompt pattern but compute live each visit; the AI summary is on-demand (no cache yet).

## Family daily coach failure model

- The recommendation engine works fully without AI — recommendation results are returned even when `AI_CHATFLOW_TOKEN` is unset.
- AI failures during daily plan generation return a 503 with `code: "AI_TUTOR_UNAVAILABLE"`. The page keeps the recommendations and shows a friendly error.
- AI failures during weekly summary generation return a 503; the snapshot stats are still visible.
- Favorite operations are pure data operations and do not depend on AI.

## Future-ready extension points

- Voice features are intentionally deferred. The schema is forward-compatible:
  - `FamilyRoleplayMessage` can grow an optional `audioUrl` column for stored voice without touching reads.
  - `FamilyPracticeAnswer.responseTimeMs` already exists for any future speaking-time scoring.
  - `FamilyDailyPlanSnapshot.answer` is `LONGTEXT` Markdown — TTS playback can read it directly.
- The recommendation engine returns plain data so future surfaces (voice daily coach, scheduled push notifications) can reuse it.
- All family AI prompts live under `src/server/ai/prompts/family-*`; a future `family-tts.ts` or `family-voice-roleplay.ts` slots in without changes elsewhere.

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
