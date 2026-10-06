# PRD — Edu Manager V2 (Hiện trạng)

> **Tài liệu mô tả sản phẩm hiện tại** — chỉ mô tả những gì đang tồn tại trong codebase, không bao gồm đề xuất cải tiến (xem `PRD_KANBAN_SOLUTION.md`).

| Trường | Giá trị |
|---|---|
| Tên sản phẩm | Edu Manager V2 — Quản lý trung tâm dạy thêm |
| Phiên bản | 2.0 |
| Repository | `hts2008/edu_manager_v2` |
| Production URL | https://edu-manager-delta.vercel.app |
| Ngôn ngữ UI | Tiếng Việt (100%) |
| Ngày lập tài liệu | 2026-04-26 |
| Trạng thái | Production Live (một phần) — xem §14 |

---

## 1. Executive Summary

Edu Manager V2 là một SPA (Single Page Application) tiếng Việt phục vụ vận hành hằng ngày của trung tâm dạy thêm: quản lý học sinh / phụ huynh / giáo viên / lớp học, điểm danh theo phiên SAP-style, tính học phí tự động, lập biên lai thu/chi với mẫu in tuỳ biến (Fabric.js), và báo cáo tài chính.

Hệ thống được xây dựng trên React 18 + Vite + Tailwind CSS v4 ở phía frontend, với **kiến trúc kép phía backend**: Express + better-sqlite3 cho local development và Vercel Serverless TypeScript + Prisma + Supabase PostgreSQL cho production. Schema dữ liệu gồm 14 entity với các quan hệ M-N, lifecycle workflow (điểm danh, học phí), audit log và center settings.

Sản phẩm có 14 page chính và 70+ API endpoint (tổng cả 2 backend), hỗ trợ 2 vai trò: **Admin** (toàn quyền) và **Receptionist / Lễ tân** (vận hành hằng ngày). Tài liệu nội bộ tuyên bố hoàn thành 100%, nhưng đánh giá thực tế cho thấy production hoàn thiện ~50–60% (xem §14).

---

## 2. Background & Context

### 2.1. Bối cảnh thị trường
Trung tâm dạy thêm tại Việt Nam thường có quy mô vừa và nhỏ (50–500 học sinh), vận hành chủ yếu bằng Excel + sổ tay giấy hoặc các phần mềm quản lý chung không chuyên cho mảng giáo dục bổ trợ. Việc ghi nhận điểm danh, tính học phí theo buổi, in biên lai chuyên nghiệp, đối soát thu chi cuối tháng đều mất nhiều thời gian thủ công.

### 2.2. Lý do tồn tại sản phẩm
Edu Manager V2 hợp nhất các tác vụ trên trong một ứng dụng web duy nhất, có lưu trữ dữ liệu tập trung, hỗ trợ in PDF biên lai, theo dõi nợ phí, và báo cáo tài chính. Sản phẩm hướng tới việc **thay thế Excel** chứ không phải cạnh tranh với hệ thống quản lý trường học toàn diện.

### 2.3. Phạm vi sản phẩm hiện tại
- **In scope:** Quản lý hồ sơ học sinh / phụ huynh / giáo viên / lớp; điểm danh theo phiên; tính học phí theo buổi tham gia; lập biên lai thu / phiếu chi; mẫu in tuỳ biến; báo cáo tài chính theo khoảng thời gian.
- **Out of scope (chưa có):** Quản lý bài tập / điểm số / kỳ thi; cổng thông tin phụ huynh; tích hợp thanh toán online; SMS / email reminder; đa trung tâm (multi-tenant); ứng dụng mobile.

---

## 3. Vision & Goals

### 3.1. Vision statement
> *Trở thành công cụ một-cửa giúp trung tâm dạy thêm Việt Nam vận hành chuyên nghiệp như một doanh nghiệp số, không phụ thuộc Excel hay sổ giấy.*

### 3.2. Mục tiêu kinh doanh (giả định, suy ra từ feature set)
- Giảm thời gian thao tác hành chính hằng ngày của lễ tân (ước tính 2–3 giờ/ngày → < 30 phút).
- Loại bỏ sai sót khi tính học phí thủ công, đặc biệt với lớp có lịch học không đều.
- Cung cấp số liệu tài chính tức thời cho chủ trung tâm (thay vì cuối tháng tổng kết).
- Chuyên nghiệp hoá biên lai thu/chi (PDF có logo, MST, định dạng nhất quán).

### 3.3. Mục tiêu sản phẩm — Tier
| Tier | Mục tiêu |
|---|---|
| Must-have | CRUD học sinh / phụ huynh / lớp / giáo viên; điểm danh; tính học phí; biên lai PDF; báo cáo tài chính cơ bản |
| Should-have | Workflow chốt điểm danh (kỳ); template tuỳ biến; phiếu chi theo danh mục; lịch sử giao dịch hợp nhất; export Excel |
| Nice-to-have | KANBAN dashboard nội bộ; thiết kế template bằng canvas (Fabric.js); thermal 80mm support |

