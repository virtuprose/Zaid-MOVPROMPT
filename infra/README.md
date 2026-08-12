# MovPrompt portable infrastructure

This directory contains the provider-neutral local foundation for the planned
PostgreSQL backend. It does not replace the current Supabase integration by
itself.

## Local services

- PostgreSQL 17 on `127.0.0.1:5432`
- MinIO API on `127.0.0.1:9000`
- MinIO console on `127.0.0.1:9001`
- Mailpit SMTP on `127.0.0.1:1025`
- Mailpit UI on `127.0.0.1:8025`

Start only the usable infrastructure services:

```bash
docker compose --env-file infra/environments/local.example up -d
docker compose ps
```

The `application` profile is intentionally disabled by default. It builds the
API and worker, applies portable migrations once, then starts Better Auth,
private asset routes and the durable PostgreSQL outbox/pg-boss worker:

```bash
docker compose --env-file infra/environments/local.example --profile application up -d --build
docker compose --env-file infra/environments/local.example --profile application ps
```

The API is then available on `http://127.0.0.1:8787`; authentication email is
captured at `http://127.0.0.1:8025`. Generation providers, exports and billing
remain disabled by default. Local credentials in `local.example` are known,
development-only values and are not suitable for a shared or public environment.

`local.example` enables `VITE_FEATURE_PORTABLE_AUTH=true` because it describes
the full application profile. Set that public build flag to `false` for a
web-only session. The flag does not start the API; it only selects the portable
auth client in the Vite bundle.
