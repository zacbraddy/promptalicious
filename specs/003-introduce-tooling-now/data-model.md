# Data Model: Core Tool Integration System

**Feature**: 003-introduce-tooling-now
**Date**: 2025-11-10
**Status**: Complete

This document defines the domain entities and their relationships for LLM tool integration.

---

## Entity Definitions

### 1. Project Configuration

**Purpose**: Stores the connection between promptalicious and the user's target project

**Attributes**:
- `id`: integer (primary key, always 1 - single row constraint)
- `name`: string (user-editable project name, defaults to folder name from target path)
- `targetProjectPath`: string (relative path from promptalicious to target project)
- `workspacePath`: string (relative path to workspace directory inside promptalicious repo)
- `createdAt`: timestamp
- `updatedAt`: timestamp

**Validation Rules**:
- `name` MUST NOT be empty
- `targetProjectPath` MUST be a valid relative path pointing to an existing directory
- `workspacePath` MUST be relative path within promptalicious repo (format: `workspace/{project-name}`)
- Only one configuration allowed (enforced by `id=1` constraint)

**Database Schema** (DrizzleORM):
```typescript
export const projectConfiguration = pgTable('project_configuration', {
  id: integer('id').primaryKey().default(1),
  name: text('name').notNull(),
  targetProjectPath: text('target_project_path').notNull(),
  workspacePath: text('workspace_path').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
})
```

**State Transitions**:
- Created when user first configures project via folder picker
- Updated when user changes target project path or project name
- Triggers tool discovery on creation/update
- Manual tool discovery can be triggered without changing configuration

**Critical Design Decision**:
- Workspace is stored INSIDE promptalicious repo at `workspace/{project-name}/`
- User's project remains completely untouched (read-only)
- No files are ever written to user's codebase
- Export instructions provide manual bridge for applying changes

---

### 2. Tool Definition

**Purpose**: Represents a discovered tool from the user's project

