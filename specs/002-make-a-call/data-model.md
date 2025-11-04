# Data Model: LLM Prompt Execution & Diagnostics Interface

**Date**: 2025-11-04
**Feature**: 002-make-a-call

## Entity Definitions

This document defines the domain entities, their attributes, relationships, validation rules, and state transitions.

---

## 1. Prompt Execution

**Description**: Represents a single attempt to send a system prompt to an LLM and receive a response.

**Attributes**:
- `id` (UUID, required): Unique identifier for the execution
- `promptText` (string, required): The system prompt text submitted by the user
- `executionTimestamp` (DateTime, required): When the execution was initiated (ISO 8601)
- `status` (enum, required): Current state of the execution
  - Values: `pending`, `in_progress`, `completed`, `failed`
- `targetModel` (string, required): LLM model identifier (e.g., "gpt-4o-mini")

**Validation Rules**:
- `promptText`: Must not be empty, max length 50,000 characters (reasonable prompt limit)
- `targetModel`: Must match a configured model in `LLM Configuration`
- `executionTimestamp`: Must not be in the future

**State Transitions**:
```
pending → in_progress → completed
pending → in_progress → failed
```

**Relationships**:
- Has zero or one `Execution Result` (one-to-one)
- Has zero or one `Execution Error` (one-to-one)
- References one `LLM Configuration` (many-to-one, via `targetModel`)

**Notes**:
- For this iteration (FR-033), only the most recent execution is displayed
- Future specs will add execution history and persistence

---

## 2. Execution Result

**Description**: The successful outcome of a prompt execution, including response text and diagnostic metrics.

**Attributes**:
- `id` (UUID, required): Unique identifier for the result
- `promptExecutionId` (UUID, required): Foreign key to associated `Prompt Execution`
- `responseText` (string, required): The LLM's complete response
- `inputTokenCount` (integer, required): Number of tokens in the prompt
- `outputTokenCount` (integer, required): Number of tokens in the response
- `totalTokenCount` (integer, required): Sum of input and output tokens
- `executionDurationMs` (integer, required): Time taken for the LLM call in milliseconds
- `estimatedCostGBP` (decimal, required): Calculated cost in British pounds (precision: 2 decimal places)

**Validation Rules**:
- `inputTokenCount`: Must be > 0
- `outputTokenCount`: Must be >= 0 (empty responses possible but rare)
- `totalTokenCount`: Must equal `inputTokenCount + outputTokenCount`
- `executionDurationMs`: Must be > 0
- `estimatedCostGBP`: Must be >= 0, max precision 2 decimal places

**Calculation Rules**:
- `totalTokenCount = inputTokenCount + outputTokenCount`
- `estimatedCostGBP = (inputTokenCount × inputTokenPriceGBP) + (outputTokenCount × outputTokenPriceGBP)`
  - Pricing data sourced from `Pricing Information` entity

**Relationships**:
- Belongs to one `Prompt Execution` (one-to-one)

**Notes**:
- Token counts and duration provided by Vercel AI SDK
- Cost calculation performed backend-side using cached pricing data

---

## 3. Execution Error

**Description**: Details of a failure during prompt execution, providing debugging context.

**Attributes**:
- `id` (UUID, required): Unique identifier for the error
- `promptExecutionId` (UUID, required): Foreign key to associated `Prompt Execution`
- `errorType` (enum, required): Classification of error
  - Values: `authentication`, `network`, `api_error`, `timeout`, `rate_limit`, `validation`, `unknown`
- `errorCode` (string, optional): Provider-specific error code (e.g., "insufficient_quota")
- `errorMessage` (string, required): Human-readable error description
- `stackTrace` (text, optional): Technical stack trace for debugging (backend errors only)
- `additionalContext` (JSON, optional): Structured error context (e.g., response status, headers)
- `timestamp` (DateTime, required): When the error occurred (ISO 8601)

**Validation Rules**:
- `errorMessage`: Must not be empty, max length 5,000 characters
- `errorType`: Must be one of the defined enum values
- `timestamp`: Must not be in the future