---

## 4. Target Users & Personas

### 4.1. Persona 1 — Chủ trung tâm / Quản lý (Admin)
- **Profile:** 30–50 tuổi, đa phần không phải dân kỹ thuật; quan tâm số liệu tổng thể, doanh thu, công nợ, hiệu quả giáo viên.
- **Pain points:** Không nắm thực-thời doanh thu / nợ phí; phụ thuộc lễ tân tổng hợp Excel cuối tháng; khó truy vết biên lai cũ.
- **Hành vi sử dụng:** Vài lần / tuần, mở Dashboard và Reports; thi thoảng duyệt phiếu chi lương.
- **Trang thường dùng:** Dashboard, Reports, Payments, Templates, Attendance Periods (approve/lock).

### 4.2. Persona 2 — Lễ tân / Receptionist
- **Profile:** 22–35 tuổi, sử dụng máy tính tốt; làm việc hằng ngày tại quầy.
- **Pain points:** Phải đối chiếu nhiều sổ; tính học phí thủ công khi học sinh học bù / nghỉ; áp lực in biên lai nhanh khi phụ huynh đợi.
- **Hành vi sử dụng:** Hằng ngày, gần như cả ca; thao tác nhiều lượt CRUD + điểm danh + thu phí.
- **Trang thường dùng:** Students, Parents, Attendance, Fee Collection, Receipts, History.

### 4.3. Persona 3 — Giáo viên (chỉ là entity, không có account riêng)
- Hiện không có quyền đăng nhập. Thông tin lương + lớp phụ trách được Admin nhập.

### 4.4. Persona 4 — Phụ huynh (tương lai, chưa có)
- Ngoài phạm vi v2.0; được nhắc đến trong roadmap như Phase C.

---

## 5. User Journeys

### 5.1. Journey A — Tiếp nhận học sinh mới
1. Lễ tân login với credential `nhanvien / staff123`.
2. Vào trang **Phụ huynh** → tạo bản ghi Parent (họ tên, SĐT, mối quan hệ).
3. Vào trang **Học viên** → tạo Student, link tới Parent vừa tạo, nhập DOB / giới tính.
4. Trong cùng modal, tick chọn các Class muốn ghi danh (multi-select có hiển thị `fee_per_day`).
5. Lưu — học sinh xuất hiện trong danh sách lớp đó.

**Kết quả mong đợi:** Một bản ghi Student liên kết Parent + 1..n Class qua bảng `student_classes`.

### 5.2. Journey B — Vận hành điểm danh hằng tháng
1. Đầu tháng: Lễ tân vào **Điểm danh**, chọn lớp, lịch xuất hiện 3 tháng (trước / hiện tại / sau).
2. Hệ thống tạo `AttendancePeriod` cho `(class, period_month)` ở trạng thái `open`.
3. Mỗi buổi học, lễ tân chọn tuần → grid timesheet xuất hiện → click ô để chuyển trạng thái: `present` ✅ / `absent_with_fee` ⚠️ / `absent_no_fee` ❌ / `holiday` 🎉.
4. Cuối tháng: nhấn **Submit** → period chuyển sang `submitted`.
5. Admin vào **Chốt điểm danh** → review → **Approve** → `approved`.
6. Admin nhấn **Lock** → `locked`. Sau khi lock, không thể sửa attendance nữa.

**Kết quả mong đợi:** AttendancePeriod ở trạng thái `locked`, sẵn sàng cho bước tính học phí.

### 5.3. Journey C — Thu học phí
1. Lễ tân vào **Thu học phí** (Fee Collection), chọn tháng.
2. Hệ thống hiển thị danh sách học sinh + trạng thái fee:
   - `pending` → chưa tính
   - `ready` → đã tính xong (bằng Calculate)
   - `confirmed` → đã chốt số (Admin / Lễ tân confirm)
   - `paid` → đã thu tiền
3. Với học sinh ở `pending`: nhấn **Tính phí** → đọc số buổi present + absent_with_fee từ AttendancePeriod đã lock → tạo `MonthlyFee` ở `ready`.
4. Confirm → `confirmed`.
5. Nhấn **💰 Thu tiền** → modal chọn `payment_method` (cash / transfer) → tạo Receipt + cập nhật MonthlyFee → `paid`.
6. Tải PDF biên lai (in / gửi phụ huynh).

**Kết quả mong đợi:** Bản ghi Receipt + MonthlyFee `paid` + PDF có thể download.

