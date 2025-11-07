---
name: promptalicious-implementation
description: promptalicious-specific implementation patterns including Serena and Context7 MCP activation, pragmatic TDD workflow, and Dolphin-Based Development protocol. Automatically activated for /implement and /audit commands.
---

# promptalicious Implementation Skill

This skill provides promptalicious-specific customisations for implementation and audit workflows.

## Serena MCP Activation (MANDATORY FIRST STEP)

**CRITICAL**: Before implementing ANY task or starting ANY audit:

1. **ALWAYS call `mcp__serena__initial_instructions` FIRST**
2. Wait for the Serena instructions manual to load
3. Then proceed with your task

**This is NOT optional**. Serena provides semantic code analysis (25+ languages) that enables:
- Token-efficient code exploration (no wasteful full-file reads)
- Symbolic code editing (precise, surgical changes)
- Fast codebase pattern searching
- Understanding code relationships and references

**Failure to activate Serena means**:
- Wasting tokens reading entire files unnecessarily
- Missing existing patterns and implementations in the codebase
- Inefficient, slow implementation
- Poor code exploration and understanding

## Context7 MCP Integration

**CRITICAL**: Context7 is your FIRST port of call for framework and library documentation. If you need to make changes to implementation files that use third-party packages:

**You MUST use Context7 when:**
- You don't know FOR SURE the API or SDK functions available
- You're implementing something using a part of the SDK that hasn't been used in the project yet
- You're unsure about parameter shapes or function signatures
- You're working with ANY framework we're using (React, Vite, Vitest, Vercel AI SDK, etc.)

**You MUST NOT:**
- Guess at parameters based on knowledge from other packages or past versions
- Make changes to methods or parameters without FULL knowledge from documentation
- Hand-roll functionality that the package likely provides natively

**You MUST:**
- Check Context7 docs frequently to find better, more optimised functions
- Follow best practices suggested by package documentation
- Prefer package-native implementations over custom code
- Validate your approach against official examples and patterns

## Project Mission: Developer Tool for LLM Debugging

You are building **promptalicious**, a local development tool for debugging and iterating LLM prompts and tool configurations. This fundamentally shapes how we approach development:

### Core Purpose
- Enable developers to configure LLM calls (prompts, tools, system messages)
- Execute calls and observe results with full diagnostics visibility
- Iterate rapidly to achieve reliable, repeatable LLM behaviour
- Translate working configurations into production code with minimal friction

**First Target**: Debug and iterate multistep, tool-enabled calls to GPT-4o-mini using Vercel AI SDK.

### Constitutional Principles (from memory/constitution.md)

Read `memory/constitution.md` for complete governance, but key principles are:

1. **Visibility Above All** - Every action, side effect, and result MUST be observable
   - No silent failures, no hidden state, no magic
   - This is a debugging tool - if users can't see it, we've failed

2. **Good Architecture Without Cargo-Culting** - DDD and Onion Architecture where they solve real problems
   - Domain logic isolated from infrastructure
   - Patterns MUST justify their existence with concrete benefits
   - FORBIDDEN: Abstract factories with single implementations, DI for single consumers, patterns for "professionalism"

3. **Focused Flexibility** - Build for GPT-4o-mini + Vercel AI SDK now, design extension points for future
   - YAGNI for features, design for extension
   - Pluggable LLM providers, SDK adapters, tool types

4. **Dolphin-Based Development** - Surface working software frequently to validate direction
   - After each task: provide testing instructions OR deferral explanation
   - NEVER go 5+ tasks without something runnable
   - See detailed protocol below

## Pragmatic TDD Workflow (Constitutional)

**Core Commitment**: We believe in comprehensive test suites and TDD principles. We reject dogmatic TDD that creates friction.

### RED-GREEN-REFACTOR on Tight Loops
- Tests MUST fail first (RED phase is non-negotiable)
- RED-GREEN-REFACTOR cycle MUST happen **per-task**, not per-spec or per-feature
- Test suites MUST be right-sized: test what you're implementing NOW, not future features

### FORBIDDEN
- Writing 20+ tests before any implementation
- Skipping tests to "fix" test failures
- Implementing before writing a failing test

### REQUIRED
- Test the specific feature you're building now
- Use real dependencies (real Postgres, real LLM calls with fixtures)
- Tests co-located with implementation where sensible

### Good TDD ✅
Task: "Implement user authentication"
- Write failing auth tests
- Implement auth to make tests pass
- Refactor
- Task complete

### Bad TDD ❌
Tasks:
1. "Write all contract tests for entire API" (20 tests)
2. "Write all integration tests for entire API" (30 tests)
3. "Implement API endpoints" (wait 2 days to see if tests are right)

## Dolphin-Based Development Protocol

**The Dolphin Metaphor**: Like dolphins surfacing regularly to breathe, we surface working software frequently to validate direction. We don't stay underwater (heads-down coding) so long that we drown.

### After EVERY Task Completion

Provide ONE of the following:

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

### Critical Rules
- If software is runnable but you haven't surfaced in 5+ tasks, you've FAILED the Dolphin principle
- Acceptable deferrals: foundation work (DB schema needs API), 2-3 tightly coupled tasks
- Unacceptable deferrals: "I'll show you when done", "Just trust me", "Would require scaffolding"

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
- Run tests (`pnpm test:ci` for non-interactive mode, especially during audits)
- Check for errors in files you touched AND didn't touch
- Only mark complete when quality gates pass (or failures justified by project state)

### Rule 5: Surface After Each Task (Dolphin Protocol)
See Dolphin-Based Development section above

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

## Tech Stack Context (as of 2025-11-03)

### Frontend
- Language: TypeScript (latest, strict mode)
- Framework: React (latest)
- Build: Vite (latest)
- Testing: Vitest (latest)

### Backend
- Runtime: Node.js (latest LTS)
- Language: TypeScript (latest, strict mode)
- Database: PostgreSQL (latest)

### Tooling
- Package Manager: pnpm (latest)
- Monorepo: Turbo (latest)
- Linting: ESLint (latest)
- Formatting: Prettier (latest)
- Git Hooks: Husky (latest)

### Quality Gates
All code MUST pass before commit:
1. Type checking: `pnpm typecheck` (zero errors)
2. Linting: `pnpm lint` (zero errors, zero warnings)
3. Formatting: `pnpm format:check` (or auto-format applied)
4. Tests: `pnpm test:ci` (all passing, or failures justified)

**Test Execution**:
- Development: `pnpm test` (interactive watch mode)
- Audits/CI: `pnpm test:ci` (non-interactive, use this for audits to avoid hanging)
- Per-package: `pnpm --filter <package> test:ci`

Husky pre-commit hooks MUST enforce these gates.

## Success Criteria

Your implementation is successful when:

1. Task requirements fully implemented
2. All quality gates pass (typecheck, lint, format, test)
3. Code follows constitutional principles (Visibility, Good Architecture, Focused Flexibility)
4. Dolphin protocol satisfied (testing instructions OR deferral explanation provided)
5. Pragmatic TDD followed (right-sized tests, RED-GREEN-REFACTOR on tight loop)
6. Context7/Serena used appropriately (docs-first, codebase-aware)
7. No reasoning loops - all decisions backed by facts from tools/docs/memory

---

**Remember**: You're building a development tool where visibility is paramount. Every decision should consider: Can developers see what's happening? Are we surfacing frequently enough? Are we using the right patterns for the right reasons? Use Context7 for docs, Serena for codebase analysis, and follow the Dolphin protocol to keep stakeholders confident we're heading in the right direction.
