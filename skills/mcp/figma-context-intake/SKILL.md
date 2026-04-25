---
name: Figma Context Intake
description: Extracting design context from Figma: component structure, tokens, specs
---

# Figma Context Intake

## Figma MCP Integration
- Use Figma MCP server for design-to-code pipeline
- Extract component names, hierarchies, and properties
- Map Figma tokens to CSS custom properties

## Design Token Extraction
- Colors: extract fills and map to CSS variables
- Typography: font family, size, weight, line height
- Spacing: margins, paddings from auto-layout
- Border radius, shadows, opacity

## Component Mapping
- Figma component to React component 1:1
- Variants map to component props
- Auto-layout maps to flexbox/grid
- Instance overrides map to prop values

## Workflow
1. Designer publishes components in Figma
2. MCP server extracts structure and tokens
3. AI agent generates React components
4. Visual comparison for fidelity check

## Anti-Patterns
- Generating pixel-perfect code without understanding intent
- Ignoring responsive behavior defined in Figma
- Not extracting design tokens (hardcoding values)
