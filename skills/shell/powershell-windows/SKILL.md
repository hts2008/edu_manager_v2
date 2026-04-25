---
name: PowerShell and Windows
description: PowerShell automation: cmdlets, pipelines, modules, Windows admin
---

# PowerShell and Windows

## PowerShell Basics
- Cmdlets: Verb-Noun pattern (Get-Process, Set-Item)
- Pipeline: objects not text (Get-Process | Where-Object CPU -gt 50)
- Variables: dollar sign prefix (dollar-sign-variableName)

## Common Patterns
- Foreach-Object: pipeline iteration
- Where-Object: filtering
- Select-Object: property selection
- Sort-Object: ordering

## File Operations
- Get-ChildItem: directory listing (alias: gci, ls, dir)
- Get-Content: read file (alias: gc, cat, type)
- Set-Content: write file
- Test-Path: check existence

## Error Handling
- try/catch/finally blocks
- ErrorAction: Stop, SilentlyContinue, Continue
- Write-Error for non-terminating
- throw for terminating

## Modules
- Import-Module for loading
- Get-Command to discover available commands
- Install-Module from PSGallery
