# PRD + KANBAN — Edu Manager V2 Solution Plan

> **Kế hoạch xử lý chi tiết** dựa trên PRD hiện trạng (`PRD_CURRENT_STATE.md`).
> Cấu trúc gồm: PRD giải pháp, KANBAN board chi tiết theo Phase, đặc tả từng task (file, acceptance criteria, test plan, dependency, risk).

| Trường | Giá trị |
|---|---|
| Repository | `hts2008/edu_manager_v2` |
| Branch | `claude/review-edu-manager-repo-Gf9FJ` |
| Ngày lập | 2026-04-26 |
| Phiên bản plan | 1.0 |
| Người chịu trách nhiệm | TBD |
| Chiến lược chốt | **Option A — Port Express → Vercel TS+Prisma** |

---

## Mục lục
1. [Executive Summary](#1-executive-summary)
2. [Quyết định chiến lược](#2-quyết-định-chiến-lược)
3. [PRD giải pháp — Phase A (Khẩn cấp)](#3-prd-giải-pháp--phase-a-khẩn-cấp)
4. [KANBAN — Phase A](#4-kanban--phase-a)
5. [Đặc tả chi tiết từng task Phase A](#5-đặc-tả-chi-tiết-từng-task-phase-a)
6. [PRD giải pháp — Phase B (Củng cố chất lượng)](#6-prd-giải-pháp--phase-b-củng-cố-chất-lượng)
7. [KANBAN — Phase B](#7-kanban--phase-b)
8. [PRD giải pháp — Phase C (Cải tiến tính năng)](#8-prd-giải-pháp--phase-c-cải-tiến-tính-năng)
9. [KANBAN — Phase C](#9-kanban--phase-c)
10. [PRD giải pháp — Phase D (Tăng trưởng)](#10-prd-giải-pháp--phase-d-tăng-trưởng)
11. [Risk Register](#11-risk-register)
12. [Verification & Acceptance](#12-verification--acceptance)
13. [Definition of Done](#13-definition-of-done)

---

## 1. Executive Summary

Production hiện đang vỡ ~6/14 trang do **Vercel Serverless API thiếu ~1820 LOC** so với Express local. Plan này đề xuất tiến hành theo 4 phase:

- **Phase A (1–2 tuần, P0):** Port 5 module thiếu (receipts, payments, monthly-fees, templates, reports financial+unpaid) + auth/logout + auth/change-password + attendance/calculate-fee. Mục tiêu: production usable.
- **Phase B (2–4 tuần, P1):** Củng cố chất lượng — testing, CI/CD, error tracking, validation, dọn dẹp.
- **Phase C (4–8 tuần, P2):** Mở rộng giá trị — bulk actions, import Excel, parent portal, SMS reminder, auto-cron, audit UI, soft-delete.
- **Phase D (2+ tháng, P3):** Tăng trưởng — multi-tenant, mobile PWA, online payment, AI insight.

Tổng effort phase A: ~10 ngày 1 dev. Tổng A+B: ~5 tuần. A+B+C: ~13 tuần.

---

## 2. Quyết định chiến lược

### 2.1. Tóm tắt 3 lựa chọn (chi tiết xem `review-repo-https-github-com-hts2008-edu-luminous-cocoa.md` §3)
| Option | Mô tả ngắn | Effort | TTV | Khuyến nghị |
|---|---|---|---|---|
| A | Port Express → Vercel TS+Prisma | L (3–4 tuần) | 1–2 tuần | **CHỌN** |
| B | Bỏ Vercel, dùng Express container | M-L (2–3 tuần) | 2–3 tuần | Plan B |
| C | Monorepo core package | XL (6–8 tuần) | 4+ tuần | Đợi |

### 2.2. Lý do chọn Option A
1. **Tận dụng tài sản hiện có:** Schema Prisma + Vercel infra + frontend đã trỏ `/api/*` đều giữ nguyên.
2. **Time-to-prod-usable nhanh nhất:** 1–2 tuần thay vì 2–3 tuần (B) hoặc 4+ tuần (C).
3. **Risk thấp:** Port từng module độc lập; rollback từng module dễ.
4. **Cost:** Vercel free tier vẫn đủ; không phải mua hosting mới.

### 2.3. Trade-off chấp nhận
- Tạm thời duy trì 2 codebase BE đến hết Phase B (sau đó deprecate Express khỏi prod-flow, giữ làm dev mock optional).
- PDF generation trong Vercel function bị giới hạn 30s (đã đủ cho receipt 1 trang).
- Upload ảnh phải refactor sang Supabase Storage (multer không chạy được trên Vercel).

---

## 3. PRD giải pháp — Phase A (Khẩn cấp)

### 3.1. Mục tiêu
Đưa production từ ~50–60% usable lên **100% usable** đối với feature set đã có UI. Mọi nút bấm trên `edu-manager-delta.vercel.app` không còn 404 / Network error.

### 3.2. Out of scope (sẽ làm ở phase sau)
- Refactor toàn bộ FE sang React Query / Zustand → Phase B.
- Thêm tính năng mới (parent portal, SMS, …) → Phase C.
- Test automation đầy đủ → Phase B.
- Đẹp hơn / UX cải tiến → Phase B.

### 3.3. Yêu cầu chức năng (Functional Requirements)

| FR-ID | Mô tả | Liên quan endpoint |
|---|---|---|
| FR-A1 | User đăng xuất → token bị vô hiệu (server-side blacklist hoặc client xoá) | `POST /api/auth/logout` |
| FR-A2 | User đổi mật khẩu → mật khẩu mới được lưu hash và yêu cầu mật khẩu cũ đúng | `POST /api/auth/change-password` |
| FR-A3 | Tính học phí tháng cho 1 học sinh dựa trên attendance đã `locked` | `GET /api/attendance/calculate-fee` |
| FR-A4 | CRUD Receipt + xuất PDF biên lai cho học sinh + tháng | `/api/receipts/*` |
| FR-A5 | CRUD Payment + xuất PDF phiếu chi | `/api/payments/*` |
| FR-A6 | CRUD Template + set default + upload ảnh logo lên Supabase Storage | `/api/templates/*` |
| FR-A7 | CRUD MonthlyFee + lifecycle calculate / confirm / pay / cancel | `/api/monthly-fees/*` |
| FR-A8 | Báo cáo tài chính theo khoảng thời gian | `GET /api/reports/financial` |
| FR-A9 | Danh sách học sinh nợ phí | `GET /api/reports/unpaid-students` |
| FR-A10 | Mọi endpoint Vercel cần wrap middleware `requireAuth` (kiểm JWT + role) | Toàn bộ `api/*.ts` |

### 3.4. Yêu cầu phi chức năng (NFR)
- Mọi endpoint phải trả về `{ success: boolean, data?: ..., error?: { code, message } }` (đồng nhất với contract FE).
- Tất cả endpoint validate input và trả 400 nếu sai.
- Mọi endpoint protected phải trả 401 nếu thiếu/sai token, 403 nếu sai role.
- PDF endpoint cần `maxDuration: 30s`.
- Upload ảnh phải dùng Supabase Storage (không multer/FS).
- Không introduce regression cho 7 endpoint Vercel đã hoạt động.

### 3.5. Acceptance criteria tổng quát Phase A
1. ☑️ Không trang FE nào trên prod còn báo `Network error` hoặc `404`.
2. ☑️ Manual smoke test 14 bước (xem §12.2) pass 100%.
3. ☑️ Parity test: shape response Express vs Vercel khớp 100%.
4. ☑️ `KANBAN.md` + `PROJECT_CONTEXT.md` đã update đúng trạng thái.
5. ☑️ Vercel build xanh sau khi merge.

---

## 4. KANBAN — Phase A

> Quy ước cột: **TODO** → **IN PROGRESS** → **REVIEW** → **DONE**.
> Quy ước nhãn: 🔴 P0 (blocker) · 🟠 P1 (cao) · 🟡 P2 (vừa).
> Effort: S < 4h · M = 4h–1d · L = 1–2d · XL > 2d.

### Sprint A.1 — Foundation (Ngày 1–2)
| ID | Task | Pri | Effort | Status | Owner | Depends |
|---|---|---|---|---|---|---|
| A1 | `lib/auth.ts` middleware `requireAuth(handler, roles?)` | 🔴 P0 | S | TODO | — | — |
| A8 | `lib/storage.ts` wrapper Supabase Storage | 🔴 P0 | S | TODO | — | — |
| A12 | Cấu hình env vars Vercel + Supabase Storage bucket | 🔴 P0 | S | TODO | — | — |
| A13 | Run `prisma migrate deploy` + seed lên Supabase prod | 🔴 P0 | S | TODO | — | A12 |

### Sprint A.2 — Auth + Attendance fee (Ngày 3)
| ID | Task | Pri | Effort | Status | Owner | Depends |
|---|---|---|---|---|---|---|
| A2 | `api/auth/logout.ts` + `api/auth/change-password.ts` | 🔴 P0 | S | TODO | — | A1 |
| A4 | `api/attendance/calculate-fee.ts` | 🔴 P0 | S | TODO | — | A1 |

### Sprint A.3 — Money modules (Ngày 4–8)
| ID | Task | Pri | Effort | Status | Owner | Depends |
|---|---|---|---|---|---|---|
| A3 | `api/monthly-fees/*` (index + confirm + pay + cancel) | 🔴 P0 | L | TODO | — | A1, A4 |
| A5 | `api/receipts/*` (index + [id] + [id]/pdf) | 🔴 P0 | L | TODO | — | A1, A11 |
| A6 | `api/payments/*` (index + [id] + [id]/pdf) | 🔴 P0 | L | TODO | — | A1, A11 |
| A11 | `lib/pdf.ts` + integrate pdfmake với Vercel function | 🟠 P1 | L | TODO | — | A1 |

### Sprint A.4 — Templates + Reports (Ngày 9–10)
| ID | Task | Pri | Effort | Status | Owner | Depends |
|---|---|---|---|---|---|---|
| A7 | `api/templates/*` (index + [id] + set-default + default-by-type) | 🔴 P0 | L | TODO | — | A1 |
| A9 | `api/templates/upload.ts` (Supabase Storage) | 🔴 P0 | S | TODO | — | A1, A8 |
| A10 | `api/reports/financial.ts` + `api/reports/unpaid-students.ts` | 🔴 P0 | L | TODO | — | A1 |

### Sprint A.5 — Closeout (Ngày 11)
| ID | Task | Pri | Effort | Status | Owner | Depends |
|---|---|---|---|---|---|---|
| A14 | Cập nhật `KANBAN.md` + `PROJECT_CONTEXT.md` về thực tế | 🔴 P0 | S | TODO | — | tất cả |
| A15 | Manual smoke test 14 bước trên prod | 🔴 P0 | S | TODO | — | tất cả |
| A16 | Parity test script Express vs Vercel | 🟠 P1 | M | TODO | — | tất cả |

### Tổng kết Phase A
- 16 task, ~10 ngày làm việc 1 dev (có buffer).
- Critical path: A1 → A11 → A5+A6 → A15.
- Dependencies graph:
```
A1 (auth lib) ──┬── A2, A4
                ├── A3 ──┐
                ├── A5 ──┼── A11 (pdf)
                ├── A6 ──┘
                ├── A7 ──── A9 ──── A8 (storage)
                ├── A10
                └── (mọi endpoint đã port)
A12 → A13 → (chạy seed)
A14, A15, A16 cuối cùng
```

---

## 5. Đặc tả chi tiết từng task Phase A

### Task A1 — `lib/auth.ts` requireAuth middleware

**Mục tiêu:** Cung cấp helper bọc handler Vercel để check JWT + role thống nhất.

**Acceptance criteria:**
- Hàm `requireAuth(handler, allowedRoles?: string[])`:
  - Đọc header `Authorization: Bearer <token>`.
  - Verify JWT với `JWT_SECRET`.
  - Nếu fail → trả 401 `{ success: false, error: { code: 'TOKEN_INVALID', message: '...' } }`.
  - Nếu token expired → trả 401 với code `TOKEN_EXPIRED` (FE đã handle redirect login).
  - Nếu role không match → 403 `{ code: 'FORBIDDEN' }`.
  - Nếu pass → gắn `req.user = { id, username, role }` rồi gọi `handler(req, res)`.
- TypeScript types: `AuthedRequest` mở rộng `VercelRequest`.

**Files:**
- `lib/auth.ts` (UPDATE — đã có một phần, cần thêm `requireAuth`).
- Reference: `backend/src/middleware/auth.js`.

**Test plan:**
- Manual: gọi 1 endpoint protected không có token → expect 401.
- Manual: token expired → expect `TOKEN_EXPIRED`.
- Manual: receptionist gọi endpoint admin → expect 403.

**Risk:** Thấp. Pattern chuẩn.

---

### Task A2 — `api/auth/logout.ts` + `api/auth/change-password.ts`

**A2a — Logout:**
- POST, body trống.
- Quyết định thiết kế: Phase A dùng **client-side logout** (FE tự xoá token); server chỉ trả 200 để FE tiếp tục flow. (Token blacklist với Redis là Phase B.)
- Acceptance: gọi `POST /api/auth/logout` với token hợp lệ → 200; FE xoá `localStorage.token` → redirect `/login`.

**A2b — Change password:**
- POST, body `{ oldPassword, newPassword }`.
- Validate: newPassword ≥ 6 ký tự, không trùng oldPassword.
- Lấy user theo `req.user.id`, verify oldPassword bằng bcrypt.
- Hash newPassword với bcrypt rounds 10, update `User.passwordHash`.
- Ghi `ActivityLog` action `PASSWORD_CHANGED`.
- Trả 200 `{ success: true }` hoặc 400 với code `INVALID_OLD_PASSWORD`.

**Files:**
- `api/auth/logout.ts` (NEW)
- `api/auth/change-password.ts` (NEW)
- Reference: `backend/src/routes/auth.js` (các endpoint tương ứng).

**Test plan:** Manual qua `ChangePasswordModal.jsx` UI.

**Risk:** Thấp.

---

### Task A3 — `api/monthly-fees/*`

**Endpoints:**
| Method | Path | Mô tả |
|---|---|---|
| GET | `/api/monthly-fees?month=YYYY-MM` | List MonthlyFee theo tháng, kèm thông tin Student |
| GET | `/api/monthly-fees/[id]` | Get 1 fee |
| POST | `/api/monthly-fees/calculate` | Body `{ studentId?, classId?, month }` → tính fee từ AttendancePeriod đã `locked` |
| POST | `/api/monthly-fees/[id]/confirm` | Chuyển status `ready` → `confirmed` |
| POST | `/api/monthly-fees/[id]/pay` | Body `{ paymentMethod }` → tạo Receipt + cập nhật fee `paid` |
| POST | `/api/monthly-fees/[id]/cancel` | Chuyển fee về `cancelled` (logical) |

**Logic calculate:**
```
Cho mỗi (Student, Class, Month):
  Lấy AttendancePeriod tương ứng, must be `locked`
  Đếm số buổi `present` + `absent_with_fee`
  totalAmount = số buổi × class.feePerDay
  Upsert MonthlyFee với (studentId, month) — status = `ready`
```

**Logic pay:** transaction:
1. Đảm bảo fee.status = `confirmed`.
2. Tạo Receipt với `daysCount`, `feePerDay`, `amount`, `paymentMethod`, `templateId` (default receipt template), `createdById = req.user.id`.
3. Update MonthlyFee: `status = paid`, `receiptId`, `paidAt = now()`.
4. Trả receipt + fee đã update.

**Files:**
- `api/monthly-fees/index.ts` (NEW — list + calculate)
- `api/monthly-fees/[id]/index.ts` (NEW — get)
- `api/monthly-fees/[id]/confirm.ts`, `pay.ts`, `cancel.ts` (NEW)
- Reference: `backend/src/routes/monthly-fees.js`.

**Test plan:** Manual qua FeeCollectionPage; tạo 1 student, mark attendance 4 buổi, lock period, calculate → ready → confirm → pay → kiểm tra Receipt được tạo + tải PDF.

**Risk:** Trung bình. Logic transaction phức tạp; cần dùng `prisma.$transaction`.

---

### Task A4 — `api/attendance/calculate-fee.ts`

**Endpoint:** `GET /api/attendance/calculate-fee?student_id=...&month=YYYY-MM`

**Logic:**
- Tìm tất cả Attendance của student trong tháng, với class join.
- Đếm theo class:
  - `presentDays` (status = present)
  - `absentFeeDays` (status = absent_with_fee)
  - `chargedDays = presentDays + absentFeeDays`
  - `feeAmount = chargedDays × class.feePerDay`
- Trả `{ items: [{ classId, className, presentDays, absentFeeDays, chargedDays, feeAmount }], total }`.

**Files:** `api/attendance/calculate-fee.ts` (NEW). Reference: `backend/src/routes/attendance.js` endpoint `/calculate-fee`.

**Risk:** Thấp.

---

### Task A5 — `api/receipts/*`

**Endpoints:**
| Method | Path | Mô tả |
|---|---|---|
| GET | `/api/receipts?student_id=&month=&from=&to=&page=&limit=` | List + filter |
| GET | `/api/receipts/[id]` | Get detail |
| POST | `/api/receipts` | Body: studentId, month, daysCount, feePerDay, amount, paymentMethod, templateId, notes |
| DELETE | `/api/receipts/[id]` | Soft delete (admin only) |
| GET | `/api/receipts/[id]/pdf` | Stream PDF với template render bằng pdfmake |

**Acceptance:**
- POST tạo Receipt + ghi ActivityLog.
- GET trả Receipt với populated student + template.
- PDF dùng template default cho `type=receipt` nếu không truyền `templateId`.
- Header response PDF: `Content-Type: application/pdf`, `Content-Disposition: attachment; filename="receipt-{id}.pdf"`.

**Files:**
- `api/receipts/index.ts` (NEW — list + create)
- `api/receipts/[id].ts` (NEW — get + delete)
- `api/receipts/[id]/pdf.ts` (NEW — `maxDuration: 30`)
- Reference: `backend/src/routes/receipts.js`, `backend/src/services/pdfService.js`.

**Risk:** Trung bình. PDF generation trên serverless có thể chậm với template phức tạp.

---

### Task A6 — `api/payments/*`

**Endpoints:**
| Method | Path | Mô tả |
|---|---|---|
| GET | `/api/payments?category=&from=&to=&page=&limit=` | List |
| GET | `/api/payments/[id]` | Get |
| POST | `/api/payments` | Body: category, amount, recipientName, recipientPhone, templateId, notes |
| DELETE | `/api/payments/[id]` | Soft delete (admin only) |
| GET | `/api/payments/[id]/pdf` | Stream PDF |

**Files:**
- `api/payments/index.ts`, `[id].ts`, `[id]/pdf.ts` (NEW)
- Reference: `backend/src/routes/payments.js`.

**Risk:** Thấp (đơn giản hơn receipts).

---

### Task A7 — `api/templates/*`

**Endpoints:**
| Method | Path | Mô tả |
|---|---|---|
| GET | `/api/templates?type=` | List |
| GET | `/api/templates/[id]` | Get |
| POST | `/api/templates` | Body: templateName, type, paperSize, orientation, jsonConfig (optional, default empty canvas) |
| PUT | `/api/templates/[id]` | Update jsonConfig + meta |
| DELETE | `/api/templates/[id]` | Delete (admin only); reject nếu có Receipt/Payment ref |
| POST | `/api/templates/set-default` | Body `{ id }` → set isDefault = true (unset other in same type, transaction) |
| GET | `/api/templates/default-by-type?type=` | Trả template default cho type |

**Files:** Tương ứng. Reference: `backend/src/routes/templates.js`.

**Risk:** Thấp; chú ý transaction khi set-default.

---

### Task A8 — `lib/storage.ts` Supabase Storage

**Mục tiêu:** Helper upload file lên Supabase Storage và trả URL.

**Function:**
```
uploadImage(file: Buffer, filename: string): Promise<{ url: string, path: string }>
deleteImage(path: string): Promise<void>
```

- Sử dụng `@supabase/supabase-js` với `SUPABASE_SERVICE_KEY` (server-side).
- Bucket: `template-images` (public read).
- Tên file: `{timestamp}-{random}-{originalName}` để tránh collision.

**Files:** `lib/storage.ts` (NEW). Cần thêm dependency `@supabase/supabase-js` vào `package.json` root.

**Risk:** Thấp; chỉ cần config bucket public.

---

### Task A9 — `api/templates/upload.ts`

**Endpoint:** `POST /api/templates/upload`

**Logic:**
- Parse multipart từ request (Vercel function chấp nhận `Buffer` qua `req.body` nếu cấu hình `runtime: 'nodejs'`).
- Vì multer không chạy: dùng `formidable` hoặc parse thủ công header `Content-Type: multipart/form-data; boundary=...`.
- Hoặc đổi FE sang base64 + JSON body (đơn giản hơn).
- Gọi `lib/storage.uploadImage(buffer, filename)`.
- Trả `{ success: true, data: { url, path } }`.

**Lưu ý:** Cần coordinate với FE (`templatesService.uploadImage`) để chốt là multipart hay base64.

**Khuyến nghị:** Đổi FE sang base64 JSON để đơn giản và tránh edge case multipart trên Vercel.

**Files:** `api/templates/upload.ts` (NEW); `frontend/src/services/api.js` cập nhật `templatesService.uploadImage`.

**Risk:** Trung bình; multipart trên Vercel hơi phiền.

---

### Task A10 — `api/reports/financial.ts` + `unpaid-students.ts`

**A10a — Financial:**
- `GET /api/reports/financial?from=&to=&groupBy=day|week|month|year`
- Aggregate Receipt + Payment theo period; trả:
```
{
  totalReceipts: number,
  totalPayments: number,
  balance: number,
  byCategory: { salary: ..., utility: ..., office: ..., other: ... },
  byPeriod: [{ period: '2026-04', receipts: ..., payments: ... }, ...],
  countReceipts, countPayments,
  avgReceipt, avgPayment
}
```

**A10b — Unpaid students:**
- `GET /api/reports/unpaid-students?month=YYYY-MM`
- Tìm Student có MonthlyFee ở status != `paid` cho tháng đó.
- Trả `[{ studentId, fullName, parentPhone, totalAmount, daysOverdue }]`.

**Files:** `api/reports/financial.ts`, `api/reports/unpaid-students.ts` (NEW). Reference: `backend/src/routes/reports.js`.

**Risk:** Trung bình; cần raw SQL hoặc Prisma `groupBy` cho aggregation.

---

### Task A11 — `lib/pdf.ts` + receipts/[id]/pdf

**Mục tiêu:** Wrapper pdfmake gen PDF từ Template JSON.

**Function:**
```
generatePdf(template: TemplateJson, data: { receipt | payment + center settings }): Promise<Buffer>
```

- Render template config (Fabric.js JSON) → pdfmake docDefinition.
- Inject biến: `${student.fullName}`, `${amount}`, `${date}`, `${center.name}`, …
- Trả Buffer để stream.

**Files:** `lib/pdf.ts` (NEW). Reference: `backend/src/services/pdfService.js`.

**Vercel cấu hình:**
```json
"functions": {
  "api/receipts/[id]/pdf.ts": { "maxDuration": 30 },
  "api/payments/[id]/pdf.ts": { "maxDuration": 30 }
}
```

**Risk:** Cao nhất trong Phase A; Fabric.js JSON → pdfmake mapping cần test kỹ. Nếu khó, fallback Phase A: gen PDF đơn giản (template cứng), Phase B mới render template tuỳ biến đầy đủ.

---

### Task A12 — Vercel env vars

**Set trong Vercel dashboard (Project Settings → Environment Variables):**
| Key | Value |
|---|---|
| `DATABASE_URL` | Supabase pooler URL (port 6543) |
| `DIRECT_URL` | Supabase direct URL (port 5432) cho migration |
| `JWT_SECRET` | Random 32+ ký tự (rotate khỏi default) |
| `JWT_EXPIRES_IN` | `24h` |
| `SUPABASE_URL` | https://<project>.supabase.co |
| `SUPABASE_SERVICE_KEY` | Service role key |
| `SUPABASE_BUCKET` | `template-images` |
| `NODE_ENV` | `production` |

Tạo bucket `template-images` trên Supabase, set policy public read.

---

### Task A13 — DB migrate + seed

```bash
# Local
npx prisma migrate deploy        # áp migration lên Supabase
npm run db:seed                  # tạo admin user + sample center settings
```

**Acceptance:** Login admin/admin123 thành công trên prod.

---

### Task A14 — Update docs

- `KANBAN.md`: thay "100% COMPLETE" bằng phần "Phase A in progress" + checklist task A1–A16.
- `PROJECT_CONTEXT.md`: thêm section "Production gaps" liệt kê các module còn thiếu (sau Phase A xoá đi).

---

### Task A15 — Manual smoke test

(Xem checklist §12.2)

### Task A16 — Parity test script

Script Node.js đơn giản:
```
- Đăng nhập vào Express (5000) và Vercel (3000) lấy 2 token
- Với mỗi endpoint critical, gọi cùng input
- So sánh response shape (bỏ qua id, timestamps)
- Báo cáo diff
```

File: `scripts/parity-test.mjs`.

**Endpoint cần test:** login, students CRUD, classes CRUD, attendance bulk, attendance-periods workflow, monthly-fees calculate+pay, receipts create+pdf, payments create.

---

## 6. PRD giải pháp — Phase B (Củng cố chất lượng)

### 6.1. Mục tiêu
Sau khi production usable, đầu tư vào **chất lượng + độ tin cậy** để tránh regression khi mở rộng feature.

### 6.2. Yêu cầu chức năng
| FR-ID | Mô tả |
|---|---|
| FR-B1 | Mọi mutation FE có loading state + toast success/error |
| FR-B2 | Có ErrorBoundary global; lỗi runtime không làm trắng app |
| FR-B3 | Form validation với zod + react-hook-form đồng nhất |
| FR-B4 | Server-side validation tất cả endpoint với cùng zod schema |
| FR-B5 | Có CI gate: lint + typecheck + build + smoke test phải xanh trước khi merge |
| FR-B6 | Auth login bị rate-limit (chống brute force) |
| FR-B7 | Production có Sentry để nhận lỗi runtime (FE + BE) |
| FR-B8 | Source of truth cho schema / types là Prisma + zod |

### 6.3. Yêu cầu phi chức năng
- 6 critical user journey có Playwright smoke test, chạy headless trên CI < 5 phút.
- TypeScript strict mode bật cho `lib/` và `api/`.
- Bundle FE giảm xuống < 250KB gzipped.
- LCP < 2.5s trên network 3G slow simulator.

---

## 7. KANBAN — Phase B

| ID | Task | Pri | Effort | Status | Depends |
|---|---|---|---|---|---|
| B1 | Xoá 6 file `.backup` trong `frontend/src/{pages,components/layout}` | 🟠 P1 | S | TODO | — |
| B2 | Audit Tailwind v4 tokens, fix bug white-on-white | 🟠 P1 | S | TODO | — |
| B3 | Setup zod + react-hook-form; refactor 4 form lớn (Student, Class, Receipt, Payment) | 🟠 P1 | L | TODO | — |
| B4 | Server-side zod validation cho tất cả endpoint Vercel | 🟠 P1 | L | TODO | A1–A10 |
| B5 | React `ErrorBoundary` ở `MainLayout`; global toast cho mutation | 🟠 P1 | M | TODO | — |
| B6 | Loading skeleton component cho list pages (Students, Classes, Receipts, FeeCollection) | 🟠 P1 | M | TODO | — |
| B7 | Quyết định single source of truth: deprecate Express khỏi prod-flow, giữ optional dev-mock | 🟠 P1 | M | TODO | — |
| B8 | Setup Playwright; viết 6 smoke spec cho 6 user journey | 🟠 P1 | L | TODO | A15 |
| B9 | GitHub Actions CI: lint + tsc --noEmit + build + Playwright smoke | 🟠 P1 | M | TODO | B8 |
| B10 | `frontend/src/services/api.js`: dùng `import.meta.env.VITE_API_BASE`; retry exponential; 401 interceptor refactor | 🟠 P1 | S | TODO | — |
| B11 | Setup Sentry (FE + BE) với DSN qua env | 🟠 P1 | M | TODO | — |
| B12 | Rate limit `auth/login` bằng `@upstash/ratelimit` | 🟠 P1 | S | TODO | — |
| B13 | Audit script: liệt kê endpoint Vercel chưa wrap `requireAuth` | 🟠 P1 | S | TODO | A1 |
| B14 | Pino logger cho BE; cấu trúc log JSON | 🟡 P2 | S | TODO | — |
| B15 | Lưu trữ activity log middleware (auto record mọi mutation) | 🟡 P2 | M | TODO | A1 |

**Tổng Phase B:** ~3 tuần 1 dev.

---

## 8. PRD giải pháp — Phase C (Cải tiến tính năng)

### 8.1. Mục tiêu
Mở rộng giá trị sử dụng — tự động hoá thao tác lặp lại, cung cấp insight, nâng cấp UX vận hành.

### 8.2. Yêu cầu chức năng (chọn lọc)
| FR-ID | Mô tả |
|---|---|
| FR-C1 | Bulk action multi-select (delete, archive) cho Students, Parents, Receipts, Payments |
| FR-C2 | Import CSV/Excel cho Students + Parents có preview + validation |
| FR-C3 | Attendance heatmap (calendar grid 365 ngày) cho 1 student hoặc 1 class |
| FR-C4 | Cron tự động generate MonthlyFee đầu tháng cho tất cả student active |
| FR-C5 | Parent portal read-only: phụ huynh login OTP qua SMS, xem điểm danh + học phí của con |
| FR-C6 | Reminder SMS / Zalo nhắc đóng học phí khi quá hạn 3 ngày |
| FR-C7 | Advanced reports: revenue trend (line chart), teacher utilization (bar), retention cohort |
| FR-C8 | Audit log UI: filter theo user / action / entity / date |
| FR-C9 | DB backup tự động hằng tuần, đẩy lên Drive / R2 |
| FR-C10 | Soft-delete + recycle bin UI |
| FR-C11 | User management UI (admin CRUD users, reset password, deactivate) |
| FR-C12 | CenterSettings UI page (cập nhật tên, MST, logo, format biên lai) |

---

## 9. KANBAN — Phase C

| ID | Task | Pri | Effort | Module | Depends |
|---|---|---|---|---|---|
| C1 | Bulk action multi-select cho Students, Parents | 🟡 P2 | M | FE+BE | B3 |
| C2 | Import CSV/Excel cho Students + Parents (preview + validation) | 🟡 P2 | L | FE+BE | B3, B4 |
| C3 | Attendance heatmap calendar 365 ngày | 🟡 P2 | L | FE | — |
| C4 | Cron auto-generate MonthlyFee (Vercel Cron / Supabase pg_cron) | 🟡 P2 | M | BE | A3 |
| C5 | Parent portal read-only + OTP SMS auth | 🟡 P2 | XL | FE+BE | A1, A3 |
| C6 | SMS reminder học phí trễ (eSMS/Twilio) | 🟡 P2 | M | BE | C4 |
| C7 | Advanced reports + line chart (recharts hoặc visx) | 🟡 P2 | L | FE+BE | A10 |
| C8 | Audit Log UI page với filter | 🟡 P2 | M | FE | B15 |
| C9 | DB backup tự động hằng tuần lên Drive/R2 | 🟡 P2 | M | Ops | — |
| C10 | Soft-delete column `deletedAt` cho Students/Receipts/Payments + recycle bin UI | 🟡 P2 | L | FE+BE | A1 |
| C11 | User management UI (admin CRUD users, reset pwd) | 🟡 P2 | M | FE+BE | A1 |
| C12 | CenterSettings UI page (logo, MST, format biên lai) | 🟡 P2 | S | FE+BE | A8 |

**Tổng Phase C:** ~6–8 tuần.

---

## 10. PRD giải pháp — Phase D (Tăng trưởng)

> **Định hướng dài hạn**, không chốt ngày. Trigger dựa theo nhu cầu thị trường + traction.

### 10.1. Hướng đi lớn
- **Multi-tenant / multi-center**: 1 deployment phục vụ nhiều trung tâm; tách dữ liệu theo `tenantId`.
- **Mobile PWA**: cài đặt như app trên điện thoại, push notification.
- **Online payment**: tích hợp VNPay / MoMo / ZaloPay; phụ huynh đóng học phí online.
- **Học vụ mở rộng**: Bài tập, kỳ thi, điểm số, học bạ.
- **Gói khoá học (course package)**: đóng trọn khoá thay vì tháng, có promotion + scholarship.
- **Kế toán**: export định dạng MISA / Fast.
- **AI insights**: học sinh có nguy cơ nghỉ; lớp ít hiệu suất; gợi ý lịch học tối ưu.

### 10.2. Tiêu chí thành công Phase D
- Có ≥ 5 trung tâm khách hàng thật (multi-tenant).
- ≥ 30% phụ huynh dùng mobile để xem điểm danh.
- ≥ 20% học phí thu qua online payment.

---

## 11. Risk Register

| ID | Rủi ro | Khả năng | Impact | Mitigation |
|---|---|---|---|---|
| R1 | PDF generation Vercel function vượt 30s timeout | Trung bình | Cao | Pre-generate PDF khi tạo Receipt; lưu vào Supabase Storage; download thay vì gen on-demand |
| R2 | Multipart upload không chạy trên Vercel | Trung bình | Trung bình | Đổi FE sang base64 JSON upload (chấp nhận size < 1MB cho logo) |
| R3 | Drift dữ liệu giữa Express SQLite local và Supabase prod | Cao | Trung bình | Phase B: deprecate Express khỏi prod-flow. Chỉ giữ làm dev mock. |
| R4 | Prisma schema mismatch nếu dev sửa local SQLite mà không sync schema | Trung bình | Cao | Single source of truth = `prisma/schema.prisma`; bỏ raw SQL của Express |
| R5 | Vercel cold start ảnh hưởng UX | Thấp | Thấp | Edge Network + connection pooling; chấp nhận 1–2s lần đầu |
| R6 | Default credentials `admin/admin123` lộ public | Cao | Cao | Sau Phase A: force change password lần đầu login; rotate JWT_SECRET |
| R7 | Supabase free tier giới hạn 500MB DB / 1GB Storage | Trung bình | Trung bình | Monitor; nâng plan khi vượt; archive Receipt/Payment cũ ra cold storage |
| R8 | Streaming timeout khi sinh response lớn từ AI assistant | Cao | Thấp | Chia nhỏ Write/Edit; tránh dump toàn bộ kế hoạch trong 1 turn |
| R9 | Người dùng vẫn nhìn thấy 404 trên prod nếu cache CDN cũ | Trung bình | Thấp | Sau deploy, purge cache Vercel; Cache-Control: no-cache cho `/api/*` |
| R10 | Bug logic tính học phí (off-by-one buổi nghỉ lễ) | Trung bình | Cao | Phase B: viết unit test cho calculate-fee với fixture nhiều case |

---

## 12. Verification & Acceptance

### 12.1. Local dev parity production
- Dùng `vercel dev` (port 3000), trỏ `DATABASE_URL` sang Supabase staging branch.
- Không dùng Express khi test parity (Express chỉ là dev-mock).

### 12.2. Manual smoke checklist (Phase A acceptance) — 14 bước
- [ ] 1. Login với `admin / admin123` trên prod → token trả về.
- [ ] 2. `GET /api/auth/me` → trả đúng user.
- [ ] 3. Đổi mật khẩu qua `ChangePasswordModal` → thành công, login lại với mật khẩu mới.
- [ ] 4. Logout → bị redirect về `/login`, token bị xoá.
- [ ] 5. Tạo 1 Parent + 1 Student + enroll vào 1 Class.
- [ ] 6. Mark attendance 4 buổi cho student vừa tạo.
- [ ] 7. Submit AttendancePeriod → admin Approve → Lock.
- [ ] 8. Calculate MonthlyFee → status `ready`.
- [ ] 9. Confirm fee → status `confirmed`.
- [ ] 10. Pay → tạo Receipt, fee chuyển `paid`.
- [ ] 11. Tải PDF biên lai → mở được, có info trung tâm + logo.
- [ ] 12. Tạo Payment phiếu chi (lương) → tải PDF.
- [ ] 13. Edit Template → upload logo qua Supabase Storage → preview.
- [ ] 14. Reports/Financial trả số liệu khớp. Reports/Unpaid liệt kê đúng học sinh nợ.

### 12.3. Parity test (script tự động)
Script `scripts/parity-test.mjs` so sánh response 8 endpoint giữa Express (5000) và Vercel dev (3000). Pass khi response shape khớp 100% (bỏ qua id, timestamps).

### 12.4. DB migration verification
- `npx prisma migrate status` → all up to date.
- `psql` connect Supabase, query `\dt` → 14 tables.
- `SELECT COUNT(*) FROM users WHERE username='admin'` → 1.

### 12.5. Playwright smoke (Phase B onwards)
6 spec file:
1. `auth.spec.ts` — login + logout + change password.
2. `student-flow.spec.ts` — tạo parent + student + enroll class.
3. `attendance.spec.ts` — mark attendance + submit period.
4. `fee-collection.spec.ts` — calculate + confirm + pay + Receipt PDF.
5. `payment.spec.ts` — tạo phiếu chi + PDF.
6. `report.spec.ts` — load Reports/Financial và Unpaid.

CI gate: cả 6 phải xanh trên PR trước khi merge.

### 12.6. Production verification sau khi deploy
1. Mở `edu-manager-delta.vercel.app` ở chế độ ẩn danh.
2. Chạy lại 14 bước checklist.
3. Mở DevTools → Network tab; không có request nào trả 404 hay 500.
4. Mở Console; không có lỗi runtime.
5. Lighthouse audit: Performance ≥ 80, Accessibility ≥ 90.

---

## 13. Definition of Done

### 13.1. Phase A DoD
1. ✅ 14/14 trang FE chạy được trên prod, không 404 / Network error.
2. ✅ PDF biên lai tải được, mở đúng.
3. ✅ Upload logo qua Supabase Storage thành công.
4. ✅ `KANBAN.md` + `PROJECT_CONTEXT.md` đã update đúng trạng thái thực.
5. ✅ Vercel build xanh; không có console error trên prod.
6. ✅ `JWT_SECRET` rotate khỏi default.
7. ✅ Admin password đổi khỏi `admin123` (force change first login — nếu chưa làm thì manual).

### 13.2. Phase B DoD
1. ✅ Playwright smoke xanh trên CI.
2. ✅ Sentry nhận lỗi từ FE và BE.
3. ✅ Mọi form lớn dùng zod + react-hook-form.
4. ✅ Mọi endpoint Vercel có `requireAuth` + zod validation.
5. ✅ Không còn file `.backup`.
6. ✅ Bug white-on-white fixed.
7. ✅ Express deprecated khỏi prod-flow.

### 13.3. Phase C DoD
- 12/12 task FR-C đã ship (xem §9).
- Audit log UI hoạt động.
- Cron auto-generate MonthlyFee chạy đúng 1 lần / tháng.
- Backup tự động hằng tuần lưu trên Drive/R2.

### 13.4. Phase D DoD
- (Trigger-based) Khi đủ traction → spin off Phase D plan riêng.

---

## Phụ lục — Danh sách file output Phase A

```
NEW FILES (Phase A):
  api/auth/logout.ts
  api/auth/change-password.ts
  api/attendance/calculate-fee.ts
  api/monthly-fees/index.ts
  api/monthly-fees/[id]/index.ts
  api/monthly-fees/[id]/confirm.ts
  api/monthly-fees/[id]/pay.ts
  api/monthly-fees/[id]/cancel.ts
  api/receipts/index.ts
  api/receipts/[id].ts
  api/receipts/[id]/pdf.ts
  api/payments/index.ts
  api/payments/[id].ts
  api/payments/[id]/pdf.ts
  api/templates/index.ts
  api/templates/[id].ts
  api/templates/set-default.ts
  api/templates/default-by-type.ts
  api/templates/upload.ts
  api/reports/financial.ts
  api/reports/unpaid-students.ts
  lib/storage.ts
  lib/pdf.ts
  lib/validation.ts
  scripts/parity-test.mjs

UPDATE FILES (Phase A):
  lib/auth.ts            # thêm requireAuth + requireRole
  vercel.json            # maxDuration cho PDF endpoint
  package.json           # thêm @supabase/supabase-js, pdfmake, zod
  .env.example           # thêm SUPABASE_*
  frontend/src/services/api.js  # nếu đổi sang base64 upload
  KANBAN.md              # update trạng thái thật
  PROJECT_CONTEXT.md     # update trạng thái thật

DELETE FILES (Phase B, không phải A):
  frontend/src/pages/DashboardPage.jsx.backup
  frontend/src/pages/ParentsPage.jsx.backup
  frontend/src/pages/StudentsPage.jsx.backup
  frontend/src/pages/TeachersPage.jsx.backup
  frontend/src/components/layout/MainLayout.jsx.backup
  frontend/src/components/layout/Sidebar.jsx.backup
```

---

**Hết tài liệu kế hoạch giải pháp.** Mọi thay đổi plan cần update version + ghi chú lý do. Bản gốc tham chiếu: `/root/.claude/plans/review-repo-https-github-com-hts2008-edu-luminous-cocoa.md`.





