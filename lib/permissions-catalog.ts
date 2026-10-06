export const PERMISSION_ROLES = ["admin", "receptionist"] as const;

export type PermissionRole = (typeof PERMISSION_ROLES)[number];
export type PermissionDomain =
  | "people"
  | "academic"
  | "attendance"
  | "finance"
  | "reports"
  | "operations"
  | "console";

export interface PermissionDefinition {
  key: string;
  domain: PermissionDomain;
  labelVi: string;
  descriptionVi: string;
  surfaces: readonly string[];
  defaults: Readonly<Record<PermissionRole, boolean>>;
}

const sharedDefaults = Object.freeze({ admin: true, receptionist: true });
const adminOnlyDefaults = Object.freeze({ admin: true, receptionist: false });

function definePermission<
  const T extends Omit<PermissionDefinition, "defaults"> & {
    access: "shared" | "admin_only";
  },
>(
  definition: T,
): Readonly<Omit<T, "access"> & { defaults: Readonly<Record<PermissionRole, boolean>> }> {
  const { access, ...metadata } = definition;
  return Object.freeze({
    ...metadata,
    surfaces: Object.freeze([...metadata.surfaces]),
    defaults: access === "shared" ? sharedDefaults : adminOnlyDefaults,
  });
}

export const PERMISSION_CATALOG = Object.freeze([
  definePermission({
    key: "students.manage",
    domain: "people",
    labelVi: "Quản lý học viên",
    descriptionVi: "Xem, tạo, cập nhật và lưu trữ hồ sơ học viên.",
    surfaces: ["/students", "/api/students/*"],
    access: "shared",
  }),
  definePermission({
    key: "classes.manage",
    domain: "academic",
    labelVi: "Quản lý lớp học",
    descriptionVi: "Quản lý lớp, lịch học, buổi học và ghi danh học viên.",
    surfaces: ["/classes", "/api/classes/*", "/api/class-sessions/*"],
    access: "shared",
  }),
  definePermission({
    key: "attendance.manage",
    domain: "attendance",
    labelVi: "Quản lý điểm danh",
    descriptionVi: "Nhập, nộp, chốt và điều chỉnh dữ liệu điểm danh.",
    surfaces: ["/attendance", "/api/attendance/*", "/api/attendance-periods/*"],
    access: "shared",
  }),
  definePermission({
    key: "fees.collect",
    domain: "finance",
    labelVi: "Thu học phí",
    descriptionVi: "Tính, xác nhận và thu học phí theo từng dòng lớp học.",
    surfaces: ["/fee-collection", "/api/monthly-fees/*"],
    access: "shared",
  }),
  definePermission({
    key: "receipts.manage",
    domain: "finance",
    labelVi: "Quản lý phiếu thu",
    descriptionVi: "Tạo, xem, hiệu chỉnh và in phiếu thu.",
    surfaces: ["/receipts", "/api/receipts/*"],
    access: "shared",
  }),
  definePermission({
    key: "progress.view",
    domain: "academic",
    labelVi: "Xem tiến bộ học viên",
    descriptionVi: "Xem timeline, báo cáo và bản in tiến bộ học viên.",
    surfaces: ["/student-progress", "/api/student-progress/timeline", "/api/student-progress/pdf"],
    access: "shared",
  }),
  definePermission({
    key: "progress.grade",
    domain: "academic",
    labelVi: "Chấm tiến bộ học viên",
    descriptionVi: "Nhập và cập nhật evidence, điểm kỹ năng và nhận xét theo ngày.",
    surfaces: ["/student-progress", "/api/student-progress/*"],
    access: "shared",
  }),
  definePermission({
    key: "users.manage",
    domain: "people",
    labelVi: "Quản lý người dùng",
    descriptionVi: "Tạo, cập nhật, vô hiệu hóa và quản lý tài khoản nhân sự.",
    surfaces: ["/users", "/api/users/*"],
    access: "admin_only",
  }),
  definePermission({
    key: "users.reset_password",
    domain: "people",
    labelVi: "Đặt lại mật khẩu",
    descriptionVi: "Đặt lại mật khẩu cho tài khoản nhân sự khác.",
    surfaces: ["/api/users/:id/reset-password"],
    access: "admin_only",
  }),
  definePermission({
    key: "backups.manage",
    domain: "operations",
    labelVi: "Quản lý sao lưu",
    descriptionVi: "Tạo, kiểm tra và quản lý các bản sao lưu hệ thống.",
    surfaces: ["/backups", "/api/backups/*"],
    access: "admin_only",
  }),
  definePermission({
    key: "recycle_bin.manage",
    domain: "operations",
    labelVi: "Quản lý thùng rác",
    descriptionVi: "Khôi phục hoặc xóa vĩnh viễn bản ghi đã lưu trữ.",
    surfaces: ["/recycle-bin", "/api/recycle-bin/*"],
    access: "admin_only",
  }),
  definePermission({
    key: "audit_logs.view",
    domain: "operations",
    labelVi: "Xem nhật ký hệ thống",
    descriptionVi: "Xem lịch sử thao tác và sự kiện kiểm toán.",
    surfaces: ["/audit-logs", "/api/activity-logs/*"],
    access: "admin_only",
  }),
  definePermission({
    key: "fee_reminders.send",
    domain: "finance",
    labelVi: "Gửi nhắc học phí",
    descriptionVi: "Tạo và gửi tác vụ nhắc học phí đến phụ huynh.",
    surfaces: ["/fee-reminders", "/api/fee-reminders/*"],
    access: "admin_only",
  }),
  definePermission({
    key: "imports.run",
    domain: "operations",
    labelVi: "Nhập dữ liệu",
    descriptionVi: "Chạy quy trình nhập học viên và dữ liệu vận hành.",
    surfaces: ["/imports", "/api/import/*"],
    access: "admin_only",
  }),
  definePermission({
    key: "bulk_actions.run",
    domain: "operations",
    labelVi: "Thao tác hàng loạt",
    descriptionVi: "Thực hiện lưu trữ hoặc xóa nhiều bản ghi trong một lần.",
    surfaces: ["/api/bulk-actions/*"],
    access: "admin_only",
  }),
  definePermission({
    key: "monthly_fees.generate",
    domain: "finance",
    labelVi: "Phát sinh học phí tháng",
    descriptionVi: "Tạo hàng loạt dòng học phí tháng từ dữ liệu đã chốt.",
    surfaces: ["/api/monthly-fees/generate"],
    access: "admin_only",
  }),
  definePermission({
    key: "reports.view",
    domain: "reports",
    labelVi: "Xem báo cáo quản trị",
    descriptionVi: "Xem dashboard tài chính, học thuật và báo cáo nâng cao.",
    surfaces: ["/reports", "/advanced-reports", "/api/reports/*"],
    access: "admin_only",
  }),
  definePermission({
    key: "templates.manage",
    domain: "operations",
    labelVi: "Quản lý mẫu in",
    descriptionVi: "Tạo, sửa, đặt mặc định và tải tài nguyên cho mẫu in.",
    surfaces: ["/templates", "/api/templates/*"],
    access: "admin_only",
  }),
  definePermission({
    key: "console.access",
    domain: "console",
    labelVi: "Truy cập Admin Console",
    descriptionVi: "Mở mặt phẳng cấu hình và quản trị tenant.",
    surfaces: ["/admin"],
    access: "admin_only",
  }),
    definePermission({
      key: "console.organization.view",
    domain: "console",
    labelVi: "Xem cấu hình tổ chức",
    descriptionVi: "Xem thông tin trung tâm và cấu hình tổ chức chỉ đọc.",
    surfaces: ["/admin/organization"],
      access: "admin_only",
    }),
    definePermission({ key: "console.experience.view", domain: "console", labelVi: "Xem giao diện", descriptionVi: "Xem nội dung và giao diện tổ chức.", surfaces: ["/admin/experience", "/api/admin/experience"], access: "admin_only" }),
    definePermission({ key: "console.experience.edit", domain: "console", labelVi: "Xuất bản giao diện", descriptionVi: "Xuất bản nội dung và bảng màu giới hạn có version.", surfaces: ["/admin/experience", "/api/admin/experience"], access: "admin_only" }),
  definePermission({
    key: "console.finance.edit",
    domain: "console",
    labelVi: "Sửa cấu hình tài chính",
    descriptionVi: "Thay đổi tham số tài chính có version và tháng hiệu lực.",
    surfaces: ["/admin/finance", "/api/admin/settings/finance.*"],
    access: "admin_only",
  }),
  definePermission({
    key: "console.academic.edit",
    domain: "console",
    labelVi: "Sửa cấu hình học thuật",
    descriptionVi: "Thay đổi track, rubric và ngưỡng đánh giá học thuật.",
    surfaces: ["/admin/academic", "/api/admin/settings/academic.*"],
    access: "admin_only",
  }),
  definePermission({
    key: "console.access.edit",
    domain: "console",
    labelVi: "Sửa quyền truy cập",
    descriptionVi: "Thay đổi ma trận quyền và chính sách bảo mật tenant.",
    surfaces: ["/admin/access", "/api/admin/permissions/*"],
    access: "admin_only",
  }),
  definePermission({
    key: "console.integrations.edit",
    domain: "console",
    labelVi: "Sửa tích hợp",
    descriptionVi: "Cấu hình feature flags, webhook và tích hợp bên ngoài.",
    surfaces: ["/admin/integrations", "/api/admin/integrations/*"],
    access: "admin_only",
  }),
] satisfies readonly PermissionDefinition[]);