**Attributes**:
- `id`: string (primary key, unique identifier - tool name or content hash)
- `name`: string (tool name from source)
- `description`: string (current description - may be edited)
- `sourceDescription`: string | null (original description from source, null after first edit)
- `parametersSchema`: JSON (Zod schema as JSON)
- `sourceFilePath`: string (absolute path to original tool file in user's project)
- `workspaceDir`: string (relative path to workspace subdirectory within promptalicious repo)
- `enabled`: boolean (whether tool is enabled for execution)
- `detectedHookParams`: JSON (array of parameter names detected via scope analysis)
- `createdAt`: timestamp
- `updatedAt`: timestamp

**Validation Rules**:
- `id` MUST be unique across all tools
- `name` MUST NOT be empty
- `description` MUST NOT be empty
- `parametersSchema` MUST be valid JSON representing Zod schema
- `sourceFilePath` MUST be absolute path to existing file in user's project (read-only reference)
- `workspaceDir` MUST be relative path within promptalicious workspace (format: `workspace/{project-name}/{tool-id}`)
- `detectedHookParams` MUST be JSON array of strings
- After `sourceDescription` becomes null (first edit), description is controlled by frontend

**Database Schema** (DrizzleORM):
```typescript
export const tools = pgTable('tools', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  sourceDescription: text('source_description'),  // Nullable after first edit
  parametersSchema: jsonb('parameters_schema').notNull(),
  sourceFilePath: text('source_file_path').notNull(),
  workspaceDir: text('workspace_dir').notNull(),
  enabled: boolean('enabled').notNull().default(true),
  detectedHookParams: jsonb('detected_hook_params'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
})
```

**State Transitions**:
- Created during tool discovery (sourced from user's project)
- Updated when user edits description (`sourceDescription` → null, `description` updated)
- Updated when user toggles enabled state
- Deleted when tool removed from source project (on re-discovery)

**Relationships**:
- One-to-Many with Tool Invocations (one tool can have many invocations)

---

### 3. Tool Invocation Result (In-Memory Only)

**SCOPE NOTE**: Tool invocations are NOT persisted to database in spec 003. They are collected in-memory during execution and returned in `ExecutionResult.toolInvocations` array. Full execution history with persistence is deferred to Feature 004.

**Purpose**: Captures diagnostics from a single tool invocation during execution (in-memory)

**Attributes** (TypeScript interface, not database table):
- `toolId`: string
- `toolName`: string
- `timestamp`: Date (when tool was invoked)
- `inputParams`: unknown (parameters passed to tool by LLM)
- `output`: unknown (tool return value)
- `executionDurationMs`: number (milliseconds)
- `inputTokens`: number | null (tokens used in tool call)
- `outputTokens`: number | null (tokens used in tool response)
- `success`: boolean (whether tool execution succeeded)
- `errorType`: string | null (error class name if failed)
- `errorMessage`: string | null (error message if failed)
- `errorStack`: string | null (stack trace if failed)
- `llmReasoning`: string | null (LLM's reasoning for tool call, if provided)
- `debugOutput`: DebugMessage[] (captured capturelicious() calls)

**TypeScript Interface** (shared-infra):
```typescript
export interface ToolInvocationResult {
  toolId: string;
  toolName: string;
  timestamp: Date;
  inputParams: unknown;
  output: unknown;
  executionDurationMs: number;
  inputTokens: number | null;
  outputTokens: number | null;
  success: boolean;
  errorType: string | null;
  errorMessage: string | null;
  errorStack: string | null;
  llmReasoning: string | null;
  debugOutput: DebugMessage[];
}
```

**State**: In-memory only, returned in ExecutionResult, not persisted

---

### 4. Execution Result (Extended with In-Memory Tool Invocations)

**Purpose**: Extended from spec 002 to include in-memory tool invocation diagnostics

**New Attribute** (added to existing entity):
- `toolInvocations`: ToolInvocationResult[] | undefined (in-memory diagnostics array)

**Note**: ExecutionResult from spec 002 is extended with in-memory array only. No database changes needed.

**TypeScript Extension**:
```typescript
// Extend existing ExecutionResult interface from spec 002
export interface ExecutionResult {
  id: string;
  promptExecutionId: string;
  responseText: string;
  inputTokenCount: number;
  outputTokenCount: number;
  totalTokenCount: number;
  executionDurationMs: number;
  estimatedCostGBP: number;
  // NEW: In-memory tool invocation diagnostics
  toolInvocations?: ToolInvocationResult[];
}
```

**No Database Changes**: Tool invocations are not persisted in spec 003

---

### 5. Hook Definition (File System Entity)

**Purpose**: Lifecycle hooks providing execution context to tools

**Attributes** (not stored in database, generated as files):
- `hookType`: enum ('beforeAll' | 'beforeEach' | 'afterEach' | 'afterAll')
- `toolId`: string (associated tool identifier)
- `filePath`: string (absolute path to hook file in workspace)
- `detectedParams`: string[] (parameter names needed by tool, from scope analysis)
- `stubGenerated`: boolean (whether stub file has been generated)

**File Structure**:
- Location: `{workspaceDir}/{toolId}/beforeAll.ts` (and similarly for other hooks)
- Content: TypeScript file exporting default async function

**Hook Function Signatures**:
```typescript
// beforeAll.ts
export default async function beforeAll(): Promise<Record<string, unknown>> {
  return {
    // Global context available to all tool invocations
  }
}

// beforeEach.ts
export default async function beforeEach(): Promise<Record<string, unknown>> {
  return {
    // Per-invocation context
  }
}

// afterEach.ts
export default async function afterEach(result: unknown): Promise<void> {
  // Cleanup or logging after each invocation
}

// afterAll.ts
export default async function afterAll(): Promise<void> {
  // Cleanup after all invocations complete
}
```

**State Transitions**:
- Generated as stubs during tool discovery
- User edits files in their code editor
- Loaded and executed during tool invocation

**Relationships**:
- One-to-One with Tool Definition (each tool has one set of hooks)

---

### 6. Workspace Structure (File System Entity)

**Purpose**: Organises tool files and hooks in gitignored directory within promptalicious repo

**Attributes**:
- `rootPath`: string (relative path to workspace root: `workspace/`)
- `projectWorkspacePath`: string (relative path to project workspace: `workspace/{project-name}/`)
- `tsConfigPath`: string (relative path to `tsconfig.json`)
- `toolDirectories`: Map<toolId, string> (tool ID to relative directory path)

**File System Structure**:
```
promptalicious/                         # Promptalicious repo
├── workspace/                          # Gitignored directory
│   ├── .gitkeep                       # Track empty directory in git
│   └── {project-name}/                # Per-project workspace
│       ├── tsconfig.json              # Generated with @rootalicious alias
│       └── {tool-id}/                 # Per-tool directory
│           ├── tool.ts                # Extracted execute function
│           ├── beforeAll.ts           # Hook stub
│           ├── beforeEach.ts          # Hook stub
│           ├── afterEach.ts           # Hook stub
│           └── afterAll.ts            # Hook stub

{user-project}/                         # User's project (UNTOUCHED, READ-ONLY)
└── src/tools/                          # Original tool definitions
    └── *.ts                            # Source files (never modified)
```

**Generated Files**:

**`tsconfig.json`** (inside `workspace/{project-name}/`):
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

**VS Code Workspace Configuration** (`.vscode/settings.json` in promptalicious repo):
```json
{
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true,
  "files.exclude": {
    "workspace": false
  }
}
```

**Note**:
- Workspace tsconfig extends promptalicious root for consistent TypeScript/code style settings
- `baseUrl` set to workspace directory for path resolution
- VS Code settings ensure workspace directory is included in TypeScript language server scope
- IDE will automatically detect workspace tsconfig when editing hook/tool files
- `@rootalicious` alias provides type-safe imports from user's project

**Promptalicious Root `tsconfig.json`** (must exist at repository root):
- Provides base TypeScript configuration for both promptalicious and workspace files
- Ensures consistent compiler options, strict mode, module resolution
- Workspace configs extend this and add project-specific path aliases

**IDE Language Server Behavior**:
- When editing `workspace/my-project/getUserProfile/beforeAll.ts`:
  1. Language server finds `workspace/my-project/tsconfig.json`
  2. Reads `extends: "../../tsconfig.json"` and loads base config
  3. Applies `@rootalicious` path mapping
  4. Provides IntelliSense for imports like `import { db } from '@rootalicious/src/lib/database'`

**`workspace/.gitkeep`**:
```
# This directory contains per-project workspaces
# Each project gets a subdirectory with tool implementations and hooks
#
# Directory is gitignored but tracked via .gitkeep to ensure it exists
```

**promptalicious/.gitignore** (updated):
```
# Workspace directory (user-specific tool implementations)
workspace/
!workspace/.gitkeep
```

**State Transitions**:
- `workspace/` directory created on first project configuration (if not exists)
- Project workspace created at `workspace/{project-name}/` when project configured
- Tool directories added during tool discovery
- Files persist across sessions (gitignored but not deleted)

**Critical Design Decision**:
- Workspace lives in promptalicious repo, NOT in user's project
- User's codebase remains completely untouched
- Path alias `@rootalicious` provides import access to user's project
- Export instructions explain how to manually copy changes to user's codebase

---

## Relationships Diagram

```
┌─────────────────────────┐
│ Project Configuration   │
│ (single row, id=1)      │
└───────────┬─────────────┘
            │
            │ Triggers discovery
            ▼
┌─────────────────────────┐
│ Tool Definitions        │
│ (discovered tools)      │
└───────────┬─────────────┘
            │
            │ 1:N
            ▼
┌─────────────────────────┐         ┌─────────────────────────┐
│ Execution Results       │────────►│ Tool Invocations        │
│ (extended from spec 002)│  1:N    │ (diagnostics)           │
└─────────────────────────┘         └─────────────────────────┘

┌─────────────────────────┐
│ Hook Definitions        │
│ (file system, 1:1 tool) │
└─────────────────────────┘

┌─────────────────────────┐
│ Workspace Structure     │
│ (file system, generated)│
└─────────────────────────┘
```

---

## Data Persistence Strategy

### Database (PostgreSQL)
- Project Configuration (single row)
- Tool Definitions (persistent across sessions)
- Tool Invocations (diagnostic history)
- Execution Results (extended with tool summary)

### File System (Gitignored Workspace)
- Tool execute functions (`tool.ts`)
- Hook implementations (`beforeAll.ts`, `beforeEach.ts`, etc.)
- TypeScript configuration (`tsconfig.json`)
- Workspace structure (per-tool directories)

### In-Memory (Not Persisted)
- Discovered tool AST nodes (from ts-morph, regenerated on discovery)
- Hook execution results (captured during execution, stored in database as part of diagnostics)
- Active execution state (from spec 002, AbortController signals)

---

## Migration Strategy

**SCOPE NOTE**: Tool invocation persistence deferred to Feature 004. Only tool definitions table added in spec 003.

**New Tables**:
1. `project_configuration` (single row constraint)
2. `tools` (tool definitions)

**NO Extended Tables**: ExecutionResult extended in-memory only, no database changes

**Migration Files** (generated via DrizzleORM):
```bash
pnpm exec drizzle-kit generate --name=add_project_configuration_table
pnpm exec drizzle-kit generate --name=add_tools_table
```

**CRITICAL**: NEVER manually edit migration files. ONLY use drizzle-kit commands.

**Deferred to Feature 004**:
- `execution_history` table (complete execution snapshots with tool invocations)
- Tool invocation persistence
- Implementation snapshot storage

---

## Type Definitions (Shared)

**Recommendation**: Add to `packages/shared-infra/src/types/` for sharing between frontend/backend

```typescript
// packages/shared-infra/src/types/tools.ts

export interface ProjectConfiguration {
  id: number
  name: string
  targetProjectPath: string
  workspacePath: string
  createdAt: Date
  updatedAt: Date
}

export interface ToolDefinition {
  id: string
  name: string
  description: string
  sourceDescription: string | null
  parametersSchema: unknown  // Zod schema as JSON
  sourceFilePath: string
  workspaceDir: string
  enabled: boolean
  detectedHookParams: string[]
  createdAt: Date
  updatedAt: Date
}

export interface ToolInvocationResult {
  id: string
  executionId: string
  toolId: string
  timestamp: Date
  inputParams: unknown
  output: unknown
  executionDurationMs: number
  inputTokens: number | null
  outputTokens: number | null
  success: boolean
  errorType: string | null
  errorMessage: string | null
  errorStack: string | null
  llmReasoning: string | null
  debugOutput: DebugMessage[]
}

export interface DebugMessage {
  timestamp: Date
  message: string
  variables?: Record<string, unknown>
}

export interface HookDefinition {
  hookType: 'beforeAll' | 'beforeEach' | 'afterEach' | 'afterAll'
  toolId: string
  filePath: string
  detectedParams: string[]
  stubGenerated: boolean
}

export interface WorkspaceStructure {
  rootPath: string
  projectWorkspacePath: string
  tsConfigPath: string
  toolDirectories: Map<string, string>
}

export interface DiscoveryLogEntry {
  timestamp: Date
  level: 'info' | 'warning' | 'error'
  phase: 'scanning' | 'analyzing' | 'generating' | 'complete'
  message: string
  context?: {
    filePath?: string
    toolName?: string
    reason?: string
    linesExtracted?: number
    detectedParams?: string[]
  }
}

export interface DiscoverySummary {
  filesScanned: number
  filesWithToolImports: number
  toolsDiscovered: number
  filesGenerated: number
  skippedFiles: Array<{
    path: string
    reason: string
  }>
}
```

---

## Validation Rules Summary

### Project Configuration
- Only one row allowed (id=1 constraint)
- Target project path must exist and be valid relative path
- Workspace path must be absolute and within accessible filesystem

### Tool Definition
- Tool ID must be unique
- Source file must exist at specified path
- Parameters schema must be valid JSON (Zod schema)
- After first description edit, source description becomes null

### Tool Invocation
- Must reference valid execution and tool
- Execution duration must be non-negative
- Token counts must be non-negative if present
- Failed invocations must have error message

### Hook Definition
- Hook files must be valid TypeScript
- Export default async function with correct signature
- Located in tool's workspace directory

### Workspace Structure
- Must be gitignored
- TypeScript configuration must be valid
- Path alias @rootalicious must point to parent directory

---

**Status**: ✅ Data model complete, ready for API contracts
