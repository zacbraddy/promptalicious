# promptalicious - Development Context

**Project**: Local development tool for debugging and iterating LLM prompts and tool configurations
**First Target**: Debug multistep, tool-enabled calls to GPT-4o-mini using Vercel AI SDK
**Last Updated**: 2025-11-07

---

## Quick Reference

### Project Mission

See `memory/program_overview.md` for complete vision and user value proposition.

**Summary**: Enable developers to configure, execute, and iterate on LLM calls with full diagnostic visibility, then translate working configurations into production code.

### Tech Stack (2025-11-03)

See `memory/development-protocols.md` for complete stack details and rationales.

- **Frontend**: TypeScript, React, Vite, Vitest
- **Backend**: Node.js (LTS), TypeScript, PostgreSQL
- **Tooling**: pnpm, Turbo, ESLint, Prettier, Husky
- **Target**: GPT-4o-mini + Vercel AI SDK (first iteration)

### Quality Gates

**MUST be run after every code change, before marking task complete:**

```bash
pnpm typecheck      # Zero errors
pnpm lint           # Zero errors/warnings (use pnpm lint:fix)
pnpm format:check   # All files formatted (if fails, run pnpm format then recheck)
pnpm test:ci        # All passing (or justified failures) - non-interactive mode
```

**Formatting protocol:**
- ALWAYS run `pnpm format:check` first
- If it fails, run `pnpm format` to fix, then run `pnpm format:check` again to verify
- Never skip format checking - it must pass before task completion

**Test execution protocol:**
- Development: `pnpm test` (interactive watch mode)
- Audits/CI: `pnpm test:ci` (non-interactive, use this for audits to avoid hanging)
- Per-package: `pnpm --filter <package> test:ci`

**TDD RED phase protocol:**
- When writing failing tests (RED phase) that reference not-yet-implemented code, TypeScript/ESLint errors are expected
- Add `eslint-disable` comments with TODO annotations for these expected errors:
  ```typescript
  // TODO: Remove eslint-disable once implementation is complete
  /* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
  vi.mocked(service.newFunction).mockResolvedValue(mockData);
  /* eslint-enable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
  ```
- During GREEN phase (implementation), remove these comments as the implementation makes the errors go away
- This allows tests to pass quality gates in RED phase whilst maintaining type safety once implemented
- Never disable errors for production code - only for tests referencing mocked implementations

### Before Any Code Work - MCP Activation Checklist

**MANDATORY FIRST STEPS**:
1. ✅ Serena available? → Call `mcp__serena__initial_instructions`
2. ✅ Need framework docs? → Use Context7 MCP (`mcp__context7__resolve-library-id` then `mcp__context7__get-library-docs`)

**Why this matters**:
- **Serena**: Semantic code analysis prevents wasteful file reads, enables symbolic editing
- **Context7**: Latest documentation prevents guessing at APIs

### Import Path Protocol

**CRITICAL**: ALWAYS use the `@` alias for imports when it reduces path length.

