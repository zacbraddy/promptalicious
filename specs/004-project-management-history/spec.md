# Feature Specification: Project Management & Execution History

**Feature Number**: 004
**Created**: 2025-11-10
**Status**: Requirements Captured (Planning Deferred)
**Depends On**: Feature 003 (Core Tool Integration System)

---

## ⚡ Quick Guidelines
- ✅ Focus on WHAT users need and WHY
- ❌ Avoid HOW to implement (no tech stack, APIs, code structure)
- 👥 Written for business stakeholders, not developers

---

## Product Vision

This feature transforms promptalicious from a single-session iteration tool into a multi-project workspace with full execution history. Users can:
1. Manage multiple promptalicious projects pointing to same or different codebases
2. Track complete history of all executions with full parameter snapshots
3. Replay any historical execution with exact same configuration
4. Organize executions with names and favourites
5. Switch between projects for parallel experimentation

---

## User Scenarios & Testing

### Primary User Story

As a developer iterating on multiple LLM configurations, I want to manage multiple promptalicious projects, track all my execution attempts with their parameters, and easily replay successful configurations, so that I can experiment without losing working setups and compare results across different approaches.

### Acceptance Scenarios

1. **Given** I am working in promptalicious, **When** I access the project selector in the nav bar, **Then** I should see a list of all my projects and be able to create a new project or switch to an existing one

2. **Given** I am creating a new project, **When** I provide a project name and configure the target codebase path, **Then** promptalicious should create a new project configuration and switch to it, performing tool discovery from the configured codebase

3. **Given** I have multiple projects pointing to the same codebase, **When** I switch between projects, **Then** each project should maintain its own independent tool configurations, prompt settings, and execution history

4. **Given** I execute a prompt with specific parameters, **When** the execution completes, **Then** the system should automatically save a snapshot including all parameters (system prompt, tool configs, AI SDK options, hook file contents, tool file contents) with an ISO timestamp name

5. **Given** I have execution history, **When** I view the execution history list, **Then** I should see all past executions ordered by timestamp, with user-given names displayed instead of timestamps where provided, and favourited executions grouped at the top

6. **Given** I want to rename an execution, **When** I select an execution and provide a new name, **Then** the execution should be renamed and the new name displayed in the history list

7. **Given** I want to mark an execution as important, **When** I favourite an execution, **Then** it should move to the "Favourites" group at the top of the history list

8. **Given** I want to repeat a previous execution, **When** I select "Replay" on a historical execution, **Then** the system should load all parameters from that execution (including hook and tool file contents) and execute with those exact settings

9. **Given** I am viewing execution details, **When** I inspect a historical execution, **Then** I should see all diagnostics, parameters, and file contents from that execution exactly as they were at execution time

10. **Given** the system performs tool discovery, **When** tools are extracted from the codebase, **Then** the tool definitions, schemas, and default values should be cached in the database to avoid re-parsing on subsequent loads

### Edge Cases

- What happens when I switch projects during an active execution?
  - Execution continues in the background, results saved to original project's history

- What happens when I delete a project with execution history?
  - System warns user, requires confirmation, deletes project config and all associated execution history

- What happens when I try to replay an execution but the hooks/tools have been modified?
  - System restores exact file contents from historical snapshot, potentially overwriting current workspace files (with warning)

- What happens when database cache becomes stale (codebase updated)?
  - Feature 005 addresses this with reset functionality; for now, cache is used until project is deleted/recreated

- What happens when execution history grows very large?
  - System stores all executions; performance optimization deferred to future work

---

## Requirements

### Functional Requirements

#### Project Management
- **FR-001**: System MUST provide a project selector UI component in navigation bar

- **FR-002**: Users MUST be able to create new projects by providing:
  - Project name
  - Target codebase path (relative to promptalicious)
  - Discovery settings (inherited from Feature 003)

- **FR-003**: Users MUST be able to switch between projects via selector

- **FR-004**: Each project MUST maintain independent:
  - Tool configurations (enabled/disabled, custom descriptions)
  - Prompt settings (system prompt, user prompt)
  - AI SDK options (advanced settings)
  - Workspace directory
  - Execution history

- **FR-005**: Multiple projects MUST be able to point to the same codebase path

- **FR-006**: System MUST perform tool discovery when new project is created

- **FR-007**: Users MUST be able to delete projects with confirmation prompt

#### Database-Backed Caching
- **FR-008**: System MUST store discovered tool definitions in database including:
  - Tool name, description, parameter schema
  - Execute function code
  - Detected hook parameters
  - Source file location
  - Timestamp of discovery

- **FR-009**: System MUST retrieve cached tool definitions on project load instead of re-parsing codebase