**Error Type Mappings** (from FR-017):
- `authentication`: Invalid or missing API credentials
- `network`: Connection failures, DNS errors
- `api_error`: LLM provider errors (invalid model, bad request, etc.)
- `timeout`: Request exceeded time limit
- `rate_limit`: API quota or rate limit exceeded
- `validation`: Client-side validation failures (should be rare)
- `unknown`: Uncategorised errors (log for future classification)

**Relationships**:
- Belongs to one `Prompt Execution` (one-to-one)

**Notes**:
- All errors surfaced to UI with actionable context (FR-016, FR-019)
- Stack traces only included for backend errors, not surfaced to user
- Visibility principle: Errors remain visible until user takes action (FR-018)

---

## 4. LLM Configuration

**Description**: System-wide settings for connecting to and using an LLM provider (single-user, single configuration).

**Attributes**:
- `id` (integer, fixed=1): Primary key, always 1 (single-row table)
- `selectedModel` (string, required): Currently selected model identifier
  - Initial value: "gpt-4o-mini"
- `apiKey` (string, required): API credentials for the provider (stored in plain text)
- `providerEndpoint` (string, optional): Custom endpoint URL (default uses Vercel AI SDK defaults)
- `createdAt` (DateTime, required): When configuration was first created
- `updatedAt` (DateTime, required): When configuration was last modified

**Validation Rules**:
- `id`: Must always be 1 (enforced via database constraint)
- `selectedModel`: Must match a model in the hardcoded available models list ("gpt-4o-mini" initially per FR-020)
- `apiKey`: Must not be empty
- `providerEndpoint`: If provided, must be valid URL format

**Security Considerations**:
- `apiKey` stored in plain text in local PostgreSQL database (acceptable for local development tool)
- **Why database storage instead of .env**: Prevents accidental commit of .env files containing API keys
- **Critical**: This approach is ONLY secure if database files themselves cannot be committed
- **Required .gitignore entries**:
  - `.env` and `.env.*` files (database connection strings)
  - PostgreSQL data directories (e.g., `postgres-data/`, Docker volume mounts)
  - Database dumps and backups (e.g., `*.sql`, `*.dump`)
- Database credentials and connection string secured via environment variables (never committed to repository)
- FR-023 requirement (prevent exposure in version control) satisfied via comprehensive git ignore patterns

**Configuration Validation** (FR-024):
- On save: Automatically attempt test call to validate credentials
- Provide user feedback during validation
- Manual "Test Connection" option available in settings (FR-024a)

**Relationships**:
- Referenced by `Prompt Execution` entities (via `targetModel`)

**Notes**:
- Single-row table pattern enforced via database constraint: `CHECK (id = 1)`
- Future specs may expand to support multiple configurations or profiles

---

## 5. Pricing Information

**Description**: Cached pricing data for LLM token usage, enabling cost estimation.

**Attributes**:
- `id` (serial, auto-increment): Primary key
- `model` (string, required): Model identifier (e.g., "gpt-4o-mini")
- `provider` (string, required): Provider name (e.g., "openai")
- `inputTokenPriceUSD` (decimal, required): Cost per input token in USD (high precision: 10 decimal places)
- `outputTokenPriceUSD` (decimal, required): Cost per output token in USD (high precision: 10 decimal places)
- `lastUpdated` (DateTime, required): When pricing data was last fetched

**Validation Rules**:
- `inputTokenPriceUSD`: Must be > 0
- `outputTokenPriceUSD`: Must be > 0
- Unique constraint on (`model`, `provider`) combination
- `lastUpdated`: Must not be in the future

**Staleness Detection** (FR-028):
- Pricing data considered stale if `lastUpdated > 7 days ago`
- UI displays warning when pricing is stale
- Backend logs warning on startup if pricing lookup fails

**Relationships**:
- Referenced by `Execution Result` for cost calculations

**Notes**:
- Populated on backend startup via live API lookup (FR-025)
- Falls back to last cached value if live lookup fails (FR-025b)
- Hardcoded fallback values documented in code for GPT-4o-mini

