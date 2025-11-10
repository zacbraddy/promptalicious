# Research: Core Tool Integration System

**Feature**: 003-introduce-tooling-now
**Date**: 2025-11-10
**Status**: Complete

This document captures research findings and technical decisions for implementing LLM tool integration in promptalicious.

---

## Research Areas

### 1. Tool Discovery & Static Analysis

**Context**: Need to scan user's project for AI SDK tool() definitions and extract metadata

**Decision 1: Use ts-morph for TypeScript AST Analysis**

**Rationale**:
- ts-morph is the standard TypeScript Compiler API wrapper for static analysis
- Provides high-level API for navigating and querying TypeScript ASTs
- Handles module resolution, type information, and source file navigation
- Well-maintained by ts-morph.com team, excellent TypeScript ecosystem support
- Avoids manual TypeScript AST navigation (complex and error-prone)

**Alternatives Considered**:
- Raw TypeScript Compiler API: Too low-level, requires deep TS compiler knowledge
- Regex/string parsing: Brittle, cannot handle complex nested structures or imports
- Babel with TypeScript plugin: Adds unnecessary dependency, ts-morph is purpose-built

**Implementation Pattern**:
```typescript
import { Project } from 'ts-morph'

const project = new Project({
  tsConfigFilePath: path.join(targetProjectPath, 'tsconfig.json')
})

// Find all source files importing 'tool' from 'ai' SDK
const sourceFiles = project.getSourceFiles()
const toolFiles = sourceFiles.filter(sf =>
  sf.getImportDeclarations()
    .some(imp =>
      imp.getModuleSpecifierValue() === 'ai' &&
      imp.getNamedImports().some(ni => ni.getName() === 'tool')
    )
)

// Extract tool definitions from each file
for (const file of toolFiles) {
  const toolCalls = file.getDescendantsOfKind(SyntaxKind.CallExpression)
    .filter(call => call.getExpression().getText() === 'tool')

  for (const toolCall of toolCalls) {
    // Parse object literal argument to extract description, parameters, execute function
    const arg = toolCall.getArguments()[0]
    if (Node.isObjectLiteralExpression(arg)) {
      const description = arg.getProperty('description')?.getInitializer()?.getText()
      const parameters = arg.getProperty('parameters')?.getInitializer()?.getText()
      const execute = arg.getProperty('execute')?.getInitializer()

      // Extract execute function body and detect undefined variables
      if (Node.isFunctionLikeDeclaration(execute)) {
        const body = execute.getBody()?.getText()
        // Analyse for undefined variables to determine hook parameters
      }
    }
  }
}
```

**Source**: Context7 - `/websites/ts-morph_com-details-index`
**Established**: 2025-11-10

---

**Decision 2: Detect Hook Parameters via Scope Analysis**

**Rationale**:
- Tool execute functions may reference variables not in their parameter list (e.g., services, database connections)
- ts-morph provides symbol and scope analysis to identify undefined references
- This enables auto-generating hook stub files showing detected parameters

**Implementation Pattern**:
```typescript
// Given an execute function node
const executeFunc = // ... extracted from tool() call
const body = executeFunc.getBody()

// Get all identifiers in function body
const identifiers = body.getDescendantsOfKind(SyntaxKind.Identifier)

// Filter to variables not defined in function scope
const undefinedVars = identifiers.filter(id => {
  const symbol = id.getSymbol()
  const declarations = symbol?.getDeclarations() || []

  // Variable is undefined if it has no declaration in this scope or parent scopes
  return declarations.length === 0 ||
         !declarations.some(decl => executeFunc.contains(decl))
})

// Generate hook stub with detected parameters
const hookParams = [...new Set(undefinedVars.map(v => v.getText()))]
generateHookStub({ params: hookParams })
```

**Alternatives Considered**:
- Manual parameter annotation: Requires user to explicitly declare dependencies (poor DX)
- Runtime detection: Cannot detect at discovery time, requires execution

**Established**: 2025-11-10

---

### 2. Workspace Management