export type PermissionKey = (typeof PERMISSION_CATALOG)[number]["key"];

export const PERMISSION_KEYS = Object.freeze(
  PERMISSION_CATALOG.map((permission) => permission.key),
) as readonly PermissionKey[];

const permissionRoleSet = new Set<string>(PERMISSION_ROLES);
const permissionKeySet = new Set<string>(PERMISSION_KEYS);
const permissionByKey = new Map(
  PERMISSION_CATALOG.map((permission) => [permission.key, permission]),
);

export function isPermissionRole(value: unknown): value is PermissionRole {
  return typeof value === "string" && permissionRoleSet.has(value);
}

export function assertPermissionRole(value: unknown): PermissionRole {
  if (!isPermissionRole(value)) {
    throw new Error(`Unknown permission role: ${String(value)}`);
  }
  return value;
}

export function isPermissionKey(value: unknown): value is PermissionKey {
  return typeof value === "string" && permissionKeySet.has(value);
}

export function assertPermissionKey(value: unknown): PermissionKey {
  if (!isPermissionKey(value)) {
    throw new Error(`Unknown permission key: ${String(value)}`);
  }
  return value;
}

export function getPermissionDefinition(key: unknown): PermissionDefinition {
  const validatedKey = assertPermissionKey(key);
  return permissionByKey.get(validatedKey)!;
}

export function getDefaultPermission(
  role: PermissionRole,
  key: PermissionKey,
): boolean {
  const validatedRole = assertPermissionRole(role);
  return getPermissionDefinition(key).defaults[validatedRole];
}

export function listDefaultPermissions(role: PermissionRole): PermissionKey[] {
  const validatedRole = assertPermissionRole(role);
  return PERMISSION_CATALOG.filter(
    (permission) => permission.defaults[validatedRole],
  ).map((permission) => permission.key);
}
