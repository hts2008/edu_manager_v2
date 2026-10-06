const EDITOR_BY_KEY = new Map([
  ["finance.chargeable_statuses", "chargeable-statuses"],
  ["finance.default_session_days", "weekdays"],
  ["finance.extra_session_policy", "surcharge-policy"],
  ["finance.bulk_pay_max_lines", "positive-number"],
  ["finance.bulk_actions_max", "positive-number"],
  ["finance.class_default_max_students", "positive-number"],
  ["academic.track_catalog", "track-catalog"],
  ["academic.rubric_base_weights", "rubric"],
  ["academic.rubric_track_overrides", "rubric"],
  ["academic.difficulty_weights", "difficulty-weights"],
]);

export function editorKindForSetting(key) {
  return EDITOR_BY_KEY.get(key) || "generic";
}

export function isStructuredEditor(key) {
  return editorKindForSetting(key) !== "generic";
}

export function rubricColumnTotals(value) {
  return Object.fromEntries(
    Object.entries(value || {}).map(([column, weights]) => [
      column,
      Object.values(weights || {}).reduce((sum, weight) => sum + (Number(weight) || 0), 0),
    ]),
  );
}

export function normalizeTrackCatalog(tracks) {
  return (tracks || []).map((track) => ({
    ...track,
    keywords: Array.isArray(track.keywords)
      ? track.keywords.map((keyword) => String(keyword).trim()).filter(Boolean)
      : String(track.keywords || "")
          .split(",")
          .map((keyword) => keyword.trim())
          .filter(Boolean),
  }));
}

export function validateStructuredSetting(key, value) {
  const kind = editorKindForSetting(key);

  if (kind === "chargeable-statuses" && (!Array.isArray(value) || value.length === 0)) {
    return "Chọn ít nhất một trạng thái được tính phí.";
  }
  if (kind === "weekdays" && (!Array.isArray(value) || value.length === 0)) {
    return "Chọn ít nhất một ngày học mặc định.";
  }
  if (kind === "positive-number" && (!Number.isInteger(Number(value)) || Number(value) <= 0)) {
    return "Giới hạn phải là số nguyên lớn hơn 0.";
  }
  if (kind === "track-catalog") {
    const tracks = normalizeTrackCatalog(value);
    if (tracks.length === 0) return "Danh mục cần ít nhất một track.";
    const keys = tracks.map((track) => track.key);
    if (new Set(keys).size !== keys.length) return "Mỗi track phải có key duy nhất.";
    if (tracks.some((track) => !track.key || !track.label?.trim() || !track.cefr?.trim() || !track.canDo?.trim())) {
      return "Mỗi track cần đủ key, tên hiển thị, CEFR và mô tả năng lực.";
    }
  }
  if (kind === "rubric") {
    const invalidColumns = Object.entries(rubricColumnTotals(value))
      .filter(([, total]) => Math.abs(total - 100) > 1e-9)
      .map(([column]) => column);
    if (invalidColumns.length > 0) {
      return `Tổng trọng số phải bằng 100 cho: ${invalidColumns.join(", ")}.`;
    }
  }
  if (kind === "difficulty-weights") {
    const delta = Number(value?.delta);
    const min = Number(value?.min);
    const max = Number(value?.max);
    if (![delta, min, max].every(Number.isFinite) || delta < 0 || min <= 0 || max <= 0) {
      return "Hệ số độ khó phải là số hợp lệ; min và max phải lớn hơn 0.";
    }
    if (min > max) return "Hệ số tối thiểu không được lớn hơn hệ số tối đa.";
  }
  return "";
}

export function settingImpactState(setting) {
  if (setting?.impact === "financial") {
    return {
      tone: "amber",
      title: "Ảnh hưởng tài chính",
      detail: "Giá trị mới chỉ áp dụng từ tháng hiệu lực; dữ liệu đã chốt giữ nguyên snapshot.",
    };
  }
  if (setting?.impact === "academic") {
    return {
      tone: "indigo",
      title: "Ảnh hưởng học thuật",
      detail: "Rubric mới áp dụng theo tháng hiệu lực; báo cáo đã chốt không bị tính lại.",
    };
  }
  if (setting?.impact === "security") {
    return {
      tone: "rose",
      title: "Ảnh hưởng bảo mật",
      detail: "Thay đổi có thể tác động đến quyền truy cập hoặc thời hạn phiên.",
    };
  }
  return {
    tone: "slate",
    title: "Ảnh hưởng vận hành",
    detail: "Thay đổi có hiệu lực sau khi lưu và không sửa dữ liệu lịch sử.",
  };
}
