import * as fs from "node:fs/promises";
import * as path from "node:path";

import { execa } from "execa";

import * as discoveryStatusService from "@/services/discovery-status.service";

export interface DiscoveredTool {
  id: string;
  name: string;
  description: string;
  sourceDescription: string;
  parametersSchema: unknown;
  executeFunction: string;
  sourceFilePath: string;
  detectedHookParams: string[];
  typeImports: Array<{
    typeName: string;
    importPath: string;
  }>;
  environmentTypes: Array<{
    name: string;
    type: string;
    typeImports: Array<{
      typeName: string;
      importPath: string;
    }>;
  }>;
}

export class WorkspaceGeneratorService {
  async generateWorkspace(
    projectName: string,
    projectPath: string,
    tools: DiscoveredTool[],
  ): Promise<void> {
    try {
      const workspacePath = path.join(process.cwd(), "workspace", projectName);

      discoveryStatusService.appendLog({
        level: "info",
        phase: "generating",
        message: `Generating workspace at ${workspacePath}`,
      });

      await fs.mkdir(workspacePath, { recursive: true });

      await this.createProjectSymlink(workspacePath, projectPath);
      await this.generateWorkspaceConfig(workspacePath);

      let filesGenerated = 0;

      await this.generateWorkspaceHooks(workspacePath, tools);
      filesGenerated += 3;

      for (const tool of tools) {
        const toolDir = path.join(workspacePath, tool.id);
        await fs.mkdir(toolDir, { recursive: true });

        await this.generateToolFile(toolDir, tool);
        filesGenerated += 1;

        await this.generateHookStubs(toolDir, tool);
        filesGenerated += 4;

        discoveryStatusService.appendLog({
          level: "info",
          phase: "generating",
          message: `Generated workspace files for tool ${tool.name}`,
          context: {
            toolName: tool.name,
            filesGenerated: 5,
          },
        });
      }

      await this.formatWorkspaceFiles(workspacePath);

      discoveryStatusService.incrementCounters({ filesGenerated });

      discoveryStatusService.appendLog({
        level: "info",
        phase: "generating",
        message: `Workspace generation complete`,
        context: {
          filesGenerated,
        },
      });
    } catch (error) {
      discoveryStatusService.appendLog({
        level: "error",
        phase: "generating",
        message: `Failed to generate workspace: ${error instanceof Error ? error.message : String(error)}`,
        context: {
          error: error instanceof Error ? error.message : String(error),
        },
      });
      throw error;
    }
  }

  private async createProjectSymlink(
    workspacePath: string,
    projectPath: string,
  ): Promise<void> {
    const absoluteProjectPath = path.resolve(projectPath);
    const symlinkPath = path.join(workspacePath, "rootalicious");

    try {
      await fs.unlink(symlinkPath);
    } catch {
      // Symlink doesn't exist, that's fine
    }

    await fs.symlink(absoluteProjectPath, symlinkPath, "dir");

    discoveryStatusService.appendLog({
      level: "info",
      phase: "generating",
      message: `Created symlink: rootalicious -> ${absoluteProjectPath}`,
    });
  }

  private async generateWorkspaceConfig(workspacePath: string): Promise<void> {
    const eslintConfig = `import createEslintConfig from "@promptalicious/shared-infra/eslint";

export default createEslintConfig({
  tsconfigRootDir: import.meta.dirname,
});
`;

    const tsConfig = `{
  "extends": "../tsconfig.json",
  "compilerOptions": {
    "composite": false,
    "noEmit": true,
    "preserveSymlinks": false,
    "allowArbitraryExtensions": true
  },
  "include": ["**/*", "rootalicious/**/*"]
}
`;

    const packageJson = `{
  "name": "promptalicious-workspace",
  "version": "0.0.0",
  "private": true,
  "type": "module"
}
`;

    await Promise.all([
      fs.writeFile(path.join(workspacePath, "eslint.config.ts"), eslintConfig),
      fs.writeFile(path.join(workspacePath, "tsconfig.json"), tsConfig),
      fs.writeFile(path.join(workspacePath, "package.json"), packageJson),
    ]);

    discoveryStatusService.appendLog({
      level: "info",
      phase: "generating",
      message: "Generated workspace configuration files",
    });
  }

