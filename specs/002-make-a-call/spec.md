# Feature Specification: LLM Prompt Execution & Diagnostics Interface

**Feature Branch**: `002-make-a-call`
**Created**: 2025-11-04
**Status**: Ready for Planning
**Input**: User description: "Make a call happen: This spec is intended to get us to the end of the first iteration of building this project out. We're going to be building a front end that is able to take a system prompt and reveal to the user the diagnostics surrounding the call. We need a card that has a text box clearly marked as a space where you can enter a system prompt. We also need a button which will we can use to execute the command. When a command is executing we should see visual indicators that request is running. When the button is hit a request should be sent to the backend and the backend should take the system prompt and using the vercel ai sdk should send the request to the appropriate model etc. When the model returns the result data should be sent back to the front end it should include not only the result of the llm call but diagnostic data like the tokens sent, tokens received, time it took to complete the call etc. When that data is returned it should be displayed in another card below the prompt card. The data should be displayed in appropriate ways, whether that be a table or graphs/charts. I'd like the frontend to be displayed in a plesant dark mode colour scheme inspired by retrofuturism, soft grays and muddy blacks with accents of cyan and magenta (not too strong, make sure it sits well on the background). We aren't expecting the front end to be something that we spend ages styling and making perfect for an end user so a simple interface will be fine as long as it's easy to understand and look at that's really what we're going for. No need to for storybooks, responsive design or long UX discussions, we're looking for quick wins not perfectly crafted front end experience, we want to see the software working as quickly as possible we want to prove this works end to end before we invest a huge amount of time in a lost cause. As such let's just use Tailwind and shadcdn, but let's not invest too much time in building multiple themes or anything, use a theme if it makes styling easier but we aren't trying to go for front end developer of the year on this one. Equally let's not go crazy on configuration, I'm happy for use to perhaps build a frontend settings section to house the LLM to use and the API keys etc. and thinking about that this would be a goo fsd way to avoid anyone accidentally committing credentials to the repo we could house these in the database rather than in env files but this might be an optimisation for a future spec, if you think we should just do .env files for now then I'm happy for us to walk that path. The goal here is to give me something I can type a prompt into, press go, see a spinner or whatever during processing, then when/if it's successful I want to see the output and the diagnostic information on the call if we could estimate a cost in this diagnostic information that would be awesome too if there's some api we can use to get current token costings for different llm models and providers. And if there are errors in the call I want use to display this in the output so the developer is able to debug what went wrong, remember our visibility tenant! Also remember our architecture tenants, this is the beginning of the project so you should take this as an opportunity to lay the foundations of future work in terms of architecture."

## Execution Flow (main)
```
1. Parse user description from Input
   → Description provided ✓
2. Extract key concepts from description
   → Actors: Developer/tester
   → Actions: Enter prompt, execute LLM call, view results and diagnostics
   → Data: System prompt input, LLM response, diagnostic metrics, error messages
   → Constraints: Quick-win focused, minimal styling effort, visibility paramount
3. For each unclear aspect:
   → All clarifications resolved ✓
4. Fill User Scenarios & Testing section
   → User flow is clear ✓
5. Generate Functional Requirements
   → Each requirement must be testable ✓
6. Identify Key Entities (if data involved)
   → Prompt execution entity with diagnostics ✓
7. Run Review Checklist
   → All checks passed ✓
8. Return: SUCCESS (spec ready for planning)
```

---

## ⚡ Quick Guidelines
- ✅ Focus on WHAT users need and WHY
- ❌ Avoid HOW to implement (no tech stack, APIs, code structure)
- 👥 Written for business stakeholders, not developers

### Section Requirements
- **Mandatory sections**: Must be completed for every feature
- **Optional sections**: Include only when relevant to the feature
- When a section doesn't apply, remove it entirely (don't leave as "N/A")

---

## Clarifications

### Session 2025-11-04