**Context**: Need to create isolated workspace for tool files with access to user's project

**Decision 3: Create Workspace Inside Promptalicious Repo with TypeScript Path Aliases**

**Rationale**:
- Workspace must be gitignored (contains user-specific configuration)
- Workspace lives in promptalicious repo to avoid polluting user's codebase
- Tool files need to import from user's project via path alias (e.g., `@rootalicious/`)
- Each tool gets its own subdirectory for organisation
- Auto-generated tsconfig.json enables full TypeScript support in user's editor
- User's project remains completely untouched (read-only)

**Structure**:
```
promptalicious/                         # Promptalicious repo
├── workspace/                          # Gitignored directory
│   ├── .gitkeep                       # Track empty directory in git
│   └── {project-name}/                # Per-project workspace
│       ├── tsconfig.json              # Generated with @rootalicious alias
│       └── {tool-id}/                 # Per-tool directory
│           ├── tool.ts                # Extracted execute function
│           ├── beforeAll.ts           # Hook stub (auto-generated)
│           ├── beforeEach.ts          # Hook stub (auto-generated)
│           ├── afterEach.ts           # Hook stub (auto-generated)
│           └── afterAll.ts            # Hook stub (auto-generated)

{user-project}/                         # User's project (UNTOUCHED, READ-ONLY)
└── src/tools/                          # Original tool definitions
    └── *.ts                            # Source files (never modified)
```

**Generated tsconfig.json** (inside `workspace/{project-name}/`):
```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@rootalicious/*": ["../../../{relative-path-to-user-project}/*"]
    }
  },
  "include": ["**/*"]
}
```

**IDE Support Requirements**:
- Workspace tsconfig extends promptalicious root tsconfig for consistent TypeScript settings
- `baseUrl: "."` ensures path aliases resolve from workspace directory
- `.vscode/settings.json` ensures workspace directory included in TypeScript language server
- When user edits hook files, language server automatically finds workspace tsconfig
- `@rootalicious` alias provides full IntelliSense for imports from user's project

**Hook Stub Example** (`beforeAll.ts`):
```typescript
// Auto-generated hook stub for tool: getUserProfile
// Detected parameters: db, authService
// Edit this file to provide these parameters to tool execution

export default async function beforeAll() {
  return {
    db: undefined,           // TODO: Provide database connection
    authService: undefined   // TODO: Provide auth service instance
  }
}
```

**Alternatives Considered**:
- Workspace in user's project: Pollutes user's codebase, requires modifying their .gitignore
- Inline editing in frontend: Poor DX, no TypeScript support, no imports
- Copying tool files into promptalicious without path alias: Breaks import paths from user's project
- Modify user's files directly: Violates spec requirement for non-invasive integration

**Critical Design Decision**:
- Workspace is in promptalicious repo (gitignored via `workspace/` in .gitignore)
- User's project is read-only (we never write to their codebase)
- Export instructions provide manual bridge for applying changes
- Clear separation of concerns: promptalicious manages workspace, user manages their codebase

**Established**: 2025-11-10

---

### 3. Hook System Architecture

**Context**: Need lifecycle hooks to provide execution context to tools

**Decision 4: Implement 4-Phase Hook Lifecycle**

**Rationale**:
- Tools may need setup before any execution (database connections, service initialization)
- Tools may need per-invocation context (request ID, transaction scope)
- Tools may need cleanup after each invocation or after all invocations
- Matches common testing framework patterns (Jest, Vitest) for familiarity

**Lifecycle**:
```
beforeAll()    → Run once before any tool invocations
  ↓
  beforeEach() → Run before each tool invocation
    ↓
    tool.execute({ ...params, ...beforeAllContext, ...beforeEachContext })
    ↓
  afterEach()  → Run after each tool invocation
  ↓
afterAll()     → Run once after all tool invocations complete
```

**Hook Function Signature**:
```typescript
// All hooks are async and return objects (or void for after hooks)
type BeforeAllHook = () => Promise<Record<string, unknown>>
type BeforeEachHook = () => Promise<Record<string, unknown>>
type AfterEachHook = (result: unknown) => Promise<void>
type AfterAllHook = () => Promise<void>
```

