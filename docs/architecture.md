# Architecture Overview

This document provides a high-level view of how promptalicious is structured as of v0.2.0. For detailed implementation decisions and rationales, see [architectural-decisions.md](architectural-decisions.md).

---

## System Context

promptalicious is a **local-only development tool** designed to run on a developer's machine. It's a full-stack web application that executes LLM prompts and displays comprehensive diagnostics.

```
┌─────────────┐
│  Developer  │
└──────┬──────┘
       │
       │ Uses browser to interact
       │
       v
┌──────────────────────────────────────────┐
│         promptalicious (localhost)        │
│                                           │
│  ┌──────────┐         ┌───────────────┐  │
│  │ Frontend │◄───────►│    Backend    │  │
│  │  (Vite)  │   HTTP  │    (Hono)     │  │
│  └──────────┘         └───────┬───────┘  │
│                               │          │
│                               v          │
│                       ┌───────────────┐  │
│                       │  PostgreSQL   │  │
│                       │   Database    │  │
│                       └───────────────┘  │
└────────────────┬──────────────────────────┘
                 │
                 │ HTTP API calls
                 │
                 v
        ┌────────────────────┐
        │   OpenAI API       │
        │  (GPT-4o-mini)     │
        └────────────────────┘
```

---

## Monorepo Structure

promptalicious uses a pnpm workspace monorepo with three packages:

```
packages/
├── frontend/          # React frontend application
├── backend/           # Node.js API server
└── shared-infra/      # Shared TypeScript/ESLint/Prettier configs
```

**Why a monorepo?**
- Share TypeScript types between frontend and backend
- Single source of truth for configuration
- Coordinated builds and testing
- Simplified dependency management

