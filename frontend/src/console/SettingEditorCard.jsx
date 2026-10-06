import { History, Save, ShieldCheck, FlaskConical } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { adminSettingsService } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { formatSettingValue, parseSettingDraft } from "./consoleSettingsModel";
import StructuredSettingEditor from "./StructuredSettingEditor";
import {
  isStructuredEditor,
  normalizeTrackCatalog,
  settingImpactState,
} from "./structuredSettingsModel";

function resolvedValue(setting) {
  return setting.value ?? setting.currentValue ?? setting.defaultValue ?? null;
}

function sourceLabel(setting) {
  return setting.isDefault ? "Mặc định hệ thống" : "Đã tùy chỉnh";
}

function canonicalSimulationValue(value) {
  if (Array.isArray(value)) return value.map(canonicalSimulationValue);
  if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalSimulationValue(value[key])]));
  return value;
}

export function settingSimulationFingerprint(scope) {
  return JSON.stringify(canonicalSimulationValue(scope));
}

export function settingSimulationBasis(data) {
  if (!Number.isSafeInteger(data?.configVersion) || data.configVersion < 0 || !Array.isArray(data?.settings)) throw new Error("Không xác định được phiên bản cấu hình.");
  if (data.settings.some((item) => item.warnings?.length)) throw new Error("Cấu hình hiện tại không hợp lệ.");
  return { configVersion: data.configVersion, fingerprint: settingSimulationFingerprint({ configVersion: data.configVersion, settings: [...data.settings].sort((a, b) => a.key.localeCompare(b.key)).map(({ key, value, revision, sourceId, effectiveMonth }) => ({ key, value, revision, sourceId, effectiveMonth })) }) };
}

export function settingSimulationSaveFields(group, acceptedPreview) {
  if (group !== "academic" && group !== "finance") return {};
  const expectedConfigVersion = acceptedPreview?.basis?.configVersion;
  if (!Number.isSafeInteger(expectedConfigVersion) || expectedConfigVersion < 0) throw new Error("Không xác định được phiên bản cấu hình đã mô phỏng.");
  return { expectedConfigVersion };
}

export function createSettingSimulationGuard() {
  let generation = 0;
  let preview = null;
  return {
    invalidate() { generation += 1; preview = null; },
    begin(identity) { preview = null; return { generation: ++generation, identity }; },
    capture() { return { generation }; },
    isCurrent(ticket) { return ticket.generation === generation; },
    accept(ticket, basis) {
      if (ticket.generation !== generation) return false;
      preview = { identity: ticket.identity, basis };
      return true;
    },
    isFresh(identity, basis) { return preview?.identity === identity && preview.basis.configVersion === basis.configVersion && preview.basis.fingerprint === basis.fingerprint; },
  };
}

export default function SettingEditorCard({ setting, onSave, onHistory, saving, settingsService = adminSettingsService }) {
  const { user } = useAuth();
  const tenantId = user?.tenant_id ?? user?.tenantId;
  const value = resolvedValue(setting);
  const [draft, setDraft] = useState(() => formatSettingValue(value));
  const [effectiveFromMonth, setEffectiveFromMonth] = useState(
    setting.effectiveFromMonth || "",
  );
  const [changeNote, setChangeNote] = useState("");
  const [validationError, setValidationError] = useState("");
  const [structuredValidationError, setStructuredValidationError] = useState("");
  const [classId, setClassId] = useState("");
  const [previewMonth, setPreviewMonth] = useState("");
  const [simulation, setSimulation] = useState(null);
  const [simulating, setSimulating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const simulationGuard = useRef(null);
  const submitLock = useRef(false);
  if (!simulationGuard.current) simulationGuard.current = createSettingSimulationGuard();

  useEffect(() => {
    setDraft(formatSettingValue(value));
    setEffectiveFromMonth(
      setting.effectiveFromMonth || "",
    );
    setChangeNote("");
    setValidationError("");
    setStructuredValidationError("");
  }, [setting, value]);

  const isStructured = value !== null && typeof value === "object";
  const isBoolean = typeof value === "boolean";
  const readOnly = Boolean(setting.readOnly);
  const structuredEditor = isStructuredEditor(setting.key);
  const impactState = settingImpactState(setting);
  const group = setting.group || setting.key.split(".")[0];
  const requiresSimulation = group === "academic" || group === "finance";
  const month = setting.requiresEffectiveMonth ? effectiveFromMonth : previewMonth;
  const simulationIdentity = settingSimulationFingerprint({ tenantId, actorId: user?.id, key: setting.key, revision: setting.revision, sourceId: setting.sourceId, value, draft, classId: classId.trim(), month, structuredValidationError });
  const simulationStale = requiresSimulation && (!simulation || simulation.identity !== simulationIdentity);

  useLayoutEffect(() => {
    simulationGuard.current.invalidate();
    setSimulation(null);
    setSimulating(false);
    return () => simulationGuard.current.invalidate();
  }, [simulationIdentity]);

  function structuredValue() {
    const parsed = parseSettingDraft(draft, value);
    return setting.key === "academic.track_catalog" ? normalizeTrackCatalog(parsed) : parsed;
  }

  async function loadSimulationBasis() {
    const response = await settingsService.getAll({ group, effective_month: month }, { skipCache: true });
    if (!response?.success) throw new Error(response?.error?.message || "Không tải được cấu hình hiện tại.");
    return settingSimulationBasis(response.data);
  }

  async function simulate() {
    if (readOnly || saving || submitting || simulating) return;
    if (submitLock.current) return;
    const ticket = simulationGuard.current.begin(simulationIdentity);
    setSimulation(null);
    setSimulating(true);
    setValidationError("");
    try {
      if (!tenantId || !classId.trim() || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error("Chọn lớp và tháng mô phỏng hợp lệ.");
      if (structuredValidationError) throw new Error(structuredValidationError);
      const proposedValue = structuredEditor ? structuredValue() : parseSettingDraft(draft, value);
      const basis = await loadSimulationBasis();
      if (!simulationGuard.current.isCurrent(ticket)) return;
      const response = await settingsService.simulate({ keys: { [setting.key]: proposedValue }, classId: classId.trim(), month });
      if (!simulationGuard.current.isCurrent(ticket)) return;
      if (!response?.success) throw new Error(response?.error?.message || "Không thể mô phỏng tác động.");
      const result = response.data;
      if (result?.dry_run !== true || result.tenant_id !== tenantId || result.class_id !== classId.trim() || result.month !== month || !Array.isArray(result.rows)) throw new Error("Kết quả mô phỏng không khớp phạm vi.");
      if (basis.fingerprint !== (await loadSimulationBasis()).fingerprint) throw new Error("Cấu hình đã thay đổi; hãy mô phỏng lại.");
      if (simulationGuard.current.accept(ticket, basis)) setSimulation({ ...result, basis, identity: simulationIdentity });
    } catch (error) {
      if (simulationGuard.current.isCurrent(ticket)) setValidationError(error?.message || "Không thể mô phỏng tác động.");
    } finally {
      if (simulationGuard.current.isCurrent(ticket)) setSimulating(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (readOnly || saving || submitting || simulating) return;
    if (submitLock.current) return;
    submitLock.current = true;
    let ticket = simulationGuard.current.capture();
    setValidationError("");
    setSubmitting(true);

    try {
      if (setting.requiresEffectiveMonth && !effectiveFromMonth) {
        throw new Error("Tham số này cần tháng bắt đầu áp dụng.");
      }
      if (structuredValidationError) throw new Error(structuredValidationError);
      if (requiresSimulation) {
        if (simulationStale) throw new Error("Cần mô phỏng mới trước khi lưu.");
        const basis = await loadSimulationBasis();
        if (!simulationGuard.current.isCurrent(ticket)) return;
        if (!simulationGuard.current.isFresh(simulationIdentity, basis)) {
          setSimulation(null);
          throw new Error("Cấu hình hoặc phạm vi đã thay đổi; hãy mô phỏng lại.");
        }
        simulationGuard.current.invalidate();
        ticket = simulationGuard.current.capture();
        setSimulation(null);
      }
      await onSave(setting.key, {
        value: structuredEditor ? structuredValue() : parseSettingDraft(draft, value),
        effectiveFromMonth: setting.requiresEffectiveMonth ? effectiveFromMonth : undefined,
        changeNote: changeNote.trim() || undefined,
        ...settingSimulationSaveFields(group, simulation),
      });
      if (simulationGuard.current.isCurrent(ticket)) setChangeNote("");
    } catch (error) {
      if (simulationGuard.current.isCurrent(ticket)) setValidationError(error?.message || "Không thể lưu tham số.");
    } finally {
      submitLock.current = false;
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="eduflow-panel p-4 sm:p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-black text-slate-950">{setting.labelVi || setting.label || setting.key}</h2>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">
              {sourceLabel(setting)}
            </span>
            {readOnly && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700">
                <ShieldCheck size={13} /> Chỉ đọc
              </span>
            )}
          </div>
          <p className="mt-1 break-all font-mono text-xs text-indigo-600">{setting.key}</p>
          {setting.descriptionVi && <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">{setting.descriptionVi}</p>}
        </div>
        <span className="w-fit rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">
          {setting.impact || "none"}
        </span>
      </div>

      <div className={`mt-4 rounded-lg border p-3 ${impactState.tone === "amber" ? "border-amber-200 bg-amber-50 text-amber-900" : impactState.tone === "indigo" ? "border-indigo-200 bg-indigo-50 text-indigo-900" : impactState.tone === "rose" ? "border-rose-200 bg-rose-50 text-rose-900" : "border-slate-200 bg-slate-50 text-slate-700"}`}>
        <p className="text-sm font-black">{impactState.title}</p>
        <p className="mt-1 text-xs leading-5">{impactState.detail}</p>
      </div>

      <fieldset disabled={readOnly || saving || submitting} className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_220px]">
        <div className="min-w-0 text-sm font-bold text-slate-700">
          Giá trị
          {structuredEditor ? (
            <div className="mt-2">
              <StructuredSettingEditor
                settingKey={setting.key}
                value={structuredValue()}
                onChange={(nextValue) => setDraft(formatSettingValue(nextValue))}
                onValidationChange={setStructuredValidationError}
                disabled={readOnly || saving}
              />
            </div>
          ) : isBoolean ? (
            <select
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              disabled={readOnly || saving}
              className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
            >
              <option value="true">Bật</option>
              <option value="false">Tắt</option>
            </select>
          ) : isStructured ? (
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              disabled={readOnly || saving}
              rows={8}
              spellCheck="false"
              className="mt-2 w-full resize-y rounded-lg border border-slate-200 bg-white p-3 font-mono text-xs leading-5"
            />
          ) : (
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              disabled={readOnly || saving}
              inputMode={typeof value === "number" ? "decimal" : undefined}
              className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
            />
          )}
        </div>

        <div className="space-y-4">
          {setting.requiresEffectiveMonth && (
            <label className="block text-sm font-bold text-slate-700">
              Tháng bắt đầu áp dụng
              <input
                type="month"
                value={effectiveFromMonth}
                onChange={(event) => setEffectiveFromMonth(event.target.value)}
                disabled={readOnly || saving}
                className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
              />
              <span className="mt-2 block text-xs font-medium leading-5 text-slate-500">Không hồi tố; dữ liệu đã chốt tiếp tục dùng snapshot cũ.</span>
            </label>
          )}
          <label className="block text-sm font-bold text-slate-700">
            Ghi chú thay đổi
            <input
              value={changeNote}
              onChange={(event) => setChangeNote(event.target.value)}
              disabled={readOnly || saving}
              maxLength={500}
              placeholder="Lý do điều chỉnh"
              className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
            />
          </label>
        </div>
      </fieldset>

      {(validationError || structuredValidationError) && <p role="alert" className="mt-3 text-sm font-semibold text-rose-600">{validationError || structuredValidationError}</p>}

      {requiresSimulation && (
        <div className="mt-4 space-y-3 border-t border-slate-200 pt-4">
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-sm font-bold text-slate-700">Mã lớp
              <input aria-label="Mã lớp mô phỏng" value={classId} onChange={(event) => setClassId(event.target.value)} disabled={readOnly || saving || submitting} className="input mt-2" />
            </label>
            {!setting.requiresEffectiveMonth && <label className="text-sm font-bold text-slate-700">Tháng mô phỏng
              <input aria-label="Tháng mô phỏng" type="month" value={previewMonth} onChange={(event) => setPreviewMonth(event.target.value)} disabled={readOnly || saving || submitting} className="input mt-2" />
            </label>}
            <button type="button" onClick={simulate} disabled={readOnly || saving || submitting || simulating || Boolean(structuredValidationError)} className="btn-secondary inline-flex items-center gap-2">
              <FlaskConical size={16} /> {simulating ? "Đang mô phỏng..." : "Mô phỏng tác động"}
            </button>
          </div>
          {simulation && !simulationStale && <div className="overflow-x-auto" aria-live="polite">
            <table className="w-full text-sm"><thead><tr><th className="text-left">Học viên</th><th>Trước</th><th>Sau</th><th>Thay đổi</th></tr></thead>
              <tbody>{simulation.rows.map((row) => {
                const metric = row[group];
                const key = group === "finance" ? "amount" : "score";
                const display = (value) => Number.isFinite(value) ? value : "—";
                return <tr key={row.student_id}><td>{row.student_name}</td><td className="text-center">{display(metric?.old?.[key])}</td><td className="text-center">{display(metric?.new?.[key])}</td><td className="text-center">{display(metric?.delta?.[key])}</td></tr>;
              })}</tbody>
            </table>
            {!simulation.rows.length && <p className="text-sm text-slate-500">Không có học viên trong phạm vi mô phỏng.</p>}
          </div>}
        </div>
      )}

      <div className="mt-5 flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={() => onHistory?.(setting)}
          className="inline-flex h-11 items-center gap-2 rounded-lg bg-white px-4 text-sm font-bold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
          aria-label={`Xem lịch sử ${setting.labelVi || setting.label || setting.key}`}
        >
          <History size={16} /> Lịch sử
        </button>
        <button
          type="submit"
          disabled={readOnly || saving || submitting || simulating || simulationStale || Boolean(structuredValidationError)}
          className="inline-flex h-11 items-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-bold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Save size={16} /> {saving ? "Đang lưu..." : "Lưu thay đổi"}
        </button>
      </div>
    </form>
  );
}