**Context Merging**:
- `beforeAll` returns global context (available to all tool invocations)
- `beforeEach` returns per-invocation context (available to current invocation only)
- Tool execute function receives merged object: `{ ...toolParams, ...beforeAllCtx, ...beforeEachCtx }`

**Error Handling**:
- Hook failures MUST abort execution with clear error message
- Error message MUST indicate which hook failed and why
- Frontend displays hook failure as execution error with stack trace

**Alternatives Considered**:
- Single setup hook: Insufficient for global vs per-invocation context
- React-style lifecycle (mount/unmount): Confusing mental model for backend execution
- No hooks, require tools to handle setup: Violates spec requirement for external dependencies

**Established**: 2025-11-10

---

### 4. Tool Execution Integration with Vercel AI SDK

**Context**: Need to integrate user's tool implementations with existing Vercel AI SDK execution flow

**Decision 5: Extend Existing generateText Flow with Tools Array**

**Rationale**:
- Vercel AI SDK's `generateText` already supports tools parameter
- Tool format matches AI SDK's expected structure (name, description, parameters, execute)
- Minimal changes to existing execution infrastructure
- Leverage AI SDK's built-in tool calling support

**Implementation Pattern**:
```typescript
import { generateText, tool as aiTool } from 'ai'
import { openai } from '@ai-sdk/openai'

// Load user's tools from database
const enabledTools = await db.query.tools.findMany({ where: eq(tools.enabled, true) })

// Transform to AI SDK tool format
const toolDefinitions = enabledTools.map(userTool =>
  aiTool({
    description: userTool.description,  // From frontend (may be edited)
    parameters: userTool.parameters,    // From source (zod schema)
    execute: async (params) => {
      // 1. Run beforeEach hook
      const beforeEachCtx = await runHook(userTool.id, 'beforeEach')

      // 2. Load and execute user's tool function from workspace
      const toolModule = await import(`${workspacePath}/${userTool.id}/tool.js`)
      const mergedParams = { ...params, ...globalCtx, ...beforeEachCtx }
      const result = await toolModule.default(mergedParams)

      // 3. Run afterEach hook
      await runHook(userTool.id, 'afterEach', result)

      // 4. Capture diagnostics (timing, params, result, errors)
      await captureDiagnostics({ toolId: userTool.id, params, result, ... })

      return result
    }
  })
)

// Execute prompt with tools
const result = await generateText({
  model: openai('gpt-4o-mini'),
  prompt: userPrompt,
  tools: toolDefinitions,        // <-- Injected tool definitions
  maxToolRoundtrips: 10,          // Allow multiple tool invocation rounds
  toolChoice: 'auto'              // Let LLM decide when to use tools
})
```

**AI SDK Options Exposed in Frontend** (FR-015):
- `maxTokens` / `maxTokenBudget`
- `temperature`
- `topP`
- `maxRetries`
- `toolChoice` (`auto`, `required`, `none`, or specific tool name)
- `maxToolRoundtrips` (parallel tool calling support)

**Alternatives Considered**:
- Custom tool execution outside AI SDK: Duplicates SDK's tool handling logic
- Streaming responses with tools: Deferred to future spec (complexity increase)

**Source**: Context7 - `/vercel/ai` (Vercel AI SDK documentation)
**Established**: 2025-11-10

---

### 5. Debug Instrumentation with capturelicious()

**Context**: Need to provide debug output capability inside tool execution

**Decision 6: Create `@promptalicious/debug` Package with Scoped Capture**

**Rationale**:
- Tools need to output debug messages during execution
- Debug output must be associated with specific tool invocation
- Must work in both local development (console) and promptalicious execution (captured)
- Scoped design prevents cross-contamination between tool invocations

**Package Structure**:
```
packages/debug/
├── package.json                 # @promptalicious/debug
└── src/
    └── index.ts                 # Export capturelicious function
```

