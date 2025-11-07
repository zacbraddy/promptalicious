# Tasks: LLM Prompt Execution & Diagnostics Interface

**Feature**: 002-make-a-call
**Branch**: `002-make-a-call`
**Generated**: 2025-11-04
**Total Tasks**: 79
**Based On**: [plan.md](./plan.md), [data-model.md](./data-model.md), [contracts/api-contracts.yaml](./contracts/api-contracts.yaml), [quickstart.md](./quickstart.md)

---

## Task Execution Protocol

**CRITICAL - Read Before Starting**:

1. **Test-Driven Development (TDD)**: Tests MUST be written before implementation
   - RED phase: Write failing test
   - GREEN phase: Implement minimal code to pass
   - REFACTOR phase: Improve code quality
   - Git commits MUST show tests before implementation

2. **Parallel Execution**: Tasks marked [P] can run in parallel if working on different files
   - Example parallel command for T009-T011:
     ```
     Task: Implement contract test for GET /config endpoint (T009)
     Task: Implement contract test for PUT /config endpoint (T010)
     Task: Implement contract test for POST /config/test-connection endpoint (T011)
     ```

3. **Dolphin-Based Development**: Surface working software after logical groups
   - Each phase ends with surfacing instructions
   - Run tests, show working functionality
   - Do not proceed to next phase without validation

4. **Quality Gates**: All tasks must pass:
   ```bash
   pnpm typecheck  # Zero errors
   pnpm lint       # Zero errors/warnings
   pnpm format     # All files formatted
   pnpm test       # All passing
   ```

---

## Phase 1: Foundation (Database & Security)

**Goal**: Set up PostgreSQL schema, migrations, and ensure API keys cannot be committed

### T001 [P]: Database ORM research and selection
**File**: `specs/002-make-a-call/research.md` (update)
**Description**: Research DrizzleORM vs Prisma using Context7 for latest best practices, migration tooling, and TypeScript DX. Update research.md with final decision and rationale.
**Rationale**: plan.md preliminary recommendation is DrizzleORM, but needs validation via Context7 before proceeding
**Dependencies**: None
**Expected Outcome**: Updated research.md with Decision 7 confirmed, chosen ORM ready for T003

- [x] **Complete**

---

### T002: Verify and update .gitignore for database security
**File**: `.gitignore` (repository root)
**Description**: Verify .gitignore includes all database-related paths to prevent API key exposure via database commits:
- `.env`, `.env.*`, `.env.local`
- `postgres-data/`, `pgdata/`, any Docker volume mount directories
- `*.sql`, `*.dump`, `*.backup`
- Database connection files

**Rationale**: API keys are stored in PostgreSQL database (not .env) to avoid committing .env files with secrets. This is ONLY secure if database files cannot be committed.
**Security Note**: This is a CRITICAL security task per data-model.md "Security Considerations"
**Dependencies**: None
**Expected Outcome**: .gitignore updated, verified with `git status` that database directories are ignored

- [x] **Complete**

---

### T003: Create initial database schema migration
**Files**:
- `packages/backend/src/db/schema.ts` (DrizzleORM schema definitions)
- `packages/backend/drizzle/0001_initial_schema.sql` (generated migration)

**Description**: Create database schema for:
1. `llm_config` table (single-row pattern, id=1)
2. `pricing_info` table (model, provider, token prices)
3. `exchange_rates` table (USD→GBP conversion)

Schema details from data-model.md entities 4-6.

**Test**: None (schema definition task)
**Dependencies**: T001 (ORM selected)
**Expected Outcome**: Migration files created, ready to apply in T005

- [x] **Complete**

---

### T004: Database connection module with environment configuration
**Files**:
- `packages/backend/src/db/connection.ts`
- `packages/backend/.env.example` (document required environment variables)

**Description**: Create database connection module:
- Load connection string from environment variables
- Export database client instance
- Handle connection errors gracefully
- Log connection status on startup

**Test**: None (infrastructure setup)
**Dependencies**: T003
**Expected Outcome**: Database client available for import, connection string documented

- [x] **Complete**

---

### T005: Test database connectivity and migration application
**Files**:
- `packages/backend/src/db/migrate.ts` (migration runner)
- Manual test via command line

**Description**:
1. Apply migrations to local PostgreSQL instance
2. Verify tables created correctly
3. Document migration commands in README or package.json scripts

Commands to add:
```json
"db:migrate": "drizzle-kit push",
"db:status": "drizzle-kit introspect"
```

**Test**: Run migration, verify tables exist with `psql` or Drizzle Studio
**Dependencies**: T004
**Surfacing**: After T005, run `pnpm db:migrate` to apply schema, `pnpm db:status` to show tables created

- [x] **Complete**

---

## Phase 2: Backend Framework & Shared Types

**Goal**: Initialize backend API with TypeScript, routing, and shared type definitions

### T006: Backend API framework research and initialization
**Files**:
- `packages/backend/src/index.ts` (entry point)
- `packages/backend/src/app.ts` (Hono app setup)

**Description**:
1. Use Context7 to research Hono best practices for TypeScript
2. Initialize Hono server with:
   - Basic routing structure
   - CORS middleware
   - JSON body parsing
   - Error handling middleware
   - Health check endpoint (`GET /health`)

**Test**: Manual curl test to `/health` endpoint
**Dependencies**: None (can run parallel with Phase 1)
**Expected Outcome**: Backend server starts on port 3000, responds to health check

- [x] **Complete**

---

### T007: Create error handling middleware
**File**: `packages/backend/src/middleware/errorHandler.ts`
**Description**: Create centralized error handling middleware for Hono:
- Catch all unhandled errors
- Map errors to appropriate HTTP status codes
- Return consistent error response format (per api-contracts.yaml)
- Log errors with context

**Test**: Unit test for error handler (simulate thrown errors)
**Dependencies**: T006
**Expected Outcome**: All errors return consistent JSON format, no crashes

- [x] **Complete**

---

