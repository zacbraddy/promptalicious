# Implementation Notes: Environment Type System

**Date**: 2025-11-11
**Feature**: 003-introduce-tooling-now
**Status**: Implemented

This document captures the architectural decision and implementation details for the environment type system that provides type-safe access to closure variables in generated tool files.

---

## Problem Statement

During tool discovery, we extract tool `execute` functions from the user's codebase. These functions often reference closure variables (e.g., `context`, `opencv`, `db`) that:

1. Need to be provided at runtime via hooks (`beforeAll`, `beforeEach`)
2. Must have proper TypeScript type information for IDE support
3. Should be made available to the generated tool files without requiring manual imports

The challenge was to create a system that:

- Automatically detects these closure variables
- Extracts their type information from the source code
- Makes them available to generated tool files with full type safety
- Complies with ESLint rules (no triple-slash references)
- Supports both interfaces and classes as types

---

## Solution: Modern Import Pattern with Ambient Declarations

### Architecture

We generate two levels of files: workspace-level (shared across all tools) and tool-level (specific to each tool):

**Workspace-level files** (in `workspace/{project-name}/`):

1. **`environment.d.ts`** - Workspace environment type (union of all tool environments)
2. **`beforeAll.ts`** - Runs once before all tools (shared context initialization)
3. **`afterAll.ts`** - Runs once after all tools (shared cleanup)

**Tool-level files** (in `workspace/{project-name}/{tool-id}/`):

1. **`environment.d.ts`** - Tool-specific type imports and ambient declarations
2. **`tool.ts`** - Tool execute function that imports environment
3. **`beforeAll.ts` / `beforeEach.ts` / `afterEach.ts` / `afterAll.ts`** - Tool-specific hooks that return typed environment objects

### Key Design Decisions

#### 1. Use `import "./environment"` instead of triple-slash references

**Why**: Triple-slash references (`/// <reference path="..."/>`) trigger ESLint warnings:

```
Do not use a triple slash reference for ./environment.d.ts, use `import` style instead
ESLint rule: @typescript-eslint/triple-slash-reference
```

**Solution**: Use modern import syntax to load ambient declarations:

```typescript
// tool.ts
import "./environment";  // Loads ambient declarations

export default async (params) => {
  // context is now available with full type information
  const frame = context.frames.find(...);
};
```

#### 2. Use `declare global` blocks for ambient declarations

**Why**: Provides type-safe global variables without polluting the module scope.

**Solution**: Each environment variable gets its own `declare global` block:

```typescript
// environment.d.ts
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

#### 3. Use regular `import` instead of `import type`

**Why**: We don't know whether types are interfaces or classes. Classes used as types need runtime imports.

**Example**:

```typescript
// If IOpenCVClient is a class (not just an interface):
class IOpenCVClient {
  processImage(data: Buffer): Promise<Result> { ... }
}

// Then we CANNOT use import type:
import type { IOpenCVClient } from "...";  // ❌ Breaks if IOpenCVClient is used as a value

// Must use regular import:
import { IOpenCVClient } from "...";  // ✅ Works for both interfaces and classes
```

#### 4. Export `ToolEnvironment` type for hook return values

**Why**: Hooks need to return properly typed objects that match the detected environment variables.

**Solution**: Generate a `ToolEnvironment` type and use `Partial<ToolEnvironment>` for hook returns:

```typescript
// beforeAll.ts
import type { ToolEnvironment } from "./environment";

export default async function beforeAll(): Promise<Partial<ToolEnvironment>> {
  return {
    context: undefined, // TODO: Provide context
    opencv: undefined, // TODO: Provide opencv
  };
}
```

---

## Type Import Resolution

The Tool Discovery Service (`tool-discovery.service.ts`) handles type import extraction:

### 1. Extract Type Names from AST

Using ts-morph, we extract type names from both explicit annotations and inferred types:

```typescript
// Explicit annotation: parameter has typeNode
function extractImportsFromType(typeNode: Node, ...) {
  // Check if typeNode itself is a TypeReference (e.g., IExecutionContext)
  const typeReferences = Node.isTypeReference(typeNode)
    ? [typeNode]
    : typeNode.getDescendantsOfKind(SyntaxKind.TypeReference);

  for (const typeRef of typeReferences) {
    const typeName = typeRef.getTypeName();
    if (Node.isIdentifier(typeName)) {
      const name = typeName.getText();
      if (name && /^[A-Z]/.test(name)) {  // Capital letter = likely a type
        typeNames.add(name);
      }
    }
  }
}

