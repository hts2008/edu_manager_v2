---
name: Bundle Analysis
description: JavaScript bundle optimization: tree-shaking, code splitting, analysis
---

# Bundle Analysis

## Bundle Analysis Tools
- webpack-bundle-analyzer: visual treemap
- source-map-explorer: per-file size breakdown
- Lighthouse: performance score and recommendations

## Optimization Techniques
- Code splitting: dynamic import() for routes and features
- Tree shaking: use ES modules, avoid side-effect imports
- Lazy loading: React.lazy for component-level splitting
- Vendor chunk: separate rarely-changing dependencies

## Size Budgets
- Initial JS: under 200KB compressed
- Per-route JS: under 50KB compressed
- Total images: under 1MB above fold
- Set size budget in CI, fail build on exceed

## Common Bloat Sources
- Moment.js: replace with date-fns or dayjs
- Lodash: import specific functions, not entire library
- Icon libraries: use only needed icons
- Polyfills: target only browsers you support
