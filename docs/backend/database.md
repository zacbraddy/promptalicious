# Database Setup and Management

This document describes how to set up and manage the PostgreSQL database for the promptalicious backend.

## Prerequisites

- Docker and Docker Compose (for local PostgreSQL instance)
- OR a PostgreSQL instance running elsewhere (configure via `.env`)

## Quick Start

### 1. Start PostgreSQL (Docker)

From the repository root:

```bash
docker compose up -d postgres
```

This starts a PostgreSQL 17 container with:
- Database: `promptalicious`
- User: `postgres`
- Password: `postgres`
- Port: `5432`

### 2. Configure Environment Variables

Create `packages/backend/.env` (or copy from `.env.example`):

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/promptalicious
LOG_LEVEL=info
NODE_ENV=development
```

### 3. Run Migrations

```bash
pnpm --filter @promptalicious/backend db:migrate
```

This applies all pending migrations to the database.

### 4. Verify Tables

```bash
docker compose exec postgres psql -U postgres -d promptalicious -c "\dt"
```

You should see:
- `llm_config` - LLM configuration (single-row table)
- `pricing_info` - Token pricing cache
- `exchange_rates` - Currency exchange rates

## Available Scripts

All scripts should be run from the repository root using:

```bash
pnpm --filter @promptalicious/backend <script-name>
```

### Database Migration Scripts

- **`db:migrate`** - Run pending migrations programmatically
  - Uses DrizzleORM's programmatic migration runner
  - Applies migrations from `drizzle/` directory
  - Logs progress and errors

- **`db:push`** - Push schema changes directly to database
  - Use for development only
  - Bypasses migration files
  - Updates database schema to match `src/db/schema.ts`

- **`db:generate`** - Generate new migration files
  - Compares `src/db/schema.ts` to current database state
  - Creates SQL migration files in `drizzle/` directory
  - Run this after changing schema definitions

- **`db:studio`** - Open Drizzle Studio (visual database browser)
  - Web-based GUI for viewing/editing data
  - Opens at https://local.drizzle.studio
  - Useful for manual data inspection

## Schema Overview

### `llm_config` (Single-Row Table)

Stores global LLM configuration:
- `id` (always 1, enforced by constraint)
- `selected_model` (default: "gpt-4o-mini")
- `api_key` (stored in plain text - database is git-ignored)
- `provider_endpoint` (optional custom endpoint)
- `created_at`, `updated_at` (timestamps)

### `pricing_info`

Caches token pricing data:
- `id` (auto-increment)
- `model`, `provider` (unique together)
- `input_token_price_usd`, `output_token_price_usd` (high precision decimals)
- `last_updated` (timestamp for staleness detection)

### `exchange_rates`

Caches currency conversion rates:
- `id` (auto-increment)
- `from_currency`, `to_currency` (unique together, defaults to USD→GBP)
- `rate` (decimal with 6-digit precision)
- `last_updated` (timestamp)

## Development Workflow

### Making Schema Changes

1. Edit `src/db/schema.ts`
2. Generate migration:
   ```bash
   pnpm --filter @promptalicious/backend db:generate
   ```
3. Review generated SQL in `drizzle/<number>_<name>.sql`
4. Apply migration:
   ```bash
   pnpm --filter @promptalicious/backend db:migrate
   ```

### Viewing Database Contents

Use Drizzle Studio:
```bash
pnpm --filter @promptalicious/backend db:studio
```

Or use `psql`:
```bash
docker compose exec postgres psql -U postgres -d promptalicious
```

## Security Considerations

⚠️ **CRITICAL**: API keys are stored in the database (not `.env` files) to avoid accidental commits.

**This is ONLY secure if:**
- Database files/dumps are git-ignored (enforced in `.gitignore`)
- Docker volumes are not committed (`promptalicious_postgres-data`)
- `.env` file is git-ignored (enforced in `.gitignore`)

**Current approach**:
- API keys stored in plain text in `llm_config.api_key`
- Acceptable for local development tool (single-user)
- Database credentials secured via environment variables
- PostgreSQL running in Docker with local-only access

## Troubleshooting

### Migration Fails with "SASL: SCRAM-SERVER-FIRST-MESSAGE: client password must be a string"

**Cause**: `.env` file not loaded or `DATABASE_URL` not set.

**Solution**:
1. Ensure `.env` exists in `packages/backend/`
2. Verify `DATABASE_URL` is set correctly
3. Restart migration: `pnpm --filter @promptalicious/backend db:migrate`

### Cannot Connect to PostgreSQL

**Check if PostgreSQL is running**:
```bash
docker compose ps
```

**Restart PostgreSQL**:
```bash
docker compose restart postgres
```

**View PostgreSQL logs**:
```bash
docker compose logs postgres
```

### Migrations Table Already Exists

**Cause**: Migrations were previously applied.

**Solution**: This is normal! DrizzleORM tracks applied migrations in `__drizzle_migrations` table. Re-running `db:migrate` will only apply new migrations.

## Production Considerations

For production deployment:
1. Use managed PostgreSQL (AWS RDS, DigitalOcean, etc.)
2. Set `DATABASE_URL` via environment variable (not `.env` file)
3. Consider encrypting API keys at rest (add crypto layer)
4. Use connection pooling (already configured via `pg.Pool`)
5. Enable SSL connections (`?sslmode=require` in connection string)
6. Set up automated backups
7. Monitor connection pool metrics

## References

- [DrizzleORM Documentation](https://orm.drizzle.team/)
- [Drizzle Kit CLI](https://orm.drizzle.team/kit-docs/overview)
- [PostgreSQL Docker Image](https://hub.docker.com/_/postgres)
