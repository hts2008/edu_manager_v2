# 📚 BEST PRACTICES
<!-- VI: Các thực hành tốt nhất đã khám phá -->

> **PURPOSE**: Document patterns and practices that work well.
> Update this file when discovering effective approaches.

---

## 🏗️ Architecture

### ✅ DO: Use Modular Structure
Organize code by feature/domain rather than by type.
```
✅ src/modules/users/    → Feature-based
❌ src/controllers/      → Type-based
```

### ✅ DO: Define Clear Module Boundaries
Each module exposes only its public API via index.ts.
```typescript
// src/modules/users/index.ts
export { UserService } from './services/user.service';
export type { User } from './entities/user.entity';
```

---

## 💻 Coding

### ✅ DO: Use TypeScript Strict Mode
Enable strict mode for better type safety.
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true
  }
}
```

### ✅ DO: Handle Errors Gracefully
Always catch and handle errors appropriately.
```typescript
try {
  const result = await riskyOperation();
  return result;
} catch (error) {
  logger.error({ error, context: 'riskyOperation' });
  throw new AppError('OPERATION_FAILED', 500);
}
```

### ✅ DO: Write Tests First (TDD)
Write tests before implementing features for better design.
```typescript
// Write test first
it('should create user with valid data', async () => {
  const result = await userService.create(validData);
  expect(result.id).toBeDefined();
});

// Then implement
async create(data: CreateUserDTO) {
  // Implementation
}
```

---

## 🎨 UI/UX

### ✅ DO: Use Design Tokens
Centralize design values for consistency.
```css
:root {
  --color-primary: #3b82f6;
  --spacing-md: 1rem;
  --radius-md: 0.5rem;
}
```

### ✅ DO: Mobile First
Design for mobile, then enhance for larger screens.
```css
.container {
  padding: 1rem; /* Mobile */
}

@media (min-width: 768px) {
  .container {
    padding: 2rem; /* Tablet+ */
  }
}
```

---

## 🔧 DevOps

### ✅ DO: Use Multi-stage Docker Builds
Reduce image size and improve security.
```dockerfile
FROM node:20-alpine AS builder
# Build stage

FROM node:20-alpine AS runner
# Run stage with only production deps
```

### ✅ DO: Health Check Endpoints
Always implement health checks for monitoring.
```typescript
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});
```

---

## 📝 Documentation

### ✅ DO: Document Decisions
Create ADRs for significant architecture decisions.
Track why decisions were made, not just what.

### ✅ DO: Keep Context Updated
Always update PROJECT_CONTEXT.md after major changes.
Future sessions depend on accurate context.

---

**Last Updated**: [TIMESTAMP]
**Added By**: [AGENT]
