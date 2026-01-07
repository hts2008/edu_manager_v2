# 🔮 META-SKILL - Skill Generator
<!-- VI: Meta-skill để tạo các skill mới - Công thức "bí mật" của ClaudeKit -->

> **PURPOSE**: Generate new skills, agents, workflows programmatically
> **Trigger**: `/meta:skill [name] [description]`

---

## 🎯 IDENTITY

```yaml
meta_type: skill_generator
purpose: Create new specialized capabilities from descriptions
requires: Deep understanding of framework structure
output: Complete skill/agent/workflow files
```

---

## 🧠 META-PROGRAMMING FORMULA

### The Secret Pattern

```
META-SKILL = STRUCTURE + CONTEXT + BEHAVIOR + OUTPUT

Where:
- STRUCTURE: File format, sections, yaml frontmatter
- CONTEXT: When to activate, what to read
- BEHAVIOR: Algorithms, decision trees, constraints
- OUTPUT: What to produce, how to format
```

---

## 📋 SKILL GENERATION ALGORITHM

```
FUNCTION generate_skill(name, description, type):
    # Step 1: Analyze requirements
    requirements = EXTRACT(description):
        - purpose
        - triggers
        - inputs
        - outputs
        - constraints
    
    # Step 2: Select template based on type
    template = SELECT_TEMPLATE(type):
        - 'agent' → agent_template
        - 'workflow' → workflow_template
        - 'skill' → skill_template
        - 'plugin' → plugin_template
    
    # Step 3: Fill structure
    skill = template.fill({
        name: name,
        identity: generate_identity(requirements),
        algorithm: generate_algorithm(requirements),
        constraints: generate_constraints(requirements),
        examples: generate_examples(requirements)
    })
    
    # Step 4: Validate completeness
    VALIDATE(skill):
        - has_clear_trigger ✓
        - has_algorithm ✓
        - has_constraints ✓
        - has_examples ✓
    
    # Step 5: Write file
    WRITE_FILE(f".agent/{type}s/{name}.md", skill)
    
    RETURN skill_created
```

---

## 📝 TEMPLATES

### Agent Template
```markdown
# 🎯 {NAME} AGENT

## IDENTITY
\`\`\`yaml
agent_id: {id}
role: {role}
expertise: [{list}]
authority: [{list}]
\`\`\`

## RESPONSIBILITIES
{responsibilities}

## ALGORITHM
\`\`\`
FUNCTION main_action(input):
    {steps}
\`\`\`

## CONSTRAINTS
\`\`\`yaml
must: [{rules}]
must_not: [{rules}]
\`\`\`
```

### Workflow Template
```markdown
---
description: {description}
---

# {NAME} WORKFLOW

## TRIGGER
{when_to_use}

## STEPS
1. {step1}
2. {step2}
...

## OUTPUT
{expected_output}
```

### Skill Template
```markdown
# {NAME} SKILL

## ACTIVATION
- Trigger: {trigger}
- Context: {context}

## BEHAVIOR
{what_it_does}

## EXAMPLES
{usage_examples}
```

---

## 🔧 USAGE EXAMPLES

### Create New Agent
```
/meta:agent devrel "Developer Relations agent that manages community, 
creates tutorials, and responds to GitHub issues"
```

**Output**: `.agent/agents/devrel.agent.md` with:
- Identity (expertise in community, docs, GitHub)
- Responsibilities (tutorials, issue triage, etc)
- Algorithm for prioritizing community tasks
- Constraints for tone and response time

### Create New Workflow
```
/meta:workflow onboarding "New developer onboarding process from 
setup to first PR"
```

**Output**: `.agent/workflows/10_onboarding.md` with:
- Steps from environment setup to contribution
- Checklist for each stage
- Success criteria

### Create New Skill
```
/meta:skill code-review-strict "Strict code review that enforces 
100% test coverage and documentation"
```

**Output**: `.shared/skills/code_review_strict.md` with:
- Checklist for strict review
- Required metrics
- Rejection criteria

---

## 🎯 META-AGENT TEMPLATE (Self-Reference)

When creating a META-agent, include:

```yaml
meta_capabilities:
  - Can create new agents
  - Can create new workflows
  - Can create new skills
  - Self-improving (can update own templates)

meta_constraints:
  - Must validate output against framework standards
  - Must include all required sections
  - Must be consistent with existing patterns
  - Must document rationale for design decisions
```

---

## ⚠️ CONSTRAINTS

```yaml
must:
  - VALIDATE all generated files against framework structure
  - INCLUDE all required sections
  - USE consistent naming conventions
  - ADD Vietnamese comments (// VI:)
  - FOLLOW existing patterns in the codebase

must_not:
  - Create empty placeholder files
  - Skip algorithm/behavior definition
  - Ignore constraints section
  - Create duplicate functionality
```

---

## 🔗 COMMANDS

| Command | Action |
|---------|--------|
| `/meta:skill [name] [desc]` | Create new skill |
| `/meta:agent [name] [desc]` | Create new agent |
| `/meta:workflow [name] [desc]` | Create new workflow |
| `/meta:plugin [name] [desc]` | Create new plugin |
| `/meta:template [type]` | Show template for type |
| `/meta:validate [file]` | Validate against standards |

---

**Version**: 1.0
**Category**: Meta-Programming
