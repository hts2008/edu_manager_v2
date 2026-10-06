export function normalizeSettingsPayload(payload) {
  const items = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.settings)
      ? payload.settings
      : Array.isArray(payload?.items)
        ? payload.items
        : [];

  return items.map((item) => ({
    ...item.definition,
    ...item,
    ...(item.isDefault !== undefined || item.provenance
      ? { isDefault: item.isDefault ?? item.provenance === "registry_default" }
      : {}),
  }));
}

export function formatSettingValue(value) {
  if (value !== null && typeof value === "object") {
    return JSON.stringify(value, null, 2);
  }
  return String(value ?? "");
}

export function parseSettingDraft(draft, originalValue) {
  if (typeof originalValue === "boolean") {
    if (draft === "true") return true;
    if (draft === "false") return false;
    throw new Error("Giá trị phải là true hoặc false.");
  }

  if (typeof originalValue === "number") {
    const value = Number(draft);
    if (!Number.isFinite(value)) throw new Error("Giá trị phải là một số hợp lệ.");
    return value;
  }

  if (originalValue !== null && typeof originalValue === "object") {
    try {
      return JSON.parse(draft);
    } catch {
      throw new Error("JSON không hợp lệ. Vui lòng kiểm tra dấu ngoặc và dấu phẩy.");
    }
  }

  return draft;
}

export function getSettingGroup(pathname) {
  const group = String(pathname || "").split("/").filter(Boolean).at(-1);
  return group === "integrations" ? "integrations" : group;
}
