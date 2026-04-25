---
name: Auth Guarding
description: Authentication and authorization patterns, JWT, RBAC, middleware
---

# Auth Guarding

## Authentication Patterns
- JWT for stateless auth: access token (short-lived) + refresh token (long-lived)
- Session-based for server-rendered apps
- OAuth 2.0 for third-party integration

## Authorization
- RBAC: roles (admin, editor, viewer) with permissions
- ABAC: attribute-based for complex rules
- Guard middleware checks before handler execution

## JWT Best Practices
- Short expiry (15min access, 7d refresh)
- Store refresh token in httpOnly cookie
- Include minimal claims: sub, role, exp
- Rotate refresh tokens on use

## Security Headers
- Set-Cookie: HttpOnly, Secure, SameSite=Strict
- Authorization: Bearer scheme
- CSRF tokens for cookie-based auth
