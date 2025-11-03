# Quickstart: Project Scaffold Validation

**Date**: 2025-11-03
**Spec**: 001-project-scaffold-i

## Purpose

This document provides step-by-step validation scenarios for the project scaffold. Each scenario maps to functional requirements from spec.md and serves as an acceptance test.

## Prerequisites

- Node.js (latest LTS) installed
- pnpm installed (`npm install -g pnpm`)
- Git repository cloned
- Terminal open in repository root

## Validation Scenarios

### Scenario 1: Fresh Installation

**Requirement**: FR-001, FR-002, FR-003
**Goal**: Verify monorepo structure and dependency installation

**Steps**:
```bash
# Start from clean state (optional)
rm -rf node_modules packages/*/node_modules pnpm-lock.yaml

# Install all dependencies
pnpm install
```

**Expected Output**:
- ✅ No errors during installation
- ✅ `node_modules` directories created in root and all packages
- ✅ Single `pnpm-lock.yaml` at repository root
- ✅ Success message from pnpm

**Validation**:
```bash
# Verify packages exist
ls packages/
# Should show: frontend  backend  shared-infra

# Verify workspace linkage
pnpm list -r
# Should show all three packages
```

---

### Scenario 2: Development Servers

**Requirement**: FR-020, FR-013, FR-019
**Goal**: Verify both frontend and backend start concurrently

**Steps**:
```bash
# Start both dev servers
pnpm dev
```

**Expected Output**:
- ✅ Both `frontend:dev` and `backend:dev` tasks start
- ✅ Frontend dev server running on http://localhost:5173 (or configured port)
- ✅ Backend dev server running on http://localhost:3000 (or configured port)
- ✅ No compilation errors
- ✅ Hot reload works when editing source files

**Validation**:
```bash
# In another terminal, check servers are running
curl http://localhost:5173  # Frontend (expect HTML or 404 for missing route)
curl http://localhost:3000  # Backend (expect response or 404 for missing route)
```

**Cleanup**:
```bash
# Stop dev servers with Ctrl+C
```

---

### Scenario 3: TypeScript Type Checking

**Requirement**: FR-021, FR-009, FR-015, FR-026
**Goal**: Verify TypeScript validation runs across all packages

**Steps**:
```bash
# Run type checking
pnpm typecheck
```

**Expected Output**:
- ✅ TypeScript checks run for `shared-infra`, `frontend`, and `backend`
- ✅ No type errors (or only expected errors documented in code)
- ✅ Strict mode enforced
- ✅ Exit code 0 (success)

**Validation**:
```bash
# Check exit code
echo $?  # Should be 0

# Introduce an intentional type error
echo "const x: string = 123;" >> packages/frontend/src/test-error.ts
pnpm typecheck
# Should fail with error and exit code 1

# Clean up
rm packages/frontend/src/test-error.ts
```

---

### Scenario 4: Linting

**Requirement**: FR-022, FR-010, FR-016, FR-027
**Goal**: Verify ESLint runs across all packages with shared config

**Steps**:
```bash
# Run linting
pnpm lint
```

**Expected Output**:
- ✅ ESLint checks run for all packages
- ✅ No linting errors or warnings
- ✅ Exit code 0 (success)

**Auto-fix Validation**:
```bash
# Introduce a fixable lint error (e.g., missing semicolon)
echo "const foo = 'bar'" >> packages/frontend/src/test-lint.ts
pnpm lint
# Should show linting error

# Apply auto-fix
pnpm lint:fix
# Error should be fixed automatically

# Clean up
rm packages/frontend/src/test-lint.ts
```

---

### Scenario 5: Code Formatting

**Requirement**: FR-023, FR-011, FR-017, FR-028
**Goal**: Verify Prettier formats code with shared config

**Steps**:
```bash
# Check if code is formatted
pnpm format:check
```

**Expected Output**:
- ✅ All files pass formatting check
- ✅ Exit code 0 (success)

**Format Validation**:
```bash
# Create a poorly formatted file
echo "const foo={bar:123,baz:456}" > packages/backend/src/test-format.ts
pnpm format:check
# Should fail with formatting errors

# Apply formatting
pnpm format
# Files should be reformatted

# Verify formatting applied
cat packages/backend/src/test-format.ts
# Should show: const foo = { bar: 123, baz: 456 };

# Clean up
rm packages/backend/src/test-format.ts
```

---

### Scenario 6: Testing

**Requirement**: FR-024, FR-012, FR-018
**Goal**: Verify test runners work across all packages

**Steps**:
```bash
# Run all tests
pnpm test
```

**Expected Output**:
- ✅ Test runners execute for frontend and backend
- ✅ All tests pass (or no tests yet with clear message)
- ✅ Exit code 0 (success)

