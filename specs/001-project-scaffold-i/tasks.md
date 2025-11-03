# Tasks: Project Scaffold

**Input**: Design documents from `specs/001-project-scaffold-i/`
**Prerequisites**:
- Design documents: plan.md, research.md, data-model.md, quickstart.md
- Git branch: `001-project-scaffold-i` (confirmed by check-prerequisites.sh)
- Repository: Clean working directory or existing scaffold work

## Task Overview

This is an infrastructure scaffold specification. Traditional TDD workflow is replaced with configuration-based tasks and validation scenarios from quickstart.md.

**Total Tasks**: 12
**Estimated Completion**: Sequential foundation (T001-T005), then parallel configs (T006-T008), then sequential workflows (T009-T011), final validation (T012)

## Path Conventions

Web application structure:
- `packages/shared-infra/` - Shared configuration package
- `packages/frontend/` - React + Vite frontend
- `packages/backend/` - Node.js + TypeScript backend
- Root-level orchestration via pnpm + Turbo

## Phase 3.1: Foundation (Sequential)

**CRITICAL**: These tasks build on each other and MUST be done sequentially.

- [x] **T001** Initialize pnpm workspace structure
  - **Files**: `pnpm-workspace.yaml`, root `package.json`, `.npmrc`
  - **Actions**:
    - Create `pnpm-workspace.yaml` with `packages/*` pattern
    - Initialize root `package.json` with workspace metadata
    - Configure `.npmrc` for strict peer dependencies
    - Install pnpm devDependencies (turbo)
  - **Verification**: Run `pnpm install` successfully
  - **Dependencies**: None (first task)
  - **Research Context**: See research.md Decision 1 (pnpm workspaces)

- [x] **T002** Create shared-infra package with base structure
  - **Files**:
    - `packages/shared-infra/package.json`
    - `packages/shared-infra/tsconfig.json` (base config)
    - `packages/shared-infra/src/` (for config factories)
    - `packages/shared-infra/README.md`
  - **Actions**:
    - Create package directory structure with `src/` subdirectory
    - Initialize package.json with `@promptalicious/shared-infra` name
    - Set up exports for config factories in package.json
    - Create base TypeScript config with strict mode enabled
    - Document package purpose and usage pattern in README
  - **Verification**: Package appears in `pnpm list -r`
  - **Dependencies**: T001 (requires workspace structure)
  - **Research Context**: See research.md Decision 3, Decision 6

- [x] **T003** Create frontend package with Vite + React scaffold
  - **Files**:
    - `packages/frontend/package.json`
    - `packages/frontend/vite.config.ts`
    - `packages/frontend/src/App.tsx`
    - `packages/frontend/src/main.tsx`
    - `packages/frontend/index.html`
  - **Actions**:
    - Run `pnpm create vite frontend --template react-ts` or manual setup
    - Configure package.json with `@promptalicious/frontend` name
    - Add workspace dependency on `@promptalicious/shared-infra`
    - Install React, Vite, and Vitest dependencies
    - Create minimal App component (placeholder UI)
  - **Verification**: Can run `pnpm --filter frontend dev` and see Vite dev server start
  - **Dependencies**: T002 (requires shared-infra to exist for workspace reference)
  - **Research Context**: See research.md Decision 4

- [x] **T004** Create backend package with Node + TypeScript scaffold
  - **Files**:
    - `packages/backend/package.json`
    - `packages/backend/src/index.ts`
    - `packages/backend/tsconfig.json` (extends shared-infra)
  - **Actions**:
    - Create package directory structure
    - Initialize package.json with `@promptalicious/backend` name
    - Add workspace dependency on `@promptalicious/shared-infra`
    - Install TypeScript, tsx, and Vitest dependencies
    - Create minimal index.ts with console.log (placeholder server)
  - **Verification**: Can run `pnpm --filter backend dev` and see output
  - **Dependencies**: T002 (requires shared-infra to exist for workspace reference)
  - **Research Context**: See research.md Decision 5