### T008: Create shared TypeScript types from data-model.md
**File**: `packages/shared-infra/src/types/api.ts`
**Description**: Create TypeScript interfaces matching data-model.md entities and api-contracts.yaml schemas:
- `ExecutionStatus`, `ErrorType` (enums)
- `PromptExecution`, `ExecutionResult`, `ExecutionError`
- `LLMConfiguration`, `PricingInformation`, `ExchangeRate`
- All API request/response types

**Test**: Types compile, exported from package index
**Dependencies**: None
**Surfacing**: After T008, backend server runs with health check, shared types available for import

- [x] **Complete**

---

## Phase 3: Configuration Management (Contract Tests First)

**Goal**: Implement LLM configuration CRUD with automatic credential validation

### T009 [P]: Write contract test for GET /config endpoint
**File**: `packages/backend/tests/contract/config-get.contract.test.ts`
**Description**: Write failing contract test asserting:
- GET /config returns 200 status
- Response matches `ConfigurationResponse` schema from api-contracts.yaml
- `apiKey` is NOT included in response (security check)
- `availableModels` array contains "gpt-4o-mini"

**Dependencies**: T008 (shared types)
**Expected Outcome**: Test FAILS (endpoint not implemented yet) - RED phase ✅

- [x] **Complete**

---

### T010 [P]: Write contract test for PUT /config endpoint
**File**: `packages/backend/tests/contract/config-put.contract.test.ts`
**Description**: Write failing contract test asserting:
- PUT /config with valid payload returns 200
- Response includes `validationResult.success: true`
- Invalid API key returns 400 with error details
- Empty request body returns 400

**Dependencies**: T008
**Expected Outcome**: Test FAILS - RED phase ✅

- [x] **Complete**

---

### T011 [P]: Write contract test for POST /config/test-connection endpoint
**File**: `packages/backend/tests/contract/config-test-connection.contract.test.ts`
**Description**: Write failing contract test asserting:
- POST /config/test-connection returns 200 on success
- Response matches `TestConnectionResponse` schema
- Failed connection returns 400 with error details

**Dependencies**: T008
**Expected Outcome**: Test FAILS - RED phase ✅

- [x] **Complete**

---

### T012: Implement configuration service (CRUD operations)
**File**: `packages/backend/src/services/configService.ts`
**Description**: Create configuration service with methods:
- `getConfig()`: Retrieve configuration (exclude `apiKey` from return)
- `updateConfig(data)`: Update configuration fields
- `testConnection(apiKey, model)`: Validate credentials via test LLM call

Use single-row table pattern (id=1), per data-model.md.

**Test**: Unit tests for each method (mock database)
**Dependencies**: T005 (database ready), T011 (tests written)
**Expected Outcome**: Service methods implemented, unit tests pass

- [x] **Complete**

---

### T013: Implement GET /config endpoint
**File**: `packages/backend/src/routes/config.ts`
**Description**: Implement GET /config route:
- Call `configService.getConfig()`
- Return configuration with `availableModels` list
- Ensure `apiKey` is excluded from response

**Test**: Contract test from T009 now PASSES - GREEN phase ✅
**Dependencies**: T012
**Expected Outcome**: GET /config returns valid configuration, T009 test passes

- [x] **Complete**

---

### T014: Implement PUT /config endpoint
**File**: `packages/backend/src/routes/config.ts`
**Description**: Implement PUT /config route:
- Validate request body (non-empty fields)
- If `apiKey` provided, call `testConnection()` to validate
- Only save if validation succeeds
- Return updated config + validation result

**Test**: Contract test from T010 now PASSES - GREEN phase ✅
**Dependencies**: T012
**Expected Outcome**: PUT /config validates and saves configuration, T010 test passes

- [x] **Complete**

---

### T015: Implement POST /config/test-connection endpoint
**File**: `packages/backend/src/routes/config.ts`
**Description**: Implement POST /config/test-connection route:
- Load current configuration from database
- Call `testConnection()` with current credentials
- Return success/failure result without saving

**Test**: Contract test from T011 now PASSES - GREEN phase ✅
**Dependencies**: T012
**Expected Outcome**: Test connection endpoint validates credentials, T011 test passes

- [x] **Complete**

---

### T016: Integration test for configuration persistence and validation flow
**File**: `packages/backend/tests/integration/config-flow.integration.test.ts`
**Description**: Write integration test covering full configuration workflow:
1. GET /config (initial state)
2. PUT /config with valid API key (automatic validation)
3. Verify configuration saved to database
4. POST /config/test-connection (manual test)
5. PUT /config with invalid key (validation fails, not saved)

Use real database (test instance or transactions for cleanup).

**Dependencies**: T015
**Surfacing**: After T016, use curl or Postman to manually test configuration endpoints, observe validation

- [x] **Complete**

---

## Phase 4: Pricing Data System (Contract Tests First)

**Goal**: Implement pricing lookup, caching, and staleness detection

### T017: Write contract test for GET /pricing endpoint
**File**: `packages/backend/tests/contract/pricing-get.contract.test.ts`
**Description**: Write failing contract test asserting:
- GET /pricing returns 200
- Response matches `PricingInfoResponse` schema
- Includes pricing data, exchange rate, staleness indicator
- `isStale` is boolean, `daysSinceUpdate` is number

**Dependencies**: T008
**Expected Outcome**: Test FAILS - RED phase ✅

- [x] **Complete**

---

### T018: Implement pricing lookup service (web scraping + fallback)
**File**: `packages/backend/src/services/pricingService.ts`
**Description**: Create pricing service with methods:
- `fetchPricingData()`: Scrape openai.com/api/pricing for GPT-4o-mini pricing
- Fallback to hardcoded constants if scraping fails
- Cache pricing in database with timestamp
- `getPricingData()`: Retrieve from cache, calculate staleness

Hardcoded fallback (per research.md):
- Input: $0.150 per 1M tokens
- Output: $0.600 per 1M tokens
- Comment: "// Fallback pricing - last verified 2025-11-04 from openai.com/api/pricing"