### 5.4. Journey D — Phiếu chi (Payment)
1. Admin vào **Chi tiền**.
2. Click **Tạo phiếu chi** → modal: chọn category (`salary` / `utility` / `office` / `other`).
3. Nếu category = salary, có dropdown chọn nhanh giáo viên → auto-fill name + phone.
4. Nhập số tiền + ghi chú → Lưu.
5. Có thể tải PDF.

**Kết quả mong đợi:** Bản ghi Payment + PDF.

### 5.5. Journey E — Báo cáo tài chính
1. Admin vào **Báo cáo**.
2. Chọn report type (daily / weekly / monthly / yearly) + date range.
3. Hệ thống hiển thị:
   - 3 summary cards: tổng thu / tổng chi / chênh lệch
   - Biểu đồ horizontal bar: chi theo danh mục
   - Statistics: số lượng phiếu thu / phiếu chi / trung bình mỗi phiếu
4. Có thể export Excel hoặc Print.

**Kết quả mong đợi:** Số liệu trùng khớp với tổng phiếu thu/chi trong khoảng thời gian đó.

### 5.6. Journey F — Tuỳ biến mẫu in
1. Admin vào **Mẫu in**.
2. Click **Tạo template** → modal: tên, type (receipt/payment), paper size (A4/A5/Letter/thermal_80mm), orientation.
3. Sau khi tạo, click **🎨 Design** → chuyển sang `/templates/:id/design` (full-screen Fabric.js canvas).
4. Kéo thả text, image, table, line; lưu cấu hình JSON vào `Template.jsonConfig`.
5. Đặt template làm default cho `type` đã chọn → các Receipt / Payment mới sẽ dùng template này.

**Kết quả mong đợi:** Template lưu được và áp dụng khi gen PDF.

---

## 6. Functional Specifications (theo từng page)

### 6.1. LoginPage (`/login`)
- Form: `username`, `password`; nút Submit; thông tin demo `admin/admin123`.
- POST `/api/auth/login` → trả về `{ token, user }`; lưu vào `localStorage`.
- Validate non-empty cả 2 trường; hiển thị toast lỗi nếu sai.

### 6.2. DashboardPage (`/`)
- Header: "Tổng quan" + ngày hiện tại theo locale `vi-VN`.
- 4 stat cards: học sinh active / tổng lớp / doanh thu tháng / chi phí tháng.
- 4 quick action buttons: Điểm danh / Thu tiền / Thêm học viên / Báo cáo.
- 2 widget cards: Recent transactions (5 phiếu gần nhất) / Unpaid students (5 học sinh nợ phí).
- Data: `GET /api/reports/dashboard`.

### 6.3. StudentsPage (`/students`)
- Header + nút "Thêm học viên".
- 4 stat cards: tổng / active / nam / nữ.
- DataTable: Name (avatar) | Classes (badges) | Parent + phone | DOB | Status | Actions (Edit / Delete).
- Form modal create/edit: `full_name*`, `student_code` (auto), `date_of_birth`, `gender`, `parent_id` (dropdown auto-fill phone), `notes`, `status`, `class_ids[]` (multi-select checkbox).
- Endpoints: `GET/POST/PUT/DELETE /api/students`.

### 6.4. ParentsPage (`/parents`)
- DataTable: tên | phone | email | quan hệ | số con | actions.
- Form modal: `full_name*`, `phone*` (unique), `email`, `address`, `relationship` (father/mother/guardian), `notes`.
- Endpoints: `GET/POST/PUT/DELETE /api/parents`.

### 6.5. ClassesPage (`/classes`)
- DataTable: tên | giáo viên | lịch học | giờ | fee/buổi | sĩ số | status.
- Form modal có **2 cách lập lịch** (ít nhất 1 bắt buộc):
  - **By weekday**: checkbox T2–CN + cờ `schedule_required` (bắt buộc đúng ngày).
  - **By sessions/week**: số buổi 1–7 + cờ `session_required` (bắt buộc đúng số buổi).
- Trường khác: `start_time`, `end_time`, `fee_per_day`, `max_students`, `teacher_id`, `status`, `notes`.
- Endpoints: `GET/POST/PUT/DELETE /api/classes` + action `enroll`.

### 6.6. TeachersPage (`/teachers`) — admin only
- 4 stat cards: tổng / active / hourly / chi phí lương cố định/tháng.
- DataTable: tên | email | môn dạy | salary type | salary amount | status.
- Form modal: `full_name*`, `phone`, `email`, `subject`, `salary_type` (toggle hourly/fixed), `salary_amount`, `status`, `notes`.
- Endpoints: `GET/POST/PUT/DELETE /api/teachers`.

### 6.7. AttendancePage (`/attendance`) — phức tạp nhất
- Class selector + hiển thị `fee_per_day`.
- Calendar grid 3 tháng (prev / current / next), tô màu ô lịch học theo `schedule_days`.
- Click tuần → hiển thị grid timesheet:
  - Sticky cột tên học sinh.
  - Cột ngày trong tuần + nút "Select All" theo ngày.
  - Cell click cycle qua 5 trạng thái: empty / present / absent_with_fee / absent_no_fee / holiday.
  - Cột tổng kết: số buổi / fee.
