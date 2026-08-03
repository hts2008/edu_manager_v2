# Audit_V2 — Deep Audit & Remediation Plan cho EDU_MANAGER_V2

> **Ngày audit:** 2026-08-03
> **Phạm vi:** Toàn bộ codebase local + repo GitHub `https://github.com/hts2008/edu_manager_v2` + memory bank + KANBAN + receipts/reports
> **Trạng thái git lúc audit:** working tree sạch, HEAD `75acdc9` == `origin/main` (local và GitHub đồng bộ hoàn toàn)
> **Production:** `https://edu-manager-gules.vercel.app` (Vercel + Neon Postgres + Vercel Blob)
> **Closeout:** 2026-08-03, code commits `39e4fb6` + `4834e3f` + `c244e8e`, production deployment `dpl_8LSoPr4QHvJWcTNXNnxFb9LhJRZf`

## CLOSEOUT 2026-08-03

Audit này là baseline trước remediation. Kết quả sau triển khai:

- Production schema hiện có **28 Prisma models** và **7 migrations**; `prisma migrate status` trả `Database schema is up to date!`.
- F-01..F-12, F-14..F-16, F-21 và F-23 đã đóng bằng code, migration, production backup, API/DB checks và Chrome smoke.
- F-13 được xử lý phần orphan có rủi ro; cleanup API client không dùng còn lại được defer để tránh refactor lan rộng.
- F-17 đã đóng cho các money-moving/high-risk handlers; khoảng 40 CRUD handler thấp rủi ro còn lại được defer theo chính plan này.
- F-18 đã mở rộng coverage cho auth, users, payments, parent portal, templates, imports, backup, cron contracts và core finance; coverage toàn bộ endpoint quản trị còn lại tiếp tục là backlog.
- F-19, F-20, F-22 và phần production Kanban của F-24 được defer có chủ đích. Quy tắc một attendance row cho mỗi student/class/date hiện vẫn là business constraint hiện hành.
- Credential admin production, `JWT_SECRET` và `CRON_SECRET` đã rotate. Secret mới không được ghi vào repository; operator credential nằm ngoài source control.
- Backup production AES-GCM v3 đã chạy và verify `valid=true`, manifest đủ 28 bảng.
- Chrome production regression: **44/44 scenarios pass** trên 22 routes x desktop/mobile; current deployment smoke: **8/8 scenarios pass** trên 4 critical routes x desktop/mobile. Detector ghi nhận không có horizontal document overflow và không có console/page/API error.
- Final automated gates: root unit **496/496**, frontend unit **42/42**, TypeScript, ESLint, build và diff-check pass.

Evidence: `receipts/2026-08-03-audit-v2-remediation-closeout.md` và `docs/artifacts/audit-v2-2026-08-03/`.

---

## PHẦN I — KẾT LUẬN AUDIT

### 1. Đánh giá tổng thể

Hệ thống **ĐỦ module và ĐÚNG logic ở các đường nghiệp vụ chính**:

- **Backend:** 66 route trong `api/router.ts` khớp 1:1 với handler dưới `server/api/**`, không có route mồ côi. Auth DB-backed (JWT + AuthSession + tokenVersion) phủ toàn bộ endpoint trừ login/cron (chủ đích public/CRON_SECRET). Invariant Tuition V3 (class-line billing, attendance lock, protected paid rows, zero-day guard) được enforce ở **mọi** đường tiền.
- **Frontend:** 27 trang đều được route đúng, guard role (admin/receptionist/parent) khớp giữa router và sidebar. Không có endpoint gãy.
- **Data model tại thời điểm audit:** 27 model Prisma + 5 migration. Sau closeout: 28 model + 7 migration, gồm trigger controlled reopen và schema-hygiene indexes.
- **Memory vs thực tế:** 10 mục remediation AUD-RM-001..010 đã đóng có bằng chứng. Không phát hiện mâu thuẫn lớn giữa memory claims và code.

### 2. Danh sách phát hiện (theo mức độ)

#### P0 — Nghiêm trọng (an toàn dữ liệu)

| ID | Phát hiện | Vị trí |
|----|-----------|--------|
| F-01 | `BACKUP_MANIFEST` bỏ sót 4 model Tuition V3: `ClassSession`, `ClassMonthPlan`, `ClassMonthPlanRevision`, `MonthlyFeeLineRevision`. Backup hiện tại **âm thầm mất** toàn bộ session ledger + audit revision tài chính. Restore sẽ **FAIL** vì FK Restrict (`class_sessions.class_id → classes`, `monthly_fee_line_revisions → monthly_fee_lines`) và trigger immutability chặn xóa. `reset-database.ts` cũng fail tương tự. | `lib/backup.ts:9-34` |

#### P1 — Cao (đúng đắn nghiệp vụ tài chính)

| ID | Phát hiện | Vị trí |
|----|-----------|--------|
| F-02 | Aggregate `confirm` **không** gọi `assertAggregatePaymentAllowed` (khác với `pay.ts`). Fee có class lines vẫn confirm được ở mức aggregate → trạng thái dao động (`confirmed` → bị `refreshMonthlyFeeAggregateFromLines` revert về `ready`). | `server/api/monthly-fees/[id]/confirm.ts:28-74` |
| F-03 | `refreshMonthlyFeeAggregateFromLines` **tự chế** `paidAt = new Date()` khi tất cả line đã paid nhưng không line nào có `paidAt` → bịa timestamp thanh toán. | `lib/monthly-fee-lines.ts:260-266` |
| F-04 | Lệch timezone: receipts filter dùng `new Date(\`${from}T00:00:00\`)` (local time của serverless runtime) và `parseMonthRange` cũng local-time, trong khi attendance dùng UTC (`Date.UTC`). Nếu runtime không phải UTC → lệch biên ngày/tháng giữa fee và attendance queries. | `server/api/receipts/index.ts:97-98`, `lib/api-utils.ts:83-84` |
| F-05 | Migration `20260713_zz_class_month_plan_revision_state_guard` **thay thế** (không bổ sung) trigger cũ: rule "frozen→open forbidden" bị mất, giờ frozen→open được phép nếu revision tăng. Semantic regression nếu frozen là trạng thái terminal. | `prisma/migrations/20260713_zz_class_month_plan_revision_state_guard/` |
| F-06 | Credential mặc định production + JWT secret **chưa rotate** — được nhắc nhiều lần trong memory từ 2026-05 nhưng chưa thực hiện. | Vercel env + Neon `users` |

#### P2 — Trung bình (frontend UX / data hygiene)

| ID | Phát hiện | Vị trí |
|----|-----------|--------|
| F-07 | Trang `/receipts` **mồ côi khỏi navigation**: không có trong Sidebar, không có Link nào trỏ tới, chỉ vào được bằng gõ URL. Icon `receipt` đã đăng ký trong `iconsMap` nhưng không dùng. Flow "Tạo phiếu thu" thủ công trở nên khó tìm. | `frontend/src/components/layout/Sidebar.jsx:23,37-90` |
| F-08 | HistoryPage: filter khoảng ngày là **UI chết** — input `dateRange` tồn tại và trigger reload, nhưng `loadTransactions` không bao giờ gửi/áp dụng from/to. | `frontend/src/pages/HistoryPage.jsx:27,29-60,200-208` |
| F-09 | 2 chuỗi lỗi bị **mojibake** (double-encoded UTF-8): `'KhÃ´ng thá»ƒ tÃ­nh phÃ­...'` sẽ hiển thị lỗi font nếu catch path chạy. | `frontend/src/pages/FeeCollectionPage.jsx:295,360` |
| F-10 | Nhiều chuỗi tiếng Việt **không dấu** lộ ra UI: "Luu diem danh" (`AttendancePage.jsx:1641`), "Dang mo..." (`FeeCollectionPage.jsx:525,835`), "Khong the tai bang hoc phi..." (`FeeCollectionPage.jsx:194,303,710`), timeout message (`api.js:151`). | nhiều file |
| F-11 | Receipts/Payments/History **nuốt lỗi API im lặng**: bỏ qua `response.success === false`, bảng hiển thị empty state thay vì báo lỗi. Không có retry. | `ReceiptsPage.jsx:28-37`, `PaymentsPage.jsx:28-37`, `HistoryPage.jsx:29-60` |
| F-12 | Dùng `window.confirm`/`window.prompt` thay vì `ConfirmModal` của app. | `ReceiptsPage.jsx:41,72`, `PaymentsPage.jsx:41` |
| F-13 | Dead code: ~15 method trong `api.js` không trang nào gọi (monthlyFees single pay/confirm/generate, 4 reports service, attendanceService.getByDate...); component orphan `frontend/src/components/AttendanceReviewModal.jsx`. | `frontend/src/services/api.js:361-768` |
| F-14 | Vòng reconciliation bulk-pay sau crash **re-POST `bulkPay`** thay vì poll `bulkPayStatus` sau lần check đầu — an toàn nhờ idempotency nhưng sai pattern. | `FeeCollectionPage.jsx:133` |
| F-15 | Audit attribution ở router fallback về `verifyAuth(req)` **stateless** (không check DB session/tokenVersion) → token đã revoke nhưng chưa hết hạn vẫn được ghi tên trong activity log. Không ảnh hưởng authorization. | `api/router.ts:224` |

#### P3 — Test & validation gaps

| ID | Phát hiện | Vị trí |
|----|-----------|--------|
| F-16 | 2 flow nghiệp vụ quan trọng nhất **không có E2E**: (a) attendance save→submit→approve→lock→reopen; (b) bulk-pay + idempotency resume + print queue. | `frontend/e2e/` |
| F-17 | ~45 handler mutation dùng validation thủ công (`getString`/inline) thay vì zod — nổi bật: `attendance/bulk`, `attendance-periods/[id]` actions, `monthly-fees/[id]/pay`, `bulk-pay`, `class-sessions/month-plan`, `teachers`, `parents`, `templates/*`. | `server/api/**` |
| F-18 | Không có test cho: parents/teachers/users CRUD, payments CRUD+PDF, parent-portal login/me/logout, templates CRUD/upload, center-settings, activity-logs, recycle-bin restore, backups endpoint, cron handlers. | `tests/` |

#### P4 — Schema & docs hygiene

| ID | Phát hiện | Vị trí |
|----|-----------|--------|
| F-19 | Tiền dùng `Float` cho mọi cột (feePerDay, amount, monthlyTuition...) thay vì `Decimal`/integer VND. Rủi ro thực tế thấp (VND nguyên) nhưng sai chuẩn. | `prisma/schema.prisma` |
| F-20 | `EnrollmentPeriod` không có DB constraint chống overlap (chỉ app-level). | `prisma/schema.prisma` |
| F-21 | Thiếu index: `attendance.created_by`, `monthly_fees.receipt_id`, `activity_logs(entity_type,entity_id)`, `templates.created_by`. | `prisma/schema.prisma` |
| F-22 | `Student.graduationDate` là field chết (0 tham chiếu). `BulkFeePaymentItem.receiptId` là string trần không FK. `AuthSession.subjectType` là string tự do không enum/CHECK. | `prisma/schema.prisma` |
| F-23 | Docs drift: `PROJECT_CONTEXT.md` vẫn mô tả Supabase/React 18/URL delta (đã chết); KANBAN header vẫn ghi "production 50-60% usable" (đã lỗi thời); `.shared` architecture docs mô tả stack cũ. | `PROJECT_CONTEXT.md`, `KANBAN.md` header |
| F-24 | Legacy Express có `kanban.js` route không có bản production (chủ đích — dev tooling). Attendance `@@unique([studentId, classId, attendanceDate])` chặn 2 buổi/ngày cùng lớp (xác nhận là business rule hay giới hạn). | `backend/src/routes/kanban.js` |

