# Project Constitution: promptalicious

<!--
SYNC IMPACT REPORT
Version: 1.1.0 (Material amendment - new principle added)
Ratification Date: 2025-11-03
Last Amended: 2025-11-03

Changes:
- v1.1.0: Added Principle 4 (Dolphin-Based Development)
- v1.0.0: Initial constitution created from project requirements
- Established core principles: Visibility, Good Architecture, Focused Flexibility, Dolphin-Based Development
- Defined technical standards for TypeScript/React/Postgres stack
- Established pragmatic TDD workflow (tight red-green-refactor cycles)
- Set development protocols for AI-assisted development

Templates Status:
✅ spec-template.md - Reviewed, no changes needed (generic enough)
✅ plan-template.md - Constitution check section aligns with new principles
✅ tasks-template.md - TDD ordering aligns with pragmatic approach, Dolphin principle reinforces existing guidance
⚠️  Command files - May need updates to reference Context7/Selena tools and Dolphin deliverables

Follow-up TODOs:
- Monitor template usage to ensure constitutional alignment in practice
- Update command files to emphasise Context7/Selena usage for troubleshooting
- Update /implement and /audit commands to include "demo-ability" checks after each task
-->

**Version**: 1.1.0
**Ratification Date**: 2025-11-03
**Last Amended**: 2025-11-03
**Project Type**: Local development tool (web application)
**Primary User**: Software developers debugging/iterating LLM prompts and tools

---

## Project Mission

promptalicious is a development tool that enables developers to build, debug, and iterate on LLM prompts and tool configurations with visibility and repeatability. It provides a local web interface for:

- Configuring LLM calls (prompts, tools, system messages)
- Executing calls and observing results with full diagnostics
- Iterating rapidly to achieve reliable, repeatable LLM behaviour
- Translating working configurations into production code with minimal friction

**First Target**: Debug and iterate multistep, tool-enabled calls to GPT-4o-mini using Vercel AI SDK.

---

## Core Principles

### Principle 1: Visibility Above All

**Rule**: Every action, side effect, and result MUST be observable to the developer using the tool.

**Rationale**: promptalicious is a development tool for debugging opaque systems (LLM calls). If users cannot see what's happening, the tool has failed its purpose.

**Implementation Requirements**:
- All LLM calls MUST display: prompt, tools provided, tokens used, response, execution time
- Tool executions MUST show: input parameters, return values, errors, execution order
- File operations MUST be traceable: which files loaded, what code extracted
- Configuration changes MUST be immediately reflected in the UI
- Error states MUST be explicit with actionable context

**Non-Negotiable**:
- No silent failures
- No hidden state mutations
- No "magic" behaviour users cannot inspect

### Principle 2: Good Architecture Without Cargo-Culting

**Rule**: Apply proven architectural patterns (DDD, Onion Architecture) where they solve real problems. Reject patterns that exist purely for intellectual satisfaction.

**Rationale**: This is a complex project that will evolve over time. Good architecture enables change. Bad architecture (or architecture theatre) creates friction.

**Implementation Requirements**:
- Domain logic MUST be isolated from infrastructure concerns
- Dependencies MUST point inward (Onion Architecture)
- Modules MUST have clear boundaries and responsibilities
- Patterns MUST justify their existence with concrete benefits

**Questions to Ask Before Adding Complexity**:
1. Does this pattern solve a problem we actually have?
2. Will this make future changes easier or harder?
3. Can we achieve the same goal more simply?
4. Are we building for hypothetical futures or real needs?

**Forbidden**:
- Abstract factories with single implementations
- Dependency injection for classes with one consumer
- Any pattern that exists to "feel professional"

### Principle 3: Focused Flexibility

**Rule**: Build for the immediate need (GPT-4o-mini + Vercel AI SDK) whilst designing extension points for future capabilities (different models, SDKs, features).

**Rationale**: We need a working tool quickly, but we know requirements will expand. The right architecture makes future additions cheap without bloating the initial implementation.

**Implementation Requirements**:
- First iteration MUST support: GPT-4o-mini, Vercel AI SDK, tool-based workflows and multistep calls
- Architecture MUST allow: pluggable LLM providers, multiple SDK adapters, extensible tool types
- New capabilities MUST integrate via: new module implementation, minimal config, zero rewrites

