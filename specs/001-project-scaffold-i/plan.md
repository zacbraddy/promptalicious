# Implementation Plan: Project Scaffold

**Branch**: `001-project-scaffold-i` | **Date**: 2025-11-03 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/001-project-scaffold-i/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → If not found: ERROR "No feature spec at {path}"
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → Detect Project Type from context (web=frontend+backend, mobile=app+api)
   → Set Structure Decision based on project type
3. Evaluate Constitution Check section below
   → If violations exist: Document in Complexity Tracking
   → If no justification possible: ERROR "Simplify approach first"
   → Update Progress Tracking: Initial Constitution Check
4. Execute Phase 0 → research.md
   → If NEEDS CLARIFICATION remain: ERROR "Resolve unknowns"
5. Execute Phase 1 → contracts, data-model.md, quickstart.md, agent-specific template file (e.g., `CLAUDE.md` for Claude Code, `.github/copilot-instructions.md` for GitHub Copilot, or `GEMINI.md` for Gemini CLI).
6. Re-evaluate Constitution Check section
   → If new violations: Refactor design, return to Phase 1
   → Update Progress Tracking: Post-Design Constitution Check
7. Plan Phase 2 → Describe task generation approach (DO NOT create tasks.md)
8. STOP - Ready for /tasks command
```

**IMPORTANT**: The /plan command STOPS at step 7. Phases 2-4 are executed by other commands:
- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary
Scaffold a monorepo structure with pnpm workspaces and Turbo orchestration. Create three packages: shared infrastructure (centralised TypeScript/ESLint/Prettier configs), frontend (React + Vite), and backend (Node.js + TypeScript). Implement root-level development tasks (`dev`, `test`, `lint`, `format`, `typecheck`, `build`) that cascade across all packages, with Husky git hooks enforcing code quality gates.

## Technical Context
**Language/Version**: TypeScript (latest), Node.js (latest LTS)
**Primary Dependencies**: pnpm (workspaces), Turbo (build orchestration), React, Vite, Vitest, ESLint, Prettier, Husky
**Storage**: N/A (infrastructure setup only)
**Testing**: Vitest (frontend), Node.js native test runner or Vitest (backend)
**Target Platform**: Local developer machine (macOS/Linux/Windows)
**Project Type**: web (frontend + backend)
**Performance Goals**: N/A (development tooling - responsiveness not critical)
**Constraints**: All tasks must run from repository root, configuration must be centralised in shared package
**Scale/Scope**: 3 packages (shared-infra, frontend, backend), ~10 root-level tasks, multi-package orchestration

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Simplicity**:
- Projects: 3 (shared-infra, frontend, backend) ✅ At max but justified
- Using framework directly? ✅ Yes (React, Vite, no wrappers)
- Single data model? N/A (infrastructure only, no data entities)
- Avoiding patterns? ✅ Yes (no Repository/UoW - infrastructure setup)

**Architecture**:
- EVERY feature as library? ⚠️ DEFERRED - This IS the scaffold that will support that pattern
- Libraries listed: N/A (will be established post-scaffold)
- CLI per library: N/A (infrastructure only)
- Library docs: N/A (no libraries yet)

**Testing (NON-NEGOTIABLE)**:
- RED-GREEN-Refactor cycle enforced? ⚠️ SPECIAL CASE - Infrastructure validation
- Git commits show tests before implementation? ⚠️ SPECIAL CASE - See below
- Order: Contract→Integration→E2E→Unit strictly followed? ⚠️ SPECIAL CASE
- Real dependencies used? ✅ Yes (when applicable - real pnpm, real turbo, real tooling)
- Integration tests for: new libraries, contract changes, shared schemas? ⚠️ See below
- FORBIDDEN: Implementation before test, skipping RED phase - ⚠️ SPECIAL CASE

**Testing Justification for Infrastructure Spec**:
This is a foundational infrastructure spec with no business logic or data entities. "Tests" are validation scenarios:
- Can run `pnpm install` successfully?
- Can run `pnpm dev` and see both servers start?
- Can run `pnpm typecheck/lint/format/test` across all packages?
- Do quality gates enforce via git hooks?

Traditional RED-GREEN-REFACTOR applies once we build features on this scaffold. For this spec:
- Implementation = package.json configs, turbo.json, tsconfig hierarchies
- "Tests" = manual verification scenarios documented in quickstart.md
- Each task will include verification steps

**Observability**:
- Structured logging included? N/A (infrastructure setup, no application code yet)
- Frontend logs → backend? N/A (no application logic yet)
- Error context sufficient? ✅ Yes (tooling output will show clear errors)

**Versioning**:
- Version number assigned? ✅ Yes (will be in package.json files)
- BUILD increments on every change? ⚠️ DEFERRED until feature development
- Breaking changes handled? N/A (initial setup)

## Project Structure

### Documentation (this feature)
```
specs/[###-feature]/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
```
# Option 1: Single project (DEFAULT)
src/
├── models/
├── services/
├── cli/
└── lib/

tests/
├── contract/
├── integration/
└── unit/

# Option 2: Web application (when "frontend" + "backend" detected)
backend/
├── src/
│   ├── models/
│   ├── services/
│   └── api/
└── tests/

frontend/
├── src/
│   ├── components/
│   ├── pages/
│   └── services/
└── tests/

# Option 3: Mobile + API (when "iOS/Android" detected)
api/
└── [same as backend above]

ios/ or android/
└── [platform-specific structure]
```

**Structure Decision**: Option 2 (Web application) - frontend + backend + shared-infra packages

## Phase 0: Outline & Research
1. **Extract unknowns from Technical Context** above:
   - For each NEEDS CLARIFICATION → research task
   - For each dependency → best practices task
   - For each integration → patterns task

2. **Generate and dispatch research agents**:
   ```
   For each unknown in Technical Context:
     Task: "Research {unknown} for {feature context}"
   For each technology choice:
     Task: "Find best practices for {tech} in {domain}"
   ```

3. **Consolidate findings** in `research.md` using format:
   - Decision: [what was chosen]
   - Rationale: [why chosen]
   - Alternatives considered: [what else evaluated]

**Output**: research.md with all NEEDS CLARIFICATION resolved

## Phase 1: Design & Contracts
*Prerequisites: research.md complete*

1. **Extract entities from feature spec** → `data-model.md`:
   - Entity name, fields, relationships
   - Validation rules from requirements
   - State transitions if applicable

2. **Generate API contracts** from functional requirements:
   - For each user action → endpoint
   - Use standard REST/GraphQL patterns
   - Output OpenAPI/GraphQL schema to `/contracts/`

3. **Generate contract tests** from contracts:
   - One test file per endpoint
   - Assert request/response schemas
   - Tests must fail (no implementation yet)

4. **Extract test scenarios** from user stories:
   - Each story → integration test scenario
   - Quickstart test = story validation steps

5. **Update agent file incrementally** (O(1) operation):
   - Run `/scripts/update-agent-context.sh [claude|gemini|copilot]` for your AI assistant
   - If exists: Add only NEW tech from current plan
   - Preserve manual additions between markers
   - Update recent changes (keep last 3)
   - Keep under 150 lines for token efficiency
   - Output to repository root

**Output**: data-model.md, /contracts/*, failing tests, quickstart.md, agent-specific file

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy for Infrastructure Spec**:

Since this is an infrastructure setup (not feature development), task generation differs from typical TDD workflow:

1. **Foundation Tasks** (Sequential - each builds on previous):
   - T001: Initialize pnpm workspace structure
   - T002: Create shared-infra package with base configurations
   - T003: Create frontend package with Vite + React scaffold
   - T004: Create backend package with Node + TypeScript scaffold
   - T005: Configure Turbo for multi-package orchestration

2. **Configuration Tasks** (Can be parallelized after foundation):
   - T006: Implement TypeScript configuration hierarchy [P]
   - T007: Implement ESLint configuration with shared rules [P]
   - T008: Implement Prettier configuration [P]

3. **Development Workflow Tasks** (Sequential - depend on configs):
   - T009: Implement root-level development tasks (dev, build, test)
   - T010: Implement code quality tasks (typecheck, lint, format)
   - T011: Configure Husky pre-commit hooks

4. **Validation Tasks** (Final verification):
   - T012: Verify all quickstart.md scenarios pass

**Ordering Strategy**:
- Foundation → Configuration → Workflows → Validation
- Mark [P] for tasks that touch different packages independently
- Configuration tasks can be parallel (different tool configs)
- Workflow tasks must be sequential (each builds on previous)

**Testing Approach for Infrastructure**:
- Traditional TDD doesn't apply (no domain logic to test)
- Instead: Each task includes verification steps (manual or scripted)
- Final task (T012) validates all scenarios from quickstart.md
- Success = all scenarios pass, all quality gates work

**Estimated Output**: 12-15 numbered, ordered tasks in tasks.md

**Key Differences from Feature Development**:
- No contract test tasks (no API contracts)
- No entity creation tasks (no data models)
- No integration test tasks in traditional sense
- Validation via quickstart scenarios instead of automated tests

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)  
**Phase 4**: Implementation (execute tasks.md following constitutional principles)  
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |


## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command) - data-model.md, quickstart.md created (no contracts for infrastructure spec)
- [x] Phase 2: Task planning complete (/plan command - approach described, ready for /tasks command)
- [x] Phase 3: Tasks generated (/tasks command) - 12 tasks created in tasks.md
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS (infrastructure spec with justified testing approach)
- [x] Post-Design Constitution Check: PASS (no new violations introduced)
- [x] All NEEDS CLARIFICATION resolved (Technical Context complete)
- [x] Complexity deviations documented (N/A - no violations requiring documentation)

---
*Based on Constitution v1.1.0 - See `memory/constitution.md`*