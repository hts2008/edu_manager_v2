# 📦 MONOLITH MODULAR ARCHITECTURE
<!-- VI: Kiến trúc Monolith Module - Phù hợp cho Super Apps, startups scaling -->

> **Best for**: Super Apps, SaaS platforms, Medium-scale applications
> **Complexity**: Medium | **Scalability**: Medium-High

---

## 🎯 OVERVIEW

Modular Monolith combines the deployment simplicity of a traditional monolith with the organized structure of modules. Perfect stepping stone for Super App architecture.

```
┌──────────────────────────────────────────────────────────┐
│                    API Gateway / BFF                      │
├──────────────────────────────────────────────────────────┤
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐        │
│  │   Users     │ │  Products   │ │   Orders    │  ...   │
│  │   Module    │ │   Module    │ │   Module    │        │
│  ├─────────────┤ ├─────────────┤ ├─────────────┤        │
│  │ Controller  │ │ Controller  │ │ Controller  │        │
│  │ Service     │ │ Service     │ │ Service     │        │
│  │ Repository  │ │ Repository  │ │ Repository  │        │
│  └─────────────┘ └─────────────┘ └─────────────┘        │
├──────────────────────────────────────────────────────────┤
│              Shared Kernel (Common Utilities)            │
├──────────────────────────────────────────────────────────┤
│                     Shared Database                       │
└──────────────────────────────────────────────────────────┘
```

---

## 📁 FOLDER STRUCTURE

```
src/
├── modules/                     # Feature modules
│   ├── users/
│   │   ├── controllers/         # HTTP handlers
│   │   │   └── user.controller.ts
│   │   ├── services/            # Business logic
│   │   │   └── user.service.ts
│   │   ├── repositories/        # Data access
│   │   │   └── user.repository.ts
│   │   ├── dto/                 # Data Transfer Objects
│   │   │   ├── create-user.dto.ts
│   │   │   └── update-user.dto.ts
│   │   ├── entities/            # Domain models
│   │   │   └── user.entity.ts
│   │   ├── events/              # Domain events
│   │   │   └── user-created.event.ts
│   │   ├── __tests__/           # Module tests
│   │   └── index.ts             # Public API
│   ├── products/
│   ├── orders/
│   └── payments/
├── shared/                      # Shared kernel
│   ├── database/                # Database connection
│   ├── events/                  # Event bus
│   ├── guards/                  # Auth guards
│   ├── interceptors/            # Request/Response interceptors
│   ├── utils/                   # Common utilities
│   └── types/                   # Shared types
├── config/                      # Configuration
└── main.ts                      # Entry point
```

---

## 🔑 KEY PRINCIPLES

### 1. Module Independence
```typescript
// ✅ GOOD: Module exposes public API through index.ts
// src/modules/users/index.ts
export { UserService } from './services/user.service';
export { CreateUserDTO } from './dto/create-user.dto';
export type { User } from './entities/user.entity';

// ❌ BAD: Direct import of internal files
import { UserRepository } from '../users/repositories/user.repository';
```

### 2. Inter-Module Communication
```typescript
// Use events for cross-module communication
// src/modules/orders/services/order.service.ts
import { EventBus } from '@/shared/events';
import { OrderCreatedEvent } from '../events/order-created.event';

export class OrderService {
  constructor(private eventBus: EventBus) {}

  async createOrder(data: CreateOrderDTO) {
    const order = await this.orderRepo.create(data);
    
    // Publish event instead of calling UserService directly
    await this.eventBus.publish(new OrderCreatedEvent(order));
    
    return order;
  }
}

// src/modules/users/handlers/order-created.handler.ts
export class OrderCreatedHandler {
  handle(event: OrderCreatedEvent) {
    // Update user's order count
    this.userService.incrementOrderCount(event.userId);
  }
}
```

### 3. Database Boundaries
```typescript
// Each module has its own repository, but can share the same schema
// Prefer API calls for cross-module data access

// ✅ GOOD: Call the module's service
const user = await userService.findById(userId);

// ❌ BAD: Direct database access to another module's tables
const user = await prisma.user.findUnique({ where: { id: userId } });
```

---

## 📊 WHEN TO USE

| Use Case | Recommendation |
|----------|----------------|
| Startup MVP to growth | ✅ Recommended |
| Super App platform | ✅ Recommended |
| Small team (< 10 devs) | ✅ Recommended |
| Large team (> 20 devs) | Consider Microservices |
| Very high traffic | Consider Microservices |
| Simple CRUD app | Consider simpler architecture |

---

## ⚙️ MIGRATION PATH

When ready to migrate to Microservices:

1. **Identify boundaries** - Which modules are bottlenecks?
2. **Extract database** - Give module its own database
3. **Add API layer** - Replace internal calls with HTTP/gRPC
4. **Deploy separately** - Container per service
5. **Add service mesh** - Communication, discovery

---

**Architecture Version**: 2.0
