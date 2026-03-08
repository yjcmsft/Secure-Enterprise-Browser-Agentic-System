# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in this project, please report it responsibly.

### How to Report

1. **Do NOT open a public GitHub issue** for security vulnerabilities.
2. Email: **enterprise-browser-agent-security@contoso.com**
3. Or use [GitHub Security Advisories](https://github.com/yjcmsft/Secure-Enterprise-Browser-Agentic-System/security/advisories/new) to report privately.

### What to Include

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

### Response Timeline

| Stage | Timeline |
|---|---|
| Acknowledgment | Within 48 hours |
| Initial assessment | Within 5 business days |
| Fix development | Within 30 days for critical/high severity |
| Public disclosure | After fix is deployed and verified |

### Scope

The following are in scope:

- **Security pipeline bypass** — any way to skip URL allowlist, content safety, or approval gate
- **PII leakage** — content safety or redaction failures
- **Authentication/authorization bypass** — Entra ID, token delegation, RBAC
- **Injection attacks** — XSS, SSRF, command injection via skill parameters
- **Audit trail tampering** — any way to modify or delete Cosmos DB audit logs

### Out of Scope

- Vulnerabilities in third-party dependencies (report to the upstream project)
- Issues requiring physical access to the deployment environment
- Social engineering attacks

### Safe Harbor

We follow [coordinated vulnerability disclosure](https://en.wikipedia.org/wiki/Coordinated_vulnerability_disclosure). Security researchers acting in good faith will not face legal action.

## Security Architecture

See [docs/RESPONSIBLE_AI.md](./docs/RESPONSIBLE_AI.md) for the full 5-layer security pipeline, human oversight matrix, PII protection, and compliance alignment.
