# Codebase Structure

## Repository Layout
```
promptalicious/
├── packages/
│   ├── frontend/              # React + Vite frontend application
│   ├── backend/               # Hono API server
│   └── shared-infra/          # Shared TypeScript configs, types, utilities
├── specs/                     # Feature specifications (spec-driven development)
├── memory/                    # Project knowledge files (constitution, protocols, etc.)
├── docs/                      # Additional documentation
├── .claude/                   # Claude Code configuration (commands, skills)
├── pnpm-workspace.yaml        # pnpm workspace configuration
├── turbo.json                 # Turbo build orchestration config
└── CLAUDE.md                  # Main project context for AI development

```

## Frontend Package (`packages/frontend/`)
```
src/
├── components/          # Presentation components (UI only)
│   ├── ui/             # shadcn/ui base components
│   ├── Layout.tsx      # Main layout wrapper
│   └── SettingsForm.tsx
├── pages/              # Container components (route handlers, uses hooks)
│   ├── HomePage.tsx
│   └── SettingsPage.tsx
├── hooks/              # Custom React hooks
│   └── useConfig.ts    # TanStack Query hooks for config API
├── services/           # API client layer
│   └── apiClient.ts    # Axios instance + API functions
├── config/             # Configuration files
│   └── env.ts
├── App.tsx             # Root component (QueryClientProvider, Router, Toaster)
├── main.tsx            # Entry point
└── index.css           # Global styles (Tailwind, theme variables)
```

## Backend Package (`packages/backend/`)
```
src/
├── index.ts            # Server entry point (Hono app)
├── routes/             # API route handlers
├── services/           # Business logic layer
├── db/                 # Database setup
│   └── schema.ts       # DrizzleORM schema definitions
└── types/              # Backend-specific TypeScript types

drizzle/                # Migration files (NEVER edit manually!)
└── meta/               # DrizzleORM metadata (NEVER touch!)
```

## Shared Infrastructure (`packages/shared-infra/`)
```
src/
├── types/
│   └── api.ts          # Shared API types (requests/responses)
├── eslint/             # ESLint config factory functions
└── tsconfig.json       # Base TypeScript config
```

## Key Configuration Files
- **Root `package.json`**: Turbo scripts for dev, build, test, lint, format
- **Root `tsconfig.json`**: References to package-level configs
- **`.husky/pre-commit`**: Git hooks for quality gates
- **`turbo.json`**: Task pipeline and caching configuration

## Spec-Driven Development Structure
```
specs/
└── 002-make-a-call/         # Current feature spec
    ├── spec.md              # Business requirements
    ├── plan.md              # Technical design
    ├── tasks.md             # Actionable task breakdown
    ├── research.md          # Technical decisions
    └── data-model.md        # Entity definitions
```

## Memory Files (Project Knowledge)
```
memory/
├── constitution.md           # Core principles and governance
├── development-protocols.md  # Tech stack, patterns, standards
├── program_overview.md       # Business context and vision
└── task-execution-patterns.md # Workflow and quality gates
```
