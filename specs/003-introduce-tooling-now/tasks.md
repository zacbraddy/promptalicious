# Tasks: Core Tool Integration System

**Input**: Design documents from `/home/zacbraddy/Projects/Personal/promptalicious/specs/003-introduce-tooling-now/`
**Prerequisites**: plan.md, research.md, data-model.md, contracts/

---

## Execution Flow

This feature implements LLM tool integration capabilities with ~52 tasks organised into 11 groups following tight RED-GREEN-REFACTOR cycles. Maximum time between surfaces: 8 tasks (Groups 2, 7, and 11).

**Dolphin Surfacing Schedule**:
- Group 1 (3 tasks): Database ready
- Group 2 (8 tasks): Async discovery with polling + cancel working via curl
- Group 3 (5 tasks): Tools API working via curl
- Group 4 (2 tasks): Debug package working in isolation
- Group 5 (7 tasks): Tool execution working end-to-end via curl
- Group 6 (3 tasks): Export working via curl
- Group 7 (8 tasks): Settings + discovery modal + Tools pages working in browser
- Group 8 (3 tasks): Execution diagnostics working in browser
- Group 9 (2 tasks): Export working in browser
- Group 10 (4 tasks): All integration tests passing
- Group 11 (7 tasks): Documentation complete

---

## Group 1: Foundation (Database & Shared Types)

### T001 [P]: Database migration for project_configuration table

**File**: `packages/backend/drizzle/migrations/`
**Description**: Generate DrizzleORM migration for project_configuration table with single-row constraint (id=1). Includes name field (user-editable project name), targetProjectPath, workspacePath, timestamps. CRITICAL: Use `pnpm exec drizzle-kit generate --name=add_project_configuration_table` - NEVER manually edit migration files.
**Dependencies**: None
**Expected Outcome**: Migration file generated, ready to apply

- [x] **Complete**

---

### T002 [P]: Database migration for tools table

**File**: `packages/backend/drizzle/migrations/`
**Description**: Generate DrizzleORM migration for tools table. Includes id, name, description, sourceDescription (nullable), parametersSchema (jsonb), sourceFilePath, workspaceDir, enabled (default true), detectedHookParams (jsonb), timestamps. CRITICAL: Use `pnpm exec drizzle-kit generate --name=add_tools_table` - NEVER manually edit migration files.
**Dependencies**: None
**Expected Outcome**: Migration file generated, ready to apply

- [ ] **Complete**

---

### T003 [P]: Database migration for tool_invocations table and extend execution_results

**File**: `packages/backend/drizzle/migrations/`
**Description**: Generate DrizzleORM migration for tool_invocations table (id, executionId, toolId FK, timestamp, inputParams jsonb, output jsonb, executionDurationMs, inputTokens, outputTokens, success, errorType, errorMessage, errorStack, llmReasoning, debugOutput jsonb) AND extend execution_results table with toolInvocationCount, toolTokensUsed, toolExecutionTimeMs, toolErrorCount (all default 0). CRITICAL: Use `pnpm exec drizzle-kit generate --name=add_tool_invocations_and_extend_execution_results` - NEVER manually edit migration files.
**Dependencies**: None
**Expected Outcome**: Migration files generated, ready to apply

**Surface Point**: After T003, run `pnpm db:migrate && pnpm db:status` to verify new tables created

- [ ] **Complete**

---

## Group 2: Project Configuration & Discovery (Async with Observability)

### T004: Contract test PUT /api/project (202 Accepted with async discovery)

**File**: `packages/backend/tests/contract/project-configuration.test.ts`
**Description**: Write failing contract test for PUT /api/project endpoint. Expects 202 Accepted response with configuration object and discoveryStarted: true. Validates that project configuration is saved and discovery process is initiated asynchronously. Test MUST FAIL (no implementation yet) - RED phase.
**Dependencies**: T003
**Expected Outcome**: Test FAILS - RED phase ✅

- [ ] **Complete**

---

### T005: Contract test GET /api/project/discovery/status (polling endpoint)

**File**: `packages/backend/tests/contract/project-configuration.test.ts`
**Description**: Write failing contract test for GET /api/project/discovery/status endpoint. Expects response with isDiscovering boolean, phase enum, progress object (filesScanned, filesAnalyzed, toolsFound, filesGenerated), logs array, and optional result object when complete. Test MUST FAIL (no implementation yet) - RED phase.
**Dependencies**: T003
**Expected Outcome**: Test FAILS - RED phase ✅

- [ ] **Complete**

---

### T006: Contract test POST /api/project/discovery/cancel (cleanup endpoint)

**File**: `packages/backend/tests/contract/project-configuration.test.ts`
**Description**: Write failing contract test for POST /api/project/discovery/cancel endpoint. Expects 200 response with cancelled: true and cleanup confirmation message. Also test 404 when no discovery in progress. Test MUST FAIL (no implementation yet) - RED phase.
**Dependencies**: T003
**Expected Outcome**: Test FAILS - RED phase ✅

- [ ] **Complete**

---

### T007: Contract test GET /api/project (retrieve configuration)

**File**: `packages/backend/tests/contract/project-configuration.test.ts`
**Description**: Write failing contract test for GET /api/project endpoint. Expects 200 with ProjectConfiguration object or 404 when no project configured. Test MUST FAIL (no implementation yet) - RED phase.
**Dependencies**: T003
**Expected Outcome**: Test FAILS - RED phase ✅

- [ ] **Complete**

---

### T008: Implement Project Configuration API routes

