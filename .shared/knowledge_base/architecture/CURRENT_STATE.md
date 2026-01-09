# 🏗️ CURRENT ARCHITECTURE STATE

<!-- VI: Trạng thái kiến trúc hiện tại. Update khi có thay đổi kiến trúc -->

> **PURPOSE**: Document current system architecture
> **Last Updated**: 2026-01-09 11:25
> **Updated By**: Gemini (UI/UX & DevOps Agent)

---

## 📊 System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER BROWSER                             │
│                            │                                    │
└─────────────────────────────│───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    VERCEL EDGE NETWORK                          │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    FRONTEND                              │    │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐    │    │
│  │  │ React   │  │ Vite    │  │Tailwind │  │ Router  │    │    │
│  │  │ 18.x    │  │ Build   │  │ CSS v4  │  │ DOM v6  │    │    │
│  │  └─────────┘  └─────────┘  └─────────┘  └─────────┘    │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              │                                   │
│                              ▼                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                  SERVERLESS API                         │    │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐    │    │
│  │  │ auth/   │  │students/│  │classes/ │  │reports/ │    │    │
│  │  │ login   │  │ index   │  │ index   │  │dashboard│    │    │
│  │  │ me      │  │         │  │         │  │         │    │    │
│  │  └─────────┘  └─────────┘  └─────────┘  └─────────┘    │    │
│  │  ┌─────────────────────────────────────────────────┐    │    │
│  │  │              attendance/                        │    │    │
│  │  │              index, bulk                        │    │    │
│  │  └─────────────────────────────────────────────────┘    │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              │                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                  SHARED LIBRARIES                       │    │
│  │  ┌─────────────────┐     ┌─────────────────┐           │    │
│  │  │  lib/prisma.ts  │     │  lib/auth.ts    │           │    │
│  │  │  (Singleton)    │     │  (JWT Utils)    │           │    │
│  │  └─────────────────┘     └─────────────────┘           │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────│───────────────────────────────┘
                                  │
                                  ▼ Transaction Pooler (port 6543)
┌─────────────────────────────────────────────────────────────────┐
│                    SUPABASE CLOUD                               │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              POSTGRESQL DATABASE                        │    │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐    │    │
│  │  │ users   │  │students │  │ classes │  │teachers │    │    │
│  │  └─────────┘  └─────────┘  └─────────┘  └─────────┘    │    │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐    │    │
│  │  │ parents │  │student_ │  │attendance│  │receipts │    │    │
│  │  │         │  │classes  │  │         │  │         │    │    │
│  │  └─────────┘  └─────────┘  └─────────┘  └─────────┘    │    │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐    │    │
│  │  │payments │  │templates│  │activity │  │center_  │    │    │
│  │  │         │  │         │  │_logs    │  │settings │    │    │
│  │  └─────────┘  └─────────┘  └─────────┘  └─────────┘    │    │
│  └─────────────────────────────────────────────────────────┘    │
│  Project: rdtqbivfnrdcureoazbh | Region: ap-southeast-1         │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔧 Components

| Component | Technology        | Version          | Status  | Notes                    |
| --------- | ----------------- | ---------------- | ------- | ------------------------ |
| Frontend  | React             | 18.x             | ✅ Live | Vite build on Vercel     |
| Styling   | Tailwind CSS      | v4               | ✅ Live | Custom theme with @theme |
| Routing   | React Router      | v6               | ✅ Live | DOM-based                |
| API       | Vercel Serverless | Node 20          | ✅ Live | ES Modules               |
| ORM       | Prisma            | 5.14             | ✅ Live | PostgreSQL adapter       |
| Database  | PostgreSQL        | 15               | ✅ Live | Supabase managed         |
| Auth      | JWT               | jsonwebtoken 9.x | ✅ Live | 8h expiry                |
| Build     | Vite              | 5.x              | ✅ Live | Fast builds              |

---

## 📁 Module Structure

```
EDU_MANAGER_V2/
├── api/                    # Vercel Serverless Functions
│   ├── auth/
│   │   ├── login.ts        # POST /api/auth/login
│   │   └── me.ts           # GET /api/auth/me
│   ├── students/
│   │   └── index.ts        # GET/POST /api/students
│   ├── classes/
│   │   └── index.ts        # GET/POST /api/classes
│   ├── attendance/
│   │   ├── index.ts        # GET/POST /api/attendance
│   │   └── bulk.ts         # POST /api/attendance/bulk
│   └── reports/
│       └── dashboard.ts    # GET /api/reports/dashboard
│
├── lib/                    # Shared Libraries
│   ├── prisma.ts           # Prisma Client Singleton
│   └── auth.ts             # JWT & CORS helpers
│
├── prisma/
│   ├── schema.prisma       # Database schema (12 models)
│   └── seed.ts             # Initial data seeding
│
├── frontend/src/           # React Application
│   ├── components/         # Reusable UI components
│   ├── pages/              # 14 page components
│   ├── services/           # API abstraction layer
│   ├── context/            # Auth context
│   └── App.jsx             # Router configuration
│
├── backend/                # Express (local dev only)
│   └── src/                # Original backend code
│
├── vercel.json             # Vercel deployment config
├── package.json            # Root dependencies (ES Module)
└── tsconfig.json           # TypeScript config
```

---

## 🔗 Integration Points

| Integration   | Type       | Status    | Endpoint               |
| ------------- | ---------- | --------- | ---------------------- |
| Supabase DB   | PostgreSQL | ✅ Active | Transaction Pooler     |
| Vercel Deploy | CI/CD      | ✅ Active | Auto on push           |
| GitHub        | VCS        | ✅ Active | hts2008/edu_manager_v2 |
| JWT Auth      | Token      | ✅ Active | Bearer token           |

---

## 🔐 Security Considerations

- **CORS**: Configured to allow all origins (development)
- **JWT**: 8-hour token expiry with userId + role claims
- **Passwords**: bcrypt hashed (10 rounds)
- **DB Connection**: Transaction pooler with SSL

---

## 📈 Performance Metrics

| Metric       | Value  | Target     |
| ------------ | ------ | ---------- |
| Cold Start   | ~1.5s  | < 3s ✅    |
| API Response | ~200ms | < 500ms ✅ |
| Build Time   | ~45s   | < 2min ✅  |
| Bundle Size  | ~300kb | < 500kb ✅ |

---

**Architecture Version**: 2.0 (Vercel + Supabase)
**Previous**: 1.0 (Express + SQLite)
