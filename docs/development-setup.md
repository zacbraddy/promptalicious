# Development Setup

Complete guide to getting promptalicious running on your local machine.

---

## Prerequisites

Before you begin, ensure you have the following installed:

### Required

- **Node.js** 20.x or later (LTS recommended)
  - Check: `node --version`
  - Download: https://nodejs.org/

- **pnpm** 9.x or later
  - Check: `pnpm --version`
  - Install: `npm install -g pnpm@latest`

- **PostgreSQL** 14.x or later
  - Check: `psql --version`
  - Download: https://www.postgresql.org/download/
  - Note: You'll need a running PostgreSQL instance accessible on localhost

- **OpenAI API Key**
  - Get one at: https://platform.openai.com/api-keys
  - You'll need credits in your account to make API calls

### Optional but Recommended

- **Git** (for version control)
- **VS Code** (or your preferred editor with TypeScript support)
- **PostgreSQL GUI** (TablePlus, pgAdmin, etc.) for inspecting the database

---

## Initial Setup

### 1. Clone the Repository

```bash
git clone https://github.com/zacbraddy/promptalicious.git
cd promptalicious
```

### 2. Install Dependencies

```bash
pnpm install
```

This installs all dependencies for the monorepo (frontend, backend, and shared-infra packages).

### 3. (Optional) Configure Environment Variables

The backend has sensible defaults, so you only need a `.env` file if your PostgreSQL setup differs from the defaults.

**Default configuration:**
- Database: `postgresql://postgres:postgres@localhost:5432/promptalicious`
- Port: `3000`
- Node environment: `development`

**If you need custom configuration:**

Edit `packages/backend/.env` with your settings:

```env
# Only needed if different from defaults
DATABASE_URL="postgresql://your_user:your_password@localhost:5432/your_database"
PORT=3001
NODE_ENV=development
```

**Important**: Never commit `.env` to version control. It's already in `.gitignore`.

### 4. Start the Application

```bash
pnpm dev
```

This will:
1. Automatically create the database if it doesn't exist (via `predev` script)
2. Run database migrations automatically
3. Start the backend server on `http://localhost:3000`
4. Start the frontend dev server on `http://localhost:5173`

**Note**: The first run may take a moment as it sets up the database and runs migrations.

### 5. Verify Installation

Run the quality gates to ensure everything is set up correctly:

```bash
pnpm typecheck      # Should pass with no errors
pnpm lint           # Should pass with no errors
pnpm format:check   # Should pass (or run `pnpm format` first)
pnpm test:ci        # Should pass (all tests green)
```

If any of these fail, check the error messages and ensure all prerequisites are installed correctly.

---

## Running the Application

### Development Mode (Recommended)

Start both frontend and backend in watch mode:

```bash
pnpm dev
```

This runs:
- Frontend dev server on http://localhost:5173
- Backend API server on http://localhost:3000

Both will hot-reload when you make changes.

### First-Time Configuration

1. Open http://localhost:5173 in your browser
2. Navigate to Settings (gear icon in navigation)
3. Enter your OpenAI API key
4. Click "Test Connection" to verify it works
5. Save your settings
6. Navigate to the Prompt page
7. Try executing a simple prompt

### Running Frontend Only

```bash
pnpm --filter @promptalicious/frontend dev
```

### Running Backend Only

```bash
pnpm --filter @promptalicious/backend dev
```

---

## Development Workflow

### Making Changes

1. Create a new branch for your work:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes in the appropriate package:
   - Frontend: `packages/frontend/src/`
   - Backend: `packages/backend/src/`
   - Shared config: `packages/shared-infra/src/`

3. Run quality gates frequently:
   ```bash
   pnpm typecheck
   pnpm lint
   pnpm test
   ```

