# promptalicious

> A local development tool for debugging and iterating LLM prompts with full diagnostic visibility

[![CI Status](https://github.com/zacbraddy/promptalicious/workflows/CI/badge.svg)](https://github.com/zacbraddy/promptalicious/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## 🚨 Critical: This is a LOCAL ONLY Tool

**DO NOT deploy promptalicious to any public server, cloud platform, or shared hosting environment.**

This application is designed exclusively for local development use on a trusted machine. It deliberately lacks many security measures required for production web applications, including:
- Multi-user authentication
- API key encryption at rest
- Rate limiting
- Input sanitisation for untrusted users
- CSRF protection

**If you attempt to host this publicly, you do so entirely at your own risk.** We will not provide support for security issues arising from public deployment. See [SECURITY.md](SECURITY.md) for details.

---

## What is promptalicious?

promptalicious helps developers debug LLM prompts by providing complete visibility into what happens when you execute a prompt against an LLM. No more guessing why your prompt produced unexpected results—see exactly what was sent, what came back, how long it took, and what it cost.

**Current capabilities:**
- Execute prompts against GPT-4o-mini (via Vercel AI SDK)
- View comprehensive diagnostics: token counts, execution time, estimated cost (in GBP)
- Configure API keys and model settings through a web interface
- Test API connectivity before executing prompts
- Abort long-running executions mid-flight
- Detailed error reporting for all failure modes (authentication, network, rate limits, etc.)
- Automatic pricing data updates with staleness detection
- Recovers gracefully from page refreshes during execution

**Built with:**
- Frontend: React, TypeScript, Vite, TanStack Query, Tailwind CSS, shadcn/ui
- Backend: Node.js, TypeScript, Express, PostgreSQL, Drizzle ORM
- Monorepo: pnpm + Turbo
- Retrofuturistic dark theme (because why not)

---

## Quick Start

### Prerequisites

- Node.js 20.x or later (LTS recommended)
- pnpm 9.x or later
- PostgreSQL 14.x or later
- An OpenAI API key

### Installation

```bash
# Clone the repository
git clone https://github.com/zacbraddy/promptalicious.git
cd promptalicious

# Install dependencies
pnpm install

# (Optional) Configure database connection if not using defaults
# Default: postgresql://postgres:postgres@localhost:5432/promptalicious
# Edit packages/backend/.env and set DATABASE_URL if your setup differs

# Start the development servers (frontend + backend)
# This automatically creates the database and runs migrations
pnpm dev
```

The application will be available at `http://localhost:5173` (frontend) with the backend API running on `http://localhost:3000`.

**Note**: The backend automatically creates the database and runs migrations on startup, so you don't need any manual database setup. It also uses sensible defaults, so `.env` is only needed if your PostgreSQL setup differs (custom user/password/host/port).

### First Run

1. Navigate to the Settings page (gear icon in the navigation)
2. Enter your OpenAI API key
3. Click "Test Connection" to verify it works
4. Save your settings
5. Navigate to the Prompt page
6. Enter a system prompt and hit "Execute"
7. Watch the diagnostics roll in

---

## How It Works

promptalicious follows a simple workflow:

```
Configure → Execute → Observe → Iterate
```

### 1. Configure Your Settings

Store your API key and select your preferred LLM model (currently GPT-4o-mini only). Settings are stored locally in your PostgreSQL database, never in version control.

### 2. Execute Your Prompt

Type a system prompt into the input area and click execute. The system sends your prompt to the configured LLM and displays a loading indicator while processing.

You can abort execution at any time using the cancel button. If you accidentally refresh the page during execution, don't worry—the system detects the running prompt and restores the UI state, continuing to poll for results.

### 3. Observe Diagnostics

When the LLM responds, you'll see:
- **The full response text** (scrollable, no artificial limits)
- **Token metrics**: Prompt tokens, completion tokens, total tokens
- **Timing data**: How long the execution took
- **Cost estimate**: What this call cost in GBP (based on current pricing data)
- **Pricing freshness**: When pricing data was last updated, with warnings if stale (>7 days)

If something goes wrong, you'll see detailed error information categorised by type (authentication, network, rate limits, etc.) so you can fix the problem quickly.

### 4. Iterate

Your prompt text remains in the input area after execution, so you can tweak it and try again immediately. No page reloads, no lost context.

---

## Project Structure

```
promptalicious/
├── packages/
│   ├── frontend/          # React frontend (Vite)
│   ├── backend/           # Express backend (TypeScript)
│   └── shared-infra/      # Shared types and utilities
├── docs/                  # Additional documentation
├── specs/                 # Feature specifications
├── memory/                # Project knowledge base
└── .github/
    └── workflows/         # CI/CD pipelines
```

For architectural details, see [docs/architecture.md](docs/architecture.md).

---

## Documentation

- **[Development Setup](docs/development-setup.md)** - Full setup instructions, including database configuration
- **[Architecture Overview](docs/architecture.md)** - High-level system design and patterns
- **[Troubleshooting](docs/troubleshooting.md)** - Common issues and solutions
- **[Contributing](CONTRIBUTING.md)** - How to contribute (spoiler: PRs welcome, demands not so much)
- **[Security Policy](SECURITY.md)** - What to do if you find a security issue

---

## Contributing

I'm happy to review and merge PRs that align with the project vision, pass all quality gates, and include appropriate tests. However, I'm not a full-time FOSS maintainer—I have limited time and won't implement features I don't personally need.

**TL;DR**: If you want a feature or bug fix, submit a PR. Feature requests without PRs will likely be closed.

Read the full guidelines in [CONTRIBUTING.md](CONTRIBUTING.md).

---

## Companies Using promptalicious

<table>
  <tr>
    <td width="20%" align="center">
      <img src="https://www.subly.co/logo.svg" alt="Subly" width="100" />
    </td>
    <td width="80%">
      <strong>Subly</strong><br/>
      AI-powered video subtitling and translation platform helping creators make their content accessible worldwide.<br/>
      <a href="https://www.subly.co">subly.co</a>
    </td>
  </tr>
</table>

Using promptalicious in production? Open a PR adding your company to this section!

---

## Roadmap

**Current version**: 0.2.0

**Completed:**
- ✅ GPT-4o-mini integration via Vercel AI SDK
- ✅ Full diagnostic visibility (tokens, timing, cost)
- ✅ Settings page with API key management
- ✅ Execution abort capability
- ✅ Page refresh recovery
- ✅ Pricing data system with staleness detection
- ✅ Comprehensive error reporting

**Potential future features** (no promises):
- Support for additional LLM providers (Claude, Gemini, etc.)
- Tool/function calling configuration and debugging
- Multi-step conversation testing
- Saved prompt templates
- Export to production code

Want to see a feature? Build it and submit a PR.

---

## License

MIT - see [LICENSE](LICENSE) for details.

---

## Questions?

- Found a bug? [Open an issue](../../issues/new/choose)
- Want to contribute? Read [CONTRIBUTING.md](CONTRIBUTING.md)
- Security concern? See [SECURITY.md](SECURITY.md)

---

**Built by developers, for developers. Visibility above all.**
