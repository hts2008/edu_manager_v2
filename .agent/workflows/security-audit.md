---
description: Security audit — OWASP scan, secrets, auth, pen-test, report
---
// turbo-all

## Steps

1. Scan for hardcoded secrets:
   ```
   grep -rn "password\|secret\|api_key\|token" src/ --include="*.ts" --include="*.js"
   ```

2. Run dependency audit:
   ```
   npm audit
   ```

3. Review auth: JWT config (algorithm, expiry), password hashing, session management.

4. Check input validation: all endpoints use schema validation (Zod/Joi)?

5. Verify security headers: CSP, HSTS, X-Frame-Options, X-Content-Type-Options.

6. Walk OWASP Top 10 against codebase: injection, auth, exposure, XXE, access control, config, XSS, deserialization, components, logging.

7. Generate report: severity-rated findings with remediation steps.

## Context+ Enhancement

When Context+ is available:
- **Step 1**: Supplement grep with `semantic_code_search("secret OR key OR password OR token")` for broader coverage
- **Step 3**: `get_blast_radius(auth_middleware)` → verify all routes that auth changes would affect
- **Step 4**: `semantic_code_search("user input")` → trace all untrusted input entry points
- **Step 6**: `get_context_tree` → map entire attack surface systematically
- **Mandatory**: blast_radius on ANY proposed security fix before applying