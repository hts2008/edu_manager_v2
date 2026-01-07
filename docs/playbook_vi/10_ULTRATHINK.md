# 🧠 ULTRATHINK PLAYBOOK
<!-- VI: Playbook sử dụng UltraThink mode cho deep reasoning -->

> **Mục tiêu**: Hướng dẫn kích hoạt chế độ suy nghĩ sâu như craftsman

---

## 📋 ULTRATHINK LÀ GÌ?

UltraThink là chế độ **suy nghĩ sâu** trước khi code:
- Như Da Vinci nghiên cứu trước khi vẽ
- Như Jobs đòi hỏi "insanely great"
- Iterate cho đến khi elegant

**6 PHASES**: Question → Obsess → Plan → Craft → Iterate → Simplify

---

## 1. KHI NÀO DÙNG ULTRATHINK?

| Situation | Dùng UltraThink | Dùng Cách Thường |
|-----------|-----------------|------------------|
| Architectural decisions | ✅ | ❌ |
| Complex algorithms | ✅ | ❌ |
| Critical systems | ✅ | ❌ |
| Simple CRUD | ❌ | ✅ |
| Minor UI changes | ❌ | ✅ |
| Bug fixes (đơn giản) | ❌ | ✅ |

---

## 2. ULTRATHINK WORKFLOW

### Phase 1: QUESTION - Đặt Câu Hỏi

```markdown
/ultrathink [problem description]

## PHASE 1: QUESTION

Trước khi làm gì, trả lời:

1. **Why?** - Tại sao cần làm điều này?
   - Business value là gì?
   - User nào hưởng lợi?
   - Điều gì xảy ra nếu không làm?

2. **What if?** - Giả định nào đang có?
   - Liệt kê tất cả assumptions
   - Challenge mỗi assumption
   - Có alternative nào không?

3. **How might we?** - Có thể giải quyết bằng cách nào?
   - Ít nhất 3 approaches khác nhau
   - Pros/cons của mỗi approach
```

### Phase 2: OBSESS - Nghiên Cứu Kỹ

```markdown
## PHASE 2: OBSESS

Nghiên cứu như một craftsman:

1. **Study the masters** - Học từ những người giỏi nhất
   - Tương tự problems đã được giải quyết như thế nào?
   - Best practices trong industry là gì?
   - Có open source nào tham khảo?

2. **Understand deeply** - Hiểu thật sâu
   - Đọc documentation, không skim
   - Hiểu edge cases
   - Hiểu failure modes

3. **Question everything** - Hỏi mọi thứ
   - Tại sao làm cách này?
   - Có cách đơn giản hơn không?
   - 10x better solution là gì?
```

### Phase 3: PLAN - Lên Kế Hoạch

```markdown
## PHASE 3: PLAN

Lên kế hoạch như Da Vinci:

1. **Draw before building**
   - Sketch architecture
   - Define interfaces
   - Identify dependencies

2. **Anticipate problems**
   - Edge cases nào có thể xảy ra?
   - Failure scenarios?
   - Scale considerations?

3. **Define success**
   - Metrics cụ thể là gì?
   - Definition of Done?
   - Acceptance criteria?
```

### Phase 4: CRAFT - Thực Hiện

```markdown
## PHASE 4: CRAFT

Code như một craftsman:

1. **Precision** - Chính xác
   - Mỗi dòng code có purpose
   - Naming rõ ràng
   - No unnecessary complexity

2. **Quality** - Chất lượng
   - Tests first hoặc alongside
   - Error handling đầy đủ
   - Documentation inline

3. **Pride** - Tự hào về code
   - Would you show this to a master?
   - Is this your best work?
```

### Phase 5: ITERATE - Lặp Lại

```markdown
## PHASE 5: ITERATE

Refine cho đến khi excellent:

1. **Review critically**
   - Đọc lại code như người khác đọc
   - Tìm chỗ có thể improve
   - Ask: "Can this be better?"

2. **Get feedback**
   - Code review từ peers
   - User testing nếu có UI
   - Performance testing

3. **Improve continuously**
   - Address mọi feedback
   - Không settle for "good enough"
   - Aim for "insanely great"
```

### Phase 6: SIMPLIFY - Đơn Giản Hóa

```markdown
## PHASE 6: SIMPLIFY

Đơn giản hóa ruthlessly:

1. **Remove** - Bỏ những gì không cần
   - Dead code
   - Redundant logic
   - Over-engineering

2. **Refactor** - Tái cấu trúc
   - DRY - Don't Repeat Yourself
   - Single Responsibility
   - Clear abstractions

3. **Clarify** - Làm rõ ràng
   - Better names
   - Simpler logic
   - Clear documentation
```

---

## 3. AGENTIC PROMPTS

### Deep Planning
```markdown
/ultrathink:plan [feature]

@file .agent/modes/ULTRATHINK.md

Kích hoạt UltraThink mode cho planning:

Feature: [feature name]

Đi qua đầy đủ 6 phases:
1. QUESTION: Challenge assumptions
2. OBSESS: Research deeply
3. PLAN: Design thoroughly
4. CRAFT: Define implementation
5. ITERATE: Review plan
6. SIMPLIFY: Streamline approach

Output: Comprehensive plan với justification cho mọi decision
```

### Deep Review
```markdown
/ultrathink:review [code/file]

@file .agent/modes/ULTRATHINK.md

Kích hoạt UltraThink mode cho code review:

Target: [code to review]

Review như một master craftsman:
1. Is this the simplest solution?
2. Is every line necessary?
3. Is naming crystal clear?
4. Are edge cases handled?
5. Is it testable?
6. Would you be proud of this code?

Output: Detailed review với actionable improvements
```

### Deep Debug
```markdown
/ultrathink:debug [issue]

@file .agent/modes/ULTRATHINK.md

Kích hoạt UltraThink mode cho debugging:

Issue: [issue description]

Debug systematically:
1. QUESTION: What exactly is wrong?
2. OBSESS: Reproduce, log, trace
3. PLAN: Hypothesis testing
4. CRAFT: Minimal fix
5. ITERATE: Verify fix
6. SIMPLIFY: Prevent recurrence

Output: Root cause + elegant fix + prevention
```

---

## 4. LỆNH NHANH

| Command | Description |
|---------|-------------|
| `/ultrathink [problem]` | Full UltraThink process |
| `/ultrathink:plan [feature]` | Deep planning |
| `/ultrathink:review [code]` | Craftsman review |
| `/ultrathink:debug [issue]` | Systematic debugging |
| `#ultrathink` | Hashtag trong prompt |

---

## 5. EXAMPLES

### Example 1: Architecture Decision
```
/ultrathink "Should we use microservices or monolith for our MVP?"

Expected output:
- Question phase: Challenge assumptions về scale
- Obsess phase: Research case studies
- Plan phase: Compare architectures
- Recommendation với deep justification
```

### Example 2: Complex Algorithm
```
/ultrathink:plan "Real-time collaborative editing like Google Docs"

Expected output:
- Deep research on CRDT vs OT
- Edge cases analysis
- Implementation plan
- Simplified approach recommendation
```

---

## 6. BEST PRACTICES

### ✅ NÊN
- Dùng cho critical decisions
- Complete all 6 phases
- Document reasoning
- Challenge own thinking

### ❌ KHÔNG NÊN
- Dùng cho simple tasks
- Skip phases
- Rush to solution
- Accept first idea

---

**Version**: 3.0
**Last Updated**: 2026-01-04
