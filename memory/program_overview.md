# Program Overview

**Last Updated**: 2025-11-04
**Source**: Consolidated from CLAUDE.md and spec 001-project-scaffold-i

This document captures the business context, product vision, and user value proposition for promptalicious.

---

## Project Mission

promptalicious is a local development tool for debugging and iterating LLM prompts and tool configurations.

**Core Purpose**:
Enable developers to:
- Configure LLM calls (prompts, tools, system messages)
- Execute calls and observe results with full diagnostics
- Iterate rapidly to achieve reliable, repeatable LLM behaviour
- Translate working configurations into production code with minimal friction

**First Target**: Debug and iterate multistep, tool-enabled calls to GPT-4o-mini using Vercel AI SDK.

**Source**: CLAUDE.md § Project Mission, memory/constitution.md
**Established**: 2025-11-03

---

## User Value Proposition

### Primary User Story

As a developer building LLM-powered features, I need to:
1. **Configure** prompts, tools, and system messages in a visual interface
2. **Execute** LLM calls and see full diagnostic information
3. **Iterate** rapidly on configurations to achieve reliable behaviour
4. **Export** working configurations to production code

**Why this matters**:
- LLM behaviour is opaque - without visibility into prompts, tool calls, and responses, debugging is guesswork
- Iteration cycles are slow when configuration changes require code rebuilds
- Translating "what worked in testing" into production code is error-prone

**Source**: memory/constitution.md § Project Mission
**Established**: 2025-11-03

---

## Product Vision

### Phase 1: GPT-4o-mini Debugging Interface (Current)

**Scope**:
- Web-based local tool (frontend + backend)
- Configure and execute calls to GPT-4o-mini via Vercel AI SDK
- Full visibility into prompts, tools, tokens, responses, execution time
- Save and load configurations for iteration

**Success Criteria**:
- Developers can debug multistep, tool-enabled GPT-4o-mini calls
- All LLM interactions are fully observable
- Configuration changes are immediate (no rebuild required)
- Working configurations can be exported to production code

**Source**: spec 001-project-scaffold-i § User Scenarios & Testing
**Established**: 2025-11-04

### Future Phases (Speculative)

**Phase 2: Multi-Model Support**
- Support for Claude, Gemini, other LLM providers
- SDK abstraction layer for consistent interface

**Phase 3: Advanced Tooling**
- Tool schema validation
- Tool execution simulation
- Performance profiling (token usage, latency)

**Phase 4: Team Collaboration**
- Share configurations across team
- Version control integration
- Configuration diffing

*Note: Future phases are aspirational and subject to change based on user feedback and market validation.*

---

## Target Audience

**Primary**: Software developers building LLM-powered applications

**Characteristics**:
- Familiar with JavaScript/TypeScript ecosystems
- Working with LLM APIs (OpenAI, Anthropic, etc.)
- Need to debug complex prompt/tool configurations
- Value visibility and rapid iteration

**Not For**:
- Non-technical users (no GUI prompt building for non-developers)
- Production monitoring (this is a development tool, not observability platform)
- Model training/fine-tuning (focused on prompt engineering, not model development)

**Source**: memory/constitution.md § Project Mission
**Established**: 2025-11-03

---

## Competitive Landscape

*To be filled when competitive analysis is performed*

Potential competitors:
- LangChain UI tools
- Prompt engineering playgrounds (OpenAI Playground, etc.)
- Custom internal tools at larger companies

**Differentiation** (hypothesis):
- Local-first (no data sent to third parties beyond LLM providers)
- Code-first (configurations export to production code)
- Developer-focused (not trying to abstract complexity for non-technical users)
- Observability-first (visibility into every aspect of LLM interactions)

---

## Business Model

*Not applicable - this is an open-source development tool*

Future considerations (if project grows):
- Potential commercial hosted version for teams
- Enterprise support/training
- Integration with commercial LLM platforms

---

## Success Metrics

### Development Metrics (Current)

- Quality gates passing (typecheck, lint, format, test)
- Dolphin surfacing compliance (working software after each task)
- Constitutional adherence (visibility, good architecture, focused flexibility)

### Product Metrics (Future)

*To be defined when product launches:*
- Active users
- Configurations created/exported
- LLM calls debugged
- Time saved vs manual debugging
- User satisfaction (NPS or similar)

**Source**: memory/constitution.md § Dolphin-Based Development
**Established**: 2025-11-04

---

## Project Status

**Current Phase**: Foundation (spec 001-project-scaffold-i complete)
**Next Phase**: Feature specification for first iteration (GPT-4o-mini debugging interface)

**Completed**:
- ✅ Constitution ratified (v1.1.0)
- ✅ Development protocols established
- ✅ Monorepo scaffolding complete
- ✅ Shared infrastructure package created
- ✅ Quality gates configured

**Next Steps**:
1. Install Serena MCP for semantic code analysis
2. Begin feature specification for GPT-4o-mini debugging interface
3. Run `/specify` to create first feature spec

**Source**: CLAUDE.md § Active Spec Progress
**Last Updated**: 2025-11-04