---

## 6. Exchange Rate

**Description**: Currency conversion rates for displaying costs in GBP (per FR-027).

**Attributes**:
- `id` (serial, auto-increment): Primary key
- `fromCurrency` (string, required): Source currency code (default: "USD")
- `toCurrency` (string, required): Target currency code (default: "GBP")
- `rate` (decimal, required): Conversion rate (precision: 6 decimal places)
- `lastUpdated` (DateTime, required): When rate was last fetched

**Validation Rules**:
- `fromCurrency`, `toCurrency`: Must be valid ISO 4217 currency codes (3 characters)
- `rate`: Must be > 0
- Unique constraint on (`fromCurrency`, `toCurrency`) combination
- `lastUpdated`: Must not be in the future

**Relationships**:
- Used by cost calculation logic in `Execution Result`

**Notes**:
- Populated on backend startup via exchange rate API lookup
- Fallback strategy identical to `Pricing Information`
- For this iteration, only USD→GBP conversion needed

---

## Entity Relationship Diagram (ERD)

```
┌─────────────────────────────┐
│    LLM Configuration        │
│  (Single-row table: id=1)   │
│─────────────────────────────│
│ id (PK, fixed=1)            │
│ selectedModel               │
│ apiKey                      │
│ providerEndpoint            │
│ createdAt                   │
│ updatedAt                   │
└──────────────┬──────────────┘
               │ referenced by
               │ (targetModel)
               ▼
┌─────────────────────────────┐
│     Prompt Execution        │
│─────────────────────────────│
│ id (PK)                     │
│ promptText                  │
│ executionTimestamp          │
│ status (enum)               │
│ targetModel                 │
└──────────┬──────────────────┘
           │
           ├─────────────┬────────────────┐
           │ (1:1)       │ (1:1)          │
           ▼             ▼                │
┌──────────────────┐ ┌──────────────────┐│
│ Execution Result │ │ Execution Error  ││
│──────────────────│ │──────────────────││
│ id (PK)          │ │ id (PK)          ││
│ promptExecutionId│ │ promptExecutionId││
│  (FK)            │ │  (FK)            ││
│ responseText     │ │ errorType (enum) ││
│ inputTokenCount  │ │ errorCode        ││
│ outputTokenCount │ │ errorMessage     ││
│ totalTokenCount  │ │ stackTrace       ││
│ executionDuration│ │ additionalContext││
│ estimatedCostGBP │ │ timestamp        ││
└──────────────────┘ └──────────────────┘
           │
           │ uses pricing from
           ▼
┌─────────────────────────────┐
│     Pricing Information     │
│─────────────────────────────│
│ id (PK)                     │
│ model                       │
│ provider                    │
│ inputTokenPriceUSD          │
│ outputTokenPriceUSD         │
│ lastUpdated                 │
│ UNIQUE(model, provider)     │
└──────────────┬──────────────┘
               │
               │ uses exchange rate
               ▼
┌─────────────────────────────┐
│      Exchange Rate          │
│─────────────────────────────│
│ id (PK)                     │
│ fromCurrency (USD)          │
│ toCurrency (GBP)            │
│ rate                        │
│ lastUpdated                 │
│ UNIQUE(from, to)            │
└─────────────────────────────┘
```

---

## Data Flow

### Prompt Execution Flow

1. **User Input**: User enters prompt text in frontend
2. **Validation**: Frontend validates non-empty prompt
3. **Create Execution**: Backend creates `Prompt Execution` entity with `status='pending'`
4. **Update Status**: Change status to `in_progress`
5. **LLM Call**: Backend calls Vercel AI SDK with prompt and `LLM Configuration.apiKey`
6. **Success Path**:
   - Create `Execution Result` with response and diagnostics
   - Calculate cost using `Pricing Information` and `Exchange Rate`
   - Update `Prompt Execution` status to `completed`
7. **Failure Path**:
   - Create `Execution Error` with error details
   - Update `Prompt Execution` status to `failed`
