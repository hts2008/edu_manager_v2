# 📚 EDU MANAGER V2

> Quản lý trung tâm dạy thêm - Học viên, Điểm danh, Thu/Chi, In phiếu

## ✨ Features

- 🔐 **Authentication**: JWT token + Role-based access control
- 👥 **CRUD Modules**: Học viên, Phụ huynh, Giáo viên, Lớp học
- 📅 **Attendance**: Điểm danh theo lớp/ngày, tính học phí tự động
- 💰 **Finance**: Thu học phí, Chi tiêu, Lịch sử giao dịch
- 📄 **Templates**: Thiết kế mẫu in phiếu với Fabric.js
- 🖨️ **PDF Export**: Xuất phiếu thu/chi ra PDF
- 📊 **Reports**: Báo cáo tài chính, học viên chưa đóng tiền
- 📋 **KANBAN Dashboard**: Theo dõi tiến độ dự án real-time

## 🚀 Quick Start

### Local Development

1. **Clone repository**
```bash
git clone https://github.com/hts2008/edu_manager_v2.git
cd edu_manager_v2
```

2. **Install dependencies**
```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

3. **Start development servers**
```bash
# Option 1: Use start.bat (Windows)
start.bat

# Option 2: Manual
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend
cd frontend && npm run dev
```

4. **Open browser**
- Frontend: http://localhost:3000
- Backend: http://localhost:5000
- Login: `admin` / `admin123`

### Docker Deployment

```bash
# Build and run
docker-compose up -d

# Or use script
start-docker.bat
```

Access at http://localhost

## 📁 Project Structure

```
edu_manager_v2/
├── backend/          # Express + SQLite API
│   ├── src/
│   │   ├── database/ # SQLite schema, migrations
│   │   ├── middleware/ # Auth, logger, error handler
│   │   ├── routes/   # API endpoints (11 files)
│   │   ├── services/ # PDF generation
│   │   └── server.js
│   └── Dockerfile
├── frontend/         # React + Vite + Tailwind
│   ├── src/
│   │   ├── components/ # Layout, UI components
│   │   ├── context/    # AuthContext
│   │   ├── pages/      # 14 page components
│   │   └── services/   # API abstraction
│   ├── Dockerfile
│   └── nginx.conf
├── dashboard.html    # Visual KANBAN Dashboard
├── docker-compose.yml
├── start.bat         # Local dev start
└── start-docker.bat  # Docker deployment
```

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, Vite, Tailwind CSS v4 |
| Backend | Express.js, better-sqlite3 |
| Auth | JWT (jsonwebtoken) |
| PDF | pdfmake |
| Template Editor | Fabric.js |
| Container | Docker, Nginx |

## 📊 API Endpoints

| Module | Endpoints |
|--------|-----------|
| Auth | `/api/auth/login`, `/api/auth/me` |
| Students | `/api/students` (CRUD) |
| Parents | `/api/parents` (CRUD) |
| Teachers | `/api/teachers` (CRUD) |
| Classes | `/api/classes` (CRUD) |
| Attendance | `/api/attendance` (bulk, calculate-fee) |
| Receipts | `/api/receipts`, `/api/receipts/:id/pdf` |
| Payments | `/api/payments`, `/api/payments/:id/pdf` |
| Templates | `/api/templates` (CRUD, set-default) |
| Reports | `/api/reports/dashboard`, `/api/reports/financial` |
| KANBAN | `/api/kanban` |

## 📋 KANBAN Dashboard

Open `dashboard.html` in browser to view real-time project progress.

Features:
- ✅ Auto-sync với `task.md` mỗi 5 giây
- ✅ Phase progress cards
- ✅ Task board (Done, In Progress, Todo, Bugs)
- ✅ Server status monitoring

## 🔑 Default Credentials

| Role | Username | Password |
|------|----------|----------|
| Admin | admin | admin123 |
| Receptionist | receptionist | recept123 |

## 📝 License

MIT License - See [LICENSE](LICENSE) file

---

Made with ❤️ by hts2008
