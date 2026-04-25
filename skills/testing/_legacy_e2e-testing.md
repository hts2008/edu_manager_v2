---
name: e2e-testing
description: "Playwright, browser automation, critical user journey testing"
---

# E2E Testing Skill

## Quick Reference

### Playwright Test Template
```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test('should complete user journey', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('login-button').click();
    await page.getByTestId('email-input').fill('user@test.com');
    await page.getByTestId('submit').click();
    await expect(page.getByTestId('dashboard')).toBeVisible();
  });
});
```

### Selector Priority
1. `data-testid` (most stable)
2. `getByRole` (accessible)
3. `getByText` (readable but brittle)
4. CSS selectors (last resort)

### Test Stability Rules
- Use auto-wait (no sleep/waitForTimeout)
- Each test is independent (own data, own cleanup)
- Trace on failure (screenshots + video)
- Max 20 E2E tests for medium app (focus on critical journeys)

## Sub-Skills
- `playwright-setup.md` — Installation, config, CI integration
- `test-fixtures.md` — Custom fixtures, auth state, test data
- `visual-regression.md` — Screenshot comparison, visual diffs