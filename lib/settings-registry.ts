import { z } from "zod";
import { UI_COPY_SCHEMA, UI_THEME_SCHEMA, DEFAULT_UI_THEME } from "./ui-experience.js";

export const SETTING_GROUPS = [
  "finance",
  "academic",
  "access",
  "integrations",
  "organization",
  "flags",
] as const;

export const SETTING_PERMISSIONS = [
  "console.experience.view",
  "console.experience.edit",
  "console.finance.edit",
  "console.academic.edit",
  "console.access.edit",
  "console.integrations.edit",
  "console.organization.view",
] as const;

export type SettingGroup = (typeof SETTING_GROUPS)[number];
export type SettingPermission = (typeof SETTING_PERMISSIONS)[number];
export type SettingImpact = "none" | "financial" | "academic" | "security";

export interface SettingDefinition<T = unknown> {
  key: string;
  group: SettingGroup;
  labelVi: string;
  descriptionVi: string;
  schema: z.ZodType<T>;
  defaultValue: T;
  impact: SettingImpact;
  requiresEffectiveMonth: boolean;
  permission: SettingPermission;
  readOnly?: boolean;
}

const skillWeightsSchema = z
  .object({
    listening: z.number().min(0).max(100),
    speaking: z.number().min(0).max(100),
    reading: z.number().min(0).max(100),
    writing: z.number().min(0).max(100),
    homework: z.number().min(0).max(100),
    daily_practice: z.number().min(0).max(100),
    mock_test: z.number().min(0).max(100),
  })
  .strict()
  .refine((value) => Object.values(value).reduce((sum, weight) => sum + weight, 0) === 100, {
    message: "skill weights must total 100",
  });

const trackKeySchema = z.enum(["starters", "movers", "flyers", "ket", "pet", "unknown"]);
const trackCatalogSchema = z.array(
  z
    .object({
      key: trackKeySchema,
      label: z.string().min(1),
      cefr: z.string().min(1),
      keywords: z.array(z.string()),
      canDo: z.string().min(1),
    })
    .strict(),
);

const scoreBlendSchema = z
  .object({
    skill: z.number().min(0).max(1),
    attendance: z.number().min(0).max(1),
    consistency: z.number().min(0).max(1),
  })
  .strict()
  .refine(
    (value) => Math.abs(value.skill + value.attendance + value.consistency - 1) < 1e-9,
    { message: "score blend must total 1" },
  );

const fallbackScoreWeightsSchema = z
  .object({ attendance: z.number().min(0).max(1), completion: z.number().min(0).max(1) })
  .strict()
  .refine((value) => Math.abs(value.attendance + value.completion - 1) < 1e-9, {
    message: "fallback score weights must total 1",
  });

const positiveIntegerSchema = z.number().int().positive();

function defineSetting<T>(definition: SettingDefinition<T>) {
  if (
    (definition.impact === "financial" || definition.impact === "academic") &&
    !definition.requiresEffectiveMonth
  ) {
    throw new Error(`${definition.key} must require an effective month`);
  }
  return definition;
}