---

## PHẦN II — PLAN TRIỂN KHAI CHI TIẾT

### Nguyên tắc chung cho mọi AI Agent thực thi

1. **Quality gates bắt buộc trước khi claim "done"** (theo `manifests/quality-gates.yaml`): `npx tsc --noEmit` → `npm --prefix frontend run lint -- --max-warnings=0` → `npm run test:unit` (closeout 496/496) → `npm run build` → `git diff --check`.
2. **Không mutate production data** trong quá trình dev/test. Test mutation chạy trên local smoke server (`npm run dev:smoke`) hoặc DB isolated (`TEST_DATABASE_URL`).
3. **Mỗi phase = 1 batch commit riêng**, stage explicit paths, không mix docs/memory drift với app code. Commit theo conventional (`fix:`, `feat:`, `test:`, `docs:`, `chore:`).
4. **Sau mỗi phase:** deploy Vercel → production smoke (Playwright + Chrome authenticated) → ghi receipt vào `receipts/` → cập nhật `KANBAN.md`, `memory/memory-bank/activeContext.md`, `progress.md` (append-only).
5. **Protected rows bất khả xâm phạm:** không auto-mutate receipt/fee line đã paid/confirmed/receipt-linked. Fingerprint finance được giữ nguyên qua mọi thay đổi.
6. **3 strikes = dừng và báo cáo**, không tự ý đổi hướng.

### Phân công agent (theo `agents/registry.yaml`)

| Phase | Agent chính | Agent hỗ trợ / review |
|-------|-------------|----------------------|
| Phase 1 | `database-architect` | `judge-agent` (adversarial — HIGH risk) |
| Phase 2 | `backend-specialist` | `test-engineer`, `judge-agent` |
| Phase 3 | `frontend-specialist` | `qa-automation-engineer` |
| Phase 4 | `test-engineer` + `backend-specialist` | `security-auditor` (F-15) |
| Phase 5 | `documentation-writer` + `database-architect` | `devops-engineer` (F-06) |

---

### PHASE 1 — P0: Backup/Restore integrity (LÀM ĐẦU TIÊN, HIGH RISK)

> **Giải quyết:** F-01. **Owner:** `database-architect`. **Review:** adversarial (`judge-agent`).
> **Vì sao trước tiên:** đây là lỗi data-loss đang sống — mọi backup từ khi Tuition V3 deploy (2026-07-12) đều thiếu session ledger; nếu có sự cố cần restore ngay bây giờ thì restore sẽ fail.

#### Todo 1.1 — Cập nhật `BACKUP_MANIFEST`

- **File:** `lib/backup.ts` (dòng 9–34).
- **Làm gì:** Thêm 4 model vào manifest: `ClassSession`, `ClassMonthPlan`, `ClassMonthPlanRevision`, `MonthlyFeeLineRevision`.
- **Cách làm:** Thứ tự manifest phải theo topo-sort phụ thuộc FK để restore (insert xuôi) và reset (delete ngược) đều hợp lệ:
  - `ClassSession` đặt **sau** `Class` và `User` (FK createdBy/updatedBy), **trước** `Attendance` (vì `attendance.class_session_id` → class_sessions).
  - `ClassMonthPlan` sau `Class`/`User`; `ClassMonthPlanRevision` sau `ClassMonthPlan`.
  - `MonthlyFeeLineRevision` sau `MonthlyFeeLine` và `User`.
- **Kiểm tra chéo:** đối chiếu từng FK trong `prisma/schema.prisma` trước khi chốt thứ tự. Đếm model trong manifest sau sửa phải = 28 bảng durable (24 cũ + 4 mới) — xác nhận lại con số thực tế khi làm.

#### Todo 1.2 — Sửa restore để xử lý bảng có trigger immutability

- **File:** `lib/backup.ts` (hàm `restoreDatabase`), `prisma/reset-database.ts`.
- **Vấn đề:** `monthly_fee_line_revisions` và `class_month_plan_revisions` có DB trigger chặn UPDATE/DELETE; `class_month_plans` có trigger state-guard. Restore theo kiểu delete-all-insert-all sẽ bị trigger chặn.
- **Cách làm (chọn 1, ưu tiên a):**
  - (a) Trong transaction restore/reset, chạy `SET LOCAL session_replication_role = 'replica'` để tắt trigger trong phạm vi transaction đó (yêu cầu quyền superuser/rds_replication trên Neon — **phải verify quyền này trên Neon trước**; nếu Neon không cho phép thì dùng (b)).
  - (b) `ALTER TABLE ... DISABLE TRIGGER USER` trước restore và `ENABLE` sau, bọc trong cùng transaction; hoặc drop/recreate trigger từ định nghĩa migration.
- **Ràng buộc:** restore phải giữ nguyên tính idempotent + verify-hash AES-GCM v2 hiện có. Không thay đổi format backup cũ — thêm version field nếu cần phân biệt manifest mới/cũ.
- **Xử lý backup cũ:** restore từ backup v cũ (thiếu 4 bảng) phải **fail rõ ràng với message hướng dẫn** ("backup này thiếu Tuition V3 ledger, chỉ dùng để khôi phục một phần với cờ --allow-partial"), không silent-corrupt.

#### Todo 1.3 — Test round-trip backup→restore với dữ liệu V3

- **File mới:** mở rộng `tests/` (đặt cạnh test backup hiện có, ví dụ `tests/backup-v3-roundtrip.test.ts`).
- **Kịch bản test:**
  1. Seed DB isolated (TEST_DATABASE_URL) với: 1 class + 2 ClassSession + 1 ClassMonthPlan (frozen) + 1 ClassMonthPlanRevision + 1 MonthlyFee + 2 MonthlyFeeLine + 1 MonthlyFeeLineRevision + attendance link tới session.
  2. Chạy backup → assert manifest chứa đủ 4 bảng mới, row counts đúng.
  3. Xóa sạch DB → restore → assert: (a) đủ row từng bảng, (b) FK nguyên vẹn (attendance.class_session_id resolve được), (c) trigger immutability **hoạt động trở lại** sau restore (UPDATE revision row phải raise).
  4. Test reset-database với dữ liệu V3 không còn fail FK.
- **Nếu `TEST_DATABASE_URL` chưa có:** dựng Postgres local (docker-compose có sẵn ở root) và document cách set biến này — đây cũng là backlog item cũ được đóng luôn.

#### Todo 1.4 — Verify production sau deploy

- Deploy → chạy `POST /api/backups` action `run` rồi `verify` trên production (backup là read-only với data nghiệp vụ, an toàn).
- Assert response chứa counts cho 4 bảng mới > 0 (production có 23+ ClassMonthPlan, hàng trăm ClassSession).
- **Không chạy restore trên production.** Restore chỉ test trên DB isolated.
- Ghi receipt `receipts/2026-08-XX-backup-v3-manifest-fix.md` với bằng chứng counts.

**Definition of Done Phase 1:** manifest đủ 4 model; round-trip test pass trên DB isolated có trigger; production backup verify chứa V3 counts; full unit suite không giảm; receipt + memory write-back xong.

---

### PHASE 2 — P1: Correctness tài chính

> **Giải quyết:** F-02, F-03, F-04, F-05. **Owner:** `backend-specialist`. **Review:** `judge-agent` + `test-engineer`.

#### Todo 2.1 — Chặn confirm aggregate khi có class lines (F-02)

- **File:** `server/api/monthly-fees/[id]/confirm.ts` (dòng 28–74).
- **Làm gì:** Trước khi update status, gọi `assertAggregatePaymentAllowed(feeId)` — cùng helper mà `pay.ts:21-29` đang dùng (import từ vị trí hiện tại của helper, refactor ra `lib/` nếu đang nằm trong `pay.ts`).
- **Hành vi mới:** fee có ≥1 `MonthlyFeeLine` → trả 409 `AGGREGATE_PATH_BLOCKED` (đúng error code mà `pay.ts` đang trả — kiểm tra tên code thực tế và dùng y hệt).
- **Test:** thêm case vào test monthly-fee hiện có: confirm aggregate với lines → 409; confirm aggregate không lines (legacy) → vẫn hoạt động.
- **Lưu ý:** kiểm tra cả `cancel.ts` cùng thư mục xem có cùng lỗ hổng không — nếu có, vá cùng lúc và ghi vào receipt.

#### Todo 2.2 — Bỏ fabricate `paidAt` (F-03)

- **File:** `lib/monthly-fee-lines.ts` (dòng 260–266, hàm `refreshMonthlyFeeAggregateFromLines`).
- **Làm gì:** Khi tất cả line paid: `paidAt = max(line.paidAt)` của các line có giá trị. Nếu **không** line nào có `paidAt` → giữ `paidAt = null` + log warning qua `lib/observability.ts` (structured log, code `PAID_AT_MISSING_ON_LINES`), **không** dùng `new Date()`.
- **Kiểm tra ảnh hưởng:** grep các nơi đọc `MonthlyFee.paidAt` (reports, workbench, dashboard) để chắc null không gây crash — thêm null-guard nếu cần.
- **Test:** unit test 3 case: tất cả line có paidAt → lấy max; một phần có → lấy max của phần có; không có → null + warning.

#### Todo 2.3 — Chuẩn hóa UTC cho date filters (F-04)

- **File:** `server/api/receipts/index.ts` (dòng 97–98), `lib/api-utils.ts` (`parseMonthRange`, dòng 83–84).
- **Làm gì:** Chuyển cả hai sang UTC half-open range — cùng convention với `lib/attendance-lock.ts:97-99` (`Date.UTC(y, m-1, 1)` đến `Date.UTC(y, m, 1)`, so sánh `>= start AND < end`).
- **Cách làm an toàn:** viết helper chung `parseUtcDateRange(from, to)` / dùng lại helper UTC nếu đã có trong `lib/api-utils.ts`, thay thế cả 2 chỗ. Grep toàn bộ `server/` tìm pattern `new Date(\`${...}T00:00:00\`)` và `T23:59:59` để bắt các chỗ lệch khác cùng lúc (payments/history filter có thể dính tương tự).
- **Lưu ý nghiệp vụ:** ngày nghiệp vụ của trung tâm là giờ VN (UTC+7). Chọn 1 trong 2: (a) chuẩn UTC thuần (đơn giản, nhất quán với attendance — khuyến nghị vì attendance/fee đã dùng UTC), hoặc (b) business-timezone offset. **Quyết định phải ghi vào `decisionLog.md`.** Vercel serverless chạy UTC nên hành vi production hiện tại thực chất đang là UTC — fix này chủ yếu loại bỏ phụ thuộc ngầm vào runtime TZ.
- **Test:** unit test biên tháng: receipt tạo `2026-07-31T23:xx` VN time vs UTC — filter tháng 7 và tháng 8 phải cho kết quả nhất quán với convention đã chọn.

#### Todo 2.4 — Khôi phục rule frozen→open cho ClassMonthPlan (F-05)

- **Bước 1 (xác nhận intent):** đọc `lib/` code gọi tới plan state (grep `frozen`, `reopen` trong `lib/` + `server/api/class-sessions/month-plan.ts`) và `receipts/2026-07-14-attendance-month-ledger-correction-closeout.md` để xác định: hệ thống có workflow chủ đích reopen plan frozen không (ví dụ `reopen-for-correction` của attendance-periods có mở lại plan không)?
  - Nếu **có** workflow reopen hợp lệ → rule mới phải là: frozen→open chỉ được phép khi revision tăng **và** có audit row tương ứng trong `class_month_plan_revisions` cùng transaction.
  - Nếu **không** → khôi phục "frozen→open forbidden" tuyệt đối.
