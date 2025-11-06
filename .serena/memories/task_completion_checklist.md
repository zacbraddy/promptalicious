# Task Completion Checklist

When a task is marked as complete, ensure the following steps are performed:

## 1. Code Quality Gates ✅
Run all quality checks and ensure they pass (in this order):
```bash
pnpm typecheck      # Zero errors (non-negotiable)
pnpm lint           # Zero errors/warnings (use pnpm lint:fix to auto-fix)
pnpm format:check   # Code formatted correctly (if fails, run pnpm format then recheck)
pnpm test           # All passing (or justified failures)
```

**Formatting Protocol**:
- ALWAYS run `pnpm format:check` first
- If it fails, run `pnpm format` to auto-fix
- Then run `pnpm format:check` again to verify
- Never skip this step - formatting must pass before task completion

**Requirements**:
- ✅ Zero TypeScript errors
- ✅ Zero ESLint errors or warnings
- ✅ All files properly formatted
- ✅ Code follows project conventions

**Package-specific commands** (if needed):
```bash
pnpm --filter @promptalicious/backend typecheck
pnpm --filter @promptalicious/backend lint
pnpm --filter @promptalicious/backend format:check
pnpm --filter @promptalicious/backend test
```

## 2. Testing ✅
- Write tests for new functionality (contract tests → integration tests → unit tests)
- Ensure all tests pass: `pnpm test`
- Follow pragmatic TDD: RED-GREEN-REFACTOR per task, not per spec

## 3. Documentation Updates
- Update CLAUDE.md if new patterns or conventions introduced
- Update memory/development-protocols.md for significant architectural decisions
- Do NOT create README or markdown files proactively (only if user requests)

## 4. Git Hygiene
- Ensure .gitignore properly excludes sensitive files
- Verify no credentials or API keys in committed code
- Database files and connection strings must NOT be committed

## 5. Surface to User
After EVERY task, provide:
- Clear summary of what was implemented
- Testing instructions OR explanation of why tests were deferred
- Any decisions made and their rationale
- File locations with line numbers (e.g., `SettingsForm.tsx:150`)

## 6. Patterns Verification
- ✅ TanStack Query used for ALL API calls (never direct fetch/axios in components)
- ✅ Import paths use `@/` alias when shorter
- ✅ Error handling in container components, not presentation components
- ✅ No comments generated in code (unless user explicitly requests)
- ✅ No emojis in code (unless user explicitly requests)

## 7. DrizzleORM Specific
If database changes were made:
- ✅ Migration generated via `drizzle-kit generate --name=descriptive_name`
- ✅ Never manually edited migration files
- ✅ Migration applied and tested

## Critical Rules
- **NEVER** bypass quality gates
- **NEVER** skip `pnpm format:check` - it must pass before task completion
- **NEVER** suggest that the developer commit code that doesn't pass all quality gates
- **NEVER** commit code yourself, this is for the developer to do not you
- **ALWAYS** use TanStack Query for API calls
- **ALWAYS** use `@latest` when adding packages
- **ALWAYS** provide task completion summary to user
