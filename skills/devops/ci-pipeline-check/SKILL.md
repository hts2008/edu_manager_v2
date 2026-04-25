---
name: CI Pipeline Check
description: CI/CD pipeline design: stages, caching, parallelism, artifacts
---

# CI Pipeline Check

## Pipeline Stages
1. Install: dependencies with lock file
2. Lint: code style and static analysis
3. Type check: TypeScript, mypy, etc.
4. Test: unit > integration > E2E
5. Build: production bundle
6. Deploy: staging, then production

## Performance
- Cache dependencies between runs
- Parallelize independent jobs
- Run fast checks first (lint, type) to fail early
- Use incremental builds where possible

## Artifacts
- Build outputs for deployment
- Test reports for visibility
- Coverage reports for tracking

## Security in CI
- Secrets as environment variables (never in code)
- Audit third-party actions/plugins
- Pin action versions to specific commits
- SAST scanning as pipeline stage
