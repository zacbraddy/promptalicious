# Project Overview: promptalicious

## Purpose
Promptalicious is a local development tool for debugging and iterating LLM prompts with full diagnostic visibility. The goal is to enable developers to configure, execute, and iterate on LLM calls with comprehensive diagnostics, then translate working configurations into production code.

**First Target**: Debug multistep, tool-enabled calls to GPT-4o-mini using Vercel AI SDK

## Key Features
- Execute system prompts against LLMs (initially GPT-4o-mini)
- View comprehensive diagnostics: token counts, execution time, costs, errors
- Settings interface for API key and model configuration
- Full visibility into errors and LLM responses (no silent failures)

## User Value
- Quick iteration on prompt engineering
- Clear cost estimation before production
- Comprehensive error visibility for debugging
- Local-first tool (no external dependencies beyond LLM providers)

## Current Status
- Spec 001 (scaffold) complete ✅
- Spec 002 (make-a-call) in progress
- Settings page implemented with test connection functionality
- Backend configured with Hono API framework and DrizzleORM
