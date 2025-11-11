import * as fs from "node:fs/promises";
import * as path from "node:path";

import { Project, Node, SyntaxKind, type SourceFile } from "ts-morph";

import { db } from "@/db/connection";
import { tools } from "@/db/schema/tools.schema";
import * as discoveryStatusService from "@/services/discovery-status.service";

interface DiscoverySummary {
  filesScanned: number;
  filesWithToolImports: number;
  toolsDiscovered: number;
  filesGenerated: number;
  skippedFiles: Array<{
    path: string;
    reason: string;
  }>;
}

interface ToolDefinition {
  id: string;
  name: string;
  description: string;
  parametersSchema: unknown;
  sourceFilePath: string;
  workspaceDir: string;
  detectedHookParams: string[];
  executeFunction: string;
}

export async function discoverTools(
  projectPath: string,
): Promise<DiscoverySummary> {
  discoveryStatusService.appendLog({
    level: "info",
    phase: "scanning",
    message: `Scanning project at ${projectPath}`,
  });

  const summary: DiscoverySummary = {
    filesScanned: 0,
    filesWithToolImports: 0,
    toolsDiscovered: 0,
    filesGenerated: 0,
    skippedFiles: [],
  };

  try {
    const tsConfigPath = path.join(projectPath, "tsconfig.json");

    let project: Project;
    try {
      await fs.access(tsConfigPath);
      project = new Project({
        tsConfigFilePath: tsConfigPath,
      });
    } catch {
      discoveryStatusService.appendLog({
        level: "warning",
        phase: "scanning",
        message:
          "No tsconfig.json found, using default TypeScript configuration",
      });

      project = new Project({
        compilerOptions: {
          target: 99,
          module: 1,
          strict: true,
        },
      });

      project.addSourceFilesAtPaths(`${projectPath}/**/*.{ts,tsx}`);
    }

    const sourceFiles = project.getSourceFiles();

    for (const sourceFile of sourceFiles) {
      if (discoveryStatusService.isCancellationRequested()) {
        discoveryStatusService.appendLog({
          level: "info",
          phase: "scanning",
          message: "Discovery cancelled by user",
        });
        break;
      }

      summary.filesScanned++;
      discoveryStatusService.incrementCounters({ filesScanned: 1 });

      if (!hasAISDKToolImport(sourceFile)) {
        summary.skippedFiles.push({
          path: sourceFile.getFilePath(),
          reason: "No AI SDK tool import",
        });
        continue;
      }

      summary.filesWithToolImports++;

      const discoveredTools = extractToolsFromFile(sourceFile, projectPath);

      for (const tool of discoveredTools) {
        if (discoveryStatusService.isCancellationRequested()) {
          break;
        }

        summary.toolsDiscovered++;
        discoveryStatusService.incrementCounters({ toolsFound: 1 });

        discoveryStatusService.appendLog({
          level: "info",
          phase: "analyzing",
          message: `Discovered tool '${tool.name}'`,
          context: {
            toolName: tool.name,
            detectedParams: tool.detectedHookParams,
            linesExtracted: tool.executeFunction.split("\n").length,
          },
        });

        await saveToolToDatabase(tool);
      }
    }

    return summary;
  } catch (error) {
    discoveryStatusService.appendLog({
      level: "error",
      phase: "scanning",
      message: `Discovery failed: ${error instanceof Error ? error.message : String(error)}`,
    });

    throw error;
  }
}

function hasAISDKToolImport(sourceFile: SourceFile): boolean {
  const imports = sourceFile.getImportDeclarations();

  return imports.some((imp) => {
    const moduleSpecifier = imp.getModuleSpecifierValue();
    if (moduleSpecifier !== "ai") return false;

    const namedImports = imp.getNamedImports();
    return namedImports.some((ni) => ni.getName() === "tool");
  });
}