- Q: What should the system consider an acceptable LLM response time threshold? → A: No thresholds needed, just display raw timing without status indicators (analysis is not a concern for this iteration)
- Q: Should there be a maximum display length for LLM responses in the UI? → A: No limit, display full response with scrolling (display areas grow to meet content height; use smart UI patterns to make information digestible but never hide it, unless there is an easily accessible and obvious UX for the user to get at the data that they need to analyse)
- Q: Should the database be a single local file (like SQLite) or a separate PostgreSQL instance? → A: PostgreSQL instance as per tech stack
- Q: For the initial implementation, which pricing data approach should be used? → A: Lookup live API pricing on backend startup (not per-call), store in database as cache, fallback to last successful pricing if live lookup fails

---

## User Scenarios & Testing *(mandatory)*

### Primary User Story
As a developer iterating on LLM prompts, I need to execute a system prompt against an LLM and immediately see both the response and comprehensive diagnostic information (tokens, timing, costs, errors) so that I can understand what happened during the call and make informed iterations.

### Acceptance Scenarios

1. **Given** I have a system prompt to test, **When** I enter the prompt text and initiate execution, **Then** the system provides immediate visual feedback that the request is processing

2. **Given** an LLM call is in progress, **When** the call completes successfully, **Then** I see both the LLM's response and detailed diagnostic metrics including token counts, execution time, and estimated cost

3. **Given** an LLM call has completed, **When** I review the results, **Then** diagnostic information is presented in a clear, scannable format that makes key metrics immediately visible

4. **Given** an LLM call fails or encounters an error, **When** the error occurs, **Then** I see comprehensive error details that enable me to understand what went wrong and how to address it

5. **Given** I need to configure LLM settings, **When** I access configuration options, **Then** I can specify which LLM model to use and provide necessary API credentials

6. **Given** I want to perform multiple test iterations, **When** I complete one prompt execution, **Then** I can immediately initiate another execution without page reload or loss of context

7. **Given** I have completed a prompt execution (successful or failed), **When** I view the interface, **Then** my entered prompt text remains visible in the input area so I can tweak and try again

### Edge Cases
- When the LLM provider is unavailable or times out, the system displays the error details; the prompt remains in the input area for the user to resubmit
- Extremely large responses may use progressive disclosure patterns (e.g., "show more") to aid digestibility, but such patterns must prioritise analysis over compactness—users must be able to easily access all information without frustration
- If API credentials are missing or invalid, the system displays authentication error details (user can navigate to settings to correct credentials, then resubmit)
- Prompts containing special characters or extremely long text are transmitted as-is to the LLM provider; any provider-specific validation errors are surfaced to the user
- Multiple simultaneous calls are prevented by FR-003 (UI prevents new execution whilst one is in progress)
- Partial responses or streaming responses are handled according to the LLM provider's behaviour; if streaming is supported, the full response is displayed once complete

## Requirements *(mandatory)*

### Functional Requirements

#### Prompt Input & Execution
- **FR-001**: System MUST provide a clearly labelled text input area where users can enter a system prompt
- **FR-001a**: System MUST retain the prompt text in the input area after execution (successful or failed) to support iterative tweaking
- **FR-002**: System MUST provide a mechanism to initiate prompt execution
- **FR-003**: System MUST prevent users from initiating a new execution while one is already in progress
- **FR-004**: System MUST provide visual indication during prompt execution (loading state)
- **FR-005**: System MUST transmit the entered prompt to the LLM processing service

#### LLM Response Display
- **FR-006**: System MUST display the complete response received from the LLM
- **FR-007**: System MUST clearly differentiate between the prompt input area and the response display area
- **FR-008**: System MUST persist response data in the interface after completion so users can review it

