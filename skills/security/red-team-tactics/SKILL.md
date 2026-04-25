---
name: Red Team Tactics
description: Offensive security testing: penetration testing, attack simulation
---

# Red Team Tactics

## Reconnaissance
- Subdomain enumeration, port scanning
- Technology fingerprinting (Wappalyzer)
- Public data gathering (GitHub, social)

## Common Attack Vectors
- Authentication bypass: default credentials, brute force, token manipulation
- Authorization escalation: IDOR, privilege escalation, path traversal
- Injection: SQLi, XSS (reflected/stored/DOM), SSTI, command injection
- SSRF: internal service access via crafted URLs

## API Testing
- Test without auth headers
- Test with expired/invalid tokens
- Test with other user tokens (IDOR)
- Test rate limiting bypass attempts

## Reporting
- CVSS scoring for each finding
- Proof of concept for reproducibility
- Remediation recommendations with priority
