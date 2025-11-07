# Troubleshooting

Common issues and solutions when working with promptalicious.

---

## Installation Issues

### "Command not found: pnpm"

**Problem**: pnpm is not installed or not in your PATH.

**Solution**:
```bash
npm install -g pnpm@latest
```

Verify installation:
```bash
pnpm --version
```

---

### "Module not found" errors after installing dependencies

**Problem**: Dependencies are out of sync or installation was interrupted.

**Solution**:
```bash
# Clean everything and reinstall
rm -rf node_modules packages/*/node_modules
pnpm install
```

---

### "Cannot find module '@promptalicious/shared-infra'"

**Problem**: Workspace linking hasn't completed or package wasn't built.

**Solution**:
```bash
# Rebuild all packages
pnpm build

# If that doesn't work, clean and reinstall
pnpm clean
pnpm install
```

---

## Database Issues

### "Error: connect ECONNREFUSED 127.0.0.1:5432"

**Problem**: PostgreSQL is not running or not accessible on localhost:5432.

**Solution**:

1. Check if PostgreSQL is running:
   ```bash
   # On Linux
   sudo systemctl status postgresql
   
   # On macOS (if installed via Homebrew)
   brew services list
   
   # Try connecting manually
   psql -U postgres -h localhost
   ```

2. Start PostgreSQL if it's not running:
   ```bash
   # On Linux
   sudo systemctl start postgresql
   
   # On macOS
   brew services start postgresql
   ```

3. Verify your `DATABASE_URL` in `.env` matches your PostgreSQL setup

---

### "database \"promptalicious\" does not exist"

**Problem**: Database hasn't been created yet.

**Solution**:
```bash
# Create database
psql -U postgres -c "CREATE DATABASE promptalicious;"

# Grant permissions (if using a specific user)
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE promptalicious TO promptalicious_user;"

# Run migrations
pnpm --filter @promptalicious/backend db:migrate
```

---

### "relation \"configurations\" does not exist"

**Problem**: Database migrations haven't been applied.

**Solution**:
```bash
pnpm --filter @promptalicious/backend db:migrate
```

If migrations still fail:
```bash
# Check what migrations exist
ls packages/backend/drizzle/

# Drop and recreate database (WARNING: destroys data)
psql -U postgres -c "DROP DATABASE IF EXISTS promptalicious;"
psql -U postgres -c "CREATE DATABASE promptalicious;"

# Run migrations fresh
pnpm --filter @promptalicious/backend db:migrate
```

---

### "password authentication failed for user"

**Problem**: Database credentials in `.env` don't match PostgreSQL user.

**Solution**:

1. Check your PostgreSQL user and password:
   ```bash
   psql -U postgres
   \du  # List users
   ```

2. Reset user password if needed:
   ```sql
   ALTER USER promptalicious_user WITH PASSWORD 'new_password';
   ```

3. Update `DATABASE_URL` in `.env`:
   ```env
   DATABASE_URL="postgresql://promptalicious_user:new_password@localhost:5432/promptalicious"
   ```

---

## Development Server Issues

### "Port 3000 is already in use"

**Problem**: Another process is using the backend port.

**Solution**:

1. Find and kill the process:
   ```bash
   # On Linux/macOS
   lsof -ti:3000 | xargs kill -9
   
   # Or change the port in .env
   echo "PORT=3001" >> .env
   ```

2. Restart the development server:
   ```bash
   pnpm dev
   ```

---

### "Port 5173 is already in use"

**Problem**: Another Vite server is running.

**Solution**:
```bash
# Kill processes on port 5173
lsof -ti:5173 | xargs kill -9

# Or Vite will automatically try the next available port
# Check the terminal output for the actual URL
```

---

### Frontend shows "Network Error" when calling API

**Problem**: Backend is not running or frontend is pointing to wrong API URL.

**Solution**:

1. Verify backend is running:
   ```bash
   curl http://localhost:3000/health
   ```
   Should return: `{"status":"healthy","timestamp":"..."}`

2. Check frontend API configuration in `packages/frontend/src/api/client.ts`:
   ```typescript
   const client = axios.create({
     baseURL: 'http://localhost:3000',  // Should match backend port
   });
   ```

3. Check CORS configuration in `packages/backend/src/presentation/app.ts`:
   ```typescript
   app.use(cors({
     origin: 'http://localhost:5173',  // Should match frontend URL
   }));
   ```

---

## TypeScript Issues

### "Cannot find name 'X'" or "Module not found"

**Problem**: TypeScript can't resolve imports or types are missing.

**Solution**:

1. Ensure all packages are built:
   ```bash
   pnpm build
   ```

2. Check TypeScript is using the workspace version:
   ```bash
   # Should point to node_modules/typescript
   which tsc
   ```

3. Restart your editor's TypeScript server:
   - VS Code: Cmd/Ctrl + Shift + P → "TypeScript: Restart TS Server"

4. Verify `@/` alias is configured in `tsconfig.json`:
   ```json
   {
     "compilerOptions": {
       "paths": {
         "@/*": ["./src/*"]
       }
     }
   }
   ```

---

### "Type errors in node_modules"

**Problem**: Dependency type definitions are incompatible or corrupted.

**Solution**:
```bash
# Clear pnpm cache and reinstall
pnpm store prune
rm -rf node_modules packages/*/node_modules pnpm-lock.yaml
pnpm install
```

---

## Testing Issues

### Tests fail with "Cannot connect to database"

**Problem**: Test database isn't set up or DATABASE_URL is incorrect for tests.

**Solution**:

1. Create a test database (optional but recommended):
   ```bash
   psql -U postgres -c "CREATE DATABASE promptalicious_test;"
   ```

2. Set TEST_DATABASE_URL in `.env`:
   ```env
   TEST_DATABASE_URL="postgresql://postgres:password@localhost:5432/promptalicious_test"
   ```

