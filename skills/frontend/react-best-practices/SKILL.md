---
name: React Best Practices
description: Modern React patterns: hooks, state management, performance, component design
---

# React Best Practices

## Component Design

### Composition Over Inheritance
Prefer composing small focused components. Each component should have a single responsibility.

### Component Categories
1. Container components - fetch data, manage state, pass props
2. Presentational components - render UI from props, no side effects
3. Layout components - structure page, manage spacing
4. Feature components - combine container + presentational

## Hooks Best Practices

### useState
- Keep state flat. Use multiple useState calls instead of one big object
- Derive computed values instead of storing them
- Use functional updater for state depending on previous value

### useEffect
- One effect per concern. Always specify dependency array
- Return cleanup for subscriptions, timers, event listeners
- Avoid setting state inside useEffect when derivation is possible

### Custom Hooks
- Extract reusable logic: useAuth, useDebounce, useLocalStorage
- Must start with 'use'. Return consistent { data, error, loading } interfaces

## State Management Matrix

| Scope | Tool | When |
|-------|------|------|
| Component-local | useState | Toggle, input, modal |
| Shared siblings | Lift to parent | Small tree |
| Feature-wide | useContext+useReducer | Auth, theme |
| Global complex | Zustand/Jotai | Cart, notifications |
| Server state | TanStack Query/SWR | API data |

## Performance
- React.memo for stable-prop components that re-render from parent
- Code splitting with React.lazy + Suspense for routes
- Virtualization for lists over 100 items
- Stable unique keys, never array index for reorderable lists

## Error Handling
- Error Boundaries for crash recovery. Show fallback UI not blank screen
- Log to monitoring service. Provide retry mechanism

## Testing Priority
1. User interactions 2. Conditional rendering 3. Custom hooks 4. Integration over unit for UI
