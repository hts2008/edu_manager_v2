# 🔍 INTERNET SEARCH PLAYBOOK
<!-- VI: Playbook sử dụng Internet Search để research -->

> **Mục tiêu**: Hướng dẫn search GitHub, StackOverflow, NPM trước khi implement

---

## 📋 TẠI SAO CẦN SEARCH TRƯỚC?

**Research-First Mindset:**
- Tránh reinvent the wheel
- Học từ production code
- Tìm best practices
- Phát hiện known issues

---

## 1. SEARCH GITHUB

### Agentic Prompt: Tìm Code Pattern

```markdown
@file .agent/protocols/RESEARCH_FIRST.md

/search:github [query]

## Search Goal
Tìm: [pattern/implementation cần tìm]

## Search Strategy
1. Search exact term: "[exact_term]"
2. Filter by language: language:typescript
3. Filter by stars: stars:>100
4. Filter by recent: pushed:>2024-01-01

## Analysis
Với mỗi repo tìm được:
- Stars count (quality signal)
- Last updated (maintenance)
- README (documentation)
- Implementation details

## Output
- Top 3 relevant repos
- Key insights từ code
- Patterns có thể apply
```

### Lệnh nhanh
```
/search:github "react authentication hook"
/search:github "prisma pagination" language:typescript stars:>50
```

---

## 2. SEARCH STACKOVERFLOW

### Agentic Prompt: Tìm Solution

```markdown
@file .agent/protocols/RESEARCH_FIRST.md

/search:stackoverflow [query]

## Problem
[Mô tả vấn đề đang gặp]

## Search Strategy
1. Search by tags: [react] [typescript]
2. Sort by votes
3. Filter by accepted answers
4. Look for recent answers (2023+)

## Analysis
Với mỗi answer:
- Vote count (community validation)
- Age (relevance)
- Comments (edge cases)
- Updates (changes over time)

## Output
- Top 3 answers với links
- Code snippets applicable
- Caveats và edge cases
```

### Lệnh nhanh
```
/search:stackoverflow "How to handle JWT refresh token in React"
/search:stackoverflow "Prisma many-to-many relation"
```

---

## 3. SEARCH NPM

### Agentic Prompt: Tìm Package

```markdown
@file .agent/protocols/RESEARCH_FIRST.md

/search:npm [package type]

## Need
Package cho: [functionality needed]

## Evaluation Criteria
1. Weekly downloads (popularity)
2. Last publish (maintenance)
3. Dependencies (bundle size)
4. TypeScript support
5. Documentation quality

## Comparison
| Package | Downloads | Updated | TS | Bundle |
|---------|-----------|---------|----|----|
| pkg-a   | 1M/week   | 2024    | ✅ | 10KB |
| pkg-b   | 500K/week | 2023    | ❌ | 5KB |

## Recommendation
- Best choice: [package] because [reason]
- Alternative: [package] if [condition]
```

### Lệnh nhanh
```
/search:npm "date library"
/search:npm "form validation react"
/search:npm "state management"
```

---

## 4. SEARCH DOCS

### Agentic Prompt: Tìm Documentation

```markdown
@file .agent/protocols/RESEARCH_FIRST.md

/search:docs [framework/library]

## Looking For
- [Topic/feature cần tìm hiểu]

## Official Sources
1. Official documentation
2. API reference
3. Migration guides
4. Best practices

## Analysis
- Latest version info
- Breaking changes
- Recommended patterns
- Common pitfalls

## Output
- Direct links to relevant docs
- Key takeaways
- Code examples
```

### Lệnh nhanh
```
/search:docs "Next.js App Router"
/search:docs "Prisma transactions"
/search:docs "React Server Components"
```

---

## 5. COMPREHENSIVE SEARCH

### Agentic Prompt: Tìm Kiếm Toàn Diện

```markdown
@file .agent/protocols/RESEARCH_FIRST.md

/search:all [query]

## Research Question
[Câu hỏi cần trả lời]

## Multi-Source Search

### GitHub
- Production implementations
- Open source examples
- Star > 50 repos

### StackOverflow
- Accepted answers
- High vote solutions
- Edge case discussions

### NPM
- Available packages
- Comparison

### Official Docs
- Best practices
- Latest patterns

## Synthesis
Combine findings từ all sources:
- Common patterns across sources
- Consensus best practices
- Trade-offs và alternatives
- Recommended approach
```

### Lệnh nhanh
```
/search:all "implement real-time notifications React"
```

---

## 6. SEARCH WORKFLOW

### Before Implementing

```markdown
## Pre-Implementation Research

Trước khi code bất kỳ feature nào:

1. **Define the question**
   - Exactly what am I trying to do?
   - What are the requirements?

2. **Search existing solutions**
   /search:github "[feature]"
   /search:stackoverflow "[problem]"

3. **Evaluate packages**
   /search:npm "[category]"

4. **Read official docs**
   /search:docs "[framework] [feature]"

5. **Synthesize findings**
   - Best approach based on research
   - Trade-offs understood
   - Known issues identified

6. **Document research**
   - Save links for reference
   - Note key decisions
```

---

## 7. LỆNH REFERENCE

| Command | Description |
|---------|-------------|
| `/search:github [query]` | Search GitHub repos |
| `/search:stackoverflow [query]` | Search SO answers |
| `/search:npm [package]` | Search NPM packages |
| `/search:docs [framework]` | Search documentation |
| `/search:all [query]` | Comprehensive search |
| `/search:compare [pkg1] [pkg2]` | Compare packages |

---

## 8. BEST PRACTICES

### ✅ NÊN
- Search BEFORE implementing
- Evaluate multiple sources
- Check recency of info
- Document research findings

### ❌ KHÔNG NÊN
- Implement without research
- Trust single source
- Use outdated solutions
- Skip package evaluation

---

## 9. EXAMPLES

### Example 1: Authentication Research
```
/search:all "Next.js 14 authentication best practices"

Expected:
- GitHub: next-auth examples
- SO: Common issues và solutions
- NPM: Auth library comparison
- Docs: Next.js auth patterns
```

### Example 2: Package Selection
```
/search:npm "React form library"

Expected comparison:
- react-hook-form vs formik
- Bundle size, features, TS support
- Community adoption
- Recommendation
```

---

**Version**: 3.0
**Last Updated**: 2026-01-04
