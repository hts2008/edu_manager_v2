---
description: Deployment workflow from staging to production
---

# 🚀 DEPLOYMENT WORKFLOW
<!-- VI: Quy trình triển khai từ staging đến production -->

> **Trigger**: `/deploy [environment]`, release ready
> **Agent**: DevOps Engineer

---

## WORKFLOW STEPS

### Step 1: Pre-Deployment Checks
```
VERIFY:
  - All tests passing
  - Code reviewed and approved
  - QA sign-off received
  - No critical bugs open
  - Performance budgets met
  - Security audit passed (for sensitive changes)
```

### Step 2: Build & Package
```
EXECUTE:
  1. Create release branch/tag
  2. Build production bundle
  3. Run production build tests
  4. Generate Docker image
  5. Push to container registry
```

### Step 3: Deploy to Staging
```
DEPLOY to staging:
  1. Update staging environment
  2. Run database migrations
  3. Deploy new containers
  4. Run smoke tests
  5. Verify health checks
```

### Step 4: Staging Verification
```
VERIFY on staging:
  - [ ] All endpoints responding
  - [ ] Critical user flows working
  - [ ] No error spikes in logs
  - [ ] Performance acceptable
  - [ ] Feature flags configured
```

### Step 5: Production Deployment
```
DEPLOY to production:
  1. Enable maintenance mode (if needed)
  2. Create database backup
  3. Run database migrations
  4. Deploy new containers (rolling/blue-green)
  5. Verify health checks
  6. Monitor error rates
  7. Disable maintenance mode
```

### Step 6: Post-Deployment
```
AFTER deployment:
  1. Verify production health
  2. Monitor for 30 minutes
  3. Document release notes
  4. Update PROJECT_CONTEXT.md
  5. Move KANBAN items to DONE
  6. Notify stakeholders
```

---

## ROLLBACK PLAN

```
IF issues detected:
  1. Assess severity (SEV-1 = immediate rollback)
  2. Execute rollback:
     - Revert to previous container image
     - Rollback database migrations (if safe)
  3. Verify rollback successful
  4. Document incident
  5. Create bug report for RCA
```

---

## COMMAND TEMPLATE

```
/deploy staging        # Deploy to staging
/deploy production     # Deploy to production
/rollback [version]    # Rollback to version
```

---

## DEPLOYMENT CHECKLIST

```markdown
## Pre-Deployment
- [ ] All tests passing
- [ ] Code reviewed
- [ ] QA approved
- [ ] Performance checked

## Staging
- [ ] Deployed successfully
- [ ] Smoke tests passed
- [ ] No errors in logs

## Production
- [ ] Database backup created
- [ ] Migrations successful
- [ ] Deployed successfully
- [ ] Health checks passing
- [ ] Monitoring verified
```
