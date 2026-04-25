---
name: Auth Hardening
description: Authentication hardening: password policy, MFA, session management
---

# Auth Hardening

## Password Policy
- Minimum 12 characters, no maximum under 128
- Check against breached password databases (haveibeenpwned API)
- bcrypt or argon2 hashing with proper work factor
- Never store plaintext or reversible encryption

## MFA Implementation
- TOTP (Google Authenticator) as minimum
- WebAuthn/FIDO2 for phishing-resistant auth
- Recovery codes: one-time use, stored hashed

## Session Management
- Session ID rotation after login
- Absolute timeout (24h) and idle timeout (30min)
- Secure cookie flags: HttpOnly, Secure, SameSite=Strict
- Server-side session invalidation on logout

## Account Security
- Account lockout after 5 failed attempts (with exponential backoff)
- Login anomaly detection (new device, location)
- Password change requires current password
