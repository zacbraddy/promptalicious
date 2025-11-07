# Architectural Decisions

This document tracks significant architectural and implementation decisions made during promptalicious development.

For complete technical context, see:
- `memory/constitution.md` - Core principles
- `memory/development-protocols.md` - Tech stack and patterns
- `memory/task-execution-patterns.md` - Workflow and quality gates

---

## Decision Log

### 2025-11-04: Monorepo Structure with pnpm + Turbo

**Context**: Need to organise code for frontend (React/Vite), backend (Node.js/TypeScript), and shared infrastructure (configs).

**Decision**: Monorepo with pnpm workspaces and Turbo orchestration.

**Rationale**:
- Enables code sharing (types, configs, utilities)
- Single dependency lock file
- Coordinated builds and tests
- Consistent tooling across packages

**Alternatives Considered**:
- Separate repositories: Rejected due to type sharing complexity and version coordination overhead
- npm/yarn workspaces without Turbo: Rejected due to lack of intelligent caching and slower builds

**Impact**: All packages live in `packages/` directory, root-level tasks coordinate multi-package operations.

**Source**: spec 001-project-scaffold-i

---

### 2025-11-04: Shared Infrastructure Package Pattern

**Context**: TypeScript, ESLint, and Prettier configurations need to be consistent across frontend/backend packages.

**Decision**: Create `@promptalicious/shared-infra` package that exports configuration factories.

**Rationale**:
- Single source of truth for tooling configs
- Changes propagate automatically to dependent packages
- Avoids configuration drift
- Standard pattern in modern monorepos

**Implementation**:
- TypeScript: Base `tsconfig.json` extended by packages
- ESLint: Factory function (`createEslintConfig`) with options for frontend/backend variants
- Prettier: Default configuration (no customisation needed initially)

**Alternatives Considered**:
- Root-level configs with extends: Less explicit about dependencies
- Duplicate configs per package: Maintenance nightmare, guaranteed drift

**Impact**: Adding new packages requires importing from `@promptalicious/shared-infra` and calling config factories.

**Source**: spec 001-project-scaffold-i

---

### 2025-11-04: Hono as Backend API Framework

**Context**: Backend needs web framework for REST API endpoints (configuration, LLM execution, pricing data).

**Decision**: Use Hono v4 as the backend API framework.

**Rationale**:
- **Exceptional TypeScript support**: Type-safe routing, context, and middleware out of the box
- **Modern design**: Clean API, method chaining, intuitive patterns
- **Performance**: One of the fastest Node.js frameworks
- **Minimal dependencies**: Lightweight, aligns with "no cargo-culting" principle
- **Built-in middleware**: CORS, logger, error handling included
- **Future-ready**: Works on Node.js, Bun, Deno, Cloudflare Workers (if we ever need edge deployment)

**Alternatives Considered**:
- **Fastify**: More mature ecosystem but heavier, JSON Schema validation less TypeScript-native
- **Express**: De facto standard but poor TypeScript support, older callback-based patterns
- **NestJS**: Full framework overkill for our simple API needs

**Implementation**:
- `app.ts`: Hono app with CORS, logging, error handling middleware
- `index.ts`: Server entry point using `@hono/node-server`
- Health check endpoint: `GET /health` returns status + timestamp

**Impact**: All API endpoints use Hono routing patterns. Middleware composition follows Hono conventions.

**Source**: Task T006 (spec 002-make-a-call), research.md preliminary recommendation validated during implementation

---

### 2025-11-03: Pragmatic TDD Workflow

**Context**: Need testing discipline without dogmatic TDD that creates friction.

**Decision**: RED-GREEN-REFACTOR on tight loops (per-task), right-sized test suites, real dependencies.

**Rationale**:
- Traditional TDD (all tests upfront) creates delays and speculation
- Per-task RED-GREEN-REFACTOR keeps cycles fast
- Right-sized tests avoid writing tests for code that doesn't exist yet
- Real dependencies (real Postgres, real LLM calls with fixtures) catch integration issues early

**Test Hierarchy**:
1. Contract tests (API shape)
2. Integration tests (real dependencies, user workflows)
3. End-to-end tests (full system)
4. Unit tests (complex logic, edge cases)

**Forbidden**:
- Writing 20+ tests before implementation
- Skipping tests to "fix" failures
- Implementing before writing failing test

**Impact**: All feature development follows this workflow. Infrastructure specs (configs, tooling) use validation scenarios instead.

**Source**: Constitution v1.1.0

---

### 2025-11-03: Dolphin-Based Development Principle

**Context**: Need to surface working software frequently to validate direction.

**Decision**: After EVERY task, provide testing instructions OR deferral explanation. Never go 5+ tasks without something runnable.

**Rationale**:
- Prevents "heads-down coding" that goes wrong direction
- Gives stakeholders confidence we're on track
- Enables early course correction

**Implementation**:
- Testing instructions: Exact commands to run/test new capability
- Deferral explanation: Why not testable yet, which task will make it testable

**Unacceptable Deferrals**: "I'll show you when done", "Just trust me", "Would require scaffolding"

**Impact**: Every task completion includes demo-ability or explicit justification for deferral.

**Source**: Constitution v1.1.0

---

## Decision Template

Use this template for future decisions:

```markdown
### YYYY-MM-DD: Decision Title

**Context**: What problem are we solving?

**Decision**: What did we decide?

**Rationale**: Why this approach?

**Alternatives Considered**:
- Option A: Rejected because...
- Option B: Rejected because...

**Impact**: What changes for developers/codebase?

**Source**: Which spec/document drove this decision?
```

---

### 2025-11-04: Centralised Configuration Pattern

**Context**: Backend needs to access environment variables (port, database URL, API keys, etc.) in a consistent, testable way across all modules.

**Decision**: All environment variable access goes through a centralised `config/index.ts` module that exports a typed configuration object.

**Rationale**:
- **Single source of truth**: All environment variables documented in one place
- **Type safety**: Configuration object is fully typed, IDE autocomplete works
- **Testability**: Easy to mock configuration in tests by importing and overriding config object
- **Validation**: Environment variable parsing and validation happens once at startup
- **Documentation**: New developers can see all required/optional env vars in one file
- **No scattered `process.env` calls**: Eliminates bugs from typos in environment variable names

**Implementation**:
```typescript
// config/index.ts
export const config = {
  server: {
    port: Number(getEnvVar("PORT", "3000")),
  },
  database: {
    url: getEnvVar("DATABASE_URL", "postgresql://..."),
  },
  // ... other config sections
} as const;

// Other files import config instead of using process.env directly
import { config } from './config/index.js';
const port = config.server.port; // Not: process.env.PORT
```

**Alternatives Considered**:
- Direct `process.env` access throughout codebase: Rejected due to lack of type safety, scattered validation, difficult to test
- Environment validation libraries (envalid, zod-env): Good option but overkill for current needs, can migrate later if validation complexity grows
- Per-module config files: Rejected due to fragmentation, harder to see full picture

**Impact**:
- All new environment variables MUST be added to `config/index.ts` with appropriate defaults and validation
- Code MUST import from `config/index.ts` instead of accessing `process.env` directly
- Benefits compound over time as configuration complexity grows

**Source**: Task T006 (spec 002-make-a-call) - discovered during Hono setup when port configuration was initially using `process.env.PORT` directly

---

## Active Decisions (Work in Progress)

<!--
Use this section during spec implementation to document emerging decisions.
Move to Decision Log above when finalized.
-->

*No active decisions at this time.*

---

**Last Updated**: 2025-11-04
**Next Review**: After next spec completion