**Test**: Unit tests for fetch, cache, fallback logic (mock HTTP requests)
**Dependencies**: T005 (database ready)
**Expected Outcome**: Pricing service fetches and caches data, falls back gracefully

- [x] **Complete**

---

### T019: Implement exchange rate lookup service (Frankfurter API)
**File**: `packages/backend/src/services/exchangeRateService.ts`
**Description**: Create exchange rate service:
- `fetchExchangeRate()`: Call Frankfurter API for USD→GBP rate
  - API: `GET https://api.frankfurter.dev/v1/latest?base=USD&symbols=GBP`
- Cache rate in database with timestamp
- Fallback to cached rate if API unavailable
- `getExchangeRate()`: Retrieve from cache

**Test**: Unit tests for fetch, cache, fallback (mock API calls)
**Dependencies**: T005
**Expected Outcome**: Exchange rate service fetches USD→GBP rate, caches in database

- [x] **Complete**

---

### T020: Implement GET /pricing endpoint
**File**: `packages/backend/src/routes/pricing.ts`
**Description**: Implement GET /pricing route:
- Call `pricingService.getPricingData()` and `exchangeRateService.getExchangeRate()`
- Calculate staleness: `isStale = daysSinceUpdate > 7`
- Return combined response per api-contracts.yaml

**Test**: Contract test from T017 now PASSES - GREEN phase ✅
**Dependencies**: T018, T019
**Expected Outcome**: GET /pricing returns pricing data with staleness indicator, T017 test passes

- [x] **Complete**

---

### T021: Integration test for pricing cache initialization on backend startup
**File**: `packages/backend/tests/integration/pricing-startup.integration.test.ts`
**Description**: Write integration test simulating backend startup:
1. Clear pricing and exchange rate tables
2. Call pricing and exchange rate service initialization
3. Verify data fetched and cached
4. Simulate API failure, verify fallback to cached data

**Dependencies**: T020
**Expected Outcome**: Backend initializes pricing cache on startup, falls back gracefully

- [x] **Complete**

---

### T022: Integration test for staleness detection
**File**: `packages/backend/tests/integration/pricing-staleness.integration.test.ts`
**Description**: Write integration test for staleness logic:
1. Insert pricing data with `lastUpdated` = 10 days ago
2. GET /pricing
3. Assert `isStale: true`, `daysSinceUpdate: 10`
4. Update pricing data to current timestamp
5. GET /pricing
6. Assert `isStale: false`, `daysSinceUpdate: 0`

**Dependencies**: T020
**Surfacing**: After T022, restart backend and observe pricing fetched in logs, query `/pricing` endpoint with curl

- [x] **Complete**

---

## Phase 5: LLM Execution Core (Contract Tests First)

**Goal**: Implement prompt execution with Vercel AI SDK, full diagnostics, and error classification

### T023: Write contract test for POST /execute endpoint (success response)
**File**: `packages/backend/tests/contract/execute-success.contract.test.ts`
**Description**: Write failing contract test asserting:
- POST /execute with valid prompt returns 200
- Response matches `ExecutePromptSuccessResponse` schema
- Includes `execution` and `result` objects
- All diagnostic fields present (token counts, duration, cost)

**Dependencies**: T008
**Expected Outcome**: Test FAILS - RED phase ✅

- [x] **Complete**

---

### T024 [P]: Write contract tests for POST /execute endpoint (error responses)
**File**: `packages/backend/tests/contract/execute-errors.contract.test.ts`
**Description**: Write failing contract tests for all error scenarios:
- 400: Empty prompt (validation error)
- 401: Invalid API key (authentication error)
- 429: Rate limit exceeded
- 500: Network error
- 504: Timeout error

Each test asserts correct error type, message format per api-contracts.yaml.

**Dependencies**: T008
**Expected Outcome**: Tests FAIL - RED phase ✅

- [x] **Complete**

---

### T025: Implement LLM execution service using Vercel AI SDK
**File**: `packages/backend/src/services/llmService.ts`
**Description**: Create LLM execution service:
- `executePrompt(promptText, apiKey, model)`: Call Vercel AI SDK's `generateText()`
- Capture diagnostics: token counts, duration (measure with `Date.now()`)
- Return result with full metrics
- Throw typed errors for different failure modes

Use research.md Decision 1 for implementation details.

**Test**: Unit tests for execution logic (mock Vercel AI SDK)
**Dependencies**: T012 (config service for API key retrieval)
**Expected Outcome**: Service executes prompts, captures diagnostics

- [x] **Complete**

---

### T026: Implement cost calculation logic
**File**: `packages/backend/src/services/costCalculationService.ts`
**Description**: Create cost calculation service:
- `calculateCost(inputTokens, outputTokens, pricing, exchangeRate)`: Calculate cost in GBP
- Formula: `(inputTokens × inputPriceUSD + outputTokens × outputPriceUSD) × exchangeRate`
- Round to 2 decimal places

**Test**: Unit tests with known inputs/outputs
**Dependencies**: T019 (exchange rate service), T018 (pricing service)
**Expected Outcome**: Cost calculation accurate, unit tests pass

- [x] **Complete**

---

### T027: Implement error classification and handling
**File**: `packages/backend/src/services/errorClassificationService.ts`
**Description**: Create error classification service:
- Map Vercel AI SDK errors to error types (authentication, network, api_error, timeout, rate_limit)
- Map validation errors to `validation` type
- Default to `unknown` for unclassified errors
- Return structured `ExecutionError` object

**Test**: Unit tests for each error type mapping
**Dependencies**: None
**Expected Outcome**: All error types correctly classified

- [x] **Complete**

---

### T028: Implement POST /execute endpoint
**File**: `packages/backend/src/routes/execute.ts`
**Description**: Implement POST /execute route:
1. Validate prompt text (non-empty)
2. Load configuration (API key, model)
3. Create `PromptExecution` entity (status: pending → in_progress)
4. Call `llmService.executePrompt()`
5. On success:
   - Calculate cost with `costCalculationService`
   - Create `ExecutionResult` entity
   - Update status to `completed`
   - Return success response
