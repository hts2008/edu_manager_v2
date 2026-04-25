---
name: MCP Builder
description: Building MCP servers: protocol implementation, tool definition, transport
---

# MCP Builder

## MCP Server Components
- Transport: stdio (most common), HTTP/SSE, streamable-http
- Tools: discoverable functions with JSON Schema input/output
- Resources: read-only data endpoints (files, databases)
- Prompts: reusable prompt templates

## Tool Definition
- Name: verb-noun format (get_user, create_file)
- Description: clear one-line purpose
- InputSchema: JSON Schema with required fields documented
- Annotations: readOnlyHint, destructiveHint, openWorldHint

## Implementation Pattern (Node.js)
- Use official MCP SDK: @modelcontextprotocol/sdk
- Define server with capabilities
- Register tools with handlers
- Connect transport (StdioServerTransport for CLI)

## Testing
- Test tool handlers independently
- Mock transport for unit tests
- Integration test with MCP client
- Validate JSON Schema compliance

## Security
- Validate all inputs against schema
- Sanitize file paths (prevent traversal)
- Rate limit expensive operations
- Log all tool invocations for audit
