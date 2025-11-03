# promptalicious - Development Context

**Project**: Local development tool for debugging and iterating LLM prompts and tool configurations
**First Target**: Debug multistep, tool-enabled calls to GPT-4o-mini using Vercel AI SDK
**Last Updated**: 2025-11-03

---

## Quick Reference

### Project Mission
Enable developers to:
- Configure LLM calls (prompts, tools, system messages)
- Execute calls and observe results with full diagnostics
- Iterate rapidly to achieve reliable, repeatable LLM behaviour
- Translate working configurations into production code with minimal friction

### Tech Stack (2025-11-03)
- **Frontend**: TypeScript, React, Vite, Vitest
- **Backend**: Node.js (LTS), TypeScript, PostgreSQL
- **Tooling**: pnpm, Turbo, ESLint, Prettier, Husky
- **Target**: GPT-4o-mini + Vercel AI SDK (first iteration)

### Quality Gates
```bash
pnpm typecheck  # Zero errors
pnpm lint       # Zero errors/warnings (use pnpm lint:fix)
pnpm format
pnpm test       # All passing (or justified failures)
```

### Package Installation Protocol
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

### Key Principles (from Constitution v1.1.0)
1. **Visibility Above All** - Everything observable, no silent failures
2. **Good Architecture Without Cargo-Culting** - DDD/Onion where they solve problems
3. **Focused Flexibility** - Build for GPT-4o-mini now, design for extension
4. **Dolphin-Based Development** - Surface working software frequently (5-task max)

---

## Documentation Structure

Extract Location: docs/{topic}.md
Best for: Most projects, straightforward organization
Usage: Detailed guides (>50 lines) → docs/feature-name.md, summaries stay in CLAUDE.md

---

## Constitutional Compliance

### Visibility Principle
- All LLM calls display: prompt, tools, tokens, response, execution time
- Tool executions show: inputs, outputs, errors, execution order
- File operations traceable: which files loaded, what code extracted
- Configuration changes immediately reflected in UI
- Error states explicit with actionable context

### Architecture Principle
- Domain logic isolated from infrastructure (Onion Architecture)
- Dependencies point inward
- Modules have clear boundaries and responsibilities
- Patterns justify existence with concrete benefits
- **Forbidden**: Abstract factories (single impl), DI (single consumer), patterns for "professionalism"

### Flexibility Principle
- First iteration: GPT-4o-mini, Vercel AI SDK, tool-based workflows, multistep calls
- Architecture allows: pluggable LLM providers, multiple SDK adapters, extensible tool types
- Extension via: new module implementation, minimal config, zero rewrites

### Dolphin Protocol
- After each task: testing instructions OR deferral explanation
- Never >5 tasks without something runnable
- See `.claude/skills/promptalicious-implementation/SKILL.md` for full protocol

---

## Pragmatic TDD Workflow

### RED-GREEN-REFACTOR (Tight Loop)
- Tests MUST fail first (RED is non-negotiable)
- Cycle happens **per-task**, not per-spec/feature/project
- Test what you're implementing NOW, not future features

### Test Hierarchy
1. Contract tests (API shape, request/response schemas)
2. Integration tests (real dependencies, user workflows)
3. End-to-end tests (full system validation)
4. Unit tests (complex logic, edge cases)

### Forbidden
- Writing 20+ tests before implementation
- Skipping tests to "fix" failures
- Implementing before writing failing test

### Required
- Use real dependencies (real Postgres, real LLM calls with fixtures)
- Tests co-located with implementation where sensible
- Right-sized test suites (current task only)

---

## Current Architectural Decisions

<!--
This section grows during spec implementation.
Use /coalesce-knowledge after spec completion to promote stable decisions to memory/skills.
Document decisions here as they're made - don't wait for end of spec.
-->

### Development Workflow Established
- Constitution v1.1.0 ratified (2025-11-03)
- Four core principles established (see above)
- Pragmatic TDD approach defined (tight loop, right-sized tests)
- Dolphin-Based Development protocol active

<!-- Add new architectural decisions below as spec progresses -->

---

## Active Spec Progress

<!-- Update this section as you work through features -->

**Current Spec**: None (project setup phase)
**Status**: Foundation - Constitution ratified, skill created, CLAUDE.md initialized

**Next Steps**:
1. Install Serena MCP
2. Begin feature specification for first iteration (GPT-4o-mini debugging interface)
3. Run `/specify` to create first spec

---

## Recent Changes

<!-- Keep last 3-5 significant changes, remove older ones -->

1. **2025-11-03**: Constitution v1.1.0 ratified
   - Added Dolphin-Based Development principle
   - Established pragmatic TDD workflow
   - Defined tech stack and quality gates

2. **2025-11-03**: promptalicious-implementation skill created
   - Context7/Serena MCP integration protocols
   - Task execution discipline rules
   - Debugging and escalation protocols

3. **2025-11-03**: CLAUDE.md initialized
   - Documentation structure configured (Option 2: /docs/)
   - Quick reference established
   - Ready for spec-driven development

---

## MCP Tools Available

### Context7
- **Purpose**: Framework and library documentation (FIRST port of call)
- **When**: Any third-party package usage, SDK uncertainty, parameter validation
- **Critical**: MUST use before guessing API shapes or parameter structures

### Serena
- **Purpose**: Semantic code analysis (25+ languages)
- **When**: Searching codebase for patterns, symbolic code exploration
- **Setup**: Requires `mcp__serena__initial_instructions` call before use

---

## Project Health Metrics

<!-- Update periodically -->

**Code Quality**:
- TypeScript strict mode: ✅ Enabled
- Linting: ✅ Configured (ESLint)
- Formatting: ✅ Configured (Prettier)
- Git hooks: ✅ Configured (Husky)
- Tests: ⏳ Pending (no code yet)

**Constitutional Compliance**:
- Visibility: ✅ Principle established
- Architecture: ✅ Principle established
- Flexibility: ✅ Principle established
- Dolphin: ✅ Principle established

**Dolphin Surfacing**:
- Last runnable state: N/A (no code yet)
- Tasks since last surface: 0
- Status: ✅ Compliant

---

## Memory Files Reference

For complete context, see:
- `memory/constitution.md` - v1.1.0 (core principles, governance)
- `memory/development-protocols.md` - Tech stack, patterns (to be created during first spec)
- `memory/program_overview.md` - Business context, vision (to be created during first spec)
- `memory/task-execution-patterns.md` - Workflow, quality gates (to be created during first spec)

---

## Notes & Reminders

- Always use Context7 BEFORE guessing package APIs
- Always call `mcp__serena__initial_instructions` if Serena available
- Surface after EVERY task (testing instructions or deferral explanation)
- Right-size tests (current task only, not future features)
- Patterns MUST justify existence with concrete benefits
- This is a debugging tool - visibility is paramount

---

**Last Coalesced**: Never (initial setup)
**Next Coalesce**: After first spec completion (>90% tasks) or if CLAUDE.md exceeds 800 lines