3. Run migrations on test database:
   ```bash
   DATABASE_URL=$TEST_DATABASE_URL pnpm --filter @promptalicious/backend db:migrate
   ```

---

### "Timeout of 5000ms exceeded" in tests

**Problem**: LLM API calls or database queries are slow/hanging.

**Solution**:

1. Increase test timeout in `vitest.config.ts`:
   ```typescript
   export default defineConfig({
     test: {
       testTimeout: 30000,  // 30 seconds
     },
   });
   ```

2. Mock slow external calls in tests:
   ```typescript
   vi.mock('./infrastructure/llm/vercel-ai-sdk', () => ({
     execute: vi.fn().mockResolvedValue({ /* mock response */ })
   }));
   ```

---

### "Test suite failed to run"

**Problem**: Vitest configuration or test file syntax error.

**Solution**:

1. Check for syntax errors in test files:
   ```bash
   pnpm typecheck
   ```

2. Verify vitest.config.ts is valid:
   ```bash
   pnpm --filter @promptalicious/backend test --reporter=verbose
   ```

3. Clear Vitest cache:
   ```bash
   rm -rf packages/*/node_modules/.vitest
   pnpm test
   ```

---

## Linting & Formatting Issues

### "Parsing error: Cannot find module"

**Problem**: ESLint can't resolve TypeScript paths or imports.

**Solution**:

1. Ensure `@promptalicious/shared-infra` is built:
   ```bash
   pnpm --filter @promptalicious/shared-infra build
   ```

2. Check ESLint is using the workspace config:
   ```bash
   # Each package should have eslint.config.js importing from shared-infra
   cat packages/backend/eslint.config.js
   ```

---

### "Prettier format check fails"

**Problem**: Files aren't formatted according to Prettier rules.

**Solution**:
```bash
# Auto-format all files
pnpm format

# Verify formatting
pnpm format:check
```

If some files still fail, check for `.prettierignore`:
```bash
cat .prettierignore
# Should include: node_modules, dist, build, coverage, etc.
```

---

## Runtime Issues

### "OpenAI API key is invalid"

**Problem**: API key is wrong, expired, or has insufficient credits.

**Solution**:

1. Verify your API key at https://platform.openai.com/api-keys

2. Check you have credits: https://platform.openai.com/usage

3. Update the key in Settings page or directly in database:
   ```sql
   SELECT * FROM configurations;
   UPDATE configurations SET api_key = 'your-new-key' WHERE id = 1;
   ```

---

### "Rate limit exceeded" errors

**Problem**: You've hit OpenAI's rate limits.

**Solution**:

1. Wait a few minutes before trying again

2. Check your usage and limits: https://platform.openai.com/account/limits

3. Consider upgrading your OpenAI tier if you need higher limits

---

### "Pricing data is stale (>7 days)"

**Problem**: Cached pricing data is old and exchange rates may be inaccurate.

**Solution**:

1. Restart the backend server to fetch fresh pricing:
   ```bash
   # Stop the dev server (Ctrl+C)
   pnpm dev
   ```

2. Or manually clear pricing cache:
   ```sql
   DELETE FROM pricing_data;
   DELETE FROM exchange_rates;
   ```
   Then restart the backend.

---

## Build Issues

### "Build failed: Unexpected token"

**Problem**: Syntax error in code or incompatible JavaScript features.

**Solution**:

1. Check the error message for the file and line number

2. Ensure you're using supported TypeScript/JavaScript features:
   ```bash
   # Check Node version (should be 20+)
   node --version
   
   # Check TypeScript version
   pnpm list typescript
   ```

3. Clear build cache:
   ```bash
   rm -rf packages/*/dist packages/*/.turbo
   pnpm build
   ```

---

### "Cannot find module after build"

**Problem**: Build output is missing or in wrong location.

**Solution**:

1. Check package.json build scripts:
   ```json
   {
     "scripts": {
       "build": "tsc -b"  // Should output to dist/
     }
   }
   ```

2. Verify dist/ folders exist after build:
   ```bash
   ls -la packages/*/dist/
   ```

3. Clean and rebuild:
   ```bash
   pnpm clean
   pnpm build
   ```

---

## Performance Issues

### Application is slow or unresponsive

**Problem**: Database queries are slow or LLM calls are timing out.

**Solution**:

1. Check database connection pool:
   ```typescript
   // In packages/backend/src/infrastructure/database/index.ts
   // Ensure connection pooling is configured
   ```

2. Monitor slow queries:
   ```sql
   -- Check PostgreSQL slow query log
   SHOW log_min_duration_statement;
   ```

3. Verify OpenAI API status: https://status.openai.com/

---

### High memory usage

**Problem**: Node.js process consuming too much memory.

**Solution**:

1. Restart the development server:
   ```bash
   # Stop (Ctrl+C) and restart
   pnpm dev
   ```

2. Check for memory leaks in code (look for unclosed database connections, event listeners, etc.)

3. Increase Node.js memory limit if needed:
   ```bash
   NODE_OPTIONS="--max-old-space-size=4096" pnpm dev
   ```

---

## Still Stuck?

If none of these solutions work:

1. **Check the logs**: Look at terminal output for detailed error messages

2. **Search existing issues**: https://github.com/zacbraddy/promptalicious/issues

3. **Ask for help**: Open a new issue with:
   - Clear description of the problem
   - Steps to reproduce
   - Error messages (full output)
   - Your environment (OS, Node version, PostgreSQL version)
   - What you've already tried

4. **Debug mode**: Set debug logging:
   ```bash
   NODE_ENV=development DEBUG=* pnpm dev
   ```

---

**Last Updated**: 2025-11-07
**Need to add something?** PRs welcome!
