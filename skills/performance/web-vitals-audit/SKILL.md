---
name: Web Vitals Audit
description: Core Web Vitals: LCP, FID, CLS measurement and optimization
---

# Web Vitals Audit

## Core Web Vitals
- LCP (Largest Contentful Paint): under 2.5s
- FID (First Input Delay): under 100ms
- CLS (Cumulative Layout Shift): under 0.1

## LCP Optimization
- Optimize largest image (preload, responsive sizes, WebP)
- Eliminate render-blocking resources (defer non-critical CSS/JS)
- Use CDN for static assets
- Server-side rendering for critical content

## FID Optimization
- Break long tasks (over 50ms) into smaller chunks
- Defer non-critical JavaScript
- Use web workers for heavy computation

## CLS Prevention
- Set explicit width/height on images and iframes
- Reserve space for dynamic content (skeleton screens)
- Avoid inserting content above existing content
- Use transform animations instead of layout-triggering properties

## Measurement
- Chrome DevTools Lighthouse for lab data
- Chrome UX Report for field data
- web-vitals npm package for real user monitoring
