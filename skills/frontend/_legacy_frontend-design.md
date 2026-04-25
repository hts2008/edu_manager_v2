---
name: frontend-design
description: "Design systems, component libraries, responsive design, accessibility"
---

# Frontend Design Skill

## Quick Reference

### Design Token Structure
```css
:root {
  --color-primary: hsl(220, 90%, 56%);
  --color-error: hsl(0, 84%, 60%);
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --radius-sm: 4px;
  --radius-md: 8px;
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
  --shadow-md: 0 4px 6px rgba(0,0,0,0.1);
  --font-sans: 'Inter', system-ui, sans-serif;
}
```

### Responsive Breakpoints
| Name | Width | Target |
|------|-------|--------|
| xs | 0-375px | Small phone |
| sm | 376-640px | Phone |
| md | 641-768px | Tablet portrait |
| lg | 769-1024px | Tablet landscape |
| xl | 1025-1440px | Desktop |

### Accessibility Checklist
- Contrast ≥ 4.5:1 (text), ≥ 3:1 (large text, UI components)
- Focus visible on all interactive elements
- All images have alt text
- Form inputs have labels
- Keyboard navigable (Tab, Enter, Escape, Arrow keys)

## Sub-Skills
- `design-system.md` — Tokens, primitives, documentation
- `responsive-patterns.md` — Mobile-first, container queries
- `accessibility.md` — WCAG 2.1 AA compliance
- `animation.md` — Micro-animations, transitions, reduced motion