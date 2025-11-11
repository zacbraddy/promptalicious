# Feature Specification: Core Tool Integration System

**Feature Branch**: `003-introduce-tooling-now`
**Created**: 2025-11-10
**Status**: Clarified & Ready for Planning
**Input**: User description: "Introduce tooling: Now that we've gotten ourselves to the point where we can successfully make a call to a LLM via the application we need to start making progress towards what we're trying to actually achieve with the software. A big step towards that will be to introduce the ability to add tools to your call to the LLM."

## Execution Flow (main)

```
1. Parse user description from Input
   → ✅ Feature description provided
2. Extract key concepts from description
   → ✅ Identified: LLM tools, external project integration, tool configuration, diagnostics
3. For each unclear aspect:
   → ✅ All clarifications resolved through stakeholder discussion
4. Fill User Scenarios & Testing section
   → ✅ Primary user journey defined with 8 acceptance scenarios
5. Generate Functional Requirements
   → ✅ 22 functional requirements specified
6. Identify Key Entities (if data involved)
   → ✅ 6 key entities identified
7. Run Review Checklist
   → ✅ All checks passed
8. Return: SUCCESS (spec ready for planning)
```

---

## ⚡ Quick Guidelines

- ✅ Focus on WHAT users need and WHY
- ❌ Avoid HOW to implement (no tech stack, APIs, code structure)
- 👥 Written for business stakeholders, not developers

---

## Product Vision

Promptalicious is "Postman for LLMs" - a debugging and iteration tool that allows developers to:

1. Connect their existing codebase containing LLM tool implementations
2. Discover and configure tools without modifying source code
3. Iterate rapidly on prompts, tool descriptions, and SDK options
4. Observe detailed diagnostics about tool execution
5. Export working configurations back to their codebase with minimal friction

This feature establishes the foundation: tool discovery, configuration, execution, and basic export.

**Supported AI SDK Versions**: Vercel AI SDK v4.x and v5.x (supports both `parameters` and `inputSchema` properties for backwards compatibility)

---

## User Scenarios & Testing

### Primary User Story

As a developer debugging LLM tool calls, I want to integrate my existing tool implementations into promptalicious, configure tool descriptions and parameters, and observe detailed diagnostics about tool execution, so that I can rapidly iterate on tool definitions and prompts without copying code back and forth between projects.

### Acceptance Scenarios

1. **Given** I have a project with tool implementations at `~/my-project/src/tools/`, **When** I configure promptalicious to access this project via folder picker, **Then** promptalicious should scan the project, discover available tools, and display them in the tool selection interface

2. **Given** promptalicious has discovered tools from my project, **When** I view a tool's details, **Then** I should see the tool name, description (from source code), parameter schema, and execution function extracted from source

3. **Given** I have selected a tool for my prompt execution, **When** I edit the tool's description in the frontend, **Then** the modified description becomes the source of truth for subsequent executions (source value no longer tracked)

4. **Given** a discovered tool requires external dependencies (e.g., services, execution context), **When** promptalicious generates the workspace, **Then** I should see auto-generated hook files (`beforeAll.ts`, `beforeEach.ts`, `afterEach.ts`, `afterAll.ts`) with stubs showing detected parameter names

5. **Given** I have configured hooks to provide execution context, **When** I execute a prompt with tools enabled, **Then** the system should run hooks in sequence (beforeAll → beforeEach → tool execution → afterEach → afterAll) and merge hook outputs into tool scope

6. **Given** I execute a prompt with tools enabled, **When** the LLM calls a tool, **Then** I should see detailed diagnostics including tool name, input parameters, execution duration, output, token costs, success/failure status, and LLM reasoning (if provided)

7. **Given** a tool contains `capturelicious("message", {vars})` debug calls, **When** the tool executes, **Then** I should see debug messages and variable values captured in real-time in the diagnostics output

8. **Given** I have completed iterating on my tools and prompts, **When** I click "Export Instructions", **Then** I should receive code-generated instructions showing the final tool execute function, AI SDK options object, and refactoring steps to apply changes back to my codebase

### Edge Cases

- What happens when a tool implementation throws an error during execution?
  - System captures error details, displays in diagnostics with stack trace, allows execution to continue for other tools, tracks error in aggregated statistics