export const SETTINGS_REGISTRY = [
  defineSetting({ key: "organization.ui_copy.vi", group: "organization", labelVi: "Nội dung hiển thị", descriptionVi: "Nội dung tiếng Việt theo khóa cho phép.", schema: UI_COPY_SCHEMA, defaultValue: {}, impact: "none", requiresEffectiveMonth: false, permission: "console.experience.edit" }),
  defineSetting({ key: "organization.ui_theme", group: "organization", labelVi: "Giao diện", descriptionVi: "Bảng màu và token giao diện giới hạn.", schema: UI_THEME_SCHEMA, defaultValue: DEFAULT_UI_THEME, impact: "none", requiresEffectiveMonth: false, permission: "console.experience.edit" }),
  defineSetting({
    key: "finance.chargeable_statuses",
    group: "finance",
    labelVi: "Trạng thái điểm danh được tính phí",
    descriptionVi: "Các trạng thái điểm danh được đưa vào số buổi tính học phí.",
    schema: z.array(z.enum(["present", "absent_with_fee", "absent_no_fee", "holiday"])).min(1),
    defaultValue: ["present", "absent_with_fee"],
    impact: "financial",
    requiresEffectiveMonth: true,
    permission: "console.finance.edit",
  }),
  defineSetting({
    key: "finance.default_session_days",
    group: "finance",
    labelVi: "Ngày học mặc định",
    descriptionVi: "Các ngày trong tuần dùng để lập lịch khi lớp chỉ khai báo số buổi.",
    schema: z.array(z.number().int().min(1).max(6)).min(1),
    defaultValue: [1, 2, 3, 4, 5, 6],
    impact: "financial",
    requiresEffectiveMonth: true,
    permission: "console.finance.edit",
  }),
  defineSetting({
    key: "finance.extra_session_policy",
    group: "finance",
    labelVi: "Chính sách phụ thu buổi thêm",
    descriptionVi: "Cách xác định đơn giá buổi thêm của gói học phí tháng.",
    schema: z.enum(["derive_monthly", "per_session_fee"]),
    defaultValue: "derive_monthly",
    impact: "financial",
    requiresEffectiveMonth: true,
    permission: "console.finance.edit",
  }),
  defineSetting({
    key: "finance.makeup_default_reason",
    group: "finance",
    labelVi: "Lý do học bù mặc định",
    descriptionVi: "Lý do được gắn khi một buổi học nằm ngoài lịch chuẩn.",
    schema: z.string().min(1),
    defaultValue: "Hoc bu ngoai lich",
    impact: "none",
    requiresEffectiveMonth: false,
    permission: "console.finance.edit",
  }),
  defineSetting({
    key: "finance.bulk_pay_max_lines",
    group: "finance",
    labelVi: "Số dòng thu học phí tối đa",
    descriptionVi: "Giới hạn số dòng học phí trong một lệnh thu hàng loạt.",
    schema: positiveIntegerSchema,
    defaultValue: 500,
    impact: "none",
    requiresEffectiveMonth: false,
    permission: "console.finance.edit",
  }),
  defineSetting({
    key: "finance.bulk_actions_max",
    group: "finance",
    labelVi: "Số bản ghi thao tác hàng loạt tối đa",
    descriptionVi: "Giới hạn bản ghi cho một thao tác lưu trữ hoặc xóa hàng loạt.",
    schema: positiveIntegerSchema,
    defaultValue: 100,
    impact: "none",
    requiresEffectiveMonth: false,
    permission: "console.finance.edit",
  }),
  defineSetting({
    key: "finance.class_default_max_students",
    group: "finance",
    labelVi: "Sĩ số lớp mặc định",
    descriptionVi: "Sĩ số tối đa mặc định khi tạo lớp mới.",
    schema: positiveIntegerSchema,
    defaultValue: 50,
    impact: "none",
    requiresEffectiveMonth: false,
    permission: "console.finance.edit",
  }),
  defineSetting({
    key: "finance.reminder_message_template",
    group: "finance",
    labelVi: "Mẫu nội dung nhắc học phí",
    descriptionVi: "Mẫu hiện hành hỗ trợ biến {{thang}}, {{ten}} và {{sotien}}.",
    schema: z.string().min(1),
    defaultValue:
      "Trung tam thong bao hoc phi thang {{thang}} cua {{ten}}: {{sotien}}. Vui long thanh toan khi thuan tien. Cam on quy phu huynh.",
    impact: "none",
    requiresEffectiveMonth: false,
    permission: "console.finance.edit",
  }),
  defineSetting({
    key: "academic.track_catalog",
    group: "academic",
    labelVi: "Danh mục lộ trình Cambridge",
    descriptionVi: "Tên, CEFR, từ khóa nhận diện và năng lực mục tiêu của từng track.",
    schema: trackCatalogSchema,
    defaultValue: [
      { key: "starters", label: "Pre A1 Starters", cefr: "Pre A1", keywords: ["starter", "starters"], canDo: "lam quen tieng Anh, tu vung lop hoc, cau hoi ca nhan don gian" },
      { key: "movers", label: "A1 Movers", cefr: "A1", keywords: ["mover", "movers"], canDo: "hoi dap ve doi song hang ngay va mo ta su vat quen thuoc" },
      { key: "flyers", label: "A2 Flyers", cefr: "A2", keywords: ["flyer", "flyers"], canDo: "ket noi cau, hieu huong dan va giao tiep trong tinh huong quen thuoc" },
      { key: "ket", label: "A2 Key / KET", cefr: "A2", keywords: ["ket", "key", "a2 key"], canDo: "doc viet thong tin don gian, nghe thong bao cham, hoi dap co ban" },
      { key: "pet", label: "B1 Preliminary / PET", cefr: "B1", keywords: ["pet", "preliminary", "b1"], canDo: "doc y chinh, viet email/bai ngan, nghe hoi thoai doi song, tuong tac tu tin hon" },
      { key: "unknown", label: "Chua xac dinh", cefr: "N/A", keywords: [], canDo: "can gan track hoc thuat cho lop de bao cao ro hon" },
    ],
    impact: "academic",
    requiresEffectiveMonth: true,
    permission: "console.academic.edit",
  }),
  defineSetting({
    key: "academic.rubric_base_weights",
    group: "academic",
    labelVi: "Trọng số kỹ năng theo loại lớp",
    descriptionVi: "Trọng số nền cho lớp giao tiếp, luyện thi và kết hợp.",
    schema: z.object({ communicative: skillWeightsSchema, exam_prep: skillWeightsSchema, mixed: skillWeightsSchema }).strict(),
    defaultValue: {
      communicative: { listening: 25, speaking: 25, reading: 15, writing: 15, homework: 10, daily_practice: 10, mock_test: 0 },
      exam_prep: { listening: 15, speaking: 15, reading: 25, writing: 25, homework: 8, daily_practice: 4, mock_test: 8 },
      mixed: { listening: 20, speaking: 20, reading: 20, writing: 20, homework: 10, daily_practice: 5, mock_test: 5 },
    },
    impact: "academic",
    requiresEffectiveMonth: true,
    permission: "console.academic.edit",
  }),
  defineSetting({
    key: "academic.rubric_track_overrides",
    group: "academic",
    labelVi: "Trọng số kỹ năng theo track",
    descriptionVi: "Trọng số thay thế cho từng track Cambridge đã xác định.",
    schema: z.object({ starters: skillWeightsSchema, movers: skillWeightsSchema, flyers: skillWeightsSchema, ket: skillWeightsSchema, pet: skillWeightsSchema }).strict(),
    defaultValue: {
      starters: { listening: 28, speaking: 28, reading: 14, writing: 14, homework: 8, daily_practice: 8, mock_test: 0 },
      movers: { listening: 26, speaking: 26, reading: 16, writing: 16, homework: 8, daily_practice: 8, mock_test: 0 },
      flyers: { listening: 22, speaking: 22, reading: 18, writing: 18, homework: 10, daily_practice: 10, mock_test: 0 },
      ket: { listening: 18, speaking: 18, reading: 24, writing: 24, homework: 8, daily_practice: 4, mock_test: 4 },
      pet: { listening: 16, speaking: 16, reading: 26, writing: 26, homework: 8, daily_practice: 4, mock_test: 4 },
    },
    impact: "academic",
    requiresEffectiveMonth: true,
    permission: "console.academic.edit",
  }),
  defineSetting({
    key: "academic.score_blend",
    group: "academic",
    labelVi: "Tỷ trọng điểm tiến bộ",
    descriptionVi: "Tỷ trọng điểm kỹ năng, chuyên cần và tính nhất quán.",
    schema: scoreBlendSchema,
    defaultValue: { skill: 0.6, attendance: 0.25, consistency: 0.15 },
    impact: "academic",
    requiresEffectiveMonth: true,
    permission: "console.academic.edit",
  }),
  defineSetting({
    key: "academic.readiness_thresholds",
    group: "academic",
    labelVi: "Ngưỡng sẵn sàng",
    descriptionVi: "Ngưỡng đạt chuẩn, theo dõi và điều chỉnh khi có rủi ro chuyên cần.",
    schema: z.object({ onTrack: z.number().min(0).max(100), watch: z.number().min(0).max(100), riskAdjusted: z.number().min(0).max(100) }).strict().refine((value) => value.onTrack > value.watch, { message: "onTrack must be greater than watch" }),
    defaultValue: { onTrack: 85, watch: 70, riskAdjusted: 78 },
    impact: "academic",
    requiresEffectiveMonth: true,
    permission: "console.academic.edit",
  }),
  defineSetting({
    key: "academic.fallback_score_weights",
    group: "academic",
    labelVi: "Tỷ trọng điểm dự phòng",
    descriptionVi: "Tỷ trọng chuyên cần và mức hoàn tất khi chưa có điểm học thuật.",
    schema: fallbackScoreWeightsSchema,
    defaultValue: { attendance: 0.72, completion: 0.28 },
    impact: "academic",
    requiresEffectiveMonth: true,
    permission: "console.academic.edit",
  }),
  defineSetting({
    key: "academic.consistency_penalties",
    group: "academic",
    labelVi: "Điểm trừ tính nhất quán",
    descriptionVi: "Điểm trừ theo buổi thiếu dữ liệu và từng loại vắng mặt.",
    schema: z.object({ missingSession: z.number().min(0), absentNoFee: z.number().min(0), absentWithFee: z.number().min(0) }).strict(),
    defaultValue: { missingSession: 4, absentNoFee: 10, absentWithFee: 5 },
    impact: "academic",
    requiresEffectiveMonth: true,
    permission: "console.academic.edit",
  }),
  defineSetting({
    key: "academic.difficulty_weights",
    group: "academic",
    labelVi: "Hệ số độ khó tương đối",
    descriptionVi: "Bước tăng và biên hệ số khi bộ đề lệch cấp độ lớp.",
    schema: z.object({ delta: z.number().min(0), min: z.number().positive(), max: z.number().positive() }).strict().refine((value) => value.min <= value.max, { message: "min must not exceed max" }),
    defaultValue: { delta: 0.15, min: 0.7, max: 1.3 },
    impact: "academic",
    requiresEffectiveMonth: true,
    permission: "console.academic.edit",
  }),
  defineSetting({
    key: "access.staff_session_hours",
    group: "access",
    labelVi: "Thời hạn phiên nhân viên",
    descriptionVi: "Số giờ tồn tại của phiên đăng nhập nhân viên.",
    schema: positiveIntegerSchema,
    defaultValue: 8,
    impact: "security",
    requiresEffectiveMonth: false,
    permission: "console.access.edit",
  }),
  defineSetting({
    key: "access.parent_session_days",
    group: "access",
    labelVi: "Thời hạn phiên phụ huynh",
    descriptionVi: "Số ngày tồn tại của phiên đăng nhập phụ huynh.",
    schema: positiveIntegerSchema,
    defaultValue: 7,
    impact: "security",
    requiresEffectiveMonth: false,
    permission: "console.access.edit",
  }),
  defineSetting({
    key: "access.login_rate_limit",
    group: "access",
    labelVi: "Giới hạn đăng nhập",
    descriptionVi: "Cửa sổ thời gian và số lần thử đăng nhập tối đa.",
    schema: z.object({ windowMs: positiveIntegerSchema, max: positiveIntegerSchema }).strict(),
    defaultValue: { windowMs: 900_000, max: 10 },
    impact: "security",
    requiresEffectiveMonth: false,
    permission: "console.access.edit",
  }),
  defineSetting({
    key: "flags.fee_reminders_enabled",
    group: "flags",
    labelVi: "Bật gửi nhắc phí thật",
    descriptionVi: "Kill-switch; tắt giữ luồng gửi ở chế độ dry-run.",
    schema: z.boolean(),
    defaultValue: false,
    impact: "none",
    requiresEffectiveMonth: false,
    permission: "console.integrations.edit",
  }),
  defineSetting({
    key: "flags.parent_portal_enabled",
    group: "flags",
    labelVi: "Bật cổng phụ huynh",
    descriptionVi: "Cho phép phụ huynh đăng nhập cổng tra cứu hiện hành.",
    schema: z.boolean(),
    defaultValue: true,
    impact: "none",
    requiresEffectiveMonth: false,
    permission: "console.integrations.edit",
  }),
  defineSetting({
    key: "organization.business_timezone",
    group: "organization",
    labelVi: "Múi giờ nghiệp vụ",
    descriptionVi: "Múi giờ dùng để xác định ngày và tháng nghiệp vụ; V1 chỉ đọc.",
    schema: z.literal("Asia/Ho_Chi_Minh"),
    defaultValue: "Asia/Ho_Chi_Minh",
    impact: "none",
    requiresEffectiveMonth: false,
    permission: "console.organization.view",
    readOnly: true,
  }),
] satisfies SettingDefinition[];

const settingsByKey = new Map(SETTINGS_REGISTRY.map((definition) => [definition.key, definition]));

if (settingsByKey.size !== SETTINGS_REGISTRY.length) {
  throw new Error("Settings registry contains duplicate keys");
}

export type SettingKey = (typeof SETTINGS_REGISTRY)[number]["key"];

export function getSettingDefinition(key: string): SettingDefinition {
  const definition = settingsByKey.get(key);
  if (!definition) throw new Error(`Unknown setting key: ${key}`);
  return definition;
}

export function parseSettingValue(key: string, value: unknown) {
  return getSettingDefinition(key).schema.parse(value);
}
