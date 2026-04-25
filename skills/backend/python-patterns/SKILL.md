---
name: Python Patterns
description: Python best practices: typing, project structure, async, testing
---

# Python Patterns

## Type Hints
- Use type hints for all function signatures
- Use dataclasses or Pydantic for data models
- Run mypy in CI for type checking

## Project Structure
- src/ layout with pyproject.toml
- Virtual environments (venv or poetry)
- Requirements pinned with lock files

## Async Python
- asyncio for I/O-bound concurrency
- FastAPI for async web APIs
- aiohttp for async HTTP clients

## Error Handling
- Custom exception hierarchy
- Context managers for resource cleanup
- Logging with structlog for structured output

## Testing
- pytest as test runner
- Fixtures for test data and setup
- parametrize for data-driven tests
