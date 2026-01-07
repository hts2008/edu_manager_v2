# 🎨 UI DESIGN STYLES CATALOG - EXPANDED
<!-- VI: 57+ phong cách thiết kế UI từ UI-UX Pro Max -->

> **PURPOSE**: Comprehensive UI style catalog for AI agents
> Reference: UI-UX Pro Max Skill (57 styles)

---

## PART 1: CORE MORPHISM STYLES (8)

### 💎 1. Glassmorphism
```css
.glass { background: rgba(255,255,255,0.1); backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.2); border-radius: 16px; }
```
**Best for**: Dashboards, modals, cards

### 🌓 2. Neumorphism
```css
.neuro { background: #e0e5ec; border-radius: 20px; box-shadow: 8px 8px 16px #b8bec7, -8px -8px 16px #fff; }
```
**Best for**: Buttons, inputs, toggles

### 🧸 3. Claymorphism
```css
.clay { background: linear-gradient(145deg, #f0f0f0, #cacaca); border-radius: 24px; box-shadow: 20px 20px 60px #bebebe, -20px -20px 60px #fff, inset 5px 5px 10px rgba(255,255,255,0.5); }
```
**Best for**: Mobile apps, playful products

### 🧊 4. Skeuomorphism
```css
.skeu { background: linear-gradient(180deg, #f5f5f5 0%, #e0e0e0 100%); border: 1px solid #ccc; box-shadow: inset 0 1px 0 #fff, 0 2px 4px rgba(0,0,0,0.2); border-radius: 8px; }
```
**Best for**: Realistic controls, audio apps

### 🌫️ 5. Frosted Glass
```css
.frost { background: rgba(255,255,255,0.25); backdrop-filter: blur(20px) saturate(180%); border: 1px solid rgba(255,255,255,0.3); }
```
**Best for**: Overlays, navigation bars

### 🔮 6. Crystal Effect
```css
.crystal { background: linear-gradient(135deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.1) 100%); backdrop-filter: blur(12px); box-shadow: 0 8px 32px rgba(0,0,0,0.1), inset 0 0 0 1px rgba(255,255,255,0.2); }
```
**Best for**: Premium cards, luxury products

### 💧 7. Liquid Glass
```css
.liquid { background: linear-gradient(135deg, rgba(255,255,255,0.2), rgba(255,255,255,0.05)); backdrop-filter: blur(15px); border-radius: 24px; animation: liquidShift 8s ease infinite; }
```
**Best for**: Modern dashboards, tech products

### ☁️ 8. Soft UI
```css
.soft { background: #f0f0f3; box-shadow: 6px 6px 10px #d1d1d4, -6px -6px 10px #fff; border-radius: 15px; }
```
**Best for**: Calm interfaces, wellness apps

---

## PART 2: MINIMALIST STYLES (8)

### ✨ 9. Minimalism
```css
.minimal { background: #fff; color: #111; border: 1px solid #eaeaea; border-radius: 8px; }
```
**Best for**: SaaS, portfolios, docs

### 📐 10. Flat Design
```css
.flat { background: #3498db; color: white; border: none; border-radius: 4px; box-shadow: none; }
```
**Best for**: Mobile apps, icons

### 🔲 11. Material Design
```css
.material { background: #fff; box-shadow: 0 2px 4px rgba(0,0,0,0.1), 0 4px 8px rgba(0,0,0,0.1); border-radius: 4px; transition: box-shadow 0.3s; }
.material:hover { box-shadow: 0 4px 8px rgba(0,0,0,0.15), 0 8px 16px rgba(0,0,0,0.15); }
```
**Best for**: Android apps, Google-style interfaces

### 🎯 12. Swiss Design
```css
.swiss { font-family: 'Helvetica Neue', sans-serif; display: grid; grid-template-columns: repeat(12, 1fr); gap: 20px; }
```
**Best for**: Editorial, typography-focused

### 📱 13. Apple HIG Style
```css
.apple { background: rgba(255,255,255,0.8); backdrop-filter: blur(20px); border-radius: 12px; font-family: -apple-system, BlinkMacSystemFont, sans-serif; }
```
**Best for**: iOS apps, macOS apps

