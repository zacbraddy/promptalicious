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

export interface ToolDefinition {
  id: string;
  name: string;
  description: string;
  sourceDescription: string;
  parametersSchema: unknown;
  schemaImport: {
    schemaName: string;
    schemaAccessor: string;
    importPath: string;
  } | null;
  sourceFilePath: string;
  workspaceDir: string;
  detectedHookParams: string[];
  executeFunction: string;
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

export interface DiscoveryResult {
  summary: DiscoverySummary;
  tools: ToolDefinition[];
}

export async function discoverTools(
  projectPath: string,
): Promise<DiscoveryResult> {
  await db.delete(tools);

  discoveryStatusService.appendLog({
    level: "info",
    phase: "scanning",
    message: `Cleared existing tools and scanning project at ${projectPath}`,
  });

  const summary: DiscoverySummary = {
    filesScanned: 0,
    filesWithToolImports: 0,
    toolsDiscovered: 0,
    filesGenerated: 0,
    skippedFiles: [],
  };

  const allTools: ToolDefinition[] = [];

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
        allTools.push(tool);
      }
    }

    return {
      summary,
      tools: allTools,
    };
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
      const parametersProp =
        configArg.getProperty("parameters") ||
        configArg.getProperty("inputSchema");
      const executeProp = configArg.getProperty("execute");

      if (!descriptionProp || !parametersProp || !executeProp) continue;

      const description = extractPropertyValue(descriptionProp);
      const parameters = extractPropertyValue(parametersProp);

      if (!description || !parameters) continue;

      let executeFunction = "";
      let detectedParams: string[] = [];
      let executeFunctionNode: Node | undefined;

      if (Node.isPropertyAssignment(executeProp)) {
        const initializer = executeProp.getInitializer();
        if (initializer && Node.isFunctionLikeDeclaration(initializer)) {
          executeFunction = initializer.getText();
          detectedParams = detectClosureVariables(callExpr, initializer);
          executeFunctionNode = initializer;
        }
      }

      if (!executeFunctionNode) continue;

      const toolName = generateToolName(callExpr, sourceFile);
      const sourceFilePath = sourceFile.getFilePath();
      const workspaceDir = `workspace/${path.basename(projectPath)}/${toolName}`;

      const typeImports = extractTypeImports(
        sourceFile,
        executeFunctionNode,
        projectPath,
      );

      const environmentTypes = extractClosureVariableTypes(
        sourceFile,
        executeFunctionNode,
        detectedParams,
        projectPath,
      );

      const schemaImport = extractSchemaImport(
        sourceFile,
        parameters,
        projectPath,
      );

      tools.push({
        id: toolName,
        name: toolName,
        description,
        sourceDescription: description,
        parametersSchema: parameters,
        schemaImport,
        sourceFilePath,
        workspaceDir,
        detectedHookParams: detectedParams,
        executeFunction,
        typeImports,
        environmentTypes,
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

  let ancestor: Node | undefined = parent;
  while (ancestor) {
    if (
      Node.isFunctionDeclaration(ancestor) ||
      Node.isFunctionExpression(ancestor) ||
      Node.isArrowFunction(ancestor)
    ) {
      const funcParent = ancestor.getParent();

      if (Node.isVariableDeclaration(funcParent)) {
        const funcName = funcParent.getName();
        return extractToolNameFromFunction(funcName);
      }

      if (Node.isFunctionDeclaration(ancestor)) {
        const funcName = ancestor.getName();
        if (funcName) {
          return extractToolNameFromFunction(funcName);
        }
      }

      break;
    }
    ancestor = ancestor.getParent();
  }

  const filePath = sourceFile.getFilePath();
  const baseName = path.basename(filePath, path.extname(filePath));
  return baseName;
}

function extractToolNameFromFunction(functionName: string): string {
  const createToolPattern = /^create(.+)Tool$/i;
  const match = functionName.match(createToolPattern);

  if (match && match[1]) {
    const toolName = match[1];
    return toolName.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
  }

  return functionName.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
}

function extractTypeImports(
  sourceFile: SourceFile,
  executeNode: Node,
  projectPath: string,
): Array<{ typeName: string; importPath: string }> {
  const typeImports: Array<{ typeName: string; importPath: string }> = [];
  const typeNames = new Set<string>();

  const typeReferences = executeNode.getDescendantsOfKind(
    SyntaxKind.TypeReference,
  );

  for (const typeRef of typeReferences) {
    const typeName = typeRef.getTypeName();
    if (Node.isIdentifier(typeName)) {
      const name = typeName.getText();
      if (name && /^[A-Z]/.test(name)) {
        typeNames.add(name);
      }
    }
  }

  const importDeclarations = sourceFile.getImportDeclarations();

  for (const importDecl of importDeclarations) {
    const moduleSpecifier = importDecl.getModuleSpecifierValue();
    const namedImports = importDecl.getNamedImports();

    for (const namedImport of namedImports) {
      const typeName = namedImport.getName();
      if (typeNames.has(typeName)) {
        let resolvedPath = moduleSpecifier;

        if (moduleSpecifier.startsWith("@/")) {
          const resolvedSourceFile = importDecl.getModuleSpecifierSourceFile();
          if (resolvedSourceFile) {
            const resolvedFilePath = resolvedSourceFile.getFilePath();
            const relativePath = path.relative(projectPath, resolvedFilePath);
            const pathWithoutExtension = relativePath.replace(
              /\.(ts|tsx|js|jsx)$/,
              "",
            );
            resolvedPath = `../rootalicious/${pathWithoutExtension}`;
          } else {
            resolvedPath = moduleSpecifier.replace(/^@\//, "../rootalicious/");
          }
        } else {
          resolvedPath = moduleSpecifier.replace(/^@\//, "../rootalicious/");
        }

        typeImports.push({
          typeName,
          importPath: resolvedPath,
        });
      }
    }
  }

  return typeImports;
}

function extractSchemaImport(
  sourceFile: SourceFile,
  schemaReferenceText: string,
  projectPath: string,
): { schemaName: string; schemaAccessor: string; importPath: string } | null {
  const parts = schemaReferenceText.split(".");
  if (parts.length === 0) return null;

  const schemaName = parts[0];
  const schemaAccessor = parts.slice(1).join(".");

  const importDeclarations = sourceFile.getImportDeclarations();

  for (const importDecl of importDeclarations) {
    const moduleSpecifier = importDecl.getModuleSpecifierValue();
    const namedImports = importDecl.getNamedImports();

    for (const namedImport of namedImports) {
      const importName = namedImport.getName();
      if (importName === schemaName) {
        let resolvedPath = moduleSpecifier;

        if (moduleSpecifier.startsWith("@/")) {
          const resolvedSourceFile = importDecl.getModuleSpecifierSourceFile();
          if (resolvedSourceFile) {
            const resolvedFilePath = resolvedSourceFile.getFilePath();
            const relativePath = path.relative(projectPath, resolvedFilePath);
            const pathWithoutExtension = relativePath.replace(
              /\.(ts|tsx|js|jsx)$/,
              "",
            );
            resolvedPath = `../rootalicious/${pathWithoutExtension}`;
          } else {
            resolvedPath = moduleSpecifier.replace(/^@\//, "../rootalicious/");
          }
        } else {
          resolvedPath = moduleSpecifier.replace(/^@\//, "../rootalicious/");
        }

        return {
          schemaName,
          schemaAccessor,
          importPath: resolvedPath,
        };
      }
    }
  }

  return null;
}

function detectClosureVariables(
  _toolCallExpr: Node,
  executeFunction: Node,
): string[] {
  if (!Node.isFunctionLikeDeclaration(executeFunction)) {
    return [];
  }

  const closureVars: Set<string> = new Set();
  const builtins = new Set([
    "console",
    "Promise",
    "Error",
    "undefined",
    "null",
    "Array",
    "Object",
    "String",
    "Number",
    "Boolean",
    "Math",
    "Date",
    "JSON",
    "parseInt",
    "parseFloat",
    "isNaN",
    "isFinite",
  ]);

  const executeFunctionParams = new Set(
    executeFunction.getParameters().map((p) => p.getName()),
  );

  const identifiers = executeFunction.getDescendantsOfKind(
    SyntaxKind.Identifier,
  );

  for (const identifier of identifiers) {
    const name = identifier.getText();

    if (builtins.has(name)) continue;
    if (executeFunctionParams.has(name)) continue;

    const parent = identifier.getParent();
    if (Node.isPropertyAccessExpression(parent)) {
      if (parent.getNameNode() === identifier) {
        continue;
      }
    }

    const symbol = identifier.getSymbol();
    if (!symbol) {
      closureVars.add(name);
      continue;
    }

    const declarations = symbol.getDeclarations();

    const isDefinedInExecuteFunction = declarations.some((decl: Node) => {
      const declPos = decl.getPos();
      const funcStart = executeFunction.getPos();
      const funcEnd = executeFunction.getEnd();
      return declPos >= funcStart && declPos <= funcEnd;
    });

    if (isDefinedInExecuteFunction) continue;

    const isTypeReference = identifier
      .getAncestors()
      .some(
        (ancestor) =>
          Node.isTypeReference(ancestor) || Node.isTypeNode(ancestor),
      );

    if (isTypeReference) continue;

    closureVars.add(name);
  }

  return Array.from(closureVars);
}

function extractClosureVariableTypes(
  sourceFile: SourceFile,
  executeFunction: Node,
  closureVarNames: string[],
  projectPath: string,
): Array<{
  name: string;
  type: string;
  typeImports: Array<{ typeName: string; importPath: string }>;
}> {
  if (!Node.isFunctionLikeDeclaration(executeFunction)) {
    return [];
  }

  const closureVarTypes: Array<{
    name: string;
    type: string;
    typeImports: Array<{ typeName: string; importPath: string }>;
  }> = [];

  for (const varName of closureVarNames) {
    const identifiers = executeFunction
      .getDescendantsOfKind(SyntaxKind.Identifier)
      .filter((id) => id.getText() === varName);

    if (identifiers.length === 0) continue;

    const identifier = identifiers[0];
    if (!identifier) continue;

    const symbol = identifier.getSymbol();

    if (!symbol) {
      closureVarTypes.push({ name: varName, type: "unknown", typeImports: [] });
      continue;
    }

    const declarations = symbol.getDeclarations();
    if (declarations.length === 0) {
      closureVarTypes.push({ name: varName, type: "unknown", typeImports: [] });
      continue;
    }

    const declaration = declarations[0];
    let typeText = "unknown";
    const typeImports: Array<{ typeName: string; importPath: string }> = [];

    if (Node.isVariableDeclaration(declaration)) {
      const typeNode = declaration.getTypeNode();
      if (typeNode) {
        typeText = typeNode.getText();
        // Extract imports from explicit type annotation
        extractImportsFromType(typeNode, sourceFile, projectPath, typeImports);
      } else {
        // Type is inferred - get it from the type system
        const type = declaration.getType();
        typeText = type.getText(declaration);
        // Extract imports from inferred type by analyzing the type structure
        extractImportsFromInferredType(
          type,
          sourceFile,
          projectPath,
          typeImports,
        );
      }
    } else if (Node.isParameterDeclaration(declaration)) {
      const typeNode = declaration.getTypeNode();
      if (typeNode) {
        typeText = typeNode.getText();
        extractImportsFromType(typeNode, sourceFile, projectPath, typeImports);
      } else {
        const type = declaration.getType();
        typeText = type.getText(declaration);
        extractImportsFromInferredType(
          type,
          sourceFile,
          projectPath,
          typeImports,
        );
      }
    }

    closureVarTypes.push({ name: varName, type: typeText, typeImports });
  }

  return closureVarTypes;
}

function extractImportsFromType(
  typeNode: Node,
  sourceFile: SourceFile,
  projectPath: string,
  typeImports: Array<{ typeName: string; importPath: string }>,
): void {
  const typeNames = new Set<string>();

  // The typeNode itself might be a TypeReference (e.g., IExecutionContext)
  // or it might contain TypeReferences (e.g., Promise<IExecutionContext>)
  const typeReferences = Node.isTypeReference(typeNode)
    ? [typeNode]
    : typeNode.getDescendantsOfKind(SyntaxKind.TypeReference);

  for (const typeRef of typeReferences) {
    const typeName = typeRef.getTypeName();
    if (Node.isIdentifier(typeName)) {
      const name = typeName.getText();
      if (name && /^[A-Z]/.test(name)) {
        typeNames.add(name);
      }
    }
  }

  findImportsForTypes(typeNames, sourceFile, projectPath, typeImports);
}

function extractImportsFromInferredType(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type: any,
  sourceFile: SourceFile,
  projectPath: string,
  typeImports: Array<{ typeName: string; importPath: string }>,
): void {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  const typeText: string = type.getText();
  const typeNames = new Set<string>();

  // Extract type names from the type text (e.g., "IExecutionContext" from inferred type)
  const typeNameMatches = typeText.matchAll(/\b([A-Z][a-zA-Z0-9]*)\b/g);
  for (const match of typeNameMatches) {
    const typeName = match[1];
    if (typeName) {
      typeNames.add(typeName);
    }
  }

  findImportsForTypes(typeNames, sourceFile, projectPath, typeImports);
}

function findImportsForTypes(
  typeNames: Set<string>,
  sourceFile: SourceFile,
  projectPath: string,
  typeImports: Array<{ typeName: string; importPath: string }>,
): void {
  const importDeclarations = sourceFile.getImportDeclarations();

  for (const importDecl of importDeclarations) {
    const moduleSpecifier = importDecl.getModuleSpecifierValue();
    const namedImports = importDecl.getNamedImports();

    for (const namedImport of namedImports) {
      const typeName = namedImport.getName();
      if (typeNames.has(typeName)) {
        let resolvedPath = moduleSpecifier;

        if (moduleSpecifier.startsWith("@/")) {
          const resolvedSourceFile = importDecl.getModuleSpecifierSourceFile();
          if (resolvedSourceFile) {
            const resolvedFilePath = resolvedSourceFile.getFilePath();
            const relativePath = path.relative(projectPath, resolvedFilePath);
            const pathWithoutExtension = relativePath.replace(
              /\.(ts|tsx|js|jsx)$/,
              "",
            );
            resolvedPath = `../rootalicious/${pathWithoutExtension}`;
          } else {
            resolvedPath = moduleSpecifier.replace(/^@\//, "../rootalicious/");
          }
        } else {
          resolvedPath = moduleSpecifier.replace(/^@\//, "../rootalicious/");
        }

        typeImports.push({
          typeName,
          importPath: resolvedPath,
        });
      }
    }
  }
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
      schemaImport: tool.schemaImport,
      sourceFilePath: tool.sourceFilePath,
      workspaceDir: tool.workspaceDir,
      enabled: true,
      detectedHookParams: tool.detectedHookParams,
      typeImports: tool.typeImports,
      environmentTypes: tool.environmentTypes,
    })
    .onConflictDoUpdate({
      target: tools.id,
      set: {
        name: tool.name,
        description: tool.description,
        sourceDescription: tool.description,
        parametersSchema: tool.parametersSchema,
        schemaImport: tool.schemaImport,
        sourceFilePath: tool.sourceFilePath,
        workspaceDir: tool.workspaceDir,
        detectedHookParams: tool.detectedHookParams,
        typeImports: tool.typeImports,
        environmentTypes: tool.environmentTypes,
        updatedAt: new Date(),
      },
    });
}
