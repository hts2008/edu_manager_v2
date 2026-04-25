---
description: Deployment — pre-checks, build, deploy, smoke test, rollback ready
---
// turbo-all

## Steps

1. Pre-deploy checklist:
   ```
   npm test           # all tests pass
   npm audit           # no HIGH/CRITICAL vulns
   npm run build       # production build succeeds
   ```

2. Verify environment variables are configured for target environment.

3. Deploy to staging first. Wait for health check: `GET /health → 200`.

4. Run smoke tests on staging: login, core feature, API endpoints.

5. If staging passes → deploy to production.

6. Post-deploy: monitor error rate and response time for 1 hour.

7. Rollback trigger: error rate > 5% OR health check fails OR critical journey fails.

8. Update KANBAN.md with deployment evidence and monitoring links.