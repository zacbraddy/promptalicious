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

### 2025-11-04: No Backend Framework (Yet)

**Context**: Backend package needs to exist for monorepo structure, but no API requirements specified yet.

**Decision**: Create backend package with TypeScript entry point, no web framework.

**Rationale**:
- Avoid framework lock-in until requirements are clear
- Simple executable entry point for future expansion
- Can add Express/Fastify/Hono when API needs are understood

**Alternatives Considered**:
- Express now: Premature - no API requirements yet
- NestJS: Heavy framework, inappropriate without clear need

**Future Decision Point**: When first API endpoint is specified, evaluate Express (minimal), Fastify (performance), or Hono (modern, edge-ready).

**Impact**: Backend package exists but minimal until feature specs define API requirements.

**Source**: spec 001-project-scaffold-i

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

## Active Decisions (Work in Progress)

<!--
Use this section during spec implementation to document emerging decisions.
Move to Decision Log above when finalized.
-->

*No active decisions at this time.*

---

**Last Updated**: 2025-11-04
**Next Review**: After next spec completion
