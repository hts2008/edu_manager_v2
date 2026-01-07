# 📱 UX GUIDELINES
<!-- VI: 98 Hướng dẫn UX cho thiết kế người dùng tốt -->

> **PURPOSE**: UX best practices and guidelines
> Reference for all UI/UX design decisions

---

## 📋 NAVIGATION (10 Guidelines)

1. **Keep navigation visible** - Users should always know where they are
2. **Use consistent navigation** - Same pattern across all pages
3. **Limit menu items** - Maximum 7±2 items (Miller's Law)
4. **Use clear labels** - Avoid jargon, use user's language
5. **Indicate current location** - Highlight active nav item
6. **Breadcrumbs for depth** - Show path for deep hierarchies
7. **Search always available** - For content-heavy sites
8. **Mobile hamburger menu** - Acceptable for mobile only
9. **Footer navigation** - Secondary links, legal, sitemap
10. **Keyboard navigation** - Full accessibility with Tab/Enter

---

## 🖱️ INTERACTIONS (15 Guidelines)

11. **Clickable areas** - Minimum 44x44px touch targets
12. **Hover states** - Visual feedback on interactive elements
13. **Loading indicators** - Show progress for operations > 1s
14. **Skeleton screens** - Better than spinners for content loading
15. **Instant feedback** - Acknowledge user actions immediately
16. **Undo actions** - Allow reversal of destructive actions
17. **Confirm destructive actions** - Delete, cancel, remove
18. **Disabled states** - Clear why element is disabled
19. **Focus states** - Visible outline for keyboard navigation
20. **Error states** - Clear, helpful error messages
21. **Success states** - Confirm successful actions
22. **Empty states** - Guide users when no content
23. **Micro-animations** - Subtle feedback for delight
24. **Progressive disclosure** - Show more on demand
25. **Drag and drop hints** - Visual cues for draggable items

---

## 📝 FORMS (15 Guidelines)

26. **Label above field** - Better readability than inline
27. **Required indicators** - Mark required fields (*)
28. **Inline validation** - Validate as user types (debounced)
29. **Error messages inline** - Below the field, not in alerts
30. **One column forms** - Avoid multi-column for simplicity
31. **Smart defaults** - Pre-fill when possible
32. **Input types** - Use correct type (email, tel, number)
33. **Autofocus first field** - Start user on first input
34. **Clear button labels** - "Create Account" not "Submit"
35. **Password visibility toggle** - Allow show/hide password
36. **Help text under fields** - Format hints, constraints
37. **Auto-format inputs** - Phone numbers, credit cards
38. **Preserve data on error** - Don't clear form on failure
39. **Multi-step for long forms** - Break into logical steps
40. **Progress indicator** - Show step X of Y

---

## 📊 DATA DISPLAY (10 Guidelines)

41. **Scannable content** - Headers, bullets, short paragraphs
42. **Data hierarchy** - Most important info first/largest
43. **Consistent formatting** - Dates, numbers, currencies
44. **Pagination for long lists** - Or infinite scroll with end
45. **Sortable tables** - Click column headers to sort
46. **Filterable data** - Easy to narrow down results
47. **Search in long lists** - Find specific items quickly
48. **Empty state messages** - Helpful when no results
49. **Data freshness** - Show last updated timestamp
50. **Export options** - CSV, PDF for tabular data

---

## ♿ ACCESSIBILITY (15 Guidelines)

51. **Color contrast** - 4.5:1 for text, 3:1 for large
52. **Don't rely on color alone** - Use icons, text too
53. **Alt text for images** - Descriptive, not decorative
54. **ARIA labels** - For interactive elements
55. **Skip navigation link** - For keyboard users
56. **Focus order logical** - Tab order follows visual order
57. **Resize text to 200%** - Layout shouldn't break
58. **Captions for video** - And transcripts for audio
59. **Form labels linked** - Click label to focus input
60. **Error identification** - Clear what's wrong, how to fix
61. **No flashing content** - Avoid > 3 flashes/second
62. **Touch target size** - Minimum 44x44 CSS pixels
63. **No horizontal scroll** - On mobile at 320px
64. **Consistent navigation** - Same across pages
65. **Timeout warnings** - Alert before session expires

---

## 📱 RESPONSIVE DESIGN (10 Guidelines)

66. **Mobile-first design** - Start small, enhance for large
67. **Breakpoints** - 640 (sm), 768 (md), 1024 (lg), 1280 (xl)
68. **Touch-friendly mobile** - Larger buttons, more spacing
69. **Readable font size** - Minimum 16px on mobile
70. **Thumb zone** - Important actions within thumb reach
71. **Responsive images** - Serve appropriate sizes
72. **Hide non-essential on mobile** - Prioritize content
73. **Collapsible sections** - Reduce scrolling on mobile
74. **Test on real devices** - Emulators aren't enough
75. **Landscape orientation** - Support both orientations

---

## ⚡ PERFORMANCE UX (10 Guidelines)

76. **Perceived performance** - Skeleton > spinner > blank
77. **Lazy load images** - Below the fold content
78. **Optimize LCP** - Largest Contentful Paint < 2.5s
79. **Minimize layout shift** - Reserve space for dynamic content
80. **Prefetch likely pages** - Anticipate user navigation
81. **Offline support** - PWA for critical features
82. **Optimistic updates** - Update UI before server confirms
83. **Cancel slow requests** - Don't block UI indefinitely
84. **Progress for uploads** - Show percentage complete
85. **Compress images** - WebP format, appropriate sizes

---

## 🎨 VISUAL HIERARCHY (8 Guidelines)

86. **Size indicates importance** - Larger = more important
87. **Color for emphasis** - Accent color for CTAs
88. **Whitespace for grouping** - Related items close together
89. **Contrast for focus** - Make key elements stand out
90. **Consistent spacing system** - 4/8px grid
91. **Typography hierarchy** - Clear H1 > H2 > body scale
92. **Icon + text pairing** - Icons alone can be ambiguous
93. **Visual grouping** - Cards, borders, backgrounds

---

## 💬 CONTENT (5 Guidelines)

94. **Clear, concise copy** - No jargon, action-oriented
95. **Button labels** - Verbs: "Save", "Delete", "Continue"
96. **Error messages helpful** - Tell what to do, not just error
97. **Confirm before destructive** - "Delete project? Cannot be undone."
98. **Consistent terminology** - Same words for same concepts

---

## Quick Reference

| Category | Key Principle |
|----------|---------------|
| Navigation | Always know where you are |
| Forms | Validate inline, clear labels |
| Accessibility | 4.5:1 contrast, keyboard nav |
| Mobile | 44px touch targets, thumb zone |
| Performance | Skeleton screens, < 2.5s LCP |

---

**Reference for**: UI/UX Designer, Frontend, Web Developer Agents
