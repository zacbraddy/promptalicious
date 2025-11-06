# Suggested Commands

## Development
```bash
# Start all dev servers (frontend + backend in parallel)
pnpm dev

# Start specific package dev server
pnpm --filter @promptalicious/frontend dev
pnpm --filter @promptalicious/backend dev
```

## Quality Gates (Run Before Commit)
```bash
# Run all quality gates
pnpm typecheck && pnpm lint && pnpm format:check

# Type checking (zero errors required)
pnpm typecheck
pnpm --filter @promptalicious/frontend typecheck
pnpm --filter @promptalicious/backend typecheck

# Linting (zero errors/warnings required)
pnpm lint
pnpm lint:fix  # Auto-fix issues
pnpm --filter @promptalicious/frontend lint

# Formatting
pnpm format       # Format all files
pnpm format:check # Check formatting without modifying
```

## Testing
```bash
# Run all tests
pnpm test

# Run frontend tests
pnpm --filter @promptalicious/frontend test

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
# (runs typecheck, lint, format:check)

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