- **Bước 2:** viết migration mới `2026XXXX_class_month_plan_frozen_guard_restore/migration.sql` redefine function trigger (giữ rule strict-revision-increment hiện tại **cộng thêm** rule frozen theo kết luận bước 1). Dùng `CREATE OR REPLACE FUNCTION` idempotent như các migration trước.
- **Test:** SQL-level test trên DB isolated: frozen→open không kèm điều kiện hợp lệ phải raise; open→frozen với revision tăng vẫn pass; revision không tăng phải raise (giữ hành vi cũ).
- **Deploy:** `npx prisma migrate deploy` lên Neon sau khi test isolated pass. Migration chỉ thay trigger — không đụng data.

**Definition of Done Phase 2:** 4 fix có unit test riêng; full suite pass (≥467); quyết định timezone + frozen ghi vào `decisionLog.md`; migration deploy sạch (`prisma migrate status` clean); production smoke: confirm-with-lines trả 409, receipts filter trả kết quả đúng biên tháng; receipt + memory write-back.

---

### PHASE 3 — P2: Frontend UX

> **Giải quyết:** F-07..F-14. **Owner:** `frontend-specialist`. **Review:** `qa-automation-engineer`.
> **Ràng buộc chung:** mọi file phải giữ đúng UTF-8, chạy lint zero-warnings, không đổi hành vi nghiệp vụ ngoài mô tả.

#### Todo 3.1 — Đưa `/receipts` trở lại navigation (F-07)

- **File:** `frontend/src/components/layout/Sidebar.jsx` (dòng 37–90).
- **Làm gì:** Thêm item `{ path: '/receipts', label: 'Phiếu thu', icon: 'receipt' }` vào nhóm tài chính (cạnh `Thu tiền`/`fee-collection` và `Phiếu chi`/payments). Icon `receipt` đã có sẵn trong `iconsMap` dòng 23.
- **Không admin-only** (router hiện để authenticated cho cả receptionist — giữ nguyên).
- **Kiểm tra:** E2E spec "fee workbench and receipt history are distinct surfaces" (đã có) vẫn pass; spec menu-traversal toàn bộ route (đã có, 22 routes) cập nhật count nếu spec đếm số item.

#### Todo 3.2 — Wire date filter HistoryPage (F-08)

- **File:** `frontend/src/pages/HistoryPage.jsx` (dòng 29–60 `loadTransactions`, dòng 200–208 inputs).
- **Làm gì:** Truyền `from`/`to` từ state `dateRange` vào call `receiptsService.getAll` và `paymentsService.getAll` (query param `from`/`to` — backend receipts đã hỗ trợ, kiểm tra payments handler có hỗ trợ chưa; nếu chưa thì filter client-side theo `payment_date`/`receipt_date` và ghi chú lại).
- **Phối hợp Phase 2:** filter này sẽ dùng biên UTC đã chuẩn hóa ở Todo 2.3 — làm Phase 3 **sau** Phase 2 để tránh test 2 lần.
- **Test:** thêm assertion vào spec History mới (Todo 4.1 sẽ tạo) hoặc unit test component: đổi date → request có query đúng.

#### Todo 3.3 — Sửa mojibake + chuẩn hóa tiếng Việt có dấu (F-09, F-10)

- **File & vị trí cụ thể:**
  - `FeeCollectionPage.jsx:295,360` — thay chuỗi mojibake bằng `'Không thể tính phí. Vui lòng thử lại.'` (đúng nội dung gốc dự kiến).
  - `FeeCollectionPage.jsx:194,303,710` — "Khong the tai bang hoc phi..." → "Không thể tải bảng học phí...".
  - `FeeCollectionPage.jsx:525,835` — "Dang mo..." → "Đang mở...".
  - `AttendancePage.jsx:1641` — "Luu diem danh" → "Lưu điểm danh".
  - `frontend/src/services/api.js:151` — message timeout → có dấu.
- **Cách làm:** ngoài các vị trí trên, chạy quét toàn bộ `frontend/src` tìm chuỗi tiếng Việt không dấu lộ UI (grep pattern các từ phổ biến: `Dang `, `Khong `, `Luu `, `Tai `, `Vui long`) và sửa hết trong 1 commit. **Cẩn thận:** chỉ sửa string literal hiển thị UI, không đụng key/id/test selector (E2E spec có thể assert text — grep `frontend/e2e` với text cũ trước khi đổi, cập nhật spec tương ứng cùng commit).
- **Kiểm tra encoding:** file lưu UTF-8 không BOM, `git diff` hiển thị đúng ký tự.

#### Todo 3.4 — Error banner + retry cho Receipts/Payments/History (F-11)

- **File:** `ReceiptsPage.jsx:28-37`, `PaymentsPage.jsx:28-37`, `HistoryPage.jsx:29-60`.
- **Làm gì:** Áp dụng đúng pattern error state đã có ở FeeCollectionPage/AttendancePage: state `loadError`, banner `role="alert"` với message + nút "Thử lại" gọi lại load, phân biệt initial-load vs refresh. Khi `response.success === false` hoặc throw → set error, **không** để bảng rỗng im lặng.
- **Tái sử dụng:** nếu đã có hook `useAsyncData` (UserManagementPage đang dùng) thì migrate 3 trang này sang hook đó thay vì viết tay — ưu tiên cách này để đồng nhất.

#### Todo 3.5 — Thay confirm/prompt native bằng ConfirmModal (F-12)

- **File:** `ReceiptsPage.jsx:41` (bulk delete), `ReceiptsPage.jsx:72` (lý do đối soát — cần modal có input text, dùng Modal form thay vì `window.prompt`), `PaymentsPage.jsx:41` (bulk delete).
- **Làm gì:** dùng `ConfirmModal`/`Modal` variant confirm sẵn có (`frontend/src/components/ui/Modal.jsx`). Với lý do đối soát: modal nhỏ có textarea bắt buộc nhập lý do (min length như backend validate), submit gọi `receiptsService.correct`.

#### Todo 3.6 — Dọn dead code + sửa reconciliation loop (F-13, F-14)

- **Xóa khỏi `frontend/src/services/api.js`** (xác nhận 0 tham chiếu bằng grep trước khi xóa từng method): `attendanceService.getByDate/getByClassDate/getByStudentMonth/create/calculateFee`; `monthlyFeesService.getAll/getById/generate/confirm/pay/cancel`; `reportsService.getFinancial/getFinanceDashboard/getStudentFees/getUnpaidStudents`; `receiptsService.getById`; `paymentsService.getById`; `templatesService.getDefault`; `classSessionsService.update/delete`; `classesService.enrollStudent`; `usersService.getById`.
  - **Lưu ý:** chỉ xóa client method, **không** xóa backend endpoint (backend giữ cho tương lai/API tiêu dùng ngoài).
- **Xóa file:** `frontend/src/components/AttendanceReviewModal.jsx` (bản orphan ở root components — bản thật nằm trong `components/attendance/`). Verify bằng grep import trước khi xóa.
- **Sửa `FeeCollectionPage.jsx:133`:** vòng reconciliation sau crash phải poll `bulkPayStatus(batchId)` (GET) lặp với backoff thay vì re-POST `bulkPay`; chỉ re-POST khi status trả `processing` và cần tiếp tục batch (đúng thiết kế 202 của backend).

**Definition of Done Phase 3:** lint zero warnings; full unit + frontend unit pass; E2E menu/UX smoke pass local; deploy + production Chrome smoke các trang đã sửa (Receipts hiện trong menu, History filter hoạt động, không còn chuỗi lỗi font); receipt + memory write-back.

---

### PHASE 4 — P3: Test & validation hardening

> **Giải quyết:** F-15, F-16, F-17, F-18. **Owner:** `test-engineer` + `backend-specialist`. **Review:** `security-auditor` cho F-15.

#### Todo 4.1 — E2E attendance lock workflow (F-16a)

- **File mới:** `frontend/e2e/attendance-lock-workflow.spec.js`.
- **Môi trường:** local smoke server (`npm run dev:smoke` — chạy real `api/router.ts` + `frontend/dist`) với DB local/isolated. **Tuyệt đối không chạy mutation trên production.**
- **Kịch bản:** (1) login admin → tạo class test + enroll 2 student (API setup); (2) vào `/attendance`, chọn class, chọn tuần, đánh present/absent đủ buổi, Lưu điểm danh; (3) submit period → approve → mở lock-preflight modal → assert readiness → lock; (4) assert Fee Workbench có class line đúng số buổi/số tiền; (5) reopen-for-correction → assert period về trạng thái mở và fee line mutable được refresh; (6) cleanup data test.
- **Assertion phụ:** không console error, không API 500, các nút bị disable đúng lúc metadata loading (regression cho fix 2026-07-17).

#### Todo 4.2 — E2E bulk-pay + idempotency (F-16b)

- **File mới:** `frontend/e2e/fee-workbench-bulk-pay.spec.js`.
- **Kịch bản:** (1) setup class line ready qua flow 4.1 hoặc API; (2) chọn 2 line → bulk collect (cash) → assert receipts sinh ra + print queue modal đủ 2 phiếu; (3) idempotency: gọi lại `bulkPay` cùng `Idempotency-Key` qua API → assert không sinh receipt trùng, batch trả trạng thái completed; (4) reload trang giữa chừng (simulate crash sau khi localStorage checkpoint ghi) → assert reconciliation on-mount hiển thị đúng trạng thái batch, không double-charge.
- **Phụ thuộc:** làm sau Todo 3.6 (reconciliation đã sửa sang poll status).

#### Todo 4.3 — Zod cho handler money-moving (F-17, phần ưu tiên)

- **Phạm vi đợt này (chỉ money-moving/high-risk):** `server/api/attendance/bulk.ts`, `server/api/attendance-periods/[id]/index.ts` (action payload), `server/api/monthly-fees/[id]/pay.ts` (bỏ luôn nhánh raw-string body dòng 40), `server/api/monthly-fees/bulk-pay.ts` (thay hand-rolled canonicalizer bằng zod schema + giữ payload hash), `server/api/class-sessions/month-plan.ts`.
- **Cách làm:** thêm schema vào `lib/validation.ts` (file tập trung sẵn có), parse ở đầu handler, lỗi trả `VALIDATION_ERROR` envelope chuẩn. **Không đổi hành vi hợp lệ hiện tại** — schema phải chấp nhận đúng payload mà frontend đang gửi (đọc call site trong `api.js`/pages trước khi viết schema; snapshot payload thật từ E2E để đối chiếu).
- **Phần còn lại (~40 handler CRUD thường):** ghi vào KANBAN như backlog incremental, không làm đợt này.

#### Todo 4.4 — Test admin CRUD surfaces (F-18, phần ưu tiên)

- **File mới trong `tests/`:** `users-admin.test.ts` (create/update/reset-password/deactivate + kiểm tra non-admin bị 403), `payments-crud.test.ts` (create admin-only, delete admin-only, list cho receptionist), `parent-portal-auth.test.ts` (login đúng/sai phone+DOB, me với token revoked, logout revoke session), `templates-crud.test.ts` (CRUD + set-default + upload-image base64 validation).
- **Mức độ:** handler-level test theo pattern các test hiện có trong `tests/` (gọi handler với mock req/res hoặc qua router test harness sẵn có — xem `tests/router-audit.test.ts` để tái dùng harness).
- **Trọng tâm:** ranh giới quyền admin/receptionist — đây là phần đang không có lưới bảo vệ.

