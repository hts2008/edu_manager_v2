# 📚 HƯỚNG DẪN SỬ DỤNG AGENT_CODING FRAMEWORK v3.0
<!-- Vietnamese User Guide / Playbook -->

> **Mục tiêu**: Hướng dẫn đầy đủ cách sử dụng Agent_Coding Framework v3.0
> để làm việc hiệu quả với các AI Agent trong phát triển phần mềm.

---

## 📋 MỤC LỤC

### Cơ Bản
1. [Giới Thiệu](#1-giới-thiệu)
2. [Cài Đặt](#2-cài-đặt)
3. [Kích Hoạt Lần Đầu](#3-kích-hoạt-lần-đầu)
4. [Chuyển Cửa Sổ Mới](#4-chuyển-cửa-sổ-mới-khi-hết-token)

### Use Cases
5. [Yêu Cầu Fix Bug](#5-yêu-cầu-fix-bug)
6. [Yêu Cầu QA/QC](#6-yêu-cầu-qaqc)
7. [Các Lệnh Mẫu](#7-các-lệnh-mẫu)

### v3.0 Features
8. [Meta-System](#8-meta-system-v30)
9. [UltraThink Mode](#9-ultrathink-mode-v30)
10. [Internet Search](#10-internet-search-v30)
11. [Vibe Coding](#11-vibe-coding-v30)
12. [Workflow Chains](#12-workflow-chains-v30)

### Reference
13. [19 Agents](#13-danh-sách-agents)
14. [Best Practices](#14-best-practices)

---

## 1. GIỚI THIỆU

### Agent_Coding là gì?

Agent_Coding là một framework điều phối AI Agent, cho phép nhiều model AI
(Gemini, Claude, GPT, Grok) làm việc như một team phát triển sản phẩm thực sự.

### Tính Năng Mới v3.0

| Feature | Description |
|---------|-------------|
| **🎯 19 Specialized Agents** | +5 agents mới (researcher, brainstormer, scout, git_manager, docs_manager) |
| **🔮 Meta-System** | Tự tạo skills/plugins/agents mới |
| **🧠 UltraThink Mode** | Deep reasoning trước khi code |
| **🔍 Internet Search** | Search GitHub, SO, NPM trước khi implement |
| **🎸 Vibe Coding** | Natural language coding |
| **⛓️ Workflow Chains** | Automation command chains |

### Giải quyết vấn đề gì?

**Vấn đề chính**: Khi chat window hết token, AI không nhớ gì về project.

**Giải pháp**: 
- Lưu trữ context trong file PROJECT_CONTEXT.md
- Theo dõi task qua KANBAN.md
- Ghi nhận bugs và lessons learned trong knowledge_base
- Protocol bàn giao khi chuyển session

### Các IDE hỗ trợ

| IDE | File Hướng Dẫn |
|-----|----------------|
| VSCode + Copilot/Gemini | COPILOT.md, GEMINI.md |
| Cursor | .cursorrules, .cursor/ |
| Antigravity | .agent/, GEMINI.md |
| Claude Code | CLAUDE.md, .claude/ |
| Windsurf | .windsurf/rules.md |

---

## 2. CÀI ĐẶT

### Bước 1: Copy Framework

```bash
# Copy toàn bộ thư mục Agent_Coding vào project của bạn
cp -r Agent_Coding/* /đường/dẫn/project/của/bạn/
```

### Bước 2: Điền Thông Tin Project

Mở `PROJECT_CONTEXT.md` và điền:
- Project Name
- Description
- Architecture (chọn từ .shared/tech_stacks/architectures/)
- Tech Stack (tham khảo TECH_STACK_CATALOG.md)

### Bước 3: Setup KANBAN

Mở `KANBAN.md` và thêm các task ban đầu vào BACKLOG.

---

## 3. KÍCH HOẠT LẦN ĐẦU

### Với Cursor / Antigravity

Trong chat, gõ:
```
/start-session
```

Hoặc chi tiết hơn:
```
Đọc GEMINI.md (hoặc CLAUDE.md) và khởi tạo session làm việc.
Tôi muốn bắt đầu làm việc với project này.
```

### Với VSCode + Copilot

Trong Copilot Chat:
```
@workspace Đọc COPILOT.md và khởi tạo session. 
Tóm tắt PROJECT_CONTEXT.md và KANBAN.md cho tôi.
```

### Với Claude Code

```
Đọc file CLAUDE.md và thực hiện session initialization protocol.
```

### Kết quả mong đợi

AI sẽ trả lời tương tự:
```
✅ Context loaded successfully

📋 Project: [Tên Project]
🎯 Sprint: [Sprint hiện tại] (X/Y tasks)
🔄 In Progress: X tasks
🚧 Blockers: X
🐛 Active Bugs: X

🆕 v3.0 Features Available:
- /meta:* - Create new skills/plugins/agents
- /ultrathink - Deep reasoning mode
- /search:* - Internet research
- /cook - Feature development chain

🎯 Recommended Next Action: [Gợi ý việc tiếp theo]
```

---

## 4. CHUYỂN CỬA SỔ MỚI (KHI HẾT TOKEN)

### TRƯỚC KHI ĐÓNG cửa sổ cũ

Gõ lệnh:
```
/handover
```

Hoặc chi tiết:
```
Thực hiện handover protocol:
1. Update PROJECT_CONTEXT.md với công việc đã làm
2. Update KANBAN.md với trạng thái tasks
3. Ghi lại handover notes cho session tiếp theo
```

### SAU KHI MỞ cửa sổ mới

Gõ lệnh:
```
/start-session
```

AI sẽ đọc PROJECT_CONTEXT.md và tiếp tục từ handover notes.

### Checklist Bàn Giao

- [ ] PROJECT_CONTEXT.md đã update
- [ ] KANBAN.md đã update
- [ ] Bugs đã log (nếu có)
- [ ] Lessons learned đã ghi (nếu có)
- [ ] Handover notes đã viết

---

## 5. YÊU CẦU FIX BUG

### Báo Bug Mới

```
Tôi phát hiện bug:
- Mô tả: [Mô tả lỗi]
- Bước tái hiện: [Các bước]
- Expected: [Kết quả mong đợi]
- Actual: [Kết quả thực tế]

Log bug này và bắt đầu sửa.
```

### Fix Bug Đã Log

```
/fix-bug BUG-042
```

### v3.0: Quick Fix Commands

```
/fix:hard "[bug description]"   # Deep analysis + fix
/fix:logs                        # Fix from error logs
/fix:test                        # Fix failing tests
/fix:ci [url]                    # Fix CI failures
```

### Yêu Cầu RCA (Root Cause Analysis)

```
/rca BUG-042
```

---

## 6. YÊU CẦU QA/QC

### Test Feature

```
/qa [tên feature]
```

### Code Review

```
/review
```

### v3.0: Deep Review

```
/ultrathink:review [file]
```

### Performance Testing

```
/perf-check [component]
```

### Security Audit

```
/security-audit [component]
```

---

## 7. CÁC LỆNH MẪU

### Orchestration

| Lệnh | Mô tả |
|------|-------|
| `/start-session` | Khởi động session mới |
| `/handover` | Bàn giao trước khi đóng |
| `/status` | Xem trạng thái project |
| `/kanban` | Xem bảng Kanban |
| `/resume` | Resume session trước |

### Giao Việc Cho Agent

```
/assign backend "Tạo API đăng nhập với JWT"
/assign frontend "Xây dựng trang login với Glassmorphism style"  
/assign database "Thiết kế schema cho user management"
/assign uiux "Thiết kế design system cho dashboard"
/assign qa "Viết test cho authentication flow"
/assign researcher "Research best auth library"
/assign scout "Tìm file liên quan đến auth"
```

### Development

```
/plan [feature]     # Lập kế hoạch
/code [task]        # Implement code
/test [component]   # Viết tests
/debug [issue]      # Debug vấn đề
/review             # Review code
```

### v3.0: Advanced Development

```
/cook [feature]         # Full feature workflow
/cook:auto [feature]    # Auto implement
/cook:auto:fast [feat]  # Skip research, fast implement
/refactor [target]      # Code refactoring
/ask [question]         # Technical Q&A
/brainstorm [topic]     # Creative ideation
/yolo                   # Execute without confirmation
```

### Quality

```
/qa [feature]       # QA testing
/rca [bug-id]       # Root Cause Analysis
/fix-bug [bug-id]   # Sửa bug
/security-audit     # Audit bảo mật
/perf-check         # Check performance
```

---

## 8. META-SYSTEM (v3.0)

Meta-System cho phép tự tạo components mới.

### Tạo Skill Mới
```
/meta:skill [skill-name]
```

### Tạo Agent Mới
```
/meta:agent [agent-name]
```

### Phân Tích Pattern
```
/meta:analyze [path]
```

📖 **Chi tiết**: Xem [09_META_SYSTEM.md](09_META_SYSTEM.md)

---

## 9. ULTRATHINK MODE (v3.0)

Chế độ suy nghĩ sâu như craftsman trước khi code.

### Kích Hoạt
```
/ultrathink [problem]
```

### Deep Planning
```
/ultrathink:plan [feature]
```

### Deep Review
```
/ultrathink:review [code]
```

📖 **Chi tiết**: Xem [10_ULTRATHINK.md](10_ULTRATHINK.md)

---

## 10. INTERNET SEARCH (v3.0)

Tìm kiếm trước khi implement.

### Search GitHub
```
/search:github [query]
```

### Search StackOverflow
```
/search:stackoverflow [query]
```

### Search NPM
```
/search:npm [package type]
```

### Comprehensive Search
```
/search:all [query]
```

📖 **Chi tiết**: Xem [11_INTERNET_SEARCH.md](11_INTERNET_SEARCH.md)

---

## 11. VIBE CODING (v3.0)

Coding bằng natural language.

### Bắt Đầu Vibe Session
```
Tôi muốn [mô tả feature bằng ngôn ngữ tự nhiên]
```

### Iterate
```
Thêm [feature] vào phần này
Đổi [X] thành [Y]
Làm đẹp hơn
```

📖 **Chi tiết**: Xem [12_VIBE_CODING.md](12_VIBE_CODING.md)

---

## 12. WORKFLOW CHAINS (v3.0)

Automation command chains.

### Feature Chain
```
/chain feature "[feature]"
# /plan → /code → /test → /git:cm
```

### Bug Fix Chain
```
/chain fix "[bug]"
# /debug → /fix → /test → /git:cm
```

### Deploy Chain
```
/chain deploy [env]
# /test → /security → /build → /deploy
```

📖 **Chi tiết**: Xem [13_WORKFLOW_CHAINS.md](13_WORKFLOW_CHAINS.md)

---

## 13. DANH SÁCH AGENTS

### Core Development (7)
| Agent | Role |
|-------|------|
| @solution_architect | Kiến trúc hệ thống |
| @tech_lead | Lead kỹ thuật, code review |
| @fullstack | Full-stack development |
| @backend | Backend, API, database |
| @frontend | UI, UX, client logic |
| @api_developer | API design |
| @database | Database design |

### Specialized (5)
| Agent | Role |
|-------|------|
| @web_developer | HTML, CSS, vanilla JS |
| @uiux | Design, UX |
| @qa | Testing, QA |
| @devops | CI/CD, deployment |
| @pm | Project management |

### Security & Performance (2)
| Agent | Role |
|-------|------|
| @security | Security audit |
| @performance | Performance tuning |

### v3.0 New Agents (5)
| Agent | Role |
|-------|------|
| @researcher | Research, analysis |
| @brainstormer | Creative ideation |
| @scout | Codebase navigation |
| @git_manager | Git operations |
| @docs_manager | Documentation |

---

## 14. BEST PRACTICES

### ✅ NÊN LÀM

1. **Luôn chạy `/start-session` khi mở chat mới**
   - AI cần load context để hiểu project

2. **Luôn chạy `/handover` trước khi đóng chat**
   - Bảo toàn context cho session tiếp

3. **Dùng v3.0 features cho complex tasks**
   - `/ultrathink` cho architectural decisions
   - `/search:*` trước khi implement
   - `/cook` cho feature development

4. **Cập nhật KANBAN.md thường xuyên**
   - Di chuyển tasks khi status thay đổi

5. **Log bugs ngay khi phát hiện**
   - Không để mất thông tin quan trọng

6. **Ghi lessons learned**
   - Giúp AI và developer khác học hỏi

7. **Sử dụng agent phù hợp**
   - Backend cho API, Frontend cho UI, v.v.

### ❌ KHÔNG NÊN

1. **Đóng chat không handover**
   - Context sẽ mất

2. **Yêu cầu không rõ ràng**
   - Cung cấp đủ thông tin cho AI

3. **Bỏ qua warnings từ AI**
   - AI có thể đang cảnh báo vấn đề quan trọng

4. **Thay đổi tech stack không ADR**
   - Quyết định quan trọng cần document

---

## 🆘 TROUBLESHOOTING

### AI Không Nhớ Context

**Vấn đề**: AI trả lời như không biết project
**Giải pháp**: 
```
Đọc PROJECT_CONTEXT.md và KANBAN.md để load context.
```

### AI Làm Sai Tech Stack

**Vấn đề**: AI dùng công nghệ khác với đã chọn
**Giải pháp**:
```
Đọc .shared/tech_stacks/TECH_STACK_CATALOG.md và 
PROJECT_CONTEXT.md để biết tech stack đã chọn.
```

### Không Thể Resume Task

**Vấn đề**: Không tiếp tục được task từ session trước
**Giải pháp**:
```
1. Kiểm tra KANBAN.md - task đang ở cột nào
2. Đọc PROJECT_CONTEXT.md - Handover Notes section
3. Chạy /start-session để load lại context
```

---

## 📞 QUICK REFERENCE

### File Quan Trọng

| File | Mục đích |
|------|----------|
| PROJECT_CONTEXT.md | Trạng thái project hiện tại |
| KANBAN.md | Quản lý tasks |
| CLAUDE.md / GEMINI.md | Hướng dẫn cho AI |
| .shared/tech_stacks/ | Tham chiếu công nghệ |
| .shared/knowledge_base/ | Bugs, lessons learned |
| .agent/workflows/ | Quy trình làm việc |
| .agent/agents/ | Định nghĩa 19 agents |
| docs/playbook_vi/ | Playbooks (09-14 for v3.0) |

### Lệnh Hay Dùng

```
# Basic
/start-session              # Bắt đầu
/handover                   # Bàn giao
/status                     # Xem trạng thái

# Development
/cook [feature]             # Feature chain
/assign [agent] [task]      # Giao việc
/review                     # Code review

# v3.0 Features
/ultrathink [problem]       # Deep thinking
/search:all [query]         # Research
/chain feature [feat]       # Automation
/meta:skill [name]          # Create skill
```

---

**Version**: 3.0
**Ngôn ngữ**: Tiếng Việt
**Last Updated**: 2026-01-04