**File**: `packages/backend/src/routes/project-configuration.ts`
**Description**: Implement GET /api/project and PUT /api/project endpoints. PUT endpoint saves configuration to database, derives workspace path from project name, starts async tool discovery (fire-and-forget), and returns 202 Accepted. GET endpoint retrieves current configuration or returns 404. MUST make T004 and T007 pass - GREEN phase.
**Dependencies**: T004, T007
**Expected Outcome**: T004 and T007 pass - GREEN phase ✅

- [ ] **Complete**

---

### T009: Implement Discovery Status Service (track progress, incremental logs)

**File**: `packages/backend/src/services/discovery-status-service.ts`
**Description**: Create service to track discovery state (isDiscovering, phase, progress counters, logs array). Provide methods to: start discovery, update phase, increment counters, append log entries, get current status, mark complete/error. Use in-memory state (stateless per-request, state lives in service singleton). Logs are incremental - only new entries since last poll.
**Dependencies**: T008
**Expected Outcome**: Service provides discovery state management

- [ ] **Complete**

---

### T010: Implement Discovery Status API route (GET /api/project/discovery/status)

**File**: `packages/backend/src/routes/project-configuration.ts`
**Description**: Implement GET /api/project/discovery/status endpoint that returns current discovery status from Discovery Status Service. Returns isDiscovering, phase, progress, logs (incremental), and result (when complete). MUST make T005 pass - GREEN phase.
**Dependencies**: T005, T009
**Expected Outcome**: T005 passes - GREEN phase ✅

- [ ] **Complete**

---

### T011: Implement Discovery Cancel Service (abort + cleanup)

**File**: `packages/backend/src/services/discovery-cancel-service.ts`
**Description**: Create service to abort in-progress discovery and cleanup partial workspace files. Sets cancellation flag, waits for discovery to acknowledge abort, removes partial workspace directory, clears database entries for incomplete discovery. Returns error if no discovery in progress.
**Dependencies**: T009
**Expected Outcome**: Service provides discovery cancellation with cleanup

- [ ] **Complete**

---

### T012: Implement Discovery Cancel API route (POST /api/project/discovery/cancel)

**File**: `packages/backend/src/routes/project-configuration.ts`
**Description**: Implement POST /api/project/discovery/cancel endpoint that triggers Discovery Cancel Service. Returns 200 with cancelled: true and cleanup message, or 404 if no discovery in progress. MUST make T006 pass - GREEN phase.
**Dependencies**: T006, T011
**Expected Outcome**: T006 passes - GREEN phase ✅

**Surface Point**: After T012, test async discovery via curl:
```bash
curl -X PUT http://localhost:3000/api/project -d '{"name":"test","targetProjectPath":"../test-project"}' -H "Content-Type: application/json"
# Returns 202 Accepted
curl http://localhost:3000/api/project/discovery/status
# Returns discovery status with real-time progress
curl -X POST http://localhost:3000/api/project/discovery/cancel
# Returns cancelled: true
```

- [ ] **Complete**

---

## Group 3: Tool Discovery Service (ts-morph integration)

### T013: Install ts-morph dependency

**File**: `packages/backend/package.json`
**Description**: Install ts-morph@latest using `pnpm --filter @promptalicious/backend add ts-morph@latest`. CRITICAL: NEVER manually edit package.json, always use pnpm add command.
**Dependencies**: T012
**Expected Outcome**: ts-morph available in backend package

- [ ] **Complete**

---

### T014: Implement Tool Discovery Service (ts-morph integration, progress events)

**File**: `packages/backend/src/services/tool-discovery-service.ts`
**Description**: Create service using ts-morph to: 1) Scan target project for files importing 'tool' from 'ai', 2) Parse tool() calls to extract name, description, parameters (Zod schema as JSON), 3) Perform scope analysis on execute function to detect undefined variables (hook parameters), 4) Emit progress events (filesScanned, toolsFound, logs) to Discovery Status Service, 5) Save discovered tools to database, 6) Return DiscoverySummary. Respect cancellation flag from Discovery Cancel Service. Reference research.md Decision 1 for implementation pattern.
**Dependencies**: T013
**Expected Outcome**: Service discovers tools from user's project using ts-morph

- [ ] **Complete**

---

### T015: Implement Workspace Generator Service (directory structure, hook stubs, tsconfig.json)

**File**: `packages/backend/src/services/workspace-generator-service.ts`
**Description**: Create service to: 1) Create workspace/{project-name}/ directory (inside promptalicious repo, gitignored), 2) Generate tsconfig.json with @rootalicious path alias pointing to user's project, 3) For each discovered tool, create {tool-id}/ subdirectory, 4) Generate tool.ts (extracted execute function), 5) Generate hook stub files (beforeAll.ts, beforeEach.ts, afterEach.ts, afterAll.ts) with detected parameters as TODO comments, 6) Emit filesystem events to Discovery Status Service. Reference data-model.md § Workspace Structure for exact file structure.
**Dependencies**: T014
**Expected Outcome**: Service generates workspace with hook stubs and TypeScript configuration

- [ ] **Complete**

---

### T016: Integrate Tool Discovery into PUT /api/project (async flow)

**File**: `packages/backend/src/routes/project-configuration.ts`
**Description**: Update PUT /api/project to: 1) Validate targetProjectPath exists and is directory, 2) Derive workspace path and project name (defaults to folder name), 3) Save configuration to database, 4) Start async discovery (Tool Discovery Service → Workspace Generator Service) in background, 5) Return 202 Accepted immediately. Discovery runs async, updates Discovery Status Service with progress/logs.
**Dependencies**: T015
**Expected Outcome**: PUT /api/project triggers async tool discovery, returns 202

- [ ] **Complete**

---

### T017: Update .gitignore for workspace directory

