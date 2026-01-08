# 📋 EDU MANAGER - PROJECT CONTEXT

> **Last Updated:** 2026-01-08 18:23  
> **Current Phase:** Production Ready  
> **Build Status:** ✅ Running

---

## 🎯 Project Overview

**Edu Manager** - Quản lý trung tâm dạy thêm

| Item       | Details                                              |
| ---------- | ---------------------------------------------------- |
| Tech Stack | React 18 + Vite + Tailwind CSS v4 + Express + SQLite |
| Frontend   | http://localhost:3000                                |
| Backend    | http://localhost:5000                                |
| Auth       | JWT Token + Role-based (admin/receptionist)          |
| Login      | `admin` / `admin123`                                 |
| KANBAN     | [dashboard.html](./dashboard.html)                   |

---

## ✅ Completed Features (13 Pages)

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

| Module     | Features                                            |
| ---------- | --------------------------------------------------- |
| Attendance | Class/date selection, status toggles, summary stats |
| Receipts   | Auto-fee calculation, payment method selection      |
| Payments   | Category icons, teacher quick-select for salary     |
| History    | Combined Thu/Chi view, filters, summary cards       |

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
├── frontend/src/
│   ├── components/
│   │   ├── layout/     # Header, Sidebar, MainLayout
│   │   └── ui/         # DataTable, Modal
│   ├── context/        # AuthContext
│   ├── pages/          # 13 page components
│   ├── services/       # API abstraction
│   └── App.jsx         # Router config
├── backend/src/
│   ├── database/       # SQLite, migrations, seed
│   ├── middleware/     # auth, logger, errorHandler
│   ├── routes/         # All API routes (11 files)
│   └── server.js       # Express app
├── dashboard.html      # Visual KANBAN Dashboard
└── shared/             # Shared types, constants
```

---

## 🔜 Next Steps

1. **Template Designer** - Fabric.js drag-drop editor cho thiết kế mẫu in
2. **PDF Export** - Export/Print phiếu thu chi
3. **Docker/Deployment** - Containerization

---

## 🐛 Known Issues

_All resolved:_

- ✅ Attendance weeks spanning months - fixed
- ✅ Attendance period 500 error - fixed

---

## 📊 Progress

| Metric        | Value |
| ------------- | ----- |
| Total Tasks   | ~235  |
| Completed     | ~150  |
| Progress      | ~64%  |
| Pages         | 13    |
| API Endpoints | 65+   |

---

## 📝 Notes

- Backend sử dụng better-sqlite3 (synchronous)
- All dates stored in ISO format
- Vietnamese comments in code
- API response format: `{ success: boolean, data: {...} }`
- KANBAN Dashboard auto-sync với task.md mỗi 5 giây