**Implementation**:
```typescript
// packages/debug/src/index.ts
type DebugMessage = {
  timestamp: Date
  message: string
  variables?: Record<string, unknown>
}

let captureEnabled = false
let currentCaptures: DebugMessage[] = []

export function capturelicious(message: string, variables?: Record<string, unknown>) {
  const entry = {
    timestamp: new Date(),
    message,
    variables
  }

  if (captureEnabled) {
    currentCaptures.push(entry)
  } else {
    // Fallback: console.log when not in promptalicious execution
    console.log(`[capturelicious] ${message}`, variables)
  }
}

// Internal API for promptalicious backend
export function enableCapture() {
  captureEnabled = true
  currentCaptures = []
}

export function disableCapture() {
  captureEnabled = false
}

export function getCaptures(): DebugMessage[] {
  return [...currentCaptures]
}

export function clearCaptures() {
  currentCaptures = []
}
```

**Usage in User's Tool**:
```typescript
import { capturelicious } from '@promptalicious/debug'

export default async function getUserProfile({ userId, db }) {
  capturelicious('Starting user profile lookup', { userId })

  const user = await db.users.findUnique({ where: { id: userId } })
  capturelicious('User found', { userName: user.name, userEmail: user.email })

  return user
}
```

**Backend Integration**:
```typescript
import { enableCapture, disableCapture, getCaptures, clearCaptures } from '@promptalicious/debug'

async function executeToolWithDiagnostics(toolId: string, params: unknown) {
  enableCapture()
  clearCaptures()

  try {
    const result = await runTool(toolId, params)
    const debugOutput = getCaptures()

    // Store debug output in diagnostics
    await storeDiagnostics({ toolId, params, result, debugOutput })

    return result
  } finally {
    disableCapture()
  }
}
```

**Alternatives Considered**:
- Console.log interception: Brittle, captures unrelated logs
- Custom logger with context: Over-engineered for simple debug output
- No debug support: Violates spec FR-018-019

**Established**: 2025-11-10

---

### 6. Export Functionality

**Context**: Need to generate instructions for applying changes back to user's codebase

**Decision 7: Code-Generated Export (No LLM)**

**Rationale**:
- Export must work without LLM calls (per spec FR-024)
- Output is deterministic: tool execute function, AI SDK options, instructions
- Template-based generation is sufficient for this iteration
- Future AI-assisted export (feature 005) can enhance with semantic analysis

**Export Template Structure**:
```markdown
# Export Instructions

Generated: {timestamp}
Feature: {feature-name}

## Changes Summary

- {N} tools configured
- {N} tools enabled
- AI SDK options customized

## Step 1: Update Tool Definitions

For each tool, apply these changes:

### Tool: {tool-name}

**File**: {original-source-file}
**Function**: {tool-function-name}

**Updated execute function**:
```typescript
{tool-execute-function-from-workspace}
```

**Updated description**:
```
{description-from-frontend}
```

## Step 2: Update AI SDK Call

**Current file**: {execution-file-location}

Replace your generateText call with:

```typescript
const result = await generateText({
  model: openai('gpt-4o-mini'),
  prompt: yourPrompt,
  tools: {
    {tool-name}: tool({
      description: '{description-from-frontend}',
      parameters: z.object({ /* schema from source */ }),
      execute: {execute-function-from-workspace}
    }),
    // ... repeat for all enabled tools
  },
  {advanced-options-from-frontend}
})
```

## Step 3: Refactoring Checklist

- [ ] Copy updated execute functions to original tool files
- [ ] Update tool descriptions in tool definitions
- [ ] Update AI SDK call with new options
- [ ] Test execution with updated configuration
- [ ] Remove promptalicious-workspace/ if no longer needed
```

**Alternatives Considered**:
- LLM-generated instructions: Violates spec FR-024, adds unnecessary complexity
- Auto-apply via git patches: Too invasive, user may want to review first
- No export: Violates spec FR-023

**Established**: 2025-11-10

---

### 7. Database Schema Extensions

**Context**: Need to store tool configurations, project settings, execution results with tool diagnostics

