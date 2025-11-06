# Code Style and Conventions

## TypeScript
- **Strict Mode**: Always enabled (`strict: true`)
- **Import Paths**: Use `@/` alias for local imports (e.g., `@/components/Button`)
- **Type Inference**: Prefer type inference over explicit types when obvious
- **No Comments**: Do not generate comments when writing code (per user preference)
- **No Emojis**: Avoid emojis in code unless explicitly requested by user

## Naming Conventions
- **Files**: kebab-case for files (`settings-form.tsx`, `api-client.ts`)
- **Components**: PascalCase (`SettingsForm`, `HomePage`)
- **Functions**: camelCase (`handleSubmit`, `getConfig`)
- **Constants**: UPPER_SNAKE_CASE for true constants (`API_KEY_PLACEHOLDER`)
- **Types/Interfaces**: PascalCase (`SettingsFormProps`, `ConfigurationResponse`)

## React Patterns
- **Components**: Function components with TypeScript
- **Props**: Always define interface for props
- **Hooks**: Use hooks in function components, not class components
- **State**: TanStack Query for server state, React hooks for UI state

## TanStack Query Pattern (CRITICAL)
**3-Layer Architecture**:
1. **API Client Layer** (`services/apiClient.ts`): Pure functions returning promises
2. **Hook Layer** (`hooks/useConfig.ts`): TanStack Query hooks wrapping API functions
3. **Component Layer**: 
   - **Container** (pages): Uses hooks, handles errors/success, passes props down
   - **Presentation** (components): Receives props, no direct API/hook imports

**Never bypass TanStack Query** - all API calls MUST go through hooks.

## Import Organization
- Automatic sorting via ESLint `import/order` rule
- Order: built-ins → externals → internals → parent → sibling → index
- Blank lines between groups

## File Structure Patterns
```
packages/frontend/src/
├── components/        # Presentation components
├── pages/            # Container components (route handlers)
├── hooks/            # Custom React hooks (especially TanStack Query)
├── services/         # API client functions
└── config/           # Configuration files
```

## Error Handling
- Use custom `ApiError` class for API errors
- Container components handle errors and show toast notifications
- Presentation components just call props, letting errors bubble up

## Styling
- Tailwind utility classes only
- Use shadcn components as base
- Dark mode is default (not a toggle)
- Retrofuturistic colour palette (soft greys, muddy blacks, cyan/magenta accents)