- [x] **T005** Configure Turbo for multi-package orchestration
  - **Files**: `turbo.json`
  - **Actions**:
    - Create turbo.json at repository root
    - Define pipeline tasks: `dev`, `build`, `test`, `typecheck`, `lint`, `format`, `format:check`
    - Configure caching:
      - Cache: `build`, `typecheck`, `lint`, `format:check`
      - No cache: `dev` (persistent: true), `test`
    - Set up task dependencies (e.g., build depends on ^build)
  - **Verification**: Run `pnpm turbo run --help` to confirm Turbo is configured
  - **Dependencies**: T001-T004 (requires all packages to exist)
  - **Research Context**: See research.md Decision 2

## Phase 3.2: Configuration (Parallel) ✅ Can run together

**SAFE TO PARALLELIZE**: Each task configures a different tool and outputs to different files.

- [ ] **T006** [P] Implement TypeScript configuration hierarchy
  - **Files**:
    - `packages/shared-infra/tsconfig.json` (update with full base config)
    - `packages/frontend/tsconfig.json` (extends shared-infra, add jsx, dom)
    - `packages/backend/tsconfig.json` (extends shared-infra, add node types)
  - **Actions**:
    - Configure shared-infra base: strict mode, ES2022 target, ESNext module
    - Frontend config: `"jsx": "react-jsx"`, lib: ["DOM", "ES2022"], paths for @/ alias
    - Backend config: lib: ["ES2022"], types: ["node"], paths for @/ alias
    - Ensure all packages have typecheck script in package.json
  - **Verification**: Run `pnpm typecheck` across all packages (expect 0 errors initially)
  - **Dependencies**: T001-T005 (foundation complete)
  - **Research Context**: See research.md Decision 6

