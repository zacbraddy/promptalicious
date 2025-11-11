# Implementation Plan: Core Tool Integration System

**Branch**: `003-introduce-tooling-now` | **Date**: 2025-11-10 | **Spec**: [spec.md](/home/zacbraddy/Projects/Personal/promptalicious/specs/003-introduce-tooling-now/spec.md)
**Input**: Feature specification from `/home/zacbraddy/Projects/Personal/promptalicious/specs/003-introduce-tooling-now/spec.md`

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

Introduce LLM tool integration capabilities to promptalicious, enabling developers to connect their existing codebases containing tool implementations, configure tools, and execute prompts with tool support while observing detailed diagnostics. This feature establishes the foundation for tool discovery (with comprehensive observability), workspace management (inside promptalicious repo), hook system, execution, and basic export functionality. Includes project naming, manual rescan, and real-time discovery feedback for full visibility into the integration process.

## Technical Context

**Language/Version**: TypeScript (latest, strict mode) + Node.js (latest LTS)
**Primary Dependencies**: Vercel AI SDK (`ai` package), React, Vite, PostgreSQL, DrizzleORM, TanStack Query
**Storage**: PostgreSQL (tool configurations, project settings), in-memory execution diagnostics (tool invocations returned in ExecutionResult, database persistence deferred to feature 004)
**Testing**: Vitest (contract → integration → E2E → unit)
**Target Platform**: Local developer machine (macOS/Linux/Windows) - web application
**Project Type**: Web (frontend + backend monorepo)
**Performance Goals**: Tool discovery <10s for typical projects (<1000 files), execution diagnostics <1s update latency, real-time discovery log updates <500ms
**Constraints**: Single-user local tool, single project support (multi-project deferred to feature 004), AI SDK only (multi-SDK deferred to feature 005+), workspace stored inside promptalicious repo (user's project untouched)
**Scale/Scope**: Local development tool, typical project size ~1000 files, single concurrent execution
**Key Features**: Project naming, manual tool rescan, real-time discovery progress with structured logging, workspace in promptalicious repo

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

**Simplicity**:

- Projects: 3 (shared-infra, frontend, backend) ✅
- Using framework directly? Yes (React, Express/Fastify, Vercel AI SDK) ✅
- Single data model? Yes (no DTOs initially, API contracts = domain models) ✅
- Avoiding patterns? Yes (no Repository/UoW/Service Layer unless specific need identified) ✅

**Architecture**:

- EVERY feature as library? No (approved deferral per constitution.md § Approved Complexity Deferrals - extract after 2-3 specs) ✅
- Libraries listed: N/A (deferral approved)
- CLI per library: N/A (deferral approved)
- Library docs: N/A (deferral approved)

**Testing (NON-NEGOTIABLE)**:

- RED-GREEN-Refactor cycle enforced? ✅ Yes (per-task, not per-spec)
- Git commits show tests before implementation? ✅ Yes (Husky enforces)
- Order: Contract→Integration→E2E→Unit strictly followed? ✅ Yes
- Real dependencies used? ✅ Yes (real PostgreSQL, real filesystem operations, real Vercel AI SDK calls with fixtures)
- Integration tests for: new libraries, contract changes, shared schemas? ✅ Yes
- FORBIDDEN: Implementation before test, skipping RED phase ✅ Acknowledged

**Observability**:

- Structured logging included? Yes (backend logs tool discovery, execution, errors)
- Frontend logs → backend? No (browser console only, approved deferral per constitution.md § Approved Complexity Deferrals)
- Error context sufficient? Yes (detailed diagnostics for all failure modes per spec FR-020)

**Versioning**:

- Version number assigned? Yes (0.3.0 - MINOR bump for new feature)
- BUILD increments on every change? Yes (will increment to 0.3.0 after spec completion)
- Breaking changes handled? N/A (additive feature, no breaking changes to existing API)

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

**Structure Decision**: Option 2 (Web application) - frontend + backend monorepo structure already established

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

_Prerequisites: research.md complete_

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

**Output**: data-model.md, /contracts/\*, failing tests, quickstart.md, agent-specific file

## Phase 2: Task Planning Approach

_This section describes what the /tasks command will do - DO NOT execute during /plan_

**Task Generation Strategy**:

1. **Foundation Tasks** (Database & Shared Types):
   - Database migration tasks for new tables (project_configuration, tools, tool_invocations)
   - Database migration task to extend execution_results table
   - Shared type definitions in shared-infra package (ProjectConfiguration, ToolDefinition, etc.)

2. **Backend Package Creation** (new @promptalicious/debug):
   - Package scaffolding
   - capturelicious() function implementation
   - Capture enable/disable/get/clear functions

3. **Backend Core Implementation**:
   - Project Configuration API (GET /api/project, PUT /api/project)
   - Tool Discovery Service (ts-morph integration, scope analysis for hook params)
   - Workspace Generator Service (create directory structure, generate hook stubs, tsconfig.json)
   - Tools API (GET /api/tools, GET /api/tools/:id, PATCH /api/tools/:id, POST /api/tools/discover)
   - Hook Execution Service (load and execute hooks, context merging)
   - SDK Adapter Interface + Vercel AI SDK implementation
   - Extend Execution Service to integrate tools
   - Tool Invocations API (GET /api/execute/:id/tools)
   - Export Service (template-based markdown generation)
   - Export API (POST /api/export)

4. **Frontend UI Implementation**:
   - Settings page extension (Project Configuration section with folder picker)
   - Tools page (list view, enable/disable toggles)
   - Tool detail modal (view/edit description, parameters, hooks, workspace link)
   - Advanced Options section on Execute page (toolChoice, maxToolRoundtrips, etc.)
   - Tool diagnostics display on Execute page (invocations, debug output, timing, errors)
   - Export instructions modal (markdown display, copy/download)
   - API client extensions for new endpoints
   - TanStack Query hooks for tools, project config, export

5. **Contract Tests** (TDD - RED phase):
   - Project Configuration API contract tests
   - Tools API contract tests
   - Extended Execution API contract tests
   - Export API contract tests

6. **Integration Tests**:
   - End-to-end user journey tests (based on quickstart scenarios)
   - Tool discovery integration test (real ts-morph, real test project)
   - Workspace generation integration test
   - Hook execution integration test
   - Tool execution with diagnostics integration test

**Ordering Strategy** (Tight RED-GREEN-REFACTOR Cycles):

Each feature follows: Contract Test → Implementation → Surface/Test → Next Feature

- **Group 1: Foundation** [P]
  - Database migrations (project_configuration, tools, tool_invocations, extend execution_results)
  - Shared types in shared-infra
  - **Surface**: `pnpm db:migrate && pnpm db:status` shows new tables

- **Group 2: Project Configuration & Discovery** (async tool discovery with observability)
  - Contract test: PUT /api/project (returns 202, starts async discovery)
  - Implement: Project Config API
  - Contract test: GET /api/project/discovery/status (polling endpoint)
  - Implement: Discovery Status Service (track progress, incremental logs)
  - Contract test: POST /api/project/discovery/cancel (cleanup endpoint)
  - Implement: Discovery Cancel Service (abort + cleanup)
  - Implement: Tool Discovery Service (ts-morph integration, emits progress events)
  - Implement: Workspace Generator Service (emits filesystem events)
  - **Surface**: `curl -X PUT /api/project` → 202 response, poll status → workspace created, tools discovered

- **Group 3: Tools Management**
  - Contract test: GET /api/tools
  - Implement: Tools API (list)
  - Contract test: GET /api/tools/:id
  - Implement: Tools API (detail)
  - Contract test: PATCH /api/tools/:id
  - Implement: Tools API (update)
  - **Surface**: `curl /api/tools` → see discovered tools, `curl -X PATCH` → update tool description

- **Group 4: @promptalicious/debug Package** [P - independent]
  - Package scaffolding + capturelicious() implementation + tests
  - **Surface**: Import and use in test file, verify captures work

- **Group 5: Tool Execution** (extends existing execution flow, in-memory diagnostics)
  - Contract test: Extended POST /api/execute (with advancedOptions)
  - Implement: SDK Adapter Interface + Vercel AI SDK adapter
  - Implement: Hook Execution Service
  - Implement: Extended Execution Service (integrate tools, collect diagnostics in-memory, return in ExecutionResult)
  - **Surface**: `curl -X POST /api/execute` with tools → LLM calls tools, diagnostics returned in response (no database persistence)

- **Group 6: Export**
  - Contract test: POST /api/export
  - Implement: Export Service + Export API
  - **Surface**: `curl -X POST /api/export` → markdown instructions generated

- **Group 7: Frontend - Project & Tools** [P after backend APIs ready]
  - Settings page: Project Config section + folder picker (with project name field)
  - Discovery Progress Modal (polling, real-time logs, progress counters)
  - Discovery Modal: Cancel button with confirmation warning
  - Discovery Modal: OK button enabled when complete/cancelled
  - **Surface**: Configure project in browser, see discovery modal with real-time progress
  - Tools page: List view + enable/disable
  - Tool detail modal: View/edit description
  - **Surface**: Browse tools, toggle enabled, edit descriptions

- **Group 8: Frontend - Execution & Diagnostics** [P]
  - Execute page: Advanced Options section
  - Execute page: Tool diagnostics display
  - **Surface**: Execute with tools, see diagnostics, debug output

- **Group 9: Frontend - Export** [P]
  - Export modal: Display markdown, copy/download
  - **Surface**: Click export, see instructions

- **Group 10: Integration Tests** (validate end-to-end)
  - User journey tests (project config → discovery → execution → export)
  - **Surface**: All integration tests pass, quickstart scenarios work

- **Group 11: Documentation** (user-facing docs for new features in spec 003 ONLY)
  - Update README.md: Add tool integration to "Current capabilities" section
  - Create docs/features/tool-integration.md: Overview of tool discovery, configuration, execution
  - Create docs/features/workspace-setup.md: IDE setup (workspace tsconfig auto-detection), editing hooks with IntelliSense
  - Create docs/features/hooks.md: Hook system (beforeAll, beforeEach, afterEach, afterAll) with examples
  - Update docs/api/api-contracts.md: Add project config, tools, export endpoints, ExecutionResult.toolInvocations
  - Update docs/backend/database.md: Add new tables (project_configuration, tools) - NOTE: tool_invocations deferred to feature 004
  - Create docs/troubleshooting/tools.md: Common issues (discovery failures, hook errors, import problems)
  - **Surface**: All docs complete, users can understand and use spec 003 features (NO mention of future specs)

**TDD Discipline**:

- Write contract test immediately before implementation (tight RED-GREEN loop)
- Never batch tests - each test lives with its implementation task
- Surface working software after each group (max 5-10 tasks)
- Tests use real dependencies (PostgreSQL, filesystem, ts-morph)

**Dolphin Surfacing** (every 5-10 tasks):

- Group 1 (2 tasks): Database ready (reduced from 3 - tool_invocations table removed)
- Group 2 (8 tasks): Async discovery with polling + cancel working via curl
- Group 3 (5 tasks): Tools API working via curl
- Group 4 (2 tasks): Debug package working in isolation
- Group 5 (6 tasks): Tool execution working end-to-end via curl (reduced from 7 - GET /api/execute/:id/tools removed)
- Group 6 (3 tasks): Export working via curl
- Group 7 (8 tasks): Settings + discovery modal + Tools pages working in browser
- Group 8 (3 tasks): Execution diagnostics working in browser
- Group 9 (2 tasks): Export working in browser
- Group 10 (4 tasks): All integration tests passing
- Group 11 (7 tasks): Documentation complete

**Maximum time between surfaces**: 8 tasks (Groups 2, 7, and 11, well within 10-task constitutional limit)

**Estimated Task Breakdown** (by group):

- Group 1 (Foundation): 2 tasks (migrations with project name field - tool_invocations table deferred)
- Group 2 (Project Config + Discovery): 8 tasks (async discovery, status polling, cancel with cleanup)
- Group 3 (Tools API): 5 tasks
- Group 4 (@promptalicious/debug): 2 tasks
- Group 5 (Tool Execution): 6 tasks (in-memory diagnostics, GET /api/execute/:id/tools deferred)
- Group 6 (Export): 3 tasks
- Group 7 (Frontend - Project & Tools): 8 tasks (project name, discovery modal with polling/cancel/OK button)
- Group 8 (Frontend - Execution): 3 tasks
- Group 9 (Frontend - Export): 2 tasks
- Group 10 (Integration Tests): 4 tasks
- Group 11 (Documentation): 7 tasks (README, IDE setup, feature docs)
- **Total**: ~49 tasks (reduced from ~52 after deferring tool invocation persistence to Feature 004)

(Includes new features: project naming, async discovery with polling, cancel with cleanup, real-time progress modal, comprehensive user documentation)

**New Features Added Since Initial Planning**:

- FR-027: Project naming (defaults to folder name, editable)
- FR-028-031: Discovery observability (async with polling, real-time progress, cancel with cleanup, structured logging, detailed feedback)
- Workspace location corrected: inside promptalicious repo (not user's project)
- Deferred to Spec 005: Manual tool rescan (will be part of Hard Reset functionality)

**Complexity Note**:
This is a substantial feature (26 functional requirements) touching both backend and frontend. Task count reflects:

- Tool discovery requires AST parsing (ts-morph integration)
- Workspace generation with filesystem operations
- Hook system with lifecycle management
- Extension of existing execution flow (backward compatibility)
- New UI pages and components
- Export functionality

Despite size, tasks are atomic and parallelisable where possible, enabling Dolphin surfacing frequently.

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation

_These phases are beyond the scope of the /plan command_

**Phase 3**: Task execution (/tasks command creates tasks.md)  
**Phase 4**: Implementation (execute tasks.md following constitutional principles)  
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking

_Fill ONLY if Constitution Check has violations that must be justified_

| Violation                  | Why Needed         | Simpler Alternative Rejected Because |
| -------------------------- | ------------------ | ------------------------------------ |
| [e.g., 4th project]        | [current need]     | [why 3 projects insufficient]        |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient]  |

## Progress Tracking

_This checklist is updated during execution flow_

**Phase Status**:

- [x] Phase 0: Research complete (/plan command) ✅
- [x] Phase 1: Design complete (/plan command) ✅
- [x] Phase 2: Task planning complete (/plan command - describe approach only) ✅
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:

- [x] Initial Constitution Check: PASS ✅
- [x] Post-Design Constitution Check: PASS ✅ (No new violations introduced by Phase 1 design)
- [x] All NEEDS CLARIFICATION resolved ✅
- [x] Complexity deviations documented (N/A - no deviations) ✅

---

_Based on Constitution v2.1.1 - See `/memory/constitution.md`_
