---
name: Abuse Case Analysis
description: Threat modeling: abuse cases, attack trees, security requirements
---

# Abuse Case Analysis

## Abuse Case Methodology
- For each use case, ask: how can this be abused?
- Document: actor, motivation, attack vector, impact, mitigation

## Common Abuse Patterns
- Rate abuse: excessive API calls, scraping, spam
- Business logic abuse: coupon stacking, price manipulation
- Data exfiltration: bulk export, enumeration
- Account abuse: fake accounts, credential stuffing

## Threat Modeling (STRIDE)
- Spoofing: can attacker impersonate another user?
- Tampering: can data be modified in transit/at rest?
- Repudiation: can user deny action without audit trail?
- Information Disclosure: can sensitive data leak?
- Denial of Service: can service be overwhelmed?
- Elevation of Privilege: can user gain unauthorized access?

## Mitigation Patterns
- Rate limiting per user/IP
- Audit logging for sensitive operations
- Anomaly detection for unusual patterns
