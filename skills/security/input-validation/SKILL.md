---
name: Input Validation
description: Input sanitization and validation: whitelist, schema validation, encoding
---

# Input Validation

## Validation Strategy
- Validate on input (controller/middleware layer)
- Whitelist approach: define what IS allowed, reject everything else
- Schema validation: Zod (TS), Pydantic (Python), Joi (Node)

## Common Validations
- Email: regex + DNS MX check for critical flows
- URLs: protocol whitelist (https only), no internal IPs
- File uploads: extension whitelist, MIME check, size limit, virus scan
- Numbers: range checks, integer overflow prevention

## Output Encoding
- HTML: escape < > & quotes before rendering
- SQL: parameterized queries always
- Shell: never concatenate user input into commands
- JSON: proper serialization, no eval()

## Content Security
- CSP headers to prevent XSS
- X-Content-Type-Options: nosniff
- Subresource Integrity for CDN scripts
