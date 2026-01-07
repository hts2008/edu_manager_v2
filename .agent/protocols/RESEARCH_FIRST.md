# 🔍 PROACTIVE RESEARCH PROTOCOL
<!-- VI: Chủ động tìm kiếm internet trước khi code -->

> **PURPOSE**: Always search before implementing
> **Sources**: GitHub, StackOverflow, npm, MDN, docs

---

## 🎯 PRINCIPLE

```
NEVER reinvent the wheel.
ALWAYS search for existing solutions first.
LEVERAGE open source to build faster.
```

---

## 📋 RESEARCH-FIRST ALGORITHM

```
FUNCTION before_implementing(task):
    # Step 1: Search for existing solutions
    results = PARALLEL_SEARCH({
        github: search_repos(task.keywords),
        stackoverflow: search_qa(task.problem),
        npm: search_packages(task.tech_stack),
        docs: search_official_docs(task.framework)
    })
    
    # Step 2: Evaluate findings
    candidates = EVALUATE(results):
        - Stars/popularity
        - Last updated
        - Maintenance status
        - License compatibility
        - Code quality
    
    # Step 3: Decide approach
    IF candidates.has_good_match:
        RETURN use_existing(candidates.best)
    ELSE IF candidates.has_partial_match:
        RETURN adapt_existing(candidates.best)
    ELSE:
        RETURN build_from_scratch(with_research_insights)
```

---

## 🔎 SEARCH COMMANDS

### GitHub Search
```
/search:github [query]           # Search repos
/search:github:code [query]      # Search code snippets
/search:github:issues [query]    # Search issues/discussions
```

**Example Queries**:
```
/search:github react authentication provider
/search:github:code prisma soft delete middleware
/search:github:issues nextjs 15 app router cache
```

### StackOverflow Search
```
/search:stackoverflow [query]    # Search Q&A
/search:so [query]               # Shorthand
```

**Example**:
```
/search:so typescript generic constraint infer
/search:stackoverflow nextjs server actions error handling
```

### Package Search
```
/search:npm [package]            # NPM packages
/search:pypi [package]           # Python packages
/search:crates [package]         # Rust crates
```

**Example**:
```
/search:npm date picker react
/search:pypi pdf generation
```

### Documentation Search
```
/search:docs [framework] [topic] # Official docs
/search:mdn [api]                # MDN Web Docs
```

**Example**:
```
/search:docs nextjs middleware
/search:mdn intersection observer
```

---

## 🧠 INTELLIGENT RESEARCH PATTERNS

### Pattern 1: Feature Implementation
```
WHEN implementing [feature]:
    1. /search:github "[feature] [tech-stack]"
    2. Evaluate top 5 repos
    3. Check if proven pattern exists
    4. Adapt or use directly
```

### Pattern 2: Bug Fixing
```
WHEN fixing [error]:
    1. /search:stackoverflow "[error message]"
    2. Check accepted answers
    3. Verify solution applies
    4. Apply fix with understanding
```

### Pattern 3: Architecture Decisions
```
WHEN designing [system]:
    1. /search:github "[system] architecture"
    2. /search:github:issues "[system] scalability"
    3. Review how others solved it
    4. Make informed decision
```

### Pattern 4: Package Selection
```
WHEN need [capability]:
    1. /search:npm "[capability]"
    2. Compare: stars, downloads, updates
    3. Check bundle size
    4. Review API design
    5. Select best fit
```

---

## 📊 EVALUATION CRITERIA

### Repository Quality
| Criteria | Good | Bad |
|----------|------|-----|
| Stars | > 1000 | < 100 |
| Last Commit | < 3 months | > 1 year |
| Issues | Low open count | Many stale |
| License | MIT, Apache | Copyleft, None |
| Tests | > 80% coverage | No tests |
| Docs | Comprehensive | Missing |

### Package Quality
| Criteria | Good | Bad |
|----------|------|-----|
| Weekly Downloads | > 50k | < 1k |
| Dependencies | Few, trusted | Many, unknown |
| Types | Included | Missing |
| Bundle Size | Reasonable | Bloated |

### StackOverflow Answer
| Criteria | Good | Bad |
|----------|------|-----|
| Votes | > 10 | Negative |
| Accepted | Yes | No |
| Date | Recent | Outdated |
| Comments | Positive | Warnings |

---

## 🔄 INTEGRATION WITH AGENTS

### All Agents Should
```yaml
research_behavior:
  before_new_feature:
    - Search GitHub for similar implementations
    - Check if library exists
    
  before_solving_bug:
    - Search StackOverflow for error
    - Check GitHub issues for framework
    
  before_architecture:
    - Search for proven patterns
    - Review similar projects
    
  before_selecting_package:
    - Compare alternatives
    - Check maintenance status
```

---

## 📝 RESEARCH REPORT FORMAT

```markdown
## 🔍 Research Report: [Topic]

### Search Queries Used
- GitHub: "[query]"
- StackOverflow: "[query]"
- npm: "[query]"

### Top Findings

#### 1. [Repo/Package Name]
- **URL**: [link]
- **Stars**: [count]
- **Relevance**: [High/Medium/Low]
- **Notes**: [observations]

#### 2. [Another Finding]
...

### Recommendation
[Use existing / Adapt / Build custom]

### Rationale
[Why this decision]
```

---

## 🌐 SEARCH SOURCES

| Source | Best For | URL Pattern |
|--------|----------|-------------|
| GitHub | Code, repos | github.com/search?q= |
| StackOverflow | Q&A, errors | stackoverflow.com/search?q= |
| npm | Node packages | npmjs.com/search?q= |
| PyPI | Python packages | pypi.org/search/?q= |
| MDN | Web APIs | developer.mozilla.org |
| DevDocs | Multi-framework | devdocs.io |

---

## ⚠️ CONSTRAINTS

```yaml
must:
  - SEARCH before implementing new features
  - EVALUATE multiple options
  - VERIFY license compatibility
  - CHECK maintenance status
  - DOCUMENT research findings

must_not:
  - Use abandoned packages
  - Copy without understanding
  - Ignore license restrictions
  - Skip security review
  - Trust blindly without testing
```

---

**Protocol**: Research-First v1.0
**Philosophy**: "Don't reinvent, leverage"