#### Todo 4.5 — Fix audit attribution stateless (F-15)

- **File:** `api/router.ts` (dòng 224).
- **Làm gì:** audit log phải ưu tiên identity từ `authenticate()` DB-backed (được handler gọi rồi — cần cơ chế truyền kết quả lên router, ví dụ handler gắn `req.authUser` hoặc router gọi authenticate trước khi dispatch cho mutation). Nếu chi phí refactor lớn, tối thiểu: gọi bản async DB-backed thay vì `verifyAuth` stateless cho `POST/PUT/PATCH/DELETE`, chấp nhận +1 query mỗi mutation.
- **Test:** cập nhật `tests/router-audit.test.ts`: token revoked-nhưng-chưa-hết-hạn → audit log không ghi user đó (ghi anonymous/rejected).

**Definition of Done Phase 4:** 2 E2E mới pass local (không yêu cầu production vì có mutation); zod schemas không phá payload hiện có (E2E cũ + mới đều pass); test mới ≥ 4 file, full suite tăng số lượng và pass toàn bộ; receipt + memory write-back.

---

### PHASE 5 — Docs, schema hygiene, operational

> **Giải quyết:** F-06, F-19..F-24. **Owner:** `documentation-writer` + `database-architect`; F-06 cần `devops-engineer` + **phê duyệt của bạn**.

#### Todo 5.1 — Đồng bộ docs (F-23)

- **`PROJECT_CONTEXT.md`:** viết lại các mục sai: Tech Stack (React 19 + Vite 7 + Tailwind v4 + Vercel serverless TS + **Neon** Postgres + Vercel Blob), Production URL (`https://edu-manager-gules.vercel.app`), xóa mô tả Supabase/delta URL, cập nhật cấu trúc thư mục (`server/api/*` + `api/router.ts` thay vì `api/students` kiểu cũ), cập nhật Progress thực tế.
- **`KANBAN.md` header:** bỏ dòng "Treat production as approximately 50-60% usable" (đã lỗi thời từ khi Phase A/B/C + remediation đóng) — thay bằng trạng thái hiện tại + trỏ tới file này (`Audit_V2.md`) làm backlog nguồn.
- **`.shared/` docs + `docs/API.md`:** quét mô tả stack cũ (Supabase, React 18, Express-as-primary) và sửa; xác nhận `docs/API.md` khớp router (đã có unit drift test — chạy lại là đủ).
- **Ghi chú intentional drift:** thêm mục vào `docs/` hoặc `decisionLog.md`: `auth_rate_limit` là bảng raw SQL ngoài Prisma schema **có chủ đích** — để `prisma migrate diff` alarm không bị "fix" nhầm.

#### Todo 5.2 — Schema hygiene migration (F-21, F-22 phần an toàn)

- **1 migration additive duy nhất** `2026XXXX_schema_hygiene`:
  - Index mới: `attendance(created_by)`, `monthly_fees(receipt_id)`, `activity_logs(entity_type, entity_id)`, `templates(created_by)`.
  - **Không** làm trong đợt này (ghi backlog): Float→Decimal (F-19 — cần kế hoạch migration data riêng + phê duyệt), exclusion constraint EnrollmentPeriod (F-20 — cần extension `btree_gist`, verify Neon hỗ trợ trước), xóa `Student.graduationDate` (đợi quyết định wire-vs-drop), FK cho `BulkFeePaymentItem.receiptId`, enum cho `AuthSession.subjectType`.
- **Cập nhật `prisma/schema.prisma`** tương ứng (`@@index`), `npx prisma validate`, deploy migration, `prisma migrate status` clean.

#### Todo 5.3 — Operational: rotate credentials (F-06) — CẦN BẠN PHÊ DUYỆT/THAM GIA

- **Các bước đề xuất cho `devops-engineer` (chỉ thực hiện khi bạn xác nhận):**
  1. Tạo password admin mới mạnh → đổi qua UI change-password hoặc `users/[id]/reset-password` trên production.
  2. Rotate `JWT_SECRET` trên Vercel env (≥32 chars random) → mọi session hiện tại invalid → user login lại (thông báo trước cho người dùng thực nếu có).
  3. Kiểm tra `BLOB_READ_WRITE_TOKEN`, `CRON_SECRET`, `DATABASE_URL` password còn trong tài liệu nào không (PROJECT_CONTEXT.md đang lộ một phần connection string — xóa ở Todo 5.1).
  4. Smoke sau rotate: login mới 200, token cũ 401, cron với secret mới 200/không secret 403.
- **Quyết định chờ bạn:** có bật `REMINDER_SEND_ENABLED` không (cần webhook SMS/Zalo + opt-in policy — khuyến nghị giữ `false` như hiện tại cho đến khi có).

#### Todo 5.4 — Memory write-back tổng kết đợt audit

- Cập nhật `memory/memory-bank/activeContext.md` (mục Current Sprint Focus mới: Audit_V2 remediation), append `progress.md` từng phase, `decisionLog.md` cho các quyết định (timezone convention, frozen→open semantics, giữ Float tạm thời).
- Tạo receipt tổng `receipts/2026-08-XX-audit-v2-remediation-closeout.md` khi cả 5 phase xong.
- Cập nhật `KANBAN.md`: thêm section AUDIT-V2 với bảng task ID `AUDV2-01..24` map với F-01..F-24, đánh trạng thái từng mục.

**Definition of Done Phase 5:** docs không còn mô tả stack chết; migration hygiene deploy sạch; credentials đã rotate (khi được duyệt); KANBAN + memory phản ánh đúng trạng thái; receipt tổng phát hành.

---

## PHẦN III — TRÌNH TỰ & QUY TẮC THỰC THI

```
Phase 1 (P0 backup)  ──►  Phase 2 (P1 finance)  ──►  Phase 3 (P2 frontend UX)
                                                          │
                                                          ▼
                     Phase 5 (docs/ops)  ◄──  Phase 4 (P3 test/validation)
```

- **Tuần tự, không song song giữa các phase** (Phase 3 phụ thuộc timezone fix của Phase 2; Phase 4 phụ thuộc reconciliation fix của Phase 3). Trong 1 phase, các todo độc lập có thể chia cho subagent song song nếu không đụng cùng file.
- **Mỗi phase:** 1 nhánh việc → gates → commit explicit paths → deploy → production smoke → receipt → memory write-back → mới sang phase kế.
- **Rollback:** mỗi deploy Vercel giữ deployment trước làm rollback target; migration chỉ additive/trigger-replace nên rollback = re-deploy trigger cũ (giữ file SQL cũ trong repo).
- **Escalation:** bất kỳ todo nào phát hiện thực tế khác mô tả trong file này (ví dụ helper không ở vị trí ghi, Neon không cho `session_replication_role`) → dừng todo đó, ghi finding vào receipt, chọn phương án dự phòng đã ghi sẵn hoặc hỏi lại, không tự chế phương án mới ngoài phạm vi.

## PHẦN IV — MASTER TODO CHECKLIST (đủ toàn bộ các phase)

> Quy ước: mỗi todo có ID duy nhất `AUDV2-Px-yy`. Agent thực thi đánh dấu `[x]` khi todo đạt tiêu chí nghiệm thu, kèm link bằng chứng (receipt/test output/commit). Cột "Phụ thuộc" phải hoàn thành trước khi bắt đầu todo đó.

### Phase 1 — P0 Backup/Restore integrity (owner: `database-architect`, review: `judge-agent` adversarial)

- [ ] **AUDV2-P1-01 — Cập nhật BACKUP_MANIFEST**
  - **Việc:** Thêm `ClassSession`, `ClassMonthPlan`, `ClassMonthPlanRevision`, `MonthlyFeeLineRevision` vào `BACKUP_MANIFEST` trong `lib/backup.ts:9-34`, theo thứ tự topo-sort FK: `ClassSession` sau `Class`/`User` và trước `Attendance`; `ClassMonthPlanRevision` sau `ClassMonthPlan`; `MonthlyFeeLineRevision` sau `MonthlyFeeLine`.
  - **Cách:** Đối chiếu từng FK trong `prisma/schema.prisma` trước khi chốt vị trí; chạy lại test backup hiện có để bắt lỗi thứ tự.
  - **Nghiệm thu:** Manifest chứa đủ 4 model mới, đúng thứ tự insert-xuôi/delete-ngược hợp lệ; typecheck pass.
  - **Phụ thuộc:** không.
- [ ] **AUDV2-P1-02 — Sửa restore/reset xử lý trigger immutability**
  - **Việc:** Sửa `restoreDatabase` trong `lib/backup.ts` và `prisma/reset-database.ts` để không bị trigger immutability (`monthly_fee_line_revisions`, `class_month_plan_revisions`) và state-guard (`class_month_plans`) chặn.
  - **Cách:** Phương án A: `SET LOCAL session_replication_role='replica'` trong transaction restore — **verify quyền trên Neon trước** bằng câu lệnh thử trên DB isolated cùng loại. Nếu Neon từ chối → Phương án B: `ALTER TABLE ... DISABLE TRIGGER USER` / `ENABLE` trong cùng transaction. Restore từ backup format cũ (thiếu 4 bảng) phải fail rõ ràng với message hướng dẫn, không silent-corrupt.
  - **Nghiệm thu:** Restore + reset chạy sạch trên DB isolated có dữ liệu V3; trigger hoạt động trở lại sau restore (UPDATE revision row phải raise).
  - **Phụ thuộc:** AUDV2-P1-01.
- [ ] **AUDV2-P1-03 — Test round-trip backup→restore với dữ liệu V3**
  - **Việc:** Viết `tests/backup-v3-roundtrip.test.ts`: seed DB isolated (1 class, 2 ClassSession, 1 ClassMonthPlan frozen, 1 ClassMonthPlanRevision, 1 MonthlyFee, 2 MonthlyFeeLine, 1 MonthlyFeeLineRevision, attendance link session) → backup → assert manifest/counts → wipe → restore → assert rows/FK/trigger → reset-database không fail FK.
  - **Cách:** Nếu `TEST_DATABASE_URL` chưa có: dựng Postgres qua `docker-compose.yml` sẵn ở root, document biến env trong receipt.
  - **Nghiệm thu:** Test mới pass; full suite không giảm (baseline 467).
  - **Phụ thuộc:** AUDV2-P1-02.
- [ ] **AUDV2-P1-04 — Deploy + verify production + closeout**
  - **Việc:** Gates đầy đủ → commit explicit paths → deploy Vercel → chạy `POST /api/backups` action `run` rồi `verify` trên production → assert counts 4 bảng mới > 0. **Không chạy restore trên production.**
  - **Nghiệm thu:** Receipt `receipts/2026-08-XX-backup-v3-manifest-fix.md` với bằng chứng counts; memory write-back (activeContext + progress + KANBAN).
  - **Phụ thuộc:** AUDV2-P1-03.

### Phase 2 — P1 Correctness tài chính (owner: `backend-specialist`, review: `judge-agent` + `test-engineer`)

- [ ] **AUDV2-P2-01 — Chặn confirm aggregate khi có class lines**
  - **Việc:** Thêm `assertAggregatePaymentAllowed(feeId)` vào `server/api/monthly-fees/[id]/confirm.ts:28-74` trước khi update status; fee có ≥1 line → 409 với đúng error code mà `pay.ts:21-29` đang trả (đọc code lấy tên chính xác).
  - **Cách:** Nếu helper đang nằm trong `pay.ts` → refactor ra `lib/` rồi import ở cả hai nơi.
  - **Nghiệm thu:** Unit test: confirm-with-lines → 409; confirm aggregate legacy (không lines) → vẫn hoạt động.
  - **Phụ thuộc:** Phase 1 xong (theo trình tự phase).
