# Research: LLM Prompt Execution & Diagnostics Interface

**Date**: 2025-11-04
**Feature**: 002-make-a-call

## Research Tasks

This document consolidates technical research findings to resolve unknowns from the Technical Context and establish implementation approaches.

---

## 1. Vercel AI SDK with GPT-4o-mini

**Research Question**: How to properly configure and use Vercel AI SDK for GPT-4o-mini calls with full diagnostic capture?

**Decision**: Use Vercel AI SDK's `generateText` function with OpenAI provider

**Rationale**:
- Vercel AI SDK provides unified interface for multiple LLM providers
- Built-in token counting and usage metrics
- Native TypeScript support with type-safe responses
- Automatic error handling and retries
- Direct OpenAI provider support for GPT-4o-mini

**Key Implementation Details**:
```typescript
import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'

const result = await generateText({
  model: openai('gpt-4o-mini'),
  prompt: userPrompt,
})

// Available diagnostic data:
// - result.text (response)
// - result.usage.promptTokens
// - result.usage.completionTokens
// - result.usage.totalTokens
// - timing data (measure externally)
```

**Alternatives Considered**:
- Direct OpenAI SDK: More control but loses Vercel AI SDK's provider abstraction
- LangChain: Too heavy for simple LLM calls, adds unnecessary complexity

**Integration Points**:
- Backend API endpoint receives prompt, calls generateText, returns result + diagnostics
- Error handling captures all failure modes (auth, network, API limits, etc.)
- Environment variable for OpenAI API key

**References**: Vercel AI SDK documentation (need Context7 lookup during implementation)

---

## 2. shadcn/ui Setup and Component Strategy

**Research Question**: How to efficiently integrate shadcn/ui into Vite + React project for rapid UI development?

**Decision**: Use shadcn/ui CLI to install individual components on-demand

**Rationale**:
- shadcn/ui is not an npm package - components are copied into your project
- Full customization and ownership of component code
- Built on Radix UI primitives (accessibility out of the box)
- Tailwind CSS-based styling (aligns with spec requirements)
- No runtime dependency overhead

**Key Implementation Details**:
```bash
# Initialize shadcn/ui in frontend package
npx shadcn@latest init

# Install components as needed
npx shadcn@latest add button
npx shadcn@latest add card
npx shadcn@latest add textarea
npx shadcn@latest add badge
```

**Components Needed for This Feature**:
- `Card`: Container for prompt input and results
- `Button`: Execute button
- `Textarea`: System prompt input
- `Badge`: Status indicators
- `Table`: Diagnostic data display
- `Alert`: Error display

**Alternatives Considered**:
- Raw Radix UI: More work to style, shadcn provides good defaults
- Material UI / Ant Design: Too opinionated, harder to achieve retrofuturistic aesthetic
- Custom components from scratch: Would violate "quick wins" constraint

**Integration Points**:
- Components live in `packages/frontend/src/components/ui/`
- Customize theme colors in `tailwind.config.js` for retrofuturistic palette
- Use composition to build prompt execution and results cards

**References**: shadcn/ui documentation (need Context7 lookup during implementation)

---

## 3. Tailwind CSS Dark Mode and Retrofuturistic Theme

**Research Question**: How to implement dark mode with custom retrofuturistic colour palette?

**Decision**: Configure Tailwind CSS v4 with custom colour scheme directly in `:root` CSS variables

**Rationale**:
- Spec requires dark mode as default and only theme (not toggle)
- Project uses Tailwind CSS v4 with inline configuration via `@theme inline` directive
- Custom colours defined in CSS variables (not JavaScript config file)
- shadcn/ui respects CSS variable-based theming