**File**: `.gitignore` (repository root)
**Description**: Add `workspace/` to .gitignore BUT keep `!workspace/.gitkeep` to track empty directory. Ensure workspace/.gitkeep file exists with explanation comment.
**Dependencies**: T016
**Expected Outcome**: Workspace directory gitignored, tracked via .gitkeep

**Surface Point**: After T017, test complete discovery flow via curl and verify workspace created

- [ ] **Complete**

---

## Group 4: Tools Management API

### T018 [P]: Contract test GET /api/tools (list all tools)

**File**: `packages/backend/tests/contract/tools.test.ts`
**Description**: Write failing contract test for GET /api/tools endpoint. Expects 200 with tools array (each tool has id, name, description, sourceDescription, enabled, timestamps) or 404 when no project configured. Test MUST FAIL (no implementation yet) - RED phase.
**Dependencies**: T017
**Expected Outcome**: Test FAILS - RED phase ✅

- [ ] **Complete**

---

### T019 [P]: Contract test GET /api/tools/:id (tool detail)

**File**: `packages/backend/tests/contract/tools.test.ts`
**Description**: Write failing contract test for GET /api/tools/:id endpoint. Expects 200 with ToolDetail (includes parametersSchema, sourceFilePath, workspaceDir, detectedHookParams) or 404 when tool not found. Test MUST FAIL (no implementation yet) - RED phase.
**Dependencies**: T017
**Expected Outcome**: Test FAILS - RED phase ✅

- [ ] **Complete**

---

### T020 [P]: Contract test PATCH /api/tools/:id (update description/enabled)

**File**: `packages/backend/tests/contract/tools.test.ts`
**Description**: Write failing contract test for PATCH /api/tools/:id endpoint. Expects 200 with updated tool. When description is updated, sourceDescription becomes null (frontend is now source of truth). Test enabling/disabling tools. Test MUST FAIL (no implementation yet) - RED phase.
**Dependencies**: T017
**Expected Outcome**: Test FAILS - RED phase ✅

- [ ] **Complete**

---

### T021: Implement Tools API routes (list, detail, update)

**File**: `packages/backend/src/routes/tools.ts`
**Description**: Implement GET /api/tools (list all), GET /api/tools/:id (detail), and PATCH /api/tools/:id (update). List returns all discovered tools. Detail returns full tool information including parametersSchema and detectedHookParams. Update allows changing description (nulls sourceDescription on first edit) and enabled flag. MUST make T018-T020 pass - GREEN phase.
**Dependencies**: T018, T019, T020
**Expected Outcome**: T018-T020 pass - GREEN phase ✅

- [ ] **Complete**

---

### T022: Add shared type definitions for tools

**File**: `packages/shared-infra/src/types/tools.ts`
**Description**: Create TypeScript interfaces for ProjectConfiguration, ToolDefinition, ToolDetail, ToolInvocationResult, DebugMessage, HookDefinition, WorkspaceStructure, DiscoveryLogEntry, DiscoverySummary. Reference data-model.md § Type Definitions for exact structure.
**Dependencies**: T021
**Expected Outcome**: Shared types available for frontend and backend

**Surface Point**: After T022, test Tools API via curl:
```bash
curl http://localhost:3000/api/tools
# Returns discovered tools array
curl http://localhost:3000/api/tools/getUserProfile
# Returns tool detail with parametersSchema
curl -X PATCH http://localhost:3000/api/tools/getUserProfile -d '{"description":"Updated"}' -H "Content-Type: application/json"
# Returns updated tool, sourceDescription is now null
```

- [ ] **Complete**

---

## Group 5: @promptalicious/debug Package

### T023: Create @promptalicious/debug package scaffolding

**File**: `packages/debug/package.json`, `packages/debug/src/index.ts`, `packages/debug/tsconfig.json`
**Description**: Create new workspace package @promptalicious/debug. Setup package.json with name, version, main entry point. Create tsconfig.json extending root config. Create src/index.ts exporting capturelicious function and internal capture control functions (enableCapture, disableCapture, getCaptures, clearCaptures). Reference research.md Decision 6 for implementation pattern.
**Dependencies**: T022
**Expected Outcome**: Debug package scaffolded, ready for implementation

- [ ] **Complete**

---

### T024: Implement capturelicious() function with scoped capture

**File**: `packages/debug/src/index.ts`
**Description**: Implement capturelicious(message, variables) function that: 1) Creates DebugMessage object (timestamp, message, variables), 2) If captureEnabled, appends to currentCaptures array, 3) Else, falls back to console.log. Implement enableCapture(), disableCapture(), getCaptures(), clearCaptures() for backend integration. Include unit tests. Reference research.md Decision 6 for exact signature.
**Dependencies**: T023
**Expected Outcome**: capturelicious() works in both capture mode (promptalicious) and console mode (local dev)

**Surface Point**: After T024, test debug package in isolation:
```typescript
import { capturelicious, enableCapture, getCaptures } from '@promptalicious/debug';
enableCapture();
capturelicious('Test message', { foo: 'bar' });
console.log(getCaptures()); // Should show captured message
```

- [ ] **Complete**

---

## Group 6: Tool Execution (Extends Existing Flow)

### T025: Contract test extended POST /api/execute (with advancedOptions)

**File**: `packages/backend/tests/contract/execution.test.ts`
**Description**: Extend existing POST /api/execute contract test to include advancedOptions object (toolChoice, maxToolRoundtrips, temperature, topP, maxTokens, maxRetries). Verify these options are accepted and applied. Test MUST FAIL (no implementation yet) - RED phase.
**Dependencies**: T024
**Expected Outcome**: Test FAILS - RED phase ✅

- [ ] **Complete**

---

### T026: Contract test GET /api/execute/:id/tools (tool invocations)

