# API Contracts

**Version**: 0.2.0
**Last Updated**: 2025-11-07
**Source**: spec 002-make-a-call

This document describes the HTTP API contracts for the promptalicious backend.

---

## Base Configuration

**Base URL**: `http://localhost:3000/api`
**Content-Type**: `application/json`
**Server Framework**: Hono v4

---

## Endpoints

### POST /execute

Execute a system prompt against configured LLM.

**Request Body**:
```json
{
  "promptText": "string (required, 1-50000 chars)"
}
```

**Success Response (200)**:
```json
{
  "execution": {
    "id": "uuid",
    "promptText": "string",
    "executionTimestamp": "ISO 8601 datetime",
    "status": "completed",
    "targetModel": "gpt-4o-mini"
  },
  "result": {
    "id": "uuid",
    "promptExecutionId": "uuid",
    "responseText": "string",
    "inputTokenCount": "integer (>0)",
    "outputTokenCount": "integer (>=0)",
    "totalTokenCount": "integer (>0)",
    "executionDurationMs": "integer (>0)",
    "estimatedCostGBP": "number (>=0, 2 decimals)"
  }
}
```

**Error Responses**:
- **400 (validation)**: Empty prompt text
- **401 (authentication)**: Invalid API key
- **409 (conflict)**: Execution already in progress
- **429 (rate_limit)**: API quota exceeded
- **500 (network/api_error)**: Connection or provider errors
- **504 (timeout)**: Request exceeded time limit

**Error Response Format**:
```json
{
  "execution": { /* execution details */ },
  "error": {
    "id": "uuid",
    "promptExecutionId": "uuid",
    "errorType": "authentication|network|api_error|timeout|rate_limit|validation|aborted|unknown",
    "errorCode": "string (optional)",
    "errorMessage": "string",
    "stackTrace": "string (optional, backend only)",
    "additionalContext": "object (optional)",
    "timestamp": "ISO 8601 datetime"
  }
}
```

**Functional Requirements**: FR-002, FR-003, FR-005, FR-006, FR-009-019

---

### GET /execute/status

Get current execution status (for polling and page refresh recovery).

**Response (200)**:
```json
{
  "isExecuting": "boolean",
  "execution": {
    "id": "uuid",
    "promptText": "string",
    "executionTimestamp": "ISO 8601 datetime",
    "status": "pending|in_progress|completed|failed|aborted",
    "targetModel": "gpt-4o-mini"
  },
  "result": { /* ExecutionResult (if completed, returned once then cache cleared) */ },
  "error": { /* ExecutionError (if failed/aborted, returned once then cache cleared) */ }
}
```

**States**:
- **Execution in progress**: `isExecuting=true`, execution object with `status=in_progress`
- **Execution completed**: `isExecuting=false`, execution + result (cache cleared after retrieval)
- **Execution failed/aborted**: `isExecuting=false`, execution + error (cache cleared after retrieval)
- **No execution**: `isExecuting=false`, execution=null

**Functional Requirements**: FR-003b, FR-004

---

### POST /execute/abort

Abort currently executing prompt.

**Request Body**: None

**Success Response (200)**:
```json
{
  "success": true,
  "message": "Execution aborted successfully"
}
```

**Error Response (400)**:
```json
{
  "success": false,
  "message": "No execution in progress to abort",
  "error": {
    "errorType": "validation",
    "errorMessage": "No execution is currently in progress"
  }
}
```

**Functional Requirements**: FR-005a

---

### GET /config

Get current LLM configuration.

**Response (200)**:
```json
{
  "config": {
    "id": 1,
    "selectedModel": "gpt-4o-mini",
    "providerEndpoint": "string|null (optional)",
    "createdAt": "ISO 8601 datetime",
    "updatedAt": "ISO 8601 datetime"
  },
  "availableModels": ["gpt-4o-mini"]
}
```

**Note**: API key is never returned in response for security reasons.

**Functional Requirements**: FR-020, FR-023

---

### PUT /config

Update LLM configuration with automatic validation.

**Request Body**:
```json
{
  "selectedModel": "string (optional, must be in availableModels)",
  "apiKey": "string (optional, minLength:1)",
  "providerEndpoint": "string (optional, valid URL)"
}
```

**At least one field must be provided.**

**Success Response (200)**:
```json
{
  "config": {
    "id": 1,
    "selectedModel": "gpt-4o-mini",
    "providerEndpoint": "string|null",
    "updatedAt": "ISO 8601 datetime"
  },
  "validationResult": {
    "success": true,
    "message": "API credentials validated successfully"
  }
}
```

**Error Response (400)**:
```json
{
  "error": {
    "errorType": "authentication|validation",
    "errorMessage": "string",
    "additionalContext": {
      "testCallFailed": true
    }
  }
}
```

**Behaviour**:
- Automatically runs test call to validate credentials before saving
- Only saves configuration if validation succeeds
- Returns validation failure details if test call fails

**Functional Requirements**: FR-020, FR-021, FR-022, FR-023, FR-024, FR-024a

---

### POST /config/test-connection

Manually test LLM API connection (does not save changes).

**Request Body**: None

**Success Response (200)**:
```json
{
  "success": true,
  "message": "Successfully connected to OpenAI API with GPT-4o-mini"
}
```

**Error Response (400)**:
```json
{
  "success": false,
  "message": "Connection failed: Invalid API key",
  "error": {
    "errorType": "authentication",
    "errorCode": "invalid_api_key"
  }
}
```

**Functional Requirements**: FR-024a

---

### GET /pricing

Get current pricing information with staleness detection.

**Response (200)**:
```json
{
  "pricing": {
    "model": "gpt-4o-mini",
    "provider": "openai",
    "inputTokenPriceUSD": 0.00000015,
    "outputTokenPriceUSD": 0.0000006,
    "lastUpdated": "ISO 8601 datetime"
  },
  "exchangeRate": {
    "fromCurrency": "USD",
    "toCurrency": "GBP",
    "rate": 0.79,
    "lastUpdated": "ISO 8601 datetime"
  },
  "staleness": {
    "isStale": false,
    "daysSinceUpdate": 0
  }
}
```

**Staleness Rules**:
- `isStale=true` if `lastUpdated > 7 days ago`
- Frontend displays warning when stale

**Functional Requirements**: FR-025, FR-025a, FR-025b, FR-028

---

## Error Type Classifications

| Error Type | HTTP Status | Description | User Action |
|------------|-------------|-------------|-------------|
| `authentication` | 401 | Invalid/missing API credentials | Check API key in settings |
| `network` | 500 | Connection failures, DNS errors | Check internet connection |
| `api_error` | 500 | LLM provider errors (invalid model, bad request) | Review prompt, check provider status |
| `timeout` | 504 | Request exceeded time limit | Retry with shorter prompt |
| `rate_limit` | 429 | API quota or rate limit exceeded | Wait and retry, check API plan |
| `validation` | 400 | Client-side validation failures | Fix input (e.g., non-empty prompt) |
| `aborted` | 200 | User cancelled execution | N/A (intentional action) |
| `unknown` | 500 | Uncategorised errors | Report issue with full error details |

**Source**: FR-017

---

## Data Model Summary

### Execution Status Enum
```typescript
type ExecutionStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'aborted'
```

### Error Type Enum
```typescript
type ErrorType = 'authentication' | 'network' | 'api_error' | 'timeout' | 'rate_limit' | 'validation' | 'aborted' | 'unknown'
```

---

**For complete data model details, see**: `specs/002-make-a-call/data-model.md`
**For complete OpenAPI specification, see**: `specs/002-make-a-call/contracts/api-contracts.yaml`