**Colour Palette** (per spec: soft greys, muddy blacks, cyan and magenta accents):
- Background: Muddy blacks (`oklch(0.04 0 0)` = #0a0a0a, `oklch(0.1 0 0)` = #1a1a1a)
- Foreground: Soft greys (`oklch(0.69 0 0)` = #b0b0b0, `oklch(0.4 0 0)` = #666666)
- Primary (Cyan accent): `oklch(0.66 0.14 196)` = subdued cyan (#00CED1)
- Accent (Magenta): `oklch(0.68 0.16 320)` = subdued magenta (#B565D8)

**Key Implementation Details (T032)**:
- Dark theme colours defined directly in `:root` CSS variables in `index.css`
- **NO** `class="dark"` on HTML element (dark mode is the only mode, not a variant)
- Map custom colours to shadcn's semantic colour variables (primary, secondary, accent, etc.)
- Use OKLCH colour space for better perceptual uniformity
- This is the core and only colour palette for the application

**Alternatives Considered**:
- Class-based dark mode (`.dark` selector): Unnecessary complexity for single-theme app
- System preference dark mode: Spec says dark mode is default, no toggle needed
- JavaScript config file: Tailwind v4 uses CSS-based configuration

**Integration Points**:
- `packages/frontend/src/index.css` defines all theme colours in `:root`
- `@theme inline` directive maps CSS variables to Tailwind utilities
- Components use Tailwind utility classes

**References**: Tailwind CSS dark mode documentation, shadcn theming guide

---

## 4. PostgreSQL Schema Design for Configuration

**Research Question**: How to structure PostgreSQL schema for LLM configuration, pricing cache, and future execution history?

**Decision**: Simple normalized schema with migrations managed by dedicated migration tool

**Rationale**:
- Spec requires persistent configuration (FR-022)
- Pricing cache needed to avoid per-call API lookups (FR-025a)
- Schema must support future features (execution history deferred to future spec)
- Migrations enable safe schema evolution

**Initial Schema**:

```sql
-- LLM Configuration (single-user, single-row table)
CREATE TABLE llm_config (
  id INTEGER PRIMARY KEY DEFAULT 1,
  model VARCHAR(255) NOT NULL DEFAULT 'gpt-4o-mini',
  api_key_encrypted TEXT NOT NULL,
  provider_endpoint VARCHAR(255),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT single_config CHECK (id = 1)
);

-- Pricing Information Cache
CREATE TABLE pricing_info (
  id SERIAL PRIMARY KEY,
  model VARCHAR(255) NOT NULL,
  provider VARCHAR(255) NOT NULL,
  input_token_price_usd DECIMAL(12, 10) NOT NULL,
  output_token_price_usd DECIMAL(12, 10) NOT NULL,
  last_updated TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(model, provider)
);

-- Exchange Rates (for GBP conversion per FR-027)
CREATE TABLE exchange_rates (
  id SERIAL PRIMARY KEY,
  from_currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  to_currency VARCHAR(3) NOT NULL DEFAULT 'GBP',
  rate DECIMAL(10, 6) NOT NULL,
  last_updated TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(from_currency, to_currency)
);
```

**Migration Tool Decision**: Use dedicated Node.js migration tool compatible with TypeScript/ESM

**Alternatives Considered**:
- Prisma: Full ORM might be overkill, but provides excellent migration + type safety story
- node-pg-migrate: Popular, but not as TypeScript-friendly
- Knex.js: Migration + query builder, middle ground
- Custom SQL migration scripts: Simple but lacks tracking and rollback

**Recommended Approach**: Evaluate Prisma vs node-pg-migrate during implementation (Context7 lookup for latest best practices)

**Integration Points**:
- Backend connects to PostgreSQL via environment variables (host, port, database, user, password)
- Migration runs on backend startup (or separate migration command)
- Configuration accessed via simple query (single-row table pattern)
- Pricing cache updated on backend startup via external API lookup

**Security Considerations**:
- API keys must be encrypted at rest (use crypto module or dedicated library)
- Connection string must not be committed to repository
- Use `.env` file for local development, document setup in quickstart

**References**: PostgreSQL best practices, Node.js database libraries (Context7 lookup needed)

---

## 5. API Pricing Lookup Strategy

**Research Question**: How to fetch and cache LLM pricing data per spec requirements (FR-025)?

**Decision**: Lookup pricing on backend startup, store in database, fallback to cached value on failure

**Rationale**:
- Spec clarifies: lookup on startup, not per-call (from clarifications)
- Pricing changes infrequently, startup lookup is sufficient
- Database cache provides fallback when API unavailable
- Avoids API rate limits from per-call lookups

**Pricing Data Sources** (research during implementation):
- OpenAI Pricing API (if available)
- Hardcoded fallback for GPT-4o-mini (document in code comments)
- Future: Support multiple providers via pluggable pricing adapters

**Implementation Flow**:
1. Backend startup: Attempt live pricing API call
2. Success: Update `pricing_info` table with new values
3. Failure: Log warning, use last successful cached value
4. If no cache exists: Use hardcoded fallback (documented in code)

**Exchange Rate Lookup**:
- Similar strategy for USD → GBP conversion (FR-027)
- Use free exchange rate API (e.g., exchangerate-api.io)
- Cache and fallback pattern identical to pricing lookup

**Staleness Indication** (FR-028):
- Track `last_updated` timestamp in database
- Display warning in UI if pricing data > 7 days old
- Provide "Refresh Pricing" option in settings (future enhancement)

**Alternatives Considered**:
- Per-call pricing lookup: Violates clarified requirements, would be slow and rate-limited
- Static pricing in code: Becomes stale quickly, requires code changes to update

**Integration Points**:
- Backend service initializes pricing cache on startup
- API endpoint returns pricing data with staleness indicator
- Frontend displays warning if pricing is stale

**References**: OpenAI pricing documentation, exchange rate API providers (Context7/web search during implementation)

---

## 6. React State Management for Async LLM Calls

**Research Question**: How to manage loading states, results, and errors for LLM execution in React?

**Decision**: Use React built-in hooks (`useState`, `useEffect`) for this feature, no external state library

**Rationale**:
- Single screen with simple state (prompt input, execution state, results, errors)
- No complex state sharing between components (yet)
- Spec emphasizes quick wins over perfect architecture
- External libraries (Zustand, Redux) add unnecessary complexity at this stage

**State Structure**:
```typescript
const [prompt, setPrompt] = useState('')
const [isExecuting, setIsExecuting] = useState(false)
const [result, setResult] = useState<ExecutionResult | null>(null)
const [error, setError] = useState<Error | null>(null)

interface ExecutionResult {
  response: string
  diagnostics: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
    executionTimeMs: number
    estimatedCostGBP: number
  }
}
```

**Loading State Management** (FR-003, FR-004):
- `isExecuting` controls button disabled state
- Visual spinner/indicator shown during execution
- Prompt text remains in input during execution (FR-001a)

**Error Handling** (FR-015 - FR-019):
- Catch all errors from API call
- Store in error state for display
- Clear error state on new execution
- Maintain visibility until user takes action

**Alternatives Considered**:
- Zustand: Excellent library but premature for single-component state
- React Query / SWR: Designed for data fetching, but this is one-off execution not caching scenario
- Redux: Massive overkill

**Future Considerations**:
- When adding execution history (future spec), consider React Query for server state management
- When adding real-time streaming responses, consider state machine library (XState)

**Integration Points**:
- Prompt execution component manages all state
- API calls via `fetch` or `axios` (decide during implementation)
- Error boundaries for catastrophic failures

**References**: React documentation, async patterns in React (Context7 lookup if needed)

---

## 7. Database Migration Strategy

**Research Question**: Which migration tool best fits TypeScript + PostgreSQL in this project?

**Decision**: DrizzleORM (confirmed via Context7 research 2025-11-04)

**Options to Evaluate**:

**Option A: DrizzleORM**
- Pros:
  - Lightweight and performant (minimal overhead)
  - SQL-like TypeScript syntax (feels like writing SQL, not learning an abstraction)
  - Excellent TypeScript inference (types derived from schema, not generated)
  - Built-in migration system (`drizzle-kit`)
  - No build step required (pure TypeScript)
  - Schema as code (version controlled, declarative)
  - Supports raw SQL when needed for complex queries
- Cons:
  - Younger ecosystem compared to Prisma/TypeORM
  - Smaller community (fewer Stack Overflow answers)
  - Less mature tooling ecosystem
- Best for:
  - Projects valuing performance and TypeScript-first approach
  - Teams comfortable with SQL who want type safety without abstraction overhead
  - Greenfield projects where you control the schema from day one

**Option B: Prisma**
- Pros:
  - Mature ecosystem with extensive documentation
  - Prisma Studio (visual database browser)
  - Auto-generated types from schema
  - Excellent migration system with preview features
  - Strong community and corporate backing (Prisma Labs)
  - Great DX with extensive tooling (VS Code extension, etc.)
- Cons:
  - Full ORM abstraction (less control over generated SQL)
  - Heavier runtime (Prisma Client adds overhead)
  - Opinionated schema structure (e.g., lowercase table names by default)
  - Generated client requires build step
  - Can be "too magical" for SQL-heavy teams
- Best for:
  - Rapid development with strong type safety
  - Teams prioritising DX and tooling over raw performance
  - Projects needing visual database tools (Prisma Studio)

**Option C: TypeORM**
- Pros:
  - Mature ORM with large community
  - Decorator-based entity definitions (familiar to NestJS users)
  - Active Record and Data Mapper patterns supported
  - Migration system built-in
  - Extensive feature set (relations, transactions, etc.)
- Cons:
  - Heavier abstraction layer
  - Decorator syntax can be verbose
  - Less modern TypeScript inference (more manual typing)
  - Slower development pace compared to Drizzle/Prisma
  - Configuration can be complex
- Best for:
  - NestJS projects (tight integration)
  - Teams familiar with Active Record pattern (similar to Ruby on Rails)
  - Projects needing extensive ORM features

**Option D: node-pg-migrate**
- Pros:
  - Lightweight and simple (just migration runner)
  - Pure SQL migrations (full control)
  - No runtime overhead (no query builder)
  - Explicit and predictable
- Cons:
  - No TypeScript type generation (manual type definitions required)
  - No query builder (use raw SQL or add library like `pg`)
  - Less TypeScript-friendly migration files
- Best for:
  - Minimal abstraction, SQL-first approach
  - Teams wanting complete control over SQL
  - Projects where ORM overhead is unacceptable

**Option E: Knex.js**
- Pros:
  - Query builder + migration system (middle ground)
  - Mature library with stable API
  - TypeScript support improving
  - Familiar to many Node.js developers
- Cons:
  - Query builder syntax can be verbose
  - Not as modern as Drizzle/Prisma
  - Type inference not as strong
  - Middling DX (not as good as Prisma, not as simple as node-pg-migrate)
- Best for:
  - Teams wanting query builder without full ORM
  - Migration from legacy Knex projects

---

**Recommendation (Drizzle vs Prisma Decision Framework)**:

**Choose DrizzleORM if**:
- You value performance and minimal overhead
- Your team is comfortable writing SQL-like queries
- You want schema-as-code with strong TypeScript inference
- You prioritise simplicity and transparency over tooling
- You're building a greenfield project with full schema control

**Choose Prisma if**:
- You prioritise developer experience and tooling
- Your team prefers abstraction over raw SQL
- You want visual database tools (Prisma Studio)
- You need extensive documentation and community support
- You value mature ecosystem over cutting-edge performance

**For promptalicious specifically**:
- Schema is simple (6 tables, straightforward relationships)
- Performance matters (local dev tool, should be fast)
- Team comfort: Zac is experienced developer, SQL-comfortable
- Constitution principle: "Good Architecture Without Cargo-Culting" suggests lighter option if it solves the problem
- Type safety is critical (TypeScript strict mode)

**Preliminary Lean**: DrizzleORM for performance, simplicity, and alignment with "no cargo-culting" principle. Prisma if during Context7 research we discover compelling ecosystem benefits that justify the overhead.

**Context7 Research Findings (2025-11-04)**:

**DrizzleORM Validated Strengths**:
- ✅ **Native TypeScript-first**: Schema definition in TypeScript with zero code generation required
- ✅ **SQL-like syntax**: `pgTable`, `serial`, `text`, `timestamp` etc. mirror PostgreSQL types directly
- ✅ **Migrations via drizzle-kit**: Simple `drizzle-kit push` and `drizzle-kit generate` commands
- ✅ **Programmatic migrations**: Can run migrations in code via `migrate(db, { migrationsFolder: './drizzle' })`
- ✅ **Flexible schema organisation**: Support for custom schemas via `pgSchema('mySchema')`
- ✅ **View support**: Native `pgView` and `pgMaterializedView` definitions
- ✅ **Connection flexibility**: Multiple connection adapters (node-postgres, pg-proxy, etc.)
- ✅ **Query builder integration**: Works alongside Kysely or Knex if needed
- ✅ **Type inference from schema**: No separate type generation step, types flow directly from schema definition

**Prisma Validated Strengths**:
- ✅ **Mature ecosystem**: Extensive documentation (10,408 code snippets in Context7)
- ✅ **CLI tooling**: Rich CLI with `prisma migrate dev`, `prisma generate`, `prisma studio`
- ✅ **Visual database browser**: Prisma Studio for GUI-based data management
- ✅ **Schema language**: Prisma Schema Language (PSL) - declarative but non-TypeScript
- ✅ **Generated client**: Auto-generated PrismaClient with full type safety
- ✅ **Multiple adapters**: Support for various database drivers (@prisma/adapter-pg, adapter-d1, etc.)
- ✅ **Corporate backing**: Strong support from Prisma Labs, high trust scores (10/10)

**Key Context7 Insights**:
1. **DrizzleORM Trust Score**: 7.6-9.9 (excellent but younger ecosystem)
2. **Prisma Trust Score**: 10/10 (maximum trust, mature product)
3. **Code Examples**: DrizzleORM (436-4037 snippets), Prisma (10,408+ snippets)
4. **Migration Approach**:
   - DrizzleORM: `await migrate(db, { migrationsFolder: './drizzle' })` - programmatic
   - Prisma: `npx prisma migrate dev --name init` - CLI-driven
5. **Schema Definition**:
   - DrizzleORM: Pure TypeScript schema definitions
   - Prisma: Separate `.prisma` schema file requiring code generation step

**Final Decision Rationale**:

Choosing **DrizzleORM** for the following validated reasons:

1. **Zero Build Step**: No code generation required - schema IS the types
2. **TypeScript-Native**: Aligns perfectly with project's TypeScript-first philosophy
3. **Simplicity**: Fewer moving parts - no separate schema language, no generated client to maintain
4. **Performance**: Lightweight runtime with minimal abstraction overhead
5. **SQL Transparency**: SQL-like syntax makes it clear what queries are being generated
6. **Constitution Alignment**: Embodies "Good Architecture Without Cargo-Culting" - lightweight solution that solves our needs without excess tooling
7. **Programmatic Migrations**: Can run migrations in application code, not just via CLI
8. **Greenfield Advantage**: This is a new project where we control the schema from day one

**Trade-offs Accepted**:
- Smaller community (fewer StackOverflow answers) - acceptable for experienced team
- No visual database browser - can use external tools (pgAdmin, DBeaver) if needed
- Younger ecosystem - but trust score 7.6-9.9 indicates production-ready maturity

**Action Completed**: Context7 research validates preliminary recommendation of DrizzleORM

---

## 8. Backend API Framework Selection

**Research Question**: Which Node.js API framework for backend endpoints?

**Decision**: NEEDS IMPLEMENTATION RESEARCH - Options: Hono, Fastify, Express

**Options to Evaluate**:

**Option A: Hono**
- Pros:
  - Ultra-fast and lightweight (one of the fastest frameworks)
  - Exceptional TypeScript support (type-safe routing out of the box)
  - Modern API design (clean, intuitive)
  - Edge-ready (runs on Cloudflare Workers, Deno, Bun, Node.js)
  - Built-in middleware for common tasks (CORS, JWT, etag, etc.)
  - Excellent DX with method chaining and context typing
  - Minimal dependencies
  - Zod integration for validation (aligns well with TypeScript-first approach)
- Cons:
  - Newer framework (v4 released 2024, but rapidly maturing)
  - Smaller ecosystem compared to Express
  - Fewer "how-to" articles and Stack Overflow answers
  - Less mature plugin ecosystem
- Best for:
  - Modern TypeScript-first projects
  - Teams wanting cutting-edge performance with great DX
  - Projects that might deploy to edge (Cloudflare Workers) in future
  - Greenfield APIs where learning curve is acceptable

**Option B: Fastify**
- Pros:
  - Very fast (one of the fastest Node.js frameworks)
  - Built-in schema validation (JSON Schema based)
  - Strong TypeScript support (typed plugins, routes)
  - Mature ecosystem with many plugins
  - Plugin architecture (modular, testable)
  - Good documentation
- Cons:
  - More complex than Express (plugin system has learning curve)
  - Schema validation is JSON Schema (not TypeScript native)
  - Smaller ecosystem than Express
- Best for:
  - Performance-critical APIs
  - Schema-driven development (OpenAPI generation)
  - Teams wanting modern framework with battle-tested maturity

**Option C: Express**
- Pros:
  - De facto standard (huge ecosystem)
  - Massive community (easy to find help)
  - Well-documented with countless tutorials
  - Familiar to most Node.js developers
  - Mature and stable
- Cons:
  - Older design patterns (callback-based middleware)
  - Poor TypeScript support (community types, not native)
  - Manual validation (requires additional libraries)
  - Slower than modern alternatives
  - No built-in async/await error handling
- Best for:
  - Rapid prototyping with maximum ecosystem support
  - Teams with existing Express expertise
  - Projects requiring specific Express middleware

---

**Recommendation (Hono vs Fastify Decision Framework)**:

**Choose Hono if**:
- You want the most modern TypeScript experience
- You value simplicity and clean API design
- You're comfortable being on the cutting edge
- You want the fastest possible framework
- You might deploy to edge environments in future
- You prefer Zod/TypeScript-native validation

**Choose Fastify if**:
- You need more mature ecosystem and plugins
- You prefer JSON Schema for OpenAPI generation
- You want battle-tested stability
- You need extensive plugin ecosystem
- You're less comfortable with newer frameworks

**Choose Express if**:
- You need maximum ecosystem support
- Team has strong Express expertise
- You're constrained by existing Express dependencies
- Rapid prototyping is more important than performance

**For promptalicious specifically**:
- Simple API (4 endpoints: execute, config CRUD, pricing)
- TypeScript strict mode is critical
- Constitution principle: modern stack, avoid legacy patterns
- Performance matters (local dev tool, should be fast)
- Small team = learning new framework is acceptable
- Greenfield project = no legacy constraints
- Aligns with DrizzleORM choice (both modern, TypeScript-first)

**Preliminary Lean**: **Hono** for exceptional TypeScript support, modern design, performance, and alignment with "TypeScript-first" project philosophy. This is a perfect project to try a modern framework - simple enough to learn quickly, greenfield with no legacy constraints, and the TypeScript experience will be excellent.

**Fallback**: Fastify if Context7 research reveals Hono is too immature for production use, though at v4.x it should be production-ready.

**Action Item**: Research via Context7 during Phase 1 contract design to validate Hono's readiness and explore routing patterns, middleware, and validation approaches

---

## Summary of Decisions

| Area | Decision | Rationale |
|------|----------|-----------|
| LLM SDK | Vercel AI SDK with OpenAI provider | Unified interface, built-in diagnostics, provider abstraction |
| UI Components | shadcn/ui on-demand installation | Ownership, customization, no runtime overhead |
| Styling | Tailwind CSS with custom dark theme | Aligns with spec, easy customization, shadcn integration |
| Database Schema | Normalized PostgreSQL schema | Supports configuration, pricing cache, future extensibility |
| Pricing Data Source | Web scraping with hardcoded fallback | Scrape openai.com/api/pricing on startup, fall back to hardcoded constants if scraping fails |
| Exchange Rate API | Frankfurter API (free, no key) | Completely free, open-source, reliable, simple REST API for USD→GBP |
| State Management | React built-in hooks | Sufficient for current scope, avoids premature complexity |
| API Key Storage | Plain text in PostgreSQL | Local tool (like .env files), git ignore prevents commits, no encryption needed |
| Connection Pooling | Default pooling (DrizzleORM/Prisma) | Single-user local tool, low concurrency, defaults sufficient |
| Migration Tool | Preliminary: DrizzleORM (TBD via Context7) | Lightweight, SQL-like syntax, strong TypeScript inference, aligns with "no cargo-culting" principle |
| API Framework | Preliminary: Hono (TBD via Context7) | Ultra-fast, exceptional TypeScript support, modern design, aligns with TypeScript-first project philosophy |

---

## Resolved Questions from Phase 0

1. **~~Encryption library for API keys~~**: **RESOLVED** - No encryption needed. This is a local development tool (single-user, local database). Storing API key in plain text is acceptable, just as .env files store credentials unencrypted.
   - **Critical security consideration**: API keys stored in database (not .env) to avoid accidental commit of .env files with credentials
   - **Git ignore MUST include**:
     - Database connection strings (.env files)
     - PostgreSQL data directories (if using Docker volumes, ensure volumes are not in repo)
     - Any database dump files or backups
   - **Rationale**: Storing credentials in database is ONLY safe if we ensure the database itself cannot be accidentally committed
   - **Implementation requirement**: Task must verify .gitignore includes all database-related paths

2. **~~OpenAI pricing API~~**: **RESOLVED** - OpenAI does NOT expose a programmatic pricing API, but pricing is available on their website.
   - **Primary approach**: Scrape OpenAI pricing page (https://openai.com/api/pricing/) on backend startup
     - Parse HTML/JSON to extract GPT-4o-mini pricing
     - Cache in database with timestamp
     - Retry with exponential backoff if scraping fails
   - **Fallback**: Hardcoded pricing constants if scraping fails or on first startup before successful scrape
     - Hardcoded pricing: Input $0.150 per 1M tokens, Output $0.600 per 1M tokens (as of 2025-11-04)
     - Include comment: "// Fallback pricing - last verified YYYY-MM-DD from openai.com/api/pricing"
   - **Staleness warning**: Display if pricing >7 days old (encourages investigation)
   - **Implementation notes**:
     - Scraping may break if OpenAI changes page structure (acceptable risk for local dev tool)
     - Consider using OpenAI's platform docs page as alternative source
     - Log scraping success/failure for debugging

3. **~~Exchange rate API~~**: **RESOLVED** - Multiple free options available:
     - Completely free, no API key required
     - Open-source, reliable, actively maintained
     - Simple REST API: `GET https://api.frankfurter.dev/v1/latest?base=USD&symbols=GBP`
     - Returns: `{"amount":1.0,"base":"USD","date":"2025-11-04","rates":{"GBP":0.79}}`
   - **Fallback**: ExchangeRate-API.com (free tier: 1,500 requests/month)
   - **Implementation**: Try Frankfurter first, fall back to cached rate if unavailable

4. **~~Database connection pooling~~**: **RESOLVED** - Both DrizzleORM and Prisma handle connection pooling automatically:
   - **DrizzleORM**: Uses underlying driver (node-postgres) connection pooling, configurable via pool options
   - **Prisma**: Built-in connection pooling with sensible defaults (configured in Prisma Client)
   - **For this project**: Default pooling is sufficient (single-user local tool, low concurrency)
   - **Action**: Use defaults, monitor during development, adjust only if needed

---

**Phase 0 Status**: COMPLETE ✅
**Next Phase**: Phase 1 - Design & Contracts