4. Fix any issues immediately (don't let them pile up)

### Writing Tests

Follow the pragmatic TDD workflow (see [memory/development-protocols.md](../memory/development-protocols.md)):

1. Write a failing test
2. Implement the minimum code to make it pass
3. Refactor if needed
4. Repeat

Run tests in watch mode during development:

```bash
pnpm test          # All packages, watch mode
pnpm test:ci       # All packages, single run (for CI)
```

Run tests for a specific package:

```bash
pnpm --filter @promptalicious/backend test
pnpm --filter @promptalicious/frontend test
```

### Database Migrations

When you change the database schema:

1. Update the schema in `packages/backend/src/db/schema.ts`

2. Generate a migration:
   ```bash
   pnpm --filter @promptalicious/backend db:generate --name=describe_your_change
   ```

3. The migration will run automatically next time you start the dev server via `pnpm dev`

**Never edit migration files manually.** Always use `drizzle-kit generate`. See [CLAUDE.md](../CLAUDE.md) DrizzleORM Migration Protocol for details.

### Formatting Code

Before committing, ensure code is formatted:

```bash
pnpm format:check   # Check if files need formatting
pnpm format         # Format all files
```

Or set up your editor to format on save (recommended).

---

## Project Structure

```
promptalicious/
├── packages/
│   ├── frontend/              # React frontend
│   │   ├── src/
│   │   │   ├── api/           # HTTP client
│   │   │   ├── components/    # UI components
│   │   │   ├── hooks/         # React hooks (TanStack Query)
│   │   │   ├── pages/         # Top-level pages
│   │   │   └── App.tsx        # Router
│   │   ├── package.json
│   │   └── vite.config.ts
│   │
│   ├── backend/               # Node.js API
│   │   ├── src/
│   │   │   ├── config/        # Environment config
│   │   │   ├── db/            # Database schema + migrations
│   │   │   ├── lib/           # Shared utilities
│   │   │   ├── middleware/    # Hono middleware
│   │   │   ├── routes/        # HTTP routes
│   │   │   ├── services/      # Business logic
│   │   │   ├── app.ts         # Hono app setup
│   │   │   └── index.ts       # Entry point
│   │   ├── drizzle/           # Database migrations
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── shared-infra/          # Shared configs
│       ├── src/
│       │   ├── eslint/
│       │   ├── prettier/
│       │   └── typescript/
│       └── package.json
│
├── docs/                      # Documentation
├── specs/                     # Feature specifications
├── memory/                    # Project knowledge
├── .github/workflows/         # CI/CD
├── package.json               # Root package
├── pnpm-workspace.yaml        # Workspace config
└── turbo.json                 # Turbo config
```

---

## Common Tasks

### Add a New Package Dependency

```bash
# Add to specific package
pnpm --filter @promptalicious/backend add axios@latest
pnpm --filter @promptalicious/frontend add react-query@latest

# Add dev dependency
pnpm --filter @promptalicious/backend add -D @types/node@latest

# Add to root (for tooling used across all packages)
pnpm add -D -w eslint@latest
```

**Important**: Always use `pnpm add <package>@latest` instead of manually editing `package.json`. This ensures the package exists and gets the correct version.

### Update Dependencies

```bash
# Check for outdated packages
pnpm outdated -r

# Update all packages (interactive)
pnpm update -r --interactive

# Update specific package
pnpm update axios --filter @promptalicious/backend
```

### Clean Build Artifacts

```bash
# Clean all build artifacts and node_modules
pnpm clean

# Reinstall from scratch
pnpm install
```

### Reset Database

```bash
# Drop and recreate database (if using manual setup)
psql -U postgres -c "DROP DATABASE IF EXISTS promptalicious;"
psql -U postgres -c "CREATE DATABASE promptalicious;"

# Or use the backend script
pnpm --filter @promptalicious/backend db:reset

# Migrations will run automatically on next `pnpm dev`
```

---

## Troubleshooting

See [troubleshooting.md](troubleshooting.md) for common issues and solutions.

Quick checks:

- **"Cannot find module"**: Run `pnpm install`
- **TypeScript errors**: Run `pnpm typecheck` and fix reported issues
- **Tests failing**: Ensure database is running and migrations have been applied
- **Port already in use**: Change `PORT` in `.env` or kill the process using the port
- **Database connection failed**: Check `DATABASE_URL` in `.env` and ensure PostgreSQL is running

---

## IDE Setup

### VS Code (Recommended)

Install these extensions:
- ESLint (`dbaeumer.vscode-eslint`)
- Prettier (`esbenp.prettier-vscode`)
- TypeScript (`ms-vscode.vscode-typescript-next`)

Configure workspace settings (`.vscode/settings.json`):

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib"
}
```

### Other Editors

Ensure your editor:
- Uses the project's TypeScript version (not global)
- Runs ESLint and Prettier on save
- Respects `.editorconfig` (if present)

---

## Next Steps

- Read [architecture.md](architecture.md) to understand the system design
- Review [CONTRIBUTING.md](../CONTRIBUTING.md) before submitting PRs
- Check [memory/development-protocols.md](../memory/development-protocols.md) for coding standards

---

**Last Updated**: 2025-11-07
**Questions?** Open an issue or check [troubleshooting.md](troubleshooting.md)
