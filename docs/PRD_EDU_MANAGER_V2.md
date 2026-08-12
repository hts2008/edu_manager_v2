# PRD — Edu Manager V2 (Comprehensive)

> **Tài liệu mô tả sản phẩm toàn diện** — góc nhìn business + góc nhìn kỹ thuật.
> Mục đích: cung cấp nguồn duy nhất cho mọi stakeholder (sáng lập, dev, sale, ops) hiểu sản phẩm là gì, vì sao tồn tại, hoạt động ra sao và đi tới đâu.
> Tài liệu này được biên soạn lại từ codebase + các báo cáo phụ trợ (`PRD_CURRENT_STATE.md`, `PRD_KANBAN_SOLUTION.md`).

| Trường | Giá trị |
|---|---|
| Sản phẩm | Edu Manager V2 |
| Mã sản phẩm | EDU-MGR-V2 |
| Phiên bản tài liệu | 1.0 |
| Ngày lập | 2026-04-26 |
| Loại tài liệu | PRD toàn diện (foundational) |
| Audience | Sáng lập, Product Manager, Engineering Lead, Designer, Sales/CS, Investor |
| Ngôn ngữ | Tiếng Việt (technical terms English) |
| Repository | https://github.com/hts2008/edu_manager_v2 |
| Production | https://edu-manager-delta.vercel.app |
| Trạng thái sản phẩm | v2.0 — Live (~50–60% production-ready) |

---

## Mục lục

