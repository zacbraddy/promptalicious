# Research: Project Scaffold

**Date**: 2025-11-03
**Spec**: 001-project-scaffold-i

## Overview

This document captures research findings and best practices for scaffolding a TypeScript monorepo with pnpm workspaces and Turbo orchestration.

## Technology Decisions

### Decision 1: Package Manager - pnpm

**Decision**: Use pnpm with workspaces for monorepo management

**Rationale**:
- Efficient disk space usage via content-addressable storage
- Strict dependency resolution prevents phantom dependencies
- Native workspace support with simple configuration
- Fast installation times compared to npm/yarn
- Well-established in modern TypeScript ecosystems

**Alternatives Considered**:
- **npm workspaces**: More universal but slower and less strict
- **yarn workspaces**: Good but pnpm has better performance and strictness
- **lerna**: Legacy approach, superseded by modern workspace solutions

**Implementation Details**:
- Workspace packages defined in root `pnpm-workspace.yaml`
- Use `workspace:*` protocol for internal dependencies
- Single `pnpm-lock.yaml` at repository root

### Decision 2: Build Orchestration - Turbo

**Decision**: Use Turbo for multi-package task orchestration

**Rationale**:
- Intelligent caching of task outputs across packages
- Parallel execution with dependency-aware scheduling
- Simple configuration via `turbo.json`
- Excellent DX for monorepo builds and test runs
- Well-maintained by Vercel

**Alternatives Considered**:
- **nx**: More feature-rich but heavier, overkill for this project
- **lerna**: Primarily for publishing, limited build orchestration
- **Custom scripts**: Would require significant boilerplate and lack caching

**Implementation Details**:
- Root `turbo.json` defines pipeline tasks
- Tasks run in dependency order automatically
- Cache outputs for `build`, `typecheck`, `lint` tasks
- No caching for `dev` (long-running) or `test` (non-deterministic possible)

### Decision 3: Shared Configuration Package

**Decision**: Create `@promptalicious/shared-infra` package for centralised tooling configuration

**Rationale**:
- Single source of truth for TypeScript, ESLint, Prettier configs
- Changes propagate automatically to dependent packages
- Avoids configuration drift across packages
- Standard pattern in modern monorepos (used successfully in other projects)

**Alternatives Considered**:
- **Root-level configs with extends**: Workable but less explicit about dependencies
- **Duplicate configs per package**: Maintenance nightmare, guaranteed drift

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

### Decision 4: Frontend - React + Vite

**Decision**: Use React with Vite as build tool and dev server

**Rationale**:
- React is project requirement (from constitution)
- Vite provides fast HMR and modern ESM-based dev experience
- Native TypeScript support without additional configuration
- Vitest integration for consistent testing story

**Alternatives Considered**:
- **Webpack**: Slower, more configuration required
- **Next.js**: Overkill for tool UI, introduces framework opinions

**Implementation Details**:
- Vite config at `packages/frontend/vite.config.ts`
- Dev server on port 5173 (Vite default)
- Vitest for unit/integration tests

### Decision 5: Backend - Node.js + TypeScript

**Decision**: Use Node.js LTS with TypeScript, no framework initially

**Rationale**:
- Constitution specifies Node.js + TypeScript
- No API requirements in this scaffold spec (future specs will determine needs)
- Avoid framework lock-in until requirements are clear
- Simple executable entry point for future expansion

**Alternatives Considered**:
- **Express/Fastify now**: Premature - no API requirements yet
- **NestJS**: Heavy framework, inappropriate without clear need

**Implementation Details**:
- Entry point: `packages/backend/src/index.ts`
- Compiled output: `packages/backend/dist/`
- Dev mode: `tsx watch` for hot reload
- Testing: Vitest for consistency with frontend

### Decision 6: TypeScript Configuration Hierarchy

**Decision**: Three-tier tsconfig hierarchy via extends

**Rationale**:
- Base config in shared-infra establishes strict mode and common options
- Package-level configs add path mappings and output directories
- Avoids duplication while allowing package-specific needs

**Implementation Details**:
```
shared-infra/tsconfig.json (base - strict mode, lib, target)
  ↑
  ├─ frontend/tsconfig.json (jsx, paths, outDir)
  └─ backend/tsconfig.json (node types, paths, outDir)
```

