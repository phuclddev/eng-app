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