- What happens when a tool's dependencies are not available (e.g., missing services)?
  - Hook execution fails with clear error message indicating which dependency is missing, execution aborts before tool invocation

- What happens when a tool's output doesn't match expected schema?
  - System detects schema mismatch, reports validation error in diagnostics, execution continues but marks tool invocation as failed

- What happens when tool execution times out or hangs?
  - System enforces execution timeout (configurable in advanced options), reports timing failure in diagnostics

- What happens when the user modifies tool code in their editor while execution is in progress?
  - Changes only affect subsequent executions; in-flight executions use already-loaded code

- What happens when the target project uses a different SDK than AI SDK?
  - Future feature (005): Multi-SDK support. For now, system displays error: "Only AI SDK tools are currently supported"

---

## Requirements

### Functional Requirements

#### Project Configuration & Discovery

- **FR-001**: System MUST provide a folder picker in frontend settings to configure relative path from promptalicious to target project

- **FR-002**: System MUST scan configured project for files importing `tool` function from `ai` SDK using static analysis

- **FR-003**: System MUST extract tool definitions from discovered files by:
  - Locating `tool()` function calls
  - Extracting `description`, `parameters` schema, and `execute` function
  - Analysing `execute` function for undefined variables to determine hook parameter requirements

- **FR-004**: System MUST create a gitignored workspace directory (`promptalicious-workspace/`) containing:
  - Workspace-level `environment.d.ts` file with `WorkspaceEnvironment` type (union of all tool environments)
  - Workspace-level `beforeAll.ts` hook (runs once before all tools, returns `Promise<Partial<WorkspaceEnvironment>>`)
  - Workspace-level `afterAll.ts` hook (runs once after all tools complete)
  - Per-tool subdirectories identified by tool name or ID
  - Tool-level `tool.ts` file containing extracted `execute` function with `import "./environment"` for type-safe environment access
  - Tool-level `environment.d.ts` file containing type imports and ambient declarations using `declare global` blocks for closure variables
  - Tool-level hook stub files: `beforeAll.ts`, `beforeEach.ts`, `afterEach.ts`, `afterAll.ts` with typed return values (`Promise<Partial<ToolEnvironment>>`)
  - `tsconfig.json` with `@rootalicious` path alias pointing to target project

- **FR-005**: System MUST display discovered tools in frontend with:
  - Tool name (extracted from source)
  - Description (extracted from source, editable)
  - Parameter schema (extracted from source)
  - Enable/disable toggle
  - Link to view/edit workspace files

#### Hook System

- **FR-006**: Auto-generated hook stub files MUST indicate detected parameters needed by tool execution. Environment type declarations MUST be generated in `environment.d.ts` with proper type imports from the user's project using `import` (not `import type`) to support both interfaces and classes

- **FR-007**: Users MUST be able to edit hook files in their code editor with full import access to target project via `@rootalicious` alias. Tool files MUST import environment declarations using `import "./environment"` pattern (not triple-slash references) to comply with ESLint rules

- **FR-008**: Hook files MUST export a default function returning `Promise<Partial<ToolEnvironment>>` where `ToolEnvironment` is the type generated from detected closure variables. Tool execution environment MUST be made available via ambient declarations using `declare global` blocks

- **FR-009**: System MUST execute hooks in sequence during LLM execution with workspace-level and tool-level hooks:
  - Workspace `beforeAll()` - Once at start of LLM execution (returns shared context for all tools)
  - For each tool invocation:
    - Tool `beforeAll()` - Once before any invocations of this tool (returns tool-specific context, merged with workspace context)
    - Tool `beforeEach()` - Before each invocation (returns per-invocation context, merged with workspace + tool context)
    - Tool `execute()` - Runs with merged context (workspace beforeAll + tool beforeAll + tool beforeEach)
    - Tool `afterEach()` - After each invocation
    - Tool `afterAll()` - Once after all invocations of this tool complete
  - Workspace `afterAll()` - Once at end of LLM execution (cleanup shared resources)
  - Merge precedence (later overrides earlier): workspace beforeAll → tool beforeAll → tool beforeEach

