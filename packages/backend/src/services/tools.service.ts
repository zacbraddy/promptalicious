import { eq } from "drizzle-orm";

import { db } from "@/db/connection";
import { tools } from "@/db/schema/tools.schema";
import { projectConfiguration } from "@/db/schema/project.schema";

export interface ToolListItem {
  id: string;
  name: string;
  description: string;
  sourceDescription: string | null;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ToolDetail {
  id: string;
  name: string;
  description: string;
  sourceDescription: string | null;
  parametersSchema: unknown;
  sourceFilePath: string;
  workspaceDir: string;
  enabled: boolean;
  detectedHookParams: unknown;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateToolData {
  description?: string;
  enabled?: boolean;
}

export async function getTools(): Promise<ToolListItem[]> {
  const projectConfig = await db
    .select()
    .from(projectConfiguration)
    .where(eq(projectConfiguration.id, 1))
    .limit(1);

  if (projectConfig.length === 0) {
    throw new Error("No project configured");
  }

  const result = await db.select().from(tools);

  return result.map((tool) => ({
    id: tool.id,
    name: tool.name,
    description: tool.description,
    sourceDescription: tool.sourceDescription,
    enabled: tool.enabled,
    createdAt: tool.createdAt,
    updatedAt: tool.updatedAt,
  }));
}

export async function getTool(id: string): Promise<ToolDetail | null> {
  const result = await db.select().from(tools).where(eq(tools.id, id)).limit(1);

  if (result.length === 0 || !result[0]) {
    return null;
  }

  const tool = result[0];

  return {
    id: tool.id,
    name: tool.name,
    description: tool.description,
    sourceDescription: tool.sourceDescription,
    parametersSchema: tool.parametersSchema,
    sourceFilePath: tool.sourceFilePath,
    workspaceDir: tool.workspaceDir,
    enabled: tool.enabled,
    detectedHookParams: tool.detectedHookParams,
    createdAt: tool.createdAt,
    updatedAt: tool.updatedAt,
  };
}

export async function updateTool(
  id: string,
  data: UpdateToolData,
): Promise<ToolDetail | null> {
  const existingTool = await db
    .select()
    .from(tools)
    .where(eq(tools.id, id))
    .limit(1);

  if (existingTool.length === 0 || !existingTool[0]) {
    return null;
  }

  const updateData: Partial<typeof tools.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (data.description !== undefined) {
    updateData.description = data.description;
    updateData.sourceDescription = null;
  }

  if (data.enabled !== undefined) {
    updateData.enabled = data.enabled;
  }

  const result = await db
    .update(tools)
    .set(updateData)
    .where(eq(tools.id, id))
    .returning();

  if (result.length === 0 || !result[0]) {
    return null;
  }

  const tool = result[0];

  return {
    id: tool.id,
    name: tool.name,
    description: tool.description,
    sourceDescription: tool.sourceDescription,
    parametersSchema: tool.parametersSchema,
    sourceFilePath: tool.sourceFilePath,
    workspaceDir: tool.workspaceDir,
    enabled: tool.enabled,
    detectedHookParams: tool.detectedHookParams,
    createdAt: tool.createdAt,
    updatedAt: tool.updatedAt,
  };
}
