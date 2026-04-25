---
name: Mobile Design
description: Mobile UI/UX: platform guidelines, touch interactions, native patterns
---

# Mobile Design

## Platform Guidelines
- iOS: Human Interface Guidelines (flat, minimal, depth)
- Android: Material Design 3 (dynamic color, responsive layout)
- Cross-platform: use platform-native patterns, not one-size-fits-all

## Touch Interactions
- Tap targets: minimum 44x44pt (iOS) / 48x48dp (Android)
- Swipe: list actions, navigation, dismiss
- Long press: secondary actions, selection mode
- Pull to refresh: list and feed content

## Navigation Patterns
- Tab bar: 3-5 top-level destinations (bottm bar)
- Stack navigation: push/pop for drill-down
- Modal: overlay for focused tasks
- Drawer: secondary navigation (Material Design)

## Performance
- 60fps scrolling (no jank)
- Offline-first: cache data, sync when connected
- Lazy loading: load content as user scrolls
- Image optimization: thumbnails for lists, full for detail