8. **Response**: Return execution, result/error to frontend
9. **Display**: Frontend shows result or error with full diagnostic visibility

### Cost Calculation Flow

1. Load `Pricing Information` for `targetModel`
2. Load `Exchange Rate` for USD→GBP
3. Calculate input cost: `inputTokenCount × inputTokenPriceUSD × exchangeRate`
4. Calculate output cost: `outputTokenCount × outputTokenPriceUSD × exchangeRate`
5. Sum to get `estimatedCostGBP`
6. Round to 2 decimal places for display

### Configuration Update Flow

1. User updates model or API key in settings
2. Backend triggers validation test call (FR-024)
3. Display loading indicator during validation
4. Success: Save encrypted configuration to database, show success message
5. Failure: Display error details, don't save, allow user to correct

---

## Storage Considerations

### Persistence Strategy (for this iteration)

Per spec requirement FR-033, this iteration focuses on **display-only** for the most recent execution:

- **NOT persisted to database**: `Prompt Execution`, `Execution Result`, `Execution Error`
  - These exist in backend memory and frontend state only
  - Cleared on backend restart
  - Future spec will add execution history and database persistence

- **Persisted to database**: `LLM Configuration`, `Pricing Information`, `Exchange Rate`
  - These require persistence across sessions
  - Database schema created via migrations

### Future Expansion (deferred to future specs)

When execution history is added:
- Migrate `Prompt Execution`, `Execution Result`, `Execution Error` to database tables
- Add filtering, pagination, search capabilities
- Consider data retention policies (delete old executions)

---

## TypeScript Type Definitions (Preview)

```typescript
// These types will live in shared-infra for use by both frontend and backend

export type ExecutionStatus = 'pending' | 'in_progress' | 'completed' | 'failed'

export type ErrorType =
  | 'authentication'
  | 'network'
  | 'api_error'
  | 'timeout'
  | 'rate_limit'
  | 'validation'
  | 'unknown'

export interface PromptExecution {
  id: string // UUID
  promptText: string
  executionTimestamp: string // ISO 8601
  status: ExecutionStatus
  targetModel: string
}

export interface ExecutionResult {
  id: string // UUID
  promptExecutionId: string // UUID
  responseText: string
  inputTokenCount: number
  outputTokenCount: number
  totalTokenCount: number
  executionDurationMs: number
  estimatedCostGBP: number
}

export interface ExecutionError {
  id: string // UUID
  promptExecutionId: string // UUID
  errorType: ErrorType
  errorCode?: string
  errorMessage: string
  stackTrace?: string
  additionalContext?: Record<string, unknown>
  timestamp: string // ISO 8601
}

export interface LLMConfiguration {
  id: 1 // Always 1
  selectedModel: string
  apiKey: string // Plain text in DB, never sent to frontend
  providerEndpoint?: string
  createdAt: string // ISO 8601
  updatedAt: string // ISO 8601
}

export interface PricingInformation {
  id: number
  model: string
  provider: string
  inputTokenPriceUSD: number
  outputTokenPriceUSD: number
  lastUpdated: string // ISO 8601
}

export interface ExchangeRate {
  id: number
  fromCurrency: string
  toCurrency: string
  rate: number
  lastUpdated: string // ISO 8601
}
```

---

## Validation Summary

| Entity | Key Validations |
|--------|----------------|
| Prompt Execution | Non-empty prompt, valid model, timestamp not in future |
| Execution Result | Token counts > 0, duration > 0, cost >= 0, total tokens = input + output |
| Execution Error | Non-empty message, valid error type, timestamp not in future |
| LLM Configuration | Single row (id=1), non-empty encrypted key, valid model, optional valid URL endpoint |
| Pricing Information | Prices > 0, unique (model, provider), timestamp not in future |
| Exchange Rate | Rate > 0, valid currency codes (3 chars), unique (from, to), timestamp not in future |

---

**Phase 1 Data Model Status**: COMPLETE ✅
**Next Step**: Generate API contracts from functional requirements
