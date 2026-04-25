---
name: Artifact Reporting
description: Creating review and release artifacts: reports, packages, evidence bundles
---

# Artifact Reporting

## Review Artifact Structure
- Task scope and acceptance criteria
- Files changed with diff links
- Tests run with results summary
- Screenshots or recordings for UI changes
- Unresolved risks or known issues

## Evidence Bundle
- Test output (pass/fail counts, coverage)
- Lint and type-check results
- Build output (success/failure, bundle size)
- Security scan results (if applicable)
- Performance metrics (if applicable)

## Release Package
- Changelog since last release
- Migration guide for breaking changes
- Deployment procedure (step by step)
- Rollback procedure
- Known issues and workarounds

## Report Quality
- Factual: based on actual test results, not claims
- Complete: covers all acceptance criteria
- Actionable: reviewer knows exactly what to check
- Concise: no unnecessary verbosity

## Storage
- Receipts go to receipts/ directory
- Review packages to docs/artifacts/
- Release notes to CHANGELOG.md
