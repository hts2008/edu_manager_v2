# 🎸 VIBE CODING PLAYBOOK
<!-- VI: Playbook cho phương pháp Vibe Coding -->

> **Mục tiêu**: Coding bằng natural language, để AI làm phần nặng

---

## 📋 VIBE CODING LÀ GÌ?

**Vibe Coding** = Coding không cần viết code trực tiếp:
- Describe what you want in natural language
- AI generates the code
- You review and steer
- Iterate until perfect

**Philosophy**: "Focus on the WHAT, let AI handle the HOW"

---

## 1. NGUYÊN TẮC CỐT LÕI

### Agent-First Paradigm
```
OLD: Con người viết code, AI assist
NEW: AI viết code, con người review & steer
```

### Continuous Review
```
- Review mọi thay đổi AI tạo ra
- Type checker, linter chạy liên tục
- Tests verify correctness
- Human validates intent
```

### Iterative Refinement
```
Prompt → Generate → Review → Refine → Repeat
```

---

## 2. VIBE CODING WORKFLOW

### Phase 1: Setup Context

```markdown
## Context Loading

Trước khi bắt đầu vibe coding session:

1. Load project context
   /start-session

2. Explain current state
   "Đang có [X], muốn thêm [Y]"

3. Set constraints
   "Dùng [tech stack], theo [pattern]"
```

### Phase 2: Describe Intent

```markdown
## Intent Description

Mô tả WHAT bạn muốn, không phải HOW:

❌ Bad: "Tạo function fetchUsers với axios call đến /api/users"
✅ Good: "Tôi cần lấy danh sách users để hiển thị trong table"

❌ Bad: "Thêm useState cho loading, error, data"
✅ Good: "Handle loading và error states cho API call"

❌ Bad: "Dùng map để render each item"
✅ Good: "Hiển thị list items với proper styling"
```

### Phase 3: Iterate

```markdown
## Iteration Prompts

Sau khi AI generate code:

### Refine
"Thêm [feature] vào phần này"
"Đổi [X] thành [Y]"
"Handle thêm case [edge case]"

### Fix
"Code này có lỗi [error], fix đi"
"Test failed vì [reason], sửa đi"

### Improve
"Làm đẹp hơn"
"Tối ưu performance"
"Thêm error handling"
```

### Phase 4: Verify

```markdown
## Verification

Verify AI code bằng:

1. Type checking
   - TypeScript errors?
   - Type safety?

2. Linting
   - ESLint warnings?
   - Code style?

3. Tests
   - Unit tests pass?
   - Integration tests?

4. Manual review
   - Logic đúng không?
   - Security OK?
   - Performance OK?
```

---

## 3. AGENTIC PROMPTS FOR VIBE CODING

### Start Vibe Session
```markdown
Bắt đầu vibe coding session:

Project: [project name]
Goal: [what you want to achieve]
Tech: [tech stack from PROJECT_CONTEXT.md]

Hãy đi từng bước, hỏi khi cần clarification,
và show work sau mỗi step.
```

### Feature Development
```markdown
Tôi muốn: [feature description in plain language]

Context:
- Đang ở: [file/component hiện tại]
- Related to: [existing code]
- Constraints: [any limits]

Generate code và explain decisions.
```

### UI Development
```markdown
Tạo UI cho: [screen/component description]

Style: [từ UI_STYLES.md - ví dụ: Glassmorphism]
Colors: [từ COLOR_PALETTES.md]
Font: [từ FONT_PAIRINGS.md]

Reference: [screenshot hoặc description]
```

### Bug Fix
```markdown
Có bug: [description]

Symptoms: [what you see]
Expected: [what should happen]
Context: [relevant code]

Tìm và fix bug, explain root cause.
```

### Refactoring
```markdown
Refactor code này: [code block hoặc file]

Goals:
- [goal 1: e.g., improve readability]
- [goal 2: e.g., reduce duplication]
- [goal 3: e.g., better types]

Keep same functionality.
```

---

## 4. STEERING TECHNIQUES

### Approval Loops
```
AI: [generates code]
You: "Looks good, proceed"
You: "Wait, change X to Y first"
You: "No, try a different approach"
```

### Contextual Comments
```
// IMPORTANT: This must work with existing auth
// TODO: Add caching later
// CONSTRAINT: Must handle 10k items
```

### Progressive Disclosure
```
Step 1: "Tạo basic structure"
Step 2: "Add core functionality"
Step 3: "Add error handling"
Step 4: "Add edge cases"
Step 5: "Polish and optimize"
```

---

## 5. LỆNH VIBE CODING

| Command | Description |
|---------|-------------|
| `/vibe [feature]` | Start vibe coding feature |
| `/iterate` | Continue iterating current |
| `/refine [feedback]` | Refine với feedback |
| `/verify` | Run verification suite |
| `/polish` | Final polish pass |

---

## 6. IDE-SPECIFIC TIPS

### Cursor
- Inline edit với Cmd+K
- Multi-file context với @files
- Composer cho big changes

### Antigravity
- Use @file references
- Conversation context
- Project-wide changes

### Copilot
- Inline suggestions
- Chat for explanations
- Comment-driven development

---

## 7. BEST PRACTICES

### ✅ NÊN

1. **Mô tả rõ intent**
   - What, not how
   - Context đầy đủ
   - Constraints explicit

2. **Review kỹ output**
   - Đọc code AI generate
   - Chạy type checker
   - Run tests

3. **Iterate thường xuyên**
   - Nhỏ steps
   - Verify mỗi step
   - Refine as needed

4. **Maintain quality**
   - Don't accept bad code
   - Ask for improvements
   - Polish final result

### ❌ KHÔNG NÊN

1. **Blind copy-paste**
   - Không review code
   - Accept errors

2. **Vague prompts**
   - "Make it work"
   - "Fix this"
   - No context

3. **Skip verification**
   - No tests
   - No type checking
   - Ship without review

---

## 8. COMMON VIBE PATTERNS

### Pattern 1: Incremental Feature
```
"Add basic [feature]"
↓ verify
"Now add [enhancement 1]"
↓ verify
"Handle [edge case]"
↓ verify
"Polish UI"
↓ ship
```

### Pattern 2: Test-First Vibe
```
"Write tests for [feature]"
↓ verify tests make sense
"Implement to pass these tests"
↓ verify all pass
"Refactor for clarity"
↓ ship
```

### Pattern 3: UI-First Vibe
```
"Create UI mockup for [screen]"
↓ approve design
"Add interactivity"
↓ verify behavior
"Connect to API"
↓ verify data flow
"Polish and ship"
```

---

## 9. TROUBLESHOOTING

### AI Không Hiểu Ý
```
"Không phải ý tôi. Để tôi clarify:
- Tôi muốn [X], không phải [Y]
- Context là [specific context]
- Constraint là [limit]"
```

### Code Không Work
```
"Code này có issue: [error message]
Context: [what you're trying to do]
Fix và explain what was wrong."
```

### Output Quá Complex
```
"Đơn giản hóa approach.
YAGNI - chỉ cần [minimal features].
Bỏ [unnecessary parts]."
```

---

**Version**: 3.0
**Last Updated**: 2026-01-04
