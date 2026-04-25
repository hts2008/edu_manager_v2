---
name: Deployment Procedures
description: Deployment workflows: staging, production, canary, blue-green
---

# Deployment Procedures

## Deployment Stages
- Development: local + feature branches
- Staging: pre-production mirror
- Production: live user-facing

## Strategies
- Rolling update: gradual replacement (default for most)
- Blue-green: switch traffic between two identical environments
- Canary: route small percentage of traffic to new version
- Feature flags: deploy code, activate features independently

## Deployment Checklist
1. All tests pass on CI
2. Code review approved
3. Staging deploy + smoke test
4. Database migrations applied
5. Production deploy with monitoring
6. Smoke test production
7. Monitor error rates for 30 minutes

## Rollback Plan
- Automated rollback on error rate spike
- Database rollback scripts ready
- Previous version always available for quick revert
