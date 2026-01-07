# ❌ ANTI-PATTERNS
<!-- VI: Các patterns cần tránh -->

> **PURPOSE**: Document patterns that cause problems.
> Learn from mistakes to avoid repeating them.

---

## 🏗️ Architecture

### ❌ DON'T: Cross-Module Direct Database Access
Accessing another module's tables directly breaks encapsulation.
```typescript
// ❌ BAD
const users = await prisma.user.findMany();

// ✅ GOOD
const users = await userService.findAll();
```

### ❌ DON'T: Circular Dependencies
Modules depending on each other create maintenance nightmares.
```
// ❌ BAD
UserModule → OrderModule → UserModule

// ✅ GOOD: Use events
UserModule → publish(event) → OrderModule handles
```

---

## 💻 Coding

### ❌ DON'T: Swallow Errors
Silent failures hide bugs and make debugging impossible.
```typescript
// ❌ BAD
try {
  await dangerousOp();
} catch (e) {
  // Silently ignored
}

// ✅ GOOD
try {
  await dangerousOp();
} catch (error) {
  logger.error({ error });
  throw new AppError('OPERATION_FAILED');
}
```

### ❌ DON'T: Hardcode Configuration
Hardcoded values make deployment difficult.
```typescript
// ❌ BAD
const API_URL = 'https://api.prod.com';

// ✅ GOOD
const API_URL = process.env.API_URL;
```

### ❌ DON'T: Use `any` Type
`any` defeats the purpose of TypeScript.
```typescript
// ❌ BAD
function process(data: any) { ... }

// ✅ GOOD
function process(data: UserDTO) { ... }
```

---

## 🔒 Security

### ❌ DON'T: Store Secrets in Code
Secrets in code get committed to version control.
```typescript
// ❌ BAD
const API_KEY = 'sk_live_xxx';

// ✅ GOOD
const API_KEY = process.env.API_KEY;
```

### ❌ DON'T: Trust User Input
All user input is potentially malicious.
```typescript
// ❌ BAD
const query = `SELECT * FROM users WHERE id = ${userId}`;

// ✅ GOOD
const user = await prisma.user.findUnique({ where: { id: userId } });
```

---

## 🧪 Testing

### ❌ DON'T: Skip Tests to Meet Deadlines
Technical debt from missing tests compounds quickly.
```
// ❌ BAD: "We'll add tests later"
// The future: Bugs in production, afraid to refactor

// ✅ GOOD: Write tests as you go
// Test coverage prevents regressions
```

### ❌ DON'T: Test Implementation Details
Tests should verify behavior, not implementation.
```typescript
// ❌ BAD: Testing internal state
expect(service._cache.size).toBe(1);

// ✅ GOOD: Testing behavior
expect(await service.get('key')).toBe('value');
```

---

## 📝 Documentation

### ❌ DON'T: Skip Context Updates
Missing context = confused future sessions.
```
// ❌ BAD: Close session without updating PROJECT_CONTEXT.md
// Future agent: "What was happening?"

// ✅ GOOD: Always run /handover before ending
```

---

**Last Updated**: [TIMESTAMP]
**Added By**: [AGENT]
