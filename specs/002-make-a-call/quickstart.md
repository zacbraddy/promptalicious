# Quickstart Guide: LLM Prompt Execution & Diagnostics Interface

**Feature**: 002-make-a-call
**Date**: 2025-11-04
**Purpose**: Validate implementation by walking through primary user scenarios

---

## Prerequisites

Before starting, ensure:
- [ ] PostgreSQL instance is running locally (localhost:5432)
- [ ] OpenAI API key is available
- [ ] All dependencies installed (`pnpm install` from repository root)
- [ ] Database migrations have been applied
- [ ] Backend server is running (`pnpm --filter @promptalicious/backend dev`)
- [ ] Frontend dev server is running (`pnpm --filter @promptalicious/frontend dev`)

---

## Setup: First-Time Configuration

### Step 1: Open the Application

1. Navigate to `http://localhost:5173` (Vite default port) in your browser
2. You should see the main prompt execution interface with:
   - A card containing a text input area for system prompts
   - An "Execute" button (may be disabled initially if no API key configured)
   - A settings link/button (for configuration)

**Expected UI**: Dark mode interface with soft greys, muddy blacks, and subtle cyan/magenta accents (retrofuturistic theme)

### Step 2: Configure API Credentials

**Scenario**: FR-020, FR-021, FR-022, FR-023, FR-024

1. Click the "Settings" button/link
2. Observe the settings page displays:
   - Current model selection: "gpt-4o-mini" (read-only for this iteration)
   - API key input field (empty or showing masked existing key)
   - Optional provider endpoint field
   - "Test Connection" button
   - "Save" button
3. Enter your OpenAI API key in the API key field:
   ```
   Example: sk-proj-abc123def456...
   ```
4. Click "Save"
5. Observe:
   - A loading indicator appears
   - System automatically validates credentials via test call (FR-024)
   - Success message appears: "API credentials validated successfully"
   - Configuration is persisted to PostgreSQL database (FR-022)

**Validation**:
- ✅ API key is NOT visible in frontend network requests (FR-023 - security check)
- ✅ Configuration survives page reload (FR-022 - persistence check)

**Edge Case: Invalid API Key**
1. Enter an invalid API key: `sk-invalid-key`
2. Click "Save"
3. Observe:
   - Loading indicator during validation
   - Error message appears: "API key validation failed: invalid credentials"
   - Configuration is NOT saved
   - User can correct and retry

---

## Scenario 1: Successful Prompt Execution

**Primary User Story**: As a developer, I want to execute a system prompt and see the response with full diagnostics

**Requirements**: FR-001, FR-002, FR-004, FR-006, FR-009-014, FR-032

### Steps

1. Navigate to main prompt execution page (`http://localhost:5173`)
2. In the text input area (clearly labelled "System Prompt" or similar), enter:
   ```
   You are a helpful assistant. Explain TypeScript generics in 2-3 sentences.
   ```
3. Click the "Execute" button
4. Observe:
   - Button becomes disabled (FR-003 - prevents concurrent executions)
   - Loading indicator appears (spinner, progress bar, or similar visual feedback per FR-004)
   - Prompt text remains visible in the input area (FR-001a)
5. Wait for execution to complete (typically 1-3 seconds)
6. Observe response display below the prompt input card:

**Expected Response Card**:
- **LLM Response** section:
  - Complete text response from GPT-4o-mini
  - Response is displayed in full (no truncation per FR-006, scrollable if long per spec clarification)

- **Diagnostic Information** section (FR-009-014):
  - Presented in tabular format (default) or charts if valuable
  - Displays:
    - Input tokens: ~12 (varies based on tokenization)
    - Output tokens: ~40-60 (varies based on response length)
    - Total tokens: ~52-72
    - Execution time: ~1500-2500ms (example values)
    - Estimated cost: £0.0008 (calculated from token usage × pricing data)
  - All metrics displayed without status indicators/thresholds (FR-032a - raw data only)

**Validation**:
- ✅ Response is complete and readable
- ✅ All diagnostic metrics are present and non-zero
- ✅ Cost is displayed in GBP (FR-027)
- ✅ Prompt text still visible in input area for iteration (FR-001a)
- ✅ Execute button is re-enabled after completion

---

## Scenario 2: Iterative Prompt Refinement

**User Story**: As a developer, I want to tweak my prompt and re-execute without losing context

**Requirements**: FR-001a, FR-006, FR-033

### Steps

1. After completing Scenario 1, observe:
   - Original prompt is still visible in the input area (FR-001a)
   - Previous response and diagnostics are still displayed below (FR-033)
2. Modify the prompt in the input area:
   ```
   You are a helpful assistant. Explain TypeScript generics with a code example.
   ```
3. Click "Execute" again
4. Observe:
   - New execution starts (loading indicator)
   - Previous response is replaced with new response (FR-033 - only most recent displayed)