**Delivery Approach**:
- YAGNI for features (don't build what we don't need)
- Design for extension (make adding features cheap when needed)
- Validate architecture early (prove extension points work with 2nd implementation)

**Extension Point Examples**:
- LLM provider interface (start: OpenAI via Vercel SDK, future: Anthropic, local models)
- Tool definition format (start: Vercel AI SDK schema, future: custom schemas)
- Execution strategies (start: single-shot, future: multistep agents)

### Principle 4: Dolphin-Based Development

**Rule**: After every completed task (or phase at minimum), there MUST be something runnable, testable, or demonstrable that proves we're heading in the right direction.

**Rationale**: Waiting 50+ tasks to see if things work wastes massive amounts of time. Frequent validation prevents building in the wrong direction for weeks. The stakeholder (you) needs confidence we're making real progress, not just completing checkboxes.

**The Dolphin Metaphor**: Like dolphins surfacing regularly to breathe, we surface working software frequently to validate direction. We don't stay underwater (heads-down coding) so long that we drown.

**Implementation Requirements**:

**After Each Task Completion**:
- Determine if software is in a runnable/testable state
- If YES: Provide clear instructions on how to test/run it
  - Example: "New API endpoint ready - test with: `curl -X POST http://localhost:3000/api/users -d '{...}'`"
  - Example: "Frontend component ready - run `pnpm dev`, navigate to /dashboard, click 'New Prompt'"
  - Example: "Database migration complete - run `pnpm db:status` to verify schema"
- If NO: Explain why and when it will be runnable
  - Example: "Backend endpoint exists but frontend integration in next task (T015)"
  - Example: "Database layer complete but needs API layer (T012-T014) before testing end-to-end"

**Task Sizing Considerations**:
- Each task should be atomic enough for LLM implementation (token constraints)
- Tasks should be sized to enable frequent surfacing when possible
- Balance: Don't waste time on throwaway demo code, but don't go silent for 20 tasks either

