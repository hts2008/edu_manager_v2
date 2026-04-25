---
name: ux-ui-designer
description: "User experience patterns, visual design, interaction design"
---

# UX/UI Designer Skill

## Quick Reference

### Design Principles
1. **Clarity**: Every element has a clear purpose
2. **Consistency**: Same patterns for same interactions
3. **Feedback**: Every action gets visual/audio response
4. **Efficiency**: Common tasks require fewer steps
5. **Forgiveness**: Easy undo, confirmation for destructive actions

### UI States (mandatory for every component)
```
LOADING  → Skeleton shimmer (not just spinner)
EMPTY    → Illustration + CTA ("No items yet. Create your first →")
ERROR    → Message + retry button
SUCCESS  → Data + subtle transition
DISABLED → Grayed out + tooltip explaining why
```

### Color System
```
Primary:    Brand identity, CTAs, links
Secondary:  Supporting actions, less emphasis
Success:    Confirmations, positive states (green tones)
Warning:    Caution, attention needed (amber tones)
Error:      Failures, destructive actions (red tones)
Neutral:    Text, borders, backgrounds (gray scale)
```

### Typography Scale
```
Display:  36-48px  — Page hero
H1:       30-36px  — Page title (1 per page)
H2:       24-30px  — Section headers
H3:       20-24px  — Subsection headers
Body:     16px     — Paragraphs
Small:    14px     — Captions, labels
Tiny:     12px     — Timestamps, fine print
```

## Sub-Skills
- `interaction-design.md` — Hover, focus, click, drag, gestures
- `information-architecture.md` — Navigation, hierarchy, grouping
- `mobile-patterns.md` — Bottom navigation, pull-to-refresh, swipe
- `dark-mode.md` — Color mapping, contrast adaptation