**Why**:
- Improves readability and maintainability
- Prevents brittle relative path chains (../../..)
- Makes refactoring easier (paths don't break when files move)

**Examples**:
```typescript
// Correct ✅
import app from "@/app";
import { ConfigurationResponse } from "@promptalicious/shared-infra";

// Wrong ❌
import app from "../../src/app";
import { ConfigurationResponse } from "../../shared-infra/src/types/api";
```

**Path alias configuration**:
- `@/` → Resolves to `src/` directory in current package
- `@promptalicious/*` → Workspace packages

**Configuration**:
- `tsconfig.json`: Configured with `"@/*": ["./src/*"]`
- `vitest.config.ts`: Configured with resolve.alias in both root and project levels
- All environments now support the `@/` alias ✅

### Backend File Naming Convention

**CRITICAL**: All backend package files MUST follow kebab-case naming with type-specific suffixes.

**Pattern**: `<module-name>.<implementation-type>.([test|integration|contract]).ts`

**Suffix Types**:
- `.service.ts` - Service layer files (e.g., `config.service.ts`, `llm.service.ts`)
- `.route.ts` - API route handlers (e.g., `execute.route.ts`, `config.route.ts`)
- `.middleware.ts` - Express/Hono middleware (e.g., `error-handler.middleware.ts`)
- `.schema.ts` - Database schema definitions (e.g., `pricing.schema.ts`, `llm-config.schema.ts`)
- `.test.ts` - Unit tests (e.g., `config.service.test.ts`)
- `.integration.ts` - Integration tests (e.g., `execute-abort.integration.test.ts`)
- `.contract.ts` - Contract tests (e.g., `config-get.contract.test.ts`)
- `.e2e.ts` - End-to-end tests (future use)

**Examples**:
```typescript
// Services
src/services/config.service.ts
src/services/cost-calculation.service.ts
src/services/discovery-status.service.ts

// Routes
src/routes/config.route.ts
src/routes/project-configuration.route.ts

// Middleware
src/middleware/error-handler.middleware.ts

// Schemas
src/db/schema/llm-config.schema.ts
src/db/schema/pricing.schema.ts

// Tests
tests/unit/config.service.test.ts
tests/unit/cost-calculation.service.edge-cases.test.ts
tests/integration/execute-abort.integration.test.ts
tests/contract/config-get.contract.test.ts
```

**Why**:
- Consistent kebab-case improves readability and Unix-friendliness
- Type suffixes make file purpose immediately clear
- Test suffixes enable precise test targeting
- Reduces cognitive load when navigating codebase

### Package Installation Protocol

**CRITICAL**: When adding new packages, ALWAYS use `pnpm add <package>@latest` instead of manually editing package.json.

**Why**:
- Verifies package exists in npm registry
- Ensures latest version is installed
- Prevents outdated dependencies from being introduced

**Examples**:
```bash
# Correct ✅
pnpm --filter @promptalicious/backend add -D typescript@latest
pnpm add -D eslint@latest  # Root level

# Wrong ❌
# Manually adding "typescript": "^5.9.3" to package.json
```

**Check for outdated packages regularly**:
```bash
pnpm outdated -r  # Shows outdated packages across workspace
```

### DrizzleORM Migration Protocol

**CRITICAL**: DrizzleORM migrations MUST NEVER be modified manually. ONLY use drizzle-kit commands.

**FORBIDDEN ❌**:
- Directly editing migration SQL files
- Manually renaming migration files
- Manually deleting migration files
- Manually creating migration files
- Any direct file system operations on the `drizzle/` directory

**REQUIRED ✅**:
- ALWAYS use `drizzle-kit generate` to create migrations
- ALWAYS use `--name` flag for descriptive migration names
- ALWAYS use `drizzle-kit drop` to remove migrations (if needed)
- NEVER touch migration files or the drizzle/meta directory directly

**Why this matters**:
- DrizzleORM maintains internal metadata in `drizzle/meta/`
- Manual changes break migration tracking and database sync
- Breaking Drizzle's internal state can corrupt your migration history

**Correct workflow**:
```bash
# Generate migration with descriptive name
pnpm exec drizzle-kit generate --name=initial_schema
pnpm exec drizzle-kit generate --name=add_user_roles
pnpm exec drizzle-kit generate --name=add_pricing_cache

# If you need to remove a migration (BEFORE applying it)
pnpm exec drizzle-kit drop  # Interactive selection

# Apply migrations
pnpm exec drizzle-kit push   # For development
pnpm exec drizzle-kit migrate  # For production
```

**Wrong workflow ❌**:
```bash
# DO NOT DO THIS
rm packages/backend/drizzle/0000_bad_name.sql
mv packages/backend/drizzle/0000_old.sql packages/backend/drizzle/0000_new.sql
nano packages/backend/drizzle/0000_something.sql
```

### Privacy & Open Source Protocol

**CRITICAL**: This is an open-source project. All files checked into this repository MUST NOT contain:

❌ **FORBIDDEN in committed files**:
- Personal names or identifying information
- Absolute file paths revealing machine architecture
- References to other projects on the developer's machine
- Workplace names or employer details
- Local machine usernames or directory structures
- Any personally identifiable information (PII)

✅ **ALLOWED**:
- Generic example paths: `/path/to/project`, `~/projects/app`
- Role-based references: "the developer", "users", "team"
- Generic locations: "local machine", "development environment"

**When documenting**:
- Use relative paths from repository root (e.g., `specs/002-make-a-call/`)
- Use placeholders for examples (e.g., `<username>`, `<project-name>`)
- Sanitise any copy-pasted content before committing

### Key Principles (from Constitution v1.1.0)

See `memory/constitution.md` for complete principles and governance.

1. **Visibility Above All** - Everything observable, no silent failures
2. **Good Architecture Without Cargo-Culting** - DDD/Onion where they solve problems
3. **Focused Flexibility** - Build for GPT-4o-mini now, design for extension
4. **Dolphin-Based Development** - Surface working software frequently (5-task max)

---

## Documentation Structure

Extract Location: docs/{topic}.md
Best for: Most projects, straightforward organisation
Usage: Detailed guides (>50 lines) → docs/feature-name.md, summaries stay in CLAUDE.md

---

## Active Spec Progress

**Current Spec**: 002-make-a-call (LLM Prompt Execution & Diagnostics Interface) ✅
**Status**: Feature complete, ready for version bump and next specification

**Completed Features**:
- Full-stack LLM prompt execution with GPT-4o-mini via Vercel AI SDK
- Settings page for API key configuration and connection testing
- Prompt execution page with abort capability and status polling
- Comprehensive diagnostics display (tokens, timing, cost in GBP)
- Error classification and display for all failure modes
- Pricing data system with staleness detection (>7 days)
- Page refresh recovery (execution state preserved during reload)
- Retrofuturistic dark theme (shadcn/ui + Tailwind)

**Next Steps**:
1. Complete version increment to 0.2.0 (T079)
2. Run `/specify` to create next feature specification

---

## Recent Changes

1. **2025-11-07**: Knowledge coalesced from spec 002-make-a-call
   - Moved spec knowledge to memory/development-protocols.md (implementation decisions, architectural patterns, frontend/backend patterns, security considerations)
   - Moved constitutional compliance analysis to memory/constitution.md
   - Created docs/api/api-contracts.md (complete API reference)
   - Reduced CLAUDE.md from 266 to ~220 lines

2. **2025-11-07**: Completed spec 002-make-a-call (see memory/development-protocols.md § Feature Completion History)

3. **2025-11-04**: Knowledge coalesced from spec 001-project-scaffold-i

4. **2025-11-03**: Constitution v1.1.0 ratified

---

## Notes & Reminders

- Always use Context7 BEFORE guessing package APIs
- Always call `mcp__serena__initial_instructions` if Serena available
- Surface after EVERY task (testing instructions or deferral explanation)
- Right-size tests (current task only, not future features)
- Patterns MUST justify existence with concrete benefits
- This is a debugging tool - visibility is paramount

---

**Last Updated**: 2025-11-07 (spec 002-make-a-call complete)
**Next Coalesce**: After next spec completion (>90% tasks) or if CLAUDE.md exceeds 800 lines

---

## For Complete Context

See memory files for detailed information:
- `memory/constitution.md` - v1.1.0 (core principles, governance, spec 002 compliance)
- `memory/development-protocols.md` - Tech stack, patterns, quality standards, spec 002 decisions
- `memory/program_overview.md` - Business context, vision, target audience
- `memory/task-execution-patterns.md` - Workflow, quality gates, debugging protocols
- `docs/architectural-decisions.md` - Significant architectural decisions with rationales
- `docs/api/api-contracts.md` - Complete backend API reference (spec 002)
