---
name: Dockerize App
description: Docker best practices: Dockerfile, multi-stage builds, compose, security
---

# Dockerize App

## Dockerfile Best Practices
- Use official base images with specific version tags
- Multi-stage builds: build stage + runtime stage
- Copy package.json first, install deps, then copy source (layer caching)
- Run as non-root user
- Use .dockerignore to exclude node_modules, .git, tests

## Multi-Stage Example
- Stage 1: FROM node:20-alpine AS builder. Install deps, build app
- Stage 2: FROM node:20-alpine. Copy only built artifacts
- Result: smaller image, no dev dependencies

## Docker Compose
- Use for local development with multiple services
- Define app, database, cache, message queue
- Volume mount for live code reload
- Named volumes for persistent data

## Security
- Scan images for vulnerabilities (Trivy, Snyk)
- Pin base image digests in production
- No secrets in Dockerfile or image layers
- Read-only filesystem where possible