function extractToolsFromFile(
  sourceFile: SourceFile,
  projectPath: string,
): ToolDefinition[] {
  const tools: ToolDefinition[] = [];

  try {
    const callExpressions = sourceFile.getDescendantsOfKind(
      SyntaxKind.CallExpression,
    );

    for (const callExpr of callExpressions) {
      const expression = callExpr.getExpression();
      if (expression.getText() !== "tool") continue;

      const args = callExpr.getArguments();
      if (args.length === 0) continue;

      const configArg = args[0];
      if (!configArg || !Node.isObjectLiteralExpression(configArg)) continue;

      const descriptionProp = configArg.getProperty("description");
      const parametersProp = configArg.getProperty("parameters");
      const executeProp = configArg.getProperty("execute");

      if (!descriptionProp || !parametersProp || !executeProp) continue;

      const description = extractPropertyValue(descriptionProp);
      const parameters = extractPropertyValue(parametersProp);

      if (!description || !parameters) continue;

      let executeFunction = "";
      let detectedParams: string[] = [];

      if (Node.isPropertyAssignment(executeProp)) {
        const initializer = executeProp.getInitializer();
        if (initializer && Node.isFunctionLikeDeclaration(initializer)) {
          executeFunction = initializer.getText();
          detectedParams = detectUndefinedVariables(initializer);
        }
      }

      const toolName = generateToolName(callExpr, sourceFile);
      const sourceFilePath = sourceFile.getFilePath();
      const workspaceDir = `workspace/${path.basename(projectPath)}/${toolName}`;

      tools.push({
        id: toolName,
        name: toolName,
        description,
        parametersSchema: parameters,
        sourceFilePath,
        workspaceDir,
        detectedHookParams: detectedParams,
        executeFunction,
      });
    }
  } catch (error) {
    discoveryStatusService.appendLog({
      level: "error",
      phase: "analyzing",
      message: `Failed to parse file ${sourceFile.getFilePath()}: ${error instanceof Error ? error.message : String(error)}`,
    });
  }

  return tools;
}

function extractPropertyValue(property: Node): string | null {
  if (!Node.isPropertyAssignment(property)) return null;

  const initializer = property.getInitializer();
  if (!initializer) return null;

  const text = initializer.getText();

  if (Node.isStringLiteral(initializer)) {
    return text.slice(1, -1);
  }

  return text;
}

function generateToolName(callExpr: Node, sourceFile: SourceFile): string {
  const parent = callExpr.getParent();

  if (Node.isVariableDeclaration(parent)) {
    return parent.getName();
  }

  if (Node.isPropertyAssignment(parent)) {
    return parent.getName();
  }

  const filePath = sourceFile.getFilePath();
  const baseName = path.basename(filePath, path.extname(filePath));
  return baseName;
}

function detectUndefinedVariables(functionNode: Node): string[] {
  const undefinedVars: Set<string> = new Set();

  if (!Node.isFunctionLikeDeclaration(functionNode)) {
    return [];
  }

  const identifiers = functionNode.getDescendantsOfKind(SyntaxKind.Identifier);

  const paramNames = new Set(
    functionNode.getParameters().map((p) => p.getName()),
  );

  for (const identifier of identifiers) {
    const name = identifier.getText();

    if (paramNames.has(name)) continue;

    const symbol = identifier.getSymbol();
    if (!symbol) {
      undefinedVars.add(name);
      continue;
    }

    const declarations = symbol.getDeclarations();
    const isDefinedInScope = declarations.some((decl: Node) => {
      const declPos = decl.getPos();
      const funcStart = functionNode.getPos();
      const funcEnd = functionNode.getEnd();
      return declPos >= funcStart && declPos <= funcEnd;
    });

    if (!isDefinedInScope) {
      undefinedVars.add(name);
    }
  }

  return Array.from(undefinedVars).filter(
    (name) =>
      !["console", "Promise", "Error", "undefined", "null"].includes(name),
  );
}

async function saveToolToDatabase(tool: ToolDefinition): Promise<void> {
  await db
    .insert(tools)
    .values({
      id: tool.id,
      name: tool.name,
      description: tool.description,
      sourceDescription: tool.description,
      parametersSchema: tool.parametersSchema,
      sourceFilePath: tool.sourceFilePath,
      workspaceDir: tool.workspaceDir,
      enabled: true,
      detectedHookParams: tool.detectedHookParams,
    })
    .onConflictDoUpdate({
      target: tools.id,
      set: {
        name: tool.name,
        description: tool.description,
        sourceDescription: tool.description,
        parametersSchema: tool.parametersSchema,
        sourceFilePath: tool.sourceFilePath,
        workspaceDir: tool.workspaceDir,
        detectedHookParams: tool.detectedHookParams,
        updatedAt: new Date(),
      },
    });
}