**Phần I — Tổng quan & Định vị**
1. [Tóm tắt điều hành](#1-tóm-tắt-điều-hành)
2. [Bài toán nền tảng (Problem Statement)](#2-bài-toán-nền-tảng-problem-statement)
3. [Vision, Mission & Tagline](#3-vision-mission--tagline)

**Phần II — Góc nhìn Business**
4. [Phân tích thị trường](#4-phân-tích-thị-trường)
5. [Personas chi tiết](#5-personas-chi-tiết)
6. [Jobs-To-Be-Done (JTBD)](#6-jobs-to-be-done-jtbd)
7. [Value Proposition](#7-value-proposition)
8. [Phân tích cạnh tranh](#8-phân-tích-cạnh-tranh)
9. [Business model & Monetization](#9-business-model--monetization)
10. [Go-to-Market](#10-go-to-market)
11. [KPIs & Metrics](#11-kpis--metrics)
12. [ROI cho khách hàng](#12-roi-cho-khách-hàng)

**Phần III — Đặc tả Sản phẩm (Functional)**
13. [Feature Map tổng thể](#13-feature-map-tổng-thể)
14. [Use Cases chi tiết](#14-use-cases-chi-tiết)
15. [User Flows](#15-user-flows)
16. [Functional Requirements theo module](#16-functional-requirements-theo-module)
17. [Edge cases & Error handling](#17-edge-cases--error-handling)

**Phần IV — Góc nhìn Dev (Technical)**
18. [Kiến trúc tổng thể](#18-kiến-trúc-tổng-thể)
19. [Tech stack & Lý do chọn](#19-tech-stack--lý-do-chọn)
20. [Module breakdown — Frontend](#20-module-breakdown--frontend)
21. [Module breakdown — Backend](#21-module-breakdown--backend)
22. [Data model deep-dive](#22-data-model-deep-dive)
23. [API design patterns](#23-api-design-patterns)
24. [Authentication & Authorization](#24-authentication--authorization)
25. [Data flow diagrams](#25-data-flow-diagrams)
26. [Integration patterns](#26-integration-patterns)
27. [Security architecture](#27-security-architecture)
28. [Performance & Scalability](#28-performance--scalability)
29. [Deployment & DevOps](#29-deployment--devops)
30. [Local development setup](#30-local-development-setup)
31. [Code organization & Conventions](#31-code-organization--conventions)
32. [Multi-agent dev framework](#32-multi-agent-dev-framework)

**Phần V — Quality & Operations**
33. [NFR matrix](#33-nfr-matrix)
34. [Testing strategy](#34-testing-strategy)
35. [Monitoring & Observability](#35-monitoring--observability)
36. [Backup & Disaster Recovery](#36-backup--disaster-recovery)
37. [Compliance & Privacy](#37-compliance--privacy)

# Phần I — Tổng quan & Định vị

## 1. Tóm tắt điều hành

**Edu Manager V2** là một SaaS web app (Single Page Application) tiếng Việt phục vụ **trung tâm dạy thêm / dạy phụ đạo** quy mô vừa và nhỏ tại Việt Nam (50–500 học sinh). Sản phẩm số hoá toàn bộ vận hành hằng ngày: quản lý hồ sơ học sinh / phụ huynh / giáo viên / lớp học, điểm danh từng buổi học, tính học phí tự động dựa trên buổi tham dự, lập biên lai thu/chi với mẫu in tuỳ biến (Fabric.js canvas designer), và báo cáo tài chính.

Sản phẩm hướng tới việc **thay thế Excel + sổ giấy** chứ không phải cạnh tranh với hệ thống quản lý trường học toàn diện (LMS hoặc SIS đầy đủ). Đặc trưng quan trọng nhất là **workflow điểm danh kiểu SAP timesheet** (Open → Submitted → Approved → Locked) đảm bảo dữ liệu điểm danh không bị sửa sau khi đã chốt, và **lifecycle học phí 4 trạng thái** (pending → ready → confirmed → paid) cho phép tính phí dần và xác nhận trước khi thu tiền.

Về kỹ thuật, sản phẩm xây dựng trên **React 18 + Vite + Tailwind CSS v4** ở phía frontend, với kiến trúc backend kép: **Express + SQLite** cho local development và **Vercel Serverless TypeScript + Prisma + Supabase PostgreSQL** cho production. Schema 14 entity, ~70+ API endpoint, JWT-based auth với role-based access (admin / receptionist).

**Trạng thái thực tế (April 2026):** Production live tại `edu-manager-delta.vercel.app` nhưng chỉ ~50–60% feature-complete do drift giữa hai backend (Vercel thiếu ~1820 LOC so với Express). Kế hoạch khắc phục chi tiết tại `PRD_KANBAN_SOLUTION.md`.

---

## 2. Bài toán nền tảng (Problem Statement)

### 2.1. Bối cảnh thị trường

Tại Việt Nam, mảng dạy thêm là một thị trường lớn nhưng phân tán:

- **Quy mô:** Hầu hết các thành phố lớn có hàng ngàn trung tâm dạy thêm Toán / Lý / Hoá / Tiếng Anh / IELTS / Tin học / Năng khiếu. Quy mô điển hình: 1 chủ + 1–3 lễ tân + 5–20 giáo viên cộng tác + 50–500 học sinh.
- **Vận hành thủ công:** 80%+ trung tâm vẫn dùng **Excel** (cho điểm danh, học phí, danh sách học sinh) và **sổ giấy** (cho biên lai, lịch học). Một số dùng app chat (Zalo) làm "database" liên lạc với phụ huynh.
- **Phần mềm chuyên dụng hạn chế:** Có một số phần mềm quản lý trường học (Misa SME, OneSchool, Vietschool) nhưng đa phần thiết kế cho trường công / tư có quy mô lớn, license đắt và overkill cho trung tâm nhỏ.

### 2.2. Pain points của khách hàng

Dưới góc nhìn **chủ trung tâm:**
- Không nắm thực-thời doanh thu / nợ phí / chi phí lương; phải đợi cuối tháng tổng kết Excel.
- Khó truy vết khi phụ huynh thắc mắc về số tiền học phí (tại sao tháng này đóng nhiều hơn tháng trước?).
- Lo ngại lễ tân ghi sót buổi học hoặc tính sai học phí.
- Mỗi lần nhân sự thay đổi, kiến thức quản lý "bay" theo lễ tân cũ.

Dưới góc nhìn **lễ tân:**
- Tính học phí thủ công khi học sinh học bù / nghỉ có lý do — dễ nhầm.
- Áp lực in biên lai nhanh trong giờ cao điểm phụ huynh đến đón con.
- Phải giữ nhiều file Excel: danh sách học sinh, danh sách lớp, sổ điểm danh, sổ thu chi, sổ lương — dễ nhầm version.
- Khó tìm lại biên lai cũ khi phụ huynh hỏi lại sau 2–3 tháng.

Dưới góc nhìn **phụ huynh:**
- Nhận biên lai viết tay khó đọc, không có logo / format chuyên nghiệp.
- Không biết con đi học hay nghỉ những buổi nào (trừ khi gọi điện hỏi).
- Không biết số dư công nợ / tháng nào đã đóng.

### 2.3. Vì sao Excel không đủ

| Hạn chế của Excel | Hậu quả |
|---|---|
| Không quan hệ ràng buộc | Một học sinh có thể bị enroll trùng / sai class |
| Không có audit log | Sai sót khó truy vết người gây ra |
| Tính học phí bằng công thức cứng | Lớp có lịch không đều phải tính tay |
| Không gen được PDF chuyên nghiệp | Biên lai không có logo / MST |
| Đa người cùng sửa → conflict | Lễ tân ca sáng & ca chiều dễ ghi đè |
| Không có workflow approval | Chốt điểm danh không có bước duyệt |
| Khó báo cáo tổng hợp | Cuối tháng tốn 2–4 giờ tổng kết |

### 2.4. Cơ hội thị trường

- **TAM (Total Addressable Market):** Việt Nam ước có 30,000+ trung tâm dạy thêm (con số ước lượng dựa trên quy hoạch ngành giáo dục bổ trợ).
- **SAM (Serviceable Addressable Market):** Các trung tâm có ≥ 50 học sinh, chấp nhận chi tiền cho phần mềm — ước 5,000–10,000.
- **SOM (Serviceable Obtainable Market):** Trong 2 năm đầu, mục tiêu 100–300 trung tâm khách hàng (giả định cho chiến lược product-led growth).

---

## 3. Vision, Mission & Tagline

### 3.1. Vision (5–10 năm)
> *"Trở thành hệ điều hành số cho mọi trung tâm giáo dục bổ trợ tại Đông Nam Á — nơi việc vận hành trung tâm trở nên minh bạch, chuyên nghiệp và không tốn quá 30 phút mỗi ngày cho công việc hành chính."*

### 3.2. Mission (1–3 năm)
> *"Cung cấp công cụ một-cửa để chủ trung tâm dạy thêm Việt Nam thay thế Excel + sổ giấy bằng một SaaS dễ dùng, an toàn, có giá hợp lý — tiết kiệm cho mỗi trung tâm 10+ giờ thao tác hành chính mỗi tuần và loại bỏ 100% sai sót khi tính học phí."*

### 3.3. Tagline (cho marketing)
- Long: *"Edu Manager — Quản lý trung tâm dạy thêm thông minh, từ điểm danh đến biên lai."*
- Short: *"Trung tâm trong tay bạn."*
- One-liner: *"Edu Manager là phần mềm quản lý trung tâm dạy thêm giúp lễ tân làm việc nhanh hơn 5 lần và giúp chủ trung tâm thấy được số liệu kinh doanh trong realtime."*

### 3.4. Nguyên tắc thiết kế sản phẩm (Product Principles)

1. **Vietnamese-first.** Mọi UI, format, terminology đều thuần Việt — không dịch máy từ phần mềm Tây.
2. **Receptionist-first.** Lễ tân là user dùng nhiều nhất; tối ưu cho người dùng trong giờ cao điểm.
3. **Speed over feature richness.** Thà ít tính năng nhưng mỗi click < 200ms còn hơn nhiều tính năng nhưng chậm.
4. **Print quality matters.** Biên lai PDF phải đẹp ngang tờ in chuyên nghiệp; là điểm chạm tin cậy với phụ huynh.
5. **Audit by default.** Mọi mutation đều phải lưu vết — chủ trung tâm có thể truy vấn bất cứ lúc nào.
6. **No data lock-in.** Khách hàng có thể export Excel toàn bộ dữ liệu bất cứ lúc nào (tránh perception "bị giam" trong SaaS).
7. **Mobile in mind.** Dù v2 chưa có app, UI phải đáp ứng tablet và phone web.
8. **Explainable pricing.** Tính học phí phải minh bạch — phụ huynh hỏi luôn trả lời được "vì sao tháng này X đồng".

---

# Phần II — Góc nhìn Business

## 4. Phân tích thị trường

### 4.1. Phân khúc khách hàng (Customer Segmentation)

| Phân khúc | Quy mô | Đặc điểm | Mức độ phù hợp |
|---|---|---|---|
| **Trung tâm dạy thêm môn học phổ thông** (Toán, Lý, Hoá, Văn) | 50–500 HS | Đa phần nhận học sinh THCS/THPT, lớp 8–25 HS, 2–4 buổi/tuần | ⭐⭐⭐⭐⭐ Sweet spot |
| **Trung tâm Tiếng Anh / IELTS** | 100–800 HS | Nhiều ca học, nhiều giáo viên cộng tác, học phí cao hơn | ⭐⭐⭐⭐ Phù hợp; cần tính phí theo khoá |
| **Trung tâm năng khiếu** (Vẽ, đàn, võ, MC) | 30–200 HS | Lịch học không đều, nhiều buổi học bù | ⭐⭐⭐ Phù hợp; làm bù dễ nhầm |
| **Lớp gia sư cá nhân (1-1 / 1-3)** | < 20 HS | Quá nhỏ, không cần SaaS | ⭐ Không phù hợp |
| **Trường tư có quy mô lớn** | > 1000 HS | Đã dùng SIS chuyên dụng | ⭐⭐ Không phải target chính |
| **Trường công lập** | > 500 HS | Quy trình nhà nước, không cạnh tranh được | ⭐ Không phù hợp |

### 4.2. Phân khúc địa lý

- **Tier 1:** TP.HCM, Hà Nội — concentration cao nhất, nhưng cũng cạnh tranh nhất, khách hàng kén.
- **Tier 2:** Đà Nẵng, Cần Thơ, Hải Phòng, Nha Trang, Vũng Tàu, Bình Dương — sweet spot cho launch (ít lựa chọn, willing to try).
- **Tier 3:** Tỉnh nhỏ, thị xã — TAM lớn nhưng giáo dục số chưa phổ biến, sales khó.

### 4.3. Persona buyer vs. user

- **Buyer (người ra quyết định mua):** Chủ trung tâm. Đặc điểm: 35–55 tuổi, từng làm giáo viên hoặc kinh doanh, không phải dân kỹ thuật, ưa các giải pháp "chỉ cần làm được việc".
- **User (người dùng hằng ngày):** Lễ tân. Đặc điểm: 22–35 tuổi, dùng máy tính tốt, đa phần là cử nhân vừa tốt nghiệp đang làm tạm.
- **Influencer:** Giáo viên trưởng (nếu có), tham vấn cho chủ trung tâm khi quyết định mua.

### 4.4. Các yếu tố đặc thù VN

- **Tiếng Việt là bắt buộc.** Phụ huynh không nói tiếng Anh; biên lai phải hoàn toàn tiếng Việt.
- **Đơn vị tiền:** VND, dấu chấm thay phẩy phân cách nghìn ("1.234.567đ").
- **Format ngày:** DD/MM/YYYY.
- **Họ tên đầy đủ:** Nguyễn Văn A (3 từ trở lên), không phân biệt First/Last name.
- **SĐT:** 10 số, prefix `0` hoặc `+84`.
- **Mã số thuế:** Trung tâm có MST cần in trên biên lai (10–13 số).
- **Phương thức thanh toán phổ biến:** Tiền mặt (chiếm ~60%), chuyển khoản (~40%); chưa nhiều trung tâm dùng cổng thanh toán online.
- **Ngày lễ:** 30/4, 1/5, 2/9, Tết Nguyên đán — ảnh hưởng calculate-fee.
- **Tâm lý đóng phí:** Phụ huynh thường đóng đầu tháng; trung tâm cần có UI hiển thị danh sách "chưa đóng" để theo dõi.

---

## 5. Personas chi tiết

### 5.1. Persona Primary — Chị Thu (Lễ tân)

**Demographics:**
- Tuổi: 26
- Vị trí: TP.HCM
- Học vấn: Cử nhân Kinh tế
- Thu nhập: 8–12 triệu / tháng
- Tech savviness: Khá (dùng Excel, Zalo, Google Drive thành thạo; chưa biết phần mềm chuyên dụng)

**Bối cảnh công việc:**
- Làm lễ tân cho 1 trung tâm Toán-Lý-Hoá có 180 học sinh, 8 lớp.
- Ca làm: 14:00–21:30 (giờ cao điểm phụ huynh đến đón).
- Trách nhiệm: tiếp đón, điểm danh, thu học phí, in biên lai, phối hợp giáo viên.

**Pain points:**
- 19:30 cao điểm 5–7 phụ huynh đến cùng lúc đóng tiền — Excel chậm.
- Tính học phí cho học sinh học 1 buổi rồi nghỉ 2 buổi — phải bấm máy tính tay.
- Phụ huynh hỏi "tháng trước con tôi đóng bao nhiêu?" → mất 2 phút lục Excel.
- Cuối tháng phải gửi báo cáo cho chủ trung tâm — 2 giờ tổng hợp.
- Đôi khi điểm danh sót buổi → cuối tháng giáo viên phản ánh → phải sửa Excel.

**Mục tiêu:**
- Thao tác nhanh, không bị phụ huynh đợi.
- Không bị mắng khi nhầm số liệu.
- Cuối tháng được về sớm.
- Báo cáo cho chủ trung tâm chỉ cần 1 click.

**Trang dùng nhiều nhất:** Students, Attendance, Fee Collection, Receipts, History (60–80% time).

**Quote tiêu biểu:**
> *"Em không cần app fancy, em chỉ cần in biên lai nhanh và không nhầm tiền."*

### 5.2. Persona Buyer — Anh Hùng (Chủ trung tâm)

**Demographics:**
- Tuổi: 42
- Vị trí: Đà Nẵng
- Học vấn: Thạc sĩ Toán, từng giảng viên Đại học
- Thu nhập: 30–80 triệu / tháng (tuỳ doanh thu trung tâm)
- Tech savviness: Trung bình (dùng Zalo, Facebook, Excel cơ bản; không tự cài phần mềm)

**Bối cảnh kinh doanh:**
- Mở trung tâm dạy Toán THPT 5 năm, có 250 học sinh, 12 giáo viên, 2 lễ tân, 2 cơ sở.
- Dạy 6h/tuần; còn lại điều hành kinh doanh.

**Pain points:**
- Không biết doanh thu thực ngày hôm nay là bao nhiêu — phải đợi lễ tân tổng kết tối.
- Lo ngại lễ tân thu tiền không khớp số ghi sổ.
- Lương giáo viên cộng tác tính theo giờ — dễ tranh chấp khi đối soát.
- Khó so sánh hiệu quả giữa 2 cơ sở.
- Khi mở rộng cơ sở mới, không scale được vận hành.

**Mục tiêu:**
- Realtime dashboard doanh thu / chi phí.
- Không phụ thuộc 1 lễ tân duy nhất (nếu nghỉ có người thay thế ngay).
- Có dữ liệu lịch sử để ra quyết định mở lớp / tăng học phí.
- Báo cáo chuyên nghiệp khi cần huy động vốn / mở rộng.

**Trang dùng nhiều nhất:** Dashboard, Reports, Payments (duyệt lương) (10–20% time).

**Quote:**
> *"Tôi cần biết tối nay tôi kiếm được bao nhiêu. Không phải đợi đến cuối tháng."*

### 5.3. Persona Indirect — Chị Mai (Phụ huynh)

**Demographics:**
- Tuổi: 38, có con học lớp 9
- Vị trí: Thuận An, Bình Dương
- Tech: Dùng Zalo, Facebook tốt; ít dùng email

**Quan tâm:**
- Con đi học có đầy đủ không (đi học hay trốn học đi chơi).
- Tháng này đóng bao nhiêu, vì sao.
- Có biên lai có MST để công ty hoàn ứng (nếu trung tâm có MST).

**Tương tác hiện tại với sản phẩm:** Gián tiếp — nhận PDF biên lai qua Zalo từ lễ tân. **Phase C** sẽ có Parent Portal để Mai tự đăng nhập xem.

### 5.4. Persona Future — Thầy Bình (Giáo viên cộng tác)

**Hiện tại:** Chỉ là entity trong DB, không có account.
**Tương lai (Phase D):** Có thể có tài khoản giáo viên để xem lớp được phân công, tự điểm danh, xem lương dự kiến.

---

## 6. Jobs-To-Be-Done (JTBD)

Áp dụng framework JTBD của Clayton Christensen. Mỗi job có format `Khi tôi __, tôi muốn __, để tôi có thể __`.

### 6.1. Job của Lễ tân
| Tình huống | Mong muốn | Mục đích cuối |
|---|---|---|
| Khi đến lớp một học sinh lần đầu | tôi muốn nhập nhanh thông tin học sinh + phụ huynh | để học sinh có thể bắt đầu học ngay không phải đợi |
| Khi đến giờ học | tôi muốn điểm danh < 30 giây cho cả lớp | để giáo viên không phải đợi |
| Khi phụ huynh đến đóng phí | tôi muốn in biên lai < 1 phút | để không có hàng đợi |
| Khi học sinh học bù | tôi muốn ghi nhận buổi bù tách biệt buổi chính | để cuối tháng tính phí đúng |
| Khi cuối tháng | tôi muốn 1-click ra báo cáo | để gửi cho sếp về sớm |

### 6.2. Job của Chủ trung tâm
| Tình huống | Mong muốn | Mục đích cuối |
|---|---|---|
| Khi mở app buổi sáng | tôi muốn thấy ngay doanh thu + công nợ | để biết tình hình tài chính |
| Khi duyệt lương giáo viên | tôi muốn có audit trail từng buổi đã dạy | để không bị tranh chấp |
| Khi nghĩ tới mở chi nhánh | tôi muốn export toàn bộ dữ liệu cũ | để làm business case |
| Khi giáo viên hỏi lương tháng này | tôi muốn xem nhanh số tiết đã dạy | để trả lời ngay |
| Khi phụ huynh khiếu nại số tiền | tôi muốn truy ra biên lai cũ | để giải quyết minh bạch |

### 6.3. Job của Phụ huynh (Phase C)
| Tình huống | Mong muốn | Mục đích cuối |
|---|---|---|
| Khi muốn biết con đi học không | tôi muốn xem lịch sử điểm danh | để giám sát con |
| Khi muốn đóng phí | tôi muốn biết chính xác số tiền | để chuẩn bị tiền hoặc chuyển khoản |
| Khi cần biên lai cũ | tôi muốn tự download | để không phải nhờ lễ tân |

---

## 7. Value Proposition

### 7.1. Value Proposition Canvas

**Customer profile (Chủ trung tâm):**
- *Jobs:* Vận hành trung tâm, theo dõi tài chính, ra quyết định kinh doanh.
- *Pains:* Không có realtime data; sai sót Excel; không scale.
- *Gains:* Lợi nhuận tăng; uy tín với phụ huynh; mở rộng dễ.

**Value map (Edu Manager):**
- *Products & services:* SaaS web app + biên lai PDF + báo cáo realtime.
- *Pain relievers:*
  - Realtime dashboard → giải quyết "không có realtime data".
  - Schema có constraint + audit log → giải quyết "sai sót Excel".
  - Centralized cloud DB → giải quyết "không scale".
- *Gain creators:*
  - Biên lai chuyên nghiệp với template tuỳ biến → tăng uy tín.
  - Báo cáo financial chi tiết → ra quyết định tốt hơn.
  - Multi-cơ sở (Phase D) → mở rộng dễ.

### 7.2. Core value statement

**Lễ tân tiết kiệm 10+ giờ/tuần.** Thao tác điểm danh, tính học phí, in biên lai từ chỗ phải bấm máy tính + lục Excel + ghi sổ tay → một workflow liền mạch trong app.

**Chủ trung tâm có realtime visibility.** Mở Dashboard → biết ngay doanh thu hôm nay, chi phí tháng, công nợ phụ huynh, không phải đợi tổng kết.

**Phụ huynh được phục vụ chuyên nghiệp.** Biên lai PDF có logo + MST; giải đáp mọi thắc mắc về số tiền chỉ trong 30 giây.

### 7.3. Differentiator so với competitor

| Vs. Excel | Vs. Misa SME / OneSchool | Vs. Phần mềm tự xây |
|---|---|---|
| Có ràng buộc dữ liệu | Đơn giản hơn, focused vào trung tâm dạy thêm | Không cần thuê dev maintain |
| Có audit log | Giá hợp lý hơn | Có roadmap update đều |
| Có workflow approval | Tiếng Việt thuần | Có support |
| Gen PDF chuyên nghiệp | Format VN chuẩn | Có cộng đồng người dùng |
| Báo cáo realtime | Specialized cho trung tâm 50–500 HS | Tránh "BA factor" (Bus accident — dev nghỉ thì không ai biết maintain) |

---

## 8. Phân tích cạnh tranh

### 8.1. Competitor map (assumption-based)

| Competitor | Vị thế | Ưu điểm | Nhược điểm | Mức độ đe doạ |
|---|---|---|---|---|
| **Excel + Sổ giấy** | Status quo của 80% trung tâm | Quen thuộc, miễn phí | Không scale, không audit, không PDF | ⭐⭐⭐⭐⭐ Đối thủ lớn nhất |
| **Misa SME** | Phần mềm kế toán SME | Mạnh về kế toán, có MST | Overkill, không có điểm danh | ⭐⭐ |
| **OneSchool / Vietschool** | SIS toàn diện cho trường tư | Đầy đủ học vụ + tài chính | Quá lớn, đắt, không phù hợp trung tâm dạy thêm | ⭐⭐ |
| **TrungTâm365 / Edusoft (giả định tên)** | Phần mềm chuyên trung tâm dạy thêm | Cùng phân khúc | Có thể đã có thị phần | ⭐⭐⭐ |
| **Google Sheets + AppSheet** | DIY no-code | Linh hoạt, free tier | Phụ thuộc kỹ năng tự build | ⭐⭐ |
| **App Zalo OA + Bot** | Communication platform | Đã có sẵn user base | Không phải database management | ⭐⭐ |

### 8.2. Vị thế chiến lược của Edu Manager
**"Specialist tool for Vietnamese tutoring centers, mid-sized."**

Định vị giữa: không quá nhỏ như Excel + AppSheet (quá basic), không quá to như Misa / OneSchool (quá đắt). Sweet spot: trung tâm 50–500 HS muốn nâng cấp khỏi Excel nhưng không sẵn sàng bỏ 100tr cho phần mềm enterprise.

### 8.3. Moat tiềm năng
- **Domain expertise sâu** về workflow trung tâm dạy thêm VN (lịch học không đều, học bù, MST biên lai).
- **PDF template designer** — competitive feature, ít competitor có.
- **Schema được thiết kế kỹ** với workflow approval (SAP-style) — không phải DB phẳng như Excel.
- **Multi-agent dev framework** giúp scale dev team nhanh khi cần (không lock vào 1 dev).

---

## 9. Business model & Monetization

> ⚠️ **Lưu ý:** Phần này là **giả định mang tính tham khảo** — chưa được xác nhận bởi sáng lập. Codebase hiện tại chưa có cơ chế billing / subscription.

### 9.1. Mô hình kinh doanh đề xuất: SaaS Subscription

**Tier mặc định (cho Phase A–B):**

| Plan | Giá / tháng (VND) | Phù hợp | Limit |
|---|---|---|---|
| **Starter** | Miễn phí (freemium) | Trung tâm < 30 HS | 30 HS, 3 lớp, 1 user, không có template tuỳ biến |
| **Standard** | 199,000đ | Trung tâm 30–150 HS | 150 HS, 10 lớp, 3 user, đầy đủ template |
| **Pro** | 499,000đ | Trung tâm 150–500 HS | 500 HS, không giới hạn lớp, 10 user, parent portal (Phase C), SMS reminder (Phase C) |
| **Enterprise** | Custom | Chuỗi multi-cơ sở (Phase D) | Multi-tenant, custom domain, white-label, SSO |

### 9.2. Revenue assumptions (1 năm sau ra mắt thương mại)

Giả định:
- 100 trung tâm khách hàng trả phí.
- Phân bổ: 30% Starter (free), 50% Standard, 18% Pro, 2% Enterprise.
- Conversion free → paid: 30%.
- Churn rate: 5%/tháng (cao do thị trường nhạy giá).

**MRR (Monthly Recurring Revenue):**
- Standard: 50 × 199k = ~10 triệu
- Pro: 18 × 499k = ~9 triệu
- Enterprise: 2 × ~2tr = ~4 triệu
- **Total MRR ~23 triệu/tháng**, **ARR ~280 triệu/năm**.

(Đây là mức rất khiêm tốn cho năm đầu — nhằm validate product-market fit.)

### 9.3. Chi phí vận hành (giả định)
| Hạng mục | / tháng |
|---|---|
| Vercel Pro | $20 ~ 500k |
| Supabase Pro | $25 ~ 600k |
| Domain + email | 200k |
| Sentry / monitoring (Phase B) | 500k |
| Hosting backup (Phase C) | 300k |
| **Tổng infra** | **~ 2.1 triệu** |
| Phát triển (1 dev) | 25–35 triệu |
| Sales/Support (1 part-time) | 8–12 triệu |
| **Tổng nhân sự** | **~ 35–45 triệu** |
| **Total OpEx** | **~ 38–48 triệu** |

→ Cần MRR ≥ 50 triệu để break-even — tương đương ~250 trung tâm khách hàng. Roadmap đến 250 khách hàng: cần Phase C đầy đủ.

### 9.4. Mô hình mở rộng (Phase D)
- **Add-on payment processing fee** khi tích hợp VNPay/MoMo (1–2% mỗi giao dịch).
- **Add-on SMS** (200đ/SMS).
- **Marketplace** mẫu in cao cấp / template báo cáo.
- **White-label cho enterprise chuỗi.**

---

## 10. Go-to-Market

### 10.1. Launch strategy đề xuất

**Phase 1 (3 tháng đầu):** Closed beta với 5–10 trung tâm đối tác (Đà Nẵng + Vũng Tàu).
- Mục tiêu: validate product-market fit, thu feedback chi tiết.
- Giá: free, đổi lại testimonial + case study.

**Phase 2 (Tháng 4–9):** Open beta + freemium.
- Launch Starter free trên Facebook group "Chủ trung tâm dạy thêm Việt Nam".
- KOL nhỏ (chủ trung tâm uy tín trên FB) làm video review.
- Mục tiêu: 50 trung tâm active.

**Phase 3 (Tháng 10–18):** Sales-led + content marketing.
- SEO blog: "Cách tính học phí công bằng cho học sinh học bù", "Workflow điểm danh chuẩn cho trung tâm 100 HS"…
- Outbound: gửi demo deck cho danh sách trung tâm Tier 2 thành phố.
- Mục tiêu: 250 trung tâm active.

### 10.2. Channel strategy
1. **Facebook groups** — kênh chính giai đoạn đầu (chi phí thấp, target chính xác).
2. **Zalo OA** — re-engagement existing users.
3. **Google Ads** với từ khoá "phần mềm quản lý trung tâm dạy thêm".
4. **Referral program** — trung tâm cũ giới thiệu trung tâm mới được giảm 1 tháng.
5. **Partnership** với các tổ chức giáo viên (VAS, ETC,…).

### 10.3. Pricing experimentation
- A/B test: 199k vs 299k cho Standard plan.
- Test introductory pricing (149k cho 3 tháng đầu).
- Test annual upfront (giảm 20% nếu trả 1 năm).

---

## 11. KPIs & Metrics

### 11.1. North Star Metric đề xuất
**"Số biên lai PDF được tải xuống mỗi tuần"** (= proxy cho actual usage, không gameable, gắn với revenue của khách hàng).

### 11.2. Acquisition Metrics
- MAU (Monthly Active Users — trung tâm hoạt động).
- Free → Paid conversion rate.
- CAC (Customer Acquisition Cost).
- Lead → Demo → Paid funnel.

### 11.3. Activation Metrics
- Time-to-first-receipt-printed (mục tiêu: < 24h sau khi đăng ký).
- % trung tâm hoàn thành onboarding 5 bước (Tạo Class → Add Student → Mark Attendance → Calculate Fee → Issue Receipt).

### 11.4. Retention Metrics
- DAU/MAU ratio (mục tiêu: ≥ 0.4).
- Monthly churn rate (mục tiêu: ≤ 3%).
- Net Revenue Retention (mục tiêu: ≥ 100%).

### 11.5. Engagement Metrics
- Số receipt / week / center.
- Số attendance record / week / center.
- % center sử dụng template tuỳ biến.

### 11.6. Reliability Metrics (Tech)
- Uptime (mục tiêu: ≥ 99.5%).
- p95 API response time (mục tiêu: ≤ 500ms).
- Production error rate (mục tiêu: ≤ 0.1%).
- Lighthouse Performance score (mục tiêu: ≥ 80).

---

## 12. ROI cho khách hàng

### 12.1. Tính toán ROI cho trung tâm điển hình (150 HS, 1 lễ tân)

**Trước khi dùng Edu Manager (Excel + sổ giấy):**
- Lễ tân dùng ~12 giờ/tuần cho công việc hành chính (điểm danh + tính phí + in biên lai + báo cáo cuối tháng).
- Sai sót tính phí trung bình: 2–3 case/tháng × 100k = 200k–300k mất doanh thu.
- Phụ huynh khiếu nại trung bình 1–2/tháng → mất thiện cảm.
- Cuối tháng tổng kết: 4 giờ.

**Sau khi dùng Edu Manager (Standard plan 199k/tháng):**
- Thời gian hành chính giảm còn ~3 giờ/tuần (tiết kiệm 9h × 4 tuần = 36 giờ/tháng).
- Sai sót tính phí: gần 0 (hệ thống tính tự động từ attendance đã lock).
- Báo cáo cuối tháng: < 5 phút.

**Quy đổi:**
- 36 giờ × ~50k/giờ (lương lễ tân) = **1.8 triệu/tháng tiết kiệm**.
- Không mất 200k–300k doanh thu/tháng do tính sai phí.
- **Tổng giá trị: ~ 2 triệu/tháng** vs. **chi phí: 199k/tháng** → **ROI ~ 10x**.

### 12.2. ROI gián tiếp
- Phụ huynh hài lòng → tỷ lệ giữ chân học sinh tăng → doanh thu tăng.
- Chủ trung tâm có dữ liệu để ra quyết định mở lớp / tăng phí → tối ưu portfolio lớp.
- Lễ tân làm việc bớt căng thẳng → giảm turnover → giảm chi phí onboard nhân sự mới.

---

# Phần III — Đặc tả Sản phẩm (Functional)

## 13. Feature Map tổng thể

```
EDU MANAGER V2
│
├── 🔐 Auth & Identity
│   ├── Login (JWT)
│   ├── Logout
│   ├── Change password
│   └── Role-based access (admin / receptionist)
│
├── 📊 Dashboard
│   ├── 4 stat cards (HS active, lớp, doanh thu, chi phí)
│   ├── 4 quick actions
│   ├── Recent transactions widget
│   └── Unpaid students widget
│
├── 👥 Master Data
│   ├── Students (CRUD + search + filter + multi-class enrollment)
│   ├── Parents (CRUD + relationship type)
│   ├── Teachers (CRUD + salary type)
│   └── Classes (CRUD + flexible scheduling)
│
├── 📅 Attendance Management
│   ├── Daily mark attendance (4 trạng thái + make-up)
│   ├── Weekly timesheet view (SAP-style)
│   ├── Attendance Period workflow (open → submitted → approved → locked)
│   └── Calculate fee from attendance
│
├── 💰 Finance
│   ├── Monthly Fee lifecycle (pending → ready → confirmed → paid)
│   ├── Receipt (Phiếu thu) — create, list, PDF
│   ├── Payment (Phiếu chi) — create, list, PDF, 4 categories
│   ├── Fee Collection workflow (bulk-friendly)
│   └── History (unified Receipt+Payment view)
│
├── 🖨️ Templates & Printing
│   ├── Template CRUD (receipt / payment, 4 paper sizes)
│   ├── Fabric.js Canvas Designer (full-screen)
│   ├── Set default template per type
│   └── Image upload (Supabase Storage — pending)
│
├── 📈 Reporting
│   ├── Dashboard report (realtime stats)
│   ├── Financial report (date range, breakdown by category)
│   ├── Unpaid students report
│   └── Excel export
│
├── ⚙️ Settings (partial)
│   ├── Center Settings (name, address, MST, logo) — schema only
│   ├── User management — admin via DB only, no UI yet
│   └── Activity Log — schema only, no UI
│
└── 🛠️ Internal Tools
    ├── KANBAN dashboard (dashboard.html)
    ├── start.bat / stop.bat / backup.bat scripts (Windows)
    └── Multi-agent dev framework (.agent/, CLAUDE.md, GEMINI.md, COPILOT.md)
```

### 13.1. Feature priority matrix

| Tier | Features |
|---|---|
| **Tier 1 (Must-have)** | Auth, Master Data CRUD, Attendance, Calculate Fee, Receipt + PDF |
| **Tier 2 (Should-have)** | Attendance Period workflow, Monthly Fee lifecycle, Payment, History, Reports |
| **Tier 3 (Nice-to-have)** | Template Designer (Fabric.js), Excel export, Center Settings UI |
| **Tier 4 (Future)** | Parent Portal, SMS, Cron, Multi-tenant |

---

## 14. Use Cases chi tiết

### UC-01: Đăng ký học sinh mới và ghi danh vào lớp

**Actor:** Lễ tân.
**Pre-condition:** Lễ tân đã login; class đã tồn tại; parent có thể đã hoặc chưa tồn tại.

**Main flow:**
1. Lễ tân click "Phụ huynh" → "Thêm phụ huynh".
2. Nhập họ tên, SĐT, mối quan hệ (cha/mẹ/người giám hộ); click Save.
3. Lễ tân click "Học viên" → "Thêm học viên".
4. Nhập họ tên, ngày sinh, giới tính.
5. Chọn parent từ dropdown (search theo SĐT).
6. Tick các Class muốn enroll (multi-select có hiển thị `fee_per_day`).
7. Click Save.

**Post-condition:** Student record tạo, link tới Parent qua FK, tạo các bản ghi StudentClass tương ứng.

**Alternate flows:**
- A1. Parent đã tồn tại (trùng SĐT) → hệ thống thông báo "SĐT đã tồn tại"; lễ tân quay lại Học viên và tìm parent có sẵn.
- A2. Class đầy (đạt `max_students`) → hệ thống cảnh báo nhưng vẫn cho enroll (Phase B sẽ block).

**Error scenarios:**
- E1. SĐT không hợp lệ → form validation báo lỗi.
- E2. Network error → toast "Không thể kết nối" + retry.

### UC-02: Điểm danh tuần học

**Actor:** Lễ tân.
**Pre-condition:** Class có ít nhất 1 student enroll; AttendancePeriod cho (class, month) có thể đã hoặc chưa tồn tại.

**Main flow:**
1. Lễ tân vào Attendance, chọn class.
2. Calendar 3 tháng hiển thị; nếu chưa có period cho tháng hiện tại, hệ thống tự tạo `AttendancePeriod` ở status `open`.
3. Click vào tuần muốn điểm danh.
4. Grid timesheet xuất hiện: cột student × hàng ngày trong tuần.
5. Cho mỗi cell, click để cycle qua: empty → present → absent_with_fee → absent_no_fee → holiday.
6. Có thể click "Select All" cho 1 ngày để mark cả lớp present.
7. Click Save → bulk POST tới `/api/attendance/bulk`.

**Post-condition:** Các record Attendance được tạo / cập nhật.

**Alternate flows:**
- A1. Period đã `submitted` hoặc `approved` → cho xem nhưng không cho sửa (read-only mode).
- A2. Period đã `locked` → hoàn toàn không sửa được.
- A3. Học sinh học bù (make-up): Phase A chưa có UI dedicated; tạm dùng `isMakeUp = true` qua admin.

### UC-03: Chốt điểm danh tháng

**Actors:** Lễ tân (Submit) + Admin (Approve, Lock).
**Pre-condition:** Period đang ở `open`; ít nhất có 1 attendance record.

**Main flow:**
1. Cuối tháng, lễ tân vào Attendance, chọn class, click "Submit Period" → period chuyển `open` → `submitted`.
2. Admin vào "Chốt điểm danh", thấy period ở status `submitted`.
3. Admin click "Review" → modal hiển thị tổng kết: tổng buổi, present, absent_with_fee, absent_no_fee, holiday.
4. Admin click "Approve" → period chuyển `submitted` → `approved`.
5. Admin click "Lock" → period chuyển `approved` → `locked`. Sau bước này không sửa attendance được nữa.

**Post-condition:** Period ở `locked`; sẵn sàng cho calculate fee.

**Alternate flows:**
- A1. Admin click "Reject" với lý do → period quay về `open`; lễ tân sửa lại.
- A2. Sau khi locked, nếu phát hiện sai → admin click "Unlock" (audit log lại).

### UC-04: Thu học phí cho 1 học sinh trong tháng

**Actor:** Lễ tân.
**Pre-condition:** AttendancePeriod cho (student.class, month) đã ở status `locked`.

**Main flow:**
1. Lễ tân vào Fee Collection, chọn tháng hiện tại.
2. Hệ thống hiển thị danh sách HS với status:
   - `pending` — chưa tính
   - `ready` — đã tính từ attendance
   - `confirmed` — đã chốt số tiền
   - `paid` — đã thu
3. Với HS `pending`: lễ tân click "Tính phí" → backend đọc attendance đã `locked`, tạo `MonthlyFee` với `totalDays`, `totalAmount`, status = `ready`.
4. Lễ tân click "Confirm" → status chuyển `ready` → `confirmed`.
5. Phụ huynh đến → click "💰 Thu tiền" → modal chọn `payment_method` (cash/transfer).
6. Click Save → backend transaction:
   - Tạo Receipt với `daysCount`, `feePerDay`, `amount`, `paymentMethod`, `templateId` (default).
   - Update MonthlyFee: `status = paid`, `receiptId`, `paidAt = now()`.
7. Lễ tân click "🖨️ In biên lai" → tải PDF.

**Post-condition:** Receipt + MonthlyFee `paid`; PDF có thể download.

**Alternate flows:**
- A1. HS đóng thiếu (partial payment) — Phase A chưa hỗ trợ; phải đóng đủ.
- A2. HS xin huỷ → admin click "Cancel" → MonthlyFee về cancelled.

### UC-05: Lập phiếu chi (lương giáo viên)

**Actor:** Admin.

**Main flow:**
1. Admin vào Payments, click "Tạo phiếu chi".
2. Chọn category = "salary".
3. Dropdown chọn nhanh giáo viên → auto-fill `recipientName`, `recipientPhone`.
4. Nhập amount + notes.
5. Click Save → tạo Payment record.
6. Click "🖨️" → tải PDF phiếu chi.

**Post-condition:** Payment record + PDF.

### UC-06: Tuỳ biến mẫu in biên lai

**Actor:** Admin.

**Main flow:**
1. Admin vào Templates, click "Tạo template".
2. Modal: nhập tên, chọn type (receipt/payment), paper size (A4/A5/Letter/thermal_80mm), orientation.
3. Click Save → template tạo với jsonConfig rỗng.
4. Click "🎨 Design" → chuyển sang `/templates/:id/design` (full-screen Fabric.js canvas).
5. Kéo thả: text, image, line, table; bind biến `${student.fullName}`, `${amount}`, `${date}`...
6. Click Save → cập nhật `jsonConfig` qua PUT.
7. Quay lại Templates, click "⭐ Set default" → đặt làm default cho type đó.

**Post-condition:** Receipt/Payment mới sẽ render PDF dùng template này.

### UC-07: Xem báo cáo tài chính tháng

**Actor:** Admin.

**Main flow:**
1. Admin vào Reports.
2. Chọn report type (monthly), date range = tháng hiện tại.
3. Hệ thống tải:
   - 3 summary cards: tổng thu, tổng chi, balance.
   - Bar chart: chi theo category (salary/utility/office/other).
   - Statistics: số phiếu thu, số phiếu chi, avg/phiếu.
4. Click "Export Excel" → download `.xlsx`.

---

## 15. User Flows

### Flow A — Onboarding 5 bước (sau khi đăng ký lần đầu)

```
Step 1: Login          → admin/admin123
Step 2: Tạo Class      → ClassesPage → Add → "Lớp Toán 9A"
Step 3: Add Student    → StudentsPage → Add Parent + Student → enroll vào Class
Step 4: Mark Attendance → 1 buổi present
Step 5: Issue Receipt  → tạo receipt + tải PDF đầu tiên
↓
✅ Activated user
```

### Flow B — Workflow tháng hoàn chỉnh

```
Đầu tháng                   Hằng buổi                    Cuối tháng
┌──────────┐                ┌──────────┐                 ┌──────────┐
│ Open     │                │ Mark     │                 │ Submit   │
│ Period   │ ─── 4 weeks ──>│Attendance│ ─── close ────> │ Period   │
│ (auto)   │                │ Daily    │                 │          │
└──────────┘                └──────────┘                 └────┬─────┘
                                                              │
                                                              ▼
                                                         ┌──────────┐
                                                         │ Approve  │
                                                         │ Period   │
                                                         │ (admin)  │
                                                         └────┬─────┘
                                                              │
                                                              ▼
                                                         ┌──────────┐
                                                         │ Lock     │
                                                         │ Period   │
                                                         └────┬─────┘
                                                              │
                                                              ▼
                                          ┌─── Calculate MonthlyFee ───┐
                                          │       (status: ready)       │
                                          └────────────┬────────────────┘
                                                       │
                                                       ▼
                                          ┌─── Confirm MonthlyFee ──────┐
                                          │     (status: confirmed)      │
                                          └────────────┬────────────────┘
                                                       │
                                          PH đến đóng phí
                                                       │
                                                       ▼
                                          ┌─── Pay → Tạo Receipt ───────┐
                                          │  fee → paid; PDF generated   │
                                          └─────────────────────────────┘
```

---

## 16. Functional Requirements theo module

### 16.1. Auth Module
| FR | Mô tả | Priority |
|---|---|---|
| FR-AUTH-1 | User đăng nhập bằng username + password; trả JWT | Must |
| FR-AUTH-2 | JWT có lifetime 24h | Must |
| FR-AUTH-3 | User logout → token invalidated (server-side blacklist hoặc client xoá) | Should |
| FR-AUTH-4 | User đổi mật khẩu (yêu cầu old password) | Must |
| FR-AUTH-5 | Reset password (admin reset cho user khác) | Should — Phase C |
| FR-AUTH-6 | Force change password lần đầu login | Should — Phase B |
| FR-AUTH-7 | Rate limit login (5 lần/phút/IP) | Should — Phase B |
| FR-AUTH-8 | 2FA | Could — Phase D |

### 16.2. Students Module
| FR | Mô tả | Priority |
|---|---|---|
| FR-STU-1 | Create student với họ tên, DOB, gender, parent FK | Must |
| FR-STU-2 | Multi-class enrollment qua StudentClass | Must |
| FR-STU-3 | Search theo tên (case-insensitive, partial match) | Must |
| FR-STU-4 | Filter theo status (active/inactive/graduated) | Must |
| FR-STU-5 | Pagination 20 records/page | Must |
| FR-STU-6 | Soft delete với `deletedAt` (recycle bin) | Should — Phase C |
| FR-STU-7 | Bulk import từ CSV/Excel | Should — Phase C |
| FR-STU-8 | Bulk action (multi-select archive/delete) | Should — Phase C |
| FR-STU-9 | Auto generate student code | Could — Phase B |

### 16.3. Parents Module
| FR | Mô tả | Priority |
|---|---|---|
| FR-PAR-1 | CRUD basic | Must |
| FR-PAR-2 | Phone unique constraint | Must |
| FR-PAR-3 | Hiển thị danh sách con của parent | Must |
| FR-PAR-4 | Bulk import | Should — Phase C |
| FR-PAR-5 | Parent portal account (Phase C) | Should — Phase C |

### 16.4. Classes Module
| FR | Mô tả | Priority |
|---|---|---|
| FR-CLS-1 | CRUD class với teacher FK | Must |
| FR-CLS-2 | Flexible scheduling: 2 cách (by weekday OR by sessions/week), ít nhất 1 phải có | Must |
| FR-CLS-3 | Cờ `scheduleRequired` / `sessionRequired` (bắt buộc đúng ngày / số buổi) | Must |
| FR-CLS-4 | Field `feePerDay`, `maxStudents`, `startTime`, `endTime` | Must |
| FR-CLS-5 | Enroll/unenroll students | Must |
| FR-CLS-6 | Capacity warning khi vượt `maxStudents` | Should — Phase C |
| FR-CLS-7 | Class capacity hard block | Could — Phase D |

### 16.5. Teachers Module
| FR | Mô tả | Priority |
|---|---|---|
| FR-TCH-1 | CRUD basic | Must |
| FR-TCH-2 | Salary type (hourly / fixed) + amount | Must |
| FR-TCH-3 | Phone unique | Must |
| FR-TCH-4 | Báo cáo lương theo tiết đã dạy | Should — Phase C |
| FR-TCH-5 | Tài khoản giáo viên (login) | Could — Phase D |

### 16.6. Attendance Module
| FR | Mô tả | Priority |
|---|---|---|
| FR-ATT-1 | Mark attendance per (student, class, date) với 4 status | Must |
| FR-ATT-2 | Bulk mark cho cả lớp 1 ngày | Must |
| FR-ATT-3 | Unique constraint (studentId, classId, attendanceDate) | Must |
| FR-ATT-4 | Make-up flag (`isMakeUp = true`) cho buổi học bù | Must |
| FR-ATT-5 | Calculate fee theo (student, month) → tổng buổi present + absent_with_fee × feePerDay | Must |
| FR-ATT-6 | Heatmap calendar 365 ngày | Should — Phase C |
| FR-ATT-7 | Reasons taxonomy cho absent (sick, family, ...) | Could — Phase D |

### 16.7. AttendancePeriod Module
| FR | Mô tả | Priority |
|---|---|---|
| FR-PRD-1 | Auto-create period khi mark attendance lần đầu trong tháng | Must |
| FR-PRD-2 | Workflow: open → submitted → approved → locked | Must |
| FR-PRD-3 | Reject từ submitted về open (với reason) | Must |
| FR-PRD-4 | Unlock từ locked về approved (audit log) | Must |
| FR-PRD-5 | Tính sẵn totalSessions, totalPresent, totalAbsentFee, totalAbsentNoFee, totalHoliday | Must |
| FR-PRD-6 | Notification khi period sắp đến hạn submit | Could — Phase C |

### 16.8. MonthlyFee Module
| FR | Mô tả | Priority |
|---|---|---|
| FR-FEE-1 | Lifecycle: pending → ready → confirmed → paid (cancelled) | Must |
| FR-FEE-2 | Calculate từ AttendancePeriod đã `locked` | Must |
| FR-FEE-3 | Pay → tạo Receipt + update fee status | Must |
| FR-FEE-4 | Cancel với reason | Must |
| FR-FEE-5 | Auto-generate fee đầu tháng (cron) | Should — Phase C |
| FR-FEE-6 | Partial payment | Could — Phase D |
| FR-FEE-7 | Discount per student | Could — Phase D |

### 16.9. Receipt Module
| FR | Mô tả | Priority |
|---|---|---|
| FR-REC-1 | Create receipt với student, month, daysCount, feePerDay, amount, paymentMethod, templateId | Must |
| FR-REC-2 | List + filter theo (student, month, date range) | Must |
| FR-REC-3 | Generate PDF dùng template | Must |
| FR-REC-4 | Pre-generate PDF khi create | Should — Phase B |
| FR-REC-5 | Receipt template biến: `${student.fullName}`, `${amount}`, `${date}`, `${center.name}`, `${center.mst}`, `${center.logo}`,... | Must |
| FR-REC-6 | Soft delete (admin only) | Should — Phase C |
| FR-REC-7 | Reprint với watermark "REPRINT" | Could — Phase D |

### 16.10. Payment Module
| FR | Mô tả | Priority |
|---|---|---|
| FR-PAY-1 | Create payment với category, amount, recipient, templateId | Must |
| FR-PAY-2 | 4 categories: salary, utility, office, other | Must |
| FR-PAY-3 | Quick teacher select khi category = salary | Must |
| FR-PAY-4 | PDF gen | Must |
| FR-PAY-5 | Refund flow | Could — Phase D |

### 16.11. Template Module
| FR | Mô tả | Priority |
|---|---|---|
| FR-TPL-1 | CRUD template | Must |
| FR-TPL-2 | Type (receipt/payment) + paper size + orientation | Must |
| FR-TPL-3 | Set default per type | Must |
| FR-TPL-4 | Fabric.js canvas designer (full-screen) | Must |
| FR-TPL-5 | Upload image (logo) qua Supabase Storage | Must |
| FR-TPL-6 | Preview trước khi save | Should — Phase B |
| FR-TPL-7 | Marketplace template cao cấp | Could — Phase D |

### 16.12. Reports Module
| FR | Mô tả | Priority |
|---|---|---|
| FR-RPT-1 | Dashboard report (realtime stats) | Must |
| FR-RPT-2 | Financial report theo date range + groupBy (day/week/month/year) | Must |
| FR-RPT-3 | Unpaid students list | Must |
| FR-RPT-4 | Excel export | Must |
| FR-RPT-5 | Line chart revenue trend | Should — Phase B |
| FR-RPT-6 | Teacher utilization | Should — Phase C |
| FR-RPT-7 | Retention cohort | Should — Phase C |

### 16.13. Settings Module (chưa có UI)
| FR | Mô tả | Priority |
|---|---|---|
| FR-SET-1 | CenterSettings: tên, address, phone, email, logo, MST | Must — Phase A (UI Phase C) |
| FR-SET-2 | User management (admin CRUD users) | Must — Phase C |
| FR-SET-3 | Activity Log UI với filter | Should — Phase C |
| FR-SET-4 | Backup / restore từ UI | Could — Phase D |

---

## 17. Edge cases & Error handling

### 17.1. Edge cases về scheduling
- **Tuần spanning 2 tháng:** Tuần T2-CN của 27/4–3/5 cross 2 tháng → period = tháng có nhiều buổi học hơn. Đã fix trong commit `55c933e`.
- **Lớp đổi `feePerDay` giữa tháng:** Fee đã calculate giữ nguyên giá cũ; chỉ áp giá mới cho fee tạo sau.
- **Học sinh chuyển lớp giữa tháng:** Student có thể có 2 StudentClass cho cùng tháng → fee tách riêng cho mỗi class.
- **Lớp có schedule_required = false và session_required = false:** Tự do tham gia bao nhiêu buổi tuỳ ý → tính fee theo số buổi thực.

### 17.2. Edge cases về attendance
- **Mark attendance trùng date:** Unique constraint `(studentId, classId, attendanceDate)` block; trả 409 Conflict.
- **Mark attendance khi period đã `locked`:** Block; trả 403.
- **Make-up class buổi học bù:** Cùng date có 2 records (1 chính, 1 make-up với `isMakeUp = true`); cả 2 đều count vào fee nếu status `present`.
- **Holiday giữa tuần:** Mark `holiday`, không count vào fee, không count vào totalSessions của period.

### 17.3. Edge cases về fee calculation
- **Period chưa lock:** Calculate fee block; báo lỗi "Period must be locked first".
- **Học sinh không có attendance trong tháng:** Fee = 0 nhưng vẫn tạo MonthlyFee để track.
- **Số ngày học = 0:** MonthlyFee status `ready` nhưng amount = 0; admin có thể cancel.

### 17.4. Edge cases về receipt
- **Phụ huynh trả thiếu:** Phase A không hỗ trợ partial; phải trả đủ.
- **Phụ huynh trả thừa:** Số dư không lưu; phải nhập đúng số tiền.
- **Đổi payment method sau khi đã trả:** Không cho sửa; phải void receipt + tạo mới (Phase B).

### 17.5. Edge cases về template
- **Xoá template đang được dùng làm default:** Block; phải set default khác trước.
- **Xoá template đang được Receipt reference:** Block (FK constraint); chỉ archive.
- **Upload ảnh > 1MB:** Reject với 400; FE compress trước khi upload.

### 17.6. Error handling pattern toàn hệ thống

**Response format đồng nhất:**
```json
// Success
{ "success": true, "data": { ... } }

// Error
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR" | "TOKEN_EXPIRED" | "FORBIDDEN" | "NOT_FOUND" | "CONFLICT" | "INTERNAL_ERROR",
    "message": "Mô tả lỗi tiếng Việt",
    "details": { ... }   // optional
  }
}
```

**HTTP status codes:**
- 200/201 — success
- 400 — validation error
- 401 — token invalid/expired
- 403 — role forbidden
- 404 — resource not found
- 409 — conflict (unique constraint)
- 500 — internal server error

**FE handling:**
- 401 + `TOKEN_EXPIRED` → xoá localStorage + redirect `/login`.
- 403 → toast "Bạn không có quyền".
- 5xx → toast "Lỗi hệ thống, vui lòng thử lại".
- Network error → toast "Không thể kết nối server" + retry button.
- Timeout (30s) → toast "Yêu cầu quá thời gian".

---

# Phần IV — Góc nhìn Dev (Technical)

## 18. Kiến trúc tổng thể

### 18.1. High-level diagram

```
                       ┌──────────────────────────────────┐
                       │       BROWSER (Client)           │
                       │  React 18 + Vite SPA             │
                       │  - 14 pages, 7 reusable UI cmps  │
                       │  - Context API auth state        │
                       │  - localStorage JWT              │
                       │  - Tailwind v4 styling           │
                       │  - Fabric.js canvas (designer)   │
                       └─────────────────┬────────────────┘
                                         │ HTTPS, fetch()
                                         │ /api/* (relative)
                                         ▼
                ┌────────────────────────────────────────────────┐
                │              VERCEL EDGE NETWORK               │
                │  ┌──────────────────┐  ┌────────────────────┐  │
                │  │  Static Assets   │  │ Serverless TS API  │  │
                │  │  frontend/dist/  │  │ api/**/*.ts        │  │
                │  │  (CDN cached)    │  │ (Node 20 runtime)  │  │
                │  └──────────────────┘  └─────────┬──────────┘  │
                │                                   │             │
                │                                   ▼             │
                │                          ┌────────────────┐    │
                │                          │ Prisma Client  │    │
                │                          │  (singleton)   │    │
                │                          └────────┬───────┘    │
                └───────────────────────────────────┼────────────┘
                                                    │ Pooler (6543)
                                                    ▼
                ┌────────────────────────────────────────────────┐
                │            SUPABASE CLOUD (Singapore)          │
                │  ┌────────────────┐  ┌─────────────────────┐   │
                │  │ PostgreSQL DB  │  │ Storage (planned)   │   │
                │  │  14 tables     │  │ template-images/    │   │
                │  │  ~70 indexes   │  │ logos/              │   │
                │  └────────────────┘  └─────────────────────┘   │
                └────────────────────────────────────────────────┘

ALTERNATIVE PATH (Local Dev):
                       ┌──────────────────────────────────┐
                       │       BROWSER (localhost:3000)   │
                       └─────────────────┬────────────────┘
                                         │ Vite dev proxy
                                         ▼
                       ┌──────────────────────────────────┐
                       │   Express.js (localhost:5000)    │
                       │   13 route files                 │
                       │   better-sqlite3                 │
                       │   data/edumanager.db (WAL mode)  │
                       └──────────────────────────────────┘
```

### 18.2. Architectural style

- **Frontend:** Single Page Application (SPA), client-side routing.
- **Backend production:** Stateless Serverless Functions (one file = one function).
- **Backend local:** Monolithic Node.js Express server.
- **Database:** Relational (PostgreSQL prod / SQLite dev).
- **State management FE:** Lifted state + Context API; chưa có Redux/Zustand.
- **Communication:** REST JSON (không GraphQL, không gRPC).
- **Auth:** JWT bearer token in `Authorization` header.

### 18.3. Decisions chính

| Decision | Lựa chọn | Lý do |
|---|---|---|
| FE framework | React | Hệ sinh thái mạnh, dev VN quen thuộc |
| Build tool | Vite (không Next.js) | Đơn giản, không cần SSR cho admin tool |
| Styling | Tailwind v4 | Speed of development; consistent design |
| BE prod | Vercel Serverless | Free tier, auto-deploy, no DevOps overhead |
| BE local | Express + SQLite | Zero-config, file-based DB cho dev |
| ORM | Prisma | Type-safe, schema-first, migration tốt |
| DB cloud | Supabase (Postgres) | Managed, có built-in Auth + Storage (chưa dùng), giá hợp lý |
| Auth | JWT custom (không Auth0/Clerk) | Đơn giản, không vendor lock-in, control schema users |
| PDF | pdfmake | Pure JS, không cần Chromium headless |
| Canvas designer | Fabric.js | Mature, có serialize JSON tốt |

### 18.4. Trade-offs đáng chú ý
- **Dual backend** (Express + Vercel): Cho dev nhanh nhưng tạo drift; sẽ deprecate Express ở Phase B.
- **JWT không refresh thực sự:** Token expire 24h, không có rolling refresh; user phải login lại hằng ngày.
- **No SSR:** Không SEO-friendly nhưng admin tool không cần SEO.
- **localStorage cho token:** Vulnerable to XSS; trade-off với simplicity. Phase D có thể chuyển sang httpOnly cookie.

---

## 19. Tech stack & Lý do chọn

### 19.1. Frontend stack

| Library | Version | Vai trò | Lý do chọn |
|---|---|---|---|
| react | 18.x | UI framework | Industry standard |
| react-dom | 18.x | DOM bindings | — |
| react-router-dom | 7.11 | Client-side routing | Bản mới nhất, lazy loading |
| vite | 7.2.4 | Build tool + dev server | Cực nhanh, ESM native |
| @vitejs/plugin-react | latest | Vite + React | — |
| tailwindcss | 4.x | Utility CSS | Speed; thiết kế nhất quán |
| @tailwindcss/vite | latest | Tailwind v4 cho Vite | — |
| fabric | 7.1 | Canvas library | Template designer |
| pdfmake | 0.3.1 | PDF generation client-side fallback | — |
| xlsx | 0.18.5 | Excel export | — |

**Không dùng:**
- Redux / Zustand → vì v2 dữ liệu đơn giản, Context đủ; sẽ thêm React Query ở Phase B.
- react-hook-form / zod → sẽ thêm Phase B.
- next.js → không cần SSR.
- TypeScript trên FE → trade-off cho speed; sẽ migrate Phase D.

### 19.2. Backend stack — Local (Express)

| Library | Version | Vai trò |
|---|---|---|
| express | 4.21.2 | Web framework |
| better-sqlite3 | 11.7 | SQLite driver (sync, fast) |
| jsonwebtoken | 9.0.2 | JWT |
| bcryptjs | 2.4.3 | Password hash |
| cors | 2.8.5 | CORS middleware |
| multer | 1.4.5 | File upload |
| pdfmake | 0.3.1 | PDF |

### 19.3. Backend stack — Production (Vercel)

| Library | Version | Vai trò |
|---|---|---|
| @vercel/node | 3.0.0 | Vercel function runtime types |
| @prisma/client | 5.14 | ORM client |
| prisma | 5.14 | Schema + migration tool |
| typescript | 5.4.0 | Type system |
| tsx | 4.7 | Run TS scripts (seed) |
| jsonwebtoken | 9.0.2 | — |
| bcryptjs | 2.4.3 | — |

**Cần thêm Phase A:**
- @supabase/supabase-js — cho Storage upload
- zod — cho validation (Phase B)
- @upstash/ratelimit — cho rate limit (Phase B)

---

## 20. Module breakdown — Frontend

### 20.1. Cấu trúc thư mục
```
frontend/
├── public/                       # static assets
├── src/
│   ├── App.jsx                   # Router setup; 14 routes
│   ├── main.jsx                  # ReactDOM.render entry
│   ├── index.css                 # Tailwind base + design tokens
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── MainLayout.jsx       # Sidebar + Header + Outlet
│   │   │   ├── Header.jsx           # Top nav + user dropdown
│   │   │   ├── Sidebar.jsx          # Nav menu, role-based
│   │   │   ├── ProtectedRoute.jsx   # Auth guard
│   │   │   ├── MainLayout.jsx.backup    ← rác cần xoá
│   │   │   └── Sidebar.jsx.backup       ← rác cần xoá
│   │   │
│   │   ├── ui/
│   │   │   ├── DataTable.jsx        # Reusable table
│   │   │   ├── Modal.jsx            # Generic dialog
│   │   │   ├── Toast.jsx            # Notifications
│   │   │   ├── Spinner.jsx          # Loading indicator
│   │   │   ├── EmptyState.jsx       # Empty data placeholder
│   │   │   └── PageTransition.jsx   # Page animation wrapper
│   │   │
│   │   ├── auth/
│   │   │   └── ChangePasswordModal.jsx
│   │   │
│   │   └── AttendanceReviewModal.jsx
│   │
│   ├── context/
│   │   └── AuthContext.jsx          # User, token, login/logout
│   │
│   ├── pages/                       # 15 page files (14 + 1 designer)
│   │   ├── LoginPage.jsx
│   │   ├── DashboardPage.jsx        + .backup
│   │   ├── StudentsPage.jsx          + .backup
│   │   ├── ParentsPage.jsx           + .backup
│   │   ├── TeachersPage.jsx          + .backup
│   │   ├── ClassesPage.jsx
│   │   ├── AttendancePage.jsx
│   │   ├── AttendancePeriodsPage.jsx
│   │   ├── ReceiptsPage.jsx
│   │   ├── PaymentsPage.jsx
│   │   ├── FeeCollectionPage.jsx
│   │   ├── HistoryPage.jsx
│   │   ├── ReportsPage.jsx
│   │   ├── TemplatesPage.jsx
│   │   └── TemplateDesignerPage.jsx
│   │
│   └── services/
│       └── api.js                   # API service abstraction (12 services)
│
├── index.html
├── package.json
├── vite.config.js
└── tailwind.config.js (nếu có)
```

### 20.2. Design system (Tailwind v4)

**Color palette (deduced from `index.css` + components):**
- Primary: blue gradient (`from-blue-500 to-blue-700`).
- Success: emerald.
- Warning: amber.
- Error: rose.
- Neutral: slate.
- Sidebar bg: slate-900 gradient.

**Typography:**
- Sans-serif default Tailwind.
- Heading: `font-semibold`/`font-bold`.
- Body: `font-medium`.

**Spacing & layout:**
- Container max-width: full với `px-4` mobile, `px-6` desktop.
- Card padding: `p-6`.
- Grid: `grid-cols-2 lg:grid-cols-4` cho stat cards.

**Animations (custom keyframes):**
- fadeIn, slideIn, shimmer, pulse-glow.

### 20.3. State management

**Auth state (Context):**
```
AuthContext provides:
  user: { id, username, role, fullName }
  token: string
  loading: boolean
  error: string
  login(username, password)
  logout()
  isAdmin()
  changePassword(old, new)
```

**Per-page local state:**
- Mỗi page tự `useState` cho data + form state.
- `useEffect` để fetch khi mount.
- Không có cache toàn cục → mỗi lần navigate refetch lại (chấp nhận trade-off).

**Phase B improvement:**
- React Query: cache + invalidate.
- Zustand: UI state (modal open, sidebar collapsed).

### 20.4. Routing structure

```
/login                     LoginPage           (public)
/                          DashboardPage       (auth)
/students                  StudentsPage        (auth)
/parents                   ParentsPage         (auth)
/classes                   ClassesPage         (auth)
/teachers                  TeachersPage        (auth, admin)
/attendance                AttendancePage      (auth)
/attendance-periods        AttendancePeriodsPage (auth)
/receipts                  ReceiptsPage        (auth)
/payments                  PaymentsPage        (auth, admin)
/fee-collection            FeeCollectionPage   (auth)
/history                   HistoryPage         (auth)
/reports                   ReportsPage         (auth, admin)
/templates                 TemplatesPage       (auth, admin)
/templates/:id/design      TemplateDesignerPage (auth, admin, full-screen)
```

### 20.5. Service abstraction (`services/api.js`)

12 service objects, mỗi cái wrap fetch:

```
authService          login, logout, me, changePassword
studentsService      getAll(params), getById, create, update, delete
parentsService       (same shape)
teachersService
classesService       + enrollStudent
attendanceService    getByDate, getByClassDate, getByStudentMonth, create, bulkCreate, calculateFee
attendancePeriodsService  getAll, getById, create, submit, approve, lock, unlock, reject
receiptsService      getAll, getById, create, delete
paymentsService      (same)
templatesService     CRUD + getDefault, setDefault, uploadImage
reportsService       getDashboard, getFinancial, getUnpaidStudents
monthlyFeesService   CRUD + calculate, confirm, pay, cancel
```

**Pattern chung:**
- Tất cả request đi qua hàm `request(endpoint, options)`.
- Auto inject `Authorization: Bearer ${token}` từ localStorage.
- Timeout 30s qua `AbortSignal.timeout(30000)`.
- Auto handle 401 + `TOKEN_EXPIRED` → redirect login.
- Trả uniform shape `{ success, data?, error? }`.

---

## 21. Module breakdown — Backend

### 21.1. Express (Local) — `backend/src/`

```
backend/
├── src/
│   ├── server.js                 # Express app entry, middleware setup
│   ├── database/
│   │   ├── index.js              # better-sqlite3 connection (WAL, FK ON)
│   │   ├── schema.sql            # SQLite DDL (raw SQL)
│   │   ├── migrations/           # Numbered migration files
│   │   ├── migrate.js            # Run migrations
│   │   ├── seed.js               # Seed sample data
│   │   └── reset.js              # Drop + recreate
│   ├── middleware/
│   │   ├── auth.js               # JWT verify + role check
│   │   ├── logger.js             # Request logger
│   │   └── errorHandler.js       # Global error handler
│   ├── routes/                   # 13 file
│   │   ├── auth.js (156 LOC)
│   │   ├── students.js (271)
│   │   ├── parents.js (84)
│   │   ├── teachers.js (71)
│   │   ├── classes.js (331)
│   │   ├── attendance.js (161)
│   │   ├── attendance-periods.js (308)
│   │   ├── monthly-fees.js (239)
│   │   ├── receipts.js (132)
│   │   ├── payments.js (115)
│   │   ├── templates.js (134)
│   │   ├── reports.js (130)
│   │   └── kanban.js (320)         # Sync với task.md cho dashboard
│   └── services/
│       └── pdfService.js          # pdfmake helper
└── data/
    └── edumanager.db              # SQLite file (gitignored)
```

### 21.2. Vercel Serverless — `api/` + `lib/` + `prisma/`

```
api/                              # Mỗi file = 1 endpoint
├── auth/
│   ├── login.ts (79 LOC)
│   ├── me.ts (46 LOC)
│   ├── logout.ts                 ← thiếu (Phase A)
│   └── change-password.ts        ← thiếu (Phase A)
├── students/index.ts (353 LOC)
├── parents/index.ts (213)
├── teachers/index.ts (238)
├── classes/index.ts (291)
├── attendance/
│   ├── index.ts (95)
│   ├── bulk.ts (100)
│   ├── month.ts (69)
│   └── calculate-fee.ts          ← thiếu (Phase A)
├── attendance-periods/
│   ├── index.ts (132)
│   └── [id]/index.ts             # Dynamic route
├── monthly-fees/                 ← THIẾU TOÀN BỘ (Phase A)
├── receipts/                     ← THIẾU TOÀN BỘ (Phase A)
├── payments/                     ← THIẾU TOÀN BỘ (Phase A)
├── templates/                    ← THIẾU TOÀN BỘ (Phase A)
└── reports/
    ├── dashboard.ts (99)
    ├── financial.ts              ← thiếu (Phase A)
    └── unpaid-students.ts        ← thiếu (Phase A)

lib/                              # Shared utilities (cross-function)
├── prisma.ts                     # Prisma client singleton
├── auth.ts                       # JWT verify (chưa có requireAuth wrapper — Phase A)
├── pdf.ts                        ← chưa có (Phase A)
├── storage.ts                    ← chưa có (Phase A)
└── validation.ts                 ← chưa có (Phase B)

prisma/
├── schema.prisma                 # 14 models, 468 dòng
└── seed.ts                       # 471 dòng, tạo: 2 users, 5 teachers, 15 parents, 25 students, 6 classes, 1700+ attendance records
```

### 21.3. Conventions backend

**Express route file structure:**
```
import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();

router.get('/', authenticate, async (req, res, next) => {
  try {
    // ...
    res.json({ success: true, data: { ... } });
  } catch (err) { next(err); }
});

export default router;
```

**Vercel function structure:**
```
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { prisma } from '../../lib/prisma';
import { requireAuth } from '../../lib/auth';      // ← Phase A

export default requireAuth(async (req, res) => {   // Phase A wrapper
  if (req.method === 'GET')    return list(req, res);
  if (req.method === 'POST')   return create(req, res);
  // ...
  res.status(405).json({ success: false, error: { code: 'METHOD_NOT_ALLOWED' } });
});
```

---

## 22. Data model deep-dive

### 22.1. Schema source of truth
- **Prisma:** `prisma/schema.prisma` (468 dòng). Đây là canonical schema cho production.
- **SQLite:** `backend/src/database/schema.sql` (raw SQL, song song). Cần đồng bộ tay.

### 22.2. Entity Relationship Diagram

```
                   ┌────────────────┐
                   │     User       │  (admin/receptionist)
                   │ id (cuid)      │
                   │ username UK    │
                   │ passwordHash   │
                   │ role           │
                   └────────┬───────┘
                            │ creates / submits / approves
                            │
        ┌───────────────────┼─────────────────────────┐
        │                   │                         │
        ▼                   ▼                         ▼
┌──────────────┐  ┌────────────────────┐  ┌──────────────────┐
│   Receipt    │  │  AttendancePeriod  │  │     Payment      │
└──────────────┘  └────────────────────┘  └──────────────────┘

┌────────────┐         ┌──────────────────┐
│   Parent   │ 1── n → │     Student      │
│ id (cuid)  │         │ id (cuid)        │
│ phone UK   │         │ parentId FK      │
└────────────┘         │ status enum      │
                       └────────┬─────────┘
                                │ M-N qua StudentClass
                                │
                                ▼
                       ┌──────────────────┐    ┌─────────────┐
                       │     Class        │ ←─ │   Teacher   │
                       │ id (cuid)        │    │ id (cuid)   │
                       │ feePerDay        │    │ phone UK    │
                       │ scheduleDays JSON│    │ salaryType  │
                       └────────┬─────────┘    └─────────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │   Attendance     │
                       │ (student, class, │
                       │  date) UNIQUE    │
                       │ status enum      │
                       │ isMakeUp bool    │
                       └──────────────────┘
                                │
                                ▼ aggregates into
                       ┌──────────────────┐
                       │ AttendancePeriod │
                       │ (class, month)   │
                       │ UNIQUE           │
                       │ status enum      │
                       │ totalSessions... │
                       └──────────────────┘
                                │
                                ▼ used to calculate
                       ┌──────────────────┐
                       │   MonthlyFee     │
                       │ (student, month) │
                       │ UNIQUE           │
                       │ status enum      │
                       │ receiptId FK     │
                       └────────┬─────────┘
                                │
                                ▼ paid → creates
                       ┌──────────────────┐    ┌──────────────┐
                       │     Receipt      │ →─ │   Template   │
                       │ studentId FK     │    │ jsonConfig   │
                       │ templateId FK    │    │ isDefault    │
                       └──────────────────┘    └──────────────┘
                                                       │
                       ┌──────────────────┐            │
                       │     Payment      │ ───────────┘
                       │ category enum    │
                       │ templateId FK    │
                       └──────────────────┘

┌──────────────────┐    ┌─────────────────────┐
│  ActivityLog     │    │  CenterSettings     │
│ (append-only)    │    │ id = 1 (singleton)  │
│ userId FK        │    │ centerName          │
│ action, entity   │    │ centerLogo          │
└──────────────────┘    └─────────────────────┘
```

### 22.3. Key constraints & invariants

**Unique constraints:**
- `User.username` — chống tạo trùng tài khoản.
- `Parent.phone` — chống parent trùng SĐT.
- `Teacher.phone` — chống teacher trùng SĐT.
- `Attendance(studentId, classId, attendanceDate)` — chống điểm danh trùng.
- `AttendancePeriod(classId, periodMonth)` — mỗi lớp 1 period/tháng.
- `MonthlyFee(studentId, month)` — mỗi HS 1 fee/tháng.
- `StudentClass(studentId, classId)` — không enroll trùng.

**Foreign key cascade:**
- `StudentClass` cascade delete khi xoá Student/Class.
- Các FK khác giữ default (NO ACTION) → buộc admin xoá thủ công thứ tự.

**Business invariants (chưa enforce ở DB level — application logic):**
- Không tạo Attendance trên Period đã `locked`.
- Không calculate MonthlyFee nếu Period chưa `locked`.
- Không pay MonthlyFee nếu chưa `confirmed`.
- Set 1 Template default → unset các template default khác cùng type.

### 22.4. Index strategy

| Bảng | Index | Mục đích |
|---|---|---|
| `users` | username, role | Login + role filter |
| `parents` | phone, fullName | Search |
| `students` | parentId, status, fullName | List + filter + search |
| `teachers` | phone, status | List + search |
| `classes` | teacherId, status | Filter |
| `student_classes` | studentId, classId | Join |
| `attendance` | studentId, classId, attendanceDate, isMakeUp | Bulk insert + monthly aggregate |
| `attendance_periods` | classId, periodMonth, status | Workflow filter |
| `monthly_fees` | studentId, month, status | Fee collection list |
| `receipts` | studentId, month, createdAt | History |
| `payments` | category, createdAt | History + category filter |
| `templates` | type, isDefault | Default template lookup |
| `activity_logs` | userId, action, createdAt | Audit query |

### 22.5. Migration strategy

**Hiện tại:**
- Prisma migration files trong `prisma/migrations/` (auto-generated).
- Express SQLite migration trong `backend/src/database/migrations/` (manual SQL).
- Drift risk: nếu sửa schema.prisma mà quên sửa SQLite SQL thì local dev hỏng.

**Phase B đề xuất:**
- Bỏ raw SQL của SQLite. Dùng Prisma cho cả local (Prisma hỗ trợ SQLite).
- 1 file `schema.prisma` cho cả 2 môi trường (chỉ đổi `provider`).

---

## 23. API design patterns

### 23.1. URL conventions

- **Base path:** `/api`.
- **Resource naming:** plural nouns (`/students`, `/receipts`).
- **Action endpoints:** dùng query param `?action=submit` hoặc sub-path `/[id]/confirm` (mix style hiện tại — Phase B chuẩn hoá).
- **Dynamic segments:** Vercel folder pattern `[id]` (e.g. `api/receipts/[id].ts`).
- **Query params:** filter, sort, pagination (`?status=active&page=1&limit=20`).

### 23.2. Method conventions

| Method | Mục đích |
|---|---|
| GET | Read (list / detail) |
| POST | Create / action (submit, approve, pay) |
| PUT | Full update (entire record) |
| PATCH | Partial update (chưa dùng nhiều) |
| DELETE | Soft delete (mark inactive) hoặc hard delete (admin only) |

### 23.3. Response envelope

**Success:**
```json
{
  "success": true,
  "data": { ... }              // object hoặc { items: [], total: 100, page: 1 }
}
```

**Error:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Tên không được để trống",
    "details": { "field": "fullName" }
  }
}
```

### 23.4. Pagination pattern

**Hiện tại:** offset-based.
```
GET /api/students?page=1&limit=20&search=Nguyen&status=active

Response:
{
  "success": true,
  "data": {
    "items": [...],
    "total": 156,
    "page": 1,
    "limit": 20,
    "totalPages": 8
  }
}
```

**Phase B:** chuyển sang cursor-based cho list lớn (Attendance, ActivityLog).

### 23.5. Filtering & search

- Filter qua query param đơn lẻ: `?status=active&class_id=cls_xxx`.
- Search qua `?search=keyword` (LIKE %keyword% trên fullName).
- Date range: `?from=2026-01-01&to=2026-01-31`.

### 23.6. PDF endpoint pattern

```
GET /api/receipts/:id/pdf

Response:
  Content-Type: application/pdf
  Content-Disposition: attachment; filename="receipt-cuid_xxx.pdf"
  Body: PDF binary stream
```

### 23.7. File upload (Phase A — Supabase Storage)

**Chấp nhận 2 cách:**
1. **Multipart form-data:** `POST /api/templates/upload` với field `image` (Phase A khó implement trên Vercel).
2. **Base64 JSON (preferred):** `POST /api/templates/upload` với body `{ filename, dataUrl }`.

**Khuyến nghị:** chọn (2) cho Phase A.

### 23.8. Idempotency (Phase B)

Cho POST tạo Receipt/Payment, accept header `Idempotency-Key: <uuid>`. Backend cache key trong 24h, trả lại response cũ nếu key trùng → chống double-click.

---

## 24. Authentication & Authorization

### 24.1. Authentication flow

```
1. POST /api/auth/login { username, password }
   ↓
2. BE: tìm User theo username → bcrypt.compare(password, passwordHash)
   ↓
3. Tạo JWT { sub: user.id, username, role, exp: now + 24h } sign HS256 với JWT_SECRET
   ↓
4. Trả { success: true, data: { token, user: { id, username, role, fullName } } }
   ↓
5. FE: lưu token vào localStorage; set AuthContext.user
   ↓
6. Mọi request tiếp theo: header `Authorization: Bearer ${token}`
```

### 24.2. Authorization

**Levels:**
1. **Public** — Login endpoint.
2. **Authenticated** — phải có valid JWT. Mọi endpoint còn lại.
3. **Admin only** — JWT.role === 'admin'. Các endpoint nhạy cảm: Templates, Payments, Reports financial+unpaid, delete operations, attendance period approve+lock.

**Implementation hiện tại:**
- Express: middleware `authenticate` + `requireAdmin` từ `backend/src/middleware/auth.js`.
- Vercel: chưa có wrapper `requireAuth` chính thức (Task A1). Một số endpoint có check thủ công, một số chưa.

**Phase A target:**
- Mọi endpoint Vercel (trừ login) wrap qua `requireAuth(handler, allowedRoles?)`.

### 24.3. Token lifecycle

| Sự kiện | Hành động |
|---|---|
| Login success | Issue JWT 24h |
| Token sắp hết hạn | Hiện tại không có refresh; user phải login lại (Phase B sẽ thêm refresh token) |
| Token expired | BE trả 401 + code `TOKEN_EXPIRED` → FE clear localStorage + redirect login |
| Token invalid (sai chữ ký) | BE trả 401 + code `TOKEN_INVALID` |
| Logout | Phase A: client-only (xoá localStorage). Phase B: server blacklist trong Redis |
| Change password | Sau đổi, không invalidate các session khác (Phase B sẽ rotate JWT_SECRET-per-user hoặc track tokenVersion) |

### 24.4. Password policy

| Quy tắc | Phase A | Phase B |
|---|---|---|
| Min length | 6 | 8 |
| Complexity | Bất kỳ | ≥ 1 chữ + 1 số |
| Common password block | Không | Top 1000 |
| Bcrypt rounds | 10 | 12 |
| Force change first login | Không | ✓ |
| Rotate every 90 days | Không | Không (best practice mới khuyến nghị không force rotate) |

---

## 25. Data flow diagrams

### 25.1. Flow: Mark attendance bulk

```
[Receptionist clicks Save in week timesheet]
        ↓
FE: build payload { records: [{studentId, status}, ...], class_id, dates: [...] }
        ↓
FE: POST /api/attendance/bulk với JWT
        ↓
[Vercel Function api/attendance/bulk.ts]
   ├─ requireAuth → req.user
   ├─ validate body (zod — Phase B)
   ├─ tìm/tạo AttendancePeriod cho (class_id, month)
   │   - nếu period.status === 'locked' → reject 403
   ├─ prisma.$transaction:
   │   - foreach record:
   │     prisma.attendance.upsert({
   │       where: (studentId, classId, attendanceDate) unique,
   │       create / update: { status, createdById }
   │     })
   │   - tính lại totals của period
   │   - update period.totalSessions, totalPresent, ...
   └─ return { success: true, data: { count, period } }
        ↓
FE: toast success; refetch attendance grid
```

### 25.2. Flow: Pay monthly fee → Issue Receipt

```
[Receptionist clicks "💰 Thu tiền" trong FeeCollectionPage]
        ↓
FE: modal hiện ra; chọn paymentMethod = 'cash'
        ↓
FE: POST /api/monthly-fees/:id/pay { paymentMethod }
        ↓
[Vercel Function api/monthly-fees/[id]/pay.ts]
   ├─ requireAuth
   ├─ load MonthlyFee + Student + Class
   ├─ guard: fee.status === 'confirmed' (else reject)
   ├─ load default Template type='receipt'
   ├─ prisma.$transaction:
   │   - prisma.receipt.create({
   │       studentId, month, daysCount, feePerDay, amount,
   │       paymentMethod, templateId, createdById, ...
   │     })
   │   - prisma.monthlyFee.update({
   │       where: { id }, data: { status: 'paid', receiptId, paidAt: now }
   │     })
   │   - prisma.activityLog.create({ action: 'FEE_PAID', entity: 'MonthlyFee' })
   └─ return { success: true, data: { receipt, fee } }
        ↓
FE: toast "Đã thu phí"; offer "🖨️ In biên lai"
        ↓
[User clicks Print] → window.open('/api/receipts/:id/pdf', '_blank')
        ↓
[Vercel Function api/receipts/[id]/pdf.ts] (maxDuration: 30)
   ├─ requireAuth
   ├─ load Receipt + Student + Template + CenterSettings
   ├─ generatePdf(template.jsonConfig, { receipt, student, center })
   │   → Buffer
   ├─ res.setHeader('Content-Type', 'application/pdf')
   ├─ res.setHeader('Content-Disposition', 'attachment; filename="..."')
   └─ res.send(buffer)
        ↓
Browser tải PDF
```

### 25.3. Flow: Calculate fee from attendance

```
[Receptionist clicks "Tính phí" cho 1 student]
        ↓
FE: POST /api/monthly-fees/calculate { studentId, month: '2026-04' }
        ↓
[Vercel Function]
   ├─ requireAuth
   ├─ tìm StudentClass của student → list classIds
   ├─ foreach class:
   │   - load AttendancePeriod (class, month)
   │     - guard: period.status === 'locked' (else reject 400)
   │   - count attendance:
   │     present + absent_with_fee = chargedDays
   │   - amount += chargedDays × class.feePerDay
   ├─ prisma.monthlyFee.upsert({
   │     where: (studentId, month) unique,
   │     create / update: { totalDays, totalAmount: amount, status: 'ready' }
   │   })
   └─ return { success: true, data: monthlyFee }
        ↓
FE: refresh row → status badge chuyển 'ready', hiển thị amount
```

### 25.4. Flow: Submit / Approve / Lock period

```
[End of month, receptionist clicks "Submit" trên class]
        ↓
POST /api/attendance-periods/:id?action=submit
        ↓
[Vercel] guard: period.status === 'open' → set 'submitted', submittedById, submittedAt
        ↓
Notification cho admin (Phase C)
        ↓
[Admin clicks "Review"]
        ↓
GET /api/attendance-periods/:id (với detail)
        ↓
[Admin clicks "Approve"]
POST /api/attendance-periods/:id?action=approve
   guard: status === 'submitted' → set 'approved', approvedById, approvedAt
        ↓
[Admin clicks "Lock"]
POST /api/attendance-periods/:id?action=lock
   guard: status === 'approved' → set 'locked', lockedById, lockedAt
        ↓
[Sau khi lock]
- Mọi attempt mark/edit attendance trên period này → 403
- MonthlyFee calculate được phép gọi cho students của class này
```

---

## 26. Integration patterns

### 26.1. Hiện tại
- **Supabase PostgreSQL:** qua Prisma Client + connection string `DATABASE_URL`.
- **Supabase Storage:** kế hoạch dùng cho upload ảnh template (Phase A).

### 26.2. Phase C–D
- **SMS provider** (eSMS / Twilio): cho reminder phụ huynh nợ phí.
- **Zalo OA API:** gửi biên lai qua Zalo.
- **Cổng thanh toán** (VNPay / MoMo / ZaloPay): cho online payment.
- **Email provider** (SendGrid / Resend): notification.
- **Google Drive API** (OAuth): tự động backup DB hằng tuần.
- **Sentry:** error tracking.

### 26.3. Pattern tích hợp
- **Webhook in:** Phase D, nhận callback từ payment gateway.
- **Webhook out:** Phase D, push event tới hệ thống bên ngoài (kế toán).
- **API key vault:** Vercel env vars cho Phase B; Phase D có thể dùng Vault chuyên dụng.

---

## 27. Security architecture

### 27.1. Threat model

| Threat | Mitigation hiện tại | Mitigation Phase B+ |
|---|---|---|
| **Brute force login** | Không có | Rate limit 5/phút/IP + captcha sau 3 lần fail |
| **JWT secret leak** | `.env.local` gitignore | Rotate qua Vercel env, audit access |
| **SQL injection** | Prisma + prepared stmt | OK |
| **XSS qua user input** | React tự escape | Phase B: CSP header |
| **CSRF** | Token-based, không dùng cookie | OK |
| **CORS misconfiguration** | Allow-all (production) | Phase B: whitelist origin chính thức |
| **Mass assignment** | FE truyền body, BE trust → có thể strip | Phase B: zod schema strict |
| **IDOR (insecure direct object ref)** | Chưa enforce ownership | Phase B: filter theo tenantId / centerId |
| **Privilege escalation** | requireAuth + role check | Phase A wrap đầy đủ |
| **DoS qua PDF gen** | maxDuration 10s (sẽ tăng 30s) | Phase B: queue + worker |
| **Logo upload abuse** | Chưa có giới hạn | Phase A: max 1MB, image MIME only |

### 27.2. Defence-in-depth layers

1. **Network:** Vercel Edge + HTTPS forced.
2. **App boundary:** CORS, rate limit (Phase B).
3. **Auth:** JWT verify mọi request.
4. **Authorization:** role check.
5. **Input validation:** zod schema (Phase B).
6. **Output encoding:** React tự escape; PDF gen escape user-supplied text.
7. **Data:** Postgres permissions (only Prisma user can write).
8. **Secrets:** Vercel env vars, không commit.
9. **Audit:** ActivityLog ghi mọi mutation (Phase B middleware).

### 27.3. Compliance considerations
- **PII:** Tên + SĐT + DOB của học sinh + phụ huynh = PII. Phải có policy bảo vệ.
- **Personal data of children:** Đặc biệt nhạy cảm. Phase D cần consent flow nếu mở Parent Portal cho phụ huynh truy cập dữ liệu con.
- **Tax / Accounting:** Biên lai có MST cần lưu ≥ 5 năm theo luật VN.

---

## 28. Performance & Scalability

### 28.1. Performance budget

| Hạng mục | Target hiện tại | Target Phase B |
|---|---|---|
| FCP | < 1.5s | < 1s |
| LCP | < 2.5s | < 2s |
| TTI | < 3s | < 2.5s |
| Bundle FE gzipped | ~ 350KB (chưa đo) | < 250KB |
| API p95 | chưa đo | < 500ms |
| API p99 | chưa đo | < 1s |
| PDF gen | chưa đo | < 5s p95 |

### 28.2. Scalability concerns

**Per-center scale (single-tenant):**
- 500 HS × 30 buổi/tháng = 15,000 attendance records/tháng → ~180,000/năm. PostgreSQL handle được dễ.
- 500 HS × 12 receipt/năm = 6,000 receipts. Trivial.

**Multi-tenant scale (Phase D):**
- 1000 trung tâm × 500 HS × 15K attendance/tháng = 7.5M record/tháng. Cần partitioning.

### 28.3. Optimization strategy

**Frontend:**
- Phase B: React.lazy + code splitting per route.
- Phase B: React Query cache.
- Phase C: prefetch on hover.

**Backend:**
- Connection pooling: Supabase pgbouncer (port 6543).
- Indexes (đã có).
- Phase B: cursor pagination cho list lớn.
- Phase D: read replicas.

**Database:**
- Phase B: thêm index cho `Attendance(attendanceDate, classId)` cho query monthly aggregate.
- Phase D: archive old data (Receipt > 2 năm) vào cold storage.

---

## 29. Deployment & DevOps

### 29.1. Production deployment (Vercel)
- Branch `main` → auto-deploy.
- Pull request → preview deployment với URL riêng.
- Branch `claude/review-edu-manager-repo-Gf9FJ` (PR#1) hiện tại → preview tại `edu-manager-git-claude-review-15bd54-hts2008s-projects-2164604d.vercel.app`.

### 29.2. Build pipeline (Vercel)
```
1. installCommand: npm install && cd frontend && npm install
2. buildCommand: npx prisma generate && cd frontend && npm run build
3. outputDirectory: frontend/dist
4. Vercel detect functions trong api/ → compile TS → bundle Node 20
5. Deploy
```

### 29.3. Alternative: Docker (chưa dùng prod)
- `docker-compose.yml` build: Express + Nginx + Volume cho SQLite.
- Phase B–D có thể dùng nếu chuyển sang Option B.

### 29.4. Environment variables

**Production (Vercel dashboard):**
| Key | Required | Mô tả |
|---|---|---|
| `DATABASE_URL` | ✅ | Supabase pooler URL (port 6543) |
| `DIRECT_URL` | ✅ | Supabase direct URL (port 5432, cho migration) |
| `JWT_SECRET` | ✅ | Random ≥ 32 ký tự |
| `JWT_EXPIRES_IN` | ⚠️ optional | Default `24h` |
| `SUPABASE_URL` | Phase A | https://<project>.supabase.co |
| `SUPABASE_SERVICE_KEY` | Phase A | Service role key (server-only) |
| `SUPABASE_BUCKET` | Phase A | `template-images` |
| `SENTRY_DSN` | Phase B | DSN cho error tracking |
| `NODE_ENV` | ✅ | `production` |

**Local (`.env`):**
- Trong `.env.example` có mẫu; dev tự copy thành `.env`.
- Express dev không cần `DATABASE_URL` (dùng SQLite file).

### 29.5. Disaster recovery
- Supabase free tier: PITR (point-in-time recovery) 7 ngày.
- Phase C: thêm cron weekly export DB → Google Drive.
- Phase C: backup script `npm run db:backup` chạy thủ công.

### 29.6. Rollback strategy
- Vercel: revert deployment qua dashboard 1 click.
- DB: nếu migration fail → `prisma migrate resolve` + restore PITR.

---

## 30. Local development setup

### 30.1. Prerequisites
- Node.js ≥ 20
- npm ≥ 9
- Git
- (Tuỳ chọn) Docker cho production-like setup
- (Windows) start.bat / stop.bat / backup.bat scripts

### 30.2. Quick start

```
# Clone repo
git clone https://github.com/hts2008/edu_manager_v2.git
cd edu_manager_v2

# Install deps
cd backend && npm install
cd ../frontend && npm install
cd ..
npm install        # root, cho Prisma + Vercel CLI

# Initialize SQLite + seed
cd backend
npm run db:migrate
npm run db:seed

# Start cả 2 server
cd ..
./start.bat        # Windows; manual cho macOS/Linux:
# Terminal 1: cd backend && npm run dev
# Terminal 2: cd frontend && npm run dev

# Browser → http://localhost:3000
# Login: admin / admin123
```

### 30.3. Vercel-like local dev (parity production)

```
# Trong root
npm install -g vercel
vercel link            # link với project Vercel
vercel env pull        # tải .env từ Vercel
vercel dev             # chạy frontend + serverless functions trên port 3000

# DB: trỏ DATABASE_URL sang Supabase staging branch (nếu có)
```

---

## 31. Code organization & Conventions

### 31.1. File naming
- **React components:** PascalCase, `.jsx` (e.g. `StudentsPage.jsx`).
- **Vercel API:** lowercase + dash, `.ts` (e.g. `monthly-fees/index.ts`).
- **Express routes:** lowercase + dash, `.js` (e.g. `monthly-fees.js`).
- **Utility lib:** lowercase, `.ts` cho Vercel `.js` cho Express.

### 31.2. Code style
- ESLint config trong `frontend/.eslintrc` (cần audit).
- Tailwind class order: layout → spacing → color → state.
- Vietnamese comments khi cần giải thích domain knowledge (ví dụ tính học phí học bù).

### 31.3. Commit conventions
- Format: `type(scope): description` (Conventional Commits — không strict).
- Types observed: `feat`, `fix`, `docs`, `chore`, `refactor`.
- Examples từ git log:
  - `feat(attendance): add review modal before approving`
  - `fix: add .js extensions to ES module imports for Vercel`
  - `docs: README and KANBAN`

### 31.4. Branch strategy
- `main` — production branch (auto-deploy).
- Feature branches: `claude/review-edu-manager-repo-Gf9FJ`, `feature/xxx`, `fix/xxx`.
- Phase B đề xuất: protected `main`, require PR review + CI green.

---

## 32. Multi-agent dev framework

Repo có **multi-agent AI development framework** đặc trưng — không phải chỉ là code dự án, mà còn là context cho AI agents (Claude, Gemini, Copilot) cùng làm việc:

### 32.1. Cấu trúc framework
```
.agent/
├── ORCHESTRATOR.instructions.md     # Quy trình phối hợp
├── agents/                           # 17 agent role definitions
│   ├── solution_architect.agent.md
│   ├── tech_lead.agent.md
│   ├── fullstack_engineer.agent.md
│   ├── backend_engineer.agent.md
│   ├── frontend_engineer.agent.md
│   ├── qa_engineer.agent.md
│   ├── devops_engineer.agent.md
│   ├── researcher.agent.md           # v3.0
│   ├── brainstormer.agent.md         # v3.0
│   ├── scout.agent.md                # v3.0
│   ├── git_manager.agent.md          # v3.0
│   ├── docs_manager.agent.md         # v3.0
│   └── ...
├── workflows/                        # 10 workflow definitions
│   ├── feature_development.md
│   ├── bug_fix.md
│   ├── code_review.md
│   ├── deployment.md
│   └── ...
└── protocols/

.shared/
├── knowledge_base/
│   ├── architecture/
│   ├── bugs/                         # Bug registry
│   ├── lessons_learned/
│   └── ui_ux_patterns/
├── tech_stacks/
│   └── TECH_STACK_CATALOG.md
└── memory/

CLAUDE.md   ← Context cho Claude Code
GEMINI.md   ← Context cho Gemini agents
COPILOT.md  ← Context cho GitHub Copilot
```

### 32.2. Quy ước làm việc
- Mỗi session AI bắt đầu: đọc `PROJECT_CONTEXT.md` + `KANBAN.md`.
- Mỗi agent có role-specific instructions.
- Bug log + lessons learned dồn vào `.shared/knowledge_base/`.
- KANBAN dashboard hiển thị progress realtime (`dashboard.html` + endpoint `/api/kanban`).

### 32.3. Lợi ích
- Có thể swap agent (Claude ↔ Gemini ↔ Copilot) mà không mất context.
- Dev mới (con người) có roadmap rõ.
- Documentation tự động hơn.

### 32.4. Nhược điểm
- Overhead documentation lớn.
- Trùng lặp giữa CLAUDE.md / GEMINI.md / COPILOT.md.

---

# Phần V — Quality & Operations

## 33. NFR matrix

| Thuộc tính | Yêu cầu | Hiện tại | Phase B target |
|---|---|---|---|
| **Availability** | 99.5% uptime | Phụ thuộc Vercel SLA | Sentry alert + status page |
| **Performance — page load** | LCP < 2.5s | Chưa đo | < 2s |
| **Performance — API** | p95 < 500ms | Chưa đo | OK |
| **Scalability** | 1000 trung tâm × 500 HS | Chưa stress test | Architecture sẵn sàng |
| **Security — Auth** | JWT 24h + bcrypt 10 | OK | + rate limit |
| **Security — Input** | Validate mọi endpoint | Thủ công, không đồng nhất | Zod centralized |
| **Reliability** | 0% data loss | OK (Postgres ACID) | + audit log middleware |
| **Maintainability** | Code dễ đọc | Trung bình | TypeScript everywhere |
| **Testability** | Có test | Không có | Vitest + Supertest + Playwright |
| **Usability** | Lễ tân onboard < 30 phút | Tốt (UI rõ ràng) | + tooltip + onboarding wizard |
| **Accessibility** | WCAG AA | Chưa kiểm | axe-core audit |
| **Localization** | VI 100% | OK | i18n lib (cho EN tương lai) |
| **Data integrity** | Constraint đầy đủ | OK | + soft-delete |
| **Observability** | Logs + metrics + traces | Console.log | Sentry + structured logs |
| **Privacy** | PII bảo vệ | Cơ bản | + GDPR-style consent (Phase D) |

---

## 34. Testing strategy

### 34.1. Hiện tại
- ❌ Không có unit test.
- ❌ Không có integration test.
- ❌ Không có E2E test.
- Chỉ có manual smoke test thủ công.

### 34.2. Phase B target

**Test pyramid:**
```
              ┌──────────┐
              │   E2E    │  6 spec, ~5% test count
              │ Playwright│
              └────┬─────┘
              ┌────┴─────────┐
              │ Integration  │  ~25% test count
              │  Supertest   │
              └────┬─────────┘
              ┌────┴────────────┐
              │     Unit        │  ~70% test count
              │    Vitest       │
              └─────────────────┘
```

**E2E specs (Phase B):**
1. `auth.spec.ts` — login + logout + change password.
2. `student-flow.spec.ts` — onboarding 5 bước.
3. `attendance.spec.ts` — mark + submit period.
4. `fee-collection.spec.ts` — calculate + confirm + pay + Receipt PDF.
5. `payment.spec.ts` — tạo phiếu chi.
6. `report.spec.ts` — Reports/Financial + Unpaid.

**Integration specs:**
- Một file per Vercel function, gọi với fake JWT, kiểm response shape + DB state.

**Unit specs:**
- Pure logic functions: `calculateFee`, `validatePhone`, `formatCurrency`, …

### 34.3. CI gate (Phase B)
```
GitHub Actions on PR:
  1. checkout
  2. npm install (root + frontend)
  3. npx prisma generate
  4. npm run lint     ← FE + lib + api
  5. npx tsc --noEmit ← typecheck Vercel functions
  6. cd frontend && npm run build
  7. npx playwright test --project=smoke
  8. fail nếu bất kỳ step fail
```

---

## 35. Monitoring & Observability

### 35.1. Hiện tại
- Vercel function logs (chỉ console.log, không cấu trúc).
- Browser console cho FE.
- Không có metric / trace / alert.

### 35.2. Phase B
- **Sentry** (FE + BE):
  - DSN qua env var.
  - Capture error + breadcrumb.
  - Source map upload.
  - Alert qua Slack / email.
- **Pino logger** (BE):
  - Cấu trúc JSON.
  - Log level configurable.
  - Vercel logs vẫn hoạt động.
- **Custom dashboard** (Phase C):
  - Số request/min, error rate, p95.

### 35.3. SLO đề xuất (Phase C)
| Metric | SLO | Error budget |
|---|---|---|
| Login success rate | 99.9% | 4 phút/tháng |
| Receipt PDF gen success | 99.5% | 22 phút/tháng |
| Page load p95 | < 2.5s | — |
| API p95 | < 500ms | — |

---

## 36. Backup & Disaster Recovery

### 36.1. Hiện tại
- **Production DB:** Supabase free tier — PITR 7 ngày.
- **Local SQLite:** `backup.bat` copy file thủ công.
- **Code:** GitHub remote.
- **Logo / template ảnh:** Phase A sẽ lưu Supabase Storage; bucket có versioning?

### 36.2. Phase C cải tiến
- Cron weekly `pg_dump` → upload lên Google Drive / Cloudflare R2.
- Email notification cho admin khi backup thành công / thất bại.
- Test restore drill mỗi quý.

### 36.3. RTO / RPO target
| Sự cố | RTO (Recovery Time) | RPO (data loss tolerance) |
|---|---|---|
| Vercel down | 5 phút (statuspage) | 0 |
| Supabase down | < 1 giờ | < 5 phút (Supabase replica) |
| Mất data do human error | < 4 giờ | < 24 giờ (PITR) |
| Code bug → bad data | < 1 giờ | 0 (rollback + restore) |

---

## 37. Compliance & Privacy

### 37.1. Pháp lý VN
- **Luật bảo vệ dữ liệu cá nhân (Nghị định 13/2023):** Yêu cầu thu thập consent, mục đích rõ ràng, quyền truy cập + xoá. Phase D cần audit.
- **Luật quản lý thuế:** Biên lai có MST phải lưu ≥ 5 năm; format đúng thông tư.
- **Luật giáo dục:** Tự chủ kinh doanh; không có quy định bắt buộc cụ thể cho phần mềm trung tâm dạy thêm.

### 37.2. Privacy by design
- **Data minimization:** chỉ thu thập field cần thiết.
- **Consent:** chủ trung tâm khi tạo Student phải cam kết được phép xử lý PII của trẻ. (Có thể bổ sung TOS).
- **Right to erasure:** Phase C có recycle bin + permanent delete cho admin.
- **Right to access:** Phase C parent portal cho phụ huynh tự xem dữ liệu của con.

### 37.3. Children data (đặc thù)
Học sinh đa phần là trẻ vị thành niên → dữ liệu nhạy cảm hơn người lớn. Phase D nếu mở rộng region (Singapore, Malaysia) cần tuân thủ COPPA / PDPA.

---

# Phần VI — Phụ lục

## 38. Glossary

| Thuật ngữ | English | Mô tả |
|---|---|---|
| Trung tâm dạy thêm | Tutoring center | Khách hàng target |
| Lễ tân | Receptionist | User chính của app |
| Học viên / Học sinh | Student | Đơn vị quản lý |
| Phụ huynh | Parent / Guardian | Người chịu trách nhiệm pháp lý + đóng phí |
| Lớp học | Class | Một lớp, có teacher + schedule + fee |
| Buổi học | Session | Một buổi thực tế trong tuần |
| Điểm danh | Attendance | Bản ghi present/absent |
| Kỳ điểm danh | Attendance Period | Tổ hợp (lớp, tháng) với workflow |
| Chốt điểm danh | Lock period | Approve + Lock workflow |
| Học bù | Make-up class | Buổi học thay buổi nghỉ; `isMakeUp = true` |
| Học phí | Tuition / Fee | Số tiền HS đóng |
| Học phí tháng | Monthly Fee | Lifecycle pending → ready → confirmed → paid |
| Phiếu thu | Receipt | Bằng chứng thu tiền học phí |
| Phiếu chi | Payment | Bằng chứng chi tiền (lương, điện nước, …) |
| Mẫu in | Template | Cấu hình PDF tuỳ biến (Fabric.js JSON) |
| Mẫu mặc định | Default template | Template áp dụng tự động khi gen PDF |
| Lương theo giờ | Hourly salary | Salary type = hourly |
| Lương cố định | Fixed salary | Salary type = fixed (theo tháng) |
| MST | Tax ID | Mã số thuế của trung tâm |
| Realtime | Realtime | Số liệu cập nhật ngay, không đợi tổng kết |
| SAP timesheet | SAP-style workflow | Open → Submitted → Approved → Locked |
| Multi-tenant | Multi-tenant | 1 deployment cho nhiều khách hàng (Phase D) |

---

## 39. Tham chiếu file paths

### 39.1. Documentation
- `README.md` — quick start, tech stack overview.
- `PROJECT_CONTEXT.md` — current phase, deployment.
- `KANBAN.md` — task board (cần sync sự thật).
- `CLAUDE.md`, `GEMINI.md`, `COPILOT.md` — multi-agent context.
- `docs/USER_GUIDE_VI.md` — user manual tiếng Việt.
- `docs/playbook_vi/` — multi-agent playbook (10 file).
- `docs/PRD_CURRENT_STATE.md` — PRD hiện trạng (companion).
- `docs/PRD_KANBAN_SOLUTION.md` — solution roadmap (companion).
- `docs/PRD_EDU_MANAGER_V2.md` — file này.

### 39.2. Schema & Data
- `prisma/schema.prisma` — canonical schema.
- `prisma/seed.ts` — seed script.
- `backend/src/database/schema.sql` — SQLite schema (sẽ deprecate).

### 39.3. Backend code
- `backend/src/server.js` — Express entry.
- `backend/src/routes/*.js` — 13 route files.
- `backend/src/middleware/*.js` — auth, logger, errorHandler.
- `backend/src/services/pdfService.js` — PDF gen logic.
- `api/**/*.ts` — Vercel functions (port từ Express).
- `lib/prisma.ts` — Prisma singleton.
- `lib/auth.ts` — JWT helpers.

### 39.4. Frontend code
- `frontend/src/App.jsx` — router config.
- `frontend/src/pages/*.jsx` — 15 page components.
- `frontend/src/components/{layout,ui,auth}/*.jsx` — reusable components.
- `frontend/src/context/AuthContext.jsx` — auth state.
- `frontend/src/services/api.js` — API service abstraction.

### 39.5. DevOps
- `vercel.json` — Vercel deployment config.
- `docker-compose.yml` — alternative Docker stack.
- `package.json` (root) — Vercel + Prisma scripts.
- `.env.example` — env template.
- `start.bat`, `stop.bat`, `backup.bat`, `restore.bat`, `start-docker.bat` — Windows scripts.

---

## 40. Decision log

| Date | Decision | Rationale | Người quyết |
|---|---|---|---|
| Initial | React + Vite (không Next.js) | Admin tool, không cần SSR | Founder |
| Initial | Tailwind v4 | Speed of development | Founder |
| Initial | Express + SQLite cho local dev | Zero-config | Founder |
| Initial | Vercel Serverless cho prod | Free tier, auto-deploy | Founder |
| Initial | Supabase PostgreSQL | Managed, có Auth + Storage tích hợp | Founder |
| Initial | Prisma cho production, raw SQL cho local | Trade-off speed vs single source | Founder |
| Initial | JWT custom (không Auth0/Clerk) | Control + free | Founder |
| Initial | pdfmake (không Puppeteer) | Pure JS, dễ trên serverless | Founder |
| Initial | Fabric.js cho template designer | Mature, serialize JSON tốt | Founder |
| 2026-04-26 | Chọn Option A (Port Express → Vercel) cho Phase A | TTV nhanh, low risk | TBD (founder approve) |
| 2026-04-26 | Phase A dùng client-only logout | Đơn giản; Phase B sẽ thêm Redis blacklist | Plan agent |
| 2026-04-26 | Upload ảnh template chuyển sang base64 JSON | Multipart trên Vercel phức tạp | Plan agent |
| 2026-04-26 | Phase B sẽ deprecate Express khỏi prod-flow | Single source of truth | Plan agent |

---

## Lời kết

**Edu Manager V2** là một sản phẩm có tham vọng rõ ràng — số hoá ngành dạy thêm Việt Nam — và đã có **nền tảng kỹ thuật vững** (schema chất lượng, UI hoàn chỉnh, dual deployment). Tuy nhiên, sản phẩm hiện đang ở giai đoạn **"hứa nhiều, chứng minh ít"**: tài liệu nội bộ tuyên bố hoàn thành 100% nhưng production thực tế chỉ ~50–60%.

**Đường đi tiếp theo rõ ràng:**
1. **Phase A (1–2 tuần):** Port API thiếu, đưa production lên 100% usable.
2. **Phase B (2–4 tuần):** Củng cố chất lượng (tests, CI, validation, monitoring).
3. **Phase C (4–8 tuần):** Mở rộng giá trị (parent portal, SMS, cron, audit UI).
4. **Phase D (2+ tháng):** Tăng trưởng (multi-tenant, mobile, online payment, AI).

Tài liệu chi tiết kế hoạch giải pháp: xem `docs/PRD_KANBAN_SOLUTION.md`.

---

**Hết PRD.** Mọi câu hỏi về tài liệu, vui lòng tham khảo các file trong `docs/` hoặc liên hệ owner sản phẩm.











