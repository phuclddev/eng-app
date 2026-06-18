# Development Log

## 2026-05-27

- Bootstrapped Next.js App Router project
- Added Ant Design, Prisma, NextAuth, Vitest, and Playwright
- Designed initial Prisma schema and deployment/runtime configuration

## 2026-05-28

- Replaced the marketing homepage with direct auth entry routing from `/`
- Added safe bootstrap admin support for `dinhphuc.luu@garena.vn`
- Wired seed + login-safe admin upsert enforcement without weakening RBAC
- Added routing and bootstrap tests plus updated deployment/security notes
- Hardened chunk CSV import with dry-run validation, transactional rollback safety, duplicate upsert handling, and admin summaries
- Replaced hard chunk deletion with soft delete so practice/review history is preserved
- Replaced recent-update LEARN selection with deterministic unseen-first prioritization plus weak-chunk inclusion and mastered-chunk deprioritization
- Replaced rotating exercise assignment with deterministic stage-based practice generation using existing review metadata to progress chunks from recognition to recall to production
- Added IELTS question bank foundation with Prisma models, transactional CSV import, admin mapping UI, learner browsing UI, and RBAC/import/mapping test coverage
- Optimized the workspace shell for mobile with a compact header and drawer navigation while keeping the desktop sidebar flow intact
- Reworked learner mobile layouts for practice, chunk browsing, dashboard, learn, progress, and question bank views to avoid horizontal overflow and improve tap targets
- Added mobile-safe admin list/card fallbacks, safer table scrolling, and block confirmations for user moderation
- Added Playwright mobile viewport coverage for root/auth redirect plus protected-route smoke definitions for dashboard, practice, review, and chunks

## 2026-06-05

- Added AI Tutor foundation using the external chatflow API through a server-only client and approved-user API route
- Added `AiConversation` persistence so internal conversation ids stay user-owned and safe from cross-user reuse
- Added `/ai-tutor` learner chat UI plus optional AI help inside practice production exercises and speaking question detail
- Added AI Tutor env placeholders, security/deployment/API docs, and test coverage for client parsing, route RBAC, helper logic, and conversation ownership
- Added structured IELTS Speaking feedback mode with server-side prompt building and section parsing for speaking answer coaching
- Added AI Chunk Coach with structured chunk explanations from chunk library, practice, and speaking prompt chunk suggestions
- Added AI Missing Chunk Recommendation for speaking answers plus production-style practice answers
- Added AI Sample Answer generation for speaking prompts using bounded chunk selection from mapped, same-topic, and general chunk pools
- Added Speaking Simulator with ownership-safe persisted sessions, local message history, upstream thread reuse, and structured final feedback
- Added AI Study Coach with compact learner-profile generation, cached snapshots, and dashboard-linked learner guidance
- Added advanced AI prompt-builder coverage, sample-answer selection tests, route validation tests, and updated architecture/security/testing notes

## 2026-06-08

- Started the isolated `Family English Companion` module without mixing it into IELTS question-bank, practice, or review logic
- Added a separate `Family English` navigation group and scaffolded the routes:
  - `/family`
  - `/family/profile`
  - `/family/scenarios`
  - `/family/conversations`
  - `/family/chunks`
  - `/family/practice`
- Added separate family services under `src/server/family` and separate family AI prompt builders under `src/server/ai/prompts`
- Added `FamilyProfile` persistence with bootstrap-owner seeding from the Phuc family source profile plus a generic fallback template for other users
- Added a private Family Profile editor page, family middleware coverage, and helper tests for seeded profile behavior and family prompt boundaries
- Added `FamilyScenario` and `FamilyConversation` models with separate family-only persistence and no coupling to IELTS tables
- Seeded default Phuc-family scenarios for the bootstrap owner and added lazy default-scenario upsert on family scenario access
- Replaced `/family/scenarios` placeholder with searchable CRUD UI for creating, editing, archiving, and reactivating family scenarios
- Added `POST /api/family/conversations/generate`, family conversation prompt building, safe AI logging, and markdown conversation persistence
- Replaced `/family/conversations` placeholder with generation, filter, copy, delete, and detail rendering UI using the shared safe AI Markdown component
- Added ownership and validation coverage for family scenarios and family conversation generation
- Added `FamilyChunk` with separate family-only persistence, per-user normalized duplicate prevention, and lifecycle states `SUGGESTED`, `APPROVED`, and `ARCHIVED`
- Added `POST /api/family/chunks/extract` to turn saved family conversations into reviewable private daily-life chunks through the existing server-side AI client
- Replaced `/family/chunks` placeholder with a real review queue supporting manual add, edit, search, status tabs, child/speaker/category filters, and bulk approve/archive actions
- Added `Extract Chunks` to family conversation detail, with extraction summary feedback and a deep link into `/family/chunks?status=SUGGESTED`
- Added family chunk service and route coverage for validation, ownership protection, invalid AI output fallback, duplicate skipping, and approve/archive transitions

