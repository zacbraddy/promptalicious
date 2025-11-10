export interface ProjectConfigurationData {
  name: string;
  targetProjectPath: string;
}

export interface ProjectConfiguration {
  id: number;
  name: string;
  targetProjectPath: string;
  workspacePath: string;
  createdAt: Date;
  updatedAt: Date;
}

export function getProjectConfiguration(): Promise<ProjectConfiguration | null> {
  throw new Error("Not implemented");
}

export function updateProjectConfiguration(
  _data: ProjectConfigurationData,
): Promise<ProjectConfiguration> {
  throw new Error("Not implemented");
}

export function startDiscovery(): Promise<void> {
  throw new Error("Not implemented");
}