- [ ] **AUDV2-P2-02 — Kiểm tra và vá `cancel.ts` cùng lỗ hổng**
  - **Việc:** Đọc `server/api/monthly-fees/[id]/cancel.ts`; nếu cũng bỏ qua check class-line như confirm → vá cùng pattern AUDV2-P2-01; nếu không → ghi kết luận "đã kiểm tra, không dính" vào receipt.
  - **Nghiệm thu:** Kết luận rõ ràng trong receipt kèm test nếu có vá.
  - **Phụ thuộc:** AUDV2-P2-01.
- [ ] **AUDV2-P2-03 — Bỏ fabricate `paidAt`**
  - **Việc:** Sửa `lib/monthly-fee-lines.ts:260-266`: `paidAt = max(line.paidAt)` của các line có giá trị; không line nào có → `null` + structured warning `PAID_AT_MISSING_ON_LINES` qua `lib/observability.ts`. Grep nơi đọc `MonthlyFee.paidAt` (reports/workbench/dashboard) thêm null-guard nếu cần.
  - **Nghiệm thu:** Unit test 3 case (tất cả có / một phần có / không có paidAt); không crash ở consumer khi null.
  - **Phụ thuộc:** không (song song được với P2-01 — khác file).
- [ ] **AUDV2-P2-04 — Chuẩn hóa UTC cho date filters**
  - **Việc:** Viết/tái dùng helper `parseUtcDateRange(from,to)` trong `lib/api-utils.ts`; thay `server/api/receipts/index.ts:97-98` và `parseMonthRange` (`lib/api-utils.ts:83-84`) sang UTC half-open (`>= start AND < end`, dùng `Date.UTC`), cùng convention `lib/attendance-lock.ts:97-99`.
  - **Cách:** Grep toàn `server/` pattern `` new Date(`${...}T00:00:00`) `` và `T23:59:59` để vá hết các chỗ lệch cùng lúc (payments/history filter có thể dính).
  - **Nghiệm thu:** Unit test biên tháng (receipt tạo cuối tháng VN-time vs UTC → filter nhất quán); các test hiện có về month-range vẫn pass.
  - **Phụ thuộc:** không (song song được).
- [ ] **AUDV2-P2-05 — Ghi quyết định timezone vào decisionLog**
  - **Việc:** Ghi vào `memory/memory-bank/decisionLog.md`: chọn UTC thuần (khuyến nghị — nhất quán với attendance, Vercel chạy UTC nên hành vi production không đổi) hay business-timezone UTC+7; lý do; ảnh hưởng.
  - **Nghiệm thu:** Entry mới trong decisionLog với ngày + căn cứ.
  - **Phụ thuộc:** AUDV2-P2-04.
- [ ] **AUDV2-P2-06 — Xác minh intent frozen→open của ClassMonthPlan**
  - **Việc:** Grep `frozen`/`reopen` trong `lib/` + `server/api/class-sessions/month-plan.ts` + đọc `receipts/2026-07-14-attendance-month-ledger-correction-closeout.md`; trả lời: có workflow chủ đích reopen plan frozen không (reopen-for-correction của attendance-periods có mở lại plan không)?
  - **Nghiệm thu:** Kết luận bằng văn bản (trong receipt + decisionLog): (a) có → rule = frozen→open chỉ khi revision tăng VÀ có audit row trong `class_month_plan_revisions` cùng transaction; (b) không → khôi phục cấm tuyệt đối.
  - **Phụ thuộc:** không.
- [ ] **AUDV2-P2-07 — Migration khôi phục frozen guard**
  - **Việc:** Viết migration `2026XXXX_class_month_plan_frozen_guard_restore/migration.sql`: `CREATE OR REPLACE FUNCTION` trigger giữ rule strict-revision-increment hiện tại + rule frozen theo kết luận P2-06. Idempotent như các migration trước.
  - **Nghiệm thu:** SQL-level test trên DB isolated: frozen→open không hợp lệ raise; open→frozen revision tăng pass; revision không tăng raise. `npx prisma migrate deploy` lên Neon sạch, `migrate status` clean.
  - **Phụ thuộc:** AUDV2-P2-06.
- [ ] **AUDV2-P2-08 — Gates + deploy + production smoke + closeout Phase 2**
  - **Việc:** Full gates → commit → deploy → production smoke: confirm-with-lines trả 409 (dùng fee test hoặc probe read-only + local mutation smoke), receipts filter biên tháng đúng.
  - **Nghiệm thu:** Receipt Phase 2 + memory write-back; full suite pass ≥ baseline.
  - **Phụ thuộc:** AUDV2-P2-01..07.

### Phase 3 — P2 Frontend UX (owner: `frontend-specialist`, review: `qa-automation-engineer`)

- [ ] **AUDV2-P3-01 — Thêm `/receipts` vào Sidebar**
  - **Việc:** Thêm item `{ path: '/receipts', label: 'Phiếu thu', icon: 'receipt' }` vào nhóm tài chính trong `frontend/src/components/layout/Sidebar.jsx:37-90` (icon đã có ở `iconsMap:23`). Không set `adminOnly` (router đang cho cả receptionist).
  - **Nghiệm thu:** Menu hiển thị đúng nhóm; E2E "distinct surfaces" + menu-traversal pass (cập nhật count trong spec nếu spec đếm số item).
  - **Phụ thuộc:** Phase 2 xong (trình tự phase).
- [ ] **AUDV2-P3-02 — Wire date filter HistoryPage**
  - **Việc:** Truyền `from`/`to` từ state `dateRange` vào `receiptsService.getAll` + `paymentsService.getAll` trong `frontend/src/pages/HistoryPage.jsx:29-60`. Kiểm tra payments handler có hỗ trợ `from`/`to` không; nếu chưa → filter client-side theo ngày chứng từ và ghi chú trong receipt.
  - **Nghiệm thu:** Đổi date → request có query đúng (unit test component hoặc assertion trong spec History của Phase 4); totals tính trên tập đã lọc.
  - **Phụ thuộc:** AUDV2-P2-04 (biên UTC đã chuẩn).
- [ ] **AUDV2-P3-03 — Sửa 2 chuỗi mojibake FeeCollectionPage**
  - **Việc:** `frontend/src/pages/FeeCollectionPage.jsx:295,360`: thay `'KhÃ´ng thá»ƒ tÃ­nh phÃ­...'` bằng `'Không thể tính phí. Vui lòng thử lại.'`. File lưu UTF-8 không BOM.
  - **Nghiệm thu:** `git diff` hiển thị đúng ký tự tiếng Việt; lint pass.
  - **Phụ thuộc:** không (trong phase).
- [ ] **AUDV2-P3-04 — Quét và sửa toàn bộ chuỗi tiếng Việt không dấu**
  - **Việc:** Sửa các vị trí đã biết: `AttendancePage.jsx:1641` ("Luu diem danh"→"Lưu điểm danh"), `FeeCollectionPage.jsx:525,835` ("Dang mo..."→"Đang mở..."), `FeeCollectionPage.jsx:194,303,710` ("Khong the tai bang hoc phi..."→"Không thể tải bảng học phí..."), `frontend/src/services/api.js:151` (timeout message). Sau đó grep toàn `frontend/src` các pattern `Dang `, `Khong `, `Luu `, `Tai `, `Vui long` để sửa hết trong 1 commit.
  - **Cách:** Chỉ sửa string literal hiển thị UI, không đụng key/id/selector. Grep `frontend/e2e` với text cũ trước khi đổi — cập nhật spec assert text cùng commit.
  - **Nghiệm thu:** Không còn chuỗi UI không dấu trong các file đã quét; E2E liên quan pass.
  - **Phụ thuộc:** AUDV2-P3-03 (cùng file, tránh conflict).
- [ ] **AUDV2-P3-05 — Error banner + retry cho Receipts/Payments/History**
  - **Việc:** `ReceiptsPage.jsx:28-37`, `PaymentsPage.jsx:28-37`, `HistoryPage.jsx:29-60`: khi `response.success===false` hoặc throw → set `loadError`, hiển thị banner `role="alert"` + nút "Thử lại", phân biệt initial-load vs refresh.
  - **Cách:** Ưu tiên migrate 3 trang sang hook `useAsyncData` (UserManagementPage đang dùng) thay vì viết tay, để đồng nhất pattern.
  - **Nghiệm thu:** Mock API fail → banner hiện + retry hoạt động; không còn bảng rỗng im lặng.
  - **Phụ thuộc:** không (trong phase).
- [ ] **AUDV2-P3-06 — Thay window.confirm/prompt bằng ConfirmModal**
  - **Việc:** `ReceiptsPage.jsx:41` (bulk delete) và `PaymentsPage.jsx:41` → `ConfirmModal` variant confirm sẵn có. `ReceiptsPage.jsx:72` (lý do đối soát) → Modal form nhỏ với textarea bắt buộc (min length khớp backend validate), submit gọi `receiptsService.correct`.
  - **Nghiệm thu:** Không còn `window.confirm`/`window.prompt` trong `frontend/src/pages`; flow đối soát hoạt động với lý do nhập từ modal.
  - **Phụ thuộc:** AUDV2-P3-05 (cùng file ReceiptsPage/PaymentsPage).
- [ ] **AUDV2-P3-07 — Xóa dead methods trong api.js**
  - **Việc:** Xóa (sau khi grep xác nhận 0 tham chiếu từng method): `attendanceService.getByDate/getByClassDate/getByStudentMonth/create/calculateFee`; `monthlyFeesService.getAll/getById/generate/confirm/pay/cancel`; `reportsService.getFinancial/getFinanceDashboard/getStudentFees/getUnpaidStudents`; `receiptsService.getById`; `paymentsService.getById`; `templatesService.getDefault`; `classSessionsService.update/delete`; `classesService.enrollStudent`; `usersService.getById`. **Không xóa backend endpoint.**
  - **Nghiệm thu:** Build + full frontend test pass; grep không còn method chết.
  - **Phụ thuộc:** không (trong phase).
- [ ] **AUDV2-P3-08 — Xóa component orphan**
  - **Việc:** Xóa `frontend/src/components/AttendanceReviewModal.jsx` (bản thật nằm ở `components/attendance/`). Verify import bằng grep trước khi xóa.
  - **Nghiệm thu:** Build pass; grep không còn tham chiếu tới file đã xóa.
  - **Phụ thuộc:** không.
- [ ] **AUDV2-P3-09 — Sửa reconciliation bulk-pay sang poll status**
  - **Việc:** `FeeCollectionPage.jsx:133`: vòng reconciliation sau crash poll `bulkPayStatus(batchId)` (GET) với backoff; chỉ re-POST `bulkPay` cùng idempotency key khi status = `processing` và cần tiếp tục batch (đúng thiết kế 202 backend).
  - **Nghiệm thu:** Simulate crash (localStorage checkpoint tồn tại) → mount → poll status, không re-POST khi batch đã completed; unit/E2E ở AUDV2-P4-02 xác nhận.
  - **Phụ thuộc:** AUDV2-P3-03/04 (cùng file FeeCollectionPage).
