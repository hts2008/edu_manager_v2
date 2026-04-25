---
name: Prisma MCP Usage
description: Using Prisma MCP server: schema introspection, migration generation
---

# Prisma MCP Usage

## Prisma MCP Capabilities
- Schema introspection: read current database schema
- Migration generation: create migrations from schema changes
- Query building: construct type-safe queries
- Relationship mapping: understand model relationships

## Common Operations
- Introspect: get current schema state
- Diff: compare schema with database
- Generate: create migration files
- Apply: run pending migrations

## Integration with AI Agents
- Database-architect agent uses Prisma MCP for schema work
- Backend-specialist uses for query optimization
- Test-engineer uses for test database setup

## Best Practices
- Always introspect before making schema changes
- Review generated migrations before applying
- Test migrations on staging before production
- Keep migration history clean and sequential
