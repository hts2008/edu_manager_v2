---
name: security
description: "Input validation, authentication, secrets management, OWASP compliance"
version: "4.0"
enforcement: mandatory
human_override: "User can override with explicit justification documented in decisionLog.md"
---

# Rule: Security

## Purpose

Prevent the most common and damaging security vulnerabilities. These rules map to OWASP Top 10 and industry best practices.

## R1: Input Validation

**Requirement**: All user input must be validated before processing.
- Server-side validation is mandatory (client-side is convenience only)
- Use schema validation library (Zod, Joi, class-validator)
- Validate: type, length, format, range, allowed characters
- Reject early with specific error messages (field + reason)

**Do**:
```typescript
const schema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(12).max(128),
  age: z.number().int().min(0).max(150)
});
```

**Don't**:
```typescript
if (email) { /* no validation, just truthy check */ }
req.body.role = req.body.role || 'user'; // mass assignment
```

## R2: Authentication & Authorization

**Requirement**: Every protected endpoint must verify identity AND permissions.
- Passwords: Argon2id or bcrypt (cost â‰¥ 12). Never MD5/SHA1.
- JWTs: RS256 or ES256. Secret â‰¥ 256 bits. Expiry â‰¤ 15min access / â‰¤ 7 days refresh.
- Store tokens in httpOnly cookies (not localStorage)
- Implement RBAC: check role + resource ownership per request
- Rate limit auth endpoints: 5 failures â†’ 15min lockout

## R3: SQL Injection Prevention

**Requirement**: All database queries must use parameterized statements.

**Do**:
```sql
SELECT * FROM users WHERE id = $1  -- parameterized
```

**Don't**:
```sql
SELECT * FROM users WHERE id = '${userId}'  -- SQL injection vector
```

## R4: XSS Prevention

**Requirement**: All user-generated content must be sanitized before rendering.
- Use framework's built-in escaping (React JSX auto-escapes)
- For raw HTML: use DOMPurify or equivalent sanitizer
- Set Content-Security-Policy header
- Avoid `dangerouslySetInnerHTML` unless sanitized

## R5: Secrets Management

**Requirement**: No secrets in source code, logs, or error messages.
- Store in environment variables or secret manager (GCP Secret Manager, AWS Secrets Manager)
- `.env` files in `.gitignore` â€” never commit
- Rotate secrets after any suspected exposure
- Different secrets per environment (dev, staging, production)

## R6: Security Headers

**Requirement**: All responses must include security headers.
```http
Strict-Transport-Security: max-age=31536000; includeSubDomains
Content-Security-Policy: default-src 'self'
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
```

## R7: Dependency Security

**Requirement**: No known vulnerable dependencies in production.
- Run `npm audit` / `pip audit` in CI pipeline
- Block deploy if HIGH/CRITICAL vulnerabilities found
- Review new dependencies before adding: maintenance status, download count, CVE history

## Verification

- Automated: `npm audit`, semgrep, ESLint security rules in CI
- Manual: security-auditor review for auth, payment, PII handling
- Pre-deploy: run OWASP checklist

## Related

- Agent: `agents/security-auditor.md`, `agents/penetration-tester.md`
- Skills: `skills/security/vulnerability-scanning/`
- Quality gate: security gate in `manifests/quality-gates.yaml`