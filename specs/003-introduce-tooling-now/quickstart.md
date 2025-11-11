# Quickstart: Core Tool Integration System

**Feature**: 003-introduce-tooling-now
**Version**: 0.3.0
**Date**: 2025-11-10

This document provides step-by-step instructions for testing the core tool integration feature end-to-end.

---

## Prerequisites

1. **Promptalicious running locally**:

   ```bash
   pnpm dev
   ```

   - Backend: http://localhost:3000
   - Frontend: http://localhost:5173

2. **Test project with AI SDK tools**:
   - Create a test project outside promptalicious (e.g., `~/test-project/`)
   - Install Vercel AI SDK: `pnpm add ai @ai-sdk/openai zod`
   - Create sample tool files (see Setup section below)

3. **OpenAI API key configured** (from spec 002):
   - Navigate to Settings page
   - Enter valid OpenAI API key
   - Test connection

---

## Setup: Create Test Project

**Directory**: `~/test-project/`

### 1. Initialize Project

```bash
mkdir ~/test-project
cd ~/test-project
pnpm init
pnpm add ai @ai-sdk/openai zod
```

### 2. Create Sample Tools

**File**: `~/test-project/src/tools/weather.ts`

```typescript
import { tool } from "ai";
import { z } from "zod";

export const getWeather = tool({
  description: "Get current weather for a location",
  parameters: z.object({
    location: z.string().describe("City name or zip code"),
    units: z.enum(["celsius", "fahrenheit"]).optional().default("celsius"),
  }),
  execute: async ({ location, units, weatherService }) => {
    // weatherService is an undefined variable → will be detected as hook parameter
    const data = await weatherService.getCurrentWeather(location, units);
    return {
      location,
      temperature: data.temp,
      conditions: data.conditions,
      humidity: data.humidity,
    };
  },
});
```

**File**: `~/test-project/src/tools/database.ts`

```typescript
import { tool } from "ai";
import { z } from "zod";
import { capturelicious } from "@promptalicious/debug";

export const getUserProfile = tool({
  description: "Fetch user profile from database",
  parameters: z.object({
    userId: z.string().describe("User ID to lookup"),
  }),
  execute: async ({ userId, db }) => {
    // db is an undefined variable → will be detected as hook parameter
    capturelicious("Starting user profile lookup", { userId });

    const user = await db.users.findUnique({ where: { id: userId } });

    if (!user) {
      capturelicious("User not found", { userId });
      throw new Error(`User not found: ${userId}`);
    }

    capturelicious("User found", { userName: user.name });
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
    };
  },
});
```

### 3. Create tsconfig.json

**File**: `~/test-project/tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"]
}
```

---

## User Journey 1: Project Configuration & Tool Discovery

### Step 1: Configure Target Project

