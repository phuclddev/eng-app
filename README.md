# IELTS Chunk Trainer

Private IELTS chunk recall platform built with Next.js, TypeScript, Ant Design, Prisma, MySQL, and NextAuth.

## Core capabilities

- Google OAuth with approval workflow and RBAC
- Chunk library with topic management, CSV import/export, and admin CRUD
- Practice engine for recognition, recall, and production exercises
- Spaced repetition review queue with confidence-aware scheduling
- Dashboard and progress analytics for accuracy, streaks, weak topics, and review load

## Local development

1. Copy the environment template.

```bash
cp .env.example .env
```

2. Install dependencies and generate Prisma Client.

```bash
pnpm install
pnpm db:generate
```

3. Run database migrations and start the app.

```bash
pnpm db:migrate:dev
pnpm dev
```

## Quality checks

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Deployment

- Runtime port: `10000`
- Process manager: `pm2`
- Reverse proxy: `nginx`
- Domain target: `demo.garena.vn`

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for the production runbook.