- Period status badge + action buttons (Submit / Approve / Lock / Unlock).
- Tính fee theo công thức: `fee_per_session = fee_per_day / (sessions_per_week × 4.33)` (heuristic).
- Endpoints: `POST /api/attendance/bulk`, `GET /api/attendance/month`, `GET /api/attendance/calculate-fee`.

### 6.8. AttendancePeriodsPage (`/attendance-periods`)
- 5 stat cards theo status (Total / Open / Submitted / Approved / Locked).
- Filters: lớp / status / tháng.
- DataTable: lớp | tháng | status | sessions | attendance count | actions theo status.
- AttendanceReviewModal: hiển thị chi tiết attendance trước khi approve.
- Endpoints: `GET/POST /api/attendance-periods`, `POST /api/attendance-periods/[id]?action=submit|approve|lock|unlock|reject`.

### 6.9. ReceiptsPage (`/receipts`)
- DataTable: receipt id | tên HS | tháng | số buổi | amount | payment method | created_at | nút Print.
- Form modal: chọn `student_id` + `month` → auto-calc `days_count`, `fee_per_day`, `amount`; chọn `payment_method` (cash/transfer); notes.
- Endpoints: `GET/POST/DELETE /api/receipts`, `GET /api/receipts/:id/pdf`.

### 6.10. PaymentsPage (`/payments`) — admin only
- DataTable: id | category badge | recipient + phone | amount | notes | created_at.
- Form modal: 4 category buttons (👨‍🏫 salary / 💡 utility / 📦 office / 📝 other); nếu salary thì có dropdown chọn nhanh giáo viên auto-fill; `recipient_name*`, `recipient_phone`, `amount*`, `notes`.
- Endpoints: `GET/POST/DELETE /api/payments`, `GET /api/payments/:id/pdf`.

### 6.11. FeeCollectionPage (`/fee-collection`)
- Month navigator (← →).
- 5 summary cards: tổng HS / chờ thu / đã thu / số tiền đã thu / tổng số tiền.
- Status filter buttons với badge số lượng.
- DataTable: HS | lớp | attendance summary | amount | status | action button (Tính phí / Thu tiền / In lại).
- Payment confirmation modal: chọn payment_method.
- Endpoints: `GET /api/monthly-fees`, `POST /api/monthly-fees/calculate`, `POST /api/monthly-fees/:id/confirm|pay|cancel`.

### 6.12. HistoryPage (`/history`)
- 3 summary cards: tổng thu / tổng chi / chênh lệch (xanh nếu dương, cam nếu âm).
- Type filter: Tất cả / Chỉ Thu / Chỉ Chi.
- Date range from→to.
- DataTable kết hợp Receipts + Payments, sort theo `created_at` desc.
- Cột actions: Print / Delete (admin only).
- Export Excel toàn bảng.

### 6.13. ReportsPage (`/reports`) — admin only
- Report type buttons: daily / weekly / monthly / yearly.
- Date range.
- 3 summary cards: total receipts / total payments / balance.
- Custom horizontal bar chart: expenses by category (không dùng recharts).
- Statistics grid: số phiếu thu / số phiếu chi / avg per receipt / avg per payment.
- Export Excel + Print.
- Endpoints: `GET /api/reports/financial`, `GET /api/reports/unpaid-students`.

### 6.14. TemplatesPage (`/templates`) — admin only
- Filter: tất cả / receipt / payment.
- Grid card cho mỗi template với preview, type badge, default badge, các nút (Design / Edit / Set default / Delete).
- Form modal: `template_name*`, `type`, `paper_size` (A4/A5/letter/thermal_80mm), `orientation`.
- Endpoints: `GET/POST/PUT/DELETE /api/templates`, `POST /api/templates/:id/set-default`, `POST /api/templates/upload-image`.

### 6.15. TemplateDesignerPage (`/templates/:id/design`)
- Full-screen, không sidebar.
- Fabric.js canvas; tools để thêm text, image, line, table.
- Lưu canvas JSON vào `Template.jsonConfig` qua `PUT /api/templates/:id`.

---

## 7. Non-Functional Requirements

| Hạng mục | Yêu cầu hiện tại |
|---|---|
| Browser | Chrome / Edge / Safari (latest 2 versions) |
| Performance | Page load < 2s; list < 1s với 1000 records (chưa benchmark) |
| Security | JWT 24h, bcrypt rounds 10, role-based, CORS allow-all |
| i18n | Tiếng Việt cứng, hard-coded (không có i18n lib) |
| Format VN | DD/MM/YYYY, "1.234.567đ", weekday CN/T2..T7 |
| Responsive | Desktop ưu tiên, tablet OK, mobile sidebar overlay |
| Dark mode | Không hỗ trợ |
| Offline | Không hỗ trợ |
| Audit log | Có schema, ghi nhận ở backend Express; chưa có UI |
| Backup | Manual qua `backup.bat` (Windows); production chưa tự động |

