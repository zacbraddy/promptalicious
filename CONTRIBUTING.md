# Contributing to promptalicious

Thanks for your interest in contributing! This document explains how this project operates and what to expect.

## Philosophy: Collaborative, Not Free Labour

This is an open-source project in the true collaborative spirit—we're building something useful together. However, I'm not a full-time FOSS maintainer, and I don't intend to become one. I have a family, a mortgage, and limited time.

Here's what that means practically:

### Bug Reports

If you find a bug, please open an issue with:
- Clear description of the problem
- Steps to reproduce
- Expected vs actual behaviour
- Environment details (OS, Node version, etc.)

**What happens next**: If it's a bug I'd experience too and I have time, I might fix it. But there's no guarantee. **The most reliable path to getting a bug fixed is submitting a PR yourself.**

### Feature Requests

Have an idea for a feature? Great! Here's the process:

1. **Open an issue** describing the feature and why it's valuable
2. **Wait for discussion** - I'll respond whether it fits the project vision
3. **If approved**: Submit a PR implementing it
4. **If you wanted it badly enough to code it, then I'll put in the work to review it!** I'll review and merge if it meets quality standards

**I will not implement features requested by others unless I personally need them too.** If you want it, build it.

### Pull Requests

I'm genuinely happy to review and merge PRs that:
- ✅ Align with the project architecture and vision
- ✅ Pass all quality gates (typecheck, lint, format, tests)
- ✅ Include appropriate tests (added, updated, or removed as needed)
- ✅ Follow existing code conventions
- ✅ Don't introduce breaking changes without discussion
- ✅ Solve a real problem (yours or others')

**Before starting a large PR**, please open an issue first so we can agree on the approach. I'd hate for you to waste time on something that won't get merged.

## Development Setup

See [docs/development-setup.md](docs/development-setup.md) for full instructions.

Quick version:
```bash
git clone https://github.com/zacbraddy/promptalicious.git
cd promptalicious
pnpm install
pnpm dev
```

## Quality Standards

All PRs must pass these checks before review:

```bash
pnpm typecheck      # Zero TypeScript errors
pnpm lint           # Zero ESLint errors/warnings
pnpm format:check   # All files formatted (run pnpm format if needed)
pnpm test:ci        # All tests passing
```

These run automatically on every PR via GitHub Actions. If CI fails, I won't review the PR—fix it first.

## Testing Requirements

- **Bug fixes**: Add a test proving the bug is fixed
- **New features**: Add tests covering the happy path and obvious edge cases
- **Refactoring**: Existing tests should still pass

We're not aiming for 100% coverage, but "right-sized" tests that catch real problems without over-specifying implementation details. See our testing philosophy in [memory/development-protocols.md](memory/development-protocols.md).

## Code Style

We use ESLint and Prettier for consistency. The tools enforce most style decisions, so you don't need to memorise rules—just run the formatters.

Key conventions:
- TypeScript everywhere
- Functional style preferred over classes (where sensible)
- Domain-Driven Design patterns in the backend
- Import paths: Use `@/` alias for cleaner imports

## Architecture Guidelines

This project follows Domain-Driven Design (DDD) and Onion Architecture in the backend, with clear separation of concerns. Before making architectural changes:

1. Read [docs/architecture.md](docs/architecture.md)
2. Understand why the patterns exist
3. Don't introduce new patterns without discussing first

**We're pragmatic, not dogmatic**—patterns must solve real problems, not just "be best practice."

## Commit Messages

Write clear, concise commit messages:
- Use present tense ("Add feature" not "Added feature")
- First line is a summary (50 chars or less)
- Include more details in the body if needed

No need for elaborate conventional commits format—just be descriptive.

## Response Times

I'll aim to respond to issues and PRs within **7 days**, but sometimes life gets in the way. If it's been longer, feel free to ping the issue/PR.

For urgent security issues, use [GitHub Security Advisories](../../security/advisories/new) instead.

## What I'm Looking For

Ideal contributions:
- Bug fixes with tests
- Performance improvements with benchmarks
- Documentation improvements (always appreciated!)
- Features you personally need and are willing to maintain
- Refactoring that genuinely improves clarity without breaking things

## What I'm Not Looking For

Please don't submit PRs that:
- Rewrite the entire architecture "because it's better"
- Add frameworks/libraries without strong justification
- Break existing functionality without fixing tests
- Implement features nobody asked for without discussion
- Consist only of comments or trivial formatting changes

## Questions?

Not sure if your idea fits? Open an issue and ask! I'd rather discuss up front than have you waste time on a PR that won't merge.

---

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). Be kind, be respectful, be professional.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