**File**: `packages/backend/tests/contract/execution.test.ts`
**Description**: Write failing contract test for GET /api/execute/:id/tools endpoint. Expects 200 with invocations array (each invocation has toolId, toolName, timestamp, inputParams, output, executionDurationMs, inputTokens, outputTokens, success, error fields, llmReasoning, debugOutput) or 404 when execution not found. Test MUST FAIL (no implementation yet) - RED phase.
**Dependencies**: T024
**Expected Outcome**: Test FAILS - RED phase ✅

- [ ] **Complete**

---

### T027: Create SDK Adapter Interface

**File**: `packages/backend/src/adapters/sdk-adapter.interface.ts`
**Description**: Define SDKAdapter interface with methods: discoverTools(projectPath), executeWithTools(params), validateOptions(options), getDefaultOptions(). Create types for SDKOptions, ExecutionResult. Reference research.md Decision 10 for interface design. This provides extension point for future multi-SDK support (feature 005+).
**Dependencies**: T026
**Expected Outcome**: Interface defined for SDK abstraction

- [ ] **Complete**

---

### T028: Implement Vercel AI SDK Adapter

**File**: `packages/backend/src/adapters/vercel-ai-sdk-adapter.ts`
**Description**: Implement VercelAISDKAdapter class conforming to SDKAdapter interface. Implement executeWithTools() using generateText from 'ai' package with tools array. Implement validateOptions() for AI SDK options (toolChoice, maxToolRoundtrips, temperature, etc.). Implement getDefaultOptions() returning sensible defaults. Reference research.md Decision 5 for integration pattern.
**Dependencies**: T027
**Expected Outcome**: Vercel AI SDK adapter ready for tool execution

- [ ] **Complete**

---

### T029: Implement Hook Execution Service

**File**: `packages/backend/src/services/hook-execution-service.ts`
**Description**: Create service to dynamically load and execute hook files from workspace. Implement lifecycle: beforeAll() → beforeEach() → tool.execute() → afterEach() → afterAll(). Merge context from beforeAll and beforeEach into tool parameters. Handle hook failures with clear error messages (abort execution). Reference research.md Decision 4 for lifecycle pattern.
**Dependencies**: T028
**Expected Outcome**: Service executes hooks in correct lifecycle order, merges context

- [ ] **Complete**

---

### T030: Extend Execution Service to integrate tools

**File**: `packages/backend/src/services/execution-service.ts`
**Description**: Extend existing execution service to: 1) Load enabled tools from database, 2) Run beforeAll hooks and capture global context, 3) Transform tools to AI SDK format, wrapping execute function to run beforeEach/afterEach hooks and capture diagnostics, 4) Call SDK adapter executeWithTools() with advancedOptions, 5) Save tool invocations to database, 6) Update execution result with tool summary (toolInvocationCount, toolTokensUsed, toolExecutionTimeMs, toolErrorCount). MUST make T025 pass - GREEN phase.
**Dependencies**: T025, T029
**Expected Outcome**: T025 passes - GREEN phase ✅, tool execution works end-to-end

- [ ] **Complete**

---

### T031: Implement Tool Invocations API route

**File**: `packages/backend/src/routes/execution.ts`
**Description**: Implement GET /api/execute/:id/tools endpoint that retrieves tool invocations from database for a given execution ID. Returns array of ToolInvocationResult with all diagnostics (timing, tokens, success, errors, debugOutput). MUST make T026 pass - GREEN phase.
**Dependencies**: T026, T030
**Expected Outcome**: T026 passes - GREEN phase ✅

**Surface Point**: After T031, test tool execution via curl:
```bash
curl -X POST http://localhost:3000/api/execute -d '{"prompt":"Test with tools","advancedOptions":{"toolChoice":"auto"}}' -H "Content-Type: application/json"
# Returns execution ID
curl http://localhost:3000/api/execute/{executionId}/tools
# Returns tool invocations with diagnostics
```

- [ ] **Complete**

---

## Group 7: Export Functionality

### T032: Contract test POST /api/export (generate instructions)

**File**: `packages/backend/tests/contract/export.test.ts`
**Description**: Write failing contract test for POST /api/export endpoint. Expects 200 with markdown string (export instructions), generatedAt timestamp, toolsIncluded count, advancedOptions object. Test includeDisabledTools parameter. Test 404 when no tools configured. Test MUST FAIL (no implementation yet) - RED phase.
**Dependencies**: T031
**Expected Outcome**: Test FAILS - RED phase ✅

- [ ] **Complete**

---

### T033: Implement Export Service (template-based markdown generation)

**File**: `packages/backend/src/services/export-service.ts`
**Description**: Create service to generate markdown export instructions using template-based approach (NO LLM). Template includes: 1) Changes summary (tool count, enabled tools, AI SDK options), 2) For each tool: updated execute function from workspace, updated description, original source file path, 3) AI SDK call configuration with advancedOptions, 4) Refactoring checklist. Reference research.md Decision 7 for template structure and quickstart.md Step 9 for example output.
**Dependencies**: T032
**Expected Outcome**: Service generates deterministic markdown instructions

- [ ] **Complete**

---

### T034: Implement Export API route

**File**: `packages/backend/src/routes/export.ts`
**Description**: Implement POST /api/export endpoint that calls Export Service. Accepts includeDisabledTools boolean parameter. Returns markdown string with generated instructions, timestamp, and metadata. MUST make T032 pass - GREEN phase.
**Dependencies**: T032, T033
**Expected Outcome**: T032 passes - GREEN phase ✅

**Surface Point**: After T034, test export via curl:
```bash
curl -X POST http://localhost:3000/api/export -d '{"includeDisabledTools":false}' -H "Content-Type: application/json"
# Returns markdown export instructions
```