---

## 8. Data Model

Schema canonical: `prisma/schema.prisma` (468 dòng, 14 model, PostgreSQL). Local Express dùng schema SQLite tương ứng nhưng raw SQL.

### 8.1. Sơ đồ quan hệ chính

```
User ─┬─< Receipt
      ├─< Payment
      ├─< Template
      ├─< ActivityLog
      ├─< Attendance (createdBy)
      └─< AttendancePeriod (submittedBy / approvedBy / lockedBy)

Parent ──< Student ──< StudentClass >── Class ──< AttendancePeriod
                            │                   │
                            ├─── Attendance ────┘
                            ├─── MonthlyFee
                            └─── Receipt
                                    │
                                    └── Template

Class >── Teacher

CenterSettings (singleton, id=1)
```

### 8.2. Các entity chính (highlight)

| Entity | Khoá tự nhiên | Field đặc biệt | Lifecycle / Workflow |
|---|---|---|---|
| User | `username` | `passwordHash`, `role` enum | — |
| Parent | `phone` (unique) | `relationship` enum | — |
| Student | — | `parentId` FK; `enrollmentDate`; `status` enum | active → inactive → graduated |
| Teacher | `phone` (unique) | `salaryType`, `salaryAmount` | — |
| Class | — | `scheduleDays` JSON, `sessionsPerWeek`, `feePerDay`, 2 cờ `*Required` | — |
| StudentClass | (`studentId`,`classId`) | `enrollmentDate`, `status` | active / inactive |
| Attendance | (`studentId`,`classId`,`attendanceDate`) | `status` enum, `isMakeUp`, `makeUpReason` | — |
| AttendancePeriod | (`classId`,`periodMonth`) | tổng sessions/present/absent_fee/absent_nofee/holiday | open → submitted → approved → locked |
| MonthlyFee | (`studentId`,`month`) | `totalDays`, `totalAmount`, `receiptId` | pending → ready → confirmed → paid (cancelled) |
| Receipt | — | `daysCount`, `feePerDay`, `amount`, `paymentMethod`, `templateId`, `pdfPath` | created (immutable) |
| Payment | — | `category` enum, `recipientName`, `templateId`, `pdfPath` | created (immutable) |
| Template | — | `type`, `paperSize`, `orientation`, `jsonConfig`, `isDefault` | — |
| ActivityLog | — | `userId`, `action`, `entityType`, `entityId`, IP/UA | append-only |
| CenterSettings | id=1 | tên, address, phone, email, logo | singleton |

### 8.3. Enums chính
- `UserRole`: `admin`, `receptionist`
- `Status`: `active`, `inactive`
- `Relationship`: `father`, `mother`, `guardian`
- `StudentStatus`: `active`, `inactive`, `graduated`
- `Gender`: `male`, `female`, `other`
- `SalaryType`: `hourly`, `fixed`
- `AttendanceStatus`: `present`, `absent_with_fee`, `absent_no_fee`, `holiday`
- `PeriodStatus`: `open`, `submitted`, `approved`, `locked`
- `FeeStatus`: `pending`, `ready`, `confirmed`, `paid`
- `PaymentMethod`: `cash`, `transfer`
- `PaymentCategory`: `salary`, `utility`, `office`, `other`
- `TemplateType`: `receipt`, `payment`
- `PaperSize`: `a4`, `a5`, `letter`, `thermal_80mm`
- `Orientation`: `portrait`, `landscape`

### 8.4. Index & ràng buộc đáng chú ý
- `Attendance` unique `(studentId, classId, attendanceDate)` — chống điểm danh trùng.
- `AttendancePeriod` unique `(classId, periodMonth)` — mỗi lớp 1 period/tháng.
- `MonthlyFee` unique `(studentId, month)` — mỗi học sinh 1 fee/tháng.
- `StudentClass` unique `(studentId, classId)` — không enroll trùng.
- Cascade delete chỉ trên `StudentClass` (khi xoá Student/Class).
- Index trên các field truy vấn nhiều: `phone`, `fullName`, `status`, `attendanceDate`, `month`, …

---

## 9. Technical Architecture

### 9.1. Sơ đồ tổng quan
```
                 ┌──────────────────┐
                 │   Browser (SPA)  │
                 │ React + Vite     │
                 └────────┬─────────┘
                          │ /api/*
            ┌─────────────┴─────────────┐
            │                           │
   LOCAL DEV (5000)             PRODUCTION (Vercel)
   Express + better-sqlite3    Serverless TS Functions
   13 route files               api/*.ts (7 module)
            │                           │
   data/edumanager.db          @prisma/client
                                        │
                                Supabase PostgreSQL
                                14 tables
```

