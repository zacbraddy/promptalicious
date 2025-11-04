# Task Execution Patterns

**Last Updated**: 2025-11-04
**Source**: Consolidated from CLAUDE.md and spec 001-project-scaffold-i

This document captures workflow processes, quality gates, debugging protocols, and task planning patterns for promptalicious.

---

## Validation Approach for Infrastructure

**Context**: Infrastructure setup (configs, tooling, workflows) requires different validation than feature development.

**Validation Scenarios** (instead of traditional tests):
1. **Installation**: Can run `pnpm install` successfully?
2. **Development workflows**: Can run `pnpm dev` and see both servers start?
3. **Quality gates**: Can run `pnpm typecheck/lint/format/test` across all packages?
4. **Git hooks**: Do pre-commit hooks enforce quality gates?

**When to Use**:
- Package configurations (package.json, tsconfig.json, turbo.json)
- Build tooling setup (Vite, Turbo, ESLint, Prettier)
- Development workflows (dev servers, test runners)
- Code quality gates (linting, formatting, type checking)

**When NOT to Use** (use traditional TDD instead):
- Business logic implementation
- Data model creation
- API endpoint development
- Frontend component building

**Source**: spec 001-project-scaffold-i (spec.md § Acceptance Scenarios, plan.md § Testing Justification)
**Established**: 2025-11-04

---

## Infrastructure Testing Considerations

**Edge Cases for Monorepo Workflows**:

1. **Task execution from different directories**
   - What happens when running tasks from package subdirectories vs repository root?
   - Solution: Tasks should work from both locations where sensible

2. **Partial failure handling**
   - How does the system handle when one package fails during a multi-package command?
   - Solution: Turbo fail-fast behaviour, clear error messages indicating which package failed

3. **Configuration conflicts**
   - What happens when TypeScript/ESLint/Prettier configurations conflict between shared and local?
   - Solution: Local configs extend shared, shared takes precedence unless explicitly overridden

**Source**: spec 001-project-scaffold-i (spec.md § Edge Cases)
**Established**: 2025-11-04

---

## Infrastructure vs Feature Task Planning

**Infrastructure Spec Task Generation** (different from feature development):

### Foundation Tasks (Sequential)
- Each builds on previous
- Order matters (workspace → packages → orchestration)
- Cannot be parallelised

**Example** (from spec 001):
```
T001: Initialize pnpm workspace structure
T002: Create shared-infra package
T003: Create frontend package
T004: Create backend package
T005: Configure Turbo for orchestration
```

### Configuration Tasks (Parallel after foundation)
- Touch different tools independently
- Can run concurrently once foundation exists
- Mark with [P] for parallel execution

**Example** (from spec 001):
```
T006: Implement TypeScript configuration [P]
T007: Implement ESLint configuration [P]
T008: Implement Prettier configuration [P]
```

### Workflow Tasks (Sequential after configs)
- Build on configuration
- Must run in order

**Example** (from spec 001):
```
T009: Implement root-level development tasks
T010: Implement code quality tasks
T011: Configure Husky pre-commit hooks
```

### Validation Tasks (Final verification)
- Verify all scenarios from spec pass

**Example** (from spec 001):
```
T012: Verify all quickstart.md scenarios pass
```

**Key Differences from Feature Development**:
- No contract test tasks (no API contracts)
- No entity creation tasks (no data models)
- No integration test tasks in traditional sense
- Validation via quickstart scenarios instead of automated tests

**Source**: spec 001-project-scaffold-i (plan.md § Task Planning Approach)
**Established**: 2025-11-04

---

## Constitutional Violation Documentation

**Template** (for when complexity must be justified):

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |

**When to Use**:
- Exceeding simplicity limits (e.g., >3 projects in monorepo)
- Adding architectural patterns that seem like overkill
- Deviating from constitutional principles

**Required Information**:
1. What principle/limit are you violating?
2. Why is this violation necessary for the current task?
3. What simpler approach did you consider?
4. Why was the simpler approach insufficient?

**Source**: spec 001-project-scaffold-i (plan.md § Complexity Tracking)
**Established**: 2025-11-04

---

## Quality Gates Enforcement

**Pre-Commit Quality Gates**:
```bash
pnpm typecheck  # Zero errors (non-negotiable)
pnpm lint       # Zero errors/warnings (use pnpm lint:fix)
pnpm format:check  # Code formatted correctly
```