**Decision 8: Extend Existing Schema with Tool-Related Tables**

**Rationale**:
- Leverage existing PostgreSQL + DrizzleORM infrastructure
- Follow established patterns from spec 002 (single-row config, execution caching)
- Tool configurations are persistent across sessions
- Execution results include tool invocation diagnostics

**Schema Additions**:

```typescript
// project_configuration table (new)
export const projectConfiguration = pgTable('project_configuration', {
  id: integer('id').primaryKey().default(1),  // Single row constraint
  targetProjectPath: text('target_project_path').notNull(),
  workspacePath: text('workspace_path').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
})

// tools table (new)
export const tools = pgTable('tools', {
  id: text('id').primaryKey(),  // Unique identifier (e.g., tool name or hash)
  name: text('name').notNull(),
  description: text('description').notNull(),  // May be edited in frontend
  sourceDescription: text('source_description'),  // Original from source (nullable after first edit)
  parametersSchema: jsonb('parameters_schema').notNull(),  // Zod schema as JSON
  sourceFilePath: text('source_file_path').notNull(),
  workspaceDir: text('workspace_dir').notNull(),
  enabled: boolean('enabled').notNull().default(true),
  detectedHookParams: jsonb('detected_hook_params'),  // Array of parameter names
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
})

// tool_invocations table (new)
export const toolInvocations = pgTable('tool_invocations', {
  id: text('id').primaryKey(),
  executionId: text('execution_id').notNull(),  // References execution_results
  toolId: text('tool_id').notNull().references(() => tools.id),
  timestamp: timestamp('timestamp').notNull().defaultNow(),
  inputParams: jsonb('input_params').notNull(),
  output: jsonb('output'),
  executionDurationMs: integer('execution_duration_ms').notNull(),
  inputTokens: integer('input_tokens'),
  outputTokens: integer('output_tokens'),
  success: boolean('success').notNull(),
  errorType: text('error_type'),
  errorMessage: text('error_message'),
  errorStack: text('error_stack'),
  llmReasoning: text('llm_reasoning'),  // If provided by LLM
  debugOutput: jsonb('debug_output')  // Captured capturelicious() calls
})
```

**Migration Strategy**:
- Use DrizzleORM migrations (never manually edit migration files)
- Generate migration: `pnpm exec drizzle-kit generate --name=add_tool_integration_tables`
- Apply migration: `pnpm exec drizzle-kit push`

**Alternatives Considered**:
- Store tools in JSON field: Loses query capability, poor performance
- No persistence: Loses tool configuration on restart
- In-memory only: Violates spec requirement for configuration persistence

**Established**: 2025-11-10

---

### 8. Frontend UI Components

**Context**: Need UI for tool configuration, execution, and diagnostics

**Decision 9: Extend Existing shadcn/ui + Tailwind Setup**

**Rationale**:
- Consistency with existing retrofuturistic dark theme (spec 002)
- shadcn/ui provides accessible components out of the box
- Established pattern for settings pages and execution displays
- No new dependencies required

**Additional shadcn/ui Components Needed**:
- `switch`: Enable/disable toggles for tools
- `accordion`: Collapsible tool configuration sections
- `tabs`: Tool list vs. tool configuration views
- `dialog`: Folder picker modal
- `code`: Code display for tool execute functions
- `tooltip`: Contextual help for advanced options

**Page Structure**:
- Settings page extension: Add "Project Configuration" section with folder picker
- Tools page (new): List of discovered tools with enable/disable toggles
- Tool detail modal (new): View/edit tool description, view workspace files, see detected hooks
- Execution page extension: Display tool invocation diagnostics below prompt results

**Alternatives Considered**:
- New UI library: Breaks consistency, adds complexity
- Custom components: Duplicates shadcn/ui functionality

**Established**: 2025-11-10

---

### 9. Multi-SDK Abstraction (Architecture Only)

**Context**: Spec requires foundation for future SDK integrations (feature 005+)

**Decision 10: Create SDK Adapter Interface**

