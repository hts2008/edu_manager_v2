# 🏗️ MICROSERVICES ARCHITECTURE
<!-- VI: Kiến trúc Microservices - cho ứng dụng quy mô lớn -->

> **Best for**: Large teams, high scalability, independent deployments
> **Complexity**: High | **Team Size**: 20+ developers

---

## 📊 ARCHITECTURE OVERVIEW

```
┌─────────────────────────────────────────────────────────────┐
│                    API Gateway / BFF                         │
│              (Kong / AWS API Gateway)                        │
├─────────────────────────────────────────────────────────────┤
│                   Service Mesh (Optional)                    │
│                  (Istio / Linkerd)                          │
├─────────┬─────────┬─────────┬─────────┬─────────────────────┤
│ User    │ Order   │ Product │ Payment │  Notification       │
│ Service │ Service │ Service │ Service │  Service            │
├─────────┴─────────┴─────────┴─────────┴─────────────────────┤
│                    Message Broker                            │
│              (RabbitMQ / Kafka / SQS)                        │
├─────────┬─────────┬─────────┬─────────┬─────────────────────┤
│ User DB │ Order DB│ Product │ Payment │  Notification       │
│ (PG)    │ (PG)    │ DB (PG) │ DB (PG) │  DB (Redis)         │
└─────────┴─────────┴─────────┴─────────┴─────────────────────┘
```

---

## 📁 SERVICE STRUCTURE

```
project/
├── services/
│   ├── user-service/
│   │   ├── src/
│   │   │   ├── controllers/
│   │   │   ├── services/
│   │   │   ├── repositories/
│   │   │   ├── events/
│   │   │   └── app.ts
│   │   ├── prisma/
│   │   ├── Dockerfile
│   │   └── package.json
│   ├── order-service/
│   ├── product-service/
│   └── payment-service/
├── shared/
│   ├── types/               # Shared types
│   ├── events/              # Event definitions
│   └── utils/
├── gateway/                 # API Gateway config
├── infrastructure/
│   ├── kubernetes/
│   └── docker-compose.yml
└── package.json
```

---

## 🔑 KEY PATTERNS

### Event-Driven Communication
```typescript
// services/order-service/src/events/publisher.ts
import { EventEmitter } from 'events';

export interface OrderCreatedEvent {
  orderId: string;
  userId: string;
  items: OrderItem[];
  total: number;
  timestamp: Date;
}

export async function publishOrderCreated(order: Order) {
  await messageBroker.publish('order.created', {
    orderId: order.id,
    userId: order.userId,
    items: order.items,
    total: order.total,
    timestamp: new Date(),
  });
}
```

### Service Discovery
```yaml
# kubernetes/user-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: user-service
spec:
  selector:
    app: user-service
  ports:
    - port: 3000
      targetPort: 3000
```

### Circuit Breaker
```typescript
import CircuitBreaker from 'opossum';

const breaker = new CircuitBreaker(callPaymentService, {
  timeout: 3000,
  errorThresholdPercentage: 50,
  resetTimeout: 30000,
});

breaker.fallback(() => ({ status: 'service-unavailable' }));
```

---

## 📊 WHEN TO USE

| Condition | Microservices |
|-----------|---------------|
| Team > 20 developers | ✅ |
| Independent deployments needed | ✅ |
| Different scaling per service | ✅ |
| Team < 10 developers | ❌ Use Modular Monolith |
| Simple CRUD app | ❌ Overkill |

---

## ⚠️ CHALLENGES

- **Distributed transactions** - Use Saga pattern
- **Service discovery** - Use Kubernetes DNS
- **Data consistency** - Eventual consistency
- **Debugging** - Distributed tracing (Jaeger)
- **Testing** - Contract testing (Pact)

---

**Reference for**: Solution Architect, DevOps, Backend Agents
