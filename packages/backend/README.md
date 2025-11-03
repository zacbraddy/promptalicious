# @promptalicious/backend

Node.js + TypeScript backend for the promptalicious LLM prompt debugging tool.

## Status

Currently a placeholder scaffold with minimal functionality. Future features will include:

- API endpoints for managing LLM configurations
- PostgreSQL database integration
- Tool execution environment
- LLM provider integrations (starting with GPT-4o-mini via Vercel AI SDK)

## Development

```bash
# Start development server with hot reload
pnpm dev

# Type checking
pnpm typecheck

# Linting
pnpm lint
pnpm lint:fix

# Formatting
pnpm format
pnpm format:check

# Testing
pnpm test

# Build
pnpm build
```

## Configuration

This package inherits configuration from `@promptalicious/shared-infra`:

- TypeScript: Extends `../shared-infra/tsconfig.json`
- ESLint: Will use shared factory (T007 pending)
- Prettier: Uses project defaults

## Architecture

Once implemented, this package will follow Onion Architecture principles:

- Domain logic isolated from infrastructure
- Dependencies point inward
- Clear module boundaries
- See `/memory/constitution.md` for architectural standards
