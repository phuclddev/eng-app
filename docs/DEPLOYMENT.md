# Deployment

## Application

- domain: `demo.garena.vn`
- process manager: `pm2`
- port: `10000`
- database host: `125.212.198.41`

## Build steps

```bash
pnpm install
pnpm db:generate
pnpm db:migrate:deploy
pnpm prisma db seed
pnpm build
pm2 start ecosystem.config.cjs
pm2 reload ielts-chunk-trainer --update-env
```

## Environment

- Required auth/runtime vars:
  - `DATABASE_URL`
  - `NEXTAUTH_URL`
  - `NEXTAUTH_SECRET`
  - `GOOGLE_CLIENT_ID`
  - `GOOGLE_CLIENT_SECRET`
- Optional AI Tutor vars:
  - `AI_CHATFLOW_URL=https://ai.insea.io/api/chatflows/22038/run`
  - `AI_CHATFLOW_TOKEN=replace_me`

If AI Tutor env vars are omitted, the main learning flows still work and the AI Tutor UI will show that the feature is not configured.

## Initial admin bootstrap

- The first admin account is bootstrapped as `dinhphuc.luu@garena.vn`.
- Seeding is idempotent and will keep that user at `ADMIN` + `APPROVED`.
- After Google OAuth is configured, logging in with that email will also re-assert the same admin role and approved status safely.

## AI Tutor notes

- Keep `AI_CHATFLOW_TOKEN` only on the server.
- After schema changes, run the migration that creates `AiConversation` before using `/ai-tutor`.
- AI Tutor failures should not block practice submission or question-bank browsing.

## Nginx proxy

Proxy traffic from `demo.garena.vn` to `127.0.0.1:10000`.

## SSL

Use Certbot with the nginx plugin after the reverse proxy is working.