- [ ] **AUDV2-P3-10 — Gates + deploy + production smoke + closeout Phase 3**
  - **Việc:** Lint zero warnings → full unit + frontend unit → build → E2E menu/UX smoke local → deploy → production Chrome smoke: Receipts trong menu, History filter hoạt động, không còn chuỗi lỗi font, error banner render đúng.
  - **Nghiệm thu:** Receipt Phase 3 + memory write-back.
  - **Phụ thuộc:** AUDV2-P3-01..09.

### Phase 4 — P3 Test & validation hardening (owner: `test-engineer` + `backend-specialist`, review: `security-auditor` cho P4-06)

- [ ] **AUDV2-P4-01 — E2E attendance lock workflow**
  - **Việc:** Viết `frontend/e2e/attendance-lock-workflow.spec.js` chạy trên local smoke server (`npm run dev:smoke`) + DB isolated: (1) API setup class test + enroll 2 student; (2) UI đánh điểm danh đủ buổi + Lưu; (3) submit → approve → lock-preflight modal → lock; (4) assert Fee Workbench class line đúng buổi/tiền; (5) reopen-for-correction → assert period mở lại + fee line mutable refresh; (6) cleanup. Assert phụ: zero console error, zero API 500, nút disable đúng lúc metadata loading.
  - **Nghiệm thu:** Spec pass local ổn định (chạy 2 lần liên tiếp không flaky). **Không chạy trên production.**
  - **Phụ thuộc:** Phase 3 xong.
- [ ] **AUDV2-P4-02 — E2E bulk-pay + idempotency + print queue**
  - **Việc:** Viết `frontend/e2e/fee-workbench-bulk-pay.spec.js`: (1) setup line ready; (2) chọn 2 line → bulk collect cash → assert receipts + print queue đủ 2 phiếu; (3) re-POST cùng `Idempotency-Key` qua API → không receipt trùng, batch completed; (4) reload giữa chừng → reconciliation on-mount hiển thị đúng, không double-charge.
  - **Nghiệm thu:** Spec pass local ổn định.
  - **Phụ thuộc:** AUDV2-P3-09 (reconciliation đã sửa), AUDV2-P4-01 (tái dùng setup).
- [ ] **AUDV2-P4-03 — Zod cho 5 handler money-moving**
  - **Việc:** Thêm schema vào `lib/validation.ts` và parse ở đầu handler cho: `server/api/attendance/bulk.ts`, `server/api/attendance-periods/[id]/index.ts` (action payload), `server/api/monthly-fees/[id]/pay.ts`, `server/api/monthly-fees/bulk-pay.ts` (thay hand-rolled canonicalizer, giữ payload hash), `server/api/class-sessions/month-plan.ts`. Lỗi trả `VALIDATION_ERROR` envelope chuẩn.
  - **Cách:** Đọc call site trong `api.js`/pages + snapshot payload thật từ E2E trước khi viết schema — schema phải chấp nhận đúng payload frontend đang gửi, không đổi hành vi hợp lệ.
  - **Nghiệm thu:** E2E cũ + mới (P4-01, P4-02) đều pass; unit test payload sai → `VALIDATION_ERROR`.
  - **Phụ thuộc:** AUDV2-P4-01, P4-02 (cần E2E làm lưới an toàn trước khi đổi validation).
- [ ] **AUDV2-P4-04 — Bỏ nhánh raw-string body trong pay.ts**
  - **Việc:** `server/api/monthly-fees/[id]/pay.ts:40`: xóa nhánh `typeof req.body === "string"` — payload phải là object qua zod schema (P4-03).
  - **Cách:** Grep frontend + tests xác nhận không nơi nào gửi raw string trước khi xóa.
  - **Nghiệm thu:** Unit test raw string body → `VALIDATION_ERROR`; flow pay bình thường pass.
  - **Phụ thuộc:** AUDV2-P4-03.
- [ ] **AUDV2-P4-05 — Test admin CRUD surfaces (4 file mới)**
  - **Việc:** Viết theo pattern harness sẵn có (`tests/router-audit.test.ts`): `tests/users-admin.test.ts` (create/update/reset-password/deactivate + non-admin 403), `tests/payments-crud.test.ts` (create/delete admin-only, list cho receptionist), `tests/parent-portal-auth.test.ts` (login đúng/sai phone+DOB, me với token revoked, logout revoke session), `tests/templates-crud.test.ts` (CRUD + set-default + upload-image base64 validation).
  - **Nghiệm thu:** 4 file test mới pass; trọng tâm ranh giới admin/receptionist được assert rõ.
  - **Phụ thuộc:** không (song song được với P4-01..04).
- [ ] **AUDV2-P4-06 — Fix audit attribution stateless ở router**
  - **Việc:** `api/router.ts:224`: audit log ưu tiên identity DB-backed — handler gắn kết quả `authenticate()` lên `req` (ví dụ `req.authUser`) cho router đọc, hoặc router gọi authenticate DB-backed trước dispatch cho `POST/PUT/PATCH/DELETE` (chấp nhận +1 query/mutation nếu refactor lớn).
  - **Nghiệm thu:** Cập nhật `tests/router-audit.test.ts`: token revoked-chưa-hết-hạn → audit log không ghi user đó (anonymous/rejected); mutation audit bình thường vẫn ghi đúng.
  - **Phụ thuộc:** không (song song được).
- [ ] **AUDV2-P4-07 — Gates + deploy + closeout Phase 4**
  - **Việc:** Full gates (suite tăng số test, pass toàn bộ) → commit → deploy → production probe read-only (payload sai → `VALIDATION_ERROR`, không cần mutation).
  - **Nghiệm thu:** Receipt Phase 4 + memory write-back; backlog "zod cho ~40 handler còn lại" ghi vào KANBAN.
  - **Phụ thuộc:** AUDV2-P4-01..06.

### Phase 5 — Docs, schema hygiene, operational (owner: `documentation-writer` + `database-architect`; P5-06 cần `devops-engineer` + phê duyệt của bạn)

- [ ] **AUDV2-P5-01 — Viết lại PROJECT_CONTEXT.md**
  - **Việc:** Sửa các mục sai: Tech Stack (React 19 + Vite 7 + Tailwind v4 + Vercel serverless TS + Neon Postgres + Vercel Blob), Production URL `https://edu-manager-gules.vercel.app`, xóa Supabase/delta URL, cập nhật cấu trúc thư mục (`server/api/*` + `api/router.ts`), cập nhật Progress thực tế. **Xóa connection string bị lộ một phần** trong mục Environment Variables (thay bằng placeholder).
  - **Nghiệm thu:** Không còn tham chiếu Supabase/delta/React 18 trong file; không còn credential fragment.
  - **Phụ thuộc:** Phase 4 xong (trình tự phase).
- [ ] **AUDV2-P5-02 — Sửa KANBAN.md header**
  - **Việc:** Bỏ dòng "Treat production as approximately 50-60% usable" (lỗi thời); thay bằng trạng thái hiện tại + trỏ tới `Audit_V2.md` làm backlog nguồn; thêm section AUDIT-V2 với bảng task `AUDV2-*` map F-01..F-24 và trạng thái từng mục.
  - **Nghiệm thu:** Header phản ánh đúng trạng thái; bảng AUDIT-V2 đầy đủ ID.
  - **Phụ thuộc:** không (trong phase).
- [ ] **AUDV2-P5-03 — Quét .shared docs + verify docs/API.md**
  - **Việc:** Grep `.shared/`, `docs/` các từ khóa `Supabase`, `React 18`, `edu-manager-delta`, `Express` (as-primary) → sửa về stack hiện tại. Chạy lại unit drift test của `docs/API.md` với `api/router.ts` để xác nhận khớp.
  - **Nghiệm thu:** Grep sạch từ khóa stack chết; drift test pass.
  - **Phụ thuộc:** không.
- [ ] **AUDV2-P5-04 — Ghi chú intentional drift `auth_rate_limit`**
  - **Việc:** Thêm entry vào `memory/memory-bank/decisionLog.md` (hoặc `docs/`): bảng `auth_rate_limit` là raw SQL ngoài Prisma schema có chủ đích (dùng bởi `lib/distributed-rate-limit.ts`) — không được "fix" khi `prisma migrate diff` báo drift.
  - **Nghiệm thu:** Entry tồn tại, nêu rõ file tiêu thụ.
  - **Phụ thuộc:** không.
- [ ] **AUDV2-P5-05 — Migration schema hygiene (indexes)**
  - **Việc:** 1 migration additive `2026XXXX_schema_hygiene`: index `attendance(created_by)`, `monthly_fees(receipt_id)`, `activity_logs(entity_type, entity_id)`, `templates(created_by)`. Cập nhật `@@index` tương ứng trong `prisma/schema.prisma`.
  - **Cách:** `npx prisma validate` → test isolated → `migrate deploy` lên Neon → `migrate status` clean. **Không** gộp Float→Decimal, exclusion constraint, xóa field chết vào migration này (đã hoãn — Phần VI).
  - **Nghiệm thu:** Migration deploy sạch; schema và migration nhất quán.
  - **Phụ thuộc:** không (trong phase).
- [ ] **AUDV2-P5-06 — Rotate credentials + JWT secret (CẦN PHÊ DUYỆT)**
  - **Việc:** Chỉ thực hiện khi bạn xác nhận: (1) đổi password admin mới mạnh qua change-password/reset-password trên production; (2) rotate `JWT_SECRET` trên Vercel env (≥32 chars random) — mọi session hiện tại invalid, user login lại; (3) xác nhận `BLOB_READ_WRITE_TOKEN`/`CRON_SECRET`/`DATABASE_URL` không còn lộ trong docs (phối hợp P5-01).
  - **Nghiệm thu:** Smoke sau rotate: login mới 200, token cũ 401, cron secret mới 200 / không secret 403. Ghi receipt riêng, KHÔNG ghi giá trị secret vào bất kỳ file nào.
  - **Phụ thuộc:** AUDV2-P5-01 (docs sạch credential trước); **phê duyệt của bạn**.
- [ ] **AUDV2-P5-07 — Ghi quyết định REMINDER_SEND_ENABLED**
  - **Việc:** Ghi vào decisionLog: giữ `REMINDER_SEND_ENABLED=false` cho đến khi có SMS/Zalo webhook + opt-in policy + message template được duyệt (khuyến nghị hiện tại), hoặc kế hoạch bật nếu bạn quyết định khác.
  - **Nghiệm thu:** Entry decisionLog tồn tại.
  - **Phụ thuộc:** quyết định của bạn (không chặn các todo khác).
- [ ] **AUDV2-P5-08 — Memory write-back tổng + receipt closeout**
  - **Việc:** Cập nhật `activeContext.md` (sprint focus mới), append `progress.md` cho từng phase đã đóng, `decisionLog.md` các quyết định (timezone, frozen semantics, giữ Float tạm), phát hành receipt tổng `receipts/2026-08-XX-audit-v2-remediation-closeout.md` liệt kê toàn bộ AUDV2-* với bằng chứng.
  - **Nghiệm thu:** 3 file memory + KANBAN + receipt tổng nhất quán với trạng thái checklist này.
  - **Phụ thuộc:** AUDV2-P5-01..07 (và các phase trước đã đóng).

---

## PHẦN V — CHIẾN LƯỢC KIỂM THỬ: LOOP TEST, TEST CASES & METRICS

> Mục tiêu: đảm bảo mọi todo AUDV2-* được triển khai **đúng** (test case phủ hành vi), **đủ** (ma trận truy vết không bỏ sót finding), **giảm rủi ro** (loop lặp đến khi ổn định + tiêu chí rollback rõ ràng). Agent thực thi bắt buộc tuân theo phần này; kết quả từng test case ghi vào receipt của phase tương ứng.

