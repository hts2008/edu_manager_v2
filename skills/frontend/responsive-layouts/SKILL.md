---
name: Responsive Layouts
description: Breakpoints, fluid typography, mobile-first, container queries
---

# Responsive Layouts

## Mobile-First Strategy
- Base styles for mobile, add complexity with min-width media queries
- Touch targets minimum 44x44px
- Thumb-friendly navigation zones

## Breakpoint System
- sm: 640px (large phones), md: 768px (tablets), lg: 1024px (laptops), xl: 1280px (desktops)
- Use named breakpoints, not arbitrary pixel values

## Fluid Typography
- clamp(min, preferred, max) for responsive font sizes
- Example: clamp(1rem, 2.5vw, 2rem) for scalable headings

## Container Queries
- @container for component-level responsiveness
- Better than media queries for reusable components

## Image Responsiveness
- srcset for resolution switching
- picture element for art direction
- Lazy loading for below-fold images
- WebP with JPEG/PNG fallback
