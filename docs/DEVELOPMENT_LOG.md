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
