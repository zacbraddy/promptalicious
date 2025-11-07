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

**CRITICAL RULES**:
- **Use Axios in `apiClient.ts`** for all HTTP communication with the backend
- **ALWAYS wrap `apiClient` calls with TanStack Query** (`useQuery`, `useMutation`) for state management
- **NEVER** call `apiClient` functions directly without TanStack Query wrapper
- **NEVER** manually implement polling, caching, or request state - use TanStack Query's built-in features (`refetchInterval`, `staleTime`, etc.)
- **Create custom hooks** when you need to add logic (cache invalidation, computed values, multi-step operations)
- **Use TanStack Query directly** in components if the hook would just pass through without adding value
- **API Client (`apiClient.ts`)** = HTTP layer using Axios - pure functions that return promises

**When to Use TanStack Query**:
- ✅ Fetching data from backend APIs
- ✅ Polling/refetching data at intervals
- ✅ Mutations (POST, PUT, DELETE operations)
- ✅ Caching and background synchronisation
- ✅ Optimistic updates
- ❌ Local UI state (use `useState` instead)
- ❌ Form state (use `react-hook-form` instead)

**Architecture Pattern**:
```
packages/frontend/src/
├── services/
│   └── apiClient.ts          # Axios HTTP client - communicates with backend API
├── hooks/
│   ├── useConfig.ts          # Wraps apiClient.getConfig() with useQuery
│   └── useExecutionStatus.ts # Wraps apiClient.getExecutionStatus() with useQuery + polling
└── components/
    └── SettingsForm.tsx      # Uses hooks (useConfig), NEVER imports apiClient directly
```

**Implementation Pattern**:

1. **API Client Layer** (`services/apiClient.ts`):
   - Uses Axios for HTTP communication with backend
   - Pure functions that return promises
   - No React dependencies
   - Handles HTTP details (headers, error mapping, request/response transformation)
   ```typescript
   import axios from "axios";

   // Axios instance with base configuration
   export const apiClient = axios.create({
     baseURL: import.meta.env.VITE_API_BASE_URL,
   });

   // Pure function that uses Axios to fetch data
   export async function getConfig(): Promise<ConfigurationResponse> {
     const response = await apiClient.get<ConfigurationResponse>("/config");
     return response.data;
   }

   export async function updateConfig(data: UpdateConfigurationRequest): Promise<UpdateConfigurationSuccessResponse> {
     const response = await apiClient.put<UpdateConfigurationSuccessResponse>("/config", data);
     return response.data;
   }
   ```

2. **Hook Layer** (`hooks/useConfig.ts`):
   - Wraps API client functions with TanStack Query for state management
   - Imports functions from `apiClient.ts` and wraps them with `useQuery` or `useMutation`
   - Defines query keys for caching
   - Handles invalidation and optimistic updates
   ```typescript
   import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
   import { getConfig, updateConfig } from "@/services/apiClient";

   // Wrap apiClient.getConfig() with TanStack Query
   export function useGetConfig() {
     return useQuery<ConfigurationResponse>({
       queryKey: ["config"],
       queryFn: getConfig, // Uses apiClient function
     });
   }

   // Wrap apiClient.updateConfig() with TanStack Query
   export function useUpdateConfig() {
     const queryClient = useQueryClient();

     // ... extra logic that would justify putting this in a hook ...
     return useMutation<SuccessResponse, Error, UpdateRequest>({
       mutationFn: updateConfig, // Uses apiClient function
       onSuccess: () => {
         void queryClient.invalidateQueries({ queryKey: ["config"] });
       },
     });
   }
   ```

3. **Page/Container Component** (e.g., `pages/SettingsPage.tsx`):
   - Uses custom hooks that wrap TanStack Query
   - Handles success/error at container level
   - Passes mutation functions down to child components
   - NEVER imports `apiClient` directly
   ```typescript
   import { useGetConfig, useUpdateConfig } from "@/hooks/useConfig";

   export function SettingsPage() {
     const { data, isLoading } = useGetConfig(); // Uses hook, not apiClient
     const updateMutation = useUpdateConfig();   // Uses hook, not apiClient

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

**CORRECT** ✅ - Use custom hook that wraps TanStack Query:
```typescript
// In page component
import { useUpdateConfig } from "@/hooks/useConfig"; // Custom hook

