# Development Protocols

**Last Updated**: 2025-11-04
**Source**: Consolidated from CLAUDE.md and spec 001-project-scaffold-i

This document captures technical standards, patterns, and technology decisions for promptalicious.

---

## Tech Stack

**Frontend**:
- TypeScript (latest, strict mode)
- React (latest)
- Vite (latest) - build tool and dev server
- Vitest (latest) - testing framework

**Backend**:
- Node.js (latest LTS)
- TypeScript (latest, strict mode)
- PostgreSQL (latest) - database

**Tooling**:
- pnpm (latest) - package manager with workspaces
- Turbo (latest) - monorepo build orchestration
- ESLint (latest) - linting
- Prettier (latest) - formatting
- Husky (latest) - git hooks

**Target Platform**: GPT-4o-mini + Vercel AI SDK (first iteration)

**Established**: 2025-11-03

---

## Repository Structure

**Decision**: Monorepo with pnpm workspaces and Turbo orchestration

**Pattern** (Web application structure):
```
packages/shared-infra/  - Shared configuration package
packages/frontend/      - React + Vite frontend
packages/backend/       - Node.js + TypeScript backend
Root-level orchestration via pnpm + Turbo
```

**Rationale**:
- Enables code sharing (types, configs, utilities)
- Single dependency lock file
- Coordinated builds and tests
- Consistent tooling across packages

**Source**: spec 001-project-scaffold-i (plan.md lines 103-141)
**Established**: 2025-11-04

---

## Package Manager - pnpm

**Decision**: Use pnpm with workspaces for monorepo management

**Rationale**:
- Efficient disk space usage via content-addressable storage
- Strict dependency resolution prevents phantom dependencies
- Native workspace support with simple configuration
- Fast installation times compared to npm/yarn
- Well-established in modern TypeScript ecosystems

**Alternatives Considered**:
- npm workspaces: More universal but slower and less strict
- yarn workspaces: Good but pnpm has better performance and strictness
- lerna: Legacy approach, superseded by modern workspace solutions

**Implementation Details**:
- Workspace packages defined in root `pnpm-workspace.yaml`
- Use `workspace:*` protocol for internal dependencies
- Single `pnpm-lock.yaml` at repository root
- Use `.npmrc` to configure pnpm behaviour (strict-peer-dependencies, etc.)

**Source**: spec 001-project-scaffold-i (research.md Decision 1)
**Established**: 2025-11-04

---

## Build Orchestration - Turbo

**Decision**: Use Turbo for multi-package task orchestration

**Rationale**:
- Intelligent caching of task outputs across packages
- Parallel execution with dependency-aware scheduling
- Simple configuration via `turbo.json`
- Excellent DX for monorepo builds and test runs
- Well-maintained by Vercel

**Alternatives Considered**:
- nx: More feature-rich but heavier, overkill for this project
- lerna: Primarily for publishing, limited build orchestration
- Custom scripts: Would require significant boilerplate and lack caching

**Implementation Details**:
- Root `turbo.json` defines pipeline tasks
- Tasks run in dependency order automatically
- Cache outputs for `build`, `typecheck`, `lint` tasks
- No caching for `dev` (long-running) or `test` (non-deterministic possible)
- Use `--parallel` for dev servers (no dependency ordering needed)

**Source**: spec 001-project-scaffold-i (research.md Decision 2)
**Established**: 2025-11-04

---

## Configuration Sharing Pattern

**Decision**: Create `@promptalicious/shared-infra` package for centralised tooling configuration

**Rationale**:
- Single source of truth for TypeScript, ESLint, Prettier configs
- Changes propagate automatically to dependent packages
- Avoids configuration drift across packages
- Standard pattern in modern monorepos

**Alternatives Considered**:
- Root-level configs with extends: Workable but less explicit about dependencies
- Duplicate configs per package: Maintenance nightmare, guaranteed drift

