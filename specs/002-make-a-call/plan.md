# Implementation Plan: LLM Prompt Execution & Diagnostics Interface

**Branch**: `002-make-a-call` | **Date**: 2025-11-04 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/002-make-a-call/spec.md`

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
Build a full-stack LLM prompt execution and diagnostics interface enabling developers to input system prompts, execute them against GPT-4o-mini via Vercel AI SDK, and view comprehensive diagnostic information (tokens, timing, costs, errors). This feature establishes the foundational architecture for the promptalicious tool with focus on visibility and quick wins over polish. Frontend uses React with Tailwind/shadcn in retrofuturistic dark mode; backend handles LLM communication, pricing lookups, and configuration management via PostgreSQL.

## Technical Context
**Language/Version**: TypeScript (latest, strict mode), Node.js (latest LTS)
**Primary Dependencies**: React, Vite, Vercel AI SDK, PostgreSQL, Tailwind CSS, shadcn/ui, Vitest
**Storage**: PostgreSQL (configuration, pricing cache)
**Testing**: Vitest (contract, integration, unit tests)
**Target Platform**: Local developer machine (macOS/Linux/Windows), web application
**Project Type**: web (frontend + backend monorepo)
**Performance Goals**: LLM call execution within provider limits, UI responsiveness during loading states
**Constraints**: Quick-win focused (minimal styling effort), visibility paramount (all diagnostics observable), single-user local tool
**Scale/Scope**: Single developer usage, 1-2 screens (prompt execution + settings), foundational architecture for future features

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Simplicity**:
- Projects: 3 (frontend, backend, shared-infra) ✅
- Using framework directly? YES - React, Vite, Vercel AI SDK used without wrappers ✅
- Single data model? YES - Domain entities map directly to DB/API (no separate DTOs initially) ✅
- Avoiding patterns? YES - No Repository/UoW unless complexity demands it (DDD only where beneficial) ✅

**Architecture**:
- EVERY feature as library? DEFERRED - This is foundational feature, library extraction can happen in future refactor ⚠️
- Libraries listed: N/A for this iteration
- CLI per library: N/A (web UI is the interface)
- Library docs: N/A for this iteration

**Testing (NON-NEGOTIABLE)**:
- RED-GREEN-Refactor cycle enforced? YES - Tests written before implementation, per-task cycles ✅
- Git commits show tests before implementation? YES - Commit tests first to demonstrate RED phase ✅
- Order: Contract→Integration→E2E→Unit strictly followed? YES - Contract tests define API shape, integration tests validate workflows ✅
- Real dependencies used? YES - Real PostgreSQL instance, real LLM calls with recorded fixtures ✅
- Integration tests for: new libraries, contract changes, shared schemas? YES - Full integration testing planned ✅
- FORBIDDEN: Implementation before test, skipping RED phase ✅

**Observability**:
- Structured logging included? YES - Backend logs with context, errors surfaced to frontend ✅
- Frontend logs → backend? DEFERRED - Not required for single-developer local tool, can add if debugging needs arise ⚠️
- Error context sufficient? YES - All errors captured and displayed with actionable detail (Principle 1: Visibility) ✅

**Versioning**:
- Version number assigned? YES - 0.1.0 (existing from scaffold) ✅
- BUILD increments on every change? YES - Will increment to 0.2.0 after this feature ✅
- Breaking changes handled? N/A - First feature, no existing API to break ✅

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

**Structure Decision**: Option 2 (Web application) - Frontend + Backend detected in Technical Context. Existing monorepo structure at `packages/frontend`, `packages/backend`, `packages/shared-infra`.

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

**Task Generation Strategy**:

The /tasks command will generate tasks.md from Phase 1 artifacts following constitutional TDD principles (Contract → Integration → Implementation → Unit) and Dolphin-Based Development (surface after logical groups).

### 1. Foundation Tasks (Database & Configuration)

**From**: data-model.md entities: LLMConfiguration, PricingInformation, ExchangeRate

- **T001** [P]: Database setup and migration tooling research (Context7 lookup: DrizzleORM vs Prisma)
- **T002**: Verify .gitignore includes all database-related paths (.env, postgres-data/, *.sql, *.dump, Docker volumes)
- **T003**: Create initial database schema migration (LLM config, pricing, exchange rates tables)
- **T004**: Database connection module with environment configuration
- **T005**: Test database connectivity and migration application

**Surfacing**: After T005, `pnpm db:migrate` applies schema, `pnpm db:status` shows tables

**Security Note**: T002 is CRITICAL - API keys are stored in database to avoid .env commits, but this is only safe if database files cannot be committed

### 2. Backend Framework & API Structure

**From**: research.md Decision 8 (API framework selection)

- **T006**: Backend framework research and selection (Context7 lookup: Hono vs Fastify vs Express, lean towards Hono)
- **T007**: Initialize backend API framework with TypeScript, basic routing, error handling middleware
- **T008**: Create shared TypeScript types from data-model.md in `shared-infra` package

**Surfacing**: After T008, backend server starts and responds to health check endpoint

### 3. Configuration Management (Contract Tests First)

**From**: api-contracts.yaml `/config` endpoints

- **T009** [P]: Write contract tests for GET `/config` endpoint (assert response schema)
- **T010** [P]: Write contract tests for PUT `/config` endpoint (assert request/response schemas)
- **T011** [P]: Write contract tests for POST `/config/test-connection` endpoint
- **T012**: Implement configuration service (CRUD operations, single-row pattern)
- **T013**: Implement GET `/config` endpoint (returns config without API key)
- **T014**: Implement PUT `/config` endpoint (validates and saves configuration)
- **T015**: Implement POST `/config/test-connection` endpoint (test LLM credentials)
- **T016**: Integration test: Configuration persistence and validation flow

**Surfacing**: After T016, use curl or Postman to save/retrieve configuration, test connection

### 4. Pricing Data System (Contract Tests First)

**From**: api-contracts.yaml `/pricing` endpoint, research.md Decision 5

- **T017**: Write contract tests for GET `/pricing` endpoint (assert pricing data schema)
- **T018**: ~~Research OpenAI pricing API and exchange rate API~~ **DONE** - See research.md: Web scraping + Frankfurter API
- **T019**: Implement pricing lookup service (web scraping with hardcoded fallback, database cache)
- **T020**: Implement exchange rate lookup service (Frankfurter API for USD→GBP conversion)
- **T021**: Implement GET `/pricing` endpoint (returns pricing with staleness indicator)
- **T022**: Integration test: Pricing cache initialization on backend startup
- **T023**: Integration test: Staleness detection (>7 days) and fallback to cached data

**Surfacing**: After T023, restart backend and observe pricing fetched in logs, query `/pricing` endpoint

### 5. LLM Execution Core (Contract Tests First)

**From**: api-contracts.yaml `/execute` endpoint, research.md Decision 1 (Vercel AI SDK)

- **T024**: Write contract tests for POST `/execute` endpoint (success response schema)
- **T025**: Write contract tests for POST `/execute` endpoint (all error response schemas: 400, 401, 429, 500, 504)
- **T026**: Write contract tests for GET `/execute/status` endpoint (execution in progress, completed states)
- **T027**: Write contract tests for POST `/execute/abort` endpoint (abort success, no execution scenarios)
- **T028**: Implement execution state cache service (in-memory storage with AbortController)
- **T029**: Implement LLM execution service using Vercel AI SDK (call GPT-4o-mini, capture diagnostics, support abort)
- **T030**: Implement cost calculation logic (token counts × pricing × exchange rate)
- **T031**: Implement error classification and handling (map provider errors to error types)
- **T032**: Implement POST `/execute` endpoint (orchestrates execution, returns result or error, manages state cache)
- **T033**: Implement GET `/execute/status` endpoint (returns current execution state or null)
- **T034**: Implement POST `/execute/abort` endpoint (aborts execution via AbortController)
- **T035**: Integration test: Successful prompt execution with full diagnostics
- **T036**: Integration test: Execution state persistence across endpoint calls
- **T037**: Integration test: Abort execution mid-flight
- **T038**: Integration test: Error scenarios (authentication, validation, network simulation)

**Surfacing**: After T038, use curl to execute prompts, check status, abort execution, observe full response + diagnostics

### 6. Frontend Setup & Styling

**From**: research.md Decisions 2, 3 (shadcn/ui, Tailwind dark theme)

- **T039**: Initialize shadcn/ui in frontend package (run `npx shadcn@latest init`)
- **T040**: Configure Tailwind CSS v4 with custom retrofuturistic dark theme colours
  - Define colours directly in `:root` CSS variables (not `.dark` class)
  - NO `class="dark"` on HTML element (dark mode is the only mode)
  - Background: Muddy blacks (oklch), Foreground: Soft greys, Accents: Subdued cyan/magenta
- **T041**: Install required shadcn components (Card, Button, Textarea, Badge, Table, Alert)
- **T042**: Create base layout component with dark theme applied
- **T043**: Integration test: Verify theme applies correctly (visual inspection or screenshot test)

**Surfacing**: After T043, `pnpm dev` shows styled dark mode UI (even if empty)

### 7. Settings Page (Frontend)

**From**: quickstart.md Scenario "Setup: First-Time Configuration"

- **T044**: Create settings page component structure
- **T045**: Implement API client service for configuration endpoints (GET, PUT, test-connection)
- **T046**: Implement settings form (model selection, API key input, endpoint input)
- **T047**: Implement automatic validation on save (FR-024) with loading state
- **T048**: Implement manual "Test Connection" button (FR-024a)
- **T049**: Integration test: Settings form saves and validates configuration
- **T050**: Integration test: Test connection button validates credentials independently

**Surfacing**: After T050, navigate to `/settings`, save API key, test connection, observe validation

### 8. Prompt Execution Page (Frontend)

**From**: quickstart.md Scenarios 1, 2, 7 (successful execution, iteration, large responses) + FR-003 series (abort, status polling)

- **T051**: Create prompt execution page component structure
- **T052**: Implement API client service for `/execute` endpoint (execute, status, abort)
- **T053**: Implement prompt input area (Textarea with character count)
- **T054**: Implement Execute/Cancel button with loading state and toggle logic (FR-003, FR-004, FR-004a)
- **T055**: Implement execution status polling logic for page refresh recovery (FR-003b)
- **T056**: Implement response display card (full text, scrollable, FR-006)
- **T057**: Implement diagnostics display (tabular format, FR-009-014)
- **T058**: Implement error display with error type classification (FR-015-019)
- **T059**: Integration test: Successful execution flow (prompt → execute → see results)
- **T060**: Integration test: Cancel execution mid-flight
- **T061**: Integration test: Page refresh during execution (status polling and recovery)
- **T062**: Integration test: Iterative refinement (prompt preserved, new execution replaces result)

**Surfacing**: After T062, full end-to-end test via UI (type prompt, execute, cancel, refresh during execution, see diagnostics)

### 9. Pricing Display & Staleness Warning

**From**: quickstart.md Scenario 6 (viewing pricing, staleness)

- **T063**: Create pricing info component (displays current pricing data)
- **T064**: Implement staleness warning display (>7 days, FR-028)
- **T065**: Integration test: Pricing display shows current data
- **T066**: Integration test: Staleness warning appears when pricing is old

**Surfacing**: After T066, view pricing info, manually set old timestamp in DB, verify warning

### 10. Edge Cases & Polish

**From**: quickstart.md Scenarios 3-5, 8-9 (error scenarios, validation, special chars)

- **T067**: Implement empty prompt validation (client-side and/or server-side)
- **T068**: Test special characters in prompts (ensure no corruption, FR edge case)
- **T069**: Test all error types display correctly (authentication, network, rate_limit, etc.)
- **T070**: Integration test: Empty prompt is rejected gracefully
- **T071**: Integration test: Special characters handled correctly
- **T072**: E2E test: Full quickstart scenarios 1-12 pass (including abort and refresh scenarios)

**Surfacing**: After T072, run full quickstart guide to validate all scenarios

### 11. Quality & Documentation

**From**: Constitution quality gates

- **T073**: Run quality gates (typecheck, lint, format) and fix all issues
- **T074**: Review test coverage and add unit tests for complex logic (cost calculation, error classification, execution state management)
- **T075**: Update CLAUDE.md with feature completion notes
- **T076**: Increment version to 0.2.0 in package.json

**Surfacing**: After T076, all quality gates pass, feature is production-ready

---

**Task Ordering Strategy**:
- **TDD Strict**: Contract tests (T009-011, T017, T024-025) written before implementation
- **Dependency Order**: Foundation (DB + Security) → Backend (API) → Frontend (UI)
- **Parallel Opportunities**: Marked [P] for tasks that touch different files (database schema, contract tests, frontend setup)
- **Dolphin Surfacing**: After logical groups (foundation, backend services, frontend pages), clear test instructions provided

**Estimated Output**: 76 tasks, grouped into 11 logical phases

**Critical Security Task**: T002 verifies .gitignore protects database files - API keys stored in DB are only safe if DB cannot be committed

**Complexity Notes**:
- This is a large feature (foundational architecture + first full implementation)
- Task breakdown is granular to enable:
  - LLM token limit compliance (each task fits in context window)
  - Frequent surfacing per Dolphin principle (after each phase)
  - Parallel execution where possible (database, contract tests, frontend setup)

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
| Library extraction deferred | This is the foundational feature establishing core architecture. Library boundaries will become clear after implementation proves the design. | Premature abstraction would create unnecessary complexity before patterns emerge. Constitution's "Good Architecture Without Cargo-Culting" principle supports deferring until actual need is demonstrated. |
| Frontend logs → backend deferred | Single-developer local tool with direct console access. Frontend errors already surface to UI per Visibility principle. | Adding log aggregation now would be over-engineering for a local development tool. Can add if multi-user deployment or complex debugging scenarios emerge. |


## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command) - research.md created ✅
- [x] Phase 1: Design complete (/plan command) - data-model.md, contracts/, quickstart.md created ✅
- [x] Phase 2: Task planning complete (/plan command - describe approach only) - 11 phases, 65 tasks outlined ✅
- [ ] Phase 3: Tasks generated (/tasks command) - tasks.md to be created
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS (2 justified deferrals documented in Complexity Tracking)
- [x] Post-Design Constitution Check: PASS (design maintains simplicity, TDD principles, observability)
- [x] All NEEDS CLARIFICATION resolved (Technical Context fully specified)
- [x] Complexity deviations documented (library extraction, frontend log aggregation deferred)

**Artifacts Generated**:
- ✅ specs/002-make-a-call/research.md
- ✅ specs/002-make-a-call/data-model.md
- ✅ specs/002-make-a-call/contracts/api-contracts.yaml
- ✅ specs/002-make-a-call/quickstart.md
- ✅ specs/002-make-a-call/plan.md (this file)

**Next Command**: Run `/tasks` to generate tasks.md from this plan

---
*Based on Constitution v1.1.0 - See `/memory/constitution.md`*