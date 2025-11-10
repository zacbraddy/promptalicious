# Scope Change: Deferring Tool Invocation Persistence to Feature 004

**Date**: 2025-11-10
**Reason**: Avoid premature database schema for execution history that will be fully designed in Feature 004

## Decision Summary

After analysis of requirements for spec 003 vs spec 004/005, we identified that tool invocation persistence and execution history functionality was being implemented prematurely. The core need for spec 003 is **visibility and diagnostics during active execution**, not historical persistence.

### What Changed

**REMOVED from Spec 003**:
1. `tool_invocations` database table (was T003)
2. `GET /api/execute/:id/tools` API endpoint (was T026 contract test, T030 implementation)
3. Database persistence of tool invocation results
4. Separate API for fetching tool diagnostics

**NEW APPROACH for Spec 003**:
- Tool invocations collected in-memory during execution
- Returned directly in `ExecutionResult` response (extend shared-infra type with `toolInvocations?: ToolInvocationResult[]`)
- Frontend displays diagnostics from execution result object
- Matches spec 002's pattern: in-memory state, no database persistence yet

**DEFERRED to Feature 004**:
- Complete execution history with database persistence
- Tool invocation snapshots for replay
- Implementation snapshot storage (the original concern that triggered this review)
- Historical execution browsing and comparison
- Execution replay with exact parameter reproduction

## Rationale

1. **Avoid Implementation Snapshot Problem**: Original concern was missing tool implementation snapshots. Rather than guess at requirements now, defer entire history system to Feature 004 where it can be properly designed.

2. **Dolphin-Based Development**: Surface working software with minimal viable implementation. Spec 003's goal is tool integration and diagnostics visibility, not history.

3. **Reduce Spec 003 Scope**: From 65 tasks to 62 tasks by removing premature database work.

4. **No Breaking Changes Later**: Adding database persistence later won't break anything - we'll just start saving what we're already returning.

5. **Matches Spec 002 Pattern**: Execution state lives in-memory, displayed via polling. History is explicitly a future feature.

## Implementation Impact

### Tasks Modified

- **T003**: REMOVED (tool_invocations table) - replaced with scope decision note
- **T026**: REMOVED (contract test GET /api/execute/:id/tools) - replaced with scope decision note
- **T029**: MODIFIED - collect tool invocations in-memory, return in ExecutionResult
- **T030**: REMOVED (implement GET /api/execute/:id/tools) - no longer needed
- **T050**: MODIFIED - display tool invocations from ExecutionResult, not separate API call
- **T056**: MODIFIED - integration test verifies in-memory diagnostics, not database persistence
- **T062**: MODIFIED - API docs show ExecutionResult.toolInvocations, not separate endpoint
- **T063**: MODIFIED - database docs exclude tool_invocations table

### Task Renumbering

All tasks T004-T065 renumbered to T003-T064 (total: 62 tasks, down from 65)

### Type Changes

**`packages/shared-infra/src/types/api.ts`** - Extend ExecutionResult:
```typescript
export interface ExecutionResult {
  id: string;
  promptExecutionId: string;
  responseText: string;
  inputTokenCount: number;
  outputTokenCount: number;
  totalTokenCount: number;
  executionDurationMs: number;
  estimatedCostGBP: number;
  // NEW: In-memory tool invocation diagnostics
  toolInvocations?: ToolInvocationResult[];
}

export interface ToolInvocationResult {
  toolId: string;
  toolName: string;
  timestamp: Date;
  inputParams: unknown;
  output: unknown;
  executionDurationMs: number;
  inputTokens: number | null;
  outputTokens: number | null;
  success: boolean;
  errorType: string | null;
  errorMessage: string | null;
  errorStack: string | null;
  llmReasoning: string | null;
  debugOutput: DebugMessage[];
}
```

### Database Schema

**Tables in Spec 003**:
1. `project_configuration` (T001) ✅
2. `tools` (T002) ✅

**Tables DEFERRED to Spec 004**:
1. `tool_invocations` ❌ (was T003)
2. `execution_results` extensions ❌ (toolInvocationCount, etc. - not needed if no history)

## Feature 004 Impact

Feature 004 (Project Management & Execution History) spec already covers execution history requirements. This deferral simply clarifies that ALL execution history (including tool invocations) belongs in Feature 004, not split across 003 and 004.

**Feature 004 will add**:
- Complete `execution_history` table with full snapshots
- Tool invocation history with implementation snapshots
- Execution replay with historical parameter restoration
- Project-scoped execution browsing

## Documentation Updates Needed

Files requiring updates to reflect this scope change:

1. ✅ `specs/003-introduce-tooling-now/tasks.md` - Remove/modify affected tasks
2. ⏳ `specs/003-introduce-tooling-now/data-model.md` - Remove tool_invocations entity, update ExecutionResult
3. ⏳ `specs/003-introduce-tooling-now/plan.md` - Update scope and task counts
4. ⏳ `specs/003-introduce-tooling-now/quickstart.md` - Update examples to show in-memory diagnostics
5. ⏳ `specs/004-project-management-history/spec.md` - Add note about deferred spec 003 work
6. ⏳ `specs/005-reset-ai-export/spec.md` - Verify no conflicts with deferred work

## Testing Strategy

**Spec 003 Tests**:
- Contract tests verify ExecutionResult includes toolInvocations array
- Integration tests verify in-memory collection and return
- Frontend tests verify display from execution result object

**Spec 004 Tests**:
- Will add database persistence tests
- Will add historical execution retrieval tests
- Will add implementation snapshot tests

---

**Status**: Scope change documented, implementation in progress
**Next**: Update remaining spec files (data-model.md, plan.md, quickstart.md)
