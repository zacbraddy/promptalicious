# @promptalicious/shared-infra

Shared infrastructure and configuration package for the promptalicious monorepo.

## Purpose

This package centralises tooling configuration (TypeScript, ESLint, Prettier) to ensure consistency across all packages in the monorepo whilst avoiding configuration drift.

## What's Included

### TypeScript Configuration

Base TypeScript configuration with strict mode enabled. Other packages extend this via:

```json
{
  "extends": "@promptalicious/shared-infra/tsconfig"
}
```

**Key Settings**:

- Strict mode enabled
- ES2022 target
- ESNext modules
- Declaration files generated
- Comprehensive strictness checks

### ESLint Configuration (Future)

Factory functions for creating ESLint configurations with package-specific options. Consuming packages will import and call these factories:

```typescript
import { createEslintConfig } from "@promptalicious/shared-infra/eslint";

export default createEslintConfig({
  tsconfigRootDir: import.meta.dirname,
  isFrontend: true,
  ignores: ["./specific-file.ts"],
});
```

### Prettier Configuration (Future)

Shared Prettier configuration (if project-wide customisation needed beyond defaults).

## Package Structure

```
shared-infra/
├── src/
│   └── eslint/          # ESLint factory functions (future)
│       ├── createEslintConfig.ts
│       ├── base.config.ts
│       └── frontend.config.ts
├── tsconfig.json        # Base TypeScript configuration
├── package.json         # Package metadata and exports
└── README.md           # This file
```

## Usage Pattern

Consuming packages add `@promptalicious/shared-infra` as a workspace dependency:

```json
{
  "dependencies": {
    "@promptalicious/shared-infra": "workspace:*"
  }
}
```

Then reference the shared configurations in their own config files.

## Development

This package is part of the promptalicious monorepo and uses pnpm workspaces. Changes to shared configurations automatically propagate to dependent packages.

**Quality Gates**:

- `pnpm typecheck` - TypeScript validation
- `pnpm lint` - ESLint checks
- `pnpm format:check` - Prettier formatting validation

## Future Enhancements

As the project evolves, this package may include:

- ESLint configuration factory functions
- Prettier shared configuration
- Vitest configuration helpers
- Shared utility types
- Common build scripts