### 9.2. Frontend
- **Framework:** React 18 + Vite 7.
- **Routing:** React Router v7.11; tất cả route (trừ login) bọc trong `ProtectedRoute` + `MainLayout` (Sidebar + Header).
- **State:** React Context API (`AuthContext` cho user/token); local component state.
- **Styling:** Tailwind CSS v4 + `@tailwindcss/vite`; design system tokens trong `index.css`.
- **Data fetching:** thuần `fetch()` qua `frontend/src/services/api.js` với timeout 30s + 401 interceptor.
- **Form:** controlled state thủ công, không dùng react-hook-form / zod.
- **Special libs:** Fabric.js v7 (canvas designer), pdfmake (in PDF), xlsx (export Excel).

### 9.3. Backend Local — Express + SQLite
- **Entry:** `backend/src/server.js`, port 5000.
- **DB:** `better-sqlite3`, file tại `backend/data/edumanager.db`, WAL mode + foreign_keys ON.
- **Middleware:** custom `auth.js` (JWT verify), `logger.js`, `errorHandler.js`.
- **Schema:** `backend/src/database/schema.sql` + migrations folder.
- **Routes:** 13 file (auth / students / parents / teachers / classes / attendance / attendance-periods / receipts / payments / monthly-fees / templates / reports / kanban).
- **PDF:** `services/pdfService.js` dùng pdfmake.
- **Upload ảnh:** multer (FS write).

### 9.4. Backend Production — Vercel Serverless + Prisma
- **Entry:** mỗi file `api/**/*.ts` là một function độc lập.
- **DB:** Supabase PostgreSQL qua Prisma Client (singleton trong `lib/prisma.ts`).
- **Auth helpers:** `lib/auth.ts`.
- **Function maxDuration:** 10s (theo `vercel.json`).
- **CORS:** allow-all origin với headers chuẩn.
- **Build:** `prisma generate && cd frontend && npm run build` → output `frontend/dist`.
- **Routing:** Vercel rewrites `/api/:path*` → function tương ứng; còn lại serve `index.html` (SPA fallback).

### 9.5. Triển khai
- **Vercel:** auto-deploy khi push lên `main`.
- **Docker (alternative, không hoạt động trên prod):** `docker-compose.yml` build Express + Nginx + SQLite.
- **Local dev:** `start.bat` kill port 3000+5000 rồi spawn 2 server.

---

## 10. API Inventory

### 10.1. Express (local) — 13 module, đầy đủ
| Module | File | Mức hoàn thiện |
|---|---|---|
| Auth | `routes/auth.js` (156 LOC) | Login, me, logout, change-password |
| Students | `routes/students.js` (271) | CRUD + class enrollment sync |
| Parents | `routes/parents.js` (84) | CRUD |
| Teachers | `routes/teachers.js` (71) | CRUD |
| Classes | `routes/classes.js` (331) | CRUD + enroll/unenroll |
| Attendance | `routes/attendance.js` (161) | List, bulk, calculate-fee |
| AttendancePeriods | `routes/attendance-periods.js` (308) | CRUD + submit/approve/lock/unlock |
| Receipts | `routes/receipts.js` (132) | CRUD + PDF |
| Payments | `routes/payments.js` (115) | CRUD + PDF |
| MonthlyFees | `routes/monthly-fees.js` (239) | List + calculate + confirm + pay + cancel |
| Templates | `routes/templates.js` (134) | CRUD + set-default + upload-image |
| Reports | `routes/reports.js` (130) | Dashboard + Financial + Unpaid |
| KANBAN | `routes/kanban.js` (320) | Sync với task.md |

### 10.2. Vercel (production) — 7 module, một phần
| Module | File | LOC | Trạng thái |
|---|---|---|---|
| Auth | `auth/login.ts`, `auth/me.ts` | 79 + 46 | OK 2 endpoint, **THIẾU** logout + change-password |
| Students | `students/index.ts` | 353 | OK |
| Parents | `parents/index.ts` | 213 | OK |
| Teachers | `teachers/index.ts` | 238 | OK |
| Classes | `classes/index.ts` | 291 | OK |
| Attendance | `attendance/index.ts`, `bulk.ts`, `month.ts` | 95 + 100 + 69 | OK 3 endpoint, **THIẾU** calculate-fee |
| AttendancePeriods | `attendance-periods/index.ts` + `[id]/index.ts` | 132 + … | OK |
| Reports | `reports/dashboard.ts` | 99 | Chỉ có dashboard, **THIẾU** financial + unpaid-students |
| **Receipts** | — | 0 | **VẮNG MẶT** |
| **Payments** | — | 0 | **VẮNG MẶT** |
| **MonthlyFees** | — | 0 | **VẮNG MẶT** |
| **Templates** | — | 0 | **VẮNG MẶT** |
| KANBAN | — | 0 | Vắng mặt (low priority) |