**What "Runnable/Testable" Means**:
- Can execute the code (even if UI isn't pretty)
- Can verify behaviour matches spec (even if incomplete)
- Can see progress visually or via output (logs, API responses, UI changes)
- Can validate architecture decisions are sound (extension points work, patterns hold)

**Acceptable Reasons to Defer Testing**:
- Foundation work (project setup, DB schema) that requires API layer to test
- Implementing 2-3 tightly coupled tasks where testing mid-way provides no value
- Refactoring that doesn't change observable behaviour

**Unacceptable Reasons**:
- "I'll show you when the entire feature is done" (too late)
- "Just trust me, it'll work" (violates Visibility principle)
- "Testing now would require scaffolding code" (maybe the task is too low-level)

**Near-Non-Negotiable Status**:
This principle is critical but must bow to reality:
- LLMs have token limits (tasks must be sized appropriately)
- Some work is legitimately not testable in isolation
- Throwaway code to "prove a point" wastes time

However, if we're regularly going 5+ tasks without something to show, we're doing it wrong. Task breakdown or phase planning needs adjustment.

**Success Metric**: After each task/phase, the stakeholder can either:
1. Run/test the new capability, OR
2. Understand exactly why they can't yet and when they will be able to

---

## Technical Standards

### Tech Stack (as of 2025-11-03)

**Frontend**:
- Language: TypeScript (latest)
- Framework: React (latest)
- Build: Vite (latest)
- Testing: Vitest (latest)

**Backend**:
- Runtime: Node.js (latest LTS)
- Language: TypeScript (latest)
- Database: PostgreSQL (latest)

**Tooling**:
- Package Manager: pnpm (latest)
- Monorepo: Turbo (latest)
- Linting: ESLint (latest)
- Formatting: Prettier (latest)
- Git Hooks: Husky (latest)

**Target Platform**: Local developer machine (macOS/Linux/Windows)

### Code Quality Standards

**Type Safety**:
- TypeScript strict mode MUST be enabled
- `any` type MUST be justified in code comments
- Type errors MUST block commits (via Husky)

**Linting & Formatting**:
- ESLint errors MUST block commits
- Prettier MUST auto-format on save (encouraged) or pre-commit (enforced)
- No warnings allowed in production builds

**Testing** (see Pragmatic TDD section below):
- All business logic MUST have test coverage
- Integration tests MUST use real dependencies (real Postgres, real LLM calls with recorded fixtures)
- Tests MUST be co-located with implementation where sensible

---

## Development Protocols

### Pragmatic TDD Workflow

**Core Commitment**: We believe in comprehensive test suites and TDD principles. We reject dogmatic TDD that creates friction.

**Red-Green-Refactor Cycle**:
- Tests MUST fail first (RED phase is non-negotiable)
- RED-GREEN-REFACTOR cycle MUST happen on a **tight loop** (per-task, not per-spec, feature or even project!)
- Test suites MUST be right-sized (test what you're implementing now, not every future feature, or even for future tasks, let it be implemented when we get to that part)

**What This Looks Like in Practice**:

**Good** ✅:
- Task: "Implement user authentication"
  - Write failing auth tests
  - Implement auth to make tests pass
  - Refactor
  - Task complete

**Bad** ❌:
- Tasks:
  1. "Write all contract tests for entire API" (20 tests)
  2. "Write all integration tests for entire API" (30 tests)
  3. "Implement API endpoints to make tests pass" (wait 2 days to see if tests are right)

**Test Hierarchy** (in order of writing):
1. Contract tests (API shape, request/response schemas)
2. Integration tests (real dependencies, user workflows)
3. End-to-end tests (full system validation)
4. Unit tests (complex logic, edge cases)

**Critical Rules**:
- FORBIDDEN: Writing 20+ tests before any implementation
- FORBIDDEN: Skipping tests to "fix" test failures
- FORBIDDEN: Implementing before writing a failing test
- REQUIRED: Test the specific feature you're building now
- REQUIRED: Use real dependencies (real DB, real LLM calls with fixtures)

**When to Skip the RED Phase**:
- Never for new features
- Only when explicitly justified (e.g., refactoring without behaviour change)

### AI-Assisted Development Protocols

**Tool Usage**:
- Context7 MUST be first port of call for framework/library documentation
- Selena MUST be used for codebase exploration and understanding
- Web search MUST be used for debugging external issues (API errors, dependency conflicts)

**When Stuck** (after ~10 failed attempts):
1. STOP the current approach
2. Explain to the developer you're working with:
   - The problem you're trying to solve
   - What you've tried (list attempts)
   - Why each attempt failed
3. Wait for human intervention

**Debugging Temperature**:
- Keep reasoning temperature LOW
- Work from FACTS (codebase state, error messages, documentation)
- Avoid speculation loops
- Use tools to gather evidence before forming hypotheses

### Task Execution Discipline

**Rule 1: Stay on Task**
- If task is "Fix all TypeScript errors", then fix ALL TypeScript errors
- Do not move to next task because current one is hard
- Do not mark tasks complete when they're not

**Rule 2: Never Skip Tests to "Pass"**
- Skipping tests is ONLY acceptable for:
  - Debugging/troubleshooting (temporary)
  - Future tasks will provide implementation (justified)
- Skipping tests to report "all tests passing" is FORBIDDEN

**Rule 3: Own the Entire Codebase**
- This is a greenfield project - all code is YOUR code
- Linting errors in files you didn't touch? Still your problem
- Tests failing due to missing implementation? That's expected
- Tests failing due to broken code? That's your job to fix

**Rule 4: Finish Clean**
- Before marking task complete:
  - Run linting
  - Run type checking
  - Run tests
  - Check for errors in files you touched AND files you didn't
- Only mark complete when quality gates pass (or failures are justified by project state)

**Rule 5: Surface After Each Task (Dolphin Protocol)**
- After completing each task, provide ONE of the following:
  - **Testing instructions**: How to run/test the new capability (commands, URLs, expected output)
  - **Deferral explanation**: Why it's not testable yet and which task will make it testable
- If software is in a runnable state after 5+ tasks of silence, you've failed the Dolphin principle

**Testing Instruction Examples**:
- "Test the new endpoint: `curl -X POST http://localhost:3000/api/prompts -d '{"name":"test"}'`"
- "Start the app with `pnpm dev`, navigate to http://localhost:5173/prompts to see the new UI"
- "Run `pnpm test:integration` to see the new DB schema validation"

**Deferral Explanation Examples**:
- "Backend model exists but needs API endpoint (T012) before testing"
- "Database migration complete but requires seed data (T008) and API layer (T010-T012) before end-to-end test"

---

## Quality Gates

All code MUST pass before commit and before marking task complete:

1. **Type Checking**: `pnpm typecheck` (zero errors)
2. **Linting**: `pnpm lint` (zero errors, zero warnings), use `pnpm lint:fix` to apply formatting changes without you having to do it.
3. **Formatting**: `pnpm format:check` (MUST pass - if fails, run `pnpm format` then recheck)
4. **Tests**: `pnpm test` (all tests passing, or failures justified)

**Formatting Protocol**:
- ALWAYS run `pnpm format:check` first
- If it fails, run `pnpm format` to auto-fix
- Then run `pnpm format:check` again to verify
- Never skip this step - formatting must pass before task completion

Husky pre-commit hooks MUST enforce these gates.

**Justified Failures**:
- Tests failing due to incomplete implementation (mark as TODO, track in tasks)
- Type errors in generated code (comment explaining why, plan to resolve)

**Never Justified**:
- Skipping tests to make suite pass
- Disabling linting rules without rationale
- Committing broken code "to fix later"

---

## Git Workflow

**Branches**:
- `main`: Always deployable (for a local tool, this means "runnable")
- Feature branches: `###-feature-name` (matches spec directory)

**Commits**:
- Atomic commits (one logical change)
- Conventional commit messages (feat:, fix:, refactor:, test:, docs:)
- Tests MUST be committed before/with implementation (demonstrate RED phase)

**Pull Requests** (if working with others):
- All quality gates MUST pass
- Include spec link in PR description
- Show test failures in commit history (proves TDD)

---

## Governance

### Amendment Process

**Minor Amendments** (version PATCH bump):
- Clarifications, wording improvements, typo fixes
- No material change to principles
- Update `LAST_AMENDED` date, increment version (e.g., 1.0.0 → 1.0.1)

**Material Amendments** (version MINOR bump):
- New principles added
- Existing principles materially expanded
- New technical standards or requirements
- Update `LAST_AMENDED` date, increment version (e.g., 1.0.0 → 1.1.0)

**Breaking Changes** (version MAJOR bump):
- Principles removed or redefined
- Backward-incompatible governance changes
- Architectural pivots
- Update `LAST_AMENDED` date, increment version (e.g., 1.0.0 → 2.0.0)

### Compliance Review

**During Planning** (`/plan` command):
- Constitution Check section MUST validate alignment with all principles
- Violations MUST be justified in Complexity Tracking table
- Unjustifiable violations MUST block planning

**During Implementation** (`/implement` command):
- Tasks MUST reference constitutional requirements where relevant
- Agents MUST flag violations during execution

**During Audit** (`/audit` command):
- Completed tasks MUST be checked against quality gates
- Principle violations MUST be identified and remediated

### Living Document

This constitution will evolve as the project grows. Expect:
- New principles as we discover what matters
- Refined standards as we learn what works
- Updated examples as patterns emerge

Review quarterly or when hitting major friction points.

---

## Success Criteria

This constitution succeeds if:

1. **Visibility**: Developers using promptalicious always know what's happening
2. **Architecture**: Adding new LLM providers or capabilities takes hours, not days
3. **Quality**: Tests catch regressions before they reach users
4. **Velocity**: We ship working features without drowning in process
5. **Sustainability**: Future-you (Zac) can return to this codebase and understand it
6. **Dolphin Surfacing**: After each task/phase, there's something runnable or a clear explanation of when there will be

This constitution fails if:
- Users are confused by opaque behaviour
- Architecture creates more problems than it solves
- TDD becomes a ritual that slows delivery
- Quality gates are routinely bypassed
- Code is unreadable or unmaintainable
- We go 5+ tasks without being able to validate direction

---

**Next Steps After Ratification**:
1. Review `/templates/*.md` for constitutional alignment
2. Update `.claude/commands/*.md` to reference Context7/Selena usage
3. Begin feature specification for first iteration (GPT-4o-mini debugging interface)

---

## Spec 002 Constitutional Compliance

**Verification Date**: 2025-11-07
**Spec**: 002-make-a-call (LLM Prompt Execution & Diagnostics Interface)
**Overall Compliance**: ✅ Aligned with all core principles

### Principle 1: Visibility Above All

✅ **Full Compliance**

**Evidence**:
- FR-009 through FR-014: Comprehensive diagnostics display (tokens, timing, cost)
- FR-015 through FR-019: All error types surfaced with actionable context
- FR-028: Staleness indicator for pricing data
- FR-004: Execution status polling for page refresh recovery
- UI requirement (FR-029-032): Retrofuturistic dark theme prioritises information visibility

**Implementation Patterns**:
- Backend returns full execution metadata on every call
- Frontend displays all diagnostic info without hidden state
- Errors classified and displayed with provider-specific details
- No silent failures - all states explicitly communicated

### Principle 2: Good Architecture Without Cargo-Culting

✅ **Full Compliance**

**Justified Patterns**:
- Single-row configuration table (id=1 constraint): Solves "one config" requirement simply
- Execution state cache: In-memory cache enables abort and page refresh without database complexity
- Pricing cache: Solves live pricing lookup problem without per-call overhead

**Architecture: EVERY feature as library? DEFERRED**
- Rationale: First iteration prioritises working software over perfect abstraction
- Plan: Extract reusable patterns after 2-3 specs when clear patterns emerge
- Justification: Aligns with Focused Flexibility (build for now, design for extension)

**Dependencies point inward? ✅**
- Domain models defined independently of persistence layer
- HTTP layer depends on service layer, not vice versa
- Separation between API contracts and internal implementation

### Principle 3: Focused Flexibility

✅ **Full Compliance**

**Immediate Need**:
- GPT-4o-mini via Vercel AI SDK: Implemented as primary use case
- Single model, single provider (OpenAI)
- Configuration UI enables API key setup

**Extension Points Designed**:
- Model selection: Database field + UI ready for dropdown (future)
- Provider endpoint: Optional field supports custom endpoints
- Vercel AI SDK: Abstracts away provider details, enables future multi-provider support

**Not Built (YAGNI)**:
- Multiple simultaneous providers
- Model comparison tools
- Execution history persistence (deferred to future spec per FR-033)

### Principle 4: Dolphin-Based Development

✅ **Full Compliance**

**Implementation Strategy**:
- 79 tasks across 11 phases with frequent surface points
- Each phase designed to deliver testable capability
- Surface after every 5-10 tasks maximum

**Surface Points Delivered**:
- Phase 1: Database schema testable via migrations
- Phase 2: Configuration API testable via curl
- Phase 3: Frontend settings page testable in browser
- Phase 4: Pricing system testable via API endpoint
- Phase 5: Execution API testable via curl
- Phases 6-11: Full UI flow testable in browser

**Success Metric**: At end of each phase, stakeholder could test new capability

---

## Approved Complexity Deferrals

### From Spec 002-make-a-call

**Library Extraction** (Architecture Principle 2)
- **Decision**: Keep code in packages (frontend/backend) for first iteration
- **Rationale**: Premature to extract libraries without clear pattern reuse
- **Revisit**: After 2-3 specs, evaluate common patterns for extraction
- **Approved**: 2025-11-07

**Frontend Logs → Backend** (Visibility Principle 1)
- **Decision**: Frontend logs to browser console only (no backend persistence)
- **Rationale**: Local development tool - browser DevTools sufficient for debugging
- **Revisit**: If users request centralised logging across sessions
- **Approved**: 2025-11-07

**Execution History Persistence** (from FR-033)
- **Decision**: Display-only for most recent execution (no database persistence)
- **Rationale**: Simplifies first iteration, focus on core execution workflow
- **Future Spec**: Execution history with filtering/pagination/search
- **Approved**: 2025-11-07 (per spec requirements)