### 🏢 14. Corporate Clean
```css
.corporate { background: #fff; border: 1px solid #e5e7eb; border-radius: 6px; font-family: 'Inter', sans-serif; }
```
**Best for**: Enterprise, B2B SaaS

### 📄 15. Notion Style
```css
.notion { background: #fff; font-family: 'Inter', sans-serif; line-height: 1.5; color: #37352f; }
```
**Best for**: Documentation, knowledge bases

### ⚫ 16. Monochrome
```css
.mono { background: #000; color: #fff; font-family: monospace; }
```
**Best for**: Terminal apps, dev tools

---

## PART 3: COLORFUL & GRADIENT STYLES (10)

### 🌈 17. Aurora Gradient
```css
.aurora { background: linear-gradient(45deg, #ff6b6b, #4ecdc4, #45b7d1, #96ceb4); background-size: 400% 400%; animation: aurora 15s ease infinite; }
```

### 🎆 18. Mesh Gradient
```css
.mesh { background-color: #0f172a; position: relative; }
.mesh::before { content: ''; position: absolute; width: 500px; height: 500px; background: radial-gradient(circle, #3b82f6, transparent 70%); filter: blur(80px); }
```

### 🌅 19. Sunset Gradient
```css
.sunset { background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%); }
```

### 🌊 20. Ocean Gradient
```css
.ocean { background: linear-gradient(135deg, #0077b6, #00b4d8, #90e0ef); }
```

### 🔥 21. Fire Gradient
```css
.fire { background: linear-gradient(135deg, #f12711, #f5af19); }
```

### 🌲 22. Forest Gradient
```css
.forest { background: linear-gradient(135deg, #134e5e, #71b280); }
```

### 💜 23. Cyberpunk Gradient
```css
.cyber { background: linear-gradient(135deg, #0f0c29, #302b63, #24243e); color: #00ffff; text-shadow: 0 0 10px #00ffff; }
```

### 🍬 24. Candy Gradient
```css
.candy { background: linear-gradient(135deg, #ff9a9e, #fecfef, #fecfef); }
```

### 🌸 25. Pastel Gradient
```css
.pastel { background: linear-gradient(135deg, #a8edea, #fed6e3); }
```

### 💎 26. Holographic
```css
.holo { background: linear-gradient(135deg, #f5f7fa, #c3cfe2, #f5f7fa); background-size: 200% 200%; animation: holo 3s ease infinite; }
```

---

## PART 4: DARK MODE STYLES (8)

### 🌌 27. OLED Dark
```css
.oled { background: #000; color: #fff; }
```

### 🌑 28. Charcoal Dark
```css
.charcoal { background: #1a1a2e; color: #eee; }
```

### 🌃 29. Midnight Blue
```css
.midnight { background: #0f172a; color: #e2e8f0; }
```

### 🔵 30. Dark Slate
```css
.slate { background: #1e293b; color: #f1f5f9; }
```

### 💚 31. Matrix Green
```css
.matrix { background: #0d0d0d; color: #00ff00; font-family: 'Courier New', monospace; }
```

### 🟣 32. Deep Purple Dark
```css
.deep-purple { background: #1a1025; color: #e0d0ff; }
```

### 🔴 33. Dark Red Theme
```css
.dark-red { background: #1a0a0a; color: #ffcccc; }
```

### 🌙 34. Nord Dark
```css
.nord { background: #2e3440; color: #eceff4; }
```

---

## PART 5: BOLD & EXPRESSIVE STYLES (10)

### 🏗️ 35. Brutalism
```css
.brutal { border: 3px solid #000; box-shadow: 8px 8px 0 #000; font-family: 'Space Mono', monospace; }
```

### 🎪 36. Neo-Brutalism
```css
.neo-brutal { background: #ffeb3b; border: 3px solid #000; box-shadow: 6px 6px 0 #000; border-radius: 8px; }
```

### 🎭 37. Memphis Design
```css
.memphis { background: #ff6b6b; border: 4px solid #000; transform: rotate(-2deg); }
```