See [architectural-decisions.md](architectural-decisions.md#2025-11-04-monorepo-structure-with-pnpm--turbo) for the full rationale.

---

## Frontend Architecture

**Tech stack**: React, TypeScript, Vite, TanStack Query, Tailwind CSS, shadcn/ui

The frontend is a single-page application with two main views: Settings and Prompt execution.

### Component Structure

```
src/
├── api/               # HTTP client (Axios)
│   └── client.ts      # Centralised API calls
├── hooks/             # React hooks (TanStack Query)
│   ├── useConfiguration.ts
│   ├── usePromptExecution.ts
│   └── usePricingInfo.ts
├── components/        # UI components
│   ├── ui/            # shadcn/ui components
│   ├── ErrorDisplay.tsx
│   ├── ExecuteControls.tsx
│   ├── ResponseDisplay.tsx
│   └── ...
├── pages/             # Top-level page components
│   ├── Settings.tsx
│   └── Prompt.tsx
└── App.tsx            # Router + layout
```

### Data Flow Pattern

Frontend follows a consistent data flow pattern:

```
User Action → Component → Hook (TanStack Query) → API Client (Axios) → Backend
                  ↑                                                         ↓
                  └─────────── State Update ◄──────────────────────────────┘
```

**Key points:**
- **API Client** (`api/client.ts`): All HTTP calls go through centralised Axios client
- **Hooks** (`hooks/*.ts`): TanStack Query hooks for server state management
- **Components**: React components consume hooks, display data, trigger mutations

**Why TanStack Query?**
- Automatic caching and refetching
- Built-in loading/error states
- Optimistic updates
- Request deduplication
- Polling support (used for execution status)

See [memory/development-protocols.md](../memory/development-protocols.md) for the TanStack Query addition rationale.

### State Management

- **Server state**: TanStack Query (configuration, execution status, pricing)
- **UI state**: React hooks (`useState`, `useEffect`)
- **No global state management library** (not needed for current complexity)

---

## Backend Architecture

**Tech stack**: Node.js, TypeScript, Hono, PostgreSQL, Drizzle ORM, Vercel AI SDK

The backend follows **Domain-Driven Design (DDD)** and **Onion Architecture** principles, adapted pragmatically for the current codebase size. As the application grows, we maintain clear separation of concerns:

- **Routes** handle HTTP concerns (request/response, validation)
- **Services** contain business logic (LLM calls, pricing calculations)
- **Database** is accessed only through services (never directly from routes)
- **Dependencies point inward** (services don't know about HTTP layer)

This pragmatic approach gives us good architecture without cargo-culting enterprise patterns we don't need yet.

### Directory Structure

```
src/
├── config/              # Environment configuration
│   └── index.ts         # Centralised config (DATABASE_URL, PORT, etc.)
├── db/                  # Database management
│   ├── schema.ts        # Drizzle schema definitions
│   └── migrate.ts       # Migration runner
├── lib/                 # Shared utilities
│   └── logger.ts        # Pino logger configuration
├── middleware/          # Hono middleware
│   └── errorHandler.ts  # Global error handling
├── routes/              # API endpoints
│   ├── config.ts        # GET/PUT /api/config, POST /api/config/test-connection
│   ├── execute.ts       # POST /api/execute, GET /api/execute/status, POST /api/execute/cancel
│   └── pricing.ts       # GET /api/pricing
├── services/            # Business logic
│   ├── configService.ts
│   ├── llmService.ts
│   ├── pricingService.ts
│   └── exchangeRateService.ts
├── app.ts               # Hono app setup (CORS, routes, error handling)
└── index.ts             # Server entry point
```

### Request Flow

```
HTTP Request
    ↓
Hono Routing (app.ts)
    ↓
Route Handler (routes/*.ts)
    ↓
Service Layer (services/*.ts)
    ↓
Database (Drizzle ORM) or External API (Vercel AI SDK, Frankfurter API)
    ↓
Response
    ↓
Error Handler (if error occurs)
```

### Key Patterns

**Centralised Configuration** (`config/index.ts`):
- Single source of truth for all environment variables
- Type-safe configuration object
- Defaults for local development

**Service Layer** (`services/*.ts`):
- Business logic separated from HTTP concerns
- Services handle LLM calls, database access, pricing lookups
- No direct database access from route handlers

**Error Handling** (`middleware/errorHandler.ts`):
- Global error handler catches all errors
- Maps errors to appropriate HTTP status codes
- Classifies errors by type (authentication, validation, network, etc.)

**Why Hono?**
- Excellent TypeScript support
- Modern, clean API
- Fast and lightweight
- Future-proof (works on Node, Bun, Deno, edge runtimes)

See [architectural-decisions.md](architectural-decisions.md#2025-11-04-hono-as-backend-api-framework) for the full rationale.

---

## Database Schema

promptalicious uses PostgreSQL with Drizzle ORM for type-safe database access.

**Current tables:**

```sql
-- Configuration (singleton)
configurations {
  id            SERIAL PRIMARY KEY,
  provider      TEXT NOT NULL,
  api_key       TEXT NOT NULL,
  model         TEXT NOT NULL,
  created_at    TIMESTAMP NOT NULL,
  updated_at    TIMESTAMP NOT NULL
}

-- Pricing cache
pricing_data {
  id                    SERIAL PRIMARY KEY,
  model_identifier      TEXT NOT NULL,
  provider              TEXT NOT NULL,
  cost_per_input_token  NUMERIC NOT NULL,
  cost_per_output_token NUMERIC NOT NULL,
  currency              TEXT NOT NULL,
  fetched_at            TIMESTAMP NOT NULL,
  source                TEXT NOT NULL
}

-- Exchange rates (USD → GBP)
exchange_rates {
  id              SERIAL PRIMARY KEY,
  from_currency   TEXT NOT NULL,
  to_currency     TEXT NOT NULL,
  rate            NUMERIC NOT NULL,
  fetched_at      TIMESTAMP NOT NULL,
  source          TEXT NOT NULL
}
```

**Migration Management**: All schema changes go through DrizzleORM migrations. 
**Never modify migration files manually**—use `drizzle-kit generate` to create migrations. Migrations run automatically on server startup via the `predev` script.

---

## External Integrations

### LLM Providers

Currently supports OpenAI GPT-4o-mini via **Vercel AI SDK**.

**Why Vercel AI SDK?**
- Model-agnostic abstraction (easy to add more providers later)
- Streaming support
- Tool/function calling support (future use)
- TypeScript-first design
- Active maintenance

**Integration point**: `services/llmService.ts`

### Pricing Data

Pricing data comes from **hardcoded model pricing** (OpenAI published rates) and **Frankfurter API** for USD→GBP exchange rates.

**Flow:**
1. Backend fetches pricing data on startup
2. Caches in `pricing_data` and `exchange_rates` tables
3. Frontend displays staleness warning if pricing is >7 days old
4. Falls back to cached data if live fetch fails

**Integration point**: `services/pricingService.ts`, `services/exchangeRateService.ts`

---

## Testing Strategy

promptalicious follows a pragmatic testing philosophy (see [memory/development-protocols.md](../memory/development-protocols.md) for full details):

### Test Structure

- **Backend**: Contract tests (API shapes) + Unit tests (business logic, error handling)
- **Frontend**: Component tests + Integration tests (user workflows with mocked API)
- **Database**: Migrations tested for integrity

### Current Coverage

- **Backend**: 36 tests covering all routes, error handling, LLM service logic
- **Frontend**: 197 tests covering components, hooks, integration workflows
- **Total**: All quality gates passing

**Philosophy**: Right-sized tests that catch real bugs without over-specifying implementation details.

---

## Quality Gates

Every PR must pass:

```bash
pnpm typecheck      # Zero TypeScript errors
pnpm lint           # Zero ESLint errors/warnings
pnpm format:check   # All files formatted correctly
pnpm test:ci        # All tests passing
```

These run automatically via GitHub Actions on every PR.

---

## Security Model

**Threat model**: Single-user local development environment

**Key assumptions:**
- Application runs on trusted developer machine
- Only localhost access (no network exposure)
- Developer responsible for protecting their own API keys
- No multi-user authentication needed

**Security measures:**
- API keys stored in local PostgreSQL (not version control)
- CORS configured for localhost only
- Input validation on all API endpoints
- Error messages reveal details (visibility > obscurity for debugging)

**What's NOT included** (by design):
- Multi-user authentication
- API key encryption at rest
- Rate limiting
- CSRF protection

See [SECURITY.md](../SECURITY.md) for the full security policy.

---

## Performance Considerations

**Current optimisations:**
- TanStack Query caching reduces redundant API calls
- Database connection managed by Drizzle
- Pricing data cached and refreshed on startup
- Frontend builds optimised with Vite

**Not optimised** (yet, and possibly never needed):
- No CDN or asset caching (local tool, not needed)
- No request batching (request volume is low)
- No horizontal scaling (single-user, runs locally)

---

## For More Details

- **Why these tech choices?** → [memory/development-protocols.md](../memory/development-protocols.md)
- **How to set up locally?** → [development-setup.md](development-setup.md)
- **What are the core principles?** → [memory/constitution.md](../memory/constitution.md)
- **Specific architectural decisions?** → [architectural-decisions.md](architectural-decisions.md)

---

**Last Updated**: 2025-11-07
**Status**: Reflects state at v0.2.0