## 2026-06-11

- Added `FamilyPracticeSession`, `FamilyPracticeAnswer`, and `FamilyReviewSchedule` models with a dedicated migration so family practice and family review data stay separate from IELTS `PracticeSession`, `PracticeAnswer`, and `ReviewSchedule`
- Added a separate family spaced repetition scheduler with `1`, `3`, `7`, `14`, and `30` day intervals and independent mastery tracking
- Added a separate family practice deck generator supporting `VI_TO_CHUNK`, `FILL_IN_DIALOG`, `NATURAL_RESPONSE`, `CONTINUE_CONVERSATION`, and `FAMILY_CHUNK_RECALL` exercises with deterministic ordering and approved-only chunk selection
- Added `POST /api/family/practice/start`, `POST /api/family/practice/submit`, and `POST /api/family/practice/ai-feedback` with approved-user, ownership, and validation enforcement
- Replaced the `/family/practice` placeholder with a mobile-first deck runner that updates the family review schedule per chunk and never touches IELTS review data
- Added a separate family practice AI feedback prompt builder, used only by `CONTINUE_CONVERSATION` exercises and failing gracefully without blocking practice
- Added a family dashboard service and rendered chunks learned, due reviews, weekly accuracy, family streak, top scenarios, top speaker roles, and recent family practice activity on `/family`
- Added family practice, family review, family submit route, family AI feedback route, family AI feedback service, and family dashboard service test coverage
- Added `FamilyRoleplaySession` and `FamilyRoleplayMessage` models with a dedicated migration so the AI roleplay flow stays isolated from IELTS simulator, IELTS practice, and IELTS review data
- Replaced the single placeholder roleplay prompt with three dedicated prompt builders for start, turn, and finish phases and enforced single-character, in-character behavior
- Added `POST /api/family/roleplay/start`, `POST /api/family/roleplay/message`, `POST /api/family/roleplay/finish`, `POST /api/family/roleplay/archive`, `GET /api/family/roleplay/sessions`, and `GET /api/family/roleplay/sessions/[id]` with approved-user, ownership, and scenario-ownership enforcement
- Stored the upstream `conversation_id` server-side on `FamilyRoleplaySession.externalConversationId` so the AI keeps the same chat thread across turns and the client cannot supply a conversation id
- Added a mobile-first `/family/roleplay` UI with start form, transcript bubbles, send/finish/archive controls, history list, and safe Markdown coach review rendering
- Added an optional `FamilyChunk.sourceRoleplaySessionId` link so a future follow-up can extract chunks from a finished roleplay without coupling to IELTS chunks
- Added family roleplay service and route test coverage for ownership protection, identical-role rejection, AI failure fallback, and external conversation id isolation
- Added `FamilyFavorite` and `FamilyDailyPlanSnapshot` models with a dedicated migration so the daily coach and favorites stay isolated from IELTS analytics
- Added a deterministic family recommendation engine that scores approved chunks by due reviews, mastery, personalization, and frequency without touching IELTS practice or review data
- Added `POST /api/family/today/plan` with SHA-1 source-hash caching of AI Markdown plans for 12 hours, plus a graceful 503 when AI is unavailable
- Added `GET/POST/DELETE /api/family/favorites` with per-target ownership checks across conversations, chunks, scenarios, and roleplay sessions
- Added `POST /api/family/insights/summary` for an AI Vietnamese coach review of the last 7 days, computed from family practice answers, conversations, roleplay sessions, and review schedules
- Replaced the family workspace landing UX with a `/family/today` daily coach page that exposes a child-focus selector, one-click action cards, and favorite heart toggles
- Added `/family/insights` with weekly accuracy, streak, top scenarios, weakest and strongest chunks, plus an on-demand AI summary
- Added `/family/favorites` with filtering by target type and quick removal
- Added recommendation engine, daily plan service, favorites service, and daily coach route test coverage
- Added IELTS Translation Recall Lab as a separate IELTS module isolated from Chunk Practice, Review, Speaking Prompt Bank, and Family English Companion
- Added `TranslationScript`, `TranslationSentence`, `TranslationChunkMapping`, and `TranslationSentenceReview` models with a dedicated migration (`0012_translation_recall`) and idempotent fingerprint-based CSV re-import
- Added admin-only `POST /api/admin/translation/import` for CSV upload with row-level validation and friendly XLSX rejection
- Added `POST /api/translation/extract-chunk` that asks AI for `chunk`, `meaningVi`, `usage`, `example`, `suggestedTopic`, and `bandEstimate` in strict JSON, with a separate prompt builder
- Added `POST /api/translation/save-chunk` that upserts the existing IELTS `Chunk` row by `(chunk, meaningVi)` and stores a `TranslationChunkMapping` row linking the source sentence
- Added `POST /api/translation/review` that records `EASY`/`MEDIUM`/`HARD` self-ratings in a dedicated `TranslationSentenceReview` table without touching IELTS `ReviewSchedule`
- Added `/translation` list page, `/translation/[id]` script reader with hover (desktop) / tap (mobile) reveal, English-phrase selection, AI extract + manual save modal, and Speaking mode with self-rating
- Added admin-only `/admin/translation` import view with row-level summary
- Added `Translation Recall` to the IELTS sidebar
- Added CSV validation, script service, chunk service, review service, and route auth tests for the new module
- Added Question Bank → Translation Recall generation pipeline so a Speaking Question can produce an English sample answer + Vietnamese translation + aligned sentence pairs in one AI call, saved straight into the existing Translation Recall Lab
- Extended `TranslationScript` with `sourceType`, `sourceQuestionId`, `generatedByAi`, `version`, and `usedChunkIds`, indexed for `(sourceQuestionId, bandLevel, version)` lookups (migration `0013_translation_recall_from_question`)
- Added `POST /api/translation-recall/from-question` with approved-user enforcement, chunk-shortlist hard cap of 30, duplicate detection by `(sourceQuestionId, targetBand)`, regeneration with incremented `version`, structured-JSON AI parsing, and plain-text fallback when the JSON is malformed or missing aligned sentences
- Added a "Create Translation Recall Script" panel + modal on `/questions` with length, target band, and chunk-library inclusion controls, plus a result card that links into Translation Recall and offers "Generate another version"
- Added a Translation Recall script-count tag on the Question Bank list and resolved `usedChunkIds` into highlighted spans inside the Translation Recall reader so revealed English shows golden marks with Vietnamese tooltips
- Added generation-service and route tests covering auth, validation, duplicate detection, chunk caps, structured JSON parsing, fallback behavior, regeneration, and AI failure fallback
- Improved desktop sidebar contrast: active menu item now sits on the brand teal with white text, hover gets a translucent white wash, and group titles + idle items are bright enough on the dark gradient. Mobile drawer is untouched and continues to use the default light theme.
- Fixed Chunk Library pagination so the size changer (8, 10, 20, 50, 100) actually works on both the desktop table and the mobile list. The previous controlled `pageSize: 8` prop locked the dropdown; switched to `defaultPageSize` plus explicit `pageSizeOptions` so the user's selection takes effect without changing any backend query limit.
- Added AI scenario generation to Family English Companion: new `FamilyScenarioStatus` (`SUGGESTED`/`APPROVED`/`ARCHIVED`) and `FamilyScenarioSource` (`MANUAL`/`AI`) enums on `FamilyScenario`, plus `aiReason`, `suggestedGoals`, `suggestedChunks`, `normalizedTitle`, and a unique `(userId, normalizedTitle)` index (migration `0014_family_scenario_ai_suggestions`, backfills `isActive` → status).
- Added `POST /api/family/scenarios/generate` and a server-side prompt builder `family-scenario-generator.ts` requiring an active Family Profile, returning a strict-JSON shape with title/category/childFocus/description/difficulty/suggestedGoals/suggestedChunks/aiReason, deduplicating against existing titles and within the batch, persisting as `SUGGESTED` so nothing leaks into conversation generation automatically.
- Added `setFamilyScenarioStatus` and `bulkSetFamilyScenarioStatus` (single + bulk approve/archive/restore) that keep `isActive` and `status` in sync; the legacy `setFamilyScenarioActiveState` continues to work for backwards compatibility.
- Rebuilt `/family/scenarios` with status tabs (Suggested / Approved / Archived), a Generate Scenarios with AI button + modal (count, child focus, category, include-existing toggle), bulk approve/archive, source filter, and detailed cards showing suggested goals, suggested chunks, and the Vietnamese `aiReason`.
- Added generator-service and route tests covering ownership/auth, count cap, missing profile, malformed JSON, AI failure → `AI_TUTOR_UNAVAILABLE`, in-batch dedupe, existing-title dedupe, status transition (single + bulk) with ownership checks.
- Added AI High-Probability Speaking Question Generator for the IELTS Question Bank: new `IeltsQuestionStatus` (`SUGGESTED`/`APPROVED`/`ARCHIVED`) and `IeltsQuestionSource` (`MANUAL`/`CSV_IMPORT`/`AI_GENERATED`) enums on `IeltsQuestion`; new columns `aiReason`, `popularityScore`, `predictedUsefulnessScore`, `generatedBatchId`, `normalizedPrompt`; ten new `QuestionChunkUsageRole` values (`OPENING`, `REASON`, `CONTRAST`, `DETAIL`, `EMOTION`, `STORYTELLING`, `SPECULATION`, `COMPARISON`, `ENDING`, `FILLER`); migration `0015_ielts_question_ai_generation` backfills existing rows to `APPROVED` / `MANUAL`.
- Added `src/server/ai/prompts/ielts-speaking-question-generator.ts` with the high-frequency topic palette, per-part rules (Part 1 / Part 2 cue cards / Part 3 abstract), and the explicit anti-claim guardrails (no real-exam predictions, no Writing tasks).
- Added `POST /api/admin/questions/generate` (admin-only, hard cap 60), `POST /api/admin/questions/status`, and `POST /api/admin/questions/bulk-status`. The generator service dedupes by `(skill, taskType, normalizedPrompt)` against both the existing bank and the in-batch set, maps recommended chunks against the existing Chunk Library by normalized text, and saves results as `SUGGESTED` / `AI_GENERATED` with a shared `generatedBatchId`.
- Updated learner-facing reads (`getQuestionBank`, `getQuestionPromptOptions`) to filter `status: "APPROVED"`. Added a new `getAdminQuestionBank` for the admin page so SUGGESTED and ARCHIVED rows stay visible to admins only.
- Updated the admin Question Bank UI with status tabs (Suggested / Approved / Archived), a "Generate with AI" button + modal (part / count / target band / topic hint / include-chunks toggle), per-row status actions (approve / archive / restore), bulk approve/archive when on Suggested, and a source/popularity tag column. Pagination changer (8/10/20/50/100) now works on the admin question table and mobile card list.
- Added 8 new tests across `question-generator-service.test.ts` and `question-generator-routes.test.ts` covering admin-only enforcement, count cap, malformed AI JSON, AI unavailable, AppError pass-through, dedupe, chunk mapping, part filter, single + bulk status transitions, and invalid status values.
- Added manual create/edit/delete support to Translation Recall Lab so admins are no longer limited to CSV import. The CSV flow is unchanged; the same `(title, topic)` fingerprint dedupe still applies and a manual script created under the same pair can be overwritten by a re-import.
- Added `POST /api/translation-recall/scripts`, `PATCH /api/translation-recall/scripts/[id]`, and `DELETE /api/translation-recall/scripts/[id]` (all admin-only) plus `createTranslationScript`, `updateTranslationScript`, and `deleteTranslationScript` service functions. Update replaces all sentences in one transaction.
- Added a shared `TranslationScriptForm` modal with sentence-pair preview that supports "Split by line" (line-by-line pairing with mismatched line-count warning), "Save as one block" (single sentence pair), and inline pair editing. Server validation rejects empty pairs so broken alignment cannot be silently saved.
- Added admin-only "Add Script" button on `/translation` and admin-only "Edit script" + "Delete" controls on `/translation/[id]`. Learners see no change.
- Added 8 new tests across `translation-script-manual-service.test.ts` and `translation-script-manual-routes.test.ts` covering duplicate detection, sentence rewrite on edit, not-found rejection, admin-only enforcement, missing title / empty sentence array validation, and DELETE auth + success.
- Added active production practice to Translation Recall Lab via a new "Compare with AI" mode alongside Reveal and Speaking. New `TranslationRecallAttempt` model (migration `0016_translation_recall_attempts`) stores per-user attempts with `mode` (SENTENCE/PASSAGE), `userAnswer`, `score`, and full `feedbackMarkdown`, indexed by `(userId, createdAt)` and `(userId, sentenceId, createdAt)`.
- Added `POST /api/translation-recall/compare` (approved-user only) that asks AI for a strict Markdown grading with `# Score`, `# Overall Feedback`, `# Meaning Accuracy`, `# Grammar & Naturalness`, `# Missing Chunks`, `# Better Version`, and `# Original Answer` sections. The server parses score and missing chunks back into structured fields so the UI can render the score badge and offer one-tap "Save missing chunk" buttons.
- The compare prompt explicitly tells AI to accept natural paraphrases and avoid over-strict literal grading. AI failures return a friendly 503 and never block the reveal, manual save, or review tracking flows.
- Updated `/translation/[id]` reader with a third mode toggle "Compare with AI", per-sentence answer textareas, score badge + feedback card, "Reveal original" toggle that stays hidden until the learner asks, and "Try again" + "Save missing chunk" actions that reuse the existing chunk-save modal pre-filled with chunk + meaning + example.
- Added 13 new tests across `translation-compare-service.test.ts` and `translation-compare-route.test.ts` covering score regex (extracting, clamping, missing heading), missing-chunk bullet parsing including the `(none)` sentinel, ownership checks (unknown script/sentence), AI failure mapping (`AI_TUTOR_UNAVAILABLE`), `AppError` pass-through, attempt persistence with parsed fields, PASSAGE mode passage assembly, and route auth/validation including the `sentenceId-required-in-SENTENCE-mode` cross-field check.
- Added Family Conversation Recall practice as a separate family-only module on top of any saved `FamilyConversation`, without touching the IELTS Translation Recall data path. New `FamilyConversationRecallLine` and `FamilyConversationRecallAttempt` models with a dedicated migration (`0017_family_conversation_recall`) cascade-delete with the owning user and conversation, with `lineId` on attempts set to `NULL` if a line is removed.
- Added `POST /api/family/conversations/[id]/create-recall` that asks AI to parse a family conversation Markdown into a strict-JSON list of 4–30 lines (`speaker`, `englishText`, `vietnameseText`, `usedChunks[]`), then replaces lines transactionally. The route is approved-user-only, refuses to call AI when recall lines already exist unless `regenerate: true`, and never writes anything on AI failure (`AI_TUTOR_UNAVAILABLE` 503).
- Added `POST /api/family/conversations/[id]/recall/compare` that grades a learner's English attempt against the original family line in strict Markdown (`# Score`, `# Feedback`, `# Meaning Accuracy`, `# Natural Family English`, `# Better Version`, `# Useful Chunks`, `# Original English`). The server parses the integer score and the `# Useful Chunks` bullets into structured `missingChunks[]` and persists a `FamilyConversationRecallAttempt`. The compare prompt explicitly tells AI to accept paraphrases and penalize textbook English.
- Added a per-conversation `/family/conversations/[id]/recall` page and `family-conversation-recall-view.tsx` with a `Create Recall Practice` CTA for first-time use, per-line cards that show Vietnamese by default and hide English, answer `TextArea`, `Compare with AI` / `Reveal original` / `Try again` controls, a score badge, the AI feedback Markdown via the shared safe Markdown renderer, and one-click `Save missing chunk` buttons that pre-fill the existing family chunk-save modal with text, Vietnamese meaning, usage context, speaker role, child focus, scenario category, example sentence, and `sourceConversationId`. Saved chunks go to `FamilyChunk` as `SUGGESTED` — never to the IELTS Chunk Library.
- Added a `Practice Recall` button next to `Extract Chunks` on the family conversation detail panel.
- Added 28 new tests across `family-conversation-recall-service.test.ts` and `family-conversation-recall-routes.test.ts` covering score regex (extract, clamp, missing heading null fallback), `# Useful Chunks` bullet parsing with the `(none)` sentinel, ownership protection (conversation + per-line), skip-when-existing behavior, regenerate path, malformed AI JSON rejection, `AI_TUTOR_UNAVAILABLE` mapping, `AppError` pass-through, transactional rewrite, per-line attempt-count joining, and route auth/validation for both create-recall and compare endpoints.
- Fixed Markdown bold artifacts (`**…**`, `__…__`) leaking into the Translation Recall UI. Added a reusable `src/lib/text-cleanup.ts` helper exporting `stripMarkdownBold`, `stripMarkdownArtifacts`, `normalizeAiTextForDisplay`, and `extractBoldPhrases`. The from-question generation service now normalizes English/Vietnamese sentence text before persisting (so new AI-generated scripts are stored clean) and also folds AI-bolded phrases into `usedChunks` as a secondary signal when the JSON `usedChunks` field is missing or partial — chunk highlighting still works on both new and legacy data.
- Applied display-time cleanup in `translation-list-view.tsx`, `translation-script-view.tsx`, `translation-script-form.tsx`, and the Question Bank → Translation Recall preview card, so existing rows that already contain `**` markers render cleanly without a database backfill. Highlighting in `highlightChunks` runs on the cleaned text, so chunk match-and-mark still produces visible `mark` spans with no leftover `**`.
- Added 15 unit tests in `text-cleanup.test.ts` covering `**` removal, `__` removal, multiple bold runs in one string, apostrophe / punctuation preservation, leading bullet stripping, lone-asterisk safety, whitespace normalization, null/undefined inputs, line-break preservation, ordered + deduped `extractBoldPhrases`, and an integration check that cleaned text still contains the underlying chunk strings used by the highlight pass.
- Fixed Prisma migration `0017_family_conversation_recall` which failed in MySQL with error 1059 (`Identifier name 'FamilyConversationRecallAttempt_userId_conversationId_createdAt_idx' is too long`, 67 chars > 64 limit). Renamed all `FamilyConversationRecall*` indexes to short, explicit `map:` names in `prisma/schema.prisma` and rewrote `prisma/migrations/0017_family_conversation_recall/migration.sql` to match. Final index names: `fcrl_conv_order_key`, `fcrl_conv_idx`, `fcra_user_created_idx`, `fcra_user_conv_created_idx`, `fcra_user_line_created_idx`. FK constraint names are kept (all already under 64 chars).
- Dev DB recovery (already executed on the connected `eng_app` instance): the partial run had created `FamilyConversationRecallLine` (0 rows) with the old long-prefix index names; `FamilyConversationRecallAttempt` did not exist; `_prisma_migrations` had a failed row. Steps run: `DROP TABLE FamilyConversationRecallLine` (empty, zero data at risk) → `pnpm prisma migrate resolve --rolled-back 0017_family_conversation_recall` → `pnpm prisma migrate deploy`. Verified with `pnpm prisma migrate status` (clean) and a direct `SHOW INDEX` check confirming the new short names are in place.
- Production recovery procedure (only if a prior `prisma migrate deploy` ran the failed 0017 there):
  1. Inspect first: `SHOW TABLES LIKE 'FamilyConversationRecall%';` and `SELECT migration_name, finished_at, rolled_back_at FROM _prisma_migrations WHERE migration_name = '0017_family_conversation_recall';`
  2. If `FamilyConversationRecallLine` exists but `FamilyConversationRecallAttempt` does not, and the Line table has zero rows, drop it: `DROP TABLE FamilyConversationRecallLine;`. If somehow it has rows (it shouldn't — the feature was unusable without Attempt), back them up first (`mysqldump ... FamilyConversationRecallLine > backup.sql`) before dropping. Never drop other tables.
  3. `pnpm prisma migrate resolve --rolled-back "0017_family_conversation_recall"`
  4. `pnpm prisma migrate deploy`
  5. Verify with `pnpm prisma migrate status` and re-run `SHOW INDEX FROM FamilyConversationRecallAttempt;` — expect `fcra_user_created_idx`, `fcra_user_conv_created_idx`, `fcra_user_line_created_idx`.
  6. `pm2 reload ielts-chunk-trainer --update-env` to pick up the regenerated Prisma client.

## 2026-06-16

- Added `SpeakingIdea`, `SpeakingIdeaVariant`, `SpeakingIdeaSupport`, `SpeakingIdeaPattern`, and `SpeakingIdeaQuestionMap` as the Phase 1 foundation for a new admin-only `Speaking Idea Map` module under `/admin/ideas`.
- Added `SpeakingIdeaStatus` (`DRAFT`, `ACTIVE`, `ARCHIVED`) and `SpeakingIdeaSupportType` (`REASON`, `EXAMPLE`, `RESULT`, `CONTRAST`, `DETAIL`, `PERSONAL_EXPERIENCE`) enums with a dedicated Prisma migration `0018_speaking_idea_map_foundation`.
- Added admin navigation entry `Speaking Idea Map` and three server-rendered routes:
  - `/admin/ideas`
  - `/admin/ideas/new`
  - `/admin/ideas/[id]`
- Added a separate admin data layer for speaking ideas with transactional nested save behavior so parent idea + variants + support points + answer patterns + question links are rewritten atomically.
- Added zod validation for the Speaking Idea editor:
  - score ranges must stay `1..5`
  - duplicate linked questions are rejected
  - only one linked question may be marked `isPrimary`
  - malformed pattern `variablesJson` is rejected before persistence
- Added admin server actions:
  - `saveSpeakingIdeaAction`
  - `setSpeakingIdeaStatusAction`
  with structured metadata logging and server-side `ADMIN` enforcement.
- Added a compact admin list page with filters for `status`, `popularityScore`, `reuseScore`, and text search, plus mobile-safe card fallback and archive/draft/activate actions.
- Added a nested idea editor with inline management for:
  - band variants
  - supporting points
  - answer patterns
  - linked IELTS speaking questions
- Added service and middleware coverage for:
  - admin-only access
  - nested CRUD validation
  - invalid JSON rejection
  - archive status behavior
- Kept the new module isolated from:
  - IELTS learner practice/review scheduling
  - Family English routes and models
  - AI generation flows
- Added Phase 2 visual `Speaking Idea Map` view at `/admin/ideas/map` using a lightweight CSS/tree layout instead of a graph dependency.
- Added a pure `buildSpeakingIdeaMindMap` transformation helper that:
  - filters by topic, status, minimum reuse score, and question part
  - derives node size from `reuseScore`, `popularityScore`, and linked-question count
  - expands child branches for variants, support points, and linked questions
- Added map-route middleware coverage and helper tests for node sizing/filtering while keeping the module admin-only and schema-stable.
- Added Phase 3 AI generation for reusable IELTS Speaking ideas through `POST /api/admin/ideas/generate` and a dedicated prompt builder `buildIeltsSpeakingIdeaGeneratorPrompt`.
- Added small `SpeakingIdea` metadata fields `aiReason` and `generatedBatchId` with migration `0019_speaking_idea_ai_generation` so AI-generated drafts keep their rationale and batch grouping without changing learner-facing IELTS flows.
- Added server-side duplicate protection for generated ideas using normalized `title` and normalized `shortLabel`, even when the prompt runs without existing-context hints.
- Added admin UI support on `/admin/ideas`:
  - `Generate Ideas with AI` button
  - small generation modal
  - automatic redirect into `Review Drafts`
- Generated ideas are now always saved as `DRAFT`; admins must manually activate them after review.
- Phase 3 intentionally does not auto-create `SpeakingIdeaQuestionMap` links from AI `exampleQuestions`; those remain example hints only for now.
- Added route and service coverage for:
  - admin-only generation access
  - invalid payload rejection
  - malformed AI JSON handling
  - duplicate skipping
  - draft creation
  - draft-to-active approval flow
- Added Phase 4 Speaking Idea ↔ Question Bank mapping so reusable ideas can now be linked to IELTS Speaking questions from both sides of the admin UI.
- Added admin-only mapping routes:
  - `POST /api/admin/ideas/map-question`
  - `PATCH /api/admin/ideas/question-map/:id`
  - `DELETE /api/admin/ideas/question-map/:id`
  - `POST /api/admin/ideas/suggest-question-mapping`
- Added question-bank drawer support on `/admin/questions`:
  - view current recommended ideas for a question
  - manually add/remove idea mappings
  - mark one mapping as primary
  - adjust `relevanceScore`
  - review AI suggestions before saving
- Added idea-detail support on `/admin/ideas/[id]` to ask AI for matching questions and append suggestions into the draft form before save.
- Added server-side duplicate prevention for `(ideaId, speakingQuestionId)` and server-side primary enforcement so only one idea per question remains primary after create/update.
- Added dedicated AI prompt builders and suggestion parsing for:
  - `QUESTION_TO_IDEAS`
  - `IDEA_TO_QUESTIONS`
  while keeping suggestions review-only and never auto-saving them.
- Added mapping route/service coverage for:
  - admin-only access
  - invalid payload rejection
  - duplicate mapping rejection
  - primary demotion behavior
  - idea/question existence checks
  - AI suggestion parsing and candidate filtering
- Added Phase 5 admin-only answer generation from reusable speaking ideas through `POST /api/admin/ideas/generate-answer`.
- Added a dedicated prompt builder for `question + idea + band + length` generation so the AI now sees:
  - the speaking question context
  - the selected reusable idea
  - idea variants
  - support points
  - reusable answer patterns
  - a bounded chunk shortlist from the existing Chunk Library
  - the optional idea-question mapping reason
- Added `Generate Answer From This Idea` controls to the admin Question Bank drawer and `Generate Answer` controls to linked questions on the Speaking Idea detail page.
- The answer output is rendered as Markdown with these sections:
  - `# Sample Answer`
  - `# Idea Used`

## 2026-06-18

- Added Phase 6 `Speaking Idea Coverage Dashboard` at `/admin/ideas/coverage` for admin-only reuse analysis.
- Added a speaking-idea coverage snapshot service that computes:
  - total active ideas
  - total mapped questions
  - unmapped question count
  - ideas with no linked questions
  - top reusable ideas
  - weak topics by coverage percent
  - `PART_1` / `PART_2` / `PART_3` coverage
- Added admin dashboard tables for:
  - top reusable ideas
  - unmapped questions
  - weak topics
- Added admin actions from the coverage screen to:
  - suggest idea mappings for unmapped questions through the existing AI mapping route
  - generate more draft ideas for weak topics through the existing AI idea-generation route
  - jump directly to the visual mind map
- Kept the dashboard schema-free by deriving all metrics from existing `SpeakingIdea`, `SpeakingIdeaQuestionMap`, and approved `IeltsQuestion` data.
- Added coverage service tests and middleware coverage for `/admin/ideas/coverage`.
- Left `generatedAnswersCount` as `0` in this phase because reusable-idea answer generation is still generate-only and not persisted.
- Added an idempotent initial `Speaking Idea Map` seed pack with `37` reusable IELTS Speaking ideas for admin bootstrapping.
- Added [prisma/speaking-idea-pack.ts](/Users/phucluu/Downloads/all_repo/eng-app/prisma/speaking-idea-pack.ts) as the source-of-truth pack containing:
  - Vietnamese and English descriptions
  - `popularityScore` / `reuseScore`
  - `5.5 / 6.5 / 7.5` band variants
  - support points
  - answer patterns
  - example-question coverage hints
- Added [prisma/seed-speaking-ideas.ts](/Users/phucluu/Downloads/all_repo/eng-app/prisma/seed-speaking-ideas.ts) to create only missing ideas and skip duplicates by normalized `title` or `shortLabel`.
- Seed runs never overwrite existing admin-edited `SpeakingIdea` rows; they only create new rows and leave existing nested content untouched.
- New idea-pack rows are created as `ACTIVE` and grouped under `generatedBatchId = "seed-idea-pack-v1"`.
- Added seed helper tests and dedicated docs in [docs/IDEA_MAP.md](/Users/phucluu/Downloads/all_repo/eng-app/docs/IDEA_MAP.md).
  - `# Chunks / Phrases Used`
  - `# Vietnamese Explanation`
  - `# Reusable Pattern`
- Added fallback normalization so if the AI returns plain text instead of the expected sectioned Markdown, the server wraps it into the required headings instead of breaking the admin flow.
- Phase 5 is intentionally generate-only for now: answers are returned to the UI for copy/review/regeneration, but are not yet persisted in a new DB table.
- Added route, service, and prompt coverage for:
  - admin-only API protection
  - question/idea existence validation
  - prompt inclusion of reusable patterns
  - plain-text AI fallback handling