5. Compare new diagnostics to previous (mentally - no UI comparison feature in this iteration):
   - Output token count likely higher (code example = more tokens)
   - Estimated cost slightly higher

**Validation**:
- ✅ Prompt remains editable between executions
- ✅ Only most recent result is displayed (no history in this iteration)
- ✅ User can iterate rapidly without page reloads

---

## Scenario 3: Authentication Error Handling

**User Story**: As a developer, I need clear error messages when authentication fails

**Requirements**: FR-015-019

### Setup

1. Navigate to Settings
2. Enter an invalid API key or clear the existing key
3. Save configuration (will fail validation, but bypass for testing by temporarily removing validation or using backend API directly)

### Steps

1. Return to main prompt page
2. Enter a test prompt:
   ```
   Test authentication error
   ```
3. Click "Execute"
4. Observe error display:
   - Error card appears in place of results
   - Error type indicated: "Authentication Error" (FR-017)
   - Error message displayed: "The API key provided is invalid. Please check your configuration." (FR-016)
   - Error details remain visible until next execution (FR-018)
   - Link or instruction to navigate to Settings to correct credentials

**Validation**:
- ✅ Error type is clearly labelled (FR-017)
- ✅ Error message is actionable (tells user what to do)
- ✅ No silent failure (FR-019 - visibility principle upheld)
- ✅ Prompt text remains in input area for retry (FR-001a)

---

## Scenario 4: Network Error Handling

**User Story**: As a developer, I need to understand when network issues occur

**Requirements**: FR-015-019

### Setup (requires manual network simulation)

1. Disconnect from internet OR use browser dev tools to simulate offline mode
2. Ensure valid API key is configured

### Steps

1. Enter a test prompt:
   ```
   Test network connectivity
   ```
2. Click "Execute"
3. Observe error display:
   - Error type: "Network Error"
   - Error message: "Unable to connect to OpenAI API. Please check your internet connection."
   - Error remains visible (FR-018)

**Validation**:
- ✅ Network errors are distinguishable from authentication errors (FR-017)
- ✅ Error message provides actionable guidance
- ✅ Prompt preserved for retry after network is restored

---

## Scenario 5: Rate Limit Handling

**User Story**: As a developer, I need to know when I've hit API rate limits

**Requirements**: FR-015-019

### Setup (difficult to test without actually hitting rate limit)

This scenario validates that the error handling system is in place. Actual rate limit testing may require:
- Rapid successive calls to trigger rate limit
- Using a rate-limited API key
- Backend simulation/mocking for testing purposes

### Steps (if you hit a real rate limit)

1. Execute multiple prompts in quick succession (10+ times rapidly)
2. When rate limit is hit, observe error display:
   - Error type: "Rate Limit Exceeded"
   - Error message includes retry guidance (e.g., "Please try again in 60 seconds")
   - Additional context may show retry-after time

**Validation**:
- ✅ Rate limit errors are distinct from other error types
- ✅ Retry guidance is provided (FR-016 - actionable errors)

---

## Scenario 6: Viewing Pricing Information

**User Story**: As a developer, I want to know if pricing data is stale

**Requirements**: FR-025, FR-025a, FR-025b, FR-028

### Steps

1. Navigate to Settings (or a dedicated Pricing Info page if implemented)
2. View current pricing information:
   - Model: gpt-4o-mini
   - Provider: OpenAI
   - Input token price (USD): $0.00000015 per token
   - Output token price (USD): $0.0000006 per token
   - Last updated: [timestamp]
3. Check staleness indicator:
   - If pricing was updated within last 7 days: No warning
   - If pricing is >7 days old: Warning displayed (FR-028)

**Staleness Simulation** (optional, requires backend manipulation):
1. Manually update database to set `pricing_info.last_updated` to 10 days ago
2. Reload page
3. Observe warning: "Pricing data is 10 days old and may be outdated"

**Validation**:
- ✅ Pricing data is visible to user
- ✅ Staleness is indicated when >7 days (FR-028)
- ✅ Backend falls back to cached pricing if live lookup fails (FR-025b - check logs)

---

## Scenario 7: Large Response Display

**User Story**: As a developer, I need to view very long LLM responses without truncation

**Requirements**: FR-006, spec clarification on display length

### Steps

1. Enter a prompt that generates a long response:
   ```
   You are a helpful assistant. Write a detailed explanation of the React useEffect hook, including common use cases, pitfalls, and best practices. Provide code examples.
   ```
2. Click "Execute"
3. Observe response display:
   - Complete response is visible (no truncation)
   - Scrollable area if response exceeds viewport height
   - UI remains digestible (smart layout patterns)

**Validation**:
- ✅ Full response is always available (FR-006)
- ✅ Long responses don't break layout
- ✅ Scrolling is smooth and intuitive

---

## Scenario 8: Empty Prompt Validation

**User Story**: As a developer, I should be prevented from executing empty prompts

**Requirements**: FR-001, validation rules

### Steps

