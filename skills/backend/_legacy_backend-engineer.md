---
name: backend-engineer
description: "Server-side development, service layer, middleware, auth implementation"
---

# Backend Engineering Skill

## Quick Reference

### Service Layer Pattern
```typescript
// Controller → Service → Repository (never skip layers)
class UserController {
  async getUser(req, res) {
    const user = await this.userService.findById(req.params.id);
    return res.json({ data: user });
  }
}

class UserService {
  async findById(id: string): Promise<User> {
    const user = await this.userRepo.findById(id);
    if (!user) throw new NotFoundError('User not found');
    return user;
  }
}
```

### Middleware Stack (order matters)
```
1. CORS → 2. Rate Limiter → 3. Request Logger → 4. Auth → 5. Validation → 6. Handler
```

### Input Validation Pattern
```typescript
const createUserSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(12).max(128),
  name: z.string().min(1).max(100).trim()
});
```

## Sub-Skills
- `express-patterns.md` — Middleware, error handlers, router organization
- `authentication.md` — JWT, sessions, OAuth2, password hashing
- `authorization.md` — RBAC, resource ownership, permission checks
- `file-uploads.md` — Multer, size limits, type validation, virus scanning
- `background-jobs.md` — Bull/BullMQ, retry strategies, dead letter queues

## Anti-Patterns
- Fat controllers: business logic in request handlers
- N+1 queries: loading related data in loops
- Synchronous heavy ops: blocking event loop with crypto/image processing