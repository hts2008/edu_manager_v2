# Editable UI Content And Theme Console

## Goal And Non-Goals

Allow owners to change human-facing wording and bounded theme values in web console without code edits. Do not build a general HTML/CSS/JavaScript CMS; do not make every constant runtime data. Stable domain enums, routes, permissions, score formulas and validation remain code-owned.

Proposed route `/admin/experience`, using existing ConsoleLayout/settings/history rather than a new app. Initial sections: Nội dung hiển thị / Giao diện / Xem trước / Lịch sử. Initial copy scope: progress workspace, navigation, common save/errors/empty states. Expand module-by-module after consumer inventory, not a promise that all legacy strings disappear in one release.

## Data Contract

- Typed code registry identifies supported message keys, Vietnamese default, description, purpose, max length, permitted placeholders and whether wording is protected. Compiled defaults are intentional reliability baselines, not avoidable hardcode.
- Proposed SettingValue keys: organization.ui_copy.vi, organization.ui_theme and approved UX flags; group organization, impact none, no business effective month. Extend registry/Zod explicitly; these keys do not currently exist.
- Runtime resolver: tenant published override -> locale compiled default -> safe diagnostic fallback. Unknown keys rejected at write; obsolete keys reported in preview. Language selection and tenant context are independent; initial locale vi-VN only, no automatic translation promise.
- User preferences: sidebar collapsed, column visibility, density and reduced motion. Separate them from tenant-wide content/theme; local preferences contain no student evidence and are namespaced tenant+actor, reset on identity change.
- Draft preview initially client-side and explicit; publish uses existing settings transaction with expectedConfigVersion, immutable revision/activity and rollback. Persistent multi-editor draft workflow is deferred unless requirements justify a schema.

## Security And Governance

Create explicit console.experience.view/edit permissions in catalog; do not reuse organization.view for mutations. Tenant admins/approved content editors only; progress.grade does not imply experience.edit. Review current SettingsService policy and every API guard before adding writes. Platform global overrides are out of initial scope.

Plain text only; render with React text escaping. No HTML, JS, inline style, arbitrary external URL, custom route or icon uploads. Theme editor uses swatches, validated token enum/ranges and previewed contrast, not free CSS. Preserve brand assets through existing validated storage paths if later supported.

Allowlist placeholders such as studentName/month/className with exact validation and escaping. Preserve translator context and ARIA-label parity. Reject oversized strings, missing/unknown placeholders, forbidden controls and unsupported locale. Long Vietnamese labels must wrap or have an accessible expanded label; never crop essential actions.

Protected safety phrases and factual state vocabulary remain reviewed defaults (finalized, pending vs paid, unauthorized, source/proxy warning). Owners may edit explanatory language around these, but cannot relabel unpaid as paid, hide missing evidence or remove irreversible-action warning. API error codes remain unchanged; editable message mappings cannot reveal tenant existence/secrets or suppress required error visibility.

## Publish Flow

Select section -> edit known keys -> preview desktop/mobile/long-label samples -> check contrast/placeholders -> view before/after diff -> publish with accepted config version -> confirm revision. Concurrent publish409 retains local draft; refetch/diff before retry. Rollback creates a new immutable revision and bumps version, never deletes history.

Runtime fetch exposes only safe published presentation keys, never all settings/secrets. Cache keys include tenant/locale/configVersion. Clear presentation cache on logout/tenant switch; ignore old in-flight responses. Failed fetch uses compiled defaults or same-tenant last-good in-memory values, not cross-tenant persisted cache. Publish may trigger a safe refetch; do not replace active teacher draft or move focus. Settings rubric config and presentation config are not conflated semantically even if sharing tenant version invalidation.

## Example Tone (Proposed Defaults)

| Current | Proposed |
| --- | --- |
| Input học thuật / evidence kỹ năng | Đánh giá đã ghi nhận |
| Chưa xác định | Chưa có đánh giá phù hợp |
| Needs support | Cần hỗ trợ thêm |
| Không có dữ liệu | Chưa có đánh giá trong ngày này |
| Internal server error | Chưa lưu được. Dữ liệu bạn nhập vẫn còn; vui lòng thử lại. |
| Conflict | Dữ liệu đã thay đổi ở phiên khác. Xem bản mới trước khi lưu lại. |

Operational proxy remains explicitly **Chỉ số hoạt động, chưa phải điểm đánh giá học tập**. Microcopy cannot promise a retry is safe after uncertain commit; that state has separate wording and reconciliation action.

## Acceptance

An authorized tenant owner edits a progress column label and sees it after publish/reload without rebuild; another tenant stays unchanged. Rollback restores wording, protected status cannot be falsified, unknown HTML/script rejected, conflicting publish blocked, long labels remain usable at390px and200% zoom. Unavailable config service cannot stop grade entry under existing safe defaults.
