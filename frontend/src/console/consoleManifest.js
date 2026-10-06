export const CONSOLE_BASE_PATH = "/admin";

export const consoleNavigation = Object.freeze([
  {
    id: "experience",
    path: `${CONSOLE_BASE_PATH}/experience`,
    label: "Giao diện",
    description: "Nội dung và giao diện của trung tâm.",
    icon: "settings-2",
    permission: "console.experience.view",
    searchTerms: ["giao diện", "nội dung", "theme"],
  },
  {
    id: "overview",
    path: CONSOLE_BASE_PATH,
    label: "Tổng quan",
    description: "Tình trạng cấu hình và thay đổi quản trị gần đây.",
    icon: "layout-dashboard",
    permission: "console.access",
    searchTerms: ["dashboard", "cấu hình", "thay đổi"],
  },
  {
    id: "tenants",
    path: `${CONSOLE_BASE_PATH}/tenants`,
    label: "Trung tâm",
    description: "Quản lý vòng đời và trạng thái các trung tâm.",
    icon: "building-2",
    permission: "platform.tenants.manage",
    platformOnly: true,
    searchTerms: ["tenant", "trung tâm", "tạm ngưng"],
  },
  {
    id: "organization",
    path: `${CONSOLE_BASE_PATH}/organization`,
    label: "Tổ chức",
    description: "Thông tin trung tâm và múi giờ nghiệp vụ.",
    icon: "landmark",
    permission: "console.organization.view",
    searchTerms: ["tổ chức", "thông tin", "múi giờ"],
  },
  {
    id: "academic",
    path: `${CONSOLE_BASE_PATH}/academic`,
    label: "Học thuật",
    description: "Track, rubric, ngưỡng sẵn sàng và độ khó.",
    icon: "graduation-cap",
    permission: "console.academic.edit",
    searchTerms: ["track", "rubric", "điểm", "độ khó"],
  },
  {
    id: "finance",
    path: `${CONSOLE_BASE_PATH}/finance`,
    label: "Tài chính",
    description: "Tham số tính phí, phụ thu, nhắc phí và giới hạn.",
    icon: "wallet-cards",
    permission: "console.finance.edit",
    searchTerms: ["học phí", "phụ thu", "nhắc phí", "bulk"],
  },
  {
    id: "access",
    path: `${CONSOLE_BASE_PATH}/access`,
    label: "Người dùng & Quyền",
    description: "Ma trận quyền và chính sách phiên đăng nhập.",
    icon: "shield-check",
    permission: "console.access.edit",
    searchTerms: ["rbac", "quyền", "session", "rate limit"],
  },
  {
    id: "integrations",
    path: `${CONSOLE_BASE_PATH}/integrations`,
    label: "Tích hợp",
    description: "Webhook, kênh nhắn tin và feature flags.",
    icon: "plug-zap",
    permission: "console.integrations.edit",
    searchTerms: ["webhook", "zalo", "sms", "feature flag"],
  },
  {
    id: "system",
    path: `${CONSOLE_BASE_PATH}/system`,
    label: "Hệ thống",
    description: "Trạng thái môi trường, cron và công cụ quản trị.",
    icon: "settings-2",
    permission: "console.access",
    searchTerms: ["system", "env", "cron", "backup", "audit"],
  },
]);

function normalizeSearchTerm(value) {
  return String(value || "").trim().toLocaleLowerCase("vi");
}

export function getConsoleNavigation({ isPlatformOwner = false, permissions = [] } = {}) {
  const allowed = new Set(permissions);
  return consoleNavigation.filter(
    (item) =>
      (!item.platformOnly || isPlatformOwner) &&
      (item.platformOnly || allowed.has(item.permission)),
  );
}

export function filterConsoleNavigation(query, options) {
  const normalizedQuery = normalizeSearchTerm(query);
  const navigation = getConsoleNavigation(options);

  if (!normalizedQuery) return navigation;

  return navigation.filter((item) =>
    [item.label, item.description, item.permission, ...item.searchTerms]
      .map(normalizeSearchTerm)
      .some((value) => value.includes(normalizedQuery)),
  );
}