### 10.3. Frontend gọi vào những endpoint nào?
File `frontend/src/services/api.js` (258 LOC) định nghĩa 12 service object. Các endpoint mà UI gọi nhưng Vercel KHÔNG có:
- `POST /api/auth/logout`
- `POST /api/auth/change-password`
- `GET /api/attendance/calculate-fee`
- Tất cả `/api/receipts/*`
- Tất cả `/api/payments/*`
- Tất cả `/api/templates/*` (CRUD + set-default + upload-image + default-by-type)
- `GET /api/reports/financial`
- `GET /api/reports/unpaid-students`
- Tất cả `/api/monthly-fees/*` (CRUD + calculate + confirm + pay + cancel)

→ Kết quả khi user truy cập production: Network error / 404 trên 6/14 trang chính.

---

## 11. Security Model

| Khía cạnh | Triển khai hiện tại |
|---|---|
| Authentication | JWT (HS256), expire 24h; refresh token chưa thực sự rotate |
| Password storage | bcrypt rounds 10 |
| Authorization | Role-based: `admin` vs `receptionist`; check ở ProtectedRoute (FE) + middleware (Express); **trên Vercel chưa wrap đồng nhất** |
| CSRF | Không (SPA + token-based) |
| CORS | Allow-all origin trên Vercel; localhost:3000 trên Express |
| Rate limit | Không có |
| Input validation | Thủ công ở từng route + form; không có schema central |
| SQL injection | Express dùng prepared statement của better-sqlite3 OK; Vercel dùng Prisma OK |
| XSS | React tự escape; có dangerouslySetInnerHTML? — chưa thấy |
| Secrets | `.env` (gitignored); `.env.example` checked-in |
| Audit log | Schema có `ActivityLog`; Express ghi nhận; UI chưa có |
| Password reset | Chưa có |
| 2FA | Chưa có |

**Default credentials** (development): `admin/admin123`, `nhanvien/staff123`. **Cần đổi trước khi production thực sự dùng.**

---

## 12. UX & Design System

### 12.1. Tone & visual
- Premium dark sidebar (slate-900 gradient) + light content area.
- Heavy use of gradient (xanh dương đậm cho CTA), glass morphism trên overlay mobile.
- Emoji icons throughout (🏠 👨‍🎓 💰 📊 …).
- Status badges color-coded: green/yellow/red/gray.
- Avatars hình tròn, gradient nền, chữ initials.
- Animation custom: fadeIn, slideIn, shimmer, pulse-glow.

### 12.2. Component library
- 7 reusable UI component trong `frontend/src/components/ui/`: DataTable, Modal, Toast, Spinner, EmptyState, PageTransition + custom.
- 4 layout component: Header, Sidebar, MainLayout, ProtectedRoute.
- Special: `AttendanceReviewModal`, `ChangePasswordModal`.

### 12.3. Format
- Date: `toLocaleDateString('vi-VN')` → DD/MM/YYYY.
- Currency: `Intl.NumberFormat('vi-VN')` + suffix `đ` → "1.234.567đ".
- Day names: CN/T2/T3/T4/T5/T6/T7.

### 12.4. Hạn chế
- Hard-coded VI strings (không tách ra resource file).
- Không có dark mode (mặc dù sidebar đã tối).
- Một số chỗ bị trắng-trên-trắng (đã ghi nhận trong `PROJECT_CONTEXT.md`).
- Không có skeleton loader; chỉ có Spinner toàn trang.

---

## 13. Deployment & Operations

