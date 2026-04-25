---
name: test-driven-development
description: "Red-Green-Refactor cycle, test-first design, test doubles"
---

# Test-Driven Development Skill

## Quick Reference

### TDD Cycle
```
1. RED    → Write a test that fails (describes desired behavior)
2. GREEN  → Write minimal code to make the test pass
3. REFACTOR → Improve code quality without changing behavior
4. REPEAT → Next test case
```

### Test Structure Pattern
```typescript
describe('UserService', () => {
  describe('createUser', () => {
    it('should create user with valid email and password', async () => {
      const result = await service.createUser({ email: 'a@b.com', password: 'SecureP@ss1' });
      expect(result.id).toBeDefined();
      expect(result.email).toBe('a@b.com');
    });

    it('should throw ValidationError when email is empty', async () => {
      await expect(service.createUser({ email: '', password: 'x' }))
        .rejects.toThrow(ValidationError);
    });
  });
});
```

### What to Test First
1. Happy path (basic success case)
2. Validation failures (bad input)
3. Edge cases (null, empty, boundary values)
4. Error handling (service down, timeout)
5. Authorization (wrong role, wrong user)

### Test Doubles
| Type | Purpose | Example |
|------|---------|---------|
| Stub | Returns fixed data | `jest.fn().mockReturnValue(user)` |
| Mock | Verifies interactions | `expect(repo.save).toHaveBeenCalledWith(user)` |
| Spy | Wraps real implementation | `jest.spyOn(service, 'validate')` |
| Fake | Working lightweight implementation | In-memory database |

## Anti-Patterns
- Writing tests after code (validation bias)
- Testing implementation instead of behavior
- Too many mocks (tests are fragile)
- Skipping refactor step (accumulates tech debt)