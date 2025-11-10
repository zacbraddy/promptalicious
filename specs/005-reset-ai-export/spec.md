# Feature Specification: Reset Functionality & AI-Assisted Export

**Feature Number**: 005
**Created**: 2025-11-10
**Status**: Requirements Captured (Planning Deferred)
**Depends On**: Feature 004 (Project Management & Execution History)

---

## ⚡ Quick Guidelines
- ✅ Focus on WHAT users need and WHY
- ❌ Avoid HOW to implement (no tech stack, APIs, code structure)
- 👥 Written for business stakeholders, not developers

---

## Product Vision

This feature provides power-user capabilities for managing project state and enhancing export workflows:
1. Reset projects to fresh state (from cache or live codebase)
2. Reset to specific historical execution configuration
3. AI-assisted export that generates bespoke refactoring instructions
4. Quality-aware export with model capability warnings

---

## User Scenarios & Testing

### Primary User Story

As a power user iterating on LLM configurations, I want to reset my project state to start fresh or return to a previous configuration, and receive AI-generated export instructions tailored to my actual codebase, so that I can recover from mistakes quickly and apply working configurations back to my project with minimal manual translation.

### Acceptance Scenarios

#### Reset Functionality

1. **Given** I have modified tool configurations and workspace files, **When** I select "Soft Reset to Default", **Then** the system should restore tool configurations and workspace files to the cached values from initial discovery (stored in database) without re-parsing the codebase

2. **Given** I have made changes to my target codebase since creating the project, **When** I select "Hard Reset", **Then** the system should re-parse the live codebase, update cached values, and regenerate workspace files with current codebase state

3. **Given** I am performing a hard reset with modified workspace files, **When** I confirm the action, **Then** the system should warn me that gitignored workspace files will be permanently lost and cannot be recovered

4. **Given** I want to return to a previous configuration, **When** I select "Reset to This Execution" on a historical execution, **Then** the system should restore all tool configurations and workspace files to match that execution's snapshot (soft reset from history)

5. **Given** I want to reset my configuration UI to defaults, **When** I select "Reset Configuration Only", **Then** only frontend settings (tool names, descriptions, AI SDK options) should reset to cached defaults, leaving workspace files unchanged

6. **Given** I want to reset workspace files without affecting configuration, **When** I select "Reset Workspace Only", **Then** only workspace files (hooks, tool implementations) should be regenerated from cache, leaving frontend configuration unchanged

#### AI-Assisted Export

7. **Given** I have completed iterating on my configuration, **When** I click "Export Instructions" with Basic mode selected, **Then** I should receive code-generated export instructions (Feature 003 behaviour)

8. **Given** I have completed iterating on my configuration, **When** I click "Export Instructions" with Full (AI-Assisted) mode selected, **Then** the system should use the configured LLM to generate bespoke refactoring instructions based on my actual codebase structure

9. **Given** I am viewing AI-assisted export instructions, **When** I want to see the basic version, **Then** I should be able to toggle/switch to Basic mode view without regenerating

10. **Given** AI-assisted export produces low-quality instructions, **When** I am viewing Full mode output, **Then** I should see a warning: "Accuracy limited by configured model quality. Switch to Basic mode for generic instructions."

11. **Given** I want to configure export mode preference, **When** I access settings, **Then** I should be able to select default export mode: Basic or Full (AI-Assisted)

### Edge Cases

- What happens when I hard reset during an active execution?
  - System aborts current execution, warns user, then proceeds with reset

- What happens when I soft reset but database cache is missing?
  - System falls back to hard reset behaviour, informs user cache was unavailable

- What happens when AI-assisted export fails (API error, timeout)?
  - System displays error message and automatically falls back to Basic mode export

- What happens when AI-assisted export consumes excessive tokens?
  - System enforces token budget limit (configurable), aborts if exceeded, provides Basic export

- What happens when I try to reset to a historical execution that's very old and codebase has changed significantly?
  - System restores execution state as-is; user may encounter errors on next execution if dependencies missing

---

## Requirements

### Functional Requirements

#### Reset Functionality
- **FR-001**: System MUST provide reset options accessible from project menu or settings:
  - "Soft Reset to Default"
  - "Hard Reset"
  - "Reset Configuration Only"
  - "Reset Workspace Only"

- **FR-002**: Soft Reset to Default MUST:
  - Restore tool configurations to cached database values (from initial discovery)
  - Regenerate workspace files from cached tool definitions
  - Not re-parse live codebase
  - Preserve execution history

- **FR-003**: Hard Reset MUST:
  - Re-parse live target codebase
  - Update cached tool definitions in database
  - Regenerate workspace files from new discovery
  - Update tool configurations to new source code defaults
  - Preserve execution history
  - Warn user about potential data loss for workspace files

