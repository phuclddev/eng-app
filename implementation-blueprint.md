# IELTS Chunk Trainer — Full Project Implementation Blueprint

Author: Phuc Luu  
Target domain: demo.garena.vn  
Runtime server: 103.239.121.192  
App port: 10000  
Database server: 125.212.198.41  
Stack: Next.js + TypeScript + Ant Design + Prisma + MySQL + PM2 + Nginx

---

# 1. Project Overview

Build a private IELTS Chunk Training System focused on helping learners remember and actively use English chunks/collocations for IELTS.

Core philosophy:

- active recall
- contextual practice
- spaced repetition
- enterprise-grade structure
- production-conscious implementation
- RBAC-protected internal learning platform

The application is NOT a simple flashcard app.

The application is a:

Contextual Active Recall IELTS Chunk Training System

---

# 2. Core Features

## 2.1 Authentication

- Google OAuth login
- Only approved users can study
- RBAC enforced server-side

User statuses:

PENDING
APPROVED
BLOCKED

Roles:

USER
ADMIN

---

## 2.2 Chunk Library

Each chunk contains:

chunk
meaning_vi
example
wrong_examples
topic
difficulty
band_level
grammar_pattern
tags
notes

---

## 2.3 Practice Engine

Supported exercise types:

### Recognition

- multiple choice
- choose best chunk

### Recall

- fill in blank
- Vietnamese -> chunk typing

### Production

- rewrite sentence
- create sentence using chunk

### Review

- spaced repetition
- review scheduling
- confidence score tracking

---

## 2.4 Progress Tracking

Track:

- accuracy
- streak
- mastery
- review intervals
- weak chunks
- practice history

---

## 2.5 Admin Features

Admin can:

- approve/block users
- manage chunks
- manage topics
- review statistics
- import/export chunks

---

# 3. Recommended Tech Stack

## Frontend

Next.js App Router
TypeScript
React
Ant Design

## Backend

Next.js Route Handlers
Server Actions where suitable

## Database

MySQL
Prisma ORM

## Auth

NextAuth / Auth.js
Google OAuth

## Runtime

PM2
Nginx reverse proxy
Ubuntu server

## Testing

Vitest
Playwright
TypeScript typecheck
ESLint

---

# 4. High-Level Architecture

Browser
  ↓
Nginx
  ↓
PM2
  ↓
Next.js App
  ↓
Prisma ORM
  ↓
MySQL

---

# 5. Recommended Repository Structure

```text
ielts-chunk-trainer/
  src/
    app/
    components/
    server/
    lib/
    hooks/
    styles/
    tests/

  prisma/
    schema.prisma

  docs/

  public/

  scripts/

  package.json
  tsconfig.json
  next.config.ts
  ecosystem.config.cjs
  .env.example
```

---

# 6. Phase-by-Phase Development Plan

## PHASE 1 — Project Initialization

### Tasks

```bash
pnpm create next-app
```

Install dependencies:

```bash
pnpm add antd @ant-design/icons
pnpm add prisma @prisma/client
pnpm add next-auth
pnpm add zod bcrypt
pnpm add pino pino-pretty
pnpm add dayjs
```

Install dev dependencies:

```bash
pnpm add -D vitest
pnpm add -D playwright
pnpm add -D @types/node
pnpm add -D tsx
```

Create docs:

```text
/docs/README.md
/docs/ARCHITECTURE.md
/docs/SECURITY.md
/docs/TESTING.md
/docs/API.md
/docs/AI_AGENT_GUIDE.md
/docs/DEVELOPMENT_LOG.md
/docs/DEPLOYMENT.md
```

---

## PHASE 2 — Database Design

### Core Models

- User
- Chunk
- Topic
- PracticeSession
- PracticeAnswer
- ReviewSchedule

Run Prisma:

```bash
pnpm prisma init
pnpm prisma migrate dev
```

Production:

```bash
pnpm prisma migrate deploy
```

---

## PHASE 3 — Authentication & RBAC

### Features

- Google login
- protected routes
- approval workflow
- admin management
- RBAC middleware

Authorized redirect:

```text
https://demo.garena.vn/api/auth/callback/google
```

---

## PHASE 4 — UI Foundation

### Layout

```text
Sidebar
  Dashboard
  Learn Today
  Chunk Library
  Practice
  Review
  Progress
  Admin

Header
  User avatar
  Role
  Status
  Logout
```

UI style:

- enterprise admin console
- compact layout
- clean tables/forms
- minimal animation

---

## PHASE 5 — Chunk Management

### Admin Features