**Implementation Details**:
- Package exports factory functions for ESLint (with options for frontend/backend variants)
- Package exports base Prettier config as JSON (if deviating from defaults)
- TypeScript config uses standard extends mechanism
- Frontend/backend import and configure with package-specific options
- Package name scoped to avoid npm namespace collisions

**Config Sharing Pattern** (based on ESLint flat config + Prettier best practices):
```typescript
// shared-infra exports
export { createEslintConfig } from './eslint/createEslintConfig.js'
export { baseEslintConfig } from './eslint/base.config.js'
export { frontendEslintConfig } from './eslint/frontend.config.js'

// consuming packages
import { createEslintConfig } from '@promptalicious/shared-infra'
export default createEslintConfig({
  tsconfigRootDir: import.meta.dirname,
  isFrontend: true,
  ignores: ['./specific-file.ts']
})
```

**Source**: spec 001-project-scaffold-i (research.md Decision 3)
**Established**: 2025-11-04

---

## Frontend Stack - React + Vite

**Decision**: Use React with Vite as build tool and dev server

**Rationale**:
- React is project requirement (from constitution)
- Vite provides fast HMR and modern ESM-based dev experience
- Native TypeScript support without additional configuration
- Vitest integration for consistent testing story

**Alternatives Considered**:
- Webpack: Slower, more configuration required
- Next.js: Overkill for tool UI, introduces framework opinions

**Implementation Details**:
- Vite config at `packages/frontend/vite.config.ts`
- Dev server on port 5173 (Vite default)
- Vitest for unit/integration tests

**Source**: spec 001-project-scaffold-i (research.md Decision 4)
**Established**: 2025-11-04

---

## Frontend State Management - TanStack Query

**Decision**: Use TanStack Query (React Query) for all server state management

**Rationale**:
- Server state (API calls, caching) is fundamentally different from UI state
- Eliminates boilerplate for loading/error states
- Automatic request deduplication and caching
- Optimistic updates and background refetching
- Type-safe mutations and queries

**When to Use TanStack Query**:
- **ALWAYS** for API calls (GET, POST, PUT, DELETE, etc.)
- **ALWAYS** for any backend data fetching
- **NEVER** bypass with direct `fetch` or `axios` calls in components

**Architecture Pattern**:
```
packages/frontend/src/
├── services/
│   └── apiClient.ts          # Axios/fetch wrappers (low-level)
├── hooks/
│   └── useConfig.ts           # TanStack Query hooks (high-level)
└── components/
    └── SettingsForm.tsx       # Uses hooks via props from parent
```

**Implementation Pattern**:

1. **API Client Layer** (`services/apiClient.ts`):
   - Pure functions that return promises
   - No React dependencies
   - Handle HTTP details (headers, error mapping)
   ```typescript
   export async function getConfig(): Promise<ConfigurationResponse> {
     const response = await apiClient.get<ConfigurationResponse>("/config");
     return response.data;
   }
   ```

2. **Hook Layer** (`hooks/useConfig.ts`):
   - Wraps API client functions with TanStack Query
   - Defines query keys for caching
   - Handles invalidation and optimistic updates
   ```typescript
   export function useGetConfig() {
     return useQuery<ConfigurationResponse>({
       queryKey: ["config"],
       queryFn: getConfig,
     });
   }

   export function useUpdateConfig() {
     const queryClient = useQueryClient();
     return useMutation<SuccessResponse, Error, UpdateRequest>({
       mutationFn: updateConfig,
       onSuccess: () => {
         void queryClient.invalidateQueries({ queryKey: ["config"] });
       },
     });
   }
   ```

3. **Page/Container Component** (e.g., `pages/SettingsPage.tsx`):
   - Uses TanStack Query hooks
   - Handles success/error at container level
   - Passes mutation functions down to child components
   ```typescript
   export function SettingsPage() {
     const { data, isLoading } = useGetConfig();
     const updateMutation = useUpdateConfig();

     return <SettingsForm onSubmit={updateMutation.mutateAsync} />;
   }
   ```

