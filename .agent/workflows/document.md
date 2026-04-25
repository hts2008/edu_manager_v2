---
description: Documentation — generate API docs, guides, architecture diagrams
---
// turbo-all

## Steps

1. Scan codebase: identify endpoints, exported functions, module structure.

2. Generate README if missing: project name, quick start, architecture diagram, development setup.

3. Generate API docs: for each endpoint → method, path, description, request/response, curl example.

4. Create architecture diagram: Mermaid diagram showing modules, data flow, external services.

5. Check `.env.example` exists with all required variables documented.

6. Write/update ADRs for any undocumented architectural decisions found in `decisionLog.md`.

7. Verify all docs match actual code behavior (not outdated).