---
name: Environment Matrix
description: Environment management: dev, staging, production parity, feature environments
---

# Environment Matrix

## Environment Types
- Local: developer machine, Docker Compose
- CI: automated testing, ephemeral
- Staging: production mirror, pre-release validation
- Production: live, user-facing

## Parity Principles
- Same OS, same DB version, same runtime across environments
- Same deploy process for staging and production
- Same config structure (different values)

## Feature Environments
- Per-PR preview deployments (Vercel, Netlify)
- Shared staging for integration testing
- Ephemeral: created on PR open, destroyed on merge

## Environment Config
- .env.local for local overrides (gitignored)
- Environment variables for cloud (no files)
- Validate all config at startup