4. **Presentation Component** (e.g., `components/SettingsForm.tsx`):
   - Receives mutation functions as props
   - Does NOT import hooks or API client directly
   - Handles UI-specific logic (form validation, local state)
   - Calls mutation via props
   ```typescript
   interface SettingsFormProps {
     onSubmit: (data: FormData) => Promise<void>;
     isSubmitting: boolean;
   }
   ```

**Error Handling Pattern**:

**CORRECT** ✅ - Handle errors in mutation callbacks:
```typescript
// In page component
const updateMutation = useUpdateConfig();

const handleSubmit = async (data: FormData) => {
  try {
    await updateMutation.mutateAsync(data);
    toast.success("Saved successfully");
  } catch (error) {
    // Error already handled by TanStack Query
    // Just show user feedback
    toast.error(error.message);
  }
};
```

**WRONG** ❌ - Don't import API client in components:
```typescript
// In component
import { updateConfig } from "@/services/apiClient";

const handleSubmit = async () => {
  await updateConfig(data); // Bypasses TanStack Query!
};
```

**Query Key Conventions**:
- Use arrays for hierarchical keys: `["config"]`, `["users", userId]`
- Export constants for reuse: `const CONFIG_QUERY_KEY = ["config"] as const`
- Group related queries: `["pricing", "current"]`, `["pricing", "history"]`

**Mutation Side Effects**:
- Use `onSuccess` to invalidate related queries
- Use `onError` for global error handling
- Use `onSettled` for cleanup (loading states, etc.)

**Provider Setup**:
- QueryClient configured in `App.tsx`
- Set sensible defaults (staleTime, cacheTime, retry logic)
- Use React Query DevTools in development

**Source**: Established pattern from spec 002-make-a-call implementation
**Established**: 2025-01-06

---

## Backend Stack - Node.js + TypeScript

**Decision**: Use Node.js LTS with TypeScript, no framework initially

**Rationale**:
- Constitution specifies Node.js + TypeScript
- No API requirements in scaffold spec (future specs will determine needs)
- Avoid framework lock-in until requirements are clear
- Simple executable entry point for future expansion

**Alternatives Considered**:
- Express/Fastify now: Premature - no API requirements yet
- NestJS: Heavy framework, inappropriate without clear need

**Future Options** (when API requirements are clear):
- Express (minimal)
- Fastify (performance)
- Hono (modern, edge-ready)

**Implementation Details**:
- Entry point: `packages/backend/src/index.ts`
- Compiled output: `packages/backend/dist/`
- Dev mode: `tsx watch` for hot reload
- Testing: Vitest for consistency with frontend

**Source**: spec 001-project-scaffold-i (research.md Decision 5)
**Established**: 2025-11-04

---

## TypeScript Configuration

**Decision**: Three-tier tsconfig hierarchy via extends

**Hierarchy**:
```
shared-infra/tsconfig.json (base - strict mode, lib, target)
  ↑
  ├─ frontend/tsconfig.json (jsx, paths, outDir)
  └─ backend/tsconfig.json (node types, paths, outDir)
```

**Rationale**:
- Base config in shared-infra establishes strict mode and common options
- Package-level configs add path mappings and output directories
- Avoids duplication while allowing package-specific needs

**Best Practices**:
- Enable `strict` mode in base config
- Use `paths` for clean import aliases (`@/components` etc.)
- Separate `tsconfig.json` (for IDE) from `tsconfig.build.json` (for production)

**Source**: spec 001-project-scaffold-i (research.md Decision 6)
**Established**: 2025-11-04

---

## Linting Strategy - ESLint

**Decision**: ESLint with TypeScript and React plugins, flat config format

**Rationale**:
- Industry standard for TypeScript/React projects
- Flat config (eslint.config.js) is modern approach (ESLint 9+)
- Plugins available for React, TypeScript, accessibility

**Alternatives Considered**:
- Biome: Emerging but less mature plugin ecosystem
- TSLint: Deprecated