// Inferred type: extract from type.getText()
function extractImportsFromInferredType(type: any, ...) {
  const typeText: string = type.getText();
  const typeNameMatches = typeText.matchAll(/\b([A-Z][a-zA-Z0-9]*)\b/g);
  for (const match of typeNameMatches) {
    typeNames.add(match[1]);
  }
}
```

### 2. Find Import Statements

Once we have type names, we find their corresponding import statements in the source file:

```typescript
function findImportsForTypes(typeNames: Set<string>, sourceFile: SourceFile, ...) {
  const importDeclarations = sourceFile.getImportDeclarations();

  for (const importDecl of importDeclarations) {
    const namedImports = importDecl.getNamedImports();
    for (const namedImport of namedImports) {
      const importName = namedImport.getName();
      if (typeNames.has(importName)) {
        const moduleSpecifier = importDecl.getModuleSpecifierValue();
        // Resolve path alias and convert to relative path
        const resolvedPath = resolveImportPath(moduleSpecifier, projectPath);
        typeImports.push({ typeName: importName, importPath: resolvedPath });
      }
    }
  }
}
```

### 3. Resolve Path Aliases

Convert `@/` aliases to `../rootalicious/` relative paths for workspace imports:

```typescript
function resolveImportPath(importPath: string, projectPath: string): string {
  if (importPath.startsWith("@/")) {
    // Convert @/services/foo -> ../rootalicious/services/foo
    return importPath.replace(/^@\//, "../rootalicious/");
  }
  return importPath;
}
```

---

## Hook Execution Lifecycle

The system supports two levels of hooks with clear merge semantics:

### Execution Flow

```
1. workspace beforeAll() → shared context for all tools (e.g., database connection)
2. For each enabled tool:
   a. tool beforeAll() → tool-specific context (merged with workspace context)
   b. For each LLM invocation of this tool:
      i.  tool beforeEach() → invocation-specific context (merged with workspace + tool context)
      ii. tool.execute() → runs with merged context
      iii. tool afterEach() → cleanup for this invocation
   c. tool afterAll() → cleanup for this tool
3. workspace afterAll() → cleanup shared resources
```

### Merge Precedence

Context merging follows this precedence (later overrides earlier):

1. **workspace beforeAll** - Base context available to all tools
2. **tool beforeAll** - Tool-specific overrides
3. **tool beforeEach** - Invocation-specific overrides

**Example**:

```typescript
// workspace beforeAll returns: { db: connection1 }
// tool beforeAll returns: { db: connection2, context: ctx1 }
// tool beforeEach returns: { context: ctx2 }

// Final merged context available to tool.execute():
{
  db: connection2,      // Overridden by tool beforeAll
  context: ctx2         // Overridden by tool beforeEach
}
```

This merge precedence is **implicit** in the implementation - no special code needed. The Hook Execution Service simply spreads objects in order:

```typescript
const mergedContext = {
  ...workspaceBeforeAllResult,
  ...toolBeforeAllResult,
  ...toolBeforeEachResult,
};
```

---

## Generated File Examples

### Example 1: Workspace-level hooks (shared across all tools)

**Generated `workspace/my-project/environment.d.ts`**:

```typescript
// Auto-generated workspace environment (union of all tool environments)

import { IExecutionContext } from "../rootalicious/processors/execution-context";
import { IOpenCVClient } from "../rootalicious/services/opencv-service/types";
import { Database } from "../rootalicious/lib/database";

export type WorkspaceEnvironment = {
  context?: IExecutionContext; // From calculate-area tool
  opencv?: IOpenCVClient; // From calculate-area tool
  db?: Database; // From get-user-profile tool
};
```

**Generated `workspace/my-project/beforeAll.ts`**:

```typescript
// Auto-generated workspace-level hook
// This runs ONCE at the start of LLM execution
// Shared context is available to ALL tools

import type { WorkspaceEnvironment } from "./environment";

export default async function beforeAll(): Promise<
  Partial<WorkspaceEnvironment>
> {
  return {
    // TODO: Initialize shared resources
    // Example: db connection, execution context, services
  };
}
```

**Generated `workspace/my-project/afterAll.ts`**:

```typescript
// Auto-generated workspace-level hook
// This runs ONCE at the end of LLM execution (after all tools complete)

import type { WorkspaceEnvironment } from "./environment";

export default async function afterAll(): Promise<void> {
  // TODO: Cleanup shared resources
  // Example: close database connection, cleanup temp files
}
```

### Example 2: Tool-level hooks

**Source code** (`user-project/src/tools/calculate-area.ts`):

```typescript
import { tool } from "ai";
import type { IExecutionContext } from "@/processors/execution-context";
import type { IOpenCVClient } from "@/services/opencv-service/types";

export const calculateAffectedScreenArea = (
  context: IExecutionContext,
  opencv: IOpenCVClient,
) => {
  return tool({
    description: "Calculate affected screen area",
    parameters: z.object({ ... }),
    execute: async (params) => {
      // Uses closure variables context and opencv
      const frame = context.frames.find(...);
      const result = await opencv.processImage(...);
      return result;
    },
  });
};
```

**Generated `workspace/my-project/calculate-area/environment.d.ts`**:

```typescript
// Auto-generated environment declarations for tool: calculate-area
// These are the closure variables detected in the original tool implementation
// They will be provided by the beforeAll/beforeEach hooks at runtime

import { IExecutionContext } from "../rootalicious/processors/execution-context";
import { IOpenCVClient } from "../rootalicious/services/opencv-service/types";

export type ToolEnvironment = {
  context: IExecutionContext;
  opencv: IOpenCVClient;
};

// Global ambient declarations for use in tool.ts
declare global {
  const context: IExecutionContext;
}
declare global {
  const opencv: IOpenCVClient;
}
```

**Generated `workspace/my-project/calculate-area/tool.ts`**:

```typescript
// Auto-generated from /path/to/user-project/src/tools/calculate-area.ts
// Tool: calculate-area

import "./environment";

import type { CalculateAreaParams } from "../rootalicious/...";
import type { CalculateAreaResponse } from "../rootalicious/...";

export default async (
  params: CalculateAreaParams,
): Promise<CalculateAreaResponse> => {
  // Uses closure variables context and opencv (now with full type information)
  const frame = context.frames.find(...);
  const result = await opencv.processImage(...);
  return result;
};
```

**Generated `workspace/my-project/calculate-area/beforeAll.ts`**:

```typescript
// Auto-generated hook stub for tool: calculate-area
// Detected parameters: context, opencv
// Edit this file to provide these parameters to tool execution

import type { ToolEnvironment } from "./environment";

export default async function beforeAll(): Promise<Partial<ToolEnvironment>> {
  return {
    context: undefined, // TODO: Provide context
    opencv: undefined, // TODO: Provide opencv
  };
}
```

**Generated `workspace/my-project/calculate-area/beforeEach.ts`**:

```typescript
// Auto-generated hook stub for tool: calculate-area
// Edit this file to provide per-invocation context
//
// IMPORTANT: Properties returned from beforeEach are MERGED with beforeAll
// Properties with the same name will override those from beforeAll
// Use beforeEach for per-invocation state that should be fresh each time
// Use beforeAll for shared setup that persists across invocations

import type { ToolEnvironment } from "./environment";

export default async function beforeEach(): Promise<Partial<ToolEnvironment>> {
  // Return properties to add/override in the tool environment
  // Empty object = no changes to beforeAll environment
  return {};
}
```

---

## Benefits

### 1. Type Safety

- IDE provides full IntelliSense for closure variables
- TypeScript catches type errors at compile time
- No runtime type assertions needed

### 2. Developer Experience

- Auto-completion works for all environment variables
- Jump-to-definition navigates to user's source code
- Refactoring in user's project updates workspace types

### 3. ESLint Compliance

- No triple-slash references (no warnings)
- Modern import syntax throughout
- Passes all linting rules

### 4. Flexibility

- Supports both interfaces and classes as types
- Handles complex types (Promises, generics, unions)
- Works with path aliases (`@/` resolves correctly)

### 5. Maintainability

- Clear separation of concerns (types in environment.d.ts, implementation in tool.ts)
- Hooks have explicit return type contracts
- Auto-generated files reduce manual work

---

## Alternative Approaches Considered

### 1. Triple-Slash References (Rejected)

```typescript
/// <reference path="./environment.d.ts" />

export default async (params) => {
  // ...
};
```

**Why rejected**: Triggers ESLint warning `@typescript-eslint/triple-slash-reference`

### 2. Import Type Only (Rejected)

```typescript
import type { IExecutionContext } from "...";

declare global {
  const context: IExecutionContext;
}
```

**Why rejected**: Breaks if type is a class (needs runtime import)

### 3. Single .ts File Instead of .d.ts (Rejected)

```typescript
// environment.ts (not .d.ts)
export const context: IExecutionContext = ...;
export const opencv: IOpenCVClient = ...;
```

**Why rejected**: Would require implementing actual instances, not just types. We want ambient declarations, not concrete values.

### 4. Manual Imports in Tool Files (Rejected)

```typescript
import { context, opencv } from "./environment";

export default async (params) => {
  // ...
};
```

**Why rejected**: Requires hook system to export actual values, complicates implementation. Ambient declarations are simpler and more idiomatic.

---

## Testing Strategy

### Unit Tests (tool-discovery.service.test.ts)

1. Test type extraction from explicit annotations:

   ```typescript
   it("should extract types from explicit parameter annotations", () => {
     const result = extractEnvironmentTypes(sourceFile, "tool-id");
     expect(result.environmentTypes).toContainEqual({
       name: "context",
       type: "IExecutionContext",
       typeImports: [{ typeName: "IExecutionContext", importPath: "..." }],
     });
   });
   ```

2. Test type extraction from inferred types:

   ```typescript
   it("should extract types from inferred parameter types", () => {
     // Tests regex-based extraction from type.getText()
   });
   ```

3. Test path alias resolution:
   ```typescript
   it("should resolve @/ path aliases to ../rootalicious/", () => {
     expect(resolveImportPath("@/services/foo", projectPath)).toBe(
       "../rootalicious/services/foo",
     );
   });
   ```

### Integration Tests (tool-discovery.integration.test.ts)

1. End-to-end discovery with real project:
   ```typescript
   it("should discover tools and generate environment files with type imports", async () => {
     await discoverTools(testProjectPath);
     const envFile = await fs.readFile(
       "workspace/test/tool-id/environment.d.ts",
       "utf-8",
     );
     expect(envFile).toContain("import { IExecutionContext }");
     expect(envFile).toContain("declare global {");
   });
   ```

### Manual Testing

1. Verify IDE IntelliSense works in generated tool files
2. Verify no ESLint warnings in workspace directory
3. Verify TypeScript compilation succeeds
4. Verify hook files have proper type checking

---

## Future Considerations

### Support for More Complex Types

Currently handles:

- Simple interfaces/classes (`IExecutionContext`)
- Generic types (`Promise<Result>`)
- Union types (`string | number`)
- Array types (`IUser[]`)

Could be extended for:

- Conditional types
- Mapped types
- Template literal types
- Utility types (Pick, Omit, etc.)

### Performance Optimization

Current implementation re-scans source file for each type. Could optimize:

- Cache import declarations per source file
- Build type-to-import map once
- Parallelize type extraction across multiple tools

### Error Handling Improvements

Could add:

- Warning if type cannot be resolved
- Suggestion to add missing imports
- Validation that imported types actually exist

---

## Conclusion

The environment type system successfully provides:

1. Full type safety for closure variables in generated tool files
2. Excellent developer experience with IDE support
3. ESLint compliance (no warnings)
4. Support for both interfaces and classes
5. Automatic detection and import resolution

This implementation is production-ready and requires no changes for the initial release.
