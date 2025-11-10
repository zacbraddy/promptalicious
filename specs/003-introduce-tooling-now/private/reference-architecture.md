# Reference Project Architecture

**Location**: `../../subly/subly-media-service/`
**Purpose**: Understanding existing tool implementation patterns for promptalicious

## Project Structure

The reference project is a media accessibility analysis service that uses LLM-powered tools to check WCAG compliance.

### Relevant Components

#### 1. Tool Schema Definitions
**Location**: `src/processors/accessibility-processor/types/llm-tools.ts`

- Tool schemas defined using Zod
- Separate `parameters` and `response` schemas for each tool
- Type inference from schemas for TypeScript types
- Tools grouped by domain (text contrast, flash detection)

**Example Tool Schema**:
```typescript
export const detectTextInFrameSchema = z.object({
  parameters: z.object({
    frameNumber: z.number().int().min(0).describe("Frame number to analyse")
  }),
  response: z.object({
    textRegions: z.array(...),
    frameNumber: z.number().int().min(0),
    detectionCount: z.number().int().min(0)
  })
});
```

#### 2. Tool Factory Functions
**Location**: `src/processors/accessibility-processor/llm-tools/[domain].ts`

Tool factories create Vercel AI SDK tool instances with:
- Description for LLM understanding
- Input schema from Zod definitions
- Execute function with typed parameters
- Access to execution context and service dependencies

**Example Tool Factory**:
```typescript
export function createDetectTextInFrameTool(
  context: IExecutionContext,
  tesseract: ITesseractClient
) {
  return tool({
    description: "Detect and extract text regions...",
    inputSchema: detectTextInFrameSchema.shape.parameters,
    execute: async (params: DetectTextInFrameParams): Promise<DetectTextInFrameResponse> => {
      // Implementation uses context and service
    }
  });
}
```

#### 3. Execution Context
**Location**: `src/processors/accessibility-processor/stages/execution-context-building.stage.ts`

Pre-computed execution context containing:
- Job metadata
- Extracted frame data (paths, timestamps)
- Video metadata (duration, fps, frame count)
- Service instances (OpenCV, Tesseract, WCAG)

#### 4. Tool Setup
**Location**: `src/processors/accessibility-processor/checks/types/accessibility-checker.base.ts`

Tools are instantiated in `_setupLLMTools()`:
```typescript
protected _setupLLMTools(context: IExecutionContext) {
  return {
    detect_text_in_frame: createDetectTextInFrameTool(context, this.tesseract),
    calculate_contrast_ratio: createCalculateContrastRatioTool(context, this.opencv, this.wcag),
    // ... more tools
  };
}
```

#### 5. LLM Call with Tools
**Location**: `src/processors/accessibility-processor/checks/text-contrast.check.ts`

```typescript
const result = await SublyAi.generateObject({
  schema: textContrastViolationsResponseSchema,
  messages: [
    { role: "system", content: systemPrompt },
    { role: "user", content: `Analyse the video...` }
  ],
  tools,
  maxTokenBudget: llmConfig.maxTokensPerVideo,
  maxRetries: 2
});
```

## Key Patterns

### 1. Separation of Concerns
- **Schema definitions**: Pure type definitions (types/llm-tools.ts)
- **Tool factories**: Business logic (llm-tools/[domain].ts)
- **Tool setup**: Dependency injection (accessibility-checker.base.ts)
- **Execution**: Orchestration (checks/[check-name].check.ts)

### 2. Dependency Injection
- Tools receive execution context at creation
- Service dependencies (OpenCV, Tesseract) injected by base class
- Allows pre-computation and caching

### 3. Pre-execution Setup
- **Media gathering stage**: Download/prepare media files
- **Execution context stage**: Extract frames, build metadata
- **Check execution stage**: Run LLM with tools against prepared context

## Challenges for Promptalicious Integration

### 1. External Dependencies
Reference tools depend on:
- ffmpeg for frame extraction
- Tesseract for OCR
- OpenCV for image analysis
- Pre-extracted frames accessible via file paths

### 2. Execution Context Requirements
Tools assume a rich execution context with:
- Frame extraction already complete
- Service instances already initialised
- Video metadata pre-computed

### 3. Schema Conformance
To use reference tools directly would require:
- Conforming to IExecutionContext interface
- Providing ITesseractClient, IOpenCVClient implementations
- Running pre-processing pipelines

## Integration Approaches

### Approach 1: Direct Import (High Coupling)
**Pros**: Zero duplication, works immediately
**Cons**: Forces promptalicious schema on user codebases

### Approach 2: Copy & Adapt (Low Coupling)
**Pros**: Users control their schemas
**Cons**: Manual synchronisation, duplication

### Approach 3: Symlink Project (Medium Coupling)
**Pros**: Changes reflected in source, no duplication
**Cons**: Requires filesystem setup, complex tooling

**User's preference**: Approach 3 (symlink) mentioned as potentially best option
