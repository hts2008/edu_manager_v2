---
name: Migration Safety
description: Safe database migrations: zero-downtime, rollback plans, data preservation
---

# Migration Safety

## Zero-Downtime Migrations
- Never rename columns directly (add new, migrate data, drop old)
- Never drop columns in same deploy as code change
- Add columns as nullable first, backfill, then add NOT NULL

## Rollback Plans
- Every migration must have a down() method
- Test rollback locally before deploying
- Keep rollback window documentation

## Data Migrations
- Separate schema migrations from data migrations
- Batch large data updates to avoid locks
- Use transactions for atomic data changes

## Safety Checklist
- Run migration on staging first
- Check estimated row count before ALTER
- Monitor lock wait times during deploy
- Have rollback script ready before starting
