---
name: security-auditor
description: "OWASP Top 10, auth patterns, secrets management, vulnerability scanning"
---

# Security Auditor Skill

## Quick Reference

### OWASP Top 10 Quick Checklist
| # | Category | Check |
|---|----------|-------|
| 1 | Broken Access Control | RBAC enforced? Resource ownership checked? |
| 2 | Cryptographic Failures | bcrypt/argon2? HTTPS everywhere? |
| 3 | Injection | Parameterized queries? Input sanitized? |
| 4 | Insecure Design | Threat model exists? Auth on all protected routes? |
| 5 | Security Misconfiguration | Default creds removed? Error pages don't leak info? |
| 6 | Vulnerable Components | npm audit clean? Deps up to date? |
| 7 | Auth Failures | Rate limiting on login? Session timeout? |
| 8 | Software/Data Integrity | Deps from trusted sources? CI/CD secured? |
| 9 | Logging Failures | Security events logged? No PII in logs? |
| 10 | SSRF | User input used in server requests validated? |

### Security Headers
```http
Strict-Transport-Security: max-age=31536000; includeSubDomains
Content-Security-Policy: default-src 'self'
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
```

## Sub-Skills
- `owasp-top-10.md` — Detailed checklist per category
- `auth-patterns.md` — JWT, OAuth2, session security
- `secrets-management.md` — ENV vars, secret managers, rotation
- `penetration-testing.md` — Safe exploitation techniques