**Validation**:
```bash
# If no tests exist yet, output should indicate "No test files found" or similar
# This is acceptable for initial scaffold

# Once tests are added, they should execute
```

---

### Scenario 7: Build All Packages

**Requirement**: FR-025
**Goal**: Verify production builds run in correct dependency order

**Steps**:
```bash
# Build all packages
pnpm build
```

**Expected Output**:
- ✅ `shared-infra` builds first (if it has build step)
- ✅ `frontend` and `backend` build after dependencies
- ✅ Build outputs in `dist/` directories
- ✅ No build errors
- ✅ Exit code 0 (success)

**Validation**:
```bash
# Check build artifacts exist
ls packages/frontend/dist  # Should have built assets
ls packages/backend/dist   # Should have compiled JS

# Verify build order via Turbo output (shared-infra → others)
```

---

### Scenario 8: Git Hooks

**Requirement**: FR-029, FR-032
**Goal**: Verify pre-commit hooks enforce quality gates

**Steps**:
```bash
# Create a test change
echo "// Test change" >> packages/frontend/src/App.tsx

# Stage the change
git add packages/frontend/src/App.tsx

# Attempt commit
git commit -m "test: verify pre-commit hook"
```

**Expected Output**:
- ✅ Pre-commit hook runs automatically
- ✅ `pnpm typecheck` runs
- ✅ `pnpm lint` runs
- ✅ `pnpm format:check` runs
- ✅ If all pass, commit succeeds
- ✅ If any fail, commit is blocked

**Validation**:
```bash
# Introduce a deliberate type error
echo "const bad: number = 'not a number';" >> packages/backend/src/index.ts
git add packages/backend/src/index.ts
git commit -m "test: should fail"
# Commit should be blocked by typecheck failure

# Clean up
git reset HEAD packages/backend/src/index.ts
rm packages/backend/src/index.ts
```

---

### Scenario 9: Shared Config Inheritance

**Requirement**: FR-004, FR-005, FR-006, FR-007, FR-030
**Goal**: Verify packages inherit from shared-infra config

**Steps**:
```bash
# Check TypeScript config inheritance
cat packages/frontend/tsconfig.json
# Should show: "extends": "../shared-infra/tsconfig.json" (or similar)

# Check ESLint config inheritance
cat packages/frontend/eslint.config.js
# Should reference shared-infra config

# Check Prettier config inheritance
cat packages/frontend/.prettierrc.json
# Should reference or extend shared-infra config
```

**Expected Output**:
- ✅ All package configs extend from shared-infra
- ✅ No duplicated configuration
- ✅ Package-specific overrides are minimal and documented

---

### Scenario 10: Task Execution from Package Subdirectories

**Requirement**: FR-031, FR-032
**Goal**: Verify tasks can run from package subdirectories

**Steps**:
```bash
# Navigate to frontend package
cd packages/frontend

# Run tasks from subdirectory
pnpm dev
# Should start only frontend dev server

pnpm typecheck
# Should check only frontend

# Return to root
cd ../..

# Run from root
pnpm dev
# Should start BOTH servers
```

**Expected Output**:
- ✅ Tasks work from both root and package directories
- ✅ Root-level tasks orchestrate across all packages (Turbo)
- ✅ Package-level tasks run for that package only

---

## Success Criteria

All scenarios must pass for the scaffold to be considered complete. If any scenario fails:
1. Document the failure
2. Identify the root cause
3. Fix the configuration or code
4. Re-run the scenario

## Troubleshooting

### Issue: `pnpm install` fails
- **Check**: Is pnpm installed? (`pnpm --version`)
- **Check**: Is Node.js LTS installed? (`node --version`)
- **Check**: Is `pnpm-workspace.yaml` correctly configured?

### Issue: Dev servers don't start
- **Check**: Are ports 5173 and 3000 available?
- **Check**: Does `turbo.json` have `dev` task configured?
- **Check**: Do package.json files have `dev` scripts?

### Issue: TypeScript errors
- **Check**: Does `tsconfig.json` extend from shared-infra?
- **Check**: Are all necessary `@types/*` packages installed?
- **Check**: Is strict mode causing legitimate issues? (expected initially)

### Issue: Git hooks don't run
- **Check**: Is Husky installed? (`ls .husky/`)
- **Check**: Are hooks executable? (`chmod +x .husky/pre-commit`)
- **Check**: Does `.husky/pre-commit` exist and have correct commands?

## Next Steps

After validating the scaffold:
1. Create a feature specification for the first real feature
2. Run `/plan` to generate implementation plan
3. Run `/tasks` to generate task breakdown
4. Begin implementing features on top of this scaffold