- **FR-010**: Hook execution failures MUST abort execution with clear error messages indicating which hook failed and why

#### Tool Configuration

- **FR-011**: Users MUST be able to enable/disable individual tools for a prompt execution

- **FR-012**: Users MUST be able to edit tool descriptions in frontend interface

- **FR-013**: Tool metadata (name, description) MUST default to source code values on discovery, then frontend values become source of truth after first edit (source no longer tracked)

- **FR-014**: System MUST persist tool configurations across page refreshes during execution

#### AI SDK Options Configuration

- **FR-015**: Frontend MUST expose AI SDK call-level options in an "Advanced Options" section (collapsed by default):
  - `maxTokens` / `maxTokenBudget`
  - `temperature`
  - `topP`
  - `maxRetries`
  - Tool choice strategy (`auto`, `required`, `none`, specific tool)
  - Parallel tool calling (true/false)

- **FR-016**: System MUST provide a user setting to default Advanced Options section to expanded state

- **FR-017**: Advanced option values MUST default to sensible values if not specified in source code, otherwise default to source code values

#### Tool Execution & Diagnostics

- **FR-018**: System MUST provide `@promptalicious/debug` package exporting `capturelicious(message, variables)` function importable in tool files

- **FR-019**: `capturelicious()` calls during tool execution MUST capture output and display in real-time in frontend diagnostics

- **FR-020**: System MUST display detailed diagnostics for each tool invocation:
  - Tool name
  - Timestamp
  - Input parameters (from LLM)
  - Execution duration
  - Output/return value
  - Token costs (input/output tokens)
  - Success/failure status
  - Error details (if failed): type, message, stack trace
  - LLM reasoning for tool call (if available in response)
  - Debug output from `capturelicious()` calls

- **FR-021**: System MUST display aggregated tool statistics:
  - Total tool calls (overall and per tool)
  - Total tokens used by tools (input/output breakdown)
  - Total time spent in tool execution
  - Error rate per tool
  - Cost analysis for tool usage (in GBP, using existing pricing system)

- **FR-022**: Tool execution errors MUST NOT abort entire execution - system continues with remaining tools and marks failed invocations

#### Export Functionality

- **FR-023**: System MUST provide "Export Instructions" button that generates code-based instructions including:
  - Final tool `execute` function code
  - AI SDK options object with current frontend values
  - Tool configuration (name, description, enabled state)
  - Step-by-step refactoring instructions for applying changes to source project

- **FR-024**: Export instructions MUST be generated without requiring LLM calls (code-generated output)

#### Multi-SDK Architecture (Foundation Only)

- **FR-025**: Tool discovery, extraction, and option mapping MUST be implemented behind an abstract interface to support future SDK integrations

- **FR-026**: AI SDK integration MUST be the only implemented SDK adapter for this feature, but architecture MUST support adding additional SDK adapters without refactoring core system

#### Project Management

- **FR-027**: System MUST allow user to assign a name to the project configuration
  - Default: derived from target folder name (e.g., "my-project" from "../my-project")
  - Editable in Settings page

#### Discovery Observability

- **FR-028**: System MUST provide real-time progress feedback during tool discovery
  - Tool discovery runs asynchronously after project configuration
  - Frontend polls `/api/project/discovery/status` for progress updates
  - Display scanning progress (files scanned, filtered, analyzed)
  - Show each discovered tool with parameters and detected dependencies
  - Display workspace generation progress (files created, lines extracted)
  - Provide expandable detailed log view in modal

- **FR-029**: System MUST log all discovery decisions with reasoning
  - Why files were skipped (no AI SDK import, parse errors, etc.)
  - Which variables were detected as hook parameters (scope analysis results)
  - How many lines extracted for each tool execute function
  - All filesystem operations (directories created, files generated)

- **FR-030**: Discovery status endpoint MUST return incremental updates
  - Array of log entries with timestamp, level, phase, message, context
  - Only new entries since last poll (incremental delivery)
  - Current phase: idle, scanning, analyzing, generating, complete, error
  - Progress counters (filesScanned, filesAnalyzed, toolsFound, filesGenerated)
  - Summary statistics when complete (final counts, skipped files with reasons)