#### Diagnostic Information Display
- **FR-009**: System MUST capture and display token count for the prompt (input tokens)
- **FR-010**: System MUST capture and display token count for the response (output tokens)
- **FR-011**: System MUST capture and display total execution time for the LLM call
- **FR-012**: System MUST calculate and display estimated cost based on token usage
- **FR-013**: System MUST present diagnostic information in tabular format as the default, with charts added only where they provide clear value to the user
- **FR-014**: System MUST display diagnostic information in proximity to the response so users can correlate results with metrics

#### Error Handling & Visibility
- **FR-015**: System MUST capture all errors that occur during LLM call execution
- **FR-016**: System MUST display error messages with sufficient detail to enable debugging
- **FR-017**: System MUST distinguish between different error types (authentication failures, network issues, API errors, timeouts, etc.)
- **FR-018**: System MUST maintain visibility of error information until the user initiates a new execution
- **FR-019**: System MUST surface all errors directly to the user interface (no storage required, visibility paramount)

#### Configuration Management
- **FR-020**: System MUST provide a predefined list of available LLM models, with GPT-4o-mini as the initial and only option
- **FR-021**: System MUST allow users to provide API credentials for LLM providers
- **FR-022**: System MUST persist configuration settings in a database with automatic migration support to ensure users retain settings across sessions and code updates 
- **FR-023**: System MUST prevent API credentials from being exposed in client-side code or version control
- **FR-024**: System MUST validate API credentials via test call, providing user feedback before executing the test and automatically validating on save
- **FR-024a**: System MUST provide a manual "Test Connection" option that users can trigger at any time from settings

#### Cost Estimation
- **FR-025**: System MUST fetch current pricing information for token usage from live API sources on backend startup
- **FR-025a**: System MUST store fetched pricing information in the database as a cache
- **FR-025b**: System MUST fall back to the last successfully cached pricing data when live API lookup fails during startup
- **FR-026**: System MUST calculate estimated cost using: (input_tokens × input_token_price) + (output_tokens × output_token_price)
- **FR-027**: System MUST display cost estimates in GBP, converting from source pricing using current exchange rates
- **FR-028**: System MUST indicate when pricing data is stale or unavailable

#### User Interface Presentation
- **FR-029**: System MUST use a dark mode colour scheme as the default and only theme
- **FR-030**: System MUST apply a retrofuturistic visual style with soft greys, muddy blacks, and subtle cyan/magenta accents
- **FR-031**: System MUST prioritise clarity and usability over visual sophistication
- **FR-032**: System MUST organise interface elements in a logical flow: input → execution → results → diagnostics
- **FR-032a**: System MUST display raw timing and diagnostic metrics without status indicators or thresholds (analysis is not a concern for this iteration)

#### Data Persistence
- **FR-033**: System MUST display only the most recent prompt execution and results (execution history is deferred to future feature)

### Key Entities

- **Prompt Execution**: Represents a single attempt to send a system prompt to an LLM and receive a response
  - Attributes: unique identifier, prompt text, execution timestamp, status (pending/completed/failed), target model

- **Execution Result**: The outcome of a prompt execution
  - Attributes: response text, input token count, output token count, total token count, execution duration, estimated cost, associated prompt execution

- **Execution Error**: Details of a failure during prompt execution
  - Attributes: error type/code, error message, stack trace or additional context, timestamp, associated prompt execution

- **LLM Configuration**: Settings for connecting to and using an LLM provider (system-wide, single user)
  - Attributes: selected model identifier, API credentials, provider endpoint

- **Pricing Information**: Cost data for token usage
  - Attributes: model identifier, provider, input token price, output token price, currency, last updated timestamp

---

## Review & Acceptance Checklist
*GATE: Automated checks run during main() execution*

### Content Quality
- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

### Requirement Completeness
- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

---

## Execution Status
*Updated by main() during processing*

- [x] User description parsed
- [x] Key concepts extracted
- [x] Ambiguities marked
- [x] User scenarios defined
- [x] Requirements generated
- [x] Entities identified
- [x] Review checklist passed
- [x] All clarifications resolved

---
