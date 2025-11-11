import * as fs from "node:fs/promises";
import * as path from "node:path";

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

      await this.generateTsConfig(workspacePath, projectPath);

      let filesGenerated = 1;

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

  private async generateTsConfig(
    workspacePath: string,
    projectPath: string,
  ): Promise<void> {
    const relativePath = path.relative(
      workspacePath,
      path.resolve(projectPath),
    );

    const tsconfig = {
      extends: "../../tsconfig.json",
      compilerOptions: {
        baseUrl: ".",
        paths: {
          "@rootalicious/*": [`${relativePath}/*`],
        },
      },
      include: ["**/*"],
    };

    const tsconfigPath = path.join(workspacePath, "tsconfig.json");
    await fs.writeFile(tsconfigPath, JSON.stringify(tsconfig, null, 2));

    discoveryStatusService.appendLog({
      level: "info",
      phase: "generating",
      message: "Generated tsconfig.json with @rootalicious alias",
    });
  }

  private async generateToolFile(
    toolDir: string,
    tool: DiscoveredTool,
  ): Promise<void> {
    const toolContent = `// Auto-generated from ${tool.sourceFilePath}
// Tool: ${tool.name}

export default ${tool.executeFunction}
`;

    const toolPath = path.join(toolDir, "tool.ts");
    await fs.writeFile(toolPath, toolContent);
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

export default async function beforeAll() {
  return {
${paramObjects || "    // No parameters detected"}
  }
}
`;

    const beforeEachContent = `// Auto-generated hook stub for tool: ${tool.name}
// Edit this file to provide per-invocation context

export default async function beforeEach() {
  return {
    // Return per-invocation context here
  }
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