- **FR-031**: System MUST support cancelling in-progress discovery
  - POST `/api/project/discovery/cancel` aborts discovery
  - Warning confirmation before canceling
  - Cleanup removes partial workspace files
  - Project configuration not saved if discovery cancelled
  - Modal shows cancellation was successful

### Key Entities

#### Project Configuration

- **What it represents**: Connection between promptalicious and user's codebase
- **Key attributes**:
  - Project name (user-editable, defaults to folder name)
  - Target project path (relative to promptalicious)
  - Workspace directory location (inside promptalicious repo)
  - Discovery settings (which directories to scan)
  - Path alias configuration (`@rootalicious`)

#### Tool Definition

- **What it represents**: A discovered tool available for LLM execution
- **Key attributes**:
  - Unique identifier
  - Name (from source, then UI override)
  - Description (from source, then UI override)
  - Parameter schema (from source)
  - Execute function code (extracted from source, user-editable in workspace)
  - Detected hook parameters (undefined variables in execute function)
  - Source file location
  - Workspace directory path

#### Tool Configuration

- **What it represents**: User's customized settings for a specific tool
- **Key attributes**:
  - Tool identifier
  - Enabled/disabled state
  - Custom description (overrides source)
  - Custom name (overrides source)
  - Relationship to execution

#### Hook Definition

- **What it represents**: Pre/post execution scripts providing context to tools
- **Key attributes**:
  - Hook type (beforeAll, beforeEach, afterEach, afterAll)
  - Associated tool identifier
  - File path in workspace
  - Parameter names to provide
  - Export function signature

#### Tool Execution Result

- **What it represents**: Outcome and diagnostics from a single tool invocation
- **Key attributes**:
  - Tool identifier
  - Timestamp
  - Input parameters (from LLM)
  - Output/return value
  - Execution duration
  - Token usage (input/output)
  - Success/error status
  - Error details (type, message, stack)
  - Debug output (capturelicious messages)
  - LLM reasoning (if provided)
  - Relationship to parent execution

#### Tool Execution Summary

- **What it represents**: Aggregated statistics across all tool calls in an execution
- **Key attributes**:
  - Total invocations (overall and per tool)
  - Aggregate token usage (input/output)
  - Aggregate timing
  - Error rates per tool
  - Cost breakdown
  - Relationship to execution result

#### Discovery Log Entry

- **What it represents**: Single log entry from tool discovery process
- **Key attributes**:
  - Timestamp
  - Log level (info, warning, error)
  - Discovery phase (scanning, analyzing, generating, complete)
  - Message
  - Context (file path, tool name, reason, lines extracted, detected parameters)

---

## Review & Acceptance Checklist

### Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

### Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Scope is clearly bounded (single project, AI SDK only, basic export)
- [x] Dependencies and assumptions identified

---

## Execution Status

- [x] User description parsed
- [x] Key concepts extracted
- [x] Ambiguities resolved through stakeholder discussion
- [x] User scenarios defined (8 scenarios)
- [x] Requirements generated (26 functional requirements)
- [x] Entities identified (7 entities - added DiscoveryLogEntry)
- [x] Review checklist passed

---

## Scope Boundaries

### In Scope (Feature 003)

✅ Single project support
✅ AI SDK tool discovery and extraction
✅ Hook system with auto-generated stubs
✅ Workspace management with @rootalicious alias
✅ Tool configuration UI
✅ AI SDK advanced options
✅ capturelicious() debug function
✅ Detailed execution diagnostics
✅ Aggregated statistics
✅ Basic export (code-generated instructions)
✅ Multi-SDK abstraction layer (architecture only, AI SDK implementation)

### Out of Scope (Future Features)

❌ Multi-project support (planned for future)
❌ Execution history and replay (planned for future)
❌ Database-backed caching (planned for future)
❌ Favourite/rename executions (planned for future)
❌ Reset functionality (soft/hard) (planned for future)
❌ Tool rescan functionality (planned for future)
❌ AI-assisted export instructions (planned for future)
❌ Additional SDK integrations (planned for future)

**Documentation Scope**:

- ✅ Document ONLY features implemented in spec 003
- ❌ Do NOT mention future specs (004, 005) or planned features
- ❌ Do NOT speculate about multi-project, history, reset, or rescan
- Focus: What users can do NOW with this release

---

## Next Steps

1. ✅ Clarifications resolved
2. ✅ Spec complete and ready for planning
3. ⏭️ Run `/plan` to generate implementation design
4. ⏭️ Generate tasks from plan
5. ⏭️ Begin implementation

---

## Additional Notes

### Reference Architecture

See `private/reference-architecture.md` for detailed analysis of existing tool implementation patterns in reference project. This document informed the hook system design and SDK abstraction requirements.

**⚠️ PRIVACY WARNING**: The `private/` directory MUST be deleted before merging this branch to main to prevent reference project details from entering the open-source repository.

### Design Constraints

- Must integrate with existing GPT-4o-mini + Vercel AI SDK execution path
- Must maintain retrofuturistic dark theme (shadcn/ui + Tailwind)
- Must preserve page refresh recovery capability
- Must extend existing diagnostics display system
- Must follow DDD/Onion architecture patterns where beneficial
- Should surface working software frequently (max 5 tasks before surfacing)

### Implementation Notes

#### Environment Type System (TypeScript Ambient Declarations)

The workspace generator creates type-safe environment variables for tool execution using modern TypeScript patterns:

**Pattern**: `import "./environment"` with `declare global` blocks

**Rationale**:

- Avoids triple-slash references (`/// <reference path="..."/>`) which trigger ESLint warnings (`@typescript-eslint/triple-slash-reference`)
- Uses modern import syntax for loading ambient declarations
- Supports both interfaces and classes by using regular `import` (not `import type`)
- Provides full type safety for closure variables in generated tool files

**Generated File Structure**:

1. **environment.d.ts** - Contains type imports and ambient declarations:

   ```typescript
   import { IExecutionContext } from "../rootalicious/...";
   import { IOpenCVClient } from "../rootalicious/...";

   export type ToolEnvironment = {
     context: IExecutionContext;
     opencv: IOpenCVClient;
   };

   declare global {
     const context: IExecutionContext;
   }
   declare global {
     const opencv: IOpenCVClient;
   }
   ```

2. **tool.ts** - Imports environment for type-safe variable access:

   ```typescript
   import "./environment";

   export default async (params: ToolParams): Promise<ToolResponse> => {
     // context and opencv are now available with full type information
     const frame = context.frames.find(...);
   };
   ```

3. **beforeAll.ts / beforeEach.ts** - Return typed environment objects:

   ```typescript
   import type { ToolEnvironment } from "./environment";

   export default async function beforeAll(): Promise<
     Partial<ToolEnvironment>
   > {
     return {
       context: undefined, // TODO: Provide context
       opencv: undefined, // TODO: Provide opencv
     };
   }
   ```

**Type Import Resolution**:

- Tool Discovery Service extracts type names from closure variables using ts-morph AST traversal
- Finds corresponding imports in source file
- Resolves `@/` path aliases to `../rootalicious/` relative paths for workspace imports
- Handles both explicit type annotations (`context: IExecutionContext`) and inferred types

**Key Decision**: Use regular `import` instead of `import type` to support both type-only constructs (interfaces) and runtime constructs (classes used as types)

### Non-Functional Considerations

- **Performance**: Not a first-class concern for this feature. Promptalicious is a local development tool running on the developer's machine. Performance optimisation is deferred unless it materially impacts developer experience (e.g., tool discovery taking minutes instead of seconds, or UI becoming unresponsive). Reasonable performance expectations:
  - Tool discovery: seconds for typical projects (<1000 files)
  - Execution diagnostics: near real-time display (<1s update latency)
  - Page refresh recovery: maintained from existing system
- **Scalability**: Single-user, local tool - horizontal/vertical scaling not applicable
- **Reliability**: Local operation reduces external failure modes; error handling focuses on clear user feedback rather than uptime targets

### Future Feature Dependencies

- Feature 004 (Project Management & History) builds on this feature's workspace and configuration system
- Feature 005 (Reset & AI-Assisted Export) extends this feature's export functionality
- Additional SDK support (Feature 005+) uses the abstraction layer established here
