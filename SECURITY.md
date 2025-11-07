# Security Policy

## ⚠️ Important: This is a Local Development Tool

**promptalicious is designed exclusively for LOCAL development use.** It is not intended to be deployed to any public-facing server, cloud environment, or shared hosting platform.

The architecture deliberately omits many security measures typically required for production web applications because it assumes:
- Single-user operation on a trusted local machine
- No network exposure beyond localhost
- Direct access to API keys stored in local configuration

## 🚨 Do Not Host This Publicly

If you attempt to deploy promptalicious to a public server, you are doing so **entirely at your own risk**. The application lacks:
- Multi-user authentication and authorisation
- API key encryption at rest
- Rate limiting
- Input sanitisation for untrusted users
- CSRF protection
- Other standard production security controls

**We will not provide support for security issues arising from public deployment.**

## Reporting a Vulnerability

If you discover a security vulnerability in promptalicious that affects local development use (e.g., arbitrary code execution, local privilege escalation, or exposure of credentials beyond the local environment), please report it responsibly:

1. **Do not** open a public GitHub issue
2. Use GitHub's [Security Advisories](../../security/advisories/new) feature to report privately
3. Provide a clear description of the vulnerability and steps to reproduce
4. Allow reasonable time for assessment and remediation

We'll review all legitimate security reports and respond within 7 days. For confirmed vulnerabilities affecting local development security, we'll work to release a fix and credit you in the advisory (if desired).

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.2.x   | :white_check_mark: |
| < 0.2   | :x:                |

We support only the latest minor version. Please ensure you're running the most recent release before reporting issues.

## Security Best Practices for Users

When using promptalicious locally:

1. **Protect your API keys**: Store them in the application's settings, never commit them to version control
2. **Use environment isolation**: Run promptalicious on a machine with up-to-date security patches
3. **Monitor API usage**: Check your LLM provider dashboards for unexpected usage
4. **Network restrictions**: Consider firewall rules limiting localhost-only access if concerned about other local processes
5. **Regular updates**: Pull the latest version regularly to benefit from security improvements

## Out of Scope

The following are explicitly **not** considered security vulnerabilities:

- Lack of production-grade security features (this is intentional)
- Issues arising from public deployment
- Absence of multi-user authentication
- API key storage in local database (this is by design for single-user local use)
- Any issue requiring network access beyond localhost to exploit
