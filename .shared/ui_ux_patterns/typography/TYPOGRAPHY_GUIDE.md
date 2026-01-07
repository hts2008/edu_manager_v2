# 📝 TYPOGRAPHY GUIDE
<!-- VI: Hướng dẫn typography cho web -->

> **PURPOSE**: Typography standards and font pairings
> Reference for consistent text styling

---

## 📏 TYPE SCALE

Based on 16px base, 1.25 ratio (Major Third)

```css
:root {
  /* Font Sizes */
  --text-xs: 0.75rem;     /* 12px */
  --text-sm: 0.875rem;    /* 14px */
  --text-base: 1rem;      /* 16px */
  --text-lg: 1.125rem;    /* 18px */
  --text-xl: 1.25rem;     /* 20px */
  --text-2xl: 1.5rem;     /* 24px */
  --text-3xl: 1.875rem;   /* 30px */
  --text-4xl: 2.25rem;    /* 36px */
  --text-5xl: 3rem;       /* 48px */
  --text-6xl: 3.75rem;    /* 60px */
  
  /* Line Heights */
  --leading-none: 1;
  --leading-tight: 1.25;
  --leading-snug: 1.375;
  --leading-normal: 1.5;
  --leading-relaxed: 1.625;
  --leading-loose: 2;
  
  /* Font Weights */
  --font-normal: 400;
  --font-medium: 500;
  --font-semibold: 600;
  --font-bold: 700;
  
  /* Letter Spacing */
  --tracking-tighter: -0.05em;
  --tracking-tight: -0.025em;
  --tracking-normal: 0em;
  --tracking-wide: 0.025em;
  --tracking-wider: 0.05em;
}
```

---

## 🔤 FONT PAIRINGS

### Modern Tech
```css
--font-heading: 'Inter', system-ui, sans-serif;
--font-body: 'Inter', system-ui, sans-serif;
--font-mono: 'Fira Code', 'Consolas', monospace;
```

### Professional
```css
--font-heading: 'Outfit', 'Inter', sans-serif;
--font-body: 'Inter', system-ui, sans-serif;
--font-mono: 'JetBrains Mono', monospace;
```

### Friendly / Casual
```css
--font-heading: 'Poppins', sans-serif;
--font-body: 'Open Sans', sans-serif;
```

### Editorial / Blog
```css
--font-heading: 'Playfair Display', serif;
--font-body: 'Source Sans Pro', sans-serif;
```

### Minimal
```css
--font-heading: 'Manrope', sans-serif;
--font-body: 'Manrope', sans-serif;
--font-mono: 'JetBrains Mono', monospace;
```

### Bold / Impact
```css
--font-heading: 'Space Grotesk', sans-serif;
--font-body: 'DM Sans', sans-serif;
```

---

## 📐 TEXT STYLES

```css
/* Headings */
.h1 {
  font-size: var(--text-5xl);
  font-weight: var(--font-bold);
  line-height: var(--leading-tight);
  letter-spacing: var(--tracking-tight);
}

.h2 {
  font-size: var(--text-4xl);
  font-weight: var(--font-semibold);
  line-height: var(--leading-tight);
}

.h3 {
  font-size: var(--text-2xl);
  font-weight: var(--font-semibold);
  line-height: var(--leading-snug);
}

.h4 {
  font-size: var(--text-xl);
  font-weight: var(--font-medium);
  line-height: var(--leading-snug);
}

/* Body */
.body-lg {
  font-size: var(--text-lg);
  line-height: var(--leading-relaxed);
}

.body {
  font-size: var(--text-base);
  line-height: var(--leading-normal);
}

.body-sm {
  font-size: var(--text-sm);
  line-height: var(--leading-normal);
}

/* Special */
.caption {
  font-size: var(--text-xs);
  line-height: var(--leading-normal);
  color: var(--text-muted);
}

.overline {
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  letter-spacing: var(--tracking-wider);
  text-transform: uppercase;
}
```

---

## ♿ ACCESSIBILITY RULES

1. **Minimum font size**: 16px for body text
2. **Line height**: At least 1.5 for body text
3. **Contrast**: 4.5:1 for normal text, 3:1 for large text
4. **Responsive text**: Don't lock zoom
5. **Line length**: 50-75 characters for optimal readability

---

## Quick Import

```html
<!-- Google Fonts - Most Popular -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">

<!-- With Code Font -->
<link href="https://fonts.googleapis.com/css2?family=Fira+Code&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
```

---

**Reference for**: UI/UX Designer, Frontend, Web Developer Agents
