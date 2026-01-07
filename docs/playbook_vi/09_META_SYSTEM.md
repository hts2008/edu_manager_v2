# 🔮 META-SYSTEM PLAYBOOK
<!-- VI: Playbook sử dụng Meta-System để tạo skills/plugins/agents mới -->

> **Mục tiêu**: Hướng dẫn sử dụng Meta-System để tự động tạo components mới

---

## 📋 META-SYSTEM LÀ GÌ?

Meta-System là khả năng **tự tạo ra** các components mới:
- **Meta-Skill**: Tạo skill mới từ pattern
- **Meta-Plugin**: Tạo plugin mới cho framework
- **Meta-Agent**: Tạo agent mới cho team

**"Secret sauce"** - Cho phép framework tự mở rộng!

---

## 1. META-SKILL: TẠO SKILL MỚI

### Agentic Prompt: Tạo Skill

```markdown
@file .agent/meta/META_SKILL.md

Tạo skill mới với thông tin sau:

## Skill Definition
- **Name**: [skill_name]
- **Category**: [dev/design/ops/research]
- **Purpose**: [mục đích của skill]

## Input Requirements
- [Input 1]: [description]
- [Input 2]: [description]

## Output Format
- [Output type và structure]

## Steps
1. [Step 1]
2. [Step 2]
3. [Step 3]

## Examples
- Example input: [example]
- Example output: [example]

Tạo file skill tại: .skills/[category]/[skill_name].md
```

### Lệnh nhanh
```
/meta:skill [skill_name]
```

### Ví dụ: Tạo skill "api-documentation"
```
/meta:skill api-documentation

Input: API endpoint code
Output: OpenAPI documentation
Category: dev
```

---

## 2. META-PLUGIN: TẠO PLUGIN MỚI

### Agentic Prompt: Tạo Plugin

```markdown
@file .agent/meta/META_PLUGIN.md

Tạo plugin mới với thông tin sau:

## Plugin Definition
- **Name**: [plugin_name]
- **Type**: [integration/utility/automation]
- **Dependencies**: [list dependencies]

## Integration Points
- Hook vào: [workflow/agent/command]
- Trigger: [khi nào activate]

## Configuration
```yaml
plugin_name:
  enabled: true
  config:
    option1: value1
    option2: value2
```

## Implementation
- Entrypoint: [file path]
- Commands: [list commands]

Tạo file plugin tại: .plugins/[plugin_name]/
```

### Lệnh nhanh
```
/meta:plugin [plugin_name]
```

---

## 3. META-AGENT: TẠO AGENT MỚI

### Agentic Prompt: Tạo Agent

```markdown
@file .agent/meta/META_AGENT.md

Tạo agent mới với thông tin sau:

## Agent Definition
- **Name**: [agent_name]
- **Role**: [Senior/Junior] [role title]
- **Expertise**: [list chuyên môn]

## Responsibilities
1. [Responsibility 1]
2. [Responsibility 2]
3. [Responsibility 3]

## Authority
- CAN: [what agent can do]
- CANNOT: [what agent cannot do]

## Integration
- Triggered by: [commands/conditions]
- Reports to: [@orchestrator]
- Collaborates with: [@other_agents]

## Constraints
- MUST: [requirements]
- MUST NOT: [prohibitions]

Tạo file agent tại: .agent/agents/[agent_name].agent.md
```

### Lệnh nhanh
```
/meta:agent [agent_name]
```

### Ví dụ: Tạo agent "mobile-engineer"
```
/meta:agent mobile-engineer

Role: Senior Mobile Engineer
Expertise: React Native, Flutter, Swift, Kotlin
Responsibilities:
- Mobile app development
- Cross-platform optimization
- App store deployment
```

---

## 4. META-ANALYZE: PHÂN TÍCH PATTERN

### Agentic Prompt: Phân Tích để Tạo Meta

```markdown
@file .agent/meta/META_SKILL.md

Phân tích pattern trong codebase để tạo meta component:

## Analysis Target
- Files/Folders: [target path]
- Pattern type: [skill/plugin/agent]

## Analysis Questions
1. Có pattern lặp lại không?
2. Có thể abstract thành template không?
3. Workflow nào có thể automate?
4. Role nào cần define mới?

## Output
- Recommendation: [skill/plugin/agent] nên tạo
- Definition draft
- Implementation steps
```

### Lệnh nhanh
```
/meta:analyze [target_path]
```

---

## 5. CÁC LỆNH META SYSTEM

| Command | Description |
|---------|-------------|
| `/meta:skill [name]` | Tạo skill mới |
| `/meta:plugin [name]` | Tạo plugin mới |
| `/meta:agent [name]` | Tạo agent mới |
| `/meta:analyze [path]` | Phân tích patterns |
| `/meta:template [type]` | Xem template |
| `/meta:validate [file]` | Validate definition |
| `/meta:list` | List tất cả meta components |

---

## 6. BEST PRACTICES

### ✅ NÊN LÀM
- Phân tích pattern trước khi tạo meta
- Validate definition trước khi implement
- Document rõ input/output
- Tạo examples cho skill mới

### ❌ KHÔNG NÊN
- Tạo skill quá phức tạp
- Duplicate existing skills
- Skip validation
- Thiếu documentation

---

## 7. EXAMPLES: REAL WORLD USE CASES

### Example 1: Tạo Skill "Component Generator"
```
/meta:skill component-generator

Purpose: Generate React components from description
Input: Component description, style preference
Output: React component code with tests

Steps:
1. Parse component requirements
2. Select appropriate patterns
3. Generate component code
4. Generate tests
5. Add documentation
```

### Example 2: Tạo Agent "Data Engineer"
```
/meta:agent data-engineer

Role: Senior Data Engineer
Expertise: SQL, Python, ETL, Data Pipelines
Responsibilities:
- Design data pipelines
- Optimize database queries
- Build ETL processes
- Data quality monitoring
```

---

**Version**: 3.0
**Last Updated**: 2026-01-04
