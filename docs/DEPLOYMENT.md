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
pnpm build
pm2 start ecosystem.config.cjs
```

## Nginx proxy

Proxy traffic from `demo.garena.vn` to `127.0.0.1:10000`.

## SSL

Use Certbot with the nginx plugin after the reverse proxy is working.
