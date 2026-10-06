# Soft Clay Operations Design System

## Boundaries

This is a constrained clay-inspired operations theme, not a promise of full puffy Claymorphism everywhere. Workflow and legibility win over ornamental depth. Retain React/Tailwind/Framer Motion/Lucide; no GSAP, grid framework, font or date-picker dependency by default.

## Shell

- Desktop rail fixed to viewport: expanded240px / collapsed72px, user preference isolated by tenant+actor. Brand/toggle and account affordances stay reachable; navigation list alone scrolls.
- Main content reserves rail width; one vertical scroll owner. Header and toolbar sticky within that owner. No transformed shell ancestor that changes fixed-position containing block.
- Collapse toggles have accessible names, aria-expanded and tooltips in icon rail. Preserve active-route indication and permission-filtered menu. Menu grouping keys stay stable even if labels change.
- Below1024px use existing overlay drawer with focus trap/Escape/return focus; 768px tablet can use compact rail if verified. Safe-area and 200% zoom test required. Rail scroll position cannot follow main scroll.
- Prefer instant rail geometry change plus short icon opacity; no animated layout width during active grid editing. Fixed columns reserve dimensions so save status does not resize cells.

## Token Proposal

| Semantic role | Candidate | Use |
| --- | --- | --- |
| Canvas | #F6F8FA | Neutral opaque page |
| Surface | #FFFFFF | Table/input surfaces |
| Ink | #202A32 | Primary text |
| Muted ink | #53616B | Secondary text, not tiny light captions |
| Primary | #137C73 | Save/active navigation; white text only after measured contrast |
| Informational | #D9EEF9 | Light blue information background with dark ink |
| Supporting clay | #E3F3EC | Mint selector surfaces |
| Warning | #FFF0C2 | Warning surface, dark #6E4900 text |
| Error | #FCE3E4 | Error surface, dark #9A2633 text |
| Border | #CFD8DD | Inputs/dividers, interactive contrast verified separately |

Candidates are not WCAG certification. Measure every foreground/background/state pair before publish. No dominant purple gradient, beige/dark-slate palette or color-only states. Current brand overrides must migrate intentionally, never globally overwritten.

Use existing installed sans family first, verify Vietnamese glyph coverage; body14-16px, table14px, headings20-24px, zero letter spacing and no viewport-scaled type. Default radius6-8px for operational controls; compact clay icon controls can use circular shape. User-requested style may permit softer selected controls, not large rounded section cards.

Clay depth: two restrained inset highlights/shades plus small outer shadow on key actions/selectors only. Normal rows/cells remain opaque with simple borders. No cards inside cards; workspace sections unframed. Pressed/selected states change content/color and border as well as shadow. Shadow recipe lives in tokens, not repeated literals.

## Element Decisions

| Element | Placement | Guardrail |
| --- | --- | --- |
| Data grid | Cập nhật tab | Primary task; keyboard, focus, row save |
| Bento | Tổng quan tab | At most3-4 compact summary regions; not above the entry roster |
| Timeline | Learner detail/history or inline disclosure | Actual dated evidence/revisions; no fabricated events |
| Steps | Review/finalize or content publish | Only real multistep operations, not every score edit |
| Date Picker | Daily date/month filters | Civil dates + business timezone; native input first |
| Progress Bar | Assessment completion or known job progress | Label what is measured; never fake percent for unknown save duration |
| Scrollspy | Long learner detail or content-console sections | Not another sidebar next to roster; keyboard links work |
| Vibrancy | Optional header/menu chrome | Small web approximation; opaque fallback and contrast validation; no blur behind table |
| Parallax | Not used in operational modules | Evaluated and rejected for entry/finance/settings; optional future public marketing only |
| Segmented controls/tabs | Mode/task switching | Stable selection, dirty-draft guard, deep links |
| Inline alert/toast/skeleton | Row feedback/loading | Inline validation + polite saved status; skeleton reserves layout |

## Motion

Focus/hover120ms; row saved feedback150-200ms; menu opacity180ms maximum. Use transform/opacity for limited feedback, never bouncing scores, magnetic buttons, delayed cell availability or staggered table entrances. Honor reduced-motion and reduced transparency via user settings plus system preference; opaque static fallback. Motion is disabled while typing if it can shift target positions. No spring overshoot in data-entry controls.

## Rollout

First ship shell and roster slice behind tenant-scoped flags with old read path retained. Later apply validated tokens/copy to students, attendance and fee collection; verify print/PDF independently. Existing template designs, frozen academic rubrics and receipt layouts are not rethemed by this change.
