# Edu Manager V2 — Design System & UI Guideline

> **Bộ guideline thiết kế UI/UX hoàn chỉnh** — hướng dẫn từ design philosophy, tokens, component, motion, đến prompt cho Stitch / Figma AI và quy ước cho AI IDE.
> Đối tượng đọc: Product Designer, Frontend Engineer, AI Agent (Stitch, Figma AI, Claude Code, Cursor, Windsurf).

| Trường | Giá trị |
|---|---|
| Sản phẩm | Edu Manager V2 |
| Phiên bản design system | 1.0 (foundation) |
| Design language | **EduFlow** (codename) |
| Tone & aesthetic | Modern · Motion-rich · Premium · Youthful |
| Inspiration | motionsites.ai · Linear · Vercel · Stripe · Arc Browser · Cron |
| Ngày lập | 2026-04-26 |
| Repository | https://github.com/hts2008/edu_manager_v2 |

---

## Mục lục

**Phần A — Định hướng thiết kế**
1. [Design Philosophy](#1-design-philosophy)
2. [Brand Identity](#2-brand-identity)
3. [Voice & Tone](#3-voice--tone)

**Phần B — Design Tokens**
4. [Color System](#4-color-system)
5. [Typography](#5-typography)
6. [Spacing, Layout & Grid](#6-spacing-layout--grid)
7. [Elevation, Shadow, Radius](#7-elevation-shadow-radius)
8. [Iconography](#8-iconography)
9. [Imagery & Illustration](#9-imagery--illustration)

**Phần C — Motion System**
10. [Motion Philosophy & Easing](#10-motion-philosophy--easing)
11. [Choreography & Patterns](#11-choreography--patterns)
12. [Micro-interactions](#12-micro-interactions)
13. [Page Transitions](#13-page-transitions)
14. [Scroll-driven Animations (motionsites style)](#14-scroll-driven-animations-motionsites-style)

**Phần D — Component Library**
15. [Buttons & Actions](#15-buttons--actions)
16. [Forms & Inputs](#16-forms--inputs)
17. [Cards & Surfaces](#17-cards--surfaces)
18. [Modals & Drawers](#18-modals--drawers)
19. [Tables & Lists](#19-tables--lists)
20. [Navigation (Sidebar / Header / Breadcrumb)](#20-navigation-sidebar--header--breadcrumb)
21. [Toasts, Tooltips, Popovers](#21-toasts-tooltips-popovers)
22. [Badges, Tags, Pills](#22-badges-tags-pills)
23. [Tabs, Stepper, Pagination](#23-tabs-stepper-pagination)
24. [Empty States & Skeletons](#24-empty-states--skeletons)
25. [Charts & Data Viz](#25-charts--data-viz)

**Phần E — Page Templates**
26. [Login & Onboarding](#26-login--onboarding)
27. [Dashboard](#27-dashboard)
28. [List Page (CRUD)](#28-list-page-crud)
29. [Attendance Grid](#29-attendance-grid)
30. [Fee Collection](#30-fee-collection)
31. [Receipt / Payment](#31-receipt--payment)
32. [Reports](#32-reports)
33. [Templates Designer (Fabric.js)](#33-templates-designer-fabricjs)
34. [Settings](#34-settings)

**Phần F — Accessibility & Quality**
35. [Accessibility (WCAG AA)](#35-accessibility-wcag-aa)
36. [Responsive Strategy](#36-responsive-strategy)
37. [Dark Mode](#37-dark-mode)
38. [Vietnamese Typography & Format](#38-vietnamese-typography--format)

**Phần G — Tooling & AI Handoff**
39. [Figma Workflow & AI Prompts](#39-figma-workflow--ai-prompts)
40. [Stitch (Google Stitch) Workflow & Prompts](#40-stitch-google-stitch-workflow--prompts)
41. [AI IDE Handoff (Cursor / Windsurf / Claude Code)](#41-ai-ide-handoff-cursor--windsurf--claude-code)
42. [Tailwind Config & CSS Variables](#42-tailwind-config--css-variables)
43. [Framer Motion Patterns](#43-framer-motion-patterns)
44. [Design Tokens (machine-readable JSON)](#44-design-tokens-machine-readable-json)

**Phần H — Phụ lục**
45. [Component Checklist](#45-component-checklist)
46. [Page Inventory Checklist](#46-page-inventory-checklist)
47. [Quality Gates](#47-quality-gates)

---

# Phần A — Định hướng thiết kế

## 1. Design Philosophy

### 1.1. Tinh thần thiết kế: **"Calm Productivity meets Vibrant Energy"**

Edu Manager V2 không phải landing page hào nhoáng cũng không phải SaaS B2B khô khan. Đối tượng dùng chính: **lễ tân trẻ 22–35 tuổi** (làm việc nhiều giờ, áp lực giờ cao điểm) và **chủ trung tâm 35–55** (cần thấy số liệu rõ ràng). Vì vậy:

- **Calm** — dữ liệu nhiều, thao tác lặp lại nhiều → không gây mỏi mắt. Background nhẹ, contrast vừa đủ.
- **Productivity** — mỗi click < 200ms feedback. Không "câu giờ" bằng animation thừa.
- **Vibrant** — primary color rực rỡ, gradient có chiều sâu. Không đơn điệu xám trắng kiểu Notion.
- **Energy** — motion mượt mà, có chủ đích. Lấy cảm hứng từ **motionsites.ai**, **Linear**, **Arc Browser**, **Cron Calendar**.

### 1.2. Bảy nguyên tắc thiết kế (Design Principles)

1. **Speed over decoration.** Animation chỉ tồn tại nếu phục vụ feedback / trạng thái. Không animation chỉ để "đẹp".
2. **Hierarchy by motion.** Element quan trọng có entrance animation; element phụ load ngay không hiệu ứng.
3. **One screen, one mission.** Mỗi page có 1 mục tiêu chính (primary action) — luôn nổi bật nhất.
4. **Predictable surprise.** Người dùng đoán được điều gì sẽ xảy ra khi click; nhưng cảm giác "đẹp ngoài mong đợi".
5. **Data first, chrome last.** Số liệu / dữ liệu được visualize tốt; UI chrome (border, decoration) tối giản hỗ trợ data.
6. **Touch + click parity.** Hit area ≥ 44×44px cho mọi action; tablet là priority sau desktop.
7. **Joyful, not childish.** Vibrant nhưng vẫn là tool công việc — không emoji decorative khắp nơi, không màu pastel mềm.

### 1.3. So sánh aesthetic

| Cảm hứng | Điều học | Điều **không** làm theo |
|---|---|---|
| **motionsites.ai** | Scroll-driven animation mượt, parallax tinh tế, magnetic hover | Hero section full-page (admin tool không cần) |
| **Linear** | Typography clarity, dark mode đẹp, keyboard-first | Quá tối giản, thiếu màu sắc |
| **Vercel Dashboard** | Bento grid card layout, monospace cho data | Engineering-only feel |
| **Stripe** | Số liệu được visualize chuyên nghiệp, layout grid chính xác | Quá conservative, thiếu motion |
| **Arc Browser** | Sidebar đẹp, glassmorphism, gradient mesh background | Quá experimental |
| **Cron Calendar** | Day-grid điểm danh / timesheet đẹp, smooth transitions | — |
| **Framer landing pages** | Motion-rich, demo-able | — |

### 1.4. Cá tính sản phẩm (Product personality)

Nếu Edu Manager là một con người: **một bạn trẻ năng động làm cố vấn vận hành cho trung tâm dạy thêm — vừa chuyên nghiệp khi báo cáo cho sếp, vừa thân thiện khi nói chuyện với phụ huynh, vừa nhanh nhẹn khi giờ cao điểm.**

Adjectives: `năng động · gọn gàng · tin cậy · hiện đại · thân thiện · sắc nét`.

NOT: `nhí nhảnh · ngẫu hứng · enterprise nặng nề · institutional khô khan`.

---

## 2. Brand Identity

### 2.1. Logo direction

**Logo concept đề xuất:** Chữ "E" cách điệu hoặc icon book + spark, với gradient primary.

**Logo lockup:**
```
   ┌─────┐
   │  E  │  EduFlow         (font: Plus Jakarta Sans Bold)
   └─────┘  Manager          (font: Inter Medium, color: slate-500)
```

**Sizing:**
- App icon (favicon): 32×32, 16×16
- Sidebar logo: 40×40 icon + wordmark (collapsed: chỉ icon)
- Login page hero: 80×80
- Email header: 120px width

**Clear space:** xung quanh logo ít nhất 50% chiều cao icon.

**Variations:**
- Full color (primary gradient on white/dark)
- Mono dark (slate-900 on light)
- Mono light (white on dark)
- Outline (cho thermal print 80mm)

### 2.2. Brand colors (xem chi tiết §4)

- **Primary** (Indigo / Violet gradient): `#6366F1` → `#8B5CF6` → đại diện cho "modern, vibrant, intellectual".
- **Accent** (Cyan / Teal): `#06B6D4` — cho data viz + secondary CTA.
- **Background** mặc định: white slate-50 (light) / slate-950 (dark).

### 2.3. Brand voice trong UI text (xem §3 Voice & Tone)

---

## 3. Voice & Tone

### 3.1. Vietnamese tiếng Việt thân thiện chuyên nghiệp

- **Xưng hô:** "bạn" với lễ tân (không "anh/chị" cứng nhắc), "Quý khách" với phụ huynh trong biên lai PDF.
- **Câu cú:** ngắn, chủ động. Tránh thụ động dài dòng.
- **Emoji:** chỉ dùng trong status badge + empty state illustration. Không emoji trong button label.

### 3.2. Microcopy patterns

| Tình huống | Wording đúng | Tránh |
|---|---|---|
| Button save | "Lưu" hoặc "Lưu học viên" | "Save" / "Submit form" |
| Loading | "Đang tải..." | "Loading..." |
| Empty list | "Chưa có học viên nào. Thêm học viên đầu tiên →" | "No data" |
| Error 404 | "Không tìm thấy trang bạn cần. Quay lại trang chủ →" | "Not found" |
| Confirm delete | "Xoá học viên này? Hành động không thể hoàn tác." | "Are you sure?" |
| Success | "Đã lưu thành công" + toast 3s | Alert popup |
| Validation | "Số điện thoại phải có 10 chữ số" | "Invalid phone" |
| Timeout | "Yêu cầu quá thời gian, vui lòng thử lại" | "Request timed out" |
| Permission | "Bạn không có quyền truy cập tính năng này" | "403 Forbidden" |
| Maintenance | "Hệ thống đang bảo trì, sẽ quay lại lúc 22:00" | "Service unavailable" |

### 3.3. Punctuation & format VN
- Dấu chấm phẩy: phẩy hằng số tiền dùng `.` (1.234.567đ), phân tách số thập phân dùng `,` (1,5 giờ).
- Không dùng "₫" — dùng "đ" hậu tố.
- Ngày: `DD/MM/YYYY` (e.g. 26/04/2026), không `MM/DD/YYYY`.
- Giờ: `HH:mm` 24h (e.g. 19:30), không AM/PM.
- Tuần: `T2, T3, T4, T5, T6, T7, CN`.

---

# Phần B — Design Tokens

## 4. Color System

### 4.1. Triết lý màu

- **Tone chính (Primary):** Indigo–Violet (modern, intellectual, energetic — phù hợp education + tech).
- **Tone phụ (Accent):** Cyan–Teal (cho data viz, secondary CTA, charts).
- **Neutral:** Slate (warm-cool balance, đọc lâu không mỏi mắt).
- **Semantic:** Emerald (success), Amber (warning), Rose (error), Sky (info).
- **Gradient:** mesh + linear cho hero / dashboard accent.

### 4.2. Token palette đầy đủ

#### Primary — Indigo
```
primary-50   #EEF2FF   ─ ultra light bg
primary-100  #E0E7FF   ─ subtle hover bg
primary-200  #C7D2FE   ─ disabled state
primary-300  #A5B4FC   ─ hover border
primary-400  #818CF8   ─ secondary text
primary-500  #6366F1   ─ DEFAULT — primary brand
primary-600  #4F46E5   ─ hover state
primary-700  #4338CA   ─ active / pressed
primary-800  #3730A3   ─ dark mode accent
primary-900  #312E81   ─ darkest
primary-950  #1E1B4B   ─ deepest contrast
```

#### Accent — Violet (hỗ trợ gradient)
```
violet-500   #8B5CF6   ─ gradient end
violet-600   #7C3AED   ─ accent CTA
violet-400   #A78BFA   ─ chart fill
```

#### Secondary — Cyan
```
cyan-50    #ECFEFF
cyan-400   #22D3EE
cyan-500   #06B6D4   ─ data viz primary
cyan-600   #0891B2
```

#### Neutral — Slate (background + text)
```
slate-50   #F8FAFC   ─ light bg DEFAULT
slate-100  #F1F5F9   ─ subtle bg
slate-200  #E2E8F0   ─ border light
slate-300  #CBD5E1   ─ divider
slate-400  #94A3B8   ─ placeholder text
slate-500  #64748B   ─ secondary text
slate-600  #475569   ─ body text DEFAULT (dark on light)
slate-700  #334155   ─ heading
slate-800  #1E293B   ─ heading bold
slate-900  #0F172A   ─ darkest text / sidebar bg
slate-950  #020617   ─ deepest dark bg
```

#### Semantic
```
success-50   #ECFDF5   success bg subtle
success-500  #10B981   success DEFAULT
success-600  #059669   success hover

warning-50   #FFFBEB
warning-500  #F59E0B
warning-600  #D97706

error-50     #FFF1F2
error-500    #F43F5E
error-600    #E11D48

info-50      #F0F9FF
info-500     #0EA5E9
info-600     #0284C7
```

### 4.3. Gradient tokens

```
gradient-primary       linear 135deg, #6366F1 0%, #8B5CF6 100%
gradient-primary-soft  linear 135deg, #E0E7FF 0%, #EDE9FE 100%
gradient-accent        linear 135deg, #06B6D4 0%, #6366F1 100%
gradient-success       linear 135deg, #10B981 0%, #06B6D4 100%
gradient-warning       linear 135deg, #F59E0B 0%, #F43F5E 100%
gradient-mesh-1        radial bg with primary + violet + cyan blobs (cho hero / dashboard)
gradient-shimmer       linear 90deg, transparent, white/20, transparent (cho skeleton)
```

**Sample CSS:**
```css
.bg-gradient-primary {
  background: linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%);
}
.bg-gradient-mesh-1 {
  background:
    radial-gradient(at 20% 30%, #6366F1 0%, transparent 50%),
    radial-gradient(at 80% 70%, #8B5CF6 0%, transparent 50%),
    radial-gradient(at 50% 50%, #06B6D4 0%, transparent 60%);
}
```

### 4.4. Color usage rules

| Use case | Token |
|---|---|
| Page background | slate-50 (light) / slate-950 (dark) |
| Card surface | white (light) / slate-900 (dark) |
| Border default | slate-200 / slate-800 |
| Body text | slate-600 / slate-300 |
| Heading text | slate-800 / slate-100 |
| Primary button bg | gradient-primary OR primary-500 |
| Primary button hover | primary-600 |
| Primary button text | white |
| Secondary button bg | slate-100 / slate-800 |
| Link | primary-600 / primary-400 |
| Focus ring | primary-500 with `ring-2 ring-offset-2` |
| Success state | success-500 |
| Sidebar bg | slate-900 with `backdrop-blur` |
| Sidebar active item | gradient-primary với glow |

### 4.5. Contrast & accessibility
- Body text trên bg: ≥ 4.5:1 (WCAG AA).
- Heading + UI text lớn: ≥ 3:1.
- Test bằng axe DevTools hoặc https://webaim.org/resources/contrastchecker/.

---

## 5. Typography

### 5.1. Font family

**Primary (UI):** `Plus Jakarta Sans` — modern geometric sans-serif, có diacritics tiếng Việt đẹp.
**Heading display (optional):** `Plus Jakarta Sans` (same) — Bold/ExtraBold weights.
**Monospace (data, code, numbers in tables):** `JetBrains Mono` — clear digits, ligatures off.

**Fallback stack:**
```
font-family:
  'Plus Jakarta Sans',
  'Inter',
  -apple-system, BlinkMacSystemFont,
  'Segoe UI', system-ui, sans-serif;

font-family-mono:
  'JetBrains Mono',
  'Fira Code',
  ui-monospace, SFMono-Regular, monospace;
```

**Tải font:**
- Self-host từ Google Fonts qua `@fontsource/plus-jakarta-sans` (subset `latin-ext` + `vietnamese`).
- Preload `Plus Jakarta Sans 400 + 600 + 700` trong `<head>`.

### 5.2. Type scale (semantic, not pixel)

| Token | Size | Line | Weight | Use case |
|---|---|---|---|---|
| `text-display-2xl` | 60px / 4.5rem | 1.0 | 800 | Hero login, marketing only |
| `text-display-xl` | 48px / 3rem | 1.05 | 800 | Section hero |
| `text-display-lg` | 36px / 2.25rem | 1.1 | 700 | Page hero on dashboard |
| `text-h1` | 30px / 1.875rem | 1.2 | 700 | Page title |
| `text-h2` | 24px / 1.5rem | 1.25 | 600 | Section title |
| `text-h3` | 20px / 1.25rem | 1.3 | 600 | Card title |
| `text-h4` | 18px / 1.125rem | 1.35 | 600 | Subsection |
| `text-body-lg` | 18px | 1.55 | 400 | Lead paragraph |
| `text-body` | 16px / 1rem | 1.5 | 400 | Body default |
| `text-body-sm` | 14px / 0.875rem | 1.5 | 400 | Secondary text, table cells |
| `text-caption` | 12px / 0.75rem | 1.4 | 500 | Helper, label, timestamp |
| `text-overline` | 11px | 1.3 | 600 + tracking 0.05em + uppercase | Tags, eyebrow |
| `text-mono-lg` | 16px mono | 1.4 | 500 | Big numbers (amount, count) |
| `text-mono` | 14px mono | 1.5 | 400 | IDs, codes |

### 5.3. Letter spacing & line height notes
- VN có dấu nên line-height **không < 1.5** cho body để tránh chồng dấu.
- Tracking display: `-0.02em` (tighter, modern feel).
- Tracking body: default (0).
- Tracking overline: `+0.05em`.

### 5.4. Font weight policy
- 300 (Light): KHÔNG dùng (đọc khó trên VN diacritics).
- 400 (Regular): body.
- 500 (Medium): emphasized body, label.
- 600 (Semibold): heading nhỏ, button.
- 700 (Bold): heading lớn, page title.
- 800 (ExtraBold): display chỉ trên login + dashboard hero.

### 5.5. Số (Numerals)
- Numbers trong table: dùng `font-variant-numeric: tabular-nums` để cột tiền canh lề.
- Big number trên Stat Card: `font-family-mono`, weight 600, size 36–48.

---

## 6. Spacing, Layout & Grid

### 6.1. Spacing scale (4pt base)

```
space-0    0px
space-px   1px      ─ hairline border
space-0.5  2px      ─ tiny gap
space-1    4px
space-1.5  6px
space-2    8px      ─ XS gap
space-2.5  10px
space-3    12px     ─ SM gap
space-4    16px     ─ DEFAULT gap
space-5    20px
space-6    24px     ─ MD gap (card padding)
space-8    32px     ─ LG gap (section)
space-10   40px
space-12   48px     ─ XL gap (page padding)
space-16   64px
space-20   80px
space-24   96px
```

### 6.2. Container & Layout

**Container widths:**
- `max-w-screen-sm` 640px — mobile
- `max-w-screen-md` 768px — tablet
- `max-w-screen-lg` 1024px — desktop
- `max-w-screen-xl` 1280px — large desktop
- `max-w-screen-2xl` 1536px — XL desktop
- Admin shell: full-width với sidebar fixed 240px (collapsed 64px).

**App shell grid:**
```
┌─ Sidebar 240px ─┐ ┌──────── Main 1 column ────────┐
│                 │ │  Header 64px                  │
│  Logo           │ ├───────────────────────────────┤
│  Nav items      │ │                               │
│  ...            │ │  Content padding p-8          │
│                 │ │  max-w-screen-2xl mx-auto     │
│                 │ │                               │
│  User badge     │ │                               │
└─────────────────┘ └───────────────────────────────┘
```

**Page content padding:** `p-6 lg:p-8 xl:p-10`.
**Card padding:** `p-6` default, `p-8` cho featured card.

### 6.3. Breakpoints

```
sm   640px   tablet portrait
md   768px   tablet landscape
lg   1024px  desktop small (sidebar appear)
xl   1280px  desktop default
2xl  1536px  desktop large
```

**Sidebar behavior:**
- `< lg`: hidden, mở qua hamburger overlay.
- `≥ lg`: fixed sticky, có thể collapse to 64px (icon only).

### 6.4. Z-index layers

```
z-0      base
z-10     sticky header
z-20     dropdown
z-30     toast container
z-40     modal backdrop
z-50     modal content
z-60     drawer
z-70     popover / tooltip
z-90     command palette (cmd+K)
z-100    page transition overlay
```

---

## 7. Elevation, Shadow, Radius

### 7.1. Border radius

```
rounded-none     0
rounded-sm       2px     hairline elements
rounded          6px     button default, input
rounded-md       8px     card small
rounded-lg       12px    card default
rounded-xl       16px    card featured, modal
rounded-2xl      24px    hero card
rounded-3xl      32px    decorative
rounded-full     9999px  avatar, pill, badge
```

### 7.2. Shadow tokens

```
shadow-xs    0 1px 2px rgba(15, 23, 42, 0.04)
shadow-sm    0 2px 4px rgba(15, 23, 42, 0.06), 0 1px 2px rgba(15, 23, 42, 0.04)
shadow       0 4px 12px rgba(15, 23, 42, 0.08), 0 1px 3px rgba(15, 23, 42, 0.05)
shadow-md    0 8px 24px rgba(15, 23, 42, 0.10), 0 2px 6px rgba(15, 23, 42, 0.06)
shadow-lg    0 16px 40px rgba(15, 23, 42, 0.12), 0 4px 12px rgba(15, 23, 42, 0.06)
shadow-xl    0 24px 60px rgba(15, 23, 42, 0.16), 0 8px 20px rgba(15, 23, 42, 0.08)
shadow-2xl   0 32px 80px rgba(15, 23, 42, 0.20)

shadow-glow-primary   0 0 0 4px rgba(99, 102, 241, 0.15), 0 8px 24px rgba(99, 102, 241, 0.25)
shadow-glow-success   0 0 0 4px rgba(16, 185, 129, 0.15), 0 8px 24px rgba(16, 185, 129, 0.25)
```

### 7.3. Glassmorphism (selective use)

Chỉ dùng cho: sidebar overlay mobile, modal backdrop, command palette, floating action.

```css
.glass {
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.3);
}
.glass-dark {
  background: rgba(15, 23, 42, 0.7);
  backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.1);
}
```

> **Lưu ý cập nhật scope (2026-04-26):** Đối tượng dùng là **quản lý + lễ tân** (làm việc nhiều giờ với dữ liệu). Vì vậy ưu tiên: **thẩm mỹ tinh tế + hài hoà + thân thiện + mượt mà + dễ chịu dùng lâu**. Tránh: animation gây phân tâm, contrast gắt, màu sặc sỡ rực rỡ.

---

## 8. Iconography

### 8.1. Bộ icon library

**Chọn:** **Lucide Icons** (https://lucide.dev) — bản fork của Feather Icons, hơn 1500 icon, stroke style nhất quán, tích hợp React tốt (`lucide-react`).

**Lý do chọn:**
- Stroke 1.5–2px, geometric clean — phù hợp tone "tinh tế chuyên nghiệp".
- Mỗi icon đều có biến `Outline` (default) và filled variants từ cộng đồng.
- License MIT, miễn phí thương mại.
- Hỗ trợ tree-shaking khi import từng icon riêng.

**Fallback:** Phosphor Icons (cho icon Lucide không có).

### 8.2. Quy ước sử dụng

| Tình huống | Size | Stroke | Color |
|---|---|---|---|
| Sidebar nav item | 20px | 2 | slate-400 (idle) / white (active) |
| Header button (top right) | 20px | 2 | slate-600 / slate-300 dark |
| Card title icon | 24px | 2 | primary-500 |
| Stat card icon (large) | 32px | 1.75 | gradient or solid primary |
| Table row action | 16px | 2 | slate-500, hover primary-600 |
| Form field prefix/suffix | 18px | 2 | slate-400 |
| Button icon | 16px (button-sm), 18px (button-md), 20px (button-lg) | 2 | inherit |
| Toast | 20px | 2 | tone-matching (success/warning/error/info) |
| Empty state illustration icon | 48–64px | 1.5 | slate-300 (subtle) |

### 8.3. Inventory icon thường dùng

```
Navigation
  LayoutDashboard, Users, UserRound, GraduationCap, School,
  CalendarDays, ClipboardCheck, ReceiptText, Wallet, BarChart3,
  FileText, Printer, Settings, LogOut

Actions
  Plus, Search, Filter, MoreHorizontal, MoreVertical,
  Edit, Trash2, Eye, Download, Upload, Copy, Share2,
  Check, X, ChevronRight, ChevronDown, ChevronLeft,
  ArrowRight, ArrowLeft, ArrowUpRight, RotateCcw

Status & semantic
  CheckCircle2, AlertCircle, AlertTriangle, Info, XCircle,
  Clock, CalendarClock, Loader2 (spin),
  CircleDot, CircleCheck, CircleX

Domain-specific
  BookOpen, Pencil, Bookmark, Award, Sparkles,
  CreditCard, Banknote, Coins, PiggyBank, TrendingUp, TrendingDown,
  Calendar, CalendarCheck, CalendarX2, Bell, MessageSquare,
  Image, FileImage, FileSpreadsheet, FilePdf

Utility
  Menu, X (close), Maximize2, Minimize2, Sun, Moon, Globe,
  Lock, Unlock, Key, Shield, Eye, EyeOff
```

### 8.4. Icon don'ts
- ❌ Không trộn icon từ nhiều thư viện (Lucide + Material + Bootstrap → rối).
- ❌ Không đổi stroke width giữa icon liền kề.
- ❌ Không decorate icon bằng emoji 🎉🚀💯 (giảm chuyên nghiệp).
- ❌ Không filled icon trong navigation (giữ outline cho idle state).
- ✅ Filled OK cho stat card / success state / hero illustration.

---

## 9. Imagery & Illustration

### 9.1. Photography rules

**Khi nào dùng ảnh:**
- Avatar người dùng (lễ tân, học sinh) — luôn round, ratio 1:1.
- Logo trung tâm (do user upload qua CenterSettings).
- KHÔNG dùng stock photo decorative trong app (admin tool, không phải landing page).

**Specs:**
- Avatar fallback: chữ initials trên gradient background (chữ first letter, max 2 ký tự).
- Logo trung tâm: SVG hoặc PNG transparent, max 500KB, recommended 200×200 hoặc tỷ lệ 1:1.
- Compress qua Squoosh hoặc upload qua Supabase Storage có auto-transform.

### 9.2. Illustration style

**Định hướng:** **isometric line + subtle color fills** — không cartoonish, không 3D realistic. Lấy cảm hứng từ Stripe illustrations + Linear empty states.

**Khi dùng:**
- Empty states (chưa có dữ liệu).
- Onboarding screens.
- Error pages (404, 500).
- Success milestones.

**Specs:**
- SVG only (no PNG).
- Max width: 320px trên desktop, 240px trên mobile.
- Color palette: dùng tokens (primary, accent, slate); không hardcode hex.
- Stroke + minimal fill.

**Nguồn đề xuất:**
- **Storyset** (free, customizable colors).
- **unDraw** (free, recolorable).
- **Icons8 Ouch** (free + paid).
- Self-illustrated qua Figma + handoff sang Lottie nếu cần motion.

### 9.3. Sample empty states

| Page | Illustration | Copy |
|---|---|---|
| Students list rỗng | Người + sách đứng cười, gradient primary-soft | "Chưa có học viên nào. Bắt đầu thêm học viên đầu tiên của bạn." |
| Attendance chưa chọn lớp | Calendar + cursor | "Chọn lớp để bắt đầu điểm danh." |
| Reports chưa có dữ liệu | Biểu đồ trống + tia sáng | "Báo cáo sẽ xuất hiện khi bạn có dữ liệu thu chi." |
| Search no result | Kính lúp + dấu chấm hỏi | "Không tìm thấy '{query}'. Thử từ khoá khác." |
| 404 | Mascot lạc đường | "Trang bạn cần không tồn tại. Về Tổng quan →" |

---

# Phần C — Motion System

## 10. Motion Philosophy & Easing

### 10.1. Tại sao Motion quan trọng

Motion làm:
- **Feedback tức thì** — user biết click đã được nhận.
- **Hierarchy by attention** — element quan trọng entrance trước.
- **Continuity** — page chuyển không "nhảy", giảm cognitive load.
- **Delight** — chi tiết nhỏ tạo cảm giác "premium quality".

Motion KHÔNG làm:
- ❌ Câu giờ (animation > 500ms trừ trường hợp đặc biệt).
- ❌ Phân tâm khi user đang nhập liệu.
- ❌ Block user action (animation phải interruptible).

### 10.2. Duration tokens

```
duration-instant   0ms    (no animation)
duration-fast      150ms  (hover, focus, button press feedback)
duration-base      200ms  (DEFAULT — most micro-interactions)
duration-smooth    300ms  (modal open/close, drawer)
duration-slow      450ms  (page transition, list stagger)
duration-deliberate 600ms (hero entrance, dashboard reveal)
duration-cinematic 800ms  (only for marketing/onboarding)
```

### 10.3. Easing curves

```
ease-linear        cubic-bezier(0, 0, 1, 1)        — chỉ cho loading bar / progress
ease-in            cubic-bezier(0.4, 0, 1, 1)       — exit animation
ease-out           cubic-bezier(0, 0, 0.2, 1)       — DEFAULT for entrance
ease-in-out        cubic-bezier(0.4, 0, 0.2, 1)     — bi-directional
ease-emphasized    cubic-bezier(0.2, 0, 0, 1)       — material 3 emphasized (snappy)
ease-spring-soft   cubic-bezier(0.34, 1.56, 0.64, 1) — overshoot nhẹ, friendly
ease-spring-bouncy cubic-bezier(0.68, -0.55, 0.27, 1.55) — bouncy (selective use)
```

**Quy tắc chọn easing:**
- Entrance (item xuất hiện): `ease-out` hoặc `ease-spring-soft`.
- Exit (item biến mất): `ease-in`.
- Continuous (sidebar collapse): `ease-in-out`.
- Attention-grabbing micro (like button press): `ease-emphasized`.
- Bouncy chỉ cho: toast success, achievement unlock, milestone (1–2 chỗ thôi).

### 10.4. Reduced motion

**Bắt buộc** respect `prefers-reduced-motion`:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

Riêng các animation cốt lõi (page transition opacity) vẫn giữ nhưng rút xuống 50ms.

---

## 11. Choreography & Patterns

### 11.1. Stagger (delay theo thứ tự)

Khi một danh sách xuất hiện, mỗi item entrance cách nhau **40–60ms** để mắt theo kịp.

```
Item 1: delay 0ms
Item 2: delay 50ms
Item 3: delay 100ms
...
Item N: delay min(N × 50ms, 400ms)   ← cap tổng delay 400ms
```

**Khi áp dụng:**
- Dashboard stat cards (4 cards stagger).
- Table rows (stagger 30ms cho 10 rows đầu, sau đó instant).
- Sidebar nav items khi initial mount.
- Modal section reveal.

**Khi không stagger:**
- Tab switch (instant).
- Pagination next page (instant).
- Filter change (instant).

### 11.2. Sequencing (animation theo trình tự)

Modal open:
```
0ms     → backdrop fade-in (opacity 0 → 1, duration 200ms ease-out)
50ms    → modal scale-in (scale 0.95 → 1, opacity 0 → 1, duration 300ms ease-spring-soft)
100ms   → modal content children stagger fade-in (each 50ms apart)
```

Modal close:
```
0ms     → content fade-out (200ms ease-in)
80ms    → modal scale-out (scale 1 → 0.96, duration 200ms ease-in)
180ms   → backdrop fade-out (200ms ease-in)
```

### 11.3. Continuous motion (ambient)

Có nhưng tinh tế, không quá nhiều:
- **Loading spinner:** rotate 360deg loop, duration 1s linear.
- **Skeleton shimmer:** gradient slide từ trái → phải, duration 1.5s ease-in-out infinite.
- **Pulse glow (notification dot):** scale 1 ↔ 1.15, opacity 0.6 ↔ 1, duration 1.5s ease-in-out infinite.
- **Gradient mesh background:** slow drift, duration 20s linear infinite (nếu dùng cho hero).

---

## 12. Micro-interactions

### 12.1. Button states

| State | Transform | Duration | Note |
|---|---|---|---|
| Hover | `scale(1.02)` + `shadow-md` + brightness 1.05 | 150ms ease-out | Lift nhẹ |
| Active (pressed) | `scale(0.98)` + `shadow-sm` | 100ms ease-in | Bấm xuống |
| Focus visible | `ring-2 ring-primary-500 ring-offset-2` | 0ms (instant) | Accessibility |
| Disabled | opacity 0.5 + cursor not-allowed | 0ms | No transition |
| Loading | replace text với spinner, button width fixed | 200ms ease-out | Width không nhảy |

### 12.2. Input focus

```
border-color: slate-200 → primary-500
box-shadow: none → 0 0 0 4px rgba(99, 102, 241, 0.1)
duration: 150ms ease-out
```

### 12.3. Card hover (clickable card)

```
transform: translateY(-2px)
box-shadow: shadow → shadow-md
border-color: slate-200 → primary-200
duration: 200ms ease-out
```

### 12.4. Checkbox / Toggle

- Check icon: stroke draws in 200ms ease-out (path animation).
- Toggle handle: slide left↔right 250ms ease-spring-soft.
- Background color: transition 150ms.

### 12.5. Number counter (Dashboard stats)

Khi load số:
- Đếm từ 0 lên số đích trong **600ms ease-out**.
- Format VN (thêm dấu chấm) trong khi đếm.
- Library: `react-countup` hoặc tự code với `requestAnimationFrame`.

### 12.6. Drag & Drop (template designer)

- Cursor: `cursor-grab` → `cursor-grabbing`.
- Dragging element: opacity 0.7, scale 1.05, shadow-xl.
- Drop zone: dashed border + bg primary-50 highlight.
- Drop animation: snap về vị trí mới với spring (250ms ease-spring-soft).

### 12.7. Magnetic hover (cho primary CTA + nav active item)

Subtle effect: button hơi "hút" về phía con trỏ khi gần (≤ 50px). Implementation qua Framer Motion `useMotionValue` + `useTransform`. Chỉ dùng cho 1–2 nút quan trọng nhất, không tràn lan.

---

## 13. Page Transitions

### 13.1. Strategy

Dùng **React Router v7** với layout wrapper + Framer Motion `AnimatePresence`.

### 13.2. Pattern chính: Fade + Slide-up

```
enter:  opacity 0, y +8px  →  opacity 1, y 0      (250ms ease-out)
exit:   opacity 1, y 0    →  opacity 0, y -8px   (200ms ease-in)
```

### 13.3. Pattern phụ: Shared element (cho detail page)

Khi click vào row trong list → navigate đến detail:
- Avatar / title của row "teleport" sang vị trí mới (Framer Motion `layoutId`).
- Phần còn lại fade-in.
- Tạo cảm giác liên tục, không "nhảy" trang.

### 13.4. Đặc biệt: Sidebar nav active indicator

Khi click sang trang khác, indicator (vạch bên trái sidebar item) **slide** từ vị trí cũ sang vị trí mới qua Framer Motion `layoutId="sidebar-indicator"`. Đây là chi tiết "đắt" — cảm giác premium.

---

## 14. Scroll-driven Animations (motionsites style)

### 14.1. Khi nào dùng

**Cẩn trọng:** Admin tool không cần marketing-style scroll motion overload. Chỉ dùng selectively:
- Login page: hero text với parallax nhẹ.
- Onboarding screens (Phase B): scroll-snap sections với fade-in.
- Marketing site / landing page (nếu xây): full motionsites treatment.
- KHÔNG dùng cho list page CRUD (gây mỏi mắt).

### 14.2. Techniques

#### a) Fade-in on scroll
```
Khi element vào viewport (≥ 30%): opacity 0 → 1, y +20 → 0, duration 500ms ease-out.
IntersectionObserver hoặc Framer Motion `whileInView`.
```

#### b) Parallax background
```
Background image / mesh gradient di chuyển chậm hơn foreground khi scroll.
Speed factor: 0.3–0.5x.
Implementation: `useScroll` + `useTransform` của Framer Motion.
```

#### c) Sticky-then-release (login hero only)
```
Hero text "Quản lý trung tâm dạy thêm" sticky-pin khi scroll, rồi unstick sau khi vượt 80% viewport.
```

#### d) Magnetic cursor / blob follow
```
Cursor follow blob với spring, opacity 0.2, blur 60px.
Tạo cảm giác "alive" — chỉ dùng cho login + landing.
```

### 14.3. Performance budget cho motion

- Tổng JS cho motion library (Framer Motion): < 50KB gzipped (cây shake unused).
- 60fps trên devices ≥ iPhone 8 / Pixel 4.
- Đo bằng Chrome DevTools Performance tab; spike GPU < 16ms/frame.
- Disable motion trên `prefers-reduced-motion: reduce`.

---

# Phần D — Component Library

## 15. Buttons & Actions

### 15.1. Variants

| Variant | Background | Text | Use case |
|---|---|---|---|
| **Primary** | `gradient-primary` | white | Action chính trong 1 view (Save, Thu tiền) |
| **Secondary** | `bg-slate-100 hover:bg-slate-200` (light) | slate-700 | Cancel, Back, Secondary action |
| **Outline** | transparent + border-primary-300 | primary-600 | Tertiary action |
| **Ghost** | transparent (hover bg-slate-100) | slate-700 | Toolbar, nav |
| **Danger** | error-500 | white | Delete, destructive |
| **Soft Danger** | error-50 | error-600 | Cancel form / less aggressive |
| **Link** | none | primary-600, underline on hover | Inline link |

### 15.2. Sizes

| Size | Height | Padding X | Font | Icon size |
|---|---|---|---|---|
| `xs` | 28px | 10px | 12px | 14 |
| `sm` | 32px | 12px | 13px | 16 |
| `md` (default) | 40px | 16px | 14px | 18 |
| `lg` | 48px | 20px | 16px | 20 |
| `xl` | 56px | 24px | 16px | 24 |

### 15.3. Anatomy

```
┌──────────────────────────────┐
│  [icon]  Label  [iconRight]  │
└──────────────────────────────┘
```

- Padding-x luôn ≥ 1.5× padding-y.
- Icon left/right: gap `space-2`.
- Loading: replace label bằng `<Loader2 className="animate-spin" />` + giữ width.
- Disabled: opacity 0.5 + cursor-not-allowed.

### 15.4. Sample Tailwind class strings

```jsx
// Primary md
<button className="
  inline-flex items-center justify-center gap-2
  h-10 px-4
  text-sm font-medium text-white
  bg-gradient-to-br from-primary-500 to-violet-500
  rounded-lg shadow-sm
  hover:shadow-md hover:brightness-105
  active:scale-[0.98]
  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2
  disabled:opacity-50 disabled:cursor-not-allowed
  transition-all duration-150 ease-out
">
  <Plus size={18} />
  Thêm học viên
</button>

// Secondary md
<button className="
  inline-flex items-center justify-center gap-2
  h-10 px-4
  text-sm font-medium text-slate-700
  bg-slate-100 rounded-lg
  hover:bg-slate-200
  active:scale-[0.98]
  focus-visible:ring-2 focus-visible:ring-slate-400
  transition-all duration-150
">
  Huỷ
</button>

// Danger
<button className="
  inline-flex items-center justify-center gap-2
  h-10 px-4
  text-sm font-medium text-white
  bg-error-500 hover:bg-error-600 rounded-lg
  shadow-sm hover:shadow-md
  active:scale-[0.98]
  focus-visible:ring-2 focus-visible:ring-error-500 focus-visible:ring-offset-2
  transition-all duration-150
">
  <Trash2 size={18} />
  Xoá
</button>
```

### 15.5. Icon button (square)

```jsx
<button className="
  inline-flex items-center justify-center
  w-10 h-10 rounded-lg
  text-slate-500 hover:text-primary-600 hover:bg-primary-50
  transition-colors duration-150
" aria-label="Chỉnh sửa">
  <Edit size={18} />
</button>
```

### 15.6. Button group (segmented)

```jsx
<div className="inline-flex rounded-lg bg-slate-100 p-1 gap-1">
  <button className="px-3 h-8 text-sm rounded-md bg-white shadow-sm font-medium">Ngày</button>
  <button className="px-3 h-8 text-sm rounded-md text-slate-600 hover:bg-white/50">Tuần</button>
  <button className="px-3 h-8 text-sm rounded-md text-slate-600 hover:bg-white/50">Tháng</button>
</div>
```

---

## 16. Forms & Inputs

### 16.1. Text Input

**Anatomy:**
```
┌────────────────────────────────────────┐
│ Label                          (helper)│
│ ┌────────────────────────────────────┐ │
│ │ [icon]  Placeholder text  [icon]   │ │
│ └────────────────────────────────────┘ │
│ Helper / Error message                 │
└────────────────────────────────────────┘
```

**Spec:**
- Height: 40px (md, default), 32px (sm), 48px (lg).
- Padding: 12px horizontal.
- Border: 1px solid slate-200 → primary-500 on focus.
- Background: white (light), slate-900 (dark).
- Radius: rounded-lg (8px).
- Font: 14px.

**Sample:**
```jsx
<div className="space-y-1.5">
  <label className="text-sm font-medium text-slate-700">Họ tên</label>
  <div className="relative">
    <UserRound size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
    <input
      type="text"
      placeholder="Nguyễn Văn A"
      className="
        w-full h-10 pl-10 pr-3
        text-sm text-slate-900 placeholder:text-slate-400
        bg-white border border-slate-200 rounded-lg
        focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10
        focus:outline-none
        transition-all duration-150
      "
    />
  </div>
  <p className="text-xs text-slate-500">Họ và tên đầy đủ của học viên</p>
</div>
```

**Error state:**
- Border: `border-error-500`.
- Helper text → error-600.
- Icon error: `<AlertCircle>` ở suffix.

### 16.2. Select / Dropdown

Dùng **headlessui** hoặc **Radix Select** (KHÔNG dùng `<select>` native — không style được nhất quán).

**Visual:** giống Input + chevron-down icon ở right. Open: dropdown panel với shadow-lg, max-h 320px scroll.

### 16.3. Combobox / Searchable Select

Cho parent search trong Student form: combobox với typeahead. Dùng `@headlessui/react Combobox`.

### 16.4. Checkbox & Radio

- Size: 16px (sm), 20px (md default).
- Custom (không native): SVG check icon stroke-draw animation.
- Color: bg-primary-500 when checked.
- Radius: 4px (checkbox), full (radio).

### 16.5. Toggle (Switch)

- Size: 36×20px (md).
- Handle: 16px white circle với shadow.
- Track: slate-300 (off) → primary-500 (on).
- Animation: handle slide 200ms ease-spring-soft.

### 16.6. Date picker

Dùng **react-day-picker** + custom theme matching tokens.

**Calendar grid:**
- Day cell: 36×36px.
- Today: dot indicator dưới số.
- Selected: bg-primary-500 + text-white + rounded-full.
- Range: bg-primary-100 cho days in between.
- Hover: bg-slate-100.

### 16.7. Textarea

- Min height: 96px (4 rows).
- Resize: vertical only.
- Auto-grow option: max 8 rows.

### 16.8. File upload (logo, ảnh template)

Drag & drop zone:
```
┌──────────────────────────────────────────┐
│                                          │
│            [Upload icon 48px]            │
│                                          │
│      Kéo thả ảnh vào đây                 │
│      hoặc click để chọn                  │
│                                          │
│      PNG, JPG, SVG · Max 1MB             │
│                                          │
└──────────────────────────────────────────┘
```

- Border: 2px dashed slate-300.
- Hover: border primary-400 + bg primary-50.
- Dragging: border primary-500 + scale 1.01.

### 16.9. Form layout patterns

- **Grid 2 cột** trên md+ (`grid-cols-1 md:grid-cols-2 gap-6`).
- **Full-width** cho field dài (address, notes).
- **Section header** trong form lớn: `text-overline text-slate-500` + divider line.
- **Sticky footer** với Save/Cancel buttons (cho long form).
- **Inline validation** sau khi blur lần đầu; không validate khi đang gõ ký tự đầu.

---

## 17. Cards & Surfaces

### 17.1. Card variants

| Variant | Background | Border | Shadow | Use case |
|---|---|---|---|---|
| **Flat** | slate-50 | slate-200 | none | Empty state, info |
| **Default** | white | slate-200 | shadow-sm | Most cards |
| **Elevated** | white | none | shadow-md | Important info, hover state |
| **Featured** | gradient-primary-soft hoặc mesh | none | shadow-lg | Hero, dashboard top |
| **Outlined** | white | primary-200 | none | Selected state, recommended |
| **Glass** | rgba(255,255,255,0.6) + backdrop-blur | white/30 | shadow-lg | Mobile sidebar overlay, command palette |

### 17.2. Card anatomy

```
┌─────────────────────────────────────────┐
│ [icon]  Title              [action]    │  ← header
├─────────────────────────────────────────┤
│                                         │
│  Content...                             │  ← body
│                                         │
├─────────────────────────────────────────┤
│ [footer action]              [footer]   │  ← footer (optional)
└─────────────────────────────────────────┘
```

### 17.3. Padding

- Compact card (stat card): `p-5`.
- Default: `p-6`.
- Featured / hero card: `p-8`.
- Section: gap `space-6` between header / body / footer.

### 17.4. Stat Card (dashboard)

```jsx
<div className="
  group relative overflow-hidden
  bg-white border border-slate-200 rounded-2xl p-6
  hover:shadow-md hover:border-primary-200
  transition-all duration-200
">
  {/* gradient accent on hover */}
  <div className="absolute inset-0 bg-gradient-to-br from-primary-500/0 to-violet-500/0 group-hover:from-primary-500/5 group-hover:to-violet-500/5 transition-opacity duration-300" />

  <div className="relative">
    <div className="flex items-center justify-between mb-4">
      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-violet-500 flex items-center justify-center shadow-sm">
        <Users className="w-6 h-6 text-white" />
      </div>
      <span className="text-overline text-success-600 inline-flex items-center gap-1">
        <TrendingUp size={14} />
        +12%
      </span>
    </div>
    <p className="text-caption text-slate-500 uppercase tracking-wider mb-1">Học viên đang học</p>
    <p className="text-display-lg font-bold text-slate-900 tabular-nums">248</p>
    <p className="text-body-sm text-slate-500 mt-2">So với tháng trước</p>
  </div>
</div>
```

### 17.5. Hover behavior cho clickable card

- `translate-y-[-2px]`
- `shadow-md`
- `border-primary-200`
- Duration: 200ms ease-out.

---

## 18. Modals & Drawers

### 18.1. Modal sizes

| Size | Max width | Use case |
|---|---|---|
| `sm` | 400px | Confirm, alert |
| `md` (default) | 560px | Most forms |
| `lg` | 720px | Complex form (Student, Class) |
| `xl` | 960px | Review attendance modal |
| `full` | 100vw - 64px | Template designer (full-screen alternative) |

### 18.2. Anatomy

```
┌──────────────────────────────────────────────┐
│ Title                                    [×] │  ← Header (sticky)
├──────────────────────────────────────────────┤
│                                              │
│  Body content (scrollable if overflow)       │
│                                              │
├──────────────────────────────────────────────┤
│              [Cancel]   [Primary action]    │  ← Footer (sticky)
└──────────────────────────────────────────────┘
```

### 18.3. Behavior
- Open: backdrop fade-in + modal scale-in (xem §11.2 Sequencing).
- Close: ESC key, click backdrop, X button.
- Focus trap: tab cycle inside modal only.
- Body scroll lock khi modal open.
- Restore focus về trigger element khi close.

### 18.4. Drawer (slide-in from right/left)

Use case: detailed view không cần full modal, e.g. Student detail panel.

- Width: 480px default, 600px lg, 720px xl.
- Slide-in từ right: 300ms ease-emphasized.
- Backdrop: slate-900/40 + backdrop-blur-sm.

### 18.5. Bottom sheet (mobile)

Trên mobile, modal có thể chuyển thành bottom sheet:
- Width: 100% screen.
- Height: auto, max 90vh.
- Slide up từ bottom với drag handle.

---

## 19. Tables & Lists

### 19.1. Table anatomy

```
┌─────────────────────────────────────────────────────┐
│ [Search]  [Filter ▼]  [Sort ▼]        [+ Add]      │  ← Toolbar
├─────────────────────────────────────────────────────┤
│ ☐  Tên ↓     │ Lớp   │ Phụ huynh │ Status │ Action │  ← Header
├─────────────────────────────────────────────────────┤
│ ☐  [avatar] Nguyễn Văn A │ 9A1  │ 0901... │ ●  │ ⋮ │
│ ☐  [avatar] Trần Thị B   │ 9A2  │ 0902... │ ●  │ ⋮ │
│ ...                                                 │
├─────────────────────────────────────────────────────┤
│  Trang 1 / 12     ◀ Trước   1 2 3 ...   Sau ▶     │  ← Pagination
└─────────────────────────────────────────────────────┘
```

### 19.2. Row design

- Height: 56px default, 72px với avatar 2 dòng.
- Padding: 16px horizontal.
- Border-bottom: 1px slate-100.
- Hover: bg-slate-50.
- Selected: bg-primary-50 + left border 3px primary-500.
- Striped (optional): even rows `bg-slate-50/50`. **Không** dùng striped nếu đã có hover.

### 19.3. Cell content

- Avatar + Name: avatar 36px round + name slate-900 + subline slate-500.
- ID / code: `font-mono text-slate-500 text-sm`.
- Amount (money): `font-mono tabular-nums text-right`.
- Status: badge (xem §22).
- Date: `text-slate-600 text-sm`, format `DD/MM/YYYY HH:mm`.
- Actions: icon buttons (Edit, Delete, More) hoặc kebab menu.

### 19.4. Empty state in table

Khi 0 rows:
```
┌─────────────────────────────────────────┐
│                                         │
│         [Illustration 240px]            │
│                                         │
│      Chưa có học viên nào               │
│      Bắt đầu thêm học viên đầu tiên     │
│                                         │
│         [+ Thêm học viên]               │
│                                         │
└─────────────────────────────────────────┘
```

### 19.5. Loading state: Skeleton rows

5–8 skeleton rows với shimmer animation. Width random (50–95%) để giống real content.

### 19.6. Sortable header

- Click → sort asc → click lại → sort desc → click lần 3 → unsort.
- Icon chevron-up/down xuất hiện ở column đang sort.
- Animation: row reorder với Framer Motion `layout` (250ms ease-spring-soft).

### 19.7. Bulk actions (Phase B)

Khi tick chọn ≥ 1 row:
- Toolbar slide-down từ trên với floating action bar.
- Hiển thị: "Đã chọn 3 mục" + actions (Delete, Archive, Export).

### 19.8. Mobile responsive: Card list (≤ sm)

Trên mobile, table → card stack. Mỗi card hiển thị các field quan trọng nhất:
```
┌─────────────────────────────────────┐
│ [avatar] Nguyễn Văn A          ⋮   │
│ Lớp 9A1 · Phụ huynh: 0901xxxxxx     │
│ Học phí tháng: 1.200.000đ           │
│ [● Đã đóng]                         │
└─────────────────────────────────────┘
```

---

## 20. Navigation (Sidebar / Header / Breadcrumb)

### 20.1. Sidebar (desktop)

**Specs:**
- Width: 240px expanded / 64px collapsed.
- Background: white (light) hoặc slate-900 (dark variant).
- Border-right: 1px slate-200.
- Sticky top.

**Anatomy:**
```
┌──────────────┐
│  [Logo]      │ ← top section, 64px height
├──────────────┤
│              │
│ [icon] Tổng quan        │
│ [icon] Học viên         │
│ [icon] Phụ huynh        │
│ ...                     │  ← nav section
│ [icon] Báo cáo          │
│                         │
├──────────────┤
│ [avatar] Lễ tân A       │  ← user section, footer
│ admin@center.vn   [⋮]   │
└──────────────┘
```

**Nav item state:**
- Idle: text slate-600, icon slate-400.
- Hover: bg slate-50, text slate-900.
- Active: bg gradient-primary (subtle) + text-white + left indicator bar 3px primary-500 + glow effect.
- Active indicator MOVE qua Framer Motion `layoutId` khi navigate (xem §13.4).

**Sample active item:**
```jsx
<NavLink className="
  relative flex items-center gap-3 h-11 px-3 rounded-lg
  text-sm font-medium
  text-slate-600 hover:bg-slate-50 hover:text-slate-900
  [&.active]:bg-gradient-to-r [&.active]:from-primary-500 [&.active]:to-violet-500
  [&.active]:text-white [&.active]:shadow-md [&.active]:shadow-primary-500/20
  transition-colors duration-150
">
  <LayoutDashboard size={20} />
  Tổng quan
</NavLink>
```

### 20.2. Header (top bar)

**Specs:**
- Height: 64px.
- Background: white/80 + backdrop-blur (sticky transparent).
- Border-bottom: 1px slate-200.

**Anatomy:**
```
[Hamburger (mobile)] [Page Title]    [Search] [Notify] [Cmd+K] [Avatar ▼]
```

- Page title: dynamic theo route.
- Search: cmd+K open command palette.
- Notification bell: badge dot khi có new.
- Avatar dropdown: profile, settings, logout.

### 20.3. Breadcrumb

```
Tổng quan / Học viên / Nguyễn Văn A
```

- Font: text-sm text-slate-500.
- Separator: `/` text-slate-300.
- Last item: text-slate-900 font-medium.

### 20.4. Command Palette (Cmd+K — Phase B)

- Trigger: `⌘K` hoặc `Ctrl+K`.
- Full-screen overlay với centered modal.
- Glass effect + shadow-2xl.
- Fuzzy search across: navigation, recent students, quick actions.
- Group sections: "Trang", "Học viên gần đây", "Hành động nhanh".
- Keyboard nav: arrow up/down, Enter to execute.

---

## 21. Toasts, Tooltips, Popovers

### 21.1. Toast notification

**Position:** top-right (desktop), top-center (mobile), 16px padding from edge.

**Stack:** max 3 visible, oldest fade out.

**Anatomy:**
```
┌────────────────────────────────────────┐
│ ✓ Đã lưu học viên thành công    [×]   │
│   Nguyễn Văn A đã được thêm vào lớp   │
└────────────────────────────────────────┘
```

**Variants:** success (green), error (red), warning (amber), info (blue).

**Auto dismiss:** 3s default, 5s cho lỗi, có thể hover để pause.

**Animation:**
- Enter: slide-in from right 280px → 0, opacity 0 → 1, 300ms ease-spring-soft.
- Exit: slide-out + fade, 200ms ease-in.

**Library suggestion:** `sonner` hoặc `react-hot-toast`.

### 21.2. Tooltip

**Position:** top default, auto-flip khi không đủ chỗ.

**Style:**
- Background: slate-900 (dark) ngược tone với UI.
- Text: white text-xs font-medium.
- Padding: 6px 8px.
- Radius: rounded-md.
- Arrow: 6px tam giác slate-900.

**Behavior:**
- Delay open: 500ms.
- Delay close: 0ms.
- Disable on touch device.

**Library:** Radix Tooltip.

### 21.3. Popover

- Width: 320px default.
- Trigger: click (not hover).
- Background: white, shadow-lg, border-slate-200.
- Animation: fade + scale 0.95 → 1 từ trigger origin (Framer Motion `originX/Y`).

---

## 22. Badges, Tags, Pills

### 22.1. Badge (status)

```jsx
// Success
<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-success-50 text-success-700 text-xs font-medium">
  <CircleDot size={8} className="fill-current" />
  Đã đóng
</span>

// Warning
<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-warning-50 text-warning-700 text-xs font-medium">
  <Clock size={12} />
  Chờ thu
</span>

// Error
<span className="bg-error-50 text-error-700 ...">Quá hạn</span>

// Info / Default
<span className="bg-slate-100 text-slate-700 ...">Đang học</span>
```

### 22.2. Status semantics

| Trạng thái | Variant | Color |
|---|---|---|
| **Học viên active** | success | emerald-50 / emerald-700 |
| **Học viên graduated** | info | sky-50 / sky-700 |
| **Học viên inactive** | neutral | slate-100 / slate-600 |
| **Period: open** | success | emerald |
| **Period: submitted** | warning | amber |
| **Period: approved** | info | sky |
| **Period: locked** | neutral | slate |
| **Fee: pending** | neutral | slate |
| **Fee: ready** | info | sky |
| **Fee: confirmed** | warning | amber |
| **Fee: paid** | success | emerald |
| **Attendance: present** | success | emerald |
| **Attendance: absent_with_fee** | warning | amber |
| **Attendance: absent_no_fee** | error | rose |
| **Attendance: holiday** | info | sky |
| **Payment category: salary** | primary | indigo |
| **Payment category: utility** | warning | amber |
| **Payment category: office** | info | cyan |
| **Payment category: other** | neutral | slate |

### 22.3. Tags (dismissible)

```jsx
<span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-primary-50 text-primary-700 text-xs">
  Lớp 9A1
  <button className="hover:bg-primary-100 rounded-sm p-0.5">
    <X size={12} />
  </button>
</span>
```

---

## 23. Tabs, Stepper, Pagination

### 23.1. Tabs

**Variants:**
- **Underline** (default): không bg, border-bottom 2px primary-500 cho active.
- **Pill**: bg-slate-100 container, active = white card with shadow-sm.

**Sample underline:**
```jsx
<div className="border-b border-slate-200 flex gap-6">
  {tabs.map(tab => (
    <button className={`
      h-12 px-1 text-sm font-medium relative
      ${active === tab.id
        ? 'text-primary-600'
        : 'text-slate-500 hover:text-slate-700'}
    `}>
      {tab.label}
      {active === tab.id && (
        <motion.div
          layoutId="tab-indicator"
          className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500"
        />
      )}
    </button>
  ))}
</div>
```

### 23.2. Stepper (multi-step form)

- Horizontal: numbered circles + connector line, completed bg primary-500 với check icon.
- Vertical: cho mobile hoặc long forms.

### 23.3. Pagination

```
◀ Trước    1   2   [3]   4   ...   12    Sau ▶
```

- Current page: bg primary-500 + text-white.
- Page button: 36×36 rounded-md.
- Disabled prev/next: opacity 0.4.

---

## 24. Empty States & Skeletons

### 24.1. Empty state template

```jsx
<div className="flex flex-col items-center justify-center py-16 px-4 text-center">
  <Illustration className="w-48 h-48 mb-6 opacity-90" />
  <h3 className="text-h3 text-slate-900 mb-2">Chưa có học viên nào</h3>
  <p className="text-body text-slate-500 max-w-sm mb-6">
    Bắt đầu bằng việc thêm học viên đầu tiên của trung tâm.
  </p>
  <button className="btn-primary">
    <Plus size={18} />
    Thêm học viên
  </button>
</div>
```

### 24.2. Skeleton patterns

```jsx
// Card skeleton
<div className="bg-white rounded-xl p-6 space-y-4">
  <div className="h-4 w-1/3 bg-slate-100 rounded animate-pulse" />
  <div className="h-8 w-1/2 bg-slate-100 rounded animate-pulse" />
  <div className="h-3 w-2/3 bg-slate-100 rounded animate-pulse" />
</div>

// Table row skeleton
<tr>
  <td><div className="w-10 h-10 rounded-full bg-slate-100 animate-pulse" /></td>
  <td><div className="h-4 w-32 bg-slate-100 rounded animate-pulse" /></td>
  <td><div className="h-4 w-20 bg-slate-100 rounded animate-pulse" /></td>
  <td><div className="h-4 w-16 bg-slate-100 rounded animate-pulse" /></td>
</tr>
```

**Shimmer effect (advanced):**
```css
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
.shimmer {
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.5),
    transparent
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
}
```

---

## 25. Charts & Data Viz

### 25.1. Library lựa chọn

- **Recharts** (default — declarative, React-friendly, customizable).
- **Visx** (alternative — D3 power but React) cho chart phức tạp.
- **Tremor** (cho dashboard nhanh, built-in components đẹp).

### 25.2. Color palette for charts

```
chart-1   #6366F1   primary-500
chart-2   #06B6D4   cyan-500
chart-3   #10B981   success-500
chart-4   #F59E0B   warning-500
chart-5   #F43F5E   error-500
chart-6   #8B5CF6   violet-500
chart-7   #EC4899   pink-500
chart-8   #84CC16   lime-500
```

Khi chart > 8 series → quy về gray scale dần.

### 25.3. Common chart specs

**Line chart (revenue trend):**
- Stroke 2px, smooth curve.
- Dot on hover.
- Tooltip: tone slate-900, white text.
- Grid: dashed slate-200, only horizontal.
- Y axis: format VND `1.234.567đ`.
- Animation: line draws in từ trái → phải, 800ms ease-out.

**Bar chart (expenses by category):**
- Rounded top corners (4px).
- Color: gradient từ tone 400 → 600.
- Hover: brightness 1.1.
- Bar width: 40% of slot.

**Pie / Donut:**
- Inner radius (donut): 60%.
- Stroke white 2px giữa các slice.
- Center label: total + label slate-500.

**Stat card with mini sparkline:**
- Sparkline trong card, height 40px, no axis, fade gradient fill.

---

# Phần E — Page Templates

> Mỗi page có mô tả layout + zone + components + interactions để Stitch / Figma AI / dev có context đầy đủ.

## 26. Login & Onboarding

### 26.1. Login layout

**2-column desktop, single-column mobile:**

```
┌──────────────────────────────────┐ ┌─────────────────────────┐
│                                  │ │                         │
│   [Logo]                         │ │   [Hero illustration]   │
│                                  │ │                         │
│   Chào mừng trở lại              │ │  hoặc                   │
│   Đăng nhập để tiếp tục          │ │                         │
│                                  │ │   gradient mesh         │
│   ┌────────────────────────┐     │ │   background với        │
│   │ Username               │     │ │   subtle parallax       │
│   └────────────────────────┘     │ │                         │
│   ┌────────────────────────┐     │ │   "Quản lý trung tâm    │
│   │ Password         [👁]  │     │ │    dạy thêm thông minh" │
│   └────────────────────────┘     │ │                         │
│                                  │ │   Trust badges          │
│   [ Ghi nhớ tôi ]   Quên mật?    │ │   ─────────             │
│                                  │ │                         │
│   [    Đăng nhập    →   ]        │ │                         │
│                                  │ │                         │
│   Demo: admin/admin123           │ │                         │
│                                  │ │                         │
└──────────────────────────────────┘ └─────────────────────────┘
       Left col 480px max                Right col flex-1
```

### 26.2. Motion choreography
- Logo fade-in 200ms (delay 0).
- Heading fade-up 250ms (delay 100ms).
- Form fields stagger 50ms each (delay 200ms).
- CTA button fade-up 250ms (delay 400ms).
- Hero illustration parallax với mouse position (subtle, magnitude ≤ 10px).

### 26.3. Onboarding wizard (Phase B)

5 bước:
1. Welcome — chào mừng + tour TL;DR.
2. Tạo trung tâm — name, logo upload, MST.
3. Tạo lớp đầu tiên — minimal class form.
4. Thêm học viên đầu tiên — minimal student form.
5. Bạn đã sẵn sàng → dashboard.

UI: progress bar trên top, step content center, fade transition giữa các step.

---

## 27. Dashboard

### 27.1. Layout

```
[Page header: "Tổng quan" + ngày hiện tại + button "Báo cáo"]

[4 stat cards grid] ───── grid-cols-2 lg:grid-cols-4
  - Học viên active   - Lớp đang mở    - Doanh thu tháng    - Chi phí tháng

[Row 2: 2/3 + 1/3]
  ┌─────────────────────────┐  ┌──────────────────┐
  │ Doanh thu 30 ngày qua   │  │ Quick actions    │
  │ [Line chart]            │  │ [4 button cards] │
  └─────────────────────────┘  └──────────────────┘

[Row 3: 1/2 + 1/2]
  ┌─────────────────────────┐  ┌─────────────────────────┐
  │ Giao dịch gần đây       │  │ Học viên nợ phí         │
  │ [List of 5 recent]      │  │ [List of 5 overdue]     │
  └─────────────────────────┘  └─────────────────────────┘
```

### 27.2. Stat card chi tiết
Xem §17.4.

### 27.3. Motion choreography
- Stat cards stagger 60ms (cap 240ms tổng).
- Number counter từ 0 → giá trị thật (600ms ease-out).
- Charts: animate draw từ trái sang phải (800ms ease-out).
- Quick action buttons: hover scale 1.02 + glow effect.

### 27.4. Quick actions

4 button-cards lớn, kích thước đều:
```
┌──────────────┐ ┌──────────────┐
│  📅 Icon      │ │  💰 Icon     │
│  Điểm danh   │ │  Thu tiền    │
│  Hôm nay     │ │  Tháng này   │
└──────────────┘ └──────────────┘
```
- Background: white + hover gradient soft.
- Border subtle.
- Click → navigate page tương ứng.

---

## 28. List Page (CRUD)

Pattern chung cho Students / Parents / Teachers / Classes / Receipts / Payments.

### 28.1. Layout

```
[Page header: title + subtitle + primary CTA "Thêm học viên"]

[Optional: 4 stat cards mini — total / active / male / female]

[Toolbar: Search input + Filter chips + Sort dropdown]
                                            ┌─ trên md+ ─┐
                                            │ [Export]   │
                                            └────────────┘

[DataTable]
  Header
  Rows (skeleton when loading, illustration when empty)

[Pagination]
```

### 28.2. Filter chips

Filter chips inline, có thể dismiss:
```
[Lớp 9A1 ×]  [Status: Active ×]  [+ Thêm filter]
```

### 28.3. Hover interactions
- Row hover: bg slate-50.
- Action icons: opacity 0 idle → opacity 1 on row hover.
- Click row (non-action area): có thể mở drawer detail hoặc nav đến detail page.

### 28.4. Create / Edit modal
- Open via FAB (mobile) hoặc CTA button (desktop).
- Form 2 column (md+), 1 column (mobile).
- Sticky footer với Cancel + Save.
- Auto-focus first input.

---

## 29. Attendance Grid

Trang phức tạp nhất — cần thiết kế cẩn thận.

### 29.1. Layout

```
[Page header: "Điểm danh" + Class selector dropdown + period status badge]

[3-month calendar]
  ┌─ Tháng trước ─┐ ┌─ Tháng này ─┐ ┌─ Tháng sau ─┐
  │  T2 T3 T4...  │ │  T2 T3 T4...│ │  T2 T3...   │
  │  ✓  ✓  ✓     │ │  [today]    │ │             │
  │  ✓  ✓  ✓     │ │             │ │             │
  └───────────────┘ └─────────────┘ └─────────────┘

[Selected week → Weekly timesheet]
  ┌──────────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┐
  │ Học viên │ T2  │ T3  │ T4  │ T5  │ T6  │ T7  │ CN  │
  ├──────────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┤
  │ NV A     │  ✓  │  ✓  │  ⚠  │     │     │     │     │
  │ TT B     │  ✓  │  ✓  │  ✓  │     │     │     │     │
  │ ...      │     │     │     │     │     │     │     │
  └──────────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┘

[Period actions: Submit / Approve / Lock]
```

### 29.2. Cell states
- Empty: slate-50 bg, hover slate-100.
- Present (✓): success-100 bg, success-700 icon.
- Absent with fee (⚠): warning-100 bg, warning-700 icon.
- Absent no fee (✗): error-100 bg, error-700 icon.
- Holiday (🎉): info-100 bg, info-700 icon.

**Interaction:** click cell → cycle qua 5 states (empty → present → absent_with_fee → absent_no_fee → holiday → empty).

**Animation:** cell content swap với fade 100ms + scale 0.8 → 1 (snap).

### 29.3. Calendar markers
- Day có attendance complete (đủ HS): dot green.
- Day có attendance partial: dot amber.
- Today: ring border primary-500.
- Schedule day (theo class.scheduleDays): bg subtle primary-50.

### 29.4. Period status workflow

Status badge ở top với icon + color:
- `open` → emerald + CircleDot
- `submitted` → amber + Clock
- `approved` → sky + CheckCircle2
- `locked` → slate + Lock

Khi locked, mọi cell read-only + subtle overlay opacity 0.7.

---

## 30. Fee Collection

### 30.1. Layout

```
[Page header: "Thu học phí" + Month navigator ◀ Tháng 4/2026 ▶]

[5 summary cards: Tổng HS / Chờ thu / Đã thu / Số tiền / Tổng]

[Status filter chip buttons: Tất cả (count) / Chờ chốt (count) / ...]

[DataTable]
  Cột: HS | Lớp | Attendance summary | Số tiền | Status | Action
```

### 30.2. Status pill colors
- pending: slate
- ready: sky
- confirmed: amber
- paid: emerald

### 30.3. Pay flow modal
- Modal sm: confirm payment.
- Body: HS name + month + sessions + amount.
- Radio chọn payment_method (cash / transfer).
- Action: [Huỷ] [💰 Xác nhận thu].

### 30.4. After pay
- Row update: status badge → paid với fade transition.
- Toast: "Đã thu phí thành công" + button "🖨️ In biên lai".
- Subtle confetti micro-animation (3s).

---

## 31. Receipt / Payment

### 31.1. List page
Theo pattern §28.

### 31.2. Create modal
- Receipt form: Student dropdown → auto-calc days/amount → payment_method → notes.
- Payment form: 4 category cards → recipient → amount → notes.

### 31.3. PDF preview
- Sau khi save → mở PDF trong modal hoặc tab mới.
- Preview embed iframe trong drawer right (480px wide).
- Action: Download / Print.

---

## 32. Reports

### 32.1. Layout

```
[Page header + Export Excel button]

[Filters row: Report type segmented (Daily/Weekly/Monthly/Yearly) + Date range]

[3 summary cards: Tổng thu / Tổng chi / Chênh lệch]

[Row: 2/3 + 1/3]
  ┌─────────────────────────┐  ┌──────────────────┐
  │ Line chart - revenue    │  │ Donut - expense  │
  │ trend                   │  │ by category      │
  └─────────────────────────┘  └──────────────────┘

[Statistics grid: 4 cells - count receipts / count payments / avg receipt / avg payment]
```

### 32.2. Motion
- Charts animate-in.
- Numbers counter từ 0.
- Date picker: smooth dropdown.

---

## 33. Templates Designer (Fabric.js)

### 33.1. Layout (full-screen)

```
┌── Top toolbar: Back / Template name / Save / Preview / Set default ───┐
├──────────────────────────────────────────────────────────────────────┤
│ Left panel  │            Canvas (Fabric.js)              │ Right     │
│  - Add text │                                            │ panel     │
│  - Add img  │     ┌─────────────────────────────┐        │ - Layers  │
│  - Add line │     │                             │        │ - Props   │
│  - Templates│     │      Receipt template       │        │   of      │
│             │     │      [editable canvas]      │        │   selected│
│             │     │                             │        │   element │
│             │     └─────────────────────────────┘        │           │
│             │                                            │           │
└──────────────────────────────────────────────────────────────────────┘
```

### 33.2. Interactions
- Drag từ left panel → canvas.
- Select element → properties panel right shows.
- Multi-select + group/ungroup.
- Undo/redo stack.
- Keyboard shortcuts: Cmd+S save, Cmd+Z undo, Delete.

---

## 34. Settings

### 34.1. Sections (Phase C)

- General — Center info, logo upload, MST.
- Users — admin manage receptionist accounts.
- Templates — link to template manager.
- Backup & Export — manual backup trigger, schedule.
- Audit log — viewer for ActivityLog.
- Integrations (Phase D) — SMS provider, Email, Payment gateway.

### 34.2. Layout: tabs vertical (left rail) + content right.

---

# Phần F — Accessibility & Quality

## 35. Accessibility (WCAG AA)

### 35.1. Color contrast
- Test mọi text/background pair: tối thiểu 4.5:1 (body) / 3:1 (large text).
- Status badge: text on tone-50 bg cần check kỹ — đôi khi cần dùng tone-700 text.

### 35.2. Focus indicators
- Mọi interactive element có `focus-visible:ring-2 ring-primary-500 ring-offset-2`.
- KHÔNG bỏ outline (chỉ thay đổi style).

### 35.3. Keyboard navigation
- Tab order theo visual order.
- ESC đóng modal.
- Enter submit form.
- Arrow keys cho radio, select, calendar, tabs.

### 35.4. ARIA
- Modal: `role="dialog"` + `aria-modal="true"` + `aria-labelledby`.
- Button có icon-only: `aria-label`.
- Toast: `role="status"` (success/info) hoặc `role="alert"` (error).
- Input: `aria-describedby` cho helper text.
- Loading: `aria-busy="true"`.

### 35.5. Screen reader
- Skip-to-content link đầu page.
- Heading hierarchy đúng (h1 → h2 → h3, không nhảy).
- Form label always associated với input qua `htmlFor`.

### 35.6. Touch target
- Min 44×44px cho mọi action button trên touch device.

---

## 36. Responsive Strategy

### 36.1. Breakpoint behavior

| Breakpoint | Sidebar | DataTable | Modal |
|---|---|---|---|
| `< sm` (mobile) | Hidden (hamburger overlay) | Card stack | Bottom sheet |
| `sm` (640) | Hidden | Horizontal scroll | Modal |
| `md` (768) | Hidden | Table (compact) | Modal |
| `lg` (1024) | Visible | Table (default) | Modal |
| `xl` (1280) | Visible | Table (default) | Modal |
| `2xl` (1536) | Visible | Table + extra columns | Modal |

### 36.2. Mobile-first ưu tiên
- Receptionist có thể dùng tablet — ưu tiên iPad portrait (768px).
- Phone hỗ trợ basic CRUD; attendance grid limited (read mostly).

---

## 37. Dark Mode

### 37.1. Strategy
- CSS variables qua `data-theme="dark"` attribute trên `<html>`.
- Tailwind v4 dùng `@variant dark`.
- Persist preference qua localStorage.
- Default: follow system preference.

### 37.2. Token map cho dark

```
bg-page          slate-950
bg-surface       slate-900
bg-elevated      slate-800
border-default   slate-800
border-strong    slate-700
text-primary     slate-100
text-secondary   slate-400
text-muted       slate-500
```

### 37.3. Dark mode quirks
- Gradient primary giữ nguyên (vẫn đẹp trên dark).
- Glass effect: rgba(15,23,42,0.7).
- Status badges: dùng tone-950/30 bg + tone-300 text.
- Shadow giảm độ đậm (dark mode không thấy rõ shadow, dùng border thay).

---

## 38. Vietnamese Typography & Format

### 38.1. Font diacritics
- Plus Jakarta Sans + JetBrains Mono đều có Vietnamese support tốt.
- Test với chuỗi: "Nguyễn Văn Quý — Trường THPT Trần Hưng Đạo, lớp 12A1, học phí 1.234.567đ tháng 04/2026".
- KHÔNG dùng font không có dấu (sẽ fallback grotesque).

### 38.2. Line-height tối thiểu cho VN
- Body: 1.5 (không nhỏ hơn).
- Heading: 1.2 (chấp nhận vì heading thường ngắn).
- Dấu mũ + dấu hỏi/nặng có thể bị cắt khi line-height quá nhỏ.

### 38.3. Format chuẩn

```js
// Currency
new Intl.NumberFormat('vi-VN').format(1234567) + 'đ'
// → "1.234.567đ"

// Date
new Date().toLocaleDateString('vi-VN')
// → "26/04/2026"

// DateTime
new Date().toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })
// → "26/04/2026, 14:35"

// Relative time
'Vừa xong' / '5 phút trước' / 'Hôm qua' / '3 ngày trước' / '26/04/2026'

// Số thập phân
'1,5 giờ' (KHÔNG '1.5 giờ' — dấu chấm là phân tách nghìn)
```

### 38.4. Plurals
Tiếng Việt không phân biệt số ít/nhiều như English:
- "1 học viên" / "5 học viên" (cùng từ).
- KHÔNG dùng plural pattern English.

### 38.5. Title case vs. sentence case
- Buttons + nav items: Title Case → "Thêm Học Viên" hoặc "Thêm học viên" (chọn 1 và stick).
- **Khuyến nghị:** sentence case xuyên suốt ("Thêm học viên") — tự nhiên với VN.
- Headings vẫn có thể title case ("Quản Lý Trung Tâm Dạy Thêm").

---

# Phần G — Tooling & AI Handoff

## 39. Figma Workflow & AI Prompts

### 39.1. Figma file structure

```
📄 EduManager Design System
├── 🎨 Foundations
│   ├── Colors
│   ├── Typography
│   ├── Spacing & Grid
│   ├── Effects (shadow, blur)
│   └── Icons (Lucide imported)
├── 🧩 Components
│   ├── Buttons
│   ├── Forms
│   ├── Cards
│   ├── Modal & Drawer
│   ├── Navigation
│   ├── Tables
│   ├── Charts
│   └── Misc (toast, badge, ...)
├── 📐 Templates
│   ├── App Shell
│   ├── Login
│   ├── Dashboard
│   ├── List Page
│   ├── Attendance Grid
│   └── ...
└── 🚀 Flows
    ├── Onboarding journey
    ├── Receipt issuance flow
    └── Report viewing flow
```

### 39.2. Tokens trong Figma

Sử dụng **Figma Variables** (mới) hoặc plugin **Tokens Studio**:

1. Tạo collection "Edu Manager DS".
2. Modes: Light / Dark.
3. Import token JSON từ §44 vào.

**Auto-sync giữa Figma & code:**
- Plugin: Tokens Studio for Figma → export JSON.
- Hoặc Figma Variables REST API → script tự sync.

### 39.3. Figma AI prompts (Make Designs feature)

> Figma AI hỗ trợ "Make Designs" — sinh frame từ prompt. Dưới đây là prompt templates đã optimize cho Edu Manager.

**Prompt: Login page**
```
Design a login page for "Edu Manager" — a Vietnamese SaaS for managing
tutoring centers. Style: modern, calm, smooth, professional. Color palette:
indigo-violet primary (#6366F1 → #8B5CF6), slate neutrals, white surfaces.

Layout: 2-column. Left (480px) has logo "EduFlow Manager", heading "Chào
mừng trở lại", subtitle "Đăng nhập để tiếp tục quản lý trung tâm", username
input with user icon, password input with lock icon + eye toggle, remember
me checkbox, forgot password link on right, primary gradient button "Đăng
nhập" full-width. Right column has a subtle gradient mesh background
(indigo + violet + cyan blobs) with a centered hero illustration of a
classroom/teaching scene in isometric line style + soft tagline "Quản lý
trung tâm dạy thêm thông minh, từ điểm danh đến biên lai".

Typography: Plus Jakarta Sans. Heading 36px bold, body 14px. Border radius
12px for cards, 8px for inputs. All copy in Vietnamese.
```

**Prompt: Dashboard**
```
Design an admin dashboard for "Edu Manager" — a Vietnamese tutoring center
management SaaS. Layout has a left sidebar (240px, white bg, slate-200
border-right) with logo at top, nav items "Tổng quan, Học viên, Phụ huynh,
Lớp học, Giáo viên, Điểm danh, Thu học phí, Báo cáo" each with a Lucide
icon, and a user profile at bottom.

Main content: top header 64px with breadcrumb + search + notification +
avatar. Below: page title "Tổng quan" with today's date "Thứ Tư, 26/04/2026".

Then 4 stat cards in a row (rounded-2xl, white, subtle border, hover lift):
1. "Học viên đang học" with users icon, value 248, +12% vs last month
2. "Lớp đang mở" with school icon, value 12
3. "Doanh thu tháng" with banknote icon, value "45.230.000đ"
4. "Chi phí tháng" with wallet icon, value "12.450.000đ"

Each stat card has a small icon in gradient indigo-violet box top-left.

Below: 2/3 + 1/3 row. Left card "Doanh thu 30 ngày qua" with a smooth line
chart in primary color, gradient fill below. Right card "Hành động nhanh"
with 4 buttons: "Điểm danh hôm nay", "Thu tiền", "Thêm học viên", "Báo cáo".

Below: 1/2 + 1/2 row. Left "Giao dịch gần đây" with 5 list items showing
receipt/payment with amount, time. Right "Học viên nợ phí" with 5 students
+ amount overdue + "Thu ngay" button.

Style: clean, calm, modern. Indigo primary gradient. Slate neutrals.
Plus Jakarta Sans typography. Border radius 16px for cards. Vietnamese copy.
```

**Prompt: Attendance grid**
```
Design an attendance timesheet grid for a Vietnamese tutoring center app.

Top: page title "Điểm danh" with class selector dropdown ("Lớp 9A1 - Toán Cô
Lan") and period status badge (green "Đang mở" with dot).

Middle: 3-month calendar view (Tháng 3 / Tháng 4 / Tháng 5) horizontally.
Each calendar has 7-column week grid (T2 T3 T4 T5 T6 T7 CN). Today is
highlighted with primary ring. Days that are scheduled class days have
subtle indigo-50 background. Days with complete attendance have a green
dot indicator. Days with partial have amber dot.

Bottom: when a week is selected, show a weekly timesheet table:
- Sticky left column: student avatars + names (sample: Nguyễn Văn A, Trần
  Thị B, Lê Minh C — 8 students).
- Columns: 7 days of the week with date labels.
- Each cell can be empty (slate-50 bg), present (green check on emerald-100),
  absent_with_fee (amber warning on warning-100), absent_no_fee (red X on
  rose-100), or holiday (cyan party icon on info-100).
- Rightmost columns: "Số buổi" count and "Học phí" amount in mono font.

Top right of the timesheet: action buttons "Submit kỳ điểm danh" (primary
gradient).

Style: clean grid, generous spacing, smooth hover states. Plus Jakarta Sans.
Indigo primary. Vietnamese.
```

**Prompt: Student list page**
```
Design a list/CRUD page for managing students in a Vietnamese tutoring app.

Header: title "Học viên" with subtitle "Quản lý hồ sơ học viên của trung
tâm". Right side: primary gradient button "+ Thêm học viên".

Stats row: 4 small stat cards: Tổng (248), Đang học (235), Nam (130), Nữ
(118). Each with icon and trend.

Toolbar: search input with magnifying glass, "Bộ lọc" dropdown with filter
chips below ("Trạng thái: Active ×", "Lớp 9A1 ×", "+ Thêm filter"). Sort
dropdown. "Xuất Excel" outline button on right.

Table: columns "Học viên" (avatar + name + DOB), "Lớp đang học" (badges),
"Phụ huynh" (name + phone), "Trạng thái" (success/neutral pill), "Thao tác"
(edit + delete icons that fade in on row hover).

Row hover: slate-50 background, action icons appear. Row height 64px.

Bottom: pagination "Trang 1 / 12   ◀ 1 2 3 ... 12 ▶". Result count "Đang
hiển thị 1–20 trong 248 học viên".

Style: clean datatable, generous whitespace, indigo primary, Plus Jakarta
Sans, Vietnamese copy.
```

### 39.4. Component prompts (for Figma AI / Magic Patterns)

**Prompt: Primary button variants**
```
Generate a Figma component for "Primary Button" with the following variants:
sizes (xs 28px, sm 32px, md 40px, lg 48px, xl 56px), states (default, hover,
active, focused, disabled, loading). Style: gradient background from #6366F1
to #8B5CF6, white text, font-weight 500 size 14px, border-radius 8px, padding
horizontal 16px. Hover: shadow-md and brightness 1.05. Active: scale 0.98.
Focused: ring 2px primary-500 with offset 2px. Loading: spinner icon replaces
label. Disabled: opacity 0.5. Include leading and trailing icon variations.
```

**Prompt: Status badges**
```
Generate Figma component "Status Badge" with these variants:
- success (bg emerald-50, text emerald-700, dot)
- warning (bg amber-50, text amber-700, clock icon)
- info (bg sky-50, text sky-700, info icon)
- error (bg rose-50, text rose-700, alert icon)
- neutral (bg slate-100, text slate-700)
Each: pill shape rounded-full, padding 2px 8px, font 12px medium, gap 4px
between icon and label.
```

### 39.5. Figma → Code handoff
- Mỗi component có **annotations**: tên Tailwind class chính.
- Token name match với CSS variables (`--primary-500` ↔ `primary-500`).
- Use Figma Dev Mode (sẽ generate React + Tailwind code stub).
- Plugin **Figma to Code**: cleanup output, không paste raw.

---

## 40. Stitch (Google Stitch) Workflow & Prompts

> Google Stitch là AI design tool sinh UI screens từ prompt. Khác Figma AI: sinh whole-screen có structure + theme nhất quán.

### 40.1. Setup Stitch project

1. Create new project "Edu Manager V2 - VN Tutoring SaaS".
2. Set theme:
   - Primary color: `#6366F1`
   - Secondary: `#8B5CF6`
   - Accent: `#06B6D4`
   - Font: Plus Jakarta Sans
   - Border radius: 12 (rounded-xl)
   - Style preset: "Modern / Clean / SaaS".
3. Set language to Vietnamese.
4. Upload reference images (screenshots motionsites.ai, Linear, Vercel dashboard) → Stitch dùng làm style guide.

### 40.2. Master system prompt (paste vào "Project context")

```
You are designing screens for "Edu Manager V2", a Vietnamese SaaS web app
for managing tutoring centers. Users are receptionists (22-35) and center
owners (35-55). Design priorities: aesthetic, harmonious, friendly, smooth,
comfortable for long-hour use.

DESIGN SYSTEM:
- Primary: indigo gradient #6366F1 → violet #8B5CF6
- Accent: cyan #06B6D4
- Neutrals: slate-50 (bg), slate-200 (border), slate-600 (body), slate-900 (heading)
- Semantic: emerald (success), amber (warning), rose (error), sky (info)
- Font: Plus Jakarta Sans (body), JetBrains Mono (numbers)
- Border radius: 8px input, 12px card, 16px featured card, full for pills
- Shadow: subtle by default (shadow-sm), lift on hover
- Spacing: 4px base, generous (p-6 card, gap-6 sections)
- Icons: Lucide outline 2px stroke
- Motion: smooth 200ms ease-out transitions, magnetic hover on CTAs

COPY:
- All Vietnamese, sentence case
- Currency: "1.234.567đ" (dot thousand separator, đ suffix)
- Date: DD/MM/YYYY
- Friendly but professional tone

LAYOUT:
- Desktop priority (1280px), responsive down to 640px
- Left sidebar 240px fixed
- Top header 64px sticky
- Content max-w-screen-2xl mx-auto, p-8 padding
- Cards: white surface, slate-200 border, shadow-sm
- Hover cards: shadow-md + lift -2px + border-primary-200

DO NOT use:
- Bright saturated rainbow colors
- Heavy drop shadows
- Skeuomorphism
- Cartoonish illustrations
- Emoji in button labels
- All caps headings
```

### 40.3. Screen-specific prompts

**Stitch prompt — Dashboard:**
```
Screen: Dashboard / Tổng quan
- Header zone (64px): breadcrumb "Tổng quan", search input on right with
  cmd+K hint, notification bell with dot, avatar with caret
- Page title "Tổng quan" 30px bold, subtitle "Thứ Tư, 26/04/2026"
- Stat card grid (4 cards horizontal, equal width):
  Card 1: icon "users" in gradient box, label "HỌC VIÊN ĐANG HỌC", value
  "248" big mono, trend "+12% so với tháng trước" green
  Card 2: icon "school", label "LỚP ĐANG MỞ", value "12"
  Card 3: icon "banknote", label "DOANH THU THÁNG", value "45.230.000đ"
  Card 4: icon "wallet", label "CHI PHÍ THÁNG", value "12.450.000đ"
- 2-column row: left 2/3 "Doanh thu 30 ngày qua" line chart card, right
  1/3 "Hành động nhanh" with 4 action buttons grid
- 2-column row: left "Giao dịch gần đây" list of 5 items, right "Học viên
  nợ phí" list of 5 students with red overdue badges and "Thu ngay" buttons
- Sticky sidebar 240px on left with nav items and active state showing
  gradient background on current item
- Use generous spacing, subtle hover lift on cards, indigo-violet gradient
  accent on icons and CTAs
```

**Stitch prompt — Login:**
```
Screen: Login / Đăng nhập
- Two-column layout, full viewport height
- Left column 480px:
  - Logo "EduFlow Manager" at top with E-icon in gradient box
  - Heading "Chào mừng trở lại" 30px bold slate-900
  - Subtitle "Đăng nhập để tiếp tục quản lý trung tâm" 14px slate-500
  - Spacing 32px
  - Username field with user icon left
  - Password field with lock icon left, eye toggle on right
  - Row: "Ghi nhớ tôi" checkbox left, "Quên mật khẩu?" link right
  - Primary gradient button "Đăng nhập" full-width with arrow icon
  - Footer: "Demo: admin / admin123" caption slate-400
- Right column flex-1:
  - Gradient mesh background (indigo + violet + cyan blobs with subtle blur)
  - Centered hero illustration: isometric line classroom scene (300x300)
  - Below: tagline "Quản lý trung tâm dạy thêm thông minh, từ điểm danh đến
    biên lai" 18px slate-700
  - Small trust badges: "🔒 Bảo mật JWT" "📊 Báo cáo realtime" "⚡ Mượt mà"
- Subtle parallax on illustration following cursor
- Smooth fade-up entrance animation
```

**Stitch prompt — Receipt PDF preview:**
```
Screen: Receipt PDF preview modal
- Modal overlay (slate-900 / 60 opacity backdrop blur)
- Modal container 1080x720 rounded-2xl shadow-2xl
- Header bar 64px: title "Biên lai #RCP-2026-0042" left, actions "Tải PDF"
  primary button and "In" outline right, "×" close
- Body split:
  - Left 60%: PDF iframe preview showing rendered receipt with center
    logo, MST, student info, sessions count, amount in big mono, signatures
  - Right 40%: panel with receipt details
    - Học viên: Nguyễn Văn A (with avatar)
    - Tháng: 04/2026
    - Số buổi: 12
    - Số tiền: 1.200.000đ mono bold
    - Phương thức: Tiền mặt (badge)
    - Template: "Mẫu A4 chuẩn" with thumbnail
    - Trạng thái: Đã thu (success badge)
    - Người lập: Lễ tân A
    - Ngày lập: 26/04/2026 14:35
- Smooth open animation: backdrop fade + modal scale-in spring
```

### 40.4. Iteration strategy

1. **First pass:** generate raw screen từ prompt.
2. **Refine pass:**
   - Add Vietnamese copy if Stitch defaults English.
   - Adjust color tokens if Stitch picks different shades.
   - Fix spacing if too cramped.
3. **Component pass:**
   - Extract repeating patterns as components.
   - Sync with master DS.
4. **Hand-off:**
   - Export to Figma (if Stitch supports) hoặc screenshot + recreate.
   - Or export code (if Stitch generates React).

### 40.5. Stitch prompts cho tất cả 15 screens

Lưu các prompt master + screen-specific trong file riêng `docs/STITCH_PROMPTS.md` (Phase B, sẽ tạo). Tạm thời reference 3 mẫu trên.

---

## 41. AI IDE Handoff (Cursor / Windsurf / Claude Code)

### 41.1. Vì sao guideline này phù hợp AI Agent

AI agent đọc Markdown tốt — tài liệu này có:
- ✅ Token table rõ ràng (color, spacing, …).
- ✅ Component spec với Tailwind class snippets sẵn sàng copy.
- ✅ Pattern code Framer Motion (§43).
- ✅ JSON tokens (§44).
- ✅ Reference cụ thể đến từng page template (§26–34).

### 41.2. Cách "feed" guideline cho AI Agent

**Option A — Reference in system prompt:**
```
You are working on Edu Manager V2 (React 18 + Vite + Tailwind v4). Read
docs/DESIGN_GUIDELINE.md fully before generating UI code. Always use the
tokens, components, and patterns defined there. Default to Vietnamese copy.
```

**Option B — Per-task context:**
Khi giao task cho AI:
```
Implement <ComponentName> following docs/DESIGN_GUIDELINE.md sections §15
(buttons) and §17 (cards). Use the exact Tailwind class strings provided
there. Include keyboard nav and ARIA attributes from §35.
```

### 41.3. AI-friendly conventions trong guideline

- **Anchors (#section-id)** cho mọi heading → AI có thể tham chiếu chính xác.
- **Code blocks** với language tag (jsx, tsx, css, json) → AI parse được.
- **Token table** đặt trên cùng mỗi section → AI lookup nhanh.
- **"Sample"** keyword đánh dấu mã ví dụ → AI tự nhận biết để copy pattern.
- **DO / DO NOT lists** → AI tránh anti-pattern.

### 41.4. CLAUDE.md / CURSOR.md integration

Add vào `CLAUDE.md` (đã có) section mới:
```markdown
## UI Implementation Rules

ALWAYS reference docs/DESIGN_GUIDELINE.md when implementing UI:
- Colors: use tokens from §4
- Typography: use semantic classes from §5
- Spacing: use 4px-base scale from §6
- Components: use patterns from §15-25
- Page layouts: follow templates from §26-34
- Motion: use Framer Motion patterns from §43
- Accessibility: meet WCAG AA per §35

NEVER:
- Hardcode hex colors outside token system
- Use random Tailwind classes contradicting tokens
- Add UI text in English (Vietnamese only)
- Skip focus indicators or ARIA attributes
- Add decorative motion that doesn't serve feedback
```

### 41.5. Storybook (Phase B đề xuất)

Setup Storybook với:
- 1 story per component (button, input, modal, …).
- Args control để test variants/states.
- Docs auto-generated từ JSDoc / TS types.
- Accessibility addon (a11y).
- Visual regression với Chromatic.

→ AI Agent có thể đọc Storybook stories như living docs.

---

## 42. Tailwind Config & CSS Variables

### 42.1. `tailwind.config.js` extensions

```js
import { fontFamily } from 'tailwindcss/defaultTheme';

export default {
  content: ['./src/**/*.{js,jsx,ts,tsx,html}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#EEF2FF',
          100: '#E0E7FF',
          200: '#C7D2FE',
          300: '#A5B4FC',
          400: '#818CF8',
          500: '#6366F1',
          600: '#4F46E5',
          700: '#4338CA',
          800: '#3730A3',
          900: '#312E81',
          950: '#1E1B4B',
        },
        // ... violet, cyan as defined §4
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', ...fontFamily.sans],
        mono: ['JetBrains Mono', ...fontFamily.mono],
      },
      borderRadius: {
        DEFAULT: '8px',
        md: '8px',
        lg: '12px',
        xl: '16px',
        '2xl': '24px',
        '3xl': '32px',
      },
      boxShadow: {
        xs: '0 1px 2px rgba(15, 23, 42, 0.04)',
        sm: '0 2px 4px rgba(15, 23, 42, 0.06), 0 1px 2px rgba(15, 23, 42, 0.04)',
        DEFAULT: '0 4px 12px rgba(15, 23, 42, 0.08), 0 1px 3px rgba(15, 23, 42, 0.05)',
        md: '0 8px 24px rgba(15, 23, 42, 0.10), 0 2px 6px rgba(15, 23, 42, 0.06)',
        lg: '0 16px 40px rgba(15, 23, 42, 0.12), 0 4px 12px rgba(15, 23, 42, 0.06)',
        xl: '0 24px 60px rgba(15, 23, 42, 0.16), 0 8px 20px rgba(15, 23, 42, 0.08)',
        '2xl': '0 32px 80px rgba(15, 23, 42, 0.20)',
        'glow-primary': '0 0 0 4px rgba(99, 102, 241, 0.15), 0 8px 24px rgba(99, 102, 241, 0.25)',
      },
      transitionTimingFunction: {
        'emphasized': 'cubic-bezier(0.2, 0, 0, 1)',
        'spring-soft': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        'spring-bouncy': 'cubic-bezier(0.68, -0.55, 0.27, 1.55)',
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
        'gradient-primary-soft': 'linear-gradient(135deg, #E0E7FF 0%, #EDE9FE 100%)',
        'gradient-accent': 'linear-gradient(135deg, #06B6D4 0%, #6366F1 100%)',
        'gradient-mesh-1': `
          radial-gradient(at 20% 30%, #6366F1 0%, transparent 50%),
          radial-gradient(at 80% 70%, #8B5CF6 0%, transparent 50%),
          radial-gradient(at 50% 50%, #06B6D4 0%, transparent 60%)
        `,
      },
      animation: {
        'shimmer': 'shimmer 1.5s ease-in-out infinite',
        'fade-up': 'fadeUp 250ms ease-out',
        'fade-in': 'fadeIn 200ms ease-out',
        'scale-in': 'scaleIn 200ms cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        fadeUp: {
          '0%': { opacity: 0, transform: 'translateY(8px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: 0 },
          '100%': { opacity: 1 },
        },
        scaleIn: {
          '0%': { opacity: 0, transform: 'scale(0.95)' },
          '100%': { opacity: 1, transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
};
```

### 42.2. CSS variables (cho dark mode + dynamic theming)

`src/index.css`:
```css
@import 'tailwindcss';

@layer base {
  :root {
    --bg-page: 248 250 252;          /* slate-50 */
    --bg-surface: 255 255 255;        /* white */
    --bg-elevated: 255 255 255;
    --border-default: 226 232 240;    /* slate-200 */
    --border-strong: 203 213 225;     /* slate-300 */
    --text-primary: 15 23 42;         /* slate-900 */
    --text-secondary: 71 85 105;      /* slate-600 */
    --text-muted: 100 116 139;        /* slate-500 */
    --accent: 99 102 241;             /* primary-500 */
  }

  [data-theme='dark'] {
    --bg-page: 2 6 23;                /* slate-950 */
    --bg-surface: 15 23 42;           /* slate-900 */
    --bg-elevated: 30 41 59;          /* slate-800 */
    --border-default: 30 41 59;       /* slate-800 */
    --border-strong: 51 65 85;        /* slate-700 */
    --text-primary: 248 250 252;      /* slate-50 */
    --text-secondary: 148 163 184;    /* slate-400 */
    --text-muted: 100 116 139;        /* slate-500 */
    --accent: 129 140 248;            /* primary-400 (brighter for dark) */
  }

  html, body {
    background: rgb(var(--bg-page));
    color: rgb(var(--text-primary));
    font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  }
}

@layer components {
  .btn-primary {
    @apply inline-flex items-center justify-center gap-2 h-10 px-4
           text-sm font-medium text-white
           bg-gradient-to-br from-primary-500 to-violet-500
           rounded-lg shadow-sm
           hover:shadow-md hover:brightness-105
           active:scale-[0.98]
           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2
           disabled:opacity-50 disabled:cursor-not-allowed
           transition-all duration-150 ease-out;
  }

  .btn-secondary {
    @apply inline-flex items-center justify-center gap-2 h-10 px-4
           text-sm font-medium text-slate-700
           bg-slate-100 hover:bg-slate-200 rounded-lg
           active:scale-[0.98]
           transition-all duration-150;
  }

  .input-base {
    @apply w-full h-10 px-3 text-sm
           text-slate-900 placeholder:text-slate-400
           bg-white border border-slate-200 rounded-lg
           focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10
           focus:outline-none
           transition-all duration-150;
  }

  .card-default {
    @apply bg-white border border-slate-200 rounded-xl shadow-sm;
  }

  .badge-success {
    @apply inline-flex items-center gap-1 px-2 py-0.5 rounded-full
           bg-success-50 text-success-700 text-xs font-medium;
  }
  /* ... etc */
}
```

---

## 43. Framer Motion Patterns

### 43.1. Install
```
npm i framer-motion
```

### 43.2. Pattern: Page transition wrapper

```jsx
// components/layout/PageTransition.jsx
import { motion } from 'framer-motion';

export default function PageTransition({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25, ease: [0, 0, 0.2, 1] }}
    >
      {children}
    </motion.div>
  );
}
```

Wrap mỗi route bằng component này.

### 43.3. Pattern: Stagger children

```jsx
const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.1 }
  },
};

const item = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' } },
};

<motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-4 gap-6">
  {stats.map(stat => (
    <motion.div key={stat.id} variants={item} className="card-default p-6">
      ...
    </motion.div>
  ))}
</motion.div>
```

### 43.4. Pattern: Modal entrance

```jsx
import { AnimatePresence, motion } from 'framer-motion';

<AnimatePresence>
  {open && (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.25, ease: [0.34, 1.56, 0.64, 1] }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
          {children}
        </div>
      </motion.div>
    </>
  )}
</AnimatePresence>
```

### 43.5. Pattern: Sidebar active indicator (layoutId)

```jsx
// Sidebar.jsx
{navItems.map(item => (
  <NavLink to={item.to} key={item.to} className="relative ...">
    {({ isActive }) => (
      <>
        {isActive && (
          <motion.div
            layoutId="sidebar-active-bg"
            className="absolute inset-0 bg-gradient-to-r from-primary-500 to-violet-500 rounded-lg"
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
          />
        )}
        <span className="relative z-10 flex items-center gap-3">
          <item.icon size={20} />
          {item.label}
        </span>
      </>
    )}
  </NavLink>
))}
```

→ Khi navigate sang route khác, background gradient **slide smoothly** từ item cũ sang item mới.

### 43.6. Pattern: Number counter

```jsx
import { useEffect, useState } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';

function AnimatedCounter({ value, format = (n) => n.toLocaleString('vi-VN') }) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => format(Math.round(latest)));

  useEffect(() => {
    const controls = animate(count, value, {
      duration: 0.6,
      ease: 'easeOut',
    });
    return controls.stop;
  }, [value]);

  return <motion.span className="font-mono tabular-nums">{rounded}</motion.span>;
}
```

### 43.7. Pattern: Magnetic button

```jsx
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useRef } from 'react';

function MagneticButton({ children, ...props }) {
  const ref = useRef(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const xSpring = useSpring(x, { stiffness: 200, damping: 15 });
  const ySpring = useSpring(y, { stiffness: 200, damping: 15 });

  function handleMouseMove(e) {
    const rect = ref.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    x.set((e.clientX - cx) * 0.2);
    y.set((e.clientY - cy) * 0.2);
  }
  function handleMouseLeave() {
    x.set(0);
    y.set(0);
  }

  return (
    <motion.button
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ x: xSpring, y: ySpring }}
      className="btn-primary"
      {...props}
    >
      {children}
    </motion.button>
  );
}
```

→ Chỉ dùng cho hero CTA login / dashboard primary action.

### 43.8. Pattern: Scroll-driven parallax (login hero)

```jsx
import { motion, useScroll, useTransform } from 'framer-motion';

function HeroParallax() {
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 500], [0, -100]);
  const opacity = useTransform(scrollY, [0, 300], [1, 0.5]);

  return (
    <motion.div style={{ y, opacity }} className="absolute inset-0">
      <img src="/hero-illustration.svg" alt="" />
    </motion.div>
  );
}
```

### 43.9. Pattern: Whileinview reveal

```jsx
<motion.section
  initial={{ opacity: 0, y: 20 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true, margin: '-100px' }}
  transition={{ duration: 0.5, ease: 'easeOut' }}
>
  {children}
</motion.section>
```

### 43.10. Performance tips
- `transform` và `opacity` only (GPU-accelerated).
- Avoid animating `width`, `height`, `top`, `left`.
- Use `will-change: transform` chỉ trên element thực sự cần.
- Lazy-load Framer Motion qua dynamic import nếu route không cần.

---

## 44. Design Tokens (machine-readable JSON)

> Copy file này vào `src/design-tokens.json` để AI Agent / tooling đọc.

```json
{
  "color": {
    "primary": {
      "50":  "#EEF2FF",
      "100": "#E0E7FF",
      "200": "#C7D2FE",
      "300": "#A5B4FC",
      "400": "#818CF8",
      "500": "#6366F1",
      "600": "#4F46E5",
      "700": "#4338CA",
      "800": "#3730A3",
      "900": "#312E81",
      "950": "#1E1B4B"
    },
    "violet": {
      "400": "#A78BFA",
      "500": "#8B5CF6",
      "600": "#7C3AED"
    },
    "cyan": {
      "400": "#22D3EE",
      "500": "#06B6D4",
      "600": "#0891B2"
    },
    "slate": {
      "50":  "#F8FAFC",
      "100": "#F1F5F9",
      "200": "#E2E8F0",
      "300": "#CBD5E1",
      "400": "#94A3B8",
      "500": "#64748B",
      "600": "#475569",
      "700": "#334155",
      "800": "#1E293B",
      "900": "#0F172A",
      "950": "#020617"
    },
    "success": { "50": "#ECFDF5", "500": "#10B981", "600": "#059669", "700": "#047857" },
    "warning": { "50": "#FFFBEB", "500": "#F59E0B", "600": "#D97706", "700": "#B45309" },
    "error":   { "50": "#FFF1F2", "500": "#F43F5E", "600": "#E11D48", "700": "#BE123C" },
    "info":    { "50": "#F0F9FF", "500": "#0EA5E9", "600": "#0284C7", "700": "#0369A1" }
  },
  "typography": {
    "fontFamily": {
      "sans": "Plus Jakarta Sans, Inter, system-ui, sans-serif",
      "mono": "JetBrains Mono, ui-monospace, monospace"
    },
    "scale": {
      "display-2xl": { "size": "60px", "line": "1.0",  "weight": "800" },
      "display-xl":  { "size": "48px", "line": "1.05", "weight": "800" },
      "display-lg":  { "size": "36px", "line": "1.1",  "weight": "700" },
      "h1":          { "size": "30px", "line": "1.2",  "weight": "700" },
      "h2":          { "size": "24px", "line": "1.25", "weight": "600" },
      "h3":          { "size": "20px", "line": "1.3",  "weight": "600" },
      "h4":          { "size": "18px", "line": "1.35", "weight": "600" },
      "body-lg":     { "size": "18px", "line": "1.55", "weight": "400" },
      "body":        { "size": "16px", "line": "1.5",  "weight": "400" },
      "body-sm":     { "size": "14px", "line": "1.5",  "weight": "400" },
      "caption":     { "size": "12px", "line": "1.4",  "weight": "500" },
      "overline":    { "size": "11px", "line": "1.3",  "weight": "600", "tracking": "0.05em", "case": "uppercase" }
    }
  },
  "spacing": {
    "0": "0", "px": "1px", "0.5": "2px", "1": "4px", "1.5": "6px",
    "2": "8px", "2.5": "10px", "3": "12px", "4": "16px", "5": "20px",
    "6": "24px", "8": "32px", "10": "40px", "12": "48px", "16": "64px",
    "20": "80px", "24": "96px"
  },
  "radius": {
    "none": "0", "sm": "2px", "DEFAULT": "6px", "md": "8px",
    "lg": "12px", "xl": "16px", "2xl": "24px", "3xl": "32px", "full": "9999px"
  },
  "shadow": {
    "xs":  "0 1px 2px rgba(15,23,42,0.04)",
    "sm":  "0 2px 4px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.04)",
    "DEFAULT": "0 4px 12px rgba(15,23,42,0.08), 0 1px 3px rgba(15,23,42,0.05)",
    "md":  "0 8px 24px rgba(15,23,42,0.10), 0 2px 6px rgba(15,23,42,0.06)",
    "lg":  "0 16px 40px rgba(15,23,42,0.12), 0 4px 12px rgba(15,23,42,0.06)",
    "xl":  "0 24px 60px rgba(15,23,42,0.16), 0 8px 20px rgba(15,23,42,0.08)",
    "2xl": "0 32px 80px rgba(15,23,42,0.20)",
    "glow-primary": "0 0 0 4px rgba(99,102,241,0.15), 0 8px 24px rgba(99,102,241,0.25)"
  },
  "motion": {
    "duration": {
      "instant": "0ms",
      "fast": "150ms",
      "base": "200ms",
      "smooth": "300ms",
      "slow": "450ms",
      "deliberate": "600ms",
      "cinematic": "800ms"
    },
    "easing": {
      "linear": "cubic-bezier(0, 0, 1, 1)",
      "in": "cubic-bezier(0.4, 0, 1, 1)",
      "out": "cubic-bezier(0, 0, 0.2, 1)",
      "inOut": "cubic-bezier(0.4, 0, 0.2, 1)",
      "emphasized": "cubic-bezier(0.2, 0, 0, 1)",
      "spring-soft": "cubic-bezier(0.34, 1.56, 0.64, 1)",
      "spring-bouncy": "cubic-bezier(0.68, -0.55, 0.27, 1.55)"
    }
  },
  "breakpoint": {
    "sm": "640px",
    "md": "768px",
    "lg": "1024px",
    "xl": "1280px",
    "2xl": "1536px"
  },
  "zIndex": {
    "base": 0, "sticky": 10, "dropdown": 20, "toast": 30,
    "modal-backdrop": 40, "modal-content": 50, "drawer": 60,
    "popover": 70, "command-palette": 90, "page-transition": 100
  }
}
```

---

# Phần H — Phụ lục

## 45. Component Checklist

Khi triển khai bộ component, dùng checklist này để đảm bảo đầy đủ:

- [ ] **Buttons:** Primary / Secondary / Outline / Ghost / Danger / Soft Danger / Link / Icon-only / Button Group — đủ 5 sizes × 5 states
- [ ] **Forms:** Input / Textarea / Select / Combobox / Checkbox / Radio / Toggle / DatePicker / TimePicker / FileUpload (drag-drop)
- [ ] **Cards:** Flat / Default / Elevated / Featured / Outlined / Glass
- [ ] **Modal & Drawer:** sm / md / lg / xl / full; bottom sheet cho mobile
- [ ] **Tables:** sortable / filterable / paginated / bulk-actionable / skeleton / empty state / mobile card stack
- [ ] **Navigation:** Sidebar (expanded + collapsed) / Header / Breadcrumb / Command Palette / Mobile drawer
- [ ] **Feedback:** Toast (4 variants) / Tooltip / Popover / Confirmation modal
- [ ] **Badges & Tags:** All semantic variants + dismissible
- [ ] **Tabs:** Underline + Pill variants
- [ ] **Stepper:** Horizontal + Vertical
- [ ] **Pagination:** Number + Prev/Next
- [ ] **Empty states:** Per page (≥ 6 unique illustrations)
- [ ] **Skeletons:** Card / Table row / List item / Detail page
- [ ] **Charts:** Line / Bar / Donut / Sparkline
- [ ] **Avatar:** Single + Group + with status dot
- [ ] **Progress:** Linear bar + Circular spinner + Step
- [ ] **Loader:** Spinner / Skeleton / Page-level

## 46. Page Inventory Checklist

Mỗi page hoàn chỉnh cần có:
- [ ] Loading state (skeleton)
- [ ] Empty state (illustration + CTA)
- [ ] Error state (404 / 500 fallback)
- [ ] Mobile responsive (≤ 640px)
- [ ] Tablet (≤ 1024px)
- [ ] Desktop (default)
- [ ] Dark mode (Phase B)
- [ ] Keyboard nav tested
- [ ] Screen reader tested
- [ ] Vietnamese copy reviewed
- [ ] Motion respects `prefers-reduced-motion`

15 pages:
1. [ ] Login
2. [ ] Dashboard
3. [ ] Students list + Create/Edit modal
4. [ ] Parents list + modal
5. [ ] Teachers list + modal
6. [ ] Classes list + modal
7. [ ] Attendance grid (3-month + week timesheet)
8. [ ] Attendance Periods list + Review modal
9. [ ] Receipts list + Create modal + PDF preview
10. [ ] Payments list + Create modal + PDF preview
11. [ ] Fee Collection (status filter + pay flow)
12. [ ] History (unified receipts + payments)
13. [ ] Reports (date range + charts + export)
14. [ ] Templates list + Designer (full-screen Fabric.js)
15. [ ] Settings (Phase C)

## 47. Quality Gates

Trước khi merge UI change vào main:

- [ ] **Visual review** — match Figma / Stitch design.
- [ ] **Token compliance** — không hardcode hex / px ngoài system.
- [ ] **Accessibility** — axe DevTools 0 critical issues.
- [ ] **Lighthouse** — Performance ≥ 80, Accessibility ≥ 95.
- [ ] **Cross-browser** — Chrome, Safari, Firefox latest.
- [ ] **Responsive** — test 375 / 768 / 1280 / 1920.
- [ ] **VN typography** — diacritics không bị cắt, line-height ≥ 1.5.
- [ ] **Motion** — `prefers-reduced-motion` tested.
- [ ] **Keyboard** — tab order đúng, ESC modal, Enter submit.
- [ ] **Screen reader** — VoiceOver / NVDA pass smoke.
- [ ] **Dark mode** (Phase B) — visual parity.
- [ ] **i18n future-ready** — strings tách biệt, không inline hardcode.
- [ ] **Storybook** (Phase B) — story per component.
- [ ] **Tests** (Phase B) — Playwright smoke pass.

---

## Lời kết

Bộ guideline này là **living document** — sẽ tiến hoá theo feedback từ Stitch / Figma AI / dev team. Khi có conflict giữa token và component spec, ưu tiên token. Khi có ambiguity, ưu tiên **calm + comfortable + smooth** (theo design philosophy §1).

**Quy trình hoạt động đề xuất:**
1. Designer dùng Figma + Tokens Studio để build component library.
2. Designer dùng Stitch để rough-out screen, ref guideline.
3. Hand off Figma → Dev qua Dev Mode + Storybook.
4. AI Agent (Cursor / Claude Code) đọc guideline + Figma export → implement.
5. QA chạy quality gate checklist §47.
6. Ship.

**File tham chiếu liên quan:**
- `docs/PRD_EDU_MANAGER_V2.md` — PRD foundational
- `docs/PRD_CURRENT_STATE.md` — Hiện trạng sản phẩm
- `docs/PRD_KANBAN_SOLUTION.md` — Plan giải pháp
- `docs/DESIGN_GUIDELINE.md` — File này

---

**Hết Design Guideline.** Mọi câu hỏi hoặc đề xuất chỉnh sửa, vui lòng tạo issue trên GitHub hoặc liên hệ design lead.