6. On failure:
   - Classify error with `errorClassificationService`
   - Create `ExecutionError` entity
   - Update status to `failed`
   - Return error response with appropriate status code

**Test**: Contract tests from T023 and T024 now PASS - GREEN phase ✅
**Dependencies**: T025, T026, T027
**Expected Outcome**: POST /execute executes prompts successfully, all contract tests pass

- [x] **Complete**

---

### T029: Integration test for successful prompt execution with full diagnostics
**File**: `packages/backend/tests/integration/execute-success.integration.test.ts`
**Description**: Write integration test for successful execution:
1. Configure valid API key
2. POST /execute with test prompt
3. Assert response contains full diagnostics
4. Verify cost calculation is accurate
5. Check token counts are non-zero

Use real API call (or recorded fixture if API key not available in CI).

**Dependencies**: T028
**Expected Outcome**: Full execution flow validated, diagnostics accurate

- [x] **Complete**

---

### T030: Integration test for error scenarios (authentication, validation, network simulation)
**File**: `packages/backend/tests/integration/execute-errors.integration.test.ts`
**Description**: Write integration tests for error handling:
1. Empty prompt → 400 validation error
2. Invalid API key → 401 authentication error
3. Network failure simulation → 500 network error (mock HTTP failure)

**Dependencies**: T028
**Surfacing**: After T030, use curl to execute prompts, observe full response + diagnostics

- [x] **Complete**

---

## Phase 6: Frontend Setup & Styling

**Goal**: Initialize frontend with shadcn/ui, Tailwind dark theme, and base components

### T031: Initialize shadcn/ui in frontend package
**Files**:
- `packages/frontend/components.json` (shadcn config)
- `packages/frontend/src/components/ui/` (generated components)

**Description**: Run `npx shadcn@latest init` in frontend package:
- Choose TypeScript, React, Tailwind CSS
- Set up component directory structure
- Configure path aliases

**Test**: None (setup task)
**Dependencies**: None
**Expected Outcome**: shadcn/ui initialized, ready to add components

- [x] **Complete**

---

