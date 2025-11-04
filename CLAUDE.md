# promptalicious - Development Context

**Project**: Local development tool for debugging and iterating LLM prompts and tool configurations
**First Target**: Debug multistep, tool-enabled calls to GPT-4o-mini using Vercel AI SDK
**Last Updated**: 2025-11-04

---

## Quick Reference

### Project Mission

See `memory/program_overview.md` for complete vision and user value proposition.

**Summary**: Enable developers to configure, execute, and iterate on LLM calls with full diagnostic visibility, then translate working configurations into production code.

### Tech Stack (2025-11-03)

See `memory/development-protocols.md` for complete stack details and rationales.

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

### Before Any Code Work - MCP Activation Checklist

**MANDATORY FIRST STEPS**:
1. ✅ Serena available? → Call `mcp__serena__initial_instructions`
2. ✅ Need framework docs? → Use Context7 MCP (`mcp__context7__resolve-library-id` then `mcp__context7__get-library-docs`)

**Why this matters**:
- **Serena**: Semantic code analysis prevents wasteful file reads, enables symbolic editing
- **Context7**: Latest documentation prevents guessing at APIs

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

### Privacy & Open Source Protocol

**CRITICAL**: This is an open-source project. All files checked into this repository MUST NOT contain:

❌ **FORBIDDEN in committed files**:
- Personal names or identifying information
- Absolute file paths revealing machine architecture
- References to other projects on the developer's machine
- Workplace names or employer details
- Local machine usernames or directory structures
- Any personally identifiable information (PII)

✅ **ALLOWED**:
- Generic example paths: `/path/to/project`, `~/projects/app`
- Role-based references: "the developer", "users", "team"
- Generic locations: "local machine", "development environment"

**When documenting**:
- Use relative paths from repository root (e.g., `specs/002-make-a-call/`)
- Use placeholders for examples (e.g., `<username>`, `<project-name>`)
- Sanitise any copy-pasted content before committing

### Key Principles (from Constitution v1.1.0)

See `memory/constitution.md` for complete principles and governance.

1. **Visibility Above All** - Everything observable, no silent failures
2. **Good Architecture Without Cargo-Culting** - DDD/Onion where they solve problems
3. **Focused Flexibility** - Build for GPT-4o-mini now, design for extension
4. **Dolphin-Based Development** - Surface working software frequently (5-task max)

---

## Documentation Structure

Extract Location: docs/{topic}.md
Best for: Most projects, straightforward organisation
Usage: Detailed guides (>50 lines) → docs/feature-name.md, summaries stay in CLAUDE.md

---

## Active Spec Progress

**Current Spec**: None (spec 001-project-scaffold-i complete ✅)
**Status**: Ready for next feature specification

**Next Steps**:
1. Begin feature specification for first iteration (GPT-4o-mini debugging interface)
2. Run `/specify` to create spec

---

## Recent Changes

1. **2025-11-04**: Knowledge coalesced from spec 001-project-scaffold-i
   - Created memory files: development-protocols.md, program_overview.md, task-execution-patterns.md
   - Created docs/architectural-decisions.md
   - Reduced CLAUDE.md from 247 to ~150 lines
   - Fixed Serena activation protocol (now mandatory in Quick Reference)

2. **2025-11-03**: Constitution v1.1.0 ratified
   - Added Dolphin-Based Development principle
   - Established pragmatic TDD workflow
   - Defined tech stack and quality gates

3. **2025-11-03**: promptalicious-implementation skill created
   - Context7/Serena MCP integration protocols
   - Task execution discipline rules
   - Debugging and escalation protocols

---

## Notes & Reminders

- Always use Context7 BEFORE guessing package APIs
- Always call `mcp__serena__initial_instructions` if Serena available
- Surface after EVERY task (testing instructions or deferral explanation)
- Right-size tests (current task only, not future features)
- Patterns MUST justify existence with concrete benefits
- This is a debugging tool - visibility is paramount

---

**Last Coalesced**: 2025-11-04 (spec 001-project-scaffold-i complete)
**Next Coalesce**: After next spec completion (>90% tasks) or if CLAUDE.md exceeds 800 lines

---

## For Complete Context

See memory files for detailed information:
- `memory/constitution.md` - v1.1.0 (core principles, governance)
- `memory/development-protocols.md` - Tech stack, patterns, quality standards
- `memory/program_overview.md` - Business context, vision, target audience
- `memory/task-execution-patterns.md` - Workflow, quality gates, debugging protocols
- `docs/architectural-decisions.md` - Significant architectural decisions with rationales
