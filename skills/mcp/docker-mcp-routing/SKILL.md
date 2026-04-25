---
name: Docker MCP Routing
description: Routing MCP servers through Docker: isolation, security, resource control
---

# Docker MCP Routing

## Docker Isolation for MCP
- Each MCP server runs in its own container
- Network isolation prevents inter-server communication
- Resource limits (CPU, memory) per server
- Read-only filesystem where possible

## Configuration
- isolation_json in mcpproxy upstream config
- Specify image, network_mode, resource limits
- Mount only necessary volumes

## Security Benefits
- Untrusted MCP servers cannot access host filesystem
- Network isolation prevents data exfiltration
- Resource limits prevent DoS from rogue servers
- Container restart on crash without affecting host

## Routing Patterns
- MCPProxy aggregates multiple Docker containers
- Tool discovery across all containers
- Automatic quarantine for new servers
- Health checks and auto-restart
