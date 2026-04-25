---
name: API Doc Writer
description: API documentation: OpenAPI/Swagger, endpoint docs, authentication
---

# API Doc Writer

## OpenAPI Spec
- Define all endpoints with paths, methods, parameters
- Include request/response schemas with examples
- Document authentication requirements per endpoint
- Use tags for logical grouping

## Endpoint Documentation
- Method + Path + Description
- Parameters: path, query, header, body with types
- Response codes with example payloads
- Error response format

## Authentication Section
- How to obtain credentials
- Header format (Bearer token, API key)
- Token refresh flow
- Scopes and permissions

## Best Practices
- Generate from code annotations when possible
- Include cURL examples for every endpoint
- Provide SDK examples in 2-3 languages
- Keep in sync with actual API (automated testing)
