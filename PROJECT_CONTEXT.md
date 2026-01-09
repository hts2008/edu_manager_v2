# 📋 EDU MANAGER - PROJECT CONTEXT

> **Last Updated:** 2026-01-09 11:25  
> **Current Phase:** Production Live  
> **Build Status:** ✅ Deployed to Vercel

---

## 🎯 Project Overview

**Edu Manager** - Quản lý trung tâm dạy thêm

| Item       | Details                                                 |
| ---------- | ------------------------------------------------------- |
| Tech Stack | React 18 + Vite + Tailwind CSS v4 + Vercel + PostgreSQL |
| Production | https://edu-manager-delta.vercel.app                    |
| Database   | Supabase PostgreSQL (Prisma ORM)                        |
| Auth       | JWT Token + Role-based (admin/receptionist)             |
| Login      | `admin` / `admin123`                                    |
| KANBAN     | [dashboard.html](./dashboard.html)                      |

---

## 🚀 Deployment Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    VERCEL CLOUD                         │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────┐    ┌─────────────┐                     │
│  │  Frontend   │    │  API Routes │                     │
│  │  (React)    │ ──▶│  (Node.js)  │                     │
│  │  Vite Build │    │  Serverless │                     │
│  └─────────────┘    └─────────────┘                     │
│                            │                            │
│                            ▼                            │
│                    ┌─────────────┐                      │
│                    │   Prisma    │                      │
│                    │   Client    │                      │
│                    └─────────────┘                      │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
              ┌─────────────────────────┐
              │    SUPABASE CLOUD       │
              │  ┌───────────────────┐  │
              │  │   PostgreSQL DB   │  │
              │  │  (12 tables)      │  │
              │  └───────────────────┘  │
              └─────────────────────────┘
```

---

## ✅ Completed Features (14 Pages)

### Auth & Security

- JWT authentication with token refresh
- Role-based access control (admin, receptionist)
- Protected routes with role checking
- Secure password hashing (bcrypt)

### Dashboard

- Stat cards (students, classes, thu/chi)
- Quick actions (điểm danh, thu tiền, thêm học viên)
- Recent transactions list
- Unpaid students list

### CRUD Modules

| Module   | Features                                   |
| -------- | ------------------------------------------ |
| Students | List, Add, Edit, Delete, Search, Filter    |
| Parents  | List, Add, Edit, Delete                    |
| Classes  | List, Add, Edit, Delete, Schedule picker   |
| Teachers | List, Add, Edit, Delete, Salary management |

### Operations

| Module       | Features                                            |
| ------------ | --------------------------------------------------- |
| Attendance   | Class/date selection, status toggles, summary stats |
| Att. Periods | Period management, submit/approve/lock workflow     |
| Receipts     | Auto-fee calculation, payment method selection      |
| Payments     | Category icons, teacher quick-select for salary     |
| History      | Combined Thu/Chi view, filters, summary cards       |

### Reports & KANBAN

| Module     | Features                                                            |
| ---------- | ------------------------------------------------------------------- |
| Reports    | Date range picker, type selector, summary cards, category breakdown |
| Templates  | Grid view, filter by type, create/edit/delete, set-default          |
| KANBAN API | Real-time sync với task.md, visual dashboard, auto-refresh          |

### Shared Components

- **DataTable**: sorting, filtering, pagination, custom render
- **Modal**: ESC close, click-outside, confirm variant
- **Forms**: validation, loading states, error handling

---

## 📁 Project Structure

```
EDU_MANAGER_V2/
├── api/                    # Vercel serverless functions (NEW)
│   ├── auth/               # Login, me endpoints
│   ├── students/           # Students CRUD
│   ├── classes/            # Classes CRUD
│   ├── attendance/         # Attendance + bulk
│   └── reports/            # Dashboard stats
├── lib/                    # Shared utilities (NEW)
│   ├── prisma.ts           # Prisma client singleton
│   └── auth.ts             # Auth helpers
├── prisma/                 # Database schema (NEW)
│   ├── schema.prisma       # PostgreSQL schema
│   └── seed.ts             # Seed data
├── frontend/src/
│   ├── components/
│   │   ├── layout/         # Header, Sidebar, MainLayout
│   │   └── ui/             # DataTable, Modal
│   ├── context/            # AuthContext
│   ├── pages/              # 14 page components
│   ├── services/           # API abstraction
│   └── App.jsx             # Router config
├── backend/src/            # Express app (local dev)
│   ├── database/           # SQLite, migrations, seed
│   ├── middleware/         # auth, logger, errorHandler
│   ├── routes/             # All API routes (11 files)
│   └── server.js           # Express app
├── vercel.json             # Vercel configuration (NEW)
├── package.json            # Root dependencies (NEW)
└── dashboard.html          # Visual KANBAN Dashboard
```

---

## 🔜 Next Steps

1. **UI/UX Improvements** - Fix white text issues
2. **More Seed Data** - Add realistic data to Supabase
3. **Performance Optimization** - Lazy loading, caching
4. **Custom Domain** - Setup custom domain for app

---

## 🐛 Known Issues

_All resolved:_

- ✅ Attendance weeks spanning months - fixed
- ✅ Attendance period 500 error - fixed
- ✅ ES Module import errors - fixed
- ⚠️ White text on white background - IN PROGRESS

---

## 📊 Progress

| Metric        | Value |
| ------------- | ----- |
| Total Tasks   | ~250  |
| Completed     | ~250  |
| Progress      | 100%  |
| Pages         | 14    |
| API Endpoints | 70+   |

---

## 🔧 Environment Variables (Vercel)

```env
DATABASE_URL=postgresql://postgres.rdtqbivfnrdcureoazbh:***@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres
DIRECT_URL=postgresql://postgres:***@db.rdtqbivfnrdcureoazbh.supabase.co:5432/postgres
JWT_SECRET=***
```

---

## 📝 Notes

- Backend uses Prisma with PostgreSQL on Vercel
- Backend uses better-sqlite3 for local dev
- All dates stored in ISO format
- Vietnamese comments in code
- API response format: `{ success: boolean, data: {...} }`
- KANBAN Dashboard auto-sync với task.md mỗi 5 giây
- ES Modules enabled with `"type": "module"` in package.json