### 🖼️ 38. Art Deco
```css
.artdeco { background: linear-gradient(180deg, #d4af37, #c9a227); border: 2px solid #8b7500; font-family: 'Playfair Display', serif; }
```

### 🎨 39. Pop Art
```css
.popart { background: #fff500; border: 4px solid #000; color: #ff0000; font-weight: bold; text-transform: uppercase; }
```

### 🏴 40. Punk / Grunge
```css
.punk { background: #1a1a1a; color: #ff0066; font-family: 'Courier New', monospace; text-decoration: line-through; }
```

### 🔷 41. Geometric
```css
.geometric { background: linear-gradient(45deg, #4a90a4 25%, #6ab7c9 25%, #6ab7c9 50%, #4a90a4 50%); background-size: 20px 20px; }
```

### 📰 42. Editorial
```css
.editorial { font-family: 'Playfair Display', serif; font-size: 48px; letter-spacing: -1px; line-height: 1.1; }
```

### 🔮 43. Vaporwave
```css
.vaporwave { background: linear-gradient(180deg, #ff71ce, #01cdfe, #05ffa1); color: #fff; font-family: 'VT323', monospace; }
```

### 🌴 44. Retro 80s
```css
.retro80 { background: #2b2d42; color: #ef476f; font-family: 'Press Start 2P', cursive; text-shadow: 3px 3px #ffd166; }
```

---

## PART 6: SPECIALTY STYLES (13)

### 🍱 45. Bento Grid
```css
.bento { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
```

### 🃏 46. Card Stack
```css
.card-stack { position: relative; }
.card-stack > * { position: absolute; transform: translateY(calc(var(--i) * 10px)) rotate(calc(var(--i) * 2deg)); }
```

### 📊 47. Dashboard
```css
.dashboard { display: grid; grid-template-columns: 250px 1fr; grid-template-rows: 60px 1fr; gap: 0; height: 100vh; }
```

### 🛒 48. E-commerce
```css
.ecommerce { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 24px; }
```

### 📱 49. Mobile First
```css
.mobile-first { padding: 16px; font-size: 16px; }
@media (min-width: 768px) { .mobile-first { padding: 24px; } }
```

### 🖥️ 50. Desktop Pro
```css
.desktop-pro { display: flex; gap: 24px; max-width: 1400px; margin: 0 auto; }
```

### 🎮 51. Gaming UI
```css
.gaming { background: linear-gradient(135deg, #1a1a2e, #16213e); color: #00ffff; border: 1px solid #00ffff; box-shadow: 0 0 20px rgba(0,255,255,0.3); }
```

### 🏥 52. Healthcare
```css
.healthcare { background: #f0f9ff; color: #0369a1; border-radius: 12px; font-family: 'Inter', sans-serif; }
```

### 💰 53. Fintech
```css
.fintech { background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; font-family: 'SF Pro', -apple-system, sans-serif; }
```

### 🎓 54. Education
```css
.education { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 0 8px 8px 0; }
```

### 🍔 55. Food & Restaurant
```css
.food { background: #fef7ed; color: #9a3412; font-family: 'Playfair Display', serif; }
```

### ✈️ 56. Travel
```css
.travel { background: linear-gradient(135deg, #0ea5e9, #38bdf8); color: white; border-radius: 16px; }
```

### 🏋️ 57. Fitness
```css
.fitness { background: #18181b; color: #fbbf24; font-family: 'Inter', sans-serif; font-weight: 700; text-transform: uppercase; }
```

---

## Quick Reference Table

| # | Style | Best For | Colors |
|---|-------|----------|--------|
| 1-8 | Morphism | Cards, buttons | Neutral + blur |
| 9-16 | Minimal | SaaS, docs | Clean, sparse |
| 17-26 | Gradient | Landing pages | Vibrant multi |
| 27-34 | Dark Mode | Apps, premium | Dark + accent |
| 35-44 | Bold | Creative, portfolios | High contrast |
| 45-57 | Specialty | Industry-specific | Domain colors |

---

**Total Styles**: 57
**Reference**: UI-UX Pro Max Skill
**Framework Version**: 2.0