**Enforcement**:
- Husky pre-commit hook runs all quality gates
- Fail-fast: One error blocks commit
- Fast feedback: < 10 seconds for incremental changes

**When to Skip** (only acceptable reasons):
- Debugging (temporary skip, must be re-enabled)
- Work in progress on feature branch (must pass before merge)

**NEVER Acceptable**:
- Skipping to "make tests pass"
- Skipping because fixing is "too hard"
- Skipping permanently

**Source**: memory/development-protocols.md § Git Hooks, spec 001-project-scaffold-i (research.md § Best Practices)
**Established**: 2025-11-04

---

## Debugging & Escalation Protocol

### Tool Usage Order

1. **First**: Serena (if available) to search existing codebase for similar implementations
2. **Second**: Context7 for framework/library documentation
3. **Third**: Memory files for established patterns (`memory/development-protocols.md`)
4. **Fourth**: Web search for modern best practices

### When Stuck (after ~10 failed attempts)

1. STOP the current approach
2. Explain to the developer:
   - The problem you're trying to solve
   - What you've tried (list attempts)
   - Why each attempt failed
3. Wait for human intervention

### Debugging Temperature

- Keep reasoning temperature LOW
- Work from FACTS (codebase state, error messages, documentation)
- Avoid speculation loops
- Use tools to gather evidence before forming hypotheses

**NEVER** flip parameters randomly "just seeing what happens" - always base attempts on concrete facts from research or documentation.

**Source**: .claude/skills/promptalicious-implementation/SKILL.md § Debugging & Escalation Protocol
**Established**: 2025-11-04

---

## Task Execution Discipline

### Rule 1: Stay on Task
- If task is "Fix all TypeScript errors", fix ALL TypeScript errors
- Do not move to next task because current one is hard
- Do not mark tasks complete when they're not

### Rule 2: Never Skip Tests to "Pass"
- Skipping tests ONLY acceptable for: debugging (temporary), future implementation (justified)
- FORBIDDEN: Skipping tests to report "all tests passing"

### Rule 3: Own the Entire Codebase
- This is greenfield - all code is YOUR code
- Linting errors in files you didn't touch? Still your problem
- Tests failing due to missing implementation? Expected
- Tests failing due to broken code? Your job to fix

### Rule 4: Finish Clean

Before marking task complete:
- Run linting (`pnpm lint`, use `pnpm lint:fix` to auto-fix)
- Run type checking (`pnpm typecheck`)
- Run tests (`pnpm test`)
- Check for errors in files you touched AND didn't touch
- Only mark complete when quality gates pass (or failures justified by project state)

### Rule 5: Surface After Each Task (Dolphin Protocol)

Provide ONE of the following after EVERY task:

**Option 1: Testing Instructions**
- Exact commands to run/test the new capability
- Expected output or behaviour
- Examples:
  - `curl -X POST http://localhost:3000/api/prompts -d '{"name":"test"}'`
  - `pnpm dev` then navigate to http://localhost:5173/prompts
  - `pnpm test:integration` to see new DB schema validation

**Option 2: Deferral Explanation**
- Why it's not testable yet
- Which specific task will make it testable
- Examples:
  - "Backend model exists but needs API endpoint (T012) before testing"
  - "Database migration complete but requires seed data (T008) and API layer (T010-T012) before end-to-end test"

**Critical Rules**:
- If software is runnable but you haven't surfaced in 5+ tasks, you've FAILED the Dolphin principle
- Acceptable deferrals: foundation work (DB schema needs API), 2-3 tightly coupled tasks
- Unacceptable deferrals: "I'll show you when done", "Just trust me", "Would require scaffolding"

**Source**: .claude/skills/promptalicious-implementation/SKILL.md § Task Execution Discipline
**Established**: 2025-11-04

---

## Notes & Reminders

- Always use Context7 BEFORE guessing package APIs
- Always call `mcp__serena__initial_instructions` if Serena available
- Surface after EVERY task (testing instructions or deferral explanation)
- Right-size tests (current task only, not future features)
- Patterns MUST justify existence with concrete benefits
- This is a debugging tool - visibility is paramount

**Source**: CLAUDE.md § Notes & Reminders
**Established**: 2025-11-04