1. Navigate to **Settings** page in promptalicious frontend (http://localhost:5173/settings)
2. Scroll to **Project Configuration** section (new in this feature)
3. Click **Select Project Folder** button
4. In folder picker modal:
   - Enter relative path: `../test-project` (or absolute path to your test project)
   - Optionally edit project name (defaults to "test-project" from folder name)
   - Click **Save**
5. **Expected Result**:
   - Discovery modal opens showing real-time progress
   - Progress updates appear as discovery runs (every ~500ms)
   - See logs for: scanning files, analyzing tools, generating workspace
   - Modal shows final summary: "Discovered 2 tools"
   - Cancel button disabled, OK button enabled
   - User can read logs as long as needed, then click OK
6. **After Closing Modal**:
   - Settings page shows configured project with name and path
   - Tools are now accessible via Tools API

**API Call** (behind the scenes):

```bash
curl -X PUT http://localhost:3000/api/project \
  -H "Content-Type: application/json" \
  -d '{"name": "My Test Project", "targetProjectPath": "../test-project"}'
```

**Expected Response** (202 Accepted):

```json
{
  "configuration": {
    "id": 1,
    "name": "My Test Project",
    "targetProjectPath": "../test-project",
    "workspacePath": "workspace/test-project",
    "createdAt": "2025-11-10T10:00:00Z",
    "updatedAt": "2025-11-10T10:00:00Z"
  },
  "discoveryStarted": true,
  "message": "Project configuration saved. Tool discovery in progress..."
}
```

**Frontend then polls** (every 500ms):

```bash
curl http://localhost:3000/api/project/discovery/status
```

**Status Response** (while discovering):

```json
{
  "isDiscovering": true,
  "phase": "analyzing",
  "progress": {
    "filesScanned": 45,
    "filesAnalyzed": 12,
    "toolsFound": 2,
    "filesGenerated": 8
  },
  "logs": [
    {
      "timestamp": "2025-11-10T10:00:01Z",
      "level": "info",
      "phase": "scanning",
      "message": "Found src/tools/weather.ts with AI SDK import",
      "context": { "filePath": "src/tools/weather.ts" }
    },
    {
      "timestamp": "2025-11-10T10:00:02Z",
      "level": "info",
      "phase": "analyzing",
      "message": "Extracted tool 'getWeather' with parameters",
      "context": {
        "toolName": "getWeather",
        "detectedParams": ["weatherService"],
        "linesExtracted": 12
      }
    }
  ]
}
```

**Status Response** (complete):

```json
{
  "isDiscovering": false,
  "phase": "complete",
  "result": {
    "discoveredToolsCount": 2,
    "summary": {
      "filesScanned": 127,
      "filesWithToolImports": 2,
      "toolsDiscovered": 2,
      "filesGenerated": 12,
      "skippedFiles": [
        { "path": "src/utils/helper.ts", "reason": "No AI SDK import" }
      ]
    }
  }
}
```

### Step 1b: Test Cancel Discovery (Optional)

1. Start a new project configuration
2. While discovery modal is showing progress (phase: scanning, analyzing, or generating):
   - Click **Cancel** button
3. **Expected Result**:
   - Confirmation warning appears: "Are you sure? Partial workspace files will be removed and project will not be configured."
   - User confirms cancellation
4. **After Cancellation**:
   - Discovery stops immediately
   - Modal shows: "Discovery cancelled. No project was added."
   - Partial workspace files are cleaned up
   - No project configuration saved
   - OK button enabled to close modal

**API Call** (behind the scenes):

```bash
curl -X POST http://localhost:3000/api/project/discovery/cancel
```

**Expected Response**:

```json
{
  "cancelled": true,
  "message": "Discovery cancelled, workspace cleaned up"
}
```

### Step 2: Verify Workspace Creation

1. Navigate to **promptalicious** directory (NOT test project!)
2. Check for `workspace/test-project/` directory (should be gitignored)
3. Verify user's test project is **untouched** (no promptalicious files)
4. Verify structure:

   ```
   ~/promptalicious/workspace/test-project/
   ├── tsconfig.json
   ├── getWeather/
   │   ├── tool.ts
   │   ├── beforeAll.ts
   │   ├── beforeEach.ts
   │   ├── afterEach.ts
   │   └── afterAll.ts
   └── getUserProfile/
       ├── tool.ts
       ├── beforeAll.ts
       ├── beforeEach.ts
       ├── afterEach.ts
       └── afterAll.ts
   ```

5. Verify user's project is clean:

   ```bash
   cd ~/test-project
   ls -la | grep promptalicious  # Should return nothing!
   ```

6. Open `beforeAll.ts` for `getUserProfile` tool:

   ```typescript
   // Auto-generated hook stub for tool: getUserProfile
   // Detected parameters: db
   // Edit this file to provide these parameters to tool execution

   export default async function beforeAll() {
     return {
       db: undefined, // TODO: Provide database connection
     };
   }
   ```

**Expected**: Stub files generated with detected hook parameters (db, weatherService)

---

## User Journey 2: Tool Configuration

### Step 3: View Discovered Tools

1. Navigate to **Tools** page (new in this feature, http://localhost:5173/tools)
2. **Expected Display**:
   - List of 2 discovered tools:
     - **getWeather**: "Get current weather for a location" (enabled)
     - **getUserProfile**: "Fetch user profile from database" (enabled)
   - Each tool shows:
     - Name
     - Description (editable)
     - Enabled toggle
     - "View Details" button

**API Call**:

```bash
curl http://localhost:3000/api/tools
```

**Expected Response**:

```json
{
  "tools": [
    {
      "id": "getWeather",
      "name": "getWeather",
      "description": "Get current weather for a location",
      "sourceDescription": "Get current weather for a location",
      "enabled": true,
      "createdAt": "2025-11-10T10:00:00Z",
      "updatedAt": "2025-11-10T10:00:00Z"
    },
    {
      "id": "getUserProfile",
      "name": "getUserProfile",
      "description": "Fetch user profile from database",
      "sourceDescription": "Fetch user profile from database",
      "enabled": true,
      "createdAt": "2025-11-10T10:00:00Z",
      "updatedAt": "2025-11-10T10:00:00Z"
    }
  ]
}
```

### Step 4: Edit Tool Description

1. Click **View Details** on **getUserProfile** tool
2. Tool detail modal opens showing:
   - Name: getUserProfile
   - Description: "Fetch user profile from database" (editable textarea)
   - Parameters schema (read-only JSON display)
   - Detected hook parameters: ["db"]
   - Workspace directory path
   - Link to open workspace in editor
3. Edit description to: "Retrieves complete user profile including metadata"
4. Click **Save**
5. **Expected Result**:
   - Success message
   - Description updated in tool list
   - `sourceDescription` becomes null (frontend is now source of truth)

**API Call**:

```bash
curl -X PATCH http://localhost:3000/api/tools/getUserProfile \
  -H "Content-Type: application/json" \
  -d '{"description": "Retrieves complete user profile including metadata"}'
```

**Expected Response**:

```json
{
  "id": "getUserProfile",
  "name": "getUserProfile",
  "description": "Retrieves complete user profile including metadata",
  "sourceDescription": null,
  "enabled": true,
  "createdAt": "2025-11-10T10:00:00Z",
  "updatedAt": "2025-11-10T10:05:00Z"
}
```

### Step 5: Disable a Tool

1. Toggle **getWeather** tool to disabled
2. **Expected Result**:
   - Tool shown as disabled in list
   - Tool will not be included in LLM execution

**API Call**:

```bash
curl -X PATCH http://localhost:3000/api/tools/getWeather \
  -H "Content-Type: application/json" \
  -d '{"enabled": false}'
```

---

## User Journey 3: Hook Configuration

### Step 6: Implement Hook for Database Access

1. Open `~/promptalicious/workspace/test-project/getUserProfile/beforeAll.ts` in your editor
2. Replace stub with actual implementation:

   ```typescript
   import { PrismaClient } from "@rootalicious/node_modules/@prisma/client";

   export default async function beforeAll() {
     const db = new PrismaClient();
     await db.$connect();

     return {
       db, // Provides database connection to tool execution
     };
   }
   ```

3. Implement cleanup in `afterAll.ts`:
   ```typescript
   export default async function afterAll() {
     // Cleanup: disconnect database
     // Note: db instance not available here, would need to store in module scope
   }
   ```

**Expected**:

- Full TypeScript support in editor
- Imports work via `@rootalicious` alias (points to user's project)
- User's project at `~/test-project` remains completely untouched

---

## User Journey 4: Execute Prompt with Tools

### Step 7: Configure Advanced Options (Optional)

1. Navigate to **Execute** page (http://localhost:5173/execute)
2. Expand **Advanced Options** section (collapsed by default)
3. Configure:
   - Tool Choice: "auto" (let LLM decide)
   - Max Tool Roundtrips: 10
   - Temperature: 0.7
   - Max Tokens: 4096
4. Options persist across page refreshes

### Step 8: Execute Prompt

1. Enter prompt: "Get the user profile for user ID abc123"
2. Click **Execute**
3. **Expected Behaviour**:
   - Execution starts (status: "executing")
   - LLM recognizes need for getUserProfile tool
   - Backend:
     - Runs `beforeAll()` hook → returns { db }
     - Runs `beforeEach()` hook → returns {}
     - Executes tool with merged params: `{ userId: "abc123", db: <PrismaClient> }`
     - Captures capturelicious() debug output
     - Runs `afterEach()` hook
     - Returns result to LLM
     - LLM generates final response
   - Frontend polls status every 2s
   - Completion displays results + tool diagnostics

**Expected Result Display**:

- **Prompt Response**: "The user profile for abc123 is: [formatted data]"
- **Execution Diagnostics** (from spec 002):
  - Input tokens: 150
  - Output tokens: 75
  - Total tokens: 225
  - Duration: 3.2s
  - Cost: £0.000034
- **Tool Invocations** (new in this feature):
  - Tool: getUserProfile
  - Input: `{ "userId": "abc123" }`
  - Output: `{ "id": "abc123", "name": "John Doe", ... }`
  - Duration: 450ms
  - Tokens: 50 input, 100 output
  - Success: ✓
  - Debug Output:
    - "Starting user profile lookup" { userId: "abc123" }
    - "User found" { userName: "John Doe" }

**API Call**:

```bash
curl -X POST http://localhost:3000/api/execute \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Get the user profile for user ID abc123",
    "advancedOptions": {
      "toolChoice": "auto",
      "maxToolRoundtrips": 10
    }
  }'
```

**Poll Status**:

```bash
curl http://localhost:3000/api/execute/status
```

**Get Result** (includes tool invocations in-memory):

```bash
curl http://localhost:3000/api/execute/{executionId}
```

**Expected Response** (with toolInvocations array):

```json
{
  "id": "exec_123",
  "promptExecutionId": "prompt_456",
  "responseText": "The user profile for abc123 is: John Doe...",
  "inputTokenCount": 150,
  "outputTokenCount": 75,
  "totalTokenCount": 225,
  "executionDurationMs": 3200,
  "estimatedCostGBP": 0.000034,
  "toolInvocations": [
    {
      "toolId": "getUserProfile",
      "toolName": "getUserProfile",
      "timestamp": "2025-11-10T15:30:00Z",
      "inputParams": { "userId": "abc123" },
      "output": {
        "id": "abc123",
        "name": "John Doe",
        "email": "john@example.com"
      },
      "executionDurationMs": 450,
      "inputTokens": 50,
      "outputTokens": 100,
      "success": true,
      "errorType": null,
      "errorMessage": null,
      "errorStack": null,
      "llmReasoning": null,
      "debugOutput": [
        {
          "timestamp": "2025-11-10T15:30:00.100Z",
          "message": "Starting user profile lookup",
          "variables": { "userId": "abc123" }
        },
        {
          "timestamp": "2025-11-10T15:30:00.450Z",
          "message": "User found",
          "variables": { "userName": "John Doe" }
        }
      ]
    }
  ]
}
```

**NOTE**: Tool invocations are returned in-memory within ExecutionResult. No separate endpoint needed.

---

## User Journey 5: Export Instructions

### Step 9: Generate Export

1. Click **Export Instructions** button (on Execute page or Tools page)
2. **Expected Result**:
   - Modal displays markdown-formatted instructions
   - Includes:
     - Updated tool execute functions from workspace
     - Updated descriptions from frontend
     - AI SDK options configuration
     - Step-by-step refactoring checklist
   - Copy to clipboard button
   - Download as .md file button

**API Call**:

```bash
curl -X POST http://localhost:3000/api/export \
  -H "Content-Type: application/json" \
  -d '{"includeDisabledTools": false}'
```

**Expected Response**:

```json
{
  "markdown": "# Export Instructions\n\nGenerated: 2025-11-10T15:30:00Z\n\n## Changes Summary\n- 2 tools configured\n- 1 tool enabled\n...",
  "generatedAt": "2025-11-10T15:30:00Z",
  "toolsIncluded": 1,
  "advancedOptions": {
    "toolChoice": "auto",
    "maxToolRoundtrips": 10,
    "temperature": 0.7
  }
}
```

---

## Error Scenarios

### Error 1: Hook Execution Failure

**Scenario**: beforeAll() hook fails to connect to database

**Steps**:

1. Modify `beforeAll.ts` to throw error:
   ```typescript
   export default async function beforeAll() {
     throw new Error("Database connection failed");
   }
   ```
2. Execute prompt that requires getUserProfile tool
3. **Expected Result**:
   - Execution fails with error
   - Error message: "Hook execution failed: beforeAll - Database connection failed"
   - Stack trace displayed in diagnostics
   - Frontend shows error clearly

### Error 2: Tool Execution Failure

**Scenario**: Tool throws error during execution

**Steps**:

1. Execute prompt: "Get profile for nonexistent user xyz999"
2. Tool executes, user not found, throws error
3. **Expected Result**:
   - Tool invocation marked as failed
   - Error captured in diagnostics:
     - errorType: "Error"
     - errorMessage: "User not found: xyz999"
     - errorStack: [full stack trace]
   - Debug output captured up to error point
   - LLM receives error and may retry or respond with failure message
   - Execution continues (per spec FR-022)

### Error 3: Invalid Project Path

**Scenario**: User enters non-existent project path

**Steps**:

1. Navigate to Settings → Project Configuration
2. Enter path: `../nonexistent-project`
3. Click Save
4. **Expected Result**:
   - Error message: "Target project path does not exist"
   - No workspace created
   - Configuration not saved

---

## Success Criteria

**Feature is working correctly if**:

- [ ] ✅ Project configuration saves and triggers tool discovery
- [ ] ✅ Workspace directory created with correct structure
- [ ] ✅ ts-morph successfully discovers tool() calls in user's project
- [ ] ✅ Hook stubs generated with detected parameters
- [ ] ✅ Tool list displays all discovered tools
- [ ] ✅ Tool description editable in frontend (sourceDescription nulled after first edit)
- [ ] ✅ Tool enable/disable toggle works
- [ ] ✅ Hooks execute in correct lifecycle order (beforeAll → beforeEach → tool → afterEach → afterAll)
- [ ] ✅ Tool execution receives merged context from hooks
- [ ] ✅ capturelicious() debug calls captured and displayed
- [ ] ✅ Tool invocation diagnostics displayed with timing, tokens, success/failure
- [ ] ✅ Tool errors captured without aborting execution
- [ ] ✅ Export instructions generated with tool code and AI SDK options
- [ ] ✅ Advanced options (toolChoice, maxToolRoundtrips, etc.) applied to execution
- [ ] ✅ Page refresh recovery works (execution state preserved)

---

## Cleanup

After testing:

1. Delete test project workspace (inside promptalicious repo):

   ```bash
   cd ~/promptalicious
   rm -rf workspace/test-project
   ```

2. Verify user's test project is still clean (no promptalicious files):

   ```bash
   cd ~/test-project
   ls -la  # Should see only user's original files
   ```

3. Reset database (optional):

   ```bash
   cd ~/promptalicious
   pnpm --filter @promptalicious/backend db:reset
   ```

4. Clear configuration via Settings page (click "Remove Project Configuration")

---

**Status**: ✅ Quickstart complete, ready for implementation
