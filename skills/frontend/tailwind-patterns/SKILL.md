---
name: Tailwind Patterns
description: Utility-first CSS with Tailwind: design tokens, responsive patterns, dark mode
---

# Tailwind Patterns

## Design Tokens
- Extend theme (never replace): colors, spacing, fontFamily
- Semantic colors: primary, secondary, accent, success, warning, danger
- HSL variables for dark mode compatibility

## Layout Patterns
- Container: max-w + mx-auto
- Grid: grid-cols-1 sm:grid-cols-2 lg:grid-cols-3
- Flex nav: flex items-center justify-between
- Centering: flex items-center justify-center min-h-screen

## Component Patterns
- Button base: inline-flex items-center justify-center rounded-md font-medium transition-colors
- Card: rounded-lg border bg-card shadow-sm with p-6 sections
- Input: h-10 w-full rounded-md border bg-background px-3 py-2 text-sm

## Responsive
- Mobile-first breakpoints: sm:640 md:768 lg:1024 xl:1280
- Responsive text: text-sm md:text-base lg:text-lg
- Hide/show: hidden md:block or md:hidden

## Dark Mode
- Class strategy with dark: prefix
- bg-white dark:bg-gray-900, text-gray-900 dark:text-gray-100

## Anti-Patterns
- Do NOT use @apply for everything
- Do NOT override theme, extend it
- Do NOT use arbitrary values when theme value exists
- Do NOT nest @apply inside @layer
