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