- **FR-004**: Reset Configuration Only MUST:
  - Restore frontend settings (tool names, descriptions, enabled state, AI SDK options) to cached defaults
  - Not modify workspace files
  - Preserve execution history

- **FR-005**: Reset Workspace Only MUST:
  - Regenerate workspace files (hooks, tool implementations) from cache
  - Not modify frontend configuration settings
  - Warn user about workspace file data loss
  - Preserve execution history

- **FR-006**: System MUST provide "Reset to This Execution" action on historical executions

- **FR-007**: Reset to Historical Execution MUST:
  - Restore all frontend configuration from execution snapshot
  - Restore all workspace files from execution snapshot
  - Warn user about overwriting current state
  - Not create a new execution history entry (dry restore)

- **FR-008**: All reset operations MUST require user confirmation before proceeding

- **FR-009**: All reset operations that modify workspace files MUST warn about potential data loss for gitignored files

#### AI-Assisted Export
- **FR-010**: System MUST provide export mode setting with options:
  - "Basic" (code-generated, Feature 003 behaviour)
  - "Full" (AI-assisted)

- **FR-011**: Export mode setting MUST be stored per-user as a preference

- **FR-012**: When Full mode is selected, system MUST:
  - Use configured LLM to analyse current configuration
  - Provide codebase context (tool definitions, current state, target paths)
  - Request generation of bespoke refactoring instructions
  - Enforce token budget limit to prevent excessive costs

- **FR-013**: AI-assisted export MUST include:
  - Analysis of current vs source codebase differences
  - Specific refactoring steps for user's actual file structure
  - Code snippets adapted to user's patterns
  - Warning about dependency changes if detected

- **FR-014**: System MUST provide toggle/tab to switch between Basic and Full export views without regenerating

- **FR-015**: Full mode output MUST display warning: "Accuracy limited by configured model quality. Switch to Basic mode for generic instructions."

- **FR-016**: AI-assisted export MUST have configurable token budget limit (default: reasonable limit to be determined)

- **FR-017**: If AI-assisted export fails or exceeds token budget, system MUST automatically fall back to Basic mode and inform user

- **FR-018**: AI-assisted export MUST track token usage and cost, displaying to user after generation

### Key Entities

#### Reset Operation
- **What it represents**: A user-initiated reset action
- **Key attributes**:
  - Reset type (soft to default, hard, config only, workspace only, to historical execution)
  - Target execution snapshot (if resetting to historical execution)
  - Timestamp
  - Associated project
  - Success/failure status
  - Changes made (what was reset)

#### Export Configuration
- **What it represents**: User's export mode preferences
- **Key attributes**:
  - User identifier
  - Export mode (Basic or Full)
  - Token budget limit for AI-assisted export
  - Last AI-assisted export cost/tokens

#### AI Export Result
- **What it represents**: Generated AI-assisted export instructions
- **Key attributes**:
  - Associated execution or current project state
  - Generated instructions (markdown/formatted text)
  - Token usage (input/output)
  - Cost
  - Generation timestamp
  - Model used
  - Success/failure status

---

## Scope Boundaries

### In Scope (Feature 005)
✅ Soft reset to default (from cache)
✅ Hard reset (re-parse codebase)
✅ Config-only and workspace-only reset variants
✅ Reset to historical execution
✅ AI-assisted export with configurable mode
✅ Token budget enforcement
✅ Basic/Full export mode toggle
✅ Model quality warnings

### Out of Scope (Future Features)
❌ Undo reset operation
❌ Reset preview (show what will change before committing)
❌ Partial reset (reset specific tools only)
❌ Scheduled resets or auto-refresh
❌ Export to multiple target formats
❌ Diff view between current and reset target

---

## Dependencies

- **Feature 003**: Core Tool Integration System
  - Requires workspace management
  - Requires basic export functionality
  - Requires execution diagnostics

- **Feature 004**: Project Management & Execution History
  - Requires database-backed caching for soft reset
  - Requires execution snapshots for reset to history
  - Requires project management infrastructure

---

## Next Steps

1. ⏸️ **Planning deferred** until Feature 004 is complete
2. ⏸️ Run `/plan` to generate implementation design when ready
3. ⏸️ Generate tasks from plan
4. ⏸️ Begin implementation

---

## Design Constraints

- Must integrate with Feature 003's workspace and export systems
- Must leverage Feature 004's database caching and execution history
- AI-assisted export must provide tangible value over Basic mode
- Token budget must protect users from accidental high costs
- Reset operations must be reversible where possible (via execution history)
- Must maintain retrofuturistic dark theme (shadcn/ui + Tailwind)

---

## Notes

This spec captures requirements only. Planning and task generation will occur after Feature 004 is implemented and validated.

Reset functionality relies heavily on the database caching introduced in Feature 004. AI-assisted export represents a premium feature that justifies additional token costs by providing significantly better UX for complex codebases.