- [ ] **Complete**

---

## Group 8: Frontend - Project Configuration & Discovery

### T035: Create TanStack Query hooks for project configuration

**File**: `packages/frontend/src/hooks/useProjectConfiguration.ts`
**Description**: Create React hooks using TanStack Query: useGetProjectConfiguration (GET /api/project), useUpdateProjectConfiguration (PUT /api/project mutation), useGetDiscoveryStatus (GET /api/project/discovery/status with polling), useCancelDiscovery (POST /api/project/discovery/cancel mutation). Reference existing execution hooks for patterns.
**Dependencies**: T034
**Expected Outcome**: React hooks ready for Settings page

- [ ] **Complete**

---

### T036: Extend Settings page with Project Configuration section

**File**: `packages/frontend/src/pages/Settings.tsx`
**Description**: Add Project Configuration section to Settings page below API Key Configuration. Include: 1) Folder picker input for targetProjectPath (with file browser modal or manual entry), 2) Project name input (defaults to folder name from path), 3) Save button that triggers PUT /api/project, 4) Display current configuration when loaded. Use existing shadcn/ui components (Input, Button, Label). Follow retrofuturistic dark theme from spec 002.
**Dependencies**: T035
**Expected Outcome**: Settings page shows Project Configuration section

- [ ] **Complete**

---

### T037: Create Discovery Progress Modal with real-time polling

**File**: `packages/frontend/src/components/DiscoveryProgressModal.tsx`
**Description**: Create modal component that: 1) Opens when PUT /api/project returns 202, 2) Polls GET /api/project/discovery/status every 500ms, 3) Displays phase, progress counters (filesScanned, toolsFound, etc.), 4) Shows incremental log entries with timestamp, level, message, context, 5) Auto-scrolls logs to bottom as new entries arrive, 6) Shows final summary when phase is 'complete' or 'error'. Use shadcn/ui Dialog component. Reference quickstart.md Step 1 for expected behaviour.
**Dependencies**: T036
**Expected Outcome**: Modal shows real-time discovery progress with polling

- [ ] **Complete**

---

### T038: Add Cancel button to Discovery Progress Modal with confirmation

**File**: `packages/frontend/src/components/DiscoveryProgressModal.tsx`
**Description**: Add Cancel button to Discovery Progress Modal. When clicked, show confirmation warning: "Are you sure? Partial workspace files will be removed and project will not be configured." On confirmation, call POST /api/project/discovery/cancel. On success, stop polling, show "Discovery cancelled. No project was added." message. Clean up modal state.
**Dependencies**: T037
**Expected Outcome**: Cancel button aborts discovery and cleans up workspace

- [ ] **Complete**

---

### T039: Add OK button to Discovery Progress Modal (enabled when complete/cancelled)

**File**: `packages/frontend/src/components/DiscoveryProgressModal.tsx`
**Description**: Add OK button to Discovery Progress Modal. Disabled while discovery is in progress (isDiscovering: true). Enabled when phase is 'complete', 'error', or after manual cancellation. Closes modal and navigates to Tools page (if discovery succeeded) or stays on Settings page (if cancelled/error).
**Dependencies**: T038
**Expected Outcome**: OK button closes modal after discovery completes/cancels

- [ ] **Complete**

---

### T040: Create API client extensions for project configuration

**File**: `packages/frontend/src/services/api-client.ts`
**Description**: Extend existing API client with methods for: getProjectConfiguration(), updateProjectConfiguration(request), getDiscoveryStatus(), cancelDiscovery(). Use existing fetch patterns from spec 002 implementation. Type all requests/responses using shared-infra types.
**Dependencies**: T039
**Expected Outcome**: API client ready for project configuration calls

- [ ] **Complete**

---

### T041: Test Settings page discovery flow in browser

**File**: Manual testing
**Description**: Test complete project configuration and discovery flow in browser: 1) Navigate to Settings, 2) Enter project path and name, 3) Click Save, 4) Verify discovery modal opens with real-time progress, 5) Verify logs update incrementally, 6) Verify Cancel button works with confirmation, 7) Verify OK button enabled when complete, 8) Verify workspace created in promptalicious/workspace/{project-name}/.
**Dependencies**: T040
**Expected Outcome**: Project configuration and discovery flow works in browser

- [ ] **Complete**

---

### T042: Verify user's project remains untouched

**File**: Manual testing
**Description**: After tool discovery completes, verify user's target project directory contains NO promptalicious files. Workspace must be created ONLY in promptalicious/workspace/{project-name}/. User's project is read-only, never modified. This is a critical design requirement.
**Dependencies**: T041
**Expected Outcome**: User's project contains zero promptalicious files, workspace is in promptalicious repo

**Surface Point**: After T042, Settings page + discovery modal working in browser with real-time progress and cancellation

- [ ] **Complete**

---

## Group 9: Frontend - Tools Management

### T043: Create TanStack Query hooks for tools

**File**: `packages/frontend/src/hooks/useTools.ts`
**Description**: Create React hooks using TanStack Query: useGetTools (GET /api/tools), useGetTool (GET /api/tools/:id), useUpdateTool (PATCH /api/tools/:id mutation). Include cache invalidation on mutations.
**Dependencies**: T042
**Expected Outcome**: React hooks ready for Tools page

- [ ] **Complete**

---

### T044: Create Tools page with list view

**File**: `packages/frontend/src/pages/Tools.tsx`
**Description**: Create new Tools page route at /tools. Display list of discovered tools using useGetTools hook. Each tool shows: name, description, enabled toggle (using Switch component), "View Details" button. Empty state when no tools discovered. Use shadcn/ui components (Table or Card layout). Follow retrofuturistic dark theme.
**Dependencies**: T043
**Expected Outcome**: Tools page displays all discovered tools