const updateMutation = useUpdateConfig();

const handleSubmit = async (data: FormData) => {
  try {
    await updateMutation.mutateAsync(data);
    toast.success("Saved successfully");
  } catch (error) {
    toast.error(error.message);
  }
};
```

**WRONG** ❌ - Don't import `apiClient` directly in components:
```typescript
// In component - DO NOT DO THIS!
import { updateConfig } from "@/services/apiClient";

const handleSubmit = async () => {
  await updateConfig(data); // ❌ Bypasses TanStack Query state management!
};
```

**CORRECT** ✅ - The custom hook wraps `apiClient` with TanStack Query:
```typescript
// In hooks/useConfig.ts
import { useMutation } from "@tanstack/react-query";
import { updateConfig } from "@/services/apiClient"; // ✅ Hook imports apiClient

export function useUpdateConfig() {
  return useMutation({
    mutationFn: updateConfig, // Wraps apiClient function
  });
}
```

**Polling Pattern** (using `refetchInterval`):
```typescript
// In hooks/useExecutionStatus.ts
import { useQuery } from "@tanstack/react-query";
import { getExecutionStatus } from "@/services/apiClient"; // Import apiClient function

export function useExecutionStatus() {
  const query = useQuery<ExecutionStatusResponse>({
    queryKey: ["execution", "status"],
    queryFn: getExecutionStatus, // Wrap apiClient function with useQuery
    refetchInterval: (query) => {
      // Smart polling: only poll when execution is in progress
      const data = query.state.data;
      return data?.isExecuting ? 2000 : false;
    },
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  return {
    status: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
```

**WRONG** ❌ - Manual polling with `setInterval` and direct `apiClient` calls:
```typescript
// DO NOT DO THIS - use TanStack Query's refetchInterval instead!
import { getExecutionStatus } from "@/services/apiClient";

export function useExecutionStatus() {
  const [status, setStatus] = useState(null);

  useEffect(() => {
    const interval = setInterval(async () => {
      const data = await getExecutionStatus(); // ❌ Direct apiClient call without TanStack Query
      setStatus(data);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return { status };
}
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
**Updated**: 2025-01-07 (added polling pattern and strengthened directives)

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

**Quality Gate Commands** (MUST be run after every code change, before marking task complete):
```bash
pnpm typecheck      # Zero errors (non-negotiable)
pnpm lint           # Zero errors/warnings (use pnpm lint:fix for auto-fix)
pnpm format:check   # All files formatted (if fails, run pnpm format then recheck)
pnpm test           # All passing (or justified failures)
```

**Formatting Protocol**:
- ALWAYS run `pnpm format:check` first
- If it fails, run `pnpm format` to fix, then run `pnpm format:check` again to verify
- Never skip format checking - it must pass before task completion
- Formatting is enforced in pre-commit hooks

**Source**: Consolidated from CLAUDE.md § Project Health Metrics
**Established**: 2025-11-04
**Updated**: 2025-01-06 (added format:check requirement)

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

---

## Feature Completion History

### Spec 002-make-a-call (2025-11-07)

**Feature**: LLM Prompt Execution & Diagnostics Interface

**Completed Capabilities**:
- Full-stack LLM prompt execution with GPT-4o-mini via Vercel AI SDK
- Settings page for API key configuration and connection testing
- Prompt execution page with abort capability and status polling
- Comprehensive diagnostics display (tokens, timing, cost in GBP)
- Error classification and display for all failure modes
- Pricing data system with staleness detection (>7 days)
- Page refresh recovery (execution state preserved during reload)
- Retrofuturistic dark theme (shadcn/ui + Tailwind)

**Technical Achievements**:
- Added TanStack Query for server state management (see Frontend State Management section)
- Created abort/status polling pattern for long-running LLM calls
- Implemented pricing cache system with Frankfurter API (USD→GBP conversion)
- Built retrofuturistic dark theme using shadcn/ui + Tailwind CSS v4
- Established frontend architecture: API client (Axios) → Hooks (TanStack Query) → Components
- Added page refresh recovery via execution state cache

**Metrics**:
- Total tasks: 79 completed across 11 phases
- Key learning: Mid-spec retrofit (T046-T053) added abort/cancel functionality after spec completion; demonstrated value of iterative enhancement vs upfront perfect planning

**Source**: spec 002-make-a-call complete (2025-11-07)
**Established**: 2025-11-07

---

## Implementation Decisions from Spec 002

### Clarifications Resolved

**LLM Response Time Handling**:
- Decision: No thresholds needed, display raw timing without status indicators
- Rationale: Analysis is not a concern for this iteration (Q from spec.md lines 45-48)

**LLM Response Display Length**:
- Decision: No limit, display full response with scrolling
- Rationale: Display areas grow to meet content height; use smart UI patterns to make information digestible but never hide it (Q from spec.md lines 49)

**Database Selection**:
- Decision: PostgreSQL instance as per tech stack (not SQLite)
- Rationale: Consistency with existing architecture decisions (Q from spec.md line 50)

**Pricing Data Approach**:
- Decision: Lookup live API pricing on backend startup (not per-call), store in database as cache, fallback to last successful pricing if live lookup fails
- Rationale: Balances freshness with performance and reliability (Q from spec.md lines 51-52)

**Source**: spec 002-make-a-call spec.md § Clarifications
**Established**: 2025-11-07

---

## Architectural Patterns Established

### Execution State Management

**Pattern**: In-memory execution state cache with AbortController support

**Implementation** (from spec 002-make-a-call):
- Backend maintains in-memory cache of currently executing prompt
- Cache stores: execution ID, prompt text, start timestamp, AbortController signal, status
- Lifecycle: Execute clears cache → stores state → completion stores results → status retrieval clears cache
- Single-execution pattern: Only one prompt can execute at a time (prevents concurrent execution issues)
- Abort support: AbortController allows cancellation of in-flight LLM calls

**Key Requirements**:
- FR-003 series: Backend cache ensures only one execution at a time, even across page refreshes
- FR-005a: System MUST support aborting an in-progress prompt execution
- FR-005b: System MUST clean up execution state cache when execution completes (success, failure, or abort)

**Rationale**:
- Prevents resource exhaustion from multiple concurrent LLM calls
- Enables page refresh recovery (frontend polls status endpoint)
- Allows user to cancel long-running executions
- In-memory cache is acceptable for single-user local tool (no persistence needed)

**Source**: spec 002-make-a-call data-model.md lines 177-183, spec.md FR-003 series
**Established**: 2025-11-07

---

## Pricing & Exchange Rate System

### Pricing Data Strategy

**Decision**: Scrape openai.com/api/pricing on backend startup, cache in database, fallback to hardcoded constants

**Implementation**:
- Primary approach: Scrape OpenAI pricing page on backend startup, parse HTML/JSON to extract GPT-4o-mini pricing
- Cache in database with timestamp (table: `pricing_info`)
- Retry with exponential backoff if scraping fails
- Fallback: Hardcoded pricing constants if scraping fails or on first startup before successful scrape
  - Input: $0.150 per 1M tokens
  - Output: $0.600 per 1M tokens
  - Comment in code: "// Fallback pricing - last verified YYYY-MM-DD from openai.com/api/pricing"
- Staleness warning: Display if pricing >7 days old (encourages investigation)

**Rationale**:
- OpenAI does NOT expose a programmatic pricing API
- Scraping may break if OpenAI changes page structure (acceptable risk for local dev tool)
- Hardcoded fallback ensures tool never fails due to pricing unavailability
- Startup lookup (not per-call) balances freshness with performance

**Source**: spec 002-make-a-call research.md lines 215-260
**Established**: 2025-11-07

### Exchange Rate Strategy

**Decision**: Use Frankfurter API (free, no key required) for USD→GBP conversion

**Implementation**:
- API: `GET https://api.frankfurter.dev/v1/latest?base=USD&symbols=GBP`
- Returns: `{"amount":1.0,"base":"USD","date":"2025-11-04","rates":{"GBP":0.79}}`
- Cache in database with timestamp (table: `exchange_rates`)
- Fall back to cached rate if API unavailable
- Fetch on backend startup, same pattern as pricing data

**Alternatives Considered**:
- ExchangeRate-API.com (free tier: 1,500 requests/month) - backup option

**Rationale**:
- Completely free, no API key required, no rate limits
- Open-source, reliable, actively maintained
- Simple REST API, easy integration

**Source**: spec 002-make-a-call research.md lines 643-651
**Established**: 2025-11-07

### Staleness Detection

**Rule**: Pricing data considered stale if `lastUpdated > 7 days ago`

**UI Behaviour**: Display warning when pricing is stale (FR-028)

**Backend Behaviour**: Log warning on startup if pricing lookup fails

**Source**: spec 002-make-a-call spec.md FR-028, data-model.md lines 182-185
**Established**: 2025-11-07

---

## Frontend Styling Patterns

### Dark Theme Implementation

**Decision**: Tailwind CSS v4 with custom retrofuturistic dark theme, defined in `:root` CSS variables

**CRITICAL**: Dark mode is the ONLY theme (not a toggleable variant)

**Implementation** (per research.md Decision 3 and spec.md FR-029):
- Dark theme colours defined directly in `:root` CSS variables in `index.css`
- **NO** `class="dark"` on HTML element (dark mode is the only mode, not a variant)
- Map custom colours to shadcn's semantic colour variables (primary, secondary, accent, etc.)
- Use OKLCH colour space for better perceptual uniformity
- This is the core and only colour palette for the application

**Colour Palette** (retrofuturistic, soft greys, muddy blacks, cyan/magenta accents):
- Background: Muddy blacks (`oklch(0.04 0 0)` = #0a0a0a, `oklch(0.1 0 0)` = #1a1a1a)
- Foreground: Soft greys (`oklch(0.69 0 0)` = #b0b0b0, `oklch(0.4 0 0)` = #666666)
- Primary (Cyan accent): `oklch(0.66 0.14 196)` = subdued cyan (#00CED1)
- Accent (Magenta): `oklch(0.68 0.16 320)` = subdued magenta (#B565D8)

**Source**: spec 002-make-a-call research.md lines 102-138, spec.md lines 151-159
**Established**: 2025-11-07

### Application Branding

**Logo & Favicon**: 😋 (face savouring food) emoji

**Rationale**:
- Simple, playful branding that complements the "promptalicious" name
- Universally supported across operating systems
- Appears in favicon and navbar alongside the application name

**Source**: spec 002-make-a-call spec.md FR-032b
**Established**: 2025-11-07

---

## LLM Integration Pattern

### Vercel AI SDK Implementation

**Decision**: Use Vercel AI SDK's `generateText` function with OpenAI provider

**Rationale**:
- Unified interface for multiple LLM providers
- Built-in token counting and usage metrics
- Native TypeScript support with type-safe responses
- Automatic error handling and retries
- Direct OpenAI provider support for GPT-4o-mini

**Implementation Pattern**:
```typescript
import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'

const result = await generateText({
  model: openai('gpt-4o-mini'),
  prompt: userPrompt,
})

// Available diagnostic data:
// - result.text (response)
// - result.usage.promptTokens
// - result.usage.completionTokens
// - result.usage.totalTokens
// - timing data (measure externally with Date.now())
```

**Integration Points**:
- Backend API endpoint receives prompt, calls generateText, returns result + diagnostics
- Error handling captures all failure modes (auth, network, API limits, etc.)
- Environment variable for OpenAI API key

**Alternatives Considered**:
- Direct OpenAI SDK: More control but loses Vercel AI SDK's provider abstraction
- LangChain: Too heavy for simple LLM calls, adds unnecessary complexity

**Source**: spec 002-make-a-call research.md lines 12-53
**Established**: 2025-11-07

---

## UI Component Strategy

### shadcn/ui Setup

**Decision**: Use shadcn/ui CLI to install individual components on-demand

**Rationale**:
- shadcn/ui is not an npm package - components are copied into your project
- Full customisation and ownership of component code
- Built on Radix UI primitives (accessibility out of the box)
- Tailwind CSS-based styling (aligns with spec requirements)
- No runtime dependency overhead

**Installation Pattern**:
```bash
# Initialise shadcn/ui in frontend package
npx shadcn@latest init

# Install components as needed
npx shadcn@latest add button card textarea badge table alert
```

**Components Used in Spec 002**:
- Card: Container for prompt input and results
- Button: Execute/Cancel buttons
- Textarea: System prompt input
- Badge: Status indicators
- Table: Diagnostic data display
- Alert: Error display

**Component Location**: `packages/frontend/src/components/ui/`

**Alternatives Considered**:
- Raw Radix UI: More work to style, shadcn provides good defaults
- Material UI / Ant Design: Too opinionated, harder to achieve retrofuturistic aesthetic
- Custom components from scratch: Would violate "quick wins" constraint

**Source**: spec 002-make-a-call research.md lines 56-99
**Established**: 2025-11-07

---

## Frontend State Management

### React Built-in Hooks for UI State

**Decision**: Use React built-in hooks (`useState`, `useEffect`) for UI state, no external state library

**Rationale**:
- Simple UI state (prompt input, loading indicators, form state)
- No complex state sharing between distant components (yet)
- Spec emphasises quick wins over perfect architecture
- External libraries (Zustand, Redux) add unnecessary complexity at this stage

**When to Use**:
- ✅ Local UI state (form inputs, modals, toggles)
- ✅ Component-specific loading states
- ✅ Transient UI state (hover, focus)
- ❌ Server state (use TanStack Query instead)
- ❌ Form state (use react-hook-form instead)

**Future Considerations**:
- When adding execution history (future spec), consider React Query for server state management
- When adding real-time streaming responses, consider state machine library (XState)

**Source**: spec 002-make-a-call research.md lines 262-317
**Established**: 2025-11-07

---

## Security Considerations

### API Key Storage

**Decision**: Store API keys in plain text in local PostgreSQL database (not .env files)

**Rationale**:
- This is a local development tool (single-user, local database)
- Storing API key in plain text is acceptable, just as .env files store credentials unencrypted
- Database storage prevents accidental commit of .env files with credentials

**CRITICAL Security Requirement**:
- API keys stored in database (not .env) to avoid accidental commit of .env files with credentials
- **This is ONLY safe if database files cannot be accidentally committed**

**Required .gitignore Entries**:
- `.env` and `.env.*` files (database connection strings)
- PostgreSQL data directories (e.g., `postgres-data/`, Docker volume mounts)
- Database dumps and backups (e.g., `*.sql`, `*.dump`)

**Implementation Requirement**:
- Task T002 in spec 002 verified .gitignore includes all database-related paths
- Database credentials and connection string secured via environment variables (never committed to repository)

**Source**: spec 002-make-a-call research.md lines 620-630, data-model.md lines 139-149
**Established**: 2025-11-07

---

## Database Patterns

### Numeric Precision Handling

**Context**: PostgreSQL `NUMERIC` type returns strings in DrizzleORM to prevent JavaScript floating-point precision loss

**Pattern** (from spec 002-make-a-call data-model.md):

**Storage**:
- Database: PostgreSQL `NUMERIC(12,10)` for pricing (token prices), `NUMERIC(10,6)` for exchange rates
- DrizzleORM: Returns as string (by design) to prevent precision loss

**Service Layer Conversion**:
- Convert to number via `parseFloat()` for application use
- Precision analysis: JavaScript `Number` is sufficient for our use case (token prices have <7 significant digits, simple multiplication, no accumulation)

**Decision**:
- Using native numbers (not big.js/decimal.js) is acceptable for a debugging tool with simple cost calculations
- No need for arbitrary-precision arithmetic libraries

**Rationale**:
- Token prices are small decimals (e.g., 0.00000015 USD per token)
- Simple multiplication operations (tokens × price × exchange rate)
- No accumulation or rounding errors over many operations
- Debugging tool context (not financial system requiring exact precision)

**Source**: spec 002-make-a-call data-model.md lines 190-196, 228-229
**Established**: 2025-11-07