### 13.1. Production
- **URL:** https://edu-manager-delta.vercel.app
- **Hosting:** Vercel.
- **Database:** Supabase PostgreSQL (region ap-southeast-1, Singapore).
- **Auto-deploy:** Push lên branch `main` → Vercel build và deploy tự động.
- **Env vars cần có (Vercel dashboard):** `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, (optional) `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY`.

### 13.2. Local dev
- Chạy `start.bat` (Windows) — kill port 3000+5000, mở 2 terminal cho Express + Vite.
- Hoặc thủ công: `cd backend && npm run dev` + `cd frontend && npm run dev`.
- DB seed: `cd backend && npm run db:seed` → tạo admin user + sample.

### 13.3. Backup
- `backup.bat` copy file SQLite → folder `backups/`.
- Production Supabase: chưa có lịch backup tự động (mặc định Supabase free tier giữ 7 ngày PITR).

### 13.4. Monitoring
- Không có Sentry / DataDog / NewRelic.
- Logs Vercel: chỉ console.log của function, không có cấu trúc.

### 13.5. CI/CD
- Không có GitHub Actions; không có lint/test/build gate trước khi merge.

---

## 14. Current State Assessment (đánh giá thực tế)

### 14.1. Tuyên bố vs. thực tế

| Nguồn | Tuyên bố | Thực tế |
|---|---|---|
| `KANBAN.md` | "100% COMPLETE" | ~50–60% trên production |
| `PROJECT_CONTEXT.md` | "Production Live" | Đúng, nhưng nhiều trang vỡ |
| `README.md` | 70+ API endpoints | Đúng nếu tính cả Express; chỉ ~30 trên Vercel |

### 14.2. Bảng đánh giá theo trang

| Trang | UI | Local Express | Vercel Prod | Đánh giá thực tế |
|---|---|---|---|---|
| Login | ✅ | ✅ | ✅ | OK |
| Dashboard | ✅ | ✅ | ✅ | OK |
| Students | ✅ | ✅ | ✅ | OK |
| Parents | ✅ | ✅ | ✅ | OK |
| Classes | ✅ | ✅ | ✅ | OK |
| Teachers | ✅ | ✅ | ✅ | OK |
| Attendance (mark/list) | ✅ | ✅ | ✅ | OK |
| Attendance (calc-fee) | ✅ | ✅ | ❌ | Vỡ trên prod |
| AttendancePeriods | ✅ | ✅ | ✅ | OK |
| **FeeCollection** | ✅ | ✅ | ❌ | Vỡ hoàn toàn trên prod |
| **Receipts** | ✅ | ✅ | ❌ | Vỡ hoàn toàn trên prod |
| **Payments** | ✅ | ✅ | ❌ | Vỡ hoàn toàn trên prod |
| **Templates** | ✅ | ✅ | ❌ | Vỡ hoàn toàn trên prod |
| Reports (dashboard) | ✅ | ✅ | ✅ | OK |
| Reports (financial) | ✅ | ✅ | ❌ | Card trống trên prod |
| Reports (unpaid) | ✅ | ✅ | ❌ | Card trống trên prod |
| ChangePassword | ✅ | ✅ | ❌ | Vỡ trên prod |
| Logout | ✅ | ✅ | ❌ | Lỗi network trên prod |

### 14.3. Tài sản (asset) mạnh
- Schema Prisma 14 model — chất lượng cao, có index, unique, enum, cascade.
- UI complete cho 14 trang — design system nhất quán.
- Backend Express đầy đủ logic — có thể làm reference khi port.
- Multi-agent dev framework (`.agent/`, `CLAUDE.md`) — hỗ trợ AI-assisted development.
- Dual deployment option (Docker / Vercel).

### 14.4. Nợ kỹ thuật (technical debt)
- **Drift giữa 2 backend** — Express raw SQL vs Vercel Prisma; logic không sync.
- **Vercel thiếu ~1820 LOC** so với Express (5 module trống).
- **6 file `.backup`** rác trong `frontend/src/pages/` và `frontend/src/components/layout/`.
- **Không có test** — không unit, không integration, không E2E.
- **Không có CI/CD** — push thẳng prod.
- **Tài liệu sai sự thật** — KANBAN tuyên bố 100%.
- **multer-based upload ảnh** không chạy trên Vercel serverless (FS read-only).
- **Không có rate-limit** auth endpoint.
- **JWT middleware** chưa wrap đồng nhất trên Vercel functions.
- **Không tách string i18n** — khó mở rộng EN.
- **Bug white-on-white** chưa fix.

---

## 15. Glossary

| Thuật ngữ | Ý nghĩa |
|---|---|
| Phiếu thu / Receipt | Bản ghi học phí thu của học sinh, có PDF in cho phụ huynh |
| Phiếu chi / Payment | Bản ghi tiền chi (lương, điện nước, văn phòng, khác) |
| Điểm danh / Attendance | Bản ghi present/absent từng buổi cho từng học sinh |
| Kỳ điểm danh / AttendancePeriod | Tổ hợp (lớp, tháng) với workflow open→submitted→approved→locked |
| Chốt điểm danh | Hành động Submit + Approve + Lock period |
| Học phí tháng / MonthlyFee | Số tiền học sinh phải đóng tháng này (= số buổi × fee/buổi) |
| Make-up | Buổi học bù (`isMakeUp = true` trong Attendance) |
| Sessions per week | Số buổi học mỗi tuần (cấu hình ở Class) |
| Schedule days | Mảng các ngày trong tuần cố định (e.g. [2,4,6] = T2/T4/T6) |
| Template | Mẫu in PDF tuỳ biến bằng Fabric.js JSON config |
| Default template | Template mặc định cho mỗi `type` (receipt / payment) |

---

**Hết tài liệu PRD hiện trạng.** Để xem kế hoạch xử lý, đọc tiếp `PRD_KANBAN_SOLUTION.md`.