- chunk CRUD
- topic management
- CSV import/export
- search/filter/pagination

CSV format:

```csv
chunk,meaning,example,topic,difficulty
```

---

## PHASE 6 — Practice Engine

### Exercise Types

1. Multiple choice
2. Fill in blank
3. VN -> chunk typing
4. Rewrite sentence
5. Create sentence

### Confidence Score

After answer:

- Easy
- Medium
- Hard

---

## PHASE 7 — Spaced Repetition

### Review intervals

- 1 day
- 3 days
- 7 days
- 14 days
- 30 days

Use:

- correctness
- response time
- confidence
- review count

---

## PHASE 8 — Dashboard & Analytics

Track:

- chunks learned
- review due
- accuracy
- streak
- weak topics
- recent activity

---

## PHASE 9 — Logging & Error Handling

Use structured logs.

Never log:

- passwords
- tokens
- secrets

Create:

- AppError
- ValidationError
- UnauthorizedError
- ForbiddenError

---

## PHASE 10 — Testing

Run:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Playwright coverage:

- login
- practice
- review
- admin approval

---

## PHASE 11 — Production Deployment

### Server

Application server:

```text
103.239.121.192
```

App port:

```text
10000
```

Database server:

```text
125.212.198.41
```

Domain:

```text
demo.garena.vn
```

---

## PHASE 12 — Ubuntu Server Setup

Install:

```bash
npm install -g pnpm
npm install -g pm2
sudo apt install nginx
```

---

## PHASE 13 — MySQL Setup

```sql
CREATE DATABASE ielts_chunk_trainer;

CREATE USER 'ielts_app'@'%' IDENTIFIED BY 'strong_password';

GRANT ALL PRIVILEGES ON ielts_chunk_trainer.* TO 'ielts_app'@'%';

FLUSH PRIVILEGES;
```

Database URL:

```text
mysql://ielts_app:password@125.212.198.41:3306/ielts_chunk_trainer
```

---

## PHASE 14 — Environment Variables

```env
DATABASE_URL=mysql://ielts_app:password@125.212.198.41:3306/ielts_chunk_trainer

NEXTAUTH_URL=https://demo.garena.vn

NEXTAUTH_SECRET=replace_with_secure_secret

GOOGLE_CLIENT_ID=replace_me
GOOGLE_CLIENT_SECRET=replace_me
```

---

## PHASE 15 — Build & Runtime

```bash
pnpm install
pnpm prisma generate
pnpm prisma migrate deploy
pnpm build
```

---

## PHASE 16 — PM2 Configuration

ecosystem.config.cjs

```js
module.exports = {
  apps: [
    {
      name: "ielts-chunk-trainer",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 10000",
      cwd: "/var/www/ielts-chunk-trainer",
      env: {
        NODE_ENV: "production"
      }
    }
  ]
};
```

Run:

```bash
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

---

## PHASE 17 — Nginx Reverse Proxy

```nginx
server {
    listen 80;
    server_name demo.garena.vn;

    location / {
        proxy_pass http://127.0.0.1:10000;

        proxy_http_version 1.1;

        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';

        proxy_set_header Host $host;

        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable:

```bash
sudo ln -s /etc/nginx/sites-available/demo.garena.vn /etc/nginx/sites-enabled/

sudo nginx -t

sudo systemctl restart nginx
```

---

## PHASE 18 — SSL Setup

```bash
sudo apt install certbot python3-certbot-nginx

sudo certbot --nginx -d demo.garena.vn
```

---

## PHASE 19 — Production Verification

Checklist:

- HTTPS works
- Google login works
- RBAC works
- chunk CRUD works
- practice works
- review works
- PM2 restart works
- nginx proxy works
- no browser console errors
- no runtime errors

---

## PHASE 20 — Future Enhancements

### AI Features

- AI sentence feedback
- AI rewrite suggestions
- speaking evaluation
- adaptive difficulty

### Gamification

- streaks
- XP
- badges
- leaderboard

### Mobile

- PWA
- offline review
- mobile practice mode

---

# Final Engineering Rules For Codex

Codex must follow:

- test-first safe changes
- documentation-first workflow
- structured logs
- server-side RBAC
- no secrets in logs
- small reversible changes
- production-safe deployment

After every meaningful task, Codex must report:

- Summary
- Files changed
- Tests added
- Commands run
- Manual verification
- Risks
- Next steps

Before finishing any phase:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

---

# Final Product Vision

The goal is NOT:

another vocabulary app

The goal IS:

an intelligent IELTS chunk recall training platform

focused on:

- memory retention
- active recall
- real IELTS production ability