1. Leave prompt input area empty (or enter only whitespace)
2. Attempt to click "Execute"
3. Observe:
   - Button may be disabled (client-side validation)
   - If button is clickable, backend returns validation error:
     - Error type: "Validation Error"
     - Error message: "Prompt text cannot be empty"

**Validation**:
- ✅ Empty prompts are rejected (either client-side or server-side)
- ✅ User receives clear feedback

---

## Scenario 9: Special Characters in Prompts

**User Story**: As a developer, I need to test prompts with special characters without issues

**Requirements**: Edge case handling from spec

### Steps

1. Enter a prompt with special characters:
   ```
   You are a helpful assistant. Explain the meaning of these symbols in programming: \n, \t, &&, ||, >=, <=, !=, ===
   ```
2. Click "Execute"
3. Observe:
   - Prompt is transmitted as-is to LLM (no corruption)
   - Response handles special characters correctly
   - Diagnostics are accurate

**Validation**:
- ✅ Special characters don't break the system
- ✅ Prompt and response display correctly

---

## Scenario 10: Backend Startup - Pricing Cache Initialization

**User Story**: As a developer, I need the system to have current pricing data on startup

**Requirements**: FR-025, FR-025a, FR-025b

### Steps

1. Stop the backend server (Ctrl+C in terminal)
2. Check backend logs for previous pricing data
3. Restart backend server:
   ```bash
   pnpm --filter @promptalicious/backend dev
   ```
4. Observe backend startup logs:
   - "Fetching live pricing data from OpenAI API..."
   - "Pricing data updated successfully" (if lookup succeeds)
   - OR "Pricing API lookup failed, using cached data" (if lookup fails per FR-025b)
5. Check database to verify `pricing_info` and `exchange_rates` tables are populated

**Validation**:
- ✅ Backend attempts live pricing lookup on startup (FR-025)
- ✅ Pricing is cached in database (FR-025a)
- ✅ Backend falls back to cached data if live lookup fails (FR-025b)
- ✅ User is not blocked from using the system if pricing is unavailable

---

## Acceptance Criteria Validation

Map each scenario back to acceptance criteria from spec.md:

| Acceptance Scenario | Validated By | Status |
|---------------------|--------------|--------|
| 1. Visual feedback during execution | Scenarios 1, 2 | ✅ |
| 2. Complete response + diagnostics on success | Scenarios 1, 2 | ✅ |
| 3. Clear, scannable diagnostic presentation | Scenarios 1, 2 | ✅ |
| 4. Comprehensive error details on failure | Scenarios 3, 4, 5 | ✅ |
| 5. Configure LLM settings and credentials | Setup Step 2 | ✅ |
| 6. Multiple iterations without reload | Scenario 2 | ✅ |
| 7. Prompt text remains after execution | Scenarios 1, 2, 3, 4 | ✅ |

---

## Performance & Quality Checks

### Quality Gates (Constitution Requirements)

Run from repository root:

```bash
pnpm typecheck  # Zero errors expected
pnpm lint       # Zero errors/warnings expected
pnpm format:check # All files formatted
pnpm test       # All tests passing
```

### Manual Performance Observations

During testing, observe:
- **UI Responsiveness**: Button clicks, typing in input area should feel instant
- **Loading Indicators**: Should appear within 100ms of clicking Execute
- **LLM Call Duration**: Varies by provider, typically 1-5 seconds (no hard requirement, just display raw timing)
- **Database Queries**: Should be fast (<50ms for configuration reads, pricing lookups)

---

## Troubleshooting Common Issues

### Issue: "API key validation failed"
- **Cause**: Invalid or missing API key
- **Solution**: Verify OpenAI API key is correct, has available quota
- **Check**: Try using the key directly with OpenAI API via curl to validate outside the application

### Issue: "Unable to connect to database"
- **Cause**: PostgreSQL not running or connection misconfigured
- **Solution**: Start PostgreSQL, verify connection string in backend `.env` file
- **Check**: Test connection with `psql -h localhost -U <user> -d promptalicious`

### Issue: Pricing data shows as stale
- **Cause**: Pricing API lookup failed during backend startup
- **Solution**: Check backend logs for pricing fetch errors, verify internet connectivity
- **Workaround**: System still functions with cached data, cost estimates use last known pricing

### Issue: Frontend shows blank page
- **Cause**: Frontend dev server not running, or build error
- **Solution**: Check frontend terminal for errors, run `pnpm typecheck` and `pnpm lint` in frontend package
- **Check**: Browser console for JavaScript errors

---

## Success Criteria

✅ **Feature is ready for production** when:
- All 10 scenarios execute successfully
- All acceptance criteria validated
- All quality gates pass (typecheck, lint, format, tests)
- No console errors during normal usage
- Error scenarios provide actionable user guidance

---

**Quickstart Status**: READY FOR IMPLEMENTATION ✅
**Next Phase**: Generate tasks.md via /tasks command
