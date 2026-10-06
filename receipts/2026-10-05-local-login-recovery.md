# Local Login Recovery

- Scope: user-authorized password reset for the existing admin browser fixture on localhost3088 only. No production account accessed.
- Root cause: frontend built without VITE_TENANCY_MODE=enforced while backend requires TENANCY_MODE=enforced; tenant input was hidden and login failed validation before password verification.
- Recovery: rebuilt frontend with matching enforced mode. Guarded loopback database/schema identity and exact browser fixture ownership before password update; bcrypt hash, tokenVersion increment and session revocation were atomic. Password is not stored in this receipt.
- Evidence: frontend build PASS; tenant-login tests5/5 PASS; real HTTP wrong password401 INVALID_CREDENTIALS and new password200; Playwright actual form shows tenant input, displays incorrect-password error and navigates to / after new-password login.
- No auth guard weakened, dependency installed, production write or deployment. Fixture username and tenant slug remain unchanged to preserve reproducible browser tests.
- NM/C+ unavailable, calls0/0, health unavailable. Production readiness remains NO-GO for previously documented gates.
