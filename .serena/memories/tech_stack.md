# Tech Stack

## Monorepo Architecture
- **Package Manager**: pnpm with workspaces
- **Build Orchestration**: Turbo
- **Structure**: Monorepo with 3 packages (frontend, backend, shared-infra)

## Frontend
- **Language**: TypeScript (strict mode)
- **Framework**: React 19
- **Build Tool**: Vite
- **Testing**: Vitest
- **UI Components**: shadcn/ui (Radix UI primitives)
- **Styling**: Tailwind CSS v4 (dark mode only, retrofuturistic theme)
- **State Management**: 
  - TanStack Query (React Query) for server state
  - React hooks for UI state
- **Form Handling**: React Hook Form + Zod
- **Toast Notifications**: Sonner
- **Routing**: React Router DOM

## Backend
- **Language**: TypeScript (strict mode)
- **Runtime**: Node.js LTS
- **API Framework**: Hono (ultra-fast, TypeScript-first)
- **Database**: PostgreSQL
- **ORM**: DrizzleORM (lightweight, SQL-like syntax)
- **LLM SDK**: Vercel AI SDK (OpenAI provider for GPT-4o-mini)
- **Validation**: Zod

## Development Tools
- **Linting**: ESLint (flat config, TypeScript + React plugins)
- **Formatting**: Prettier
- **Git Hooks**: Husky (pre-commit quality gates)
- **Type Checking**: TypeScript compiler (strict mode)

## Configuration Sharing
- **Package**: @promptalicious/shared-infra
- **Purpose**: Centralised TypeScript configs, ESLint configs, shared types
