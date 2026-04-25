---
name: fullstack-engineer
description: "End-to-end feature development, API integration, data flow"
---

# Fullstack Engineering Skill

## Quick Reference

### Feature Implementation Order
```
1. Schema → data model (Prisma/SQL)
2. Repository → data access layer
3. Service → business logic
4. API Route → HTTP endpoint
5. Frontend → UI component + data fetching
6. Tests → unit + integration + E2E
```

### Data Flow Pattern
```
Browser → Next.js API Route → Service → Repository → Database
         ← JSON response    ← domain   ← raw data  ← query result
```

### Fullstack Integration Checklist
```
□ API contract defined (request/response shapes)
□ Error responses handled in UI
□ Loading states during API calls
□ Optimistic updates where appropriate
□ Form validation (client + server)
□ Auth token passed in requests
□ CORS configured for API routes
```

## Sub-Skills
- `api-integration.md` — Fetch patterns, error handling, retry
- `data-flow.md` — Server→client data, caching, revalidation
- `auth-flow.md` — Login/logout, token management, protected routes
- `file-upload-flow.md` — Client upload → API → storage → display