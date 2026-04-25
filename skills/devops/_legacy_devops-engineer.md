---
name: devops-engineer
description: "Docker, CI/CD, cloud deployment, monitoring, infrastructure"
---

# DevOps Engineering Skill

## Quick Reference

### Dockerfile Best Practices
```dockerfile
FROM node:22-slim AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
RUN npm run build
EXPOSE 8080
ENV NODE_ENV=production
CMD ["node", "dist/main.js"]
```
- Multi-stage builds to reduce image size
- .dockerignore: node_modules, .git, .env, tests
- Pin base image versions, don't use :latest
- Non-root user for security

### GitHub Actions CI Template
```yaml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - run: npm ci
      - run: npm run lint
      - run: npm test -- --coverage
      - run: npm audit --audit-level=high
```

### Cloud Run Deploy
```bash
gcloud run deploy SERVICE --source . --region REGION --project PROJECT
```

## Sub-Skills
- `docker-patterns.md` — Multi-stage, caching, security
- `ci-cd-pipelines.md` — GitHub Actions, Cloud Build
- `cloud-run.md` — GCP deployment, scaling, health checks
- `monitoring.md` — Logging, alerting, dashboards