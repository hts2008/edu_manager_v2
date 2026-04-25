---
name: Component Scaffolding
description: Component creation templates, folder structure, barrel exports
---

# Component Scaffolding

## Folder Structure
- ComponentName/ComponentName.tsx + .test.tsx + .module.css + index.ts
- Barrel exports via index.ts for clean imports

## Template Pattern
- Props interface defined and exported
- Default export for lazy loading compatibility
- ForwardRef for DOM-accessing components
- Display name for DevTools debugging

## Naming Conventions
- PascalCase for components, camelCase for hooks
- use prefix for hooks, with prefix for HOCs
- Descriptive names: UserProfileCard not Card

## Props Design
- Required props first, optional with defaults
- Spread remaining props to root element
- Use children for composition
- Callback props: onEventName pattern
