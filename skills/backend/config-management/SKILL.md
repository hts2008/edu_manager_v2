---
name: Config Management
description: Environment variables, config validation, secrets handling
---

# Config Management

## Environment Strategy
- .env for local development (never commit)
- Environment variables for production
- Config validation at startup with Zod/Pydantic
- Fail fast on missing required config

## Secret Management
- Never hardcode secrets in source
- Use vault services (AWS Secrets Manager, GCP Secret Manager)
- Rotate secrets regularly
- Audit secret access

## Config Patterns
- Centralized config module with typed exports
- Environment-specific overrides (dev, staging, prod)
- Feature flags for gradual rollouts
- Config immutable after startup