- [ ] **Complete**

---

### T045: Implement enable/disable toggle for tools

**File**: `packages/frontend/src/pages/Tools.tsx`
**Description**: Wire up Switch component to call useUpdateTool mutation with enabled: true/false. Show loading state during mutation. Show success/error toast notification. Optimistic update for immediate feedback.
**Dependencies**: T044
**Expected Outcome**: Users can enable/disable tools with immediate UI feedback

- [ ] **Complete**

---

### T046: Create Tool Detail Modal

**File**: `packages/frontend/src/components/ToolDetailModal.tsx`
**Description**: Create modal component (shadcn/ui Dialog) that opens when "View Details" clicked. Display: 1) Tool name (read-only), 2) Description (editable Textarea), 3) Parameters schema (read-only JSON display with syntax highlighting), 4) Detected hook parameters (read-only list), 5) Workspace directory path (read-only), 6) Link to open workspace in editor (open file:// URL or copy path to clipboard), 7) Save button for description edits. Use useGetTool hook for data, useUpdateTool mutation for saves.
**Dependencies**: T045
**Expected Outcome**: Modal shows tool detail with editable description

- [ ] **Complete**

---

### T047: Implement description editing with sourceDescription nulling

**File**: `packages/frontend/src/components/ToolDetailModal.tsx`
**Description**: When user edits description and saves, call PATCH /api/tools/:id with new description. Backend nulls sourceDescription (frontend is now source of truth). Show visual indicator when description differs from source (sourceDescription !== null && sourceDescription !== description). After first edit, show "⚠️ Description customised (source: '{sourceDescription}')".
**Dependencies**: T046
**Expected Outcome**: Description editing works, sourceDescription nulled after first edit

- [ ] **Complete**

---

### T048: Add Tools page to navigation

**File**: `packages/frontend/src/components/Navigation.tsx` or `packages/frontend/src/App.tsx`
**Description**: Add "Tools" link to main navigation menu (if exists) or create navigation if not present. Ensure route /tools is registered in router. Position Tools link between Settings and Execute pages.
**Dependencies**: T047
**Expected Outcome**: Tools page accessible from navigation

**Surface Point**: After T048, Tools page working in browser with enable/disable and description editing

- [ ] **Complete**

---

## Group 10: Frontend - Execution Diagnostics

### T049: Extend Execute page with Advanced Options section (collapsible)

**File**: `packages/frontend/src/pages/Execute.tsx`
**Description**: Add collapsible Advanced Options section to Execute page (collapsed by default). Include inputs for: toolChoice (select: auto/required/none/specific tool), maxToolRoundtrips (number), temperature (number 0-2), topP (number 0-1), maxTokens (number), maxRetries (number). Use shadcn/ui Accordion or Collapsible component. Save options to local state, include in POST /api/execute request. Persist options to localStorage.
**Dependencies**: T048
**Expected Outcome**: Execute page shows Advanced Options section

- [ ] **Complete**

---

### T050: Extend execution result display with tool invocation summary

**File**: `packages/frontend/src/pages/Execute.tsx`
**Description**: Extend existing execution result display to show tool summary from execution result: toolInvocationCount, toolTokensUsed, toolExecutionTimeMs, toolErrorCount. Display these metrics alongside existing token counts and cost. Use shadcn/ui Badge or Stat components.
**Dependencies**: T049
**Expected Outcome**: Execution results show tool invocation summary

- [ ] **Complete**

---

### T051: Add detailed tool invocations display

**File**: `packages/frontend/src/components/ToolInvocationsDisplay.tsx`
**Description**: Create component to fetch and display tool invocations using GET /api/execute/:id/tools. For each invocation, show: 1) Tool name and timestamp, 2) Input parameters (JSON with syntax highlighting), 3) Output (JSON with syntax highlighting), 4) Success/failure status with icon, 5) Execution duration and token counts, 6) Error details (if failed) with stack trace in expandable section, 7) LLM reasoning (if provided), 8) Debug output from capturelicious() calls (with timestamps and variables). Use shadcn/ui Accordion for expandable sections. Follow quickstart.md "Expected Result Display" for structure.
**Dependencies**: T050
**Expected Outcome**: Detailed tool diagnostics displayed below execution result

**Surface Point**: After T051, execution diagnostics working in browser with advanced options and tool invocations display

- [ ] **Complete**

---

## Group 11: Frontend - Export

### T052: Create TanStack Query hook for export

**File**: `packages/frontend/src/hooks/useExport.ts`
**Description**: Create React hook using TanStack Query: useGenerateExport (POST /api/export mutation). Returns markdown string and metadata.
**Dependencies**: T051
**Expected Outcome**: React hook ready for export functionality

- [ ] **Complete**

---

### T053: Create Export Modal with markdown display

**File**: `packages/frontend/src/components/ExportModal.tsx`
**Description**: Create modal component (shadcn/ui Dialog) that: 1) Calls useGenerateExport mutation on open, 2) Displays markdown-formatted export instructions in read-only code block (with syntax highlighting), 3) Provides "Copy to Clipboard" button (using Clipboard API), 4) Provides "Download as .md" button (creates blob download), 5) Shows loading state while generating. Use shadcn/ui Code component for markdown display.
**Dependencies**: T052
**Expected Outcome**: Modal shows export instructions with copy/download

- [ ] **Complete**

---

### T054: Add Export button to Execute page and Tools page

**File**: `packages/frontend/src/pages/Execute.tsx`, `packages/frontend/src/pages/Tools.tsx`
**Description**: Add "Export Instructions" button to both Execute page (near execution results) and Tools page (in header). Clicking button opens Export Modal. Position button prominently but not intrusively. Use shadcn/ui Button component with icon.
**Dependencies**: T053
**Expected Outcome**: Export button opens modal on both pages

