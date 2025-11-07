# Suggested Commands

## Development
```bash
# Start all dev servers (frontend + backend in parallel)
pnpm dev

# Start specific package dev server
pnpm --filter @promptalicious/frontend dev
pnpm --filter @promptalicious/backend dev
```

## Quality Gates (Run Before Commit AND Before Marking Task Complete)
```bash
# Run all quality gates in order (MANDATORY)
pnpm typecheck && pnpm lint && pnpm format:check && pnpm test

# Type checking (zero errors required)
pnpm typecheck
pnpm --filter @promptalicious/frontend typecheck
pnpm --filter @promptalicious/backend typecheck

# Linting (zero errors/warnings required)
pnpm lint
pnpm lint:fix  # Auto-fix issues
pnpm --filter @promptalicious/frontend lint

# Formatting (MANDATORY - must pass before task completion)
pnpm format:check   # Check formatting without modifying (run this FIRST)
pnpm format         # Format all files (run if format:check fails)
# Then run format:check again to verify

# Formatting Protocol:
# 1. Run pnpm format:check
# 2. If it fails, run pnpm format
# 3. Run pnpm format:check again to verify
# 4. Never skip this - must pass before task completion
```

## Testing
```bash
# Run all tests
pnpm test

# Run frontend tests
pnpm --filter @promptalicious/frontend test

# Run backend tests
pnpm --filter @promptalicious/backend test
pnpm --filter @promptalicious/backend test:ci  # Unit tests only

# Run tests in watch mode
pnpm --filter @promptalicious/frontend test:watch
```

## Building
```bash
# Build all packages
pnpm build

# Build specific package
pnpm --filter @promptalicious/frontend build
pnpm --filter @promptalicious/backend build
```

## Database (DrizzleORM)
```bash
# Generate migration (NEVER edit migration files manually!)
pnpm --filter @promptalicious/backend exec drizzle-kit generate --name=description_here

# Apply migrations (development)
pnpm --filter @promptalicious/backend exec drizzle-kit push

# Drop migration (if needed before applying)
pnpm --filter @promptalicious/backend exec drizzle-kit drop
```

## Package Management
```bash
# Add dependency (ALWAYS use @latest)
pnpm --filter @promptalicious/frontend add package-name@latest
pnpm --filter @promptalicious/backend add -D package-name@latest
pnpm add -D package-name@latest  # Root level

# Check for outdated packages
pnpm outdated -r
```

## Git Workflow
```bash
# Pre-commit hooks run automatically via Husky
# (runs typecheck, lint, format:check, test:ci)

# Commit changes
git add .
git commit -m "feat: description"

# Push changes
git push
```

## Spec-Driven Development
```bash
# Create new feature spec
/specify

# Plan feature implementation
/plan

# Generate tasks from plan
/tasks

# Implement specific task(s)
/implement T001        # Single task
/implement T001-T005   # Range
/implement T001, T003  # Multiple tasks

# Audit completed tasks
/audit T001
/audit T001-T005
```

## System Commands (Linux)
```bash
# File operations (prefer Serena tools when coding with AI)
ls -la
find . -name "*.ts"
grep -r "pattern" .

# Git
git status
git diff
git log --oneline -10
```
