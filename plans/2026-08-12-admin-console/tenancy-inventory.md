# Tenancy Inventory and Compatibility Contract

## Current schema baseline

The current Prisma schema contains 28 models. Backup v3 already lists the same 28 models; AC-01 adds a permanent parity gate so later Admin Console models cannot silently escape backup coverage.

| Model | Ownership | Migration notes |
| --- | --- | --- |
| User | Tenant | Composite username uniqueness; explicit Platform Owner flag; sensitive cross-tenant APIs use a separate guard |
| Parent | Tenant | Phone uniqueness becomes tenant-local; parent portal session carries tenant |
| AuthSession | Tenant | Store tenant directly; token/session/subject tenant must match |
| Student | Tenant | Parent relation must remain in tenant |
| Teacher | Tenant | Phone uniqueness becomes tenant-local |
| Class | Tenant | Teacher and enrollment relations must remain in tenant |
| ClassSession | Tenant | Class and actor relations must remain in tenant |
| ClassMonthPlan | Tenant | Class and actor relations must remain in tenant |
| ClassMonthPlanRevision | Tenant | Immutable revision; class/plan/actor tenant consistency |
| StudentClass | Tenant | Projection only; student/class tenant consistency |
| EnrollmentPeriod | Tenant | Student/class tenant consistency and half-open interval rules preserved |
| Attendance | Tenant | Student/class/session/creator tenant consistency |
| AttendancePeriod | Tenant | Class and all actors tenant consistent |
| MonthlyFee | Tenant | Student-scoped aggregate; no invented `classId` |
| MonthlyFeeLine | Tenant | Authoritative student-class-month allocation |
| MonthlyFeeLineRevision | Tenant | Immutable line revision and actor tenant consistency |
| Template | Tenant | Partial unique default per `(tenantId,type)` |
| Receipt | Tenant | Student, creator, template, fee and lines tenant consistent |
| ReceiptLine | Tenant | Receipt/class/monthly-fee-line tenant consistent |
| BulkFeePaymentBatch | Tenant | Idempotency key tenant-local; creator tenant consistent |
| BulkFeePaymentItem | Tenant | Batch/line/receipt tenant consistent |
| Payment | Tenant | Creator/template tenant consistent |
| ActivityLog | Tenant | Append-only actor/subject/action/outcome/request/before-after metadata |
| StudentProgressMonth | Tenant | Student/class/actors tenant consistent; finalized snapshots unchanged |
| StudentProgressRevision | Tenant | Immutable progress revision and actor tenant consistent |
| StudentProgressSkill | Tenant | Parent progress month tenant consistent |
| StudentProgressDailyEntry | Tenant | Student/class/actors tenant consistent; null evidence preserved |
| CenterSettings | Tenant | Replace global singleton with one row per tenant |

## New control-plane models

| Model | Ownership | Purpose |
| --- | --- | --- |
| Tenant | Platform | Organization identity, status, config version and lifecycle |
| SettingValue | Tenant | Typed override with optional effective month |
| SettingRevision | Tenant | Append-only old/new value and reason |
| Permission | Platform catalog | Stable permission key catalog |
| Role | Tenant | Named role owned by tenant |
| RolePermission | Tenant | Tenant role-to-permission assignment |
| UserRoleAssignment | Tenant | User-to-role assignment; legacy role bridged during cutover |
| FeatureFlagOverride | Tenant | Registry-backed flag override; defaults stay in code |
| IntegrationConfig | Tenant | Non-secret metadata and encrypted/externally referenced secret handles |

## Exceptional paths requiring explicit scoping

- Authentication and parent portal login
- All Prisma nested writes and `$transaction` callbacks
- Raw SQL and advisory locks
- Monthly-fee cron and reminder jobs
- Import, backup, restore, reset, and reconciliation scripts
- Template default/image/PDF resolution
- Activity and audit reporting
- Rate limiting keys, which must include tenant slug after tenant resolution

## Compatibility rules

- Default registry values reproduce current hard-coded behavior when there is no override.
- Existing IDs and foreign-key meaning do not change during backfill.
- Finance and academic snapshots are immutable historical truth.
- Backup v3 restore into v4 maps all legacy rows to the explicit default tenant and records the mapping in restore evidence.
- A suspended tenant fails authentication and every existing session check.
