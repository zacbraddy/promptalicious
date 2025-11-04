# Data Model: Project Scaffold

**Date**: 2025-11-03
**Spec**: 001-project-scaffold-i

## Overview

This specification is for infrastructure setup only and does not involve data entities or domain models.

## Why No Data Model?

This scaffold spec establishes:
- Package structure (pnpm workspaces)
- Build orchestration (Turbo)
- Shared configuration (TypeScript, ESLint, Prettier)
- Development workflows (dev servers, quality gates)

**No business logic = No data entities**

## Configuration Structure

While not domain entities, the scaffold does define configuration structures:

### Package Metadata (`package.json`)

Each package contains standard npm package metadata:
```json
{
  "name": "@promptalicious/[package-name]",
  "version": "0.1.0",
  "private": true,
  "scripts": { /* package-specific tasks */ },
  "dependencies": { /* runtime deps */ },
  "devDependencies": { /* build-time deps */ }
}
```

### Workspace Configuration (`pnpm-workspace.yaml`)

Defines which directories are packages:
```yaml
packages:
  - "packages/*"
```

### Build Pipeline (`turbo.json`)

Defines task orchestration:
```json
{
  "pipeline": {
    "build": { "dependsOn": ["^build"], "outputs": ["dist/**"] },
    "dev": { "cache": false, "persistent": true },
    "test": { "cache": false },
    "typecheck": { "dependsOn": ["^build"] },
    "lint": {},
    "format": {}
  }
}
```

### TypeScript Configuration Hierarchy

Three-tier extends chain:
```
shared-infra/tsconfig.json (base)
  → frontend/tsconfig.json (React, DOM)
  → backend/tsconfig.json (Node, Server)
```

## Future Data Models

When feature specs are implemented (e.g., "LLM Configuration Management"), those specs will define:
- Domain entities (e.g., `Prompt`, `ToolConfig`, `LLMProvider`)
- Relationships between entities
- Validation rules
- State transitions

This scaffold provides the foundation for those future data models to live in.

## Related Artifacts

- **research.md**: Technology choices and rationale
- **quickstart.md**: Validation scenarios for infrastructure setup
