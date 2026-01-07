# 📝 SESSION LOG TEMPLATE
<!-- VI: Template ghi log phiên làm việc. Copy file này để tạo log mới -->

> **USAGE**: Copy this template to start a new session log.
> Save as: `SESSION_LOG_{YYYY-MM-DD}_{HH-MM}.md`

---

## 📋 Session Information

| Field | Value |
|-------|-------|
| **Session ID** | `{TIMESTAMP}` |
| **Agent Role** | [Orchestrator / Architect / Backend / Frontend / ...] |
| **Model Used** | [Claude / Gemini / GPT / ...] |
| **Started** | `{DATETIME}` |
| **Ended** | `{DATETIME}` |
| **Duration** | `{DURATION}` |

---

## ✅ Context Loaded

<!-- VI: Đánh dấu các file đã đọc khi bắt đầu phiên -->

- [ ] PROJECT_CONTEXT.md
- [ ] KANBAN.md
- [ ] Active bugs (`.shared/knowledge_base/bugs/active/`)
- [ ] Lessons learned
- [ ] Tech stack references
- [ ] Other: _______________

**Context Summary at Start:**
```
Sprint: {current_sprint}
In Progress: {count} tasks
Blockers: {count}
Active Bugs: {count}
```

---

## 🎯 Session Goals

<!-- VI: Mục tiêu của phiên làm việc -->

1. [ ] Goal 1: _______________
2. [ ] Goal 2: _______________
3. [ ] Goal 3: _______________

---

## 📜 Actions Log

<!-- VI: Log các hành động theo thời gian -->

| Time | Action | Status | Notes |
|------|--------|--------|-------|
| {HH:MM} | Started session | ✅ | Context loaded successfully |
| {HH:MM} | {Action description} | ✅/❌/⏳ | {Notes} |
| {HH:MM} | {Action description} | ✅/❌/⏳ | {Notes} |

---

## 📁 Files Modified

<!-- VI: Danh sách file đã thay đổi -->

| File | Change Type | Description |
|------|-------------|-------------|
| `path/to/file1.ts` | Created / Modified / Deleted | {description} |
| `path/to/file2.ts` | Created / Modified / Deleted | {description} |

---

## 🤔 Decisions Made

<!-- VI: Các quyết định đã đưa ra trong phiên -->

| Decision | Rationale | Impact | ADR? |
|----------|-----------|--------|------|
| {Decision 1} | {Why} | {What it affects} | Yes/No |
| {Decision 2} | {Why} | {What it affects} | Yes/No |

---

## 🚧 Blockers Encountered

<!-- VI: Các vấn đề chặn tiến độ -->

| Blocker | Impact | Resolution | Time Spent |
|---------|--------|------------|------------|
| {Blocker 1} | {Impact} | {How resolved or still pending} | {time} |

---

## 🐛 Bugs Found

<!-- VI: Các lỗi phát hiện trong phiên -->

| Bug ID | Severity | Description | Status |
|--------|----------|-------------|--------|
| BUG-XXX | High/Med/Low | {Description} | Logged/Fixed |

---

## 🎓 Lessons Learned

<!-- VI: Bài học kinh nghiệm rút ra -->

| Category | Lesson | Added to KB? |
|----------|--------|--------------|
| Best Practice | {Lesson} | Yes/No |
| Anti-Pattern | {Lesson} | Yes/No |
| Gotcha | {Lesson} | Yes/No |

---

## 📊 Session Metrics

<!-- VI: Thống kê phiên làm việc -->

| Metric | Value |
|--------|-------|
| Tasks Completed | {count} |
| Tasks Started | {count} |
| Bugs Fixed | {count} |
| Bugs Found | {count} |
| Files Changed | {count} |
| Decisions Made | {count} |

---

## 📝 Handover Notes

<!-- VI: Ghi chú bàn giao cho phiên tiếp theo -->

### Work Completed
- {Item 1}
- {Item 2}
- {Item 3}

### In Progress (Not Completed)
- {Item 1}: {status and what's left}
- {Item 2}: {status and what's left}

### Next Steps
1. {Recommended next action}
2. {Recommended next action}
3. {Recommended next action}

### Critical Context for Next Session
```
{Any important information the next agent must know}
```

### Warnings/Cautions
- ⚠️ {Warning 1}
- ⚠️ {Warning 2}

---

**Session Closed**: `{DATETIME}`
**Handover Status**: Complete / Incomplete
**Context Updated**: Yes / No
