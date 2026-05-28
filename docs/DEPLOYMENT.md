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
```

## Initial admin bootstrap

- The first admin account is bootstrapped as `dinhphuc.luu@garena.vn`.
- Seeding is idempotent and will keep that user at `ADMIN` + `APPROVED`.
- After Google OAuth is configured, logging in with that email will also re-assert the same admin role and approved status safely.

## Nginx proxy

Proxy traffic from `demo.garena.vn` to `127.0.0.1:10000`.

## SSL

Use Certbot with the nginx plugin after the reverse proxy is working.
