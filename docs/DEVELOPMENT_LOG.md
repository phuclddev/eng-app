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
- Added Speaking Simulator with ownership-safe persisted sessions, local message history, upstream thread reuse, and structured final feedback
- Added AI Study Coach with compact learner-profile generation, cached snapshots, and dashboard-linked learner guidance
- Added advanced AI prompt-builder coverage, simulator ownership tests, route validation tests, and updated architecture/security/testing notes
