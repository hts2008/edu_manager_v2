---
name: E2E Test Writer
description: End-to-end testing: Playwright, Cypress, test scenarios, CI integration
---

# E2E Test Writer

## Tool Selection
- Playwright: cross-browser, fast, auto-wait
- Cypress: great DX, single browser, component testing

## Test Structure
- Test user journeys, not individual pages
- Happy path first, then error paths
- Use page object pattern for maintainability

## Best Practices
- Use data-testid attributes for stable selectors
- Auto-wait for elements (no explicit sleep)
- Clean test data before each run
- Take screenshots on failure

## CI Integration
- Run E2E on staging after deploy
- Parallel execution for speed
- Retry flaky tests once (but fix root cause)
