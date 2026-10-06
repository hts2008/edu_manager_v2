# Operational Presentation Contract

Implemented locally in the 2026-10-05/06 consistency review; production certification remains separate.

## Shared Composition

Use `OperationalPage` with compact `PageIntro` (title, actions, transient status) and at most one `MetricGrid`. The title is 20px/28px, spacing16px, metric padding12px14px, value20px and radius from the published tenant token (6px/8px). Sections are unframed; tables and repeated items may have a restrained boundary. Controls retain independent targets and 44px mobile height.

PageIntro does not render marketing eyebrow/feature descriptions. Place essential financial/source/process information beside its relevant control/table, not inside a hero. Keep loading/error/empty/success/disabled states explicit. Reduced-motion preference remains supported.

## Information Budget

- Display one total per table; remove duplicate list badges and repeated KPI values.
- Never imply progress with a decorative fixed-percent bar. Only real measurable progress may use a progress bar.
- Keep distinct sources and denominator semantics, even when the interface is compact. Hide only identical duplicate score values; maintain manual/proxy provenance and valid zero/null behavior.
- Show a meaningful student code when present, not internal database identifiers as fallback profile text.
- Keep secondary calibration/extra-input controls discoverable through a labelled disclosure and visible selected summary.

## Theme Scope

`experience.css` applies bounded tenant primary/radius/depth tokens across authenticated main routes. Portalled dialogs inherit the same published tokens via scoped `body:has([data-experience-root])` rules; their focus, busy and dirty guards are unchanged. Semantic success/warning/danger colors are not replaced by brand color. Theme previews cannot change body tokens because body selectors match only the provider root.

## Verification

Use source/render regression tests plus actual browser DOM geometry and representative screenshots. Check desktop/mobile, action targets, table scrolling, field labels, cancelled navigation and failure states. Computed geometry is not a replacement for full visual/accessibility certification.

[Current evidence and limitations](../../artifacts/teacher-workspace-execution-2026-10-05/consistency-review.md).
# Superseded Direction - 2026-10-06

User rejected the flattened visual redesign below. Preserve the former palette, rounded panels, shadows and page identity. Only reduce whitespace and duplicated information. ADR-64 and receipts/2026-10-06-ui-restoration.md supersede the global flattening/token direction in this historical document.