- [ ] **T007** [P] Implement ESLint configuration with shared rules
  - **Files**:
    - `packages/shared-infra/src/eslint/createEslintConfig.ts` (factory function)
    - `packages/shared-infra/src/eslint/base.config.ts` (base rules)
    - `packages/shared-infra/src/eslint/frontend.config.ts` (React rules)
    - `packages/frontend/eslint.config.ts` (imports factory, calls with isFrontend: true)
    - `packages/backend/eslint.config.ts` (imports factory, calls with default options)
    - Add eslint, @typescript-eslint/*, eslint-plugin-react, eslint-plugin-import to dependencies
  - **Actions**:
    - Install ESLint 9+ with flat config support in shared-infra
    - Create `createEslintConfig()` factory function (TypeScript) following techsift pattern
    - Implement base.config.ts with TypeScript + import sorting rules
    - Implement frontend.config.ts with React, React Hooks, JSX a11y plugins
    - Configure import order: built-ins → externals → internals → parent → sibling → index with `newlines-between: "always"`
    - Consuming packages import factory and call with options (tsconfigRootDir, isFrontend, ignores)
    - Add lint and lint:fix scripts to all package.json files
  - **Verification**: Run `pnpm lint` (expect 0 errors, maybe warnings)
  - **Dependencies**: T001-T005 (foundation complete)
  - **Research Context**: See research.md Decision 7

- [ ] **T008** [P] Implement Prettier configuration
  - **Files**:
    - Root `.prettierignore`
    - Add prettier and eslint-config-prettier to dependencies
    - Package-specific `.prettierrc.json` only if overrides needed (e.g., frontend JSX settings)
  - **Actions**:
    - Install Prettier at root (use default configuration, no shared config file initially)
    - Configure .prettierignore (node_modules, dist, build, coverage)
    - Add format and format:check scripts to all package.json files
    - Integrate with ESLint (eslint-config-prettier to avoid conflicts)
    - Only create package-specific .prettierrc.json if defaults need overriding
  - **Verification**: Run `pnpm format:check` (expect all files formatted with defaults)
  - **Dependencies**: T001-T005 (foundation complete)
  - **Research Context**: See research.md Decision 8

## Phase 3.3: Development Workflows (Sequential)

**CRITICAL**: These tasks depend on configuration being complete and build on each other.

- [ ] **T009** Implement root-level development tasks
  - **Files**: Root `package.json` scripts section
  - **Actions**:
    - Add `"dev": "turbo run dev --parallel"` (concurrent dev servers)
    - Add `"build": "turbo run build"` (dependency-ordered builds)
    - Add `"test": "turbo run test"` (run all test suites)
    - Ensure frontend has dev script: `"vite"`
    - Ensure backend has dev script: `"tsx watch src/index.ts"`
    - Ensure all packages have build scripts appropriate to their type
  - **Verification**:
    - Run `pnpm dev` → both servers start with clear output showing URLs (quickstart.md Scenario 2)
    - Run `pnpm build` → all packages build successfully (quickstart.md Scenario 7)
    - Introduce intentional error (e.g., remove closing brace) → verify exit code is non-zero
    - Verify error messages include package name and specific failure reason
  - **Feedback Requirements** (FR-031):
    - Success: Display package names and server URLs/ports
    - Failure: Exit with non-zero code, display package name, error type, and file path if applicable
  - **Dependencies**: T005-T008 (Turbo + all configs ready)
  - **Research Context**: See research.md Decision 10

- [ ] **T010** Implement code quality tasks
  - **Files**: Root `package.json` scripts section, update turbo.json if needed
  - **Actions**:
    - Add `"typecheck": "turbo run typecheck"` to root
    - Add `"lint": "turbo run lint"` to root
    - Add `"lint:fix": "turbo run lint:fix"` to root
    - Add `"format": "turbo run format"` to root
    - Add `"format:check": "turbo run format:check"` to root
    - Ensure all package.json files have these scripts defined
  - **Verification**:
    - Run `pnpm typecheck` → all packages type-check (quickstart.md Scenario 3)
    - Run `pnpm lint` → no errors (quickstart.md Scenario 4)
    - Run `pnpm format:check` → all formatted (quickstart.md Scenario 5)
  - **Dependencies**: T006-T009 (configs + dev tasks ready)
  - **Research Context**: See research.md Decision 10

- [ ] **T011** Configure Husky pre-commit hooks
  - **Files**:
    - `.husky/pre-commit`
    - Root `package.json` (prepare script)
  - **Actions**:
    - Install Husky as devDependency at root
    - Run `pnpm exec husky init` or manual setup
    - Create `.husky/pre-commit` with:
      ```bash
      pnpm typecheck && pnpm lint && pnpm format:check
      ```
    - Add `"prepare": "husky"` script to root package.json
    - Make hook executable (`chmod +x .husky/pre-commit`)
  - **Verification**:
    - Stage a file and attempt commit
    - Hook runs and enforces quality gates (quickstart.md Scenario 8)
  - **Dependencies**: T010 (quality tasks must work before enforcing them)
  - **Research Context**: See research.md Decision 9

## Phase 3.4: Final Validation

- [ ] **T012** Verify all quickstart.md scenarios pass
  - **Files**: No new files, validation only
  - **Actions**:
    - Execute each scenario from quickstart.md sequentially:
      1. Fresh Installation (pnpm install)
      2. Development Servers (pnpm dev, check both ports)
      3. TypeScript Type Checking (pnpm typecheck, test with error)
      4. Linting (pnpm lint, test with error + fix)
      5. Code Formatting (pnpm format:check, test with error + fix)
      6. Testing (pnpm test, expect no tests or all passing)
      7. Build All Packages (pnpm build, verify artifacts)
      8. Git Hooks (test pre-commit enforcement)
      9. Shared Config Inheritance (inspect config files)
      10. Task Execution from Subdirectories (cd packages/frontend, run tasks)
    - Document any failures
    - Fix issues until all scenarios pass
  - **Verification**: All 10 quickstart scenarios pass without errors
  - **Dependencies**: T001-T011 (entire scaffold must be complete)
  - **Success Criteria**: Can answer "yes" to all quickstart validation questions

## Dependencies Graph

```
T001 (pnpm workspace)
  ↓
  ├─ T002 (shared-infra) ───┐
  ├─ T003 (frontend) ───────┤
  ├─ T004 (backend) ────────┤
  └─ T005 (turbo) ←─────────┘
       ↓
       ├─ T006 [P] (typescript configs)
       ├─ T007 [P] (eslint configs)
       └─ T008 [P] (prettier config)
            ↓
            T009 (dev tasks)
              ↓
              T010 (quality tasks)
                ↓
                T011 (husky hooks)
                  ↓
                  T012 (validation)
```

## Parallel Execution Examples

### After T005 completes, run configuration tasks in parallel:

```bash
# Option 1: Sequential execution (safer for first time)
/implement T006
/implement T007
/implement T008

# Option 2: Parallel execution (faster, requires careful review)
# Note: These truly can run in parallel as they touch different config files
/implement T006, T007, T008
```

### Foundation tasks MUST be sequential:
```bash
# CORRECT: Run one at a time
/implement T001
/implement T002
/implement T003
/implement T004
/implement T005

# INCORRECT: Cannot parallelize foundation
/implement T001, T002, T003, T004, T005  # ❌ Will fail due to dependencies
```

## Task Execution Notes

### Infrastructure vs Feature Development

This scaffold spec differs from typical feature development:

**No Contract Tests**: Infrastructure has no API contracts yet
**No Entity Models**: No domain entities in scaffold
**No Integration Tests**: Validation via quickstart scenarios instead

**Verification Strategy**:
- Each task includes verification steps (manual or scripted)
- Task T012 validates entire scaffold via quickstart.md
- Success = can run all dev workflows without errors

### Constitutional Compliance

**Dolphin Protocol**: After each task, surface working software
- After T001: Can run `pnpm install`
- After T003: Can start frontend dev server
- After T004: Can start backend dev server
- After T009: Can run `pnpm dev` (both servers)
- After T010: Can run all quality gates
- After T011: Pre-commit hooks enforce quality
- After T012: Entire scaffold validated

**Testing Approach**: Special case justified in plan.md Constitution Check
- Traditional TDD applies to future features built on this scaffold
- This scaffold validated via quickstart scenarios

### Common Issues

**Issue**: Tasks marked [P] but have hidden dependencies
- **Example**: T006-T008 all modify package.json dependencies
- **Solution**: Review carefully, run sequentially if unsure

**Issue**: Verification fails mid-task
- **Example**: T006 typecheck fails due to missing @types packages
- **Solution**: Install missing deps, re-run verification

**Issue**: Turbo cache causes stale results
- **Solution**: Run `pnpm turbo run [task] --force` to bypass cache

## Validation Checklist

Before marking T012 complete:

- [x] All foundation tasks (T001-T005) complete
- [x] All configuration tasks (T006-T008) complete
- [x] All workflow tasks (T009-T011) complete
- [x] Can run `pnpm install` successfully
- [x] Can run `pnpm dev` and see both servers start
- [x] Can run `pnpm typecheck` with no errors
- [x] Can run `pnpm lint` with no errors
- [x] Can run `pnpm format:check` with no errors
- [x] Can run `pnpm test` (no tests or all passing)
- [x] Can run `pnpm build` successfully
- [x] Git hooks block commits with type/lint/format errors
- [x] All packages inherit config from shared-infra
- [x] All 10 quickstart scenarios pass

## References

- **spec.md**: Functional requirements (FR-001 through FR-032)
- **plan.md**: Technical context, constitution check, structure decision
- **research.md**: Technology decisions and rationale
- **quickstart.md**: Validation scenarios (10 scenarios)
- **constitution.md**: Quality standards, Dolphin protocol

---

**Ready for execution**: Run `/implement T001` to begin scaffold implementation.
