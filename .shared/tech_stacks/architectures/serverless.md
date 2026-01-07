# ⚡ SERVERLESS ARCHITECTURE
<!-- VI: Kiến trúc Serverless - pay-per-use, auto-scaling -->

> **Best for**: Variable traffic, event-driven, cost optimization
> **Complexity**: Medium | **Provider**: AWS/Vercel/Cloudflare

---

## 📊 ARCHITECTURE OVERVIEW

```
┌─────────────────────────────────────────────────────────────┐
│                     CDN / Edge (Cloudflare)                  │
├─────────────────────────────────────────────────────────────┤
│                    API Gateway                               │
│           (AWS API Gateway / Vercel Edge)                    │
├─────────────────────────────────────────────────────────────┤
│  Lambda     │  Lambda     │  Lambda     │  Edge Function    │
│  (Auth)     │  (Users)    │  (Orders)   │  (Middleware)     │
├─────────────────────────────────────────────────────────────┤
│             Managed Services                                 │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐        │
│  │ RDS/    │  │ S3      │  │ SQS     │  │ Redis   │        │
│  │ DynamoDB│  │ Storage │  │ Queue   │  │ Cache   │        │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘        │
└─────────────────────────────────────────────────────────────┘
```

---

## 📁 PROJECT STRUCTURE (Vercel)

```
project/
├── app/                     # Next.js App Router
│   ├── api/                 # Serverless functions
│   │   ├── users/
│   │   │   └── route.ts     # /api/users
│   │   └── orders/
│   │       └── route.ts     # /api/orders
│   ├── page.tsx
│   └── layout.tsx
├── lib/
│   ├── db.ts                # Database connection
│   └── auth.ts              # Auth utilities
├── middleware.ts            # Edge middleware
└── vercel.json
```

---

## 🔧 SERVERLESS FUNCTION PATTERN

### Vercel Edge Function
```typescript
// app/api/users/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const runtime = 'edge'; // Run on edge

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Number(searchParams.get('limit')) || 20;
  
  const users = await prisma.user.findMany({ take: limit });
  
  return NextResponse.json({ data: users });
}

export async function POST(request: Request) {
  const body = await request.json();
  
  const user = await prisma.user.create({ data: body });
  
  return NextResponse.json({ data: user }, { status: 201 });
}
```

### AWS Lambda Pattern
```typescript
// functions/users.ts
import { APIGatewayProxyHandler } from 'aws-lambda';
import { prisma } from './lib/db';

export const handler: APIGatewayProxyHandler = async (event) => {
  const { httpMethod, pathParameters, body } = event;
  
  try {
    switch (httpMethod) {
      case 'GET':
        const users = await prisma.user.findMany();
        return {
          statusCode: 200,
          body: JSON.stringify({ data: users }),
        };
        
      case 'POST':
        const data = JSON.parse(body || '{}');
        const user = await prisma.user.create({ data });
        return {
          statusCode: 201,
          body: JSON.stringify({ data: user }),
        };
        
      default:
        return { statusCode: 405, body: 'Method Not Allowed' };
    }
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal Server Error' }),
    };
  }
};
```

---

## 📊 WHEN TO USE

| Condition | Serverless |
|-----------|------------|
| Variable/unpredictable traffic | ✅ |
| Pay-per-use cost model | ✅ |
| Quick deployments | ✅ |
| Long-running processes | ❌ (timeout limits) |
| WebSocket connections | ⚠️ (limited support) |
| Consistent low latency | ⚠️ (cold starts) |

---

## ⚠️ CONSIDERATIONS

- **Cold starts**: First request may be slow
- **Timeouts**: Usually 10-30 second limits
- **State**: Functions are stateless
- **Database**: Use connection pooling
- **Cost**: Can be expensive at very high scale

---

**Reference for**: DevOps, Backend, Solution Architect Agents