**Implementation Details**:
- Shared config in `shared-infra` via factory function pattern
- Export `createEslintConfig()` that returns flat config array
- Base config includes TypeScript, import sorting, and common rules
- Frontend config adds React, React Hooks, JSX a11y plugins
- Backend config adds Node-specific rules
- Consuming packages call factory with options (isFrontend, tsconfigRootDir, custom ignores)
- Auto-fix on save encouraged, enforced in pre-commit

**Factory Function Benefits**:
- Type-safe configuration with TypeScript
- Flexible per-package customisation via options
- Native ESLint flat config format (no FlatCompat needed)

**Common Errors Caught** (via @typescript-eslint/recommended and eslint:recommended):
- Unused variables and imports
- Variables used before definition
- Debugger statements in production code
- Duplicate imports or exports
- Unreachable code after return statements
- Missing return types on functions (TypeScript-specific)
- Any type usage without explicit annotation

**Import Sorting Strategy**:
- Use `eslint-plugin-import` with `import/order` rule for automatic sorting
- Sort order: built-ins → externals → internals → parent → sibling → index
- Group imports with blank lines between categories (`newlines-between: "always"`)
- Alphabetise within groups for consistency

**Source**: spec 001-project-scaffold-i (research.md Decision 7)
**Established**: 2025-11-04

---

## Formatting Strategy - Prettier

**Decision**: Prettier with default configuration (initially)

**Rationale**:
- Code formatting is non-controversial, delegation to Prettier is standard
- Integrates with ESLint via eslint-config-prettier
- Consistent formatting across all file types (TS, JSON, MD, etc.)
- Default settings work well for most projects, minimise configuration overhead

**Implementation Details**:
- Use Prettier defaults (no custom config initially)
- If shared config needed later: export from shared-infra as `@promptalicious/prettier-config`
- Consuming packages reference via `"prettier": "@promptalicious/prettier-config"` in package.json
- Package-specific overrides: import shared config in `.prettierrc.mjs` and spread with custom rules
- Format on save recommended in IDE
- Pre-commit hook enforces formatting

**When to Add Shared Config**:
- Start with defaults (zero config)
- Add shared config only if project-wide customisation needed
- Individual packages can still override by extending the shared config

**Prettier Sharing Pattern** (if needed later):
```typescript
// shared-infra/prettier/index.js
export default {
  singleQuote: true,
  semi: true,
  // ... custom options
}

// consuming package.json
{
  "prettier": "@promptalicious/prettier-config"
}

// or with overrides in .prettierrc.mjs
import sharedConfig from '@promptalicious/prettier-config'
export default {
  ...sharedConfig,
  printWidth: 100  // package-specific override
}
```

**Source**: spec 001-project-scaffold-i (research.md Decision 8)
**Established**: 2025-11-04

---

## Git Hooks - Husky

**Decision**: Husky for pre-commit hooks

**Rationale**:
- Standard tool for git hooks in npm projects
- Simple setup, integrates with pnpm
- Enforces quality gates before commit

**Alternatives Considered**:
- lint-staged: Often used with Husky for performance, consider for future if hooks slow
- pre-commit (Python): Wrong ecosystem for Node project

**Implementation Details**:
- Pre-commit hook runs: `pnpm typecheck && pnpm lint && pnpm format:check`
- Installed at repository root
- Configured via `.husky/pre-commit`

**Quality Gates**:
- Fast feedback (< 10 seconds for incremental changes)
- Fail-fast: One error blocks commit

**Source**: spec 001-project-scaffold-i (research.md Decision 9)
**Established**: 2025-11-04

---

## Task Orchestration

**Decision**: Root `package.json` scripts delegate to Turbo

**Rationale**:
- Developer runs tasks from root (`pnpm dev`, `pnpm test`, etc.)
- Turbo handles multi-package orchestration
- Clear, discoverable task names