### Decision 7: Linting - ESLint

**Decision**: ESLint with TypeScript and React plugins, flat config format

**Rationale**:
- Industry standard for TypeScript/React projects
- Flat config (eslint.config.js) is modern approach (ESLint 9+)
- Plugins available for React, TypeScript, accessibility

**Alternatives Considered**:
- **Biome**: Emerging but less mature plugin ecosystem
- **TSLint**: Deprecated

**Implementation Details**:
- Shared config in `shared-infra` via factory function pattern (like techsift)
- Export `createEslintConfig()` that returns flat config array
- Base config includes TypeScript, import sorting, and common rules
- Frontend config adds React, React Hooks, JSX a11y plugins
- Backend config adds Node-specific rules
- Consuming packages call factory with options (isFrontend, tsconfigRootDir, custom ignores)
- Auto-fix on save encouraged, enforced in pre-commit

**Factory Function Benefits**:
- Type-safe configuration with TypeScript
- Flexible per-package customization via options
- Native ESLint flat config format (no FlatCompat needed)
- Proven pattern from techsift project

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

### Decision 8: Formatting - Prettier

**Decision**: Prettier with default configuration

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
- Add shared config only if project-wide customization needed
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

### Decision 9: Git Hooks - Husky

**Decision**: Husky for pre-commit hooks

**Rationale**:
- Standard tool for git hooks in npm projects
- Simple setup, integrates with pnpm
- Enforces quality gates before commit

**Alternatives Considered**:
- **lint-staged**: Often used with Husky for performance, consider for future if hooks slow
- **pre-commit (Python)**: Wrong ecosystem for Node project

**Implementation Details**:
- Pre-commit hook runs: `pnpm typecheck && pnpm lint && pnpm format:check`
- Installed at repository root
- Configured via `.husky/pre-commit`

### Decision 10: Root-Level Task Orchestration

**Decision**: Root `package.json` scripts delegate to Turbo

**Rationale**:
- Developer runs tasks from root (`pnpm dev`, `pnpm test`, etc.)
- Turbo handles multi-package orchestration
- Clear, discoverable task names

**Implementation Details**:
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

## Best Practices Summary

### pnpm Workspaces
- Use `workspace:*` for internal package dependencies
- Hoist shared dependencies to root where possible
- Use `.npmrc` to configure pnpm behaviour (strict-peer-dependencies, etc.)

### Turbo Configuration
- Cache outputs for deterministic tasks (build, typecheck, lint)
- Use `--parallel` for dev servers (no dependency ordering needed)
- Define task dependencies in `pipeline` (e.g., build depends on dependencies' build)

### TypeScript
- Enable `strict` mode in base config
- Use `paths` for clean import aliases (`@/components` etc.)
- Separate `tsconfig.json` (for IDE) from `tsconfig.build.json` (for production)

### Testing
- Vitest for both frontend and backend (consistency)
- Co-locate tests with implementation (`*.test.ts` files)
- Use `vitest.config.ts` to extend Vite config

### Quality Gates
- Pre-commit: typecheck + lint + format check
- Fast feedback (< 10 seconds for incremental changes)
- Fail-fast: One error blocks commit

## Open Questions & Future Decisions

**Q1**: Which Node.js framework for backend API?
- **Answer**: Deferred to future spec when API requirements are clear
- **Options**: Express (minimal), Fastify (performance), Hono (modern, edge-ready)

**Q2**: State management for frontend?
- **Answer**: Deferred to future spec when UI complexity is understood
- **Options**: Context API, Zustand, Redux Toolkit

**Q3**: Database and ORM?
- **Answer**: Constitution specifies PostgreSQL, ORM choice deferred
- **Options**: Prisma (popular), Drizzle (lightweight), Kysely (type-safe SQL)

**Q4**: Deployment strategy?
- **Answer**: Out of scope for local development tool, revisit if distribution needed

## References

- [pnpm Workspaces Documentation](https://pnpm.io/workspaces)
- [Turbo Documentation](https://turbo.build/repo/docs)
- [Vite Documentation](https://vitejs.dev/)
- [Vitest Documentation](https://vitest.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [ESLint Flat Config](https://eslint.org/docs/latest/use/configure/configuration-files)