### T032: Configure Tailwind CSS with custom retrofuturistic dark theme colours
**File**: `packages/frontend/src/index.css`
**Description**: Configure Tailwind CSS v4 theme with custom colours per research.md Decision 3:
- Background: Muddy blacks (`oklch(0.04 0 0)` = #0a0a0a, `oklch(0.1 0 0)` = #1a1a1a)
- Foreground: Soft greys (`oklch(0.69 0 0)` = #b0b0b0, `oklch(0.4 0 0)` = #666666)
- Primary: Subdued cyan (`oklch(0.66 0.14 196)` = #00CED1)
- Accent: Subdued magenta (`oklch(0.68 0.16 320)` = #B565D8)
- Map to shadcn semantic tokens (primary, secondary, accent, muted, etc.)
- Define colours directly in `:root` CSS variables (Tailwind v4 inline config)
- **NO** `class="dark"` on HTML element needed (dark mode is the only mode)

**Test**: None (config task)
**Dependencies**: T031
**Expected Outcome**: Tailwind configured with custom dark theme as the core colour palette

- [x] **Complete**

---

### T033: Install required shadcn components
**Command**: Run in `packages/frontend/`:
```bash
npx shadcn@latest add card button textarea badge table alert
```

**Description**: Install shadcn components needed for UI:
- Card: Containers for prompt input and results
- Button: Execute button
- Textarea: Prompt input
- Badge: Status indicators
- Table: Diagnostic data display
- Alert: Error display

**Test**: None (installation task)
**Dependencies**: T031
**Expected Outcome**: All components installed in `src/components/ui/`

- [x] **Complete**

---

### T034: Create base layout component with dark theme applied
**File**: `packages/frontend/src/components/Layout.tsx`
**Description**: Create base layout component:
- Set background and text colours
- Include navigation/header (if applicable)
- Render children

**Test**: Visual inspection (Storybook or dev server)
**Dependencies**: T032, T033
**Expected Outcome**: Layout renders with dark theme applied

- [x] **Complete**

---

### T035: Integration test for theme application
**File**: `packages/frontend/tests/integration/theme.test.tsx`
**Description**: Write test verifying dark theme applies:
- Render Layout component
- Assert dark class is present
- Check computed background colour matches theme

Use Vitest + React Testing Library.

**Dependencies**: T034
**Surfacing**: After T035, run `pnpm dev` in frontend package, observe styled dark mode UI

- [x] **Complete**

---

## Phase 7: Settings Page (Frontend)

**Goal**: Implement settings UI for configuration management

### T036: Create settings page component structure
**File**: `packages/frontend/src/pages/SettingsPage.tsx`
**Description**: Create settings page skeleton:
- Page title
- Card container for settings form
- Import and use shadcn components (Card, Button)

**Test**: None (UI scaffold)
**Dependencies**: T034
**Expected Outcome**: Settings page renders empty form layout

- [x] **Complete**

---

### T037: Implement API client service for configuration endpoints
**File**: `packages/frontend/src/services/apiClient.ts`
**Description**: Create API client with methods:
- `getConfig()`: GET /config
- `updateConfig(data)`: PUT /config
- `testConnection()`: POST /config/test-connection

Use `fetch` or axios, handle errors, return typed responses.

**Test**: Unit tests with mocked fetch
**Dependencies**: T008 (shared types for request/response)
**Expected Outcome**: API client methods work, typed, tested

- [x] **Complete**

---

### T038: Implement settings form (model selection, API key input, endpoint input)
**File**: `packages/frontend/src/components/SettingsForm.tsx`
**Description**: Create settings form component:
- Model selection dropdown (only has one option available to make it so that we don't get unexpected requests make the dropdown default to this option and turn off the ability to clear the dropdown)
- API key input field (password type)
- Optional provider endpoint input field
- Save button
- Loading state indicator

**Test**: Unit test rendering, input changes
**Dependencies**: T033 (shadcn components)
**Expected Outcome**: Form renders, user can input API key

- [x] **Complete**

---

### T039: Implement automatic validation on save (FR-024)
**File**: `packages/frontend/src/components/SettingsForm.tsx` (update)
**Description**: Add save handler:
1. On Save click, show loading indicator
2. Call `apiClient.updateConfig()`
3. Display success message if validation passes
4. Display error message if validation fails
5. Keep form editable for correction

Use react-hook-form in combination with zod to perform validation functionality

**Test**: Integration test with mocked API client
**Dependencies**: T038, T037
**Expected Outcome**: Save triggers validation, user sees feedback

- [x] **Complete**

---

### T040: Implement manual "Test Connection" button (FR-024a)
**File**: `packages/frontend/src/components/SettingsForm.tsx` (update)
**Description**: Add "Test Connection" button:
1. On click, show loading indicator
2. Call `apiClient.testConnection()`
3. Display success/failure message
4. Does not save configuration

**Test**: Integration test
**Dependencies**: T039
**Expected Outcome**: Test connection validates independently, no save

- [x] **Complete**

---

### T041: Integration test for settings form save and validate configuration
**File**: `packages/frontend/tests/integration/settings-save.test.tsx`
**Description**: Write integration test covering:
1. Load settings page
2. Enter valid API key
3. Click Save
4. Assert loading state shown
f5. Assert success message displayed
6. Assert configuration persisted (verify via GET /config)

Use mocked backend responses.

**Dependencies**: T040
**Expected Outcome**: Settings form saves and validates configuration

- [x] **Complete**

---

### T042: Integration test for test connection button validates credentials independently
**File**: `packages/frontend/tests/integration/settings-test-connection.test.tsx`
**Description**: Write integration test:
1. Load settings page
2. Enter API key
3. Click "Test Connection" (without saving)
4. Assert validation runs
5. Assert result displayed
6. Verify configuration NOT saved (GET /config unchanged)

**Dependencies**: T041
**Surfacing**: After T042, navigate to `/settings`, save API key, test connection, observe validation

- [x] **Complete**

---

## Phase 8: Prompt Execution Page (Frontend)

**Goal**: Implement main prompt execution UI with diagnostics display

### T043: Create prompt execution page component structure
**File**: `packages/frontend/src/pages/ExecutePromptPage.tsx`
**Description**: Create page skeleton:
- Page title
- Card for prompt input
- Card for results/errors (conditionally rendered)

**Test**: None (UI scaffold)
**Dependencies**: T034
**Expected Outcome**: Execution page renders with empty cards

- [x] **Complete**

---

### T044: Implement API client service for /execute endpoint
**File**: `packages/frontend/src/services/apiClient.ts` (update)
**Description**: Add method to apiClient:
- `executePrompt(promptText)`: POST /execute
- Handle success and error responses
- Return typed result

**Test**: Unit tests with mocked fetch
**Dependencies**: T037
**Expected Outcome**: Execute API client method works, typed, tested

- [x] **Complete**

---

### T045: Implement prompt input area (Textarea with character count)
**File**: `packages/frontend/src/components/PromptInput.tsx`
**Description**: Create prompt input component:
- Textarea (shadcn Textarea component)
- Character count display
- Max length validation (50,000 characters per data-model.md)

**Test**: Unit test rendering, character count updates
**Dependencies**: T033
**Expected Outcome**: Prompt input renders, character count visible

- [x] **Complete**

---

### T046: Retrofit - Add execution state cache service to backend
**File**: `packages/backend/src/services/executionStateCacheService.ts`
**Description**: Create in-memory execution state cache service to track currently executing prompts:
- `setCurrentExecution(executionId, promptText, abortController)`: Store execution state
- `setExecutionResult(result)`: Store results when execution completes (keeps execution state)
- `getCurrentExecution()`: Retrieve current state/results or null
- `clearCache()`: Remove all execution data
- `abortCurrentExecution()`: Trigger abort signal
- Lifecycle: Execute clears cache → stores state → completion stores results → status retrieval clears cache

**Test**: Unit tests for cache operations
**Dependencies**: T044 (backend structure exists)
**Expected Outcome**: State cache service ready for execute endpoint integration

- [x] **Complete**

---

### T047: Retrofit - Update LLM service to support abort signals
**File**: `packages/backend/src/services/llmService.ts`
**Description**: Update existing LLM execution service to accept AbortSignal:
- Add `abortSignal` parameter to `executePrompt()`
- Pass signal to Vercel AI SDK's `generateText()` call
- Handle abort errors appropriately

**Test**: Unit test abort mid-execution (mock Vercel AI SDK)
**Dependencies**: T046
**Expected Outcome**: LLM service supports cancellation

- [x] **Complete**

---

### T048: Retrofit - Update error classification to handle aborts
**File**: `packages/backend/src/services/errorClassificationService.ts`
**Description**: Add abort error type to existing error classification service:
- Map abort errors to `aborted` error type
- Ensure abort errors return appropriate error structure

**Test**: Unit test for abort error classification
**Dependencies**: None (updates existing service)
**Expected Outcome**: Abort errors correctly classified

- [x] **Complete**

---

### T049: Retrofit - Update POST /execute to use state cache and support abort
**File**: `packages/backend/src/routes/execute.ts`
**Description**: Update existing POST /execute endpoint:
- Clear any existing cache at start
- Check for in-progress execution (return 409 if found)
- Create AbortController and store in cache before calling LLM service
- Pass abort signal to LLM service
- On completion (success or error), store results in cache instead of clearing
- Handle abort errors appropriately

**Test**: Existing contract tests still pass, new test for 409 on concurrent execution
**Dependencies**: T046, T047, T048
**Expected Outcome**: Execute endpoint manages state cache, prevents concurrent execution

- [x] **Complete**

---

### T050: Retrofit - Add GET /execute/status endpoint
**File**: `packages/backend/src/routes/execute.ts`
**Description**: Create new GET /execute/status endpoint:
- Return `isExecuting: true` with prompt details if execution in progress
- Return `isExecuting: false` with results if execution completed
- Clear cache after returning completed results
- Return `isExecuting: false` with null if no execution

**Test**: Contract test for status endpoint (various states)
**Dependencies**: T046
**Expected Outcome**: Status endpoint returns execution state, clears cache after returning results

- [x] **Complete**

---

### T051: Retrofit - Add POST /execute/abort endpoint
**File**: `packages/backend/src/routes/execute.ts`
**Description**: Create new POST /execute/abort endpoint:
- Call `executionStateCacheService.abortCurrentExecution()`
- Return success if execution was aborted
- Return 400 if no execution in progress
- Abort errors get stored in cache like other errors

**Test**: Contract test for abort endpoint (success and no-execution scenarios)
**Dependencies**: T046
**Expected Outcome**: Abort endpoint cancels execution, stores abort result

- [x] **Complete**

---

### T052: Retrofit - Integration test for backend execution lifecycle
**File**: `packages/backend/tests/integration/execute-lifecycle.integration.test.ts`
**Description**: Write integration test covering full lifecycle:
1. POST /execute (execution starts)
2. GET /execute/status (in progress)
3. Attempt another POST /execute (409 error)
4. Wait for completion
5. GET /execute/status (returns results, clears cache)
6. GET /execute/status again (no results, cache cleared)
7. POST /execute again (new execution starts successfully)

**Test**: Full backend lifecycle validated
**Dependencies**: T049, T050, T051
**Expected Outcome**: Backend state management works end-to-end

- [x] **Complete**

---

### T053: Retrofit - Integration test for abort functionality
**File**: `packages/backend/tests/integration/execute-abort.integration.test.ts`
**Description**: Write integration test for abort:
1. POST /execute (execution starts)
2. POST /execute/abort (aborts execution)
3. GET /execute/status (returns abort error)
4. GET /execute/status again (cache cleared)
5. POST /execute/abort with no execution (400 error)

**Test**: Abort flow validated
**Dependencies**: T049, T050, T051
**Expected Outcome**: Abort successfully cancels and stores error

**Surfacing**: After T053, backend supports abort/status. Use curl to test: execute, check status, abort mid-flight, verify state management

- [x] **Complete**

---

### T054: Implement Execute and Cancel buttons
**File**: `packages/frontend/src/components/ExecuteControls.tsx`
**Description**: Create execute controls component with two buttons:
- Execute button: Disabled when prompt is empty (FR-003) or when execution in progress
- Cancel button: Only enabled during execution (FR-004a), disabled otherwise
- Loading indicator shown during execution
- Execute button calls execute handler, Cancel button calls abort handler

**Test**: Unit test for both buttons (enabled/disabled states)
**Dependencies**: T033
**Expected Outcome**: Two separate buttons with correct enabled/disabled logic, no double-click cancel issue

- [x] **Complete**

---

### T055: Implement response display card (full text, scrollable)
**File**: `packages/frontend/src/components/ResponseDisplay.tsx`
**Description**: Create response display component:
- Display full response text (FR-006)
- Scrollable container if response is long
- Formatted text rendering (preserve line breaks)

**Test**: Unit test rendering with long text
**Dependencies**: T033
**Expected Outcome**: Response displays in full, scrollable

- [x] **Complete**

---

### T056: Implement diagnostics display (tabular format)
**File**: `packages/frontend/src/components/DiagnosticsDisplay.tsx`
**Description**: Create diagnostics table component:
- Display input tokens, output tokens, total tokens
- Display execution duration (ms)
- Display estimated cost (GBP)
- Use shadcn Table component integrated with Tanstack Table functionality
- No status indicators/thresholds per FR-032a (raw data only)

**Test**: Unit test rendering with sample diagnostics
**Dependencies**: T033
**Expected Outcome**: Diagnostics displayed in clear table format

- [x] **Complete**

---

### T057: Implement error display with error type classification
**File**: `packages/frontend/src/components/ErrorDisplay.tsx`
**Description**: Create error display component:
- Display error type (authentication, network, etc.) per FR-017
- Display error message per FR-016
- Display additional context if available
- Use shadcn Alert component
- Actionable guidance (link to settings for auth errors)

**Test**: Unit test rendering different error types
**Dependencies**: T033
**Expected Outcome**: Errors display with clear type and actionable message

- [x] **Complete**

---

### T058: Integrate all components in ExecutePromptPage with state management
**File**: `packages/frontend/src/pages/ExecutePromptPage.tsx` (update)
**Description**: Wire up components with React state:
- useState for prompt text, isExecuting, result, error
- Execute handler calls apiClient.executePrompt()
- Update state on success/error
- Conditionally render ResponseDisplay or ErrorDisplay

**Test**: Integration test for full page interaction
**Dependencies**: T054-T057
**Expected Outcome**: Page functional, can execute prompts

- [x] **Complete**

---

### T059: Update API client to include status and abort endpoints
**File**: `packages/frontend/src/services/apiClient.ts` (update)
**Description**: Add new methods to existing apiClient:
- `getExecutionStatus()`: GET /execute/status
- `abortExecution()`: POST /execute/abort
- Keep existing `executePrompt()` method

**Test**: Unit tests with mocked fetch for new methods
**Dependencies**: T044 (API client exists)
**Expected Outcome**: API client supports status and abort endpoints

- [x] **Complete**

---

### T060: Add execution status polling hook
**File**: `packages/frontend/src/hooks/useExecutionStatus.ts`
**Description**: Create custom React hook for status polling:
- On mount, check GET /execute/status
- If execution in progress, restore UI state (prompt, loading)
- Poll every 2 seconds until execution completes, make sure polling is stopped when the hook the dismounts to avoid execution leaks.
- Update UI when complete, stop polling

**Test**: Unit test for polling logic (mock API, test intervals)
**Dependencies**: T059
**Expected Outcome**: Hook handles page refresh recovery via polling

- [x] **Complete**

---

### T061: Update ExecutePromptPage to support abort and polling
**File**: `packages/frontend/src/pages/ExecutePromptPage.tsx` (update)
**Description**: Update existing page to add abort/polling:
- Integrate useExecutionStatus hook
- Add abort handler that calls apiClient.abortExecution()
- Pass isExecuting state to Execute/Cancel button
- Handle abort errors in error display

**Test**: Integration test for cancel and refresh scenarios
**Dependencies**: T058, T059, T060
**Expected Outcome**: Page supports cancel and recovers from refresh

- [x] **Complete**

---

### T062: Integration test for cancel execution
**File**: `packages/frontend/tests/integration/execute-cancel.test.tsx`
**Description**: Write integration test:
1. Enter prompt and execute
2. Click Cancel button (mock slow response)
3. Mock successful abort
4. Assert UI returns to ready state
5. Can execute new prompt

**Dependencies**: T061
**Expected Outcome**: Cancel flow validated

- [ ] **Complete**

---

### T063: Integration test for page refresh recovery
**File**: `packages/frontend/tests/integration/execute-refresh.test.tsx`
**Description**: Write integration test:
1. Mock execution in progress from status endpoint
2. Mount page (simulates refresh)
3. Assert loading state restored
4. Mock polling → completion
5. Assert results displayed

**Dependencies**: T061
**Expected Outcome**: Refresh recovery validated

**Surfacing**: After T063, full abort/cancel/refresh functionality complete. Test end-to-end: execute, cancel, refresh during execution

- [ ] **Complete**

---

### T064: Integration test for successful execution flow (prompt → execute → see results)
**File**: `packages/frontend/tests/integration/execute-success.test.tsx`
**Description**: Write integration test:
1. Render ExecutePromptPage
2. Enter prompt text
3. Click Execute button
4. Mock API response (success)
5. Assert loading state shown
6. Assert response displayed
7. Assert diagnostics displayed

**Dependencies**: T061
**Expected Outcome**: Full execution flow validated in test

- [ ] **Complete**

---

### T065: Integration test for iterative refinement (prompt preserved, new execution replaces result)
**File**: `packages/frontend/tests/integration/execute-iteration.test.tsx`
**Description**: Write integration test:
1. Execute prompt (mock success response)
2. Verify result displayed
3. Modify prompt text
4. Execute again
5. Verify new result replaces old (FR-033)
6. Verify prompt text preserved (FR-001a)

**Dependencies**: T064
**Surfacing**: After T065, Phase 8 complete - full prompt execution UI with abort/cancel/refresh functionality working

- [ ] **Complete**

---

## Phase 9: Pricing Display & Staleness Warning

**Goal**: Display pricing information and warn when data is stale

### T066: Create pricing info component (displays current pricing data)
**File**: `packages/frontend/src/components/PricingInfo.tsx`
**Description**: Create pricing info component:
- Display model, provider, input/output token prices
- Display exchange rate (USD→GBP)
- Display last updated timestamp
- Use Card component for layout

**Test**: Unit test rendering with sample pricing data
**Dependencies**: T033
**Expected Outcome**: Pricing info renders clearly

- [ ] **Complete**

---

### T067: Implement staleness warning display (>7 days, FR-028)
**File**: `packages/frontend/src/components/PricingInfo.tsx` (update)
**Description**: Add staleness warning:
- Check `isStale` flag from API response
- Display warning Alert if pricing is stale
- Show days since update

**Test**: Unit test with stale pricing data
**Dependencies**: T053
**Expected Outcome**: Staleness warning displays when pricing is old

- [ ] **Complete**

---

### T068: Integration test for pricing display shows current data
**File**: `packages/frontend/tests/integration/pricing-display.test.tsx`
**Description**: Write integration test:
1. Fetch pricing data (mock API response)
2. Render PricingInfo component
3. Assert pricing values displayed correctly
4. Assert no staleness warning when fresh

**Dependencies**: T054
**Expected Outcome**: Pricing display validated

- [ ] **Complete**

---

### T069: Integration test for staleness warning appears when pricing is old
**File**: `packages/frontend/tests/integration/pricing-staleness.test.tsx`
**Description**: Write integration test:
1. Mock API response with stale pricing (isStale: true, daysSinceUpdate: 10)
2. Render PricingInfo component
3. Assert staleness warning displayed
4. Assert warning message mentions "10 days"

**Dependencies**: T055
**Surfacing**: After T056, view pricing info, manually set old timestamp in DB, verify warning displays

- [ ] **Complete**

---

## Phase 10: Edge Cases & Polish

**Goal**: Handle edge cases, validate all error scenarios, run full quickstart

### T070: Implement empty prompt validation (client-side and/or server-side)
**File**: `packages/frontend/src/components/PromptInput.tsx` (update)
**Description**: Add validation logic:
- Disable Execute button if prompt is empty or whitespace-only
- Optionally show validation message

**Test**: Unit test for empty prompt handling
**Dependencies**: T046
**Expected Outcome**: Empty prompts rejected gracefully

- [ ] **Complete**

---

### T071: Test special characters in prompts (ensure no corruption)
**File**: `packages/backend/tests/integration/execute-special-chars.integration.test.ts`
**Description**: Write integration test:
- Execute prompt with special characters: `\n`, `\t`, `&&`, `||`, `>=`, etc.
- Verify prompt transmitted without corruption
- Verify response displays correctly

**Dependencies**: T030
**Expected Outcome**: Special characters handled correctly

- [ ] **Complete**

---

### T072: Test all error types display correctly (authentication, network, rate_limit, etc.)
**File**: `packages/frontend/tests/integration/error-display.test.tsx`
**Description**: Write integration test:
- Mock each error type from api-contracts.yaml
- Render ErrorDisplay component for each
- Assert error type and message displayed correctly

**Dependencies**: T049
**Expected Outcome**: All error types render with correct classification

- [ ] **Complete**

---

### T073: Integration test for empty prompt rejection
**File**: `packages/frontend/tests/integration/empty-prompt.test.tsx`
**Description**: Write integration test:
1. Render ExecutePromptPage
2. Leave prompt empty
3. Attempt to click Execute
4. Assert button is disabled OR error message shown

**Dependencies**: T057
**Expected Outcome**: Empty prompts rejected gracefully

- [ ] **Complete**

---

### T074: Integration test for special characters handled correctly
**File**: `packages/frontend/tests/integration/special-chars.test.tsx`
**Description**: Write integration test:
1. Enter prompt with special characters
2. Execute
3. Mock successful response
4. Assert response displays correctly

**Dependencies**: T058
**Expected Outcome**: Special characters handled correctly in frontend

- [ ] **Complete**

---

**Cancelled by Zac: We can't automate this without writing an API into the codebase so I'll just have to do this manually.*
### T075: E2E test covering full quickstart scenarios 1-10
**File**: `packages/backend/tests/e2e/quickstart.e2e.test.ts`
**Description**: Write end-to-end test covering major scenarios from quickstart.md:
1. Configure API key
2. Execute prompt successfully
3. Iterate on prompt
4. Handle authentication error
5. Handle network error
6. View pricing info
7. Detect staleness
8. Reject empty prompt
9. Handle special characters

Use real backend + frontend (or comprehensive mocks).

**Dependencies**: T061
**Surfacing**: After T062, manually run full quickstart guide to validate all scenarios

- [ ] **Complete**

---

## Phase 11: Quality & Documentation

**Goal**: Pass all quality gates, document feature completion, increment version

### T076: Run quality gates and fix all issues (typecheck, lint, format)
**Commands**:
```bash
pnpm typecheck  # Fix all type errors
pnpm lint       # Fix all linting issues
pnpm format     # Format all files
pnpm test       # Ensure all tests pass
```

**Description**: Run all quality checks, fix issues until zero errors
**Dependencies**: T062
**Expected Outcome**: All quality gates pass

- [ ] **Complete**

---

### T077: Review test coverage and add unit tests for complex logic
**Files**: Various (unit tests for costCalculationService, errorClassificationService, etc.)
**Description**:
- Review test coverage report
- Add unit tests for complex business logic:
  - Cost calculation edge cases
  - Error classification mappings
  - Staleness calculation
- Target: >80% coverage for services

**Test**: Coverage report shows >80%
**Dependencies**: T063
**Expected Outcome**: High test coverage for critical logic

- [ ] **Complete**

---

### T078: Update CLAUDE.md with feature completion notes
**File**: `CLAUDE.md`
**Description**: Update project CLAUDE.md:
- Add to "Recent Changes" section
- Update "Active Spec Progress" to mark 002-make-a-call complete
- Document any deviations or learnings from implementation

**Dependencies**: T064
**Expected Outcome**: CLAUDE.md updated with completion notes

- [ ] **Complete**

---

### T079: Increment version to 0.2.0 in package.json
**Files**: `package.json` (root and packages)
**Description**: Update version number:
- Root: 0.1.0 → 0.2.0
- Packages: Update @promptalicious/* packages to 0.2.0

**Dependencies**: T065
**Surfacing**: After T066, all quality gates pass, feature is production-ready ✅

- [ ] **Complete**

---

## Task Summary

| Phase | Task Range | Description | Parallel? |
|-------|------------|-------------|-----------|
| 1. Foundation | T001-T005 | Database setup, migrations, security | T001 can run parallel with Phase 2 |
| 2. Backend Framework | T006-T008 | API framework, error handling, shared types | Can run parallel with Phase 1 |
| 3. Configuration Management | T009-T016 | Config endpoints (contract tests first) | T009-T011 parallel |
| 4. Pricing System | T017-T022 | Pricing lookup, caching, staleness | - |
| 5. LLM Execution Core | T023-T030 | Prompt execution with diagnostics | T023-T024 parallel |
| 6. Frontend Setup | T031-T035 | shadcn/ui, Tailwind theme | - |
| 7. Settings Page | T036-T042 | Configuration UI | - |
| 8. Execution Page | T043-T065 | Prompt execution UI + retrofit (abort/cancel/refresh) | Backend retrofit: T046-T053, Frontend retrofit: T054, T059-T063 |
| 9. Pricing Display | T066-T069 | Pricing info with staleness warning | - |
| 10. Edge Cases | T070-T075 | Validation, error handling, E2E | - |
| 11. Quality & Docs | T076-T079 | Quality gates, coverage, version bump | - |

---

## Parallel Execution Examples

**Run these tasks in parallel**:

```bash
# Phase 1 + Phase 2 (different domains)
Task: Research DrizzleORM vs Prisma (T001)
Task: Initialize Hono backend framework (T006)

# Phase 3 contract tests (different files)
Task: Write GET /config contract test (T009)
Task: Write PUT /config contract test (T010)
Task: Write POST /config/test-connection contract test (T011)

# Phase 5 contract tests (different files)
Task: Write POST /execute success contract test (T023)
Task: Write POST /execute error contract tests (T024)
```

---

## Critical Security Notes

1. **T002 is MANDATORY** before any API key configuration: Verify .gitignore prevents database commits
2. **API keys stored in database**, not .env files, to avoid accidental commits
3. **All database-related paths must be git-ignored**: data directories, dumps, backups

---

## Constitution Compliance Checklist

- [x] TDD enforced: Tests written before implementation (RED-GREEN-REFACTOR)
- [x] Git commits show tests first: Contract tests → implementation tasks
- [x] Dolphin-Based Development: Surfacing after each logical phase (11 phases)
- [x] Quality gates: typecheck, lint, format, test (T063)
- [x] Real dependencies: Real PostgreSQL, real LLM calls (or fixtures)
- [x] Observability: All errors surfaced, structured logging in backend
- [x] Versioning: Increment to 0.2.0 after completion (T066)

---

**Generated by**: /tasks command
**Ready for implementation**: ✅
**Next step**: Begin Phase 1, Task T001