**Implementation Pattern**:
```json
{
  "scripts": {
    "dev": "turbo run dev --parallel",
    "build": "turbo run build",
    "test": "turbo run test",
    "typecheck": "turbo run typecheck",
    "lint": "turbo run lint",
    "lint:fix": "turbo run lint:fix",
    "format": "turbo run format",
    "format:check": "turbo run format:check"
  }
}
```

**Source**: spec 001-project-scaffold-i (research.md Decision 10)
**Established**: 2025-11-04

---

## Quality Standards

**Code Quality Gates**:
- TypeScript strict mode: ✅ Enabled
- Linting: ✅ Configured (ESLint, zero errors/warnings)
- Formatting: ✅ Configured (Prettier)
- Git hooks: ✅ Configured (Husky pre-commit)
- Tests: Required for all feature code

**Quality Gate Commands**:
```bash
pnpm typecheck  # Zero errors (non-negotiable)
pnpm lint       # Zero errors/warnings (use pnpm lint:fix for auto-fix)
pnpm format     # Format all code
pnpm test       # All passing (or justified failures)
```

**Source**: Consolidated from CLAUDE.md § Project Health Metrics
**Established**: 2025-11-04

---

## MCP Integration

### Context7

**Purpose**: Framework and library documentation (FIRST port of call)

**When to Use**:
- Any third-party package usage
- SDK uncertainty
- Parameter validation
- Working with ANY framework (React, Vite, Vitest, Vercel AI SDK, etc.)

**Critical Rules**:
- MUST use Context7 BEFORE guessing API shapes or parameter structures
- MUST NOT guess at parameters based on knowledge from other packages or past versions
- MUST NOT make changes to methods or parameters without FULL knowledge from documentation
- MUST NOT hand-roll functionality that the package likely provides natively

**Best Practices**:
- Check Context7 docs frequently to find better, more optimised functions
- Follow best practices suggested by package documentation
- Prefer package-native implementations over custom code
- Validate approach against official examples and patterns

### Serena

**Purpose**: Semantic code analysis (25+ languages)

**When to Use**:
- Searching codebase for patterns
- Symbolic code exploration
- Understanding code relationships
- Token-efficient code reading

**Setup**: Requires `mcp__serena__initial_instructions` call before use

**Critical**: See CLAUDE.md § MCP Activation Checklist for mandatory activation protocol

**Source**: Consolidated from CLAUDE.md § MCP Tools Available
**Established**: 2025-11-04

---

## Testing Philosophy

### Pragmatic TDD Workflow

**Core Commitment**: We believe in comprehensive test suites and TDD principles. We reject dogmatic TDD that creates friction.

**RED-GREEN-REFACTOR on Tight Loops**:
- Tests MUST fail first (RED phase is non-negotiable)
- RED-GREEN-REFACTOR cycle MUST happen **per-task**, not per-spec or per-feature
- Test suites MUST be right-sized: test what you're implementing NOW, not future features

**Test Hierarchy** (in order of priority):
1. Contract tests (API shape, request/response schemas)
2. Integration tests (real dependencies, user workflows)
3. End-to-end tests (full system validation)
4. Unit tests (complex logic, edge cases)

**FORBIDDEN**:
- Writing 20+ tests before any implementation
- Skipping tests to "fix" test failures
- Implementing before writing a failing test

**REQUIRED**:
- Test the specific feature you're building now
- Use real dependencies (real Postgres, real LLM calls with fixtures)
- Tests co-located with implementation where sensible

**Good TDD Example** ✅:
```
Task: "Implement user authentication"
- Write failing auth tests
- Implement auth to make tests pass
- Refactor
- Task complete
```

**Bad TDD Example** ❌:
```
Tasks:
1. "Write all contract tests for entire API" (20 tests)
2. "Write all integration tests for entire API" (30 tests)
3. "Implement API endpoints" (wait 2 days to see if tests are right)
```

**Source**: Consolidated from CLAUDE.md § Pragmatic TDD Workflow
**Established**: 2025-11-04

---

## Package Installation Protocol

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

**Source**: CLAUDE.md § Package Installation Protocol
**Established**: 2025-11-04