  private async formatWorkspaceFiles(workspacePath: string): Promise<void> {
    try {
      discoveryStatusService.appendLog({
        level: "info",
        phase: "generating",
        message: "Formatting workspace files with Prettier",
      });

      await execa("prettier", ["--write", workspacePath], {
        cwd: process.cwd(),
      });

      discoveryStatusService.appendLog({
        level: "info",
        phase: "generating",
        message: "Workspace files formatted successfully",
      });
    } catch (error) {
      discoveryStatusService.appendLog({
        level: "warning",
        phase: "generating",
        message: `Failed to format workspace files: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }

  private async generateToolFile(
    toolDir: string,
    tool: DiscoveredTool,
  ): Promise<void> {
    const imports = tool.typeImports
      .map(({ typeName, importPath }) => {
        return `import type { ${typeName} } from "${importPath}";`;
      })
      .join("\n");

    const normalizedFunction = this.normalizeIndentation(tool.executeFunction);

    const toolContent = `// Auto-generated from ${tool.sourceFilePath}
// Tool: ${tool.name}

import "./environment";

${imports ? imports + "\n\n" : ""}export default ${normalizedFunction}
`;

    const toolPath = path.join(toolDir, "tool.ts");
    await fs.writeFile(toolPath, toolContent);

    await this.generateEnvironmentTypes(toolDir, tool);
  }

  private async generateEnvironmentTypes(
    toolDir: string,
    tool: DiscoveredTool,
  ): Promise<void> {
    if (tool.environmentTypes.length === 0) {
      return;
    }

    // Collect all unique type imports across all environment variables
    const allTypeImports = new Map<string, string>();
    for (const envType of tool.environmentTypes) {
      for (const typeImport of envType.typeImports) {
        allTypeImports.set(typeImport.typeName, typeImport.importPath);
      }
    }

    const imports = Array.from(allTypeImports.entries())
      .map(
        ([typeName, importPath]) =>
          `import { ${typeName} } from "${importPath}";`,
      )
      .join("\n");

    // Generate environment type
    const envTypeProperties =
      tool.environmentTypes.length > 0
        ? tool.environmentTypes
            .map(({ name, type }) => `  ${name}: ${type};`)
            .join("\n")
        : "  // No environment variables detected";

    const environmentContent = `// Auto-generated environment declarations for tool: ${tool.name}
// These are the closure variables detected in the original tool implementation
// They will be provided by the beforeAll/beforeEach hooks at runtime

${imports ? imports + "\n\n" : ""}export type ToolEnvironment = {
${envTypeProperties}
};

// Global ambient declarations for use in tool.ts
${tool.environmentTypes.map(({ name, type }) => `declare global {\n  const ${name}: ${type};\n}`).join("\n")}
`;

    const envPath = path.join(toolDir, "environment.d.ts");
    await fs.writeFile(envPath, environmentContent);
  }

  private normalizeIndentation(code: string): string {
    const lines = code.split("\n");
    if (lines.length === 0) return code;

    const nonEmptyLines = lines.filter((line) => line.trim().length > 0);
    if (nonEmptyLines.length === 0) return code;

    const indents = nonEmptyLines.map((line) => {
      const match = line.match(/^(\s*)/);
      return match?.[1]?.length ?? 0;
    });

    const minIndent = Math.min(...indents);

    const normalized = lines
      .map((line) => {
        if (line.trim().length === 0) return "";
        return line.slice(minIndent);
      })
      .join("\n");

    return normalized.trim();
  }

  private async generateWorkspaceHooks(
    workspacePath: string,
    tools: DiscoveredTool[],
  ): Promise<void> {
    const allEnvironmentTypes = new Map<
      string,
      {
        type: string;
        typeImports: Array<{ typeName: string; importPath: string }>;
      }
    >();

    for (const tool of tools) {
      for (const envType of tool.environmentTypes) {
        if (!allEnvironmentTypes.has(envType.name)) {
          allEnvironmentTypes.set(envType.name, {
            type: envType.type,
            typeImports: envType.typeImports,
          });
        }
      }
    }

    const allTypeImports = new Map<string, string>();
    for (const [, envType] of allEnvironmentTypes) {
      for (const typeImport of envType.typeImports) {
        allTypeImports.set(typeImport.typeName, typeImport.importPath);
      }
    }

    const imports = Array.from(allTypeImports.entries())
      .map(
        ([typeName, importPath]) =>
          `import type { ${typeName} } from "${importPath}";`,
      )
      .join("\n");

    const envTypeProperties =
      allEnvironmentTypes.size > 0
        ? Array.from(allEnvironmentTypes.entries())
            .map(([name, { type }]) => `  ${name}?: ${type};`)
            .join("\n")
        : "  // No environment variables detected across tools";

    const environmentContent = `// Auto-generated workspace-level environment declarations
// This is a union of all environment variables needed across all tools
// Workspace hooks can provide shared resources available to all tools

${imports ? imports + "\n\n" : ""}export type WorkspaceEnvironment = {
${envTypeProperties}
};
`;

    const beforeAllContent = `// Auto-generated workspace-level beforeAll hook
// This hook runs ONCE before any tool invocations
// Use it to initialize shared resources available to ALL tools

import type { WorkspaceEnvironment } from "./environment";

export default async function beforeAll(): Promise<Partial<WorkspaceEnvironment>> {
  // Initialize shared resources here (e.g., database connections, services)
  // These will be available to all tools in their execution context
  return {
    // TODO: Provide shared resources
  };
}
`;

    const afterAllContent = `// Auto-generated workspace-level afterAll hook
// This hook runs ONCE after all tool invocations have completed
// Use it to cleanup shared resources

import type { WorkspaceEnvironment } from "./environment";

export default async function afterAll(): Promise<void> {
  // Cleanup shared resources here
  // This runs after all tools have finished executing
}
`;

    await Promise.all([
      fs.writeFile(
        path.join(workspacePath, "environment.d.ts"),
        environmentContent,
      ),
      fs.writeFile(path.join(workspacePath, "beforeAll.ts"), beforeAllContent),
      fs.writeFile(path.join(workspacePath, "afterAll.ts"), afterAllContent),
    ]);

    discoveryStatusService.appendLog({
      level: "info",
      phase: "generating",
      message: `Generated workspace-level hooks (${allEnvironmentTypes.size} environment variables)`,
    });
  }

  private async generateHookStubs(
    toolDir: string,
    tool: DiscoveredTool,
  ): Promise<void> {
    const detectedParamsComment =
      tool.detectedHookParams.length > 0
        ? `// Detected parameters: ${tool.detectedHookParams.join(", ")}\n`
        : "";

    const paramObjects = tool.detectedHookParams
      .map((param) => `    ${param}: undefined, // TODO: Provide ${param}`)
      .join("\n");

    const beforeAllContent = `// Auto-generated hook stub for tool: ${tool.name}
${detectedParamsComment}// Edit this file to provide these parameters to tool execution

import type { ToolEnvironment } from "./environment";

export default async function beforeAll(): Promise<Partial<ToolEnvironment>> {
  return {
${paramObjects || "    // No parameters detected"}
  };
}
`;

    const beforeEachContent = `// Auto-generated hook stub for tool: ${tool.name}
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
`;

    const afterEachContent = `// Auto-generated hook stub for tool: ${tool.name}
// Edit this file for cleanup after each invocation

export default async function afterEach(result: unknown): Promise<void> {
  // Cleanup logic here
}
`;

    const afterAllContent = `// Auto-generated hook stub for tool: ${tool.name}
// Edit this file for cleanup after all invocations

export default async function afterAll(): Promise<void> {
  // Cleanup logic here
}
`;

    await Promise.all([
      fs.writeFile(path.join(toolDir, "beforeAll.ts"), beforeAllContent),
      fs.writeFile(path.join(toolDir, "beforeEach.ts"), beforeEachContent),
      fs.writeFile(path.join(toolDir, "afterEach.ts"), afterEachContent),
      fs.writeFile(path.join(toolDir, "afterAll.ts"), afterAllContent),
    ]);
  }
}