**Rationale**:
- Future-proofs architecture for Anthropic SDK, LangChain, etc.
- Minimal implementation for this spec (AI SDK only)
- Avoids premature abstraction while establishing extension point

**Interface Design**:
```typescript
// Backend: packages/backend/src/adapters/sdk-adapter.interface.ts
export interface SDKAdapter {
  name: string  // 'vercel-ai-sdk', 'anthropic-sdk', etc.

  // Tool discovery
  discoverTools(projectPath: string): Promise<ToolDefinition[]>

  // Execution
  executeWithTools(params: {
    prompt: string
    tools: ToolDefinition[]
    options: SDKOptions
  }): Promise<ExecutionResult>

  // Option validation
  validateOptions(options: unknown): SDKOptions
  getDefaultOptions(): SDKOptions
}

// AI SDK implementation (only one for this spec)
export class VercelAISDKAdapter implements SDKAdapter {
  name = 'vercel-ai-sdk'

  async discoverTools(projectPath: string) {
    // Use ts-morph to find tool() calls
  }

  async executeWithTools({ prompt, tools, options }) {
    // Use generateText with tools
  }

  validateOptions(options: unknown): SDKOptions {
    // Validate AI SDK options
  }

  getDefaultOptions(): SDKOptions {
    return {
      temperature: 1.0,
      maxTokens: 4096,
      toolChoice: 'auto',
      maxToolRoundtrips: 10
    }
  }
}
```

**Usage Pattern**:
```typescript
// Backend service layer
const adapter = new VercelAISDKAdapter()  // Hardcoded for this spec
const tools = await adapter.discoverTools(projectPath)
const result = await adapter.executeWithTools({ prompt, tools, options })
```

**Future Extension** (feature 005+):
```typescript
// Adapter factory with SDK selection
const adapter = SDKAdapterFactory.create(config.selectedSDK)
```

**Alternatives Considered**:
- No abstraction: Couples code to AI SDK, expensive to add SDKs later
- Full multi-SDK implementation now: Violates YAGNI, massive scope increase

**Established**: 2025-11-10

---

## Summary of Decisions

| # | Decision | Technology/Pattern | Rationale |
|---|----------|-------------------|-----------|
| 1 | Tool Discovery | ts-morph | Standard TS AST analysis tool, handles complex parsing |
| 2 | Hook Parameter Detection | Scope analysis via ts-morph | Detects undefined variables to generate hook stubs |
| 3 | Workspace Management | `promptalicious-workspace/` with TypeScript paths | Isolated, gitignored, full editor support |
| 4 | Hook System | 4-phase lifecycle (beforeAll/Each, afterEach/All) | Matches testing framework patterns, separates global vs per-invocation context |
| 5 | Tool Execution | Extend generateText with tools array | Leverages AI SDK's native tool support, minimal changes |
| 6 | Debug Instrumentation | `@promptalicious/debug` package | Scoped capture, works in local dev and promptalicious execution |
| 7 | Export | Template-based code generation | No LLM required, deterministic output, future AI enhancement possible |
| 8 | Database Schema | Extend existing PostgreSQL schema | Consistent with spec 002 patterns, DrizzleORM migrations |
| 9 | Frontend UI | shadcn/ui + existing theme | Consistency, no new dependencies, accessible components |
| 10 | Multi-SDK | Interface abstraction, AI SDK only | Future-proof without premature implementation |

---

## Dependencies Added

**npm Packages** (installed via `pnpm add <package>@latest`):
- `ts-morph@latest` (backend) - TypeScript AST analysis
- No additional frontend dependencies (using existing shadcn/ui components)

**New Workspace Package**:
- `@promptalicious/debug` (new) - Debug instrumentation package

---

## Open Questions

**None** - All research questions resolved

---

## Next Steps

1. ✅ Research complete
2. ⏭️ Phase 1: Design & Contracts (data model, API contracts, quickstart)
3. ⏭️ Phase 2: Task generation (via /tasks command)
4. ⏭️ Implementation

---

**Status**: ✅ Research phase complete, ready for Phase 1 (Design & Contracts)
