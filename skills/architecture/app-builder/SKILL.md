---
name: App Builder
description: Application scaffolding: project initialization, boilerplate, tech stack selection
---

# App Builder

## Project Initialization
- Use official CLI tools: create-next-app, create-vite-app, cargo init
- Always init with TypeScript/strict mode enabled
- Set up linting (ESLint/Ruff) and formatting (Prettier/Black) from day one

## Boilerplate Checklist
- .editorconfig for consistent editor settings
- .gitignore for language and IDE files
- README.md with setup instructions
- CI pipeline config (GitHub Actions / GitLab CI)
- Docker setup for local development

## Tech Stack Selection Matrix
- Solo developer + MVP: Next.js + SQLite/Supabase
- Small team + SaaS: Next.js/Remix + PostgreSQL + Vercel
- Enterprise: monorepo (Turborepo) + microservices + Kubernetes

## Monorepo vs Polyrepo
- Monorepo: shared code, atomic commits, unified CI
- Polyrepo: independent deploys, team autonomy
- Use monorepo until team exceeds 50 engineers