### V.1 — Loop Test Protocol (quy trình vòng lặp kiểm thử)

Có 5 vòng lặp, lồng nhau từ nhỏ đến lớn. Không được bỏ vòng nào.

#### LOOP-1: TDD per-todo (vòng trong cùng, chạy cho TỪNG todo có code)

```
Viết test FAIL trước (Red) → implement tối thiểu để pass (Green) → refactor giữ pass
→ chạy focused suite của module liên quan → pass thì đóng todo
```

- **Exit condition:** test mới pass + focused suite của module pass + lint/typecheck sạch.
- **Áp dụng:** mọi todo sửa code (P1-01..03, P2-01..04, P2-07, P3-01..09, P4-03..06, P5-05).
- **Không áp dụng:** todo thuần docs/memory (P2-05, P5-01..04, P5-07..08) — thay bằng grep-verification (xem TC tương ứng).

#### LOOP-2: Per-phase regression loop (vòng phase)

```
Xong tất cả todo code của phase → chạy CHUỖI GATES ĐẦY ĐỦ theo thứ tự:
  (1) npx tsc --noEmit
  (2) npm --prefix frontend run lint -- --max-warnings=0
  (3) npm run test:unit            (root, baseline 467)
  (4) npm --prefix frontend run test:unit   (baseline 35)
  (5) npm run build
  (6) E2E liên quan phase (local)
  (7) git diff --check
BẤT KỲ bước nào fail → sửa → chạy lại TỪ BƯỚC (1), không chạy tiếp từ giữa.
```

- **Giới hạn:** tối đa **3 iteration** cho cùng một lỗi (3 strikes). Strike 3 → dừng, ghi RCA vào receipt, escalate cho bạn quyết định.
- **Cấm:** skip/xoá/`.only`/`.skip` test cũ để cho pass. Muốn sửa test cũ phải có lý do ghi trong receipt (ví dụ test assert text UI đã đổi ở P3-04).

#### LOOP-3: Stability loop cho E2E (chống flaky)

```
Mỗi spec E2E mới hoặc bị sửa → chạy 2 LẦN LIÊN TIẾP sạch trên local smoke server
→ 1 lần fail bất kỳ = flaky → sửa ROOT CAUSE (wait điều kiện, race, selector) → lặp lại từ đầu
```

- **Cấm:** tăng timeout mù quáng hoặc thêm retry để che flake. Retry chỉ hợp lệ ở mức Playwright config đã có sẵn của dự án.
- **Bài học đã ghi nhận:** Playwright từng treo khi browser startup (2026-07-16) — nếu browser không khởi động được trong 120s, kill đúng process tree, ghi nhận, KHÔNG claim pass.

#### LOOP-4: Post-deploy production smoke loop

```
Deploy Vercel → đợi READY → chạy production smoke checklist của phase (mục V.3)
→ PASS: alias giữ nguyên, phát hành receipt
→ FAIL bất kỳ mục blocking: rollback alias về deployment trước đó NGAY (vercel alias set)
   → RCA local → fix → quay lại LOOP-2 → deploy lại
```

- Deployment trước đó phải được ghi lại (dpl_ id) **trước khi** deploy mới — đây là rollback target.
- Production smoke **chỉ read-only + mutation đã được phê duyệt trong plan** (ví dụ backup run/verify ở P1-04). Không mutation tài chính thật.

#### LOOP-5: Cumulative regression (vòng ngoài cùng, cuối mỗi phase)

```
Cuối phase N: chạy lại toàn bộ test case đánh dấu [C] (cumulative) của các phase 1..N-1
→ đảm bảo phase sau không phá phase trước
```

- Danh sách [C] đánh dấu trong catalog V.2. Về cơ bản: round-trip backup (P1), invariant confirm/pay (P2), E2E menu + lock workflow + bulk-pay (P3/P4).

### V.2 — Test Case Catalog (theo phase)

> Ký hiệu: **Loại** = U (unit), I (integration/DB isolated), E (E2E Playwright), S (SQL-level), G (grep/static), P (production smoke). **[C]** = đưa vào cumulative regression LOOP-5. Mỗi TC ghi kết quả PASS/FAIL + bằng chứng vào receipt phase.

#### Phase 1 — Backup/Restore (map: AUDV2-P1-01..04, F-01)

| TC | Loại | Mô tả / Input | Expected |
|----|------|---------------|----------|
| TC-P1-01 | U | Đọc `BACKUP_MANIFEST` sau sửa | Chứa đúng 4 model mới; thứ tự topo-sort FK hợp lệ (ClassSession sau Class/User trước Attendance; revisions sau bảng cha) |
| TC-P1-02 [C] | I | Seed DB isolated bộ dữ liệu V3 chuẩn (1 class, 2 ClassSession, 1 ClassMonthPlan frozen, 1 ClassMonthPlanRevision, 1 MonthlyFee, 2 MonthlyFeeLine, 1 MonthlyFeeLineRevision, attendance link session) → backup | File backup chứa đủ counts từng bảng = số row đã seed; AES-GCM verify-hash pass |
| TC-P1-03 [C] | I | Wipe DB → restore từ backup TC-P1-02 | Đủ row từng bảng; `attendance.class_session_id` resolve được; không FK violation |
| TC-P1-04 | I | Sau restore, thử `UPDATE monthly_fee_line_revisions SET reason='x'` và `UPDATE class_month_plan_revisions` | Cả hai RAISE (trigger immutability đã hoạt động trở lại) |
| TC-P1-05 | I | Restore từ backup format CŨ (thiếu 4 bảng) không có cờ cho phép | Fail rõ ràng với message hướng dẫn, DB không bị sửa một phần (transaction rollback toàn bộ) |
| TC-P1-06 | I | `reset-database.ts` trên DB isolated có dữ liệu V3 (đủ guard `RESET_CONFIRMATION` + localhost) | Chạy sạch, không FK violation, DB trống đúng manifest |
| TC-P1-07 | U | Backup với DB rỗng (0 row các bảng V3) | Không crash; counts = 0; restore lại được |
| TC-P1-08 | P | Production: `POST /api/backups` action `run` → `verify` | HTTP 200; verify pass; counts ClassSession/ClassMonthPlan > 0 (production có 25+ plans); KHÔNG chạy restore |

#### Phase 2 — Correctness tài chính (map: AUDV2-P2-01..08, F-02..F-05)

| TC | Loại | Mô tả / Input | Expected |
|----|------|---------------|----------|
| TC-P2-01 [C] | U | `confirm` fee có ≥1 MonthlyFeeLine | HTTP 409, error code trùng khớp code mà `pay.ts` trả cho aggregate-blocked |
| TC-P2-02 | U | `confirm` fee aggregate legacy (0 line), trạng thái hợp lệ | Confirm thành công như hành vi cũ |
| TC-P2-03 | U | `confirm` fee đã paid / đã cancel | Bị từ chối với error code hiện hành (không đổi hành vi cũ) |
| TC-P2-04 | U | `cancel` fee có lines (nếu P2-02 kết luận dính lỗ hổng) | Cùng pattern 409; nếu không dính → TC này = "kết luận đã kiểm tra" trong receipt |
| TC-P2-05 | U | `refreshMonthlyFeeAggregateFromLines`: 2 line paid có `paidAt` khác nhau | Aggregate `paidAt` = max của 2 giá trị |
| TC-P2-06 | U | Tất cả line paid nhưng không line nào có `paidAt` | Aggregate `paidAt` = null; structured warning `PAID_AT_MISSING_ON_LINES` được emit; consumers (workbench/reports) không crash với null |
| TC-P2-07 | U | Receipts filter `from=2026-08-01`: receipt tạo `2026-07-31T23:30` giờ VN (= `2026-07-31T16:30Z`) | Kết quả nhất quán với convention UTC đã chọn ở P2-05, và **giống nhau** bất kể `TZ` env của process test (chạy test 2 lần với `TZ=UTC` và `TZ=Asia/Ho_Chi_Minh` — kết quả phải identical) |
| TC-P2-08 | U | `parseMonthRange('2026-07')` | Trả `[2026-07-01T00:00:00Z, 2026-08-01T00:00:00Z)` half-open; record đúng nửa đêm mùng 1 tháng 8 UTC KHÔNG thuộc tháng 7 |
| TC-P2-09 | S | Trigger mới: `frozen→open` không thỏa điều kiện (theo kết luận P2-06) | RAISE exception |
| TC-P2-10 | S | `open→frozen` với revision +1 | PASS |
| TC-P2-11 | S | Bất kỳ state change với revision không tăng | RAISE (giữ hành vi strict-increment hiện tại) |
| TC-P2-12 | P | Production: probe `confirm` fee-with-lines bằng dữ liệu test read-safe hoặc local mutation smoke | 409 đúng code; receipts filter biên tháng trả kết quả đúng |

#### Phase 3 — Frontend UX (map: AUDV2-P3-01..10, F-07..F-14)

| TC | Loại | Mô tả / Input | Expected |
|----|------|---------------|----------|
| TC-P3-01 [C] | E | Login → kiểm tra sidebar | Item "Phiếu thu" hiện trong nhóm tài chính, click điều hướng `/receipts`, trang load không lỗi console |
| TC-P3-02 | E | Menu-traversal spec hiện có (22+ routes) | Pass với item mới; số item khớp nếu spec đếm |
| TC-P3-03 | E/U | HistoryPage: set from/to → kiểm tra request | Request chứa đúng query `from`/`to`; bảng + summary totals chỉ tính trên tập đã lọc; clear filter → về đủ dữ liệu |
| TC-P3-04 | G | Grep `frontend/src` pattern mojibake (`Ã`, `á»`, `Ä'`) và pattern không dấu (`Dang `, `Khong `, `Luu `, `Vui long`) trong string literal UI | 0 kết quả còn sót (whitelist các từ hợp lệ không dấu nếu có, ghi rõ trong receipt) |
| TC-P3-05 | E | Mock API 500 cho Receipts/Payments/History (route interception) | Banner `role="alert"` hiện với message tiếng Việt có dấu + nút "Thử lại"; click retry với API phục hồi → bảng load; KHÔNG hiển thị empty-state im lặng |
| TC-P3-06 | E | Bulk delete ở Receipts/Payments | `ConfirmModal` mở (không phải native dialog — assert `page.on('dialog')` KHÔNG fire); confirm → xóa; cancel → không xóa |
| TC-P3-07 | E | Flow đối soát: mở modal lý do | Textarea bắt buộc; submit rỗng/quá ngắn bị chặn client-side khớp min length backend; submit hợp lệ gọi `receipts/:id/correct` |
| TC-P3-08 | G | Grep từng method đã xóa khỏi `api.js` + import `AttendanceReviewModal` bản root | 0 tham chiếu; build pass |
| TC-P3-09 | U/E | Reconciliation: localStorage checkpoint tồn tại với batch đã `completed` → mount trang | Poll `GET bulkPayStatus`, KHÔNG re-POST `bulkPay` (assert số request POST = 0); batch `processing` → tiếp tục đúng thiết kế |
| TC-P3-10 | P | Production Chrome: `/receipts` từ menu, History filter, FeeCollection render | 0 console error; 0 failed request; không còn chuỗi lỗi font trên màn hình |

#### Phase 4 — Test & validation hardening (map: AUDV2-P4-01..07, F-15..F-18)

