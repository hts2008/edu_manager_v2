---
name: Accessibility Checks
description: WCAG compliance, screen readers, keyboard navigation, ARIA
---

# Accessibility Checks

## WCAG 2.1 AA Requirements
- Color contrast: 4.5:1 normal text, 3:1 large text
- Keyboard navigable: all interactive elements focusable
- Screen reader: meaningful alt text, aria-labels
- Focus visible: clear focus indicators

## Semantic HTML
- Use button for actions, a for navigation
- Headings in order (h1-h6), one h1 per page
- Use nav, main, aside, footer landmarks
- Lists for related items, tables for tabular data

## ARIA Patterns
- aria-label for icon-only buttons
- aria-expanded for toggleable sections
- aria-live for dynamic content updates
- role=dialog for modals with focus trap

## Testing
- axe-core for automated checks
- Screen reader testing (NVDA/VoiceOver)
- Keyboard-only navigation test
- Color blindness simulation (Daltonize)