**Surface Point**: After T054, export functionality working in browser with markdown display, copy, and download

- [ ] **Complete**

---

## Group 12: Integration Tests

### T055 [P]: Integration test for project configuration and tool discovery

**File**: `packages/backend/tests/integration/project-discovery.test.ts`
**Description**: Write integration test for full discovery flow: 1) PUT /api/project with real test project path, 2) Poll GET /api/project/discovery/status until complete, 3) Verify workspace directory created with correct structure, 4) Verify tools saved to database, 5) Verify GET /api/tools returns discovered tools, 6) Clean up test workspace after test. Use real filesystem and database (not mocked).
**Dependencies**: T054
**Expected Outcome**: Integration test validates end-to-end discovery flow

- [ ] **Complete**

---

### T056 [P]: Integration test for hook execution lifecycle

**File**: `packages/backend/tests/integration/hook-execution.test.ts`
**Description**: Write integration test for hook lifecycle: 1) Create test workspace with hook files, 2) Implement beforeAll/beforeEach/afterEach/afterAll hooks that modify shared state, 3) Execute tool and verify hooks ran in correct order (beforeAll once → beforeEach per invocation → tool execute → afterEach per invocation → afterAll once), 4) Verify context merging (beforeAll + beforeEach context available in tool execute). Use real filesystem, no mocks.
**Dependencies**: T054
**Expected Outcome**: Integration test validates hook lifecycle and context merging

- [ ] **Complete**

---

### T057 [P]: Integration test for tool execution with diagnostics capture

**File**: `packages/backend/tests/integration/tool-execution.test.ts`
**Description**: Write integration test for tool execution: 1) Create test tool with capturelicious() debug calls, 2) Execute prompt that triggers tool, 3) Verify tool invocation saved to database with correct diagnostics (inputParams, output, timing, tokens), 4) Verify debug output captured from capturelicious(), 5) Verify execution result includes tool summary (toolInvocationCount, toolTokensUsed, etc.). Use real Vercel AI SDK with fixture responses.
**Dependencies**: T054
**Expected Outcome**: Integration test validates tool execution and diagnostics capture

- [ ] **Complete**

---

### T058: Integration test for discovery cancellation and cleanup

**File**: `packages/backend/tests/integration/discovery-cancellation.test.ts`
**Description**: Write integration test for discovery cancellation: 1) PUT /api/project to start discovery, 2) Immediately POST /api/project/discovery/cancel, 3) Verify discovery stops (phase changes to 'cancelled' or 'idle'), 4) Verify partial workspace files removed, 5) Verify no tools saved to database, 6) Verify no project configuration saved. Use real filesystem and database.
**Dependencies**: T055, T056, T057
**Expected Outcome**: Integration test validates cancellation and cleanup

**Surface Point**: After T058, all integration tests passing

- [ ] **Complete**

---

## Group 13: Documentation (User-Facing, Spec 003 Only)

### T059 [P]: Update README.md with tool integration capability

**File**: `README.md` (repository root)
**Description**: Add "Tool Integration" to "Current capabilities" section in README. Brief description: "Connect your existing codebase with AI SDK tool() definitions, configure tools, execute prompts with tool support, and observe detailed diagnostics." No mention of future specs.
**Dependencies**: T058
**Expected Outcome**: README.md updated with tool integration in capabilities list

- [ ] **Complete**

---

### T060 [P]: Create docs/features/tool-integration.md (overview)

**File**: `docs/features/tool-integration.md`
**Description**: Create user-facing documentation for tool integration feature. Include: 1) Overview of tool discovery process, 2) Project configuration steps, 3) Tool management (enable/disable, edit descriptions), 4) Hook system basics (overview only, detailed guide in separate doc), 5) Execution with tools, 6) Diagnostics explanation, 7) Export instructions workflow. Reference quickstart.md for user journey examples. NO mention of future specs.
**Dependencies**: T058
**Expected Outcome**: Tool integration feature documented

- [ ] **Complete**

---

### T061 [P]: Create docs/features/workspace-setup.md (VS Code integration)

**File**: `docs/features/workspace-setup.md`
**Description**: Create user guide for workspace and editor setup. Include: 1) Workspace structure explanation (workspace/{project-name}/ in promptalicious repo), 2) TypeScript configuration (tsconfig.json with @rootalicious alias), 3) VS Code setup (settings.json to include workspace in TypeScript language server), 4) IntelliSense support for imports from user's project, 5) Editing hook files with full type safety. Include code examples and screenshots (if possible).
**Dependencies**: T058
**Expected Outcome**: Workspace setup and VS Code integration documented

- [ ] **Complete**

---

### T062 [P]: Create docs/features/hooks.md (hook system reference)

**File**: `docs/features/hooks.md`
**Description**: Create comprehensive hook system documentation. Include: 1) Lifecycle explanation (beforeAll → beforeEach → execute → afterEach → afterAll), 2) Hook function signatures with TypeScript examples, 3) Context merging (beforeAll + beforeEach → tool execute), 4) Common patterns (database connections, service initialization, request IDs, cleanup), 5) Error handling (hook failures abort execution), 6) Detected parameters (scope analysis results), 7) Examples for each hook type with real-world use cases (database, auth, logging).
**Dependencies**: T058
**Expected Outcome**: Hook system comprehensively documented

- [ ] **Complete**

---

### T063: Update docs/api/api-contracts.md with new endpoints

**File**: `docs/api/api-contracts.md`
**Description**: Extend existing API contracts documentation with new endpoints from spec 003: 1) Project Configuration API (GET /api/project, PUT /api/project, GET /api/project/discovery/status, POST /api/project/discovery/cancel), 2) Tools API (GET /api/tools, GET /api/tools/:id, PATCH /api/tools/:id), 3) Extended Execution API (POST /api/execute with advancedOptions, GET /api/execute/:id/tools), 4) Export API (POST /api/export). Include request/response schemas, error codes, example curl commands. Reference contracts/*.yaml files for exact schemas.
**Dependencies**: T059, T060, T061, T062
**Expected Outcome**: API contracts documentation complete for spec 003

- [ ] **Complete**

---

### T064: Update docs/backend/database.md with new tables

**File**: `docs/backend/database.md`
**Description**: Document new database tables from spec 003: 1) project_configuration table (single row, schema, constraints), 2) tools table (schema, relationships), 3) tool_invocations table (schema, relationships), 4) Extended execution_results table (new columns for tool summary). Include entity-relationship diagram (text-based or Mermaid). Reference data-model.md for exact schemas.
**Dependencies**: T063
**Expected Outcome**: Database schema documentation updated

- [ ] **Complete**

---

### T065: Create docs/troubleshooting/tools.md (common issues)

**File**: `docs/troubleshooting/tools.md`
**Description**: Create troubleshooting guide for tool integration issues. Include: 1) Discovery failures (project path invalid, no AI SDK tools found, tsconfig.json missing), 2) Hook execution errors (hook file syntax errors, import failures, runtime errors), 3) Tool execution failures (undefined parameters, hook context missing, LLM doesn't call tool), 4) Workspace issues (tsconfig.json path alias not working, IntelliSense not working, workspace directory not found), 5) Export issues (no tools configured, workspace files missing). Provide solutions and debugging steps for each issue.
**Dependencies**: T064
**Expected Outcome**: Troubleshooting guide for tool integration complete

**Surface Point**: After T065, all documentation complete for spec 003

- [ ] **Complete**

---

## Dependencies Summary

**Foundation blocks everything**: T001-T003 must complete before any API work

**Discovery chain**: T004-T017 are sequential (async discovery implementation)

**Tools API**: T018-T022 depend on discovery being complete

**Debug package**: T023-T024 are independent (can run in parallel with other groups)

**Tool execution**: T025-T031 depend on debug package and extend existing execution service

**Export**: T032-T034 depend on tool execution being complete

**Frontend - Project/Tools**: T035-T048 depend on backend APIs being ready

**Frontend - Execution**: T049-T051 extend existing Execute page

**Frontend - Export**: T052-T054 depend on export API and other frontend work

**Integration tests**: T055-T058 validate complete end-to-end flows (depend on all features)

**Documentation**: T059-T065 document completed features (depend on all implementation)

---

## Parallel Execution Examples

### Group 1 Foundation (All Parallel):
```bash
# Launch T001-T003 together (different migration files):
Task: "Database migration for project_configuration table"
Task: "Database migration for tools table"
Task: "Database migration for tool_invocations and extend execution_results"
```

### Group 3 Tools API Contract Tests (All Parallel):
```bash
# Launch T018-T020 together (different test cases in same file, but marking as parallel since they're independent):
Task: "Contract test GET /api/tools"
Task: "Contract test GET /api/tools/:id"
Task: "Contract test PATCH /api/tools/:id"
```

### Group 5 Debug Package + Group 4 Tools API (Parallel Groups):
```bash
# T023-T024 (debug package) can run in parallel with T021-T022 (tools API finalization):
Task: "Create @promptalicious/debug package scaffolding"
Task: "Add shared type definitions for tools"
```

### Group 12 Integration Tests (All Parallel):
```bash
# Launch T055-T057 together (different test files):
Task: "Integration test for project configuration and tool discovery"
Task: "Integration test for hook execution lifecycle"
Task: "Integration test for tool execution with diagnostics capture"
```

### Group 13 Documentation (Most Parallel):
```bash
# Launch T059-T062 together (different doc files):
Task: "Update README.md with tool integration capability"
Task: "Create docs/features/tool-integration.md"
Task: "Create docs/features/workspace-setup.md"
Task: "Create docs/features/hooks.md"
```

---

## Notes

- **[P] markers**: Tasks marked [P] can run in parallel IF they modify different files and have no dependencies
- **Test-first discipline**: Contract tests (T004-T007, T018-T020, T025-T026, T032) MUST be written and MUST FAIL before implementation
- **Tight RED-GREEN cycles**: Write test immediately before implementation (no batching)
- **DrizzleORM critical**: NEVER manually edit migration files, ONLY use drizzle-kit commands
- **Workspace location critical**: Workspace MUST be in promptalicious/workspace/, user's project MUST remain untouched
- **Surface frequently**: After each group (every 2-8 tasks), test working software via curl or browser
- **Async discovery**: PUT /api/project returns 202 Accepted immediately, discovery runs in background, frontend polls for status

---

## Quality Gates (MUST PASS before marking spec complete)

After all tasks complete, run:

```bash
pnpm typecheck      # Zero errors
pnpm lint           # Zero errors/warnings
pnpm format:check   # All files formatted (run pnpm format if fails)
pnpm test:ci        # All tests passing (non-interactive mode for CI/audits)
```

Validate quickstart scenarios (quickstart.md) work end-to-end in browser.

---

**Total Tasks**: 65
**Parallel Tasks**: 16 (marked with [P])
**Maximum Sequential Chain**: 8 tasks (Group 2, within constitutional 10-task limit)
**Estimated Completion**: Per plan.md, ~52 tasks originally estimated, expanded to 65 with documentation

---

**Status**: ✅ Tasks generated, ready for implementation via /implement command