- **FR-010**: System MUST cache project configuration in database:
  - Project name
  - Target codebase path
  - Discovery settings
  - Workspace location
  - Creation timestamp

#### Execution History
- **FR-011**: System MUST automatically save complete execution snapshot after each execution including:
  - All execution diagnostics (from Feature 003)
  - System prompt
  - User prompt
  - Tool configurations (enabled state, custom names/descriptions)
  - AI SDK options
  - Hook file contents (beforeAll, beforeEach, afterEach, afterAll)
  - Tool file contents (execute functions)
  - Execution timestamp (ISO format)
  - Association with parent project

- **FR-012**: System MUST display execution history in chronological order (newest first)

- **FR-013**: Executions MUST be named with ISO timestamp by default

- **FR-014**: Users MUST be able to rename executions to custom names

- **FR-015**: Users MUST be able to favourite executions

- **FR-016**: Favourited executions MUST be grouped at top of history list

- **FR-017**: System MUST display execution history filtered by current project (only show executions for active project)

#### Execution Replay
- **FR-018**: Users MUST be able to replay any historical execution

- **FR-019**: Replay MUST restore exact execution parameters including:
  - System prompt
  - User prompt
  - Tool configurations
  - AI SDK options
  - Hook file contents (overwriting current workspace files, if the user has selected to do so, they should be given the option sometimes the user might want to not overwrite the implementation in some instances)
  - Tool file contents (overwriting current workspace files, if the user has selected to do so, they should be given the option sometimes the user might want to not overwrite the implementation in some instances)

- **FR-020**: System MUST warn user before overwriting workspace files during replay

- **FR-021**: Replayed execution MUST create a new execution history entry (not overwrite the original)

- **FR-022**: Users MUST be able to view full details of any historical execution including all diagnostics and parameters

### Key Entities

#### Project
- **What it represents**: A promptalicious workspace for iterating on a specific configuration
- **Key attributes**:
  - Unique identifier
  - Project name
  - Target codebase path
  - Discovery settings
  - Workspace directory path
  - Creation timestamp
  - Last accessed timestamp
  - Associated tool definitions (cached)
  - Associated execution history

#### Execution Snapshot
- **What it represents**: Complete state of a single execution for replay
- **Key attributes**:
  - Unique identifier
  - Associated project
  - Execution timestamp (ISO format)
  - User-provided name (optional, defaults to timestamp)
  - Favourite flag
  - System prompt
  - User prompt
  - Tool configurations (name, description, enabled state per tool)
  - AI SDK options (all advanced settings)
  - Hook file contents (all four hook types)
  - Tool file contents (execute functions)
  - Execution diagnostics (from Feature 003: tool invocations, tokens, timing, costs, errors)

#### Cached Tool Definition
- **What it represents**: Database-stored tool metadata to avoid re-parsing
- **Key attributes**:
  - Unique identifier
  - Associated project
  - Tool name (from source)
  - Tool description (from source)
  - Parameter schema (from source)
  - Execute function code (from source)
  - Detected hook parameters
  - Source file path
  - Discovery timestamp
  - Relationship to project

---

## Scope Boundaries

### In Scope (Feature 004)
✅ Multi-project support with project selector
✅ Database-backed caching of tool definitions and configurations
✅ Complete execution history tracking
✅ Rename and favourite executions
✅ Replay any historical execution
✅ Per-project workspace isolation
✅ View historical execution details

### Out of Scope (Deferred to Feature 005 or Beyond)
❌ Reset functionality (soft/hard reset to fresh state)
❌ Reset to specific historical execution
❌ AI-assisted export
❌ Execution history search/filtering (beyond project-level filtering)
❌ Execution comparison tools
❌ Export execution history
❌ Database cleanup/archival tools

---

## Dependencies

- **Feature 003**: Core Tool Integration System must be complete
  - Requires workspace directory structure
  - Requires tool configuration data model
  - Requires execution diagnostics data model
  - Requires hook and tool file management

---

## Next Steps

1. ⏸️ **Planning deferred** until Feature 003 is complete
2. ⏸️ Run `/plan` to generate implementation design when ready
3. ⏸️ Generate tasks from plan
4. ⏸️ Begin implementation

---

## Design Constraints

- Must integrate with Feature 003's workspace management
- Must extend Feature 003's configuration system
- Must maintain retrofuturistic dark theme (shadcn/ui + Tailwind)
- Database schema must support efficient project switching
- Must preserve page refresh recovery capability
- Must not degrade performance with large execution histories (reasonable limits)

---

## Notes

This spec captures requirements only. Planning and task generation will occur after Feature 003 is implemented and validated.

The database-backed caching introduced here provides the foundation for Feature 005's reset functionality.