| TC | Loại | Mô tả / Input | Expected |
|----|------|---------------|----------|
| TC-P4-01 [C] | E | Full attendance lifecycle trên local smoke: setup class 2 students → đánh điểm danh → Lưu → submit → approve → lock-preflight → lock | Mỗi bước UI phản hồi đúng; sau lock: Fee Workbench có class line đúng số buổi × đơn giá; 0 console error; 0 API 500 |
| TC-P4-02 | E | Từ trạng thái locked → reopen-for-correction | Period về trạng thái mở; fee line mutable được refresh; line paid/protected KHÔNG bị mutate (assert giá trị trước/sau) |
| TC-P4-03 [C] | E | Bulk-pay 2 line (cash) | 2 receipt sinh ra; print queue modal đủ 2 phiếu; fee line chuyển `paid` |
| TC-P4-04 [C] | I | Re-POST `bulk-pay` với CÙNG `Idempotency-Key` + cùng payload | Không receipt trùng; response trả batch completed; tổng receipt không đổi |
| TC-P4-05 | I | Re-POST cùng key nhưng payload KHÁC (hash mismatch) | Bị từ chối với error code hợp lệ (không silent-accept) |
| TC-P4-06 | E | Reload trang giữa bulk-pay (checkpoint localStorage còn) | Reconciliation on-mount hiển thị đúng trạng thái; không double-charge (đếm receipt trước/sau reload bằng nhau) |
| TC-P4-07 | U | 5 handler zod: gửi payload thiếu field bắt buộc / sai type / giá trị âm cho amount / month sai format (`2026-13`) | Tất cả trả `VALIDATION_ERROR` envelope chuẩn, HTTP 400, không chạm DB |
| TC-P4-08 | U | 5 handler zod: gửi ĐÚNG payload snapshot từ frontend hiện tại (capture từ E2E TC-P4-01/03) | Chấp nhận, hành vi y hệt trước khi thêm zod (contract không vỡ) |
| TC-P4-09 | U | `pay.ts` với raw string body `"cash"` | `VALIDATION_ERROR` (nhánh raw-string đã bỏ) |
| TC-P4-10 | U | Users/Payments mutations với token receptionist | 403 tất cả; với admin → thành công |
| TC-P4-11 | U | Parent-portal: login sai DOB → 401; login đúng → token; `me` với session đã revoke → 401; logout → session revoked trong DB |
| TC-P4-12 | U | Templates: CRUD + set-default + upload-image với base64 không hợp lệ / quá size | Mutation admin-only; upload sai bị từ chối có message |
| TC-P4-13 | U | Router audit: mutation với token revoked-chưa-hết-hạn | Activity log KHÔNG ghi user đó (anonymous/rejected); mutation hợp lệ vẫn được ghi đúng user |
| TC-P4-14 | P | Production probe: gửi payload sai tới 1 endpoint zod mới (read-safe) | `VALIDATION_ERROR` 400 — xác nhận deploy đúng |

#### Phase 5 — Docs, schema, operational (map: AUDV2-P5-01..08, F-06, F-21, F-23)

| TC | Loại | Mô tả / Input | Expected |
|----|------|---------------|----------|
| TC-P5-01 | G | Grep `PROJECT_CONTEXT.md`, `.shared/`, `docs/`: `Supabase`, `edu-manager-delta`, `React 18`, connection-string fragment | 0 kết quả (hoặc chỉ trong file lịch sử được whitelist rõ trong receipt) |
| TC-P5-02 | U | Unit drift test `docs/API.md` vs `api/router.ts` (đã có sẵn) | Pass |
| TC-P5-03 | I | `npx prisma migrate status` sau deploy migration hygiene | Clean, không pending/failed |
| TC-P5-04 | S | `EXPLAIN` 1 query đại diện dùng index mới (ví dụ lookup `activity_logs` theo entity) | Query plan dùng index scan (spot check, ghi output vào receipt) |
| TC-P5-05 | P | Sau rotate (khi được duyệt): login password cũ | 401 |
| TC-P5-06 | P | Sau rotate: login password mới → dùng token cũ (ký bằng secret cũ) gọi `/auth/me` | Login mới 200; token cũ 401 |
| TC-P5-07 | P | Sau rotate: cron không secret / secret mới | 403 / 200 |
| TC-P5-08 | G | Receipt closeout + KANBAN section AUDIT-V2 | Mọi AUDV2-* có trạng thái + link bằng chứng; không todo nào thiếu |

### V.3 — Metrics & Gates (ngưỡng đo lường)

> **Blocking** = fail là dừng phase / rollback deploy. **Warning** = ghi nhận, không chặn, nhưng phải nêu trong receipt.

| # | Metric | Baseline hiện tại | Ngưỡng đạt | Loại | Đo bằng |
|---|--------|-------------------|-----------|------|---------|
| M-01 | Root unit tests pass | 496/496 tại closeout | 100% pass, số lượng KHÔNG GIẢM | Blocking | `npm run test:unit` |
| M-02 | Frontend unit tests pass | 42/42 tại closeout | 100% pass, không giảm | Blocking | `npm --prefix frontend run test:unit` |
| M-03 | TypeScript errors | 0 | 0 | Blocking | `npx tsc --noEmit` |
| M-04 | ESLint warnings (frontend) | 0 | 0 | Blocking | `lint -- --max-warnings=0` |
| M-05 | E2E stability | — | 2 lần chạy liên tiếp sạch cho spec mới/sửa; flake = 0 | Blocking | LOOP-3 |
| M-06 | Test case coverage của phase | — | 100% TC trong catalog V.2 của phase có kết quả PASS (hoặc lý do skip được duyệt ghi trong receipt) | Blocking | Checklist receipt |
| M-07 | Money-path negative coverage | một phần | Mỗi endpoint money-moving bị sửa có ≥1 test negative (bị chặn đúng) + ≥1 positive (hành vi cũ giữ nguyên) | Blocking | Review test files |
| M-08 | Production console errors (smoke routes) | 0 | 0 | Blocking | Chrome/Playwright smoke |
| M-09 | Production API 5xx trong smoke | 0 | 0 | Blocking | Playwright + Vercel logs |
| M-10 | Production failed requests (UI smoke) | 0 | 0 | Blocking | Playwright network capture |
| M-11 | `prisma migrate status` | clean | clean sau mỗi migration | Blocking | CLI |
| M-12 | npm audit high (root + frontend) | 0 | 0 | Blocking | `npm audit` |
| M-13 | Protected finance fingerprint | `58ab3cae...` (30 rows, baseline 2026-07-14) | Không đổi qua mọi phase (trừ khi có correction được duyệt riêng) | Blocking | Script fingerprint sẵn có |
| M-14 | Perf-lab route p95 | ~6372ms (cold-start dominated) | Không tệ hơn baseline >20% | Warning | `npm run perf:lab` |
| M-15 | Bundle size frontend | baseline build hiện tại | Không tăng >10% (Phase 3 xóa dead code — kỳ vọng giảm) | Warning | So sánh output `npm run build` |
| M-16 | Số iteration LOOP-2 mỗi phase | — | ≤3 (3 strikes) | Blocking (escalate) | Đếm trong receipt |
| M-17 | Coverage traceability | — | 100% F-01..F-18 có ít nhất 1 TC PASS map tới (F-19..F-24 thuộc backlog/hoãn — không tính) | Blocking ở closeout | Ma trận V.4 |

**Quy tắc rollback (gắn LOOP-4):** sau deploy, nếu bất kỳ M-08/M-09/M-10 fail → rollback alias về deployment trước (đã ghi dpl_ id) trong vòng 15 phút, RCA trước khi deploy lại. Migration DB không rollback tự động — migration trong plan này đều additive/trigger-replace, phương án lùi là re-apply trigger cũ (file SQL cũ còn trong repo).

### V.4 — Ma trận truy vết (Finding → Todo → Test Case)

| Finding | Todo | Test cases | Metric gate |
|---------|------|-----------|-------------|
| F-01 backup thiếu V3 | P1-01..04 | TC-P1-01..08 | M-01, M-06, M-13 |
| F-02 confirm bỏ check | P2-01, P2-02 | TC-P2-01..04, TC-P2-12 | M-07 |
| F-03 fabricate paidAt | P2-03 | TC-P2-05, TC-P2-06 | M-07 |
| F-04 lệch timezone | P2-04, P2-05 | TC-P2-07, TC-P2-08 | M-01 |
| F-05 frozen→open | P2-06, P2-07 | TC-P2-09..11 | M-11 |
| F-06 credentials | P5-06 | TC-P5-05..07 | M-08..M-10 |
| F-07 receipts orphan | P3-01 | TC-P3-01, TC-P3-02 | M-05 |
| F-08 history filter chết | P3-02 | TC-P3-03 | M-05 |
| F-09/F-10 mojibake/không dấu | P3-03, P3-04 | TC-P3-04, TC-P3-10 | M-04 |
| F-11 nuốt lỗi im lặng | P3-05 | TC-P3-05 | M-05 |
| F-12 native confirm | P3-06 | TC-P3-06, TC-P3-07 | M-05 |
| F-13 dead code | P3-07, P3-08 | TC-P3-08 | M-15 |
| F-14 reconciliation re-POST | P3-09 | TC-P3-09, TC-P4-06 | M-05 |
| F-15 audit attribution | P4-06 | TC-P4-13 | M-01 |
| F-16 thiếu E2E core flows | P4-01, P4-02 | TC-P4-01..06 | M-05, M-06 |
| F-17 thiếu zod | P4-03, P4-04 | TC-P4-07..09, TC-P4-14 | M-07 |
| F-18 thiếu test admin CRUD | P4-05 | TC-P4-10..12 | M-01 |
| F-21 thiếu index | P5-05 | TC-P5-03, TC-P5-04 | M-11 |
| F-23 docs drift | P5-01..04 | TC-P5-01, TC-P5-02 | M-06 |

> F-19, F-20, F-22, F-24 thuộc backlog hoãn (Phần VI) — không có TC trong đợt này, đã ghi lý do hoãn.

### V.5 — Quy tắc ghi nhận bằng chứng test

1. Mỗi phase có 1 receipt; trong receipt có bảng kết quả TC: `TC-ID | PASS/FAIL/SKIP | bằng chứng (output/screenshot/commit) | ghi chú`.
2. TC nào SKIP phải có lý do và được liệt kê trong mục "Boundary" của receipt — không được im lặng bỏ qua.
3. E2E chạy 2 lần (LOOP-3): ghi cả 2 kết quả.
4. Metric M-01..M-17 chốt số cuối phase vào receipt (số test, số iteration LOOP-2, fingerprint...).
5. Không claim "done" cho phase khi M-06 (100% TC có kết quả) và M-17 (truy vết đủ) chưa đạt — đúng Rule "No done without evidence".

---

## PHẦN VI — CÁC MỤC HOÃN (backlog, không thuộc plan này)

| Mục | Lý do hoãn |
|-----|-----------|
| Float→Decimal cho cột tiền (F-19) | Migration data rủi ro cao trên production; VND nguyên nên rủi ro thực tế thấp. Cần plan riêng + phê duyệt. |
| Exclusion constraint EnrollmentPeriod (F-20) | Cần verify Neon hỗ trợ `btree_gist`; app-level guard đang hoạt động. |
| Zod cho ~40 handler CRUD còn lại (F-17) | Incremental, rủi ro thấp, làm dần theo module khi có thay đổi. |
| Bulk progress grid, Student Progress Phase 2, `.xlsx` import, Figma expansion | Backlog sản phẩm (đã ghi trong KANBAN), không phải lỗi. |
| Kanban API cho production (F-24) | Dev tooling, chủ đích không port. |
