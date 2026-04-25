---
name: documentation
description: "When to document, format standards, maintenance rules"
version: "4.0"
enforcement: recommended
human_override: "User can override with explicit justification documented in decisionLog.md"
---

# Rule: Documentation

## R1: What Must Be Documented

| Artifact | When | Format |
|----------|------|--------|
| README.md | Every project | Quick start + architecture |
| API endpoints | Every endpoint | OpenAPI/Swagger + curl examples |
| Architecture decisions | Every significant choice | ADR (Architecture Decision Record) |
| Environment setup | Every environment variable | `.env.example` with comments |
| Database schema | Every migration | ERD + migration description |
| Deployment | Every deployable service | Step-by-step with commands |

## R2: What NOT to Document

- Self-explanatory code (good naming is better than comments)
- Framework built-in behavior (don't explain how React renders)
- Temporary workarounds (use TODO with issue link instead)

## R3: Documentation Must Stay Current

- Update docs in the same PR/commit as code changes
- Stale docs are worse than no docs (mislead developers)
- Quarterly review: archive or update outdated docs

## R4: Format Standards

- Use Markdown for all documentation
- Code examples: use fenced code blocks with language tag
- Diagrams: use Mermaid (text-based, version-controllable)
- API docs: machine-readable format (OpenAPI) + human examples

## Verification

- Review: documentation-writer checks completeness
- Automated: check for README, .env.example, CHANGELOG in repo

## Related

- Agent: `agents/documentation-writer.md`