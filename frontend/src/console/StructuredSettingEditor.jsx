import { Plus, Trash2 } from "lucide-react";
import { useEffect } from "react";
import {
  editorKindForSetting,
  normalizeTrackCatalog,
  rubricColumnTotals,
  validateStructuredSetting,
} from "./structuredSettingsModel";

const CHARGEABLE_STATUSES = [
  ["present", "Có mặt"],
  ["absent_with_fee", "Vắng có tính phí"],
  ["absent_no_fee", "Vắng không tính phí"],
  ["holiday", "Ngày lễ"],
];
const WEEKDAYS = [[1, "T2"], [2, "T3"], [3, "T4"], [4, "T5"], [5, "T6"], [6, "T7"]];
const TRACK_KEYS = ["starters", "movers", "flyers", "ket", "pet", "unknown"];
const SKILLS = ["listening", "speaking", "reading", "writing", "homework", "daily_practice", "mock_test"];
const SKILL_LABELS = {
  listening: "Nghe", speaking: "Nói", reading: "Đọc", writing: "Viết",
  homework: "BTVN", daily_practice: "Luyện hằng ngày", mock_test: "Bài kiểm tra / đề",
};

function ToggleGroup({ legend, options, value, onChange, disabled }) {
  function toggle(option) {
    const selected = value.includes(option);
    onChange(selected ? value.filter((item) => item !== option) : [...value, option]);
  }
  return (
    <fieldset className="rounded-lg border border-slate-200 p-3">
      <legend className="px-1 text-sm font-black text-slate-800">{legend}</legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map(([option, label]) => (
          <label key={option} className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 has-[:checked]:border-indigo-500 has-[:checked]:bg-indigo-50 has-[:checked]:text-indigo-700">
            <input type="checkbox" checked={value.includes(option)} onChange={() => toggle(option)} disabled={disabled} />
            {label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function TrackCatalogEditor({ value, onChange, disabled }) {
  const tracks = normalizeTrackCatalog(value);
  const availableKey = TRACK_KEYS.find((key) => !tracks.some((track) => track.key === key));
  function update(index, field, nextValue) {
    onChange(tracks.map((track, trackIndex) => trackIndex === index ? { ...track, [field]: nextValue } : track));
  }
  function addTrack() {
    if (!availableKey) return;
    onChange([...tracks, { key: availableKey, label: "", cefr: "", keywords: [], canDo: "" }]);
  }
  return (
    <div className="space-y-3">
      {tracks.map((track, index) => (
        <fieldset key={`${track.key}-${index}`} className="rounded-lg border border-slate-200 p-3">
          <legend className="px-1 text-sm font-black text-slate-800">Track {index + 1}</legend>
          <div className="grid gap-3 md:grid-cols-3">
            <label className="text-xs font-bold text-slate-600">Key
              <select value={track.key} onChange={(event) => update(index, "key", event.target.value)} disabled={disabled} className="mt-1 h-11 w-full rounded-lg border border-slate-200 bg-white px-3">
                {TRACK_KEYS.map((key) => <option key={key} value={key}>{key}</option>)}
              </select>
            </label>
            <label className="text-xs font-bold text-slate-600">Tên hiển thị
              <input value={track.label} onChange={(event) => update(index, "label", event.target.value)} disabled={disabled} className="mt-1 h-11 w-full rounded-lg border border-slate-200 px-3" />
            </label>
            <label className="text-xs font-bold text-slate-600">CEFR
              <input value={track.cefr} onChange={(event) => update(index, "cefr", event.target.value)} disabled={disabled} className="mt-1 h-11 w-full rounded-lg border border-slate-200 px-3" />
            </label>
          </div>
          <label className="mt-3 block text-xs font-bold text-slate-600">Từ khóa nhận diện
            <input value={track.keywords.join(", ")} onChange={(event) => update(index, "keywords", event.target.value.split(",").map((item) => item.trim()).filter(Boolean))} disabled={disabled} placeholder="flyer, flyers, a2" className="mt-1 h-11 w-full rounded-lg border border-slate-200 px-3" />
          </label>
          <label className="mt-3 block text-xs font-bold text-slate-600">Năng lực mục tiêu
            <textarea value={track.canDo} onChange={(event) => update(index, "canDo", event.target.value)} disabled={disabled} rows={2} className="mt-1 w-full rounded-lg border border-slate-200 p-3" />
          </label>
          <button type="button" onClick={() => onChange(tracks.filter((_, trackIndex) => trackIndex !== index))} disabled={disabled || tracks.length === 1} className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-bold text-rose-600 hover:bg-rose-50 disabled:opacity-40"><Trash2 size={16} /> Xóa dòng</button>
        </fieldset>
      ))}
      <button type="button" onClick={addTrack} disabled={disabled || !availableKey} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-indigo-50 px-4 text-sm font-bold text-indigo-700 disabled:opacity-40"><Plus size={16} /> Thêm track</button>
    </div>
  );
}

function RubricEditor({ value, onChange, disabled }) {
  const columns = Object.keys(value || {});
  const totals = rubricColumnTotals(value);
  function update(column, skill, rawValue) {
    onChange({ ...value, [column]: { ...value[column], [skill]: Number(rawValue) } });
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table className="min-w-[680px] w-full text-left text-sm">
        <thead className="bg-slate-50 text-xs font-black uppercase text-slate-500"><tr><th className="px-3 py-3">Kỹ năng</th>{columns.map((column) => <th key={column} className="px-3 py-3">{column}</th>)}</tr></thead>
        <tbody>{SKILLS.map((skill) => <tr key={skill} className="border-t border-slate-100"><th className="px-3 py-2 text-slate-700">{SKILL_LABELS[skill]}</th>{columns.map((column) => <td key={column} className="px-3 py-2"><input type="number" min="0" max="100" step="1" aria-label={`${SKILL_LABELS[skill]} ${column}`} value={value[column]?.[skill] ?? 0} onChange={(event) => update(column, skill, event.target.value)} disabled={disabled} className="h-10 w-24 rounded-lg border border-slate-200 px-3" /></td>)}</tr>)}</tbody>
        <tfoot className="border-t-2 border-slate-200 bg-slate-50"><tr><th className="px-3 py-3">Tổng trọng số</th>{columns.map((column) => <td key={column} className={`px-3 py-3 font-black ${totals[column] === 100 ? "text-emerald-700" : "text-rose-600"}`}>{totals[column]}/100</td>)}</tr></tfoot>
      </table>
    </div>
  );
}

function DifficultyEditor({ value, onChange, disabled }) {
  const fields = [["delta", "Bước tăng"], ["min", "Hệ số tối thiểu"], ["max", "Hệ số tối đa"]];
  return <div className="grid gap-3 sm:grid-cols-3">{fields.map(([field, label]) => <label key={field} className="text-sm font-bold text-slate-700">{label}<input type="number" min={field === "delta" ? 0 : 0.01} step="0.01" value={value?.[field] ?? ""} onChange={(event) => onChange({ ...value, [field]: Number(event.target.value) })} disabled={disabled} className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3" /></label>)}</div>;
}

export default function StructuredSettingEditor({ settingKey, value, onChange, onValidationChange, disabled }) {
  const kind = editorKindForSetting(settingKey);
  const validationError = validateStructuredSetting(settingKey, value);
  useEffect(() => onValidationChange?.(validationError), [onValidationChange, validationError]);

  if (kind === "chargeable-statuses") return <ToggleGroup legend="Trạng thái tính phí" options={CHARGEABLE_STATUSES} value={value || []} onChange={onChange} disabled={disabled} />;
  if (kind === "weekdays") return <ToggleGroup legend="Ngày học mặc định" options={WEEKDAYS} value={value || []} onChange={onChange} disabled={disabled} />;
  if (kind === "surcharge-policy") return <fieldset className="rounded-lg border border-slate-200 p-3"><legend className="px-1 text-sm font-black text-slate-800">Chính sách phụ thu</legend><div className="mt-2 grid gap-2 sm:grid-cols-2">{[["derive_monthly", "Suy ra từ học phí tháng"], ["per_session_fee", "Theo đơn giá mỗi buổi"]].map(([option, label]) => <label key={option} className="flex min-h-11 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-bold"><input type="radio" name={`${settingKey}-policy`} checked={value === option} onChange={() => onChange(option)} disabled={disabled} />{label}</label>)}</div></fieldset>;
  if (kind === "positive-number") return <label className="block text-sm font-bold text-slate-700">Giới hạn tối đa<input type="number" min="1" step="1" value={value ?? ""} onChange={(event) => onChange(Number(event.target.value))} disabled={disabled} className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3" /></label>;
  if (kind === "track-catalog") return <TrackCatalogEditor value={value} onChange={onChange} disabled={disabled} />;
  if (kind === "rubric") return <RubricEditor value={value} onChange={onChange} disabled={disabled} />;
  if (kind === "difficulty-weights") return <DifficultyEditor value={value} onChange={onChange} disabled={disabled} />;
  return null;
}
