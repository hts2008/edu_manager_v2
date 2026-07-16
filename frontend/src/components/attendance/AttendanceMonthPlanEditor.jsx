import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, CalendarDays, CheckCircle2, RefreshCw } from "lucide-react";
import { classSessionsService } from "../../services/api";
import { normalizeScheduleDays } from "../../utils/dateKeys";
import {
  buildMonthPlanPatchRequest,
  buildMonthPlanRequest,
  formatSessionDate,
  formatTuitionMonth,
  generateFixedMonthPlanDates,
  normalizeMonthPlanResponse,
} from "../../utils/tuitionV3";
import ActionProgressButton from "../ui/ActionProgressButton";
import Modal from "../ui/Modal";
import {
  buildMonthPlanFeePreview,
  findMonthPlanDateConflicts,
} from "./attendanceReadiness";

const WEEKDAYS = [
  { value: 1, label: "T2" },
  { value: 2, label: "T3" },
  { value: 3, label: "T4" },
  { value: 4, label: "T5" },
  { value: 5, label: "T6" },
  { value: 6, label: "T7" },
  { value: 0, label: "CN" },
];

const CONFLICT_CODES = new Set([
  "VERSION_CONFLICT",
  "CLASS_MONTH_PLAN_REVISION_CONFLICT",
  "SESSION_KIND_CONFLICT",
  "NON_REGULAR_SESSION_REQUIRES_PATCH",
  "SESSION_HAS_ATTENDANCE",
  "SESSION_DATE_CONFLICT",
  "SESSION_IN_USE",
  "SESSION_PLAN_PROTECTED",
  "BILLING_MONTH_MISMATCH",
]);

const VND_FORMATTER = new Intl.NumberFormat("vi-VN");

function monthDays(month) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month || "")) return [];
  const [year, monthNumber] = month.split("-").map(Number);
  const count = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(Date.UTC(year, monthNumber - 1, index + 1));
    return {
      date: date.toISOString().slice(0, 10),
      day: index + 1,
      weekday: date.getUTCDay(),
    };
  });
}

function inferMode(plan, scheduleDays, month) {
  if (!scheduleDays.length) return "flexible";
  const fixedDates = generateFixedMonthPlanDates(month, scheduleDays);
  return plan.regularDates.length === 0 ||
    fixedDates.join("|") === plan.regularDates.join("|")
    ? "fixed_weekdays"
    : "flexible";
}

function buildEditorSnapshot({ mode, weekdays, selectedDates, reason }) {
  return JSON.stringify({
    mode,
    weekdays: mode === "fixed_weekdays"
      ? [...new Set(weekdays)].sort((left, right) => left - right)
      : [],
    selectedDates: mode === "flexible"
      ? [...new Set(selectedDates)].sort()
      : [],
    reason,
  });
}

export default function AttendanceMonthPlanEditor({
  open,
  classId,
  month,
  classSchedule,
  onClose,
  onSaved,
}) {
  const scheduleDays = useMemo(
    () => normalizeScheduleDays(classSchedule?.schedule_days),
    [classSchedule],
  );
  const [plan, setPlan] = useState(null);
  const [mode, setMode] = useState("fixed_weekdays");
  const [weekdays, setWeekdays] = useState([]);
  const [selectedDates, setSelectedDates] = useState([]);
  const [reason, setReason] = useState("");
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const [initialEditorSnapshot, setInitialEditorSnapshot] = useState("");
  const requestContextRef = useRef("");
  const loadRequestRef = useRef(0);
  const saveRequestRef = useRef(0);
  const requestContext = open && classId && month ? `${classId}:${month}` : "";

  const isCurrentRequest = useCallback((requestRef, requestId, context) => (
    requestRef.current === requestId && requestContextRef.current === context
  ), []);

  const loadPlan = useCallback(async () => {
    const context = requestContext;
    if (!context) return;
    const requestId = loadRequestRef.current + 1;
    loadRequestRef.current = requestId;
    setStatus("loading");
    setMessage("");
    setInitialEditorSnapshot("");
    let response;
    try {
      response = await classSessionsService.getMonthPlan(classId, month, {
        cache: "no-store",
        skipCache: true,
      });
    } catch (error) {
      if (!isCurrentRequest(loadRequestRef, requestId, context)) return;
      setPlan(null);
      setStatus("error");
      setMessage(error?.message || "Không thể tải kế hoạch tháng.");
      return;
    }
    if (!isCurrentRequest(loadRequestRef, requestId, context)) return;
    if (!response.success) {
      setPlan(null);
      setStatus("error");
      setMessage(response.error?.message || "Không thể tải kế hoạch tháng.");
      return;
    }

    const normalized = normalizeMonthPlanResponse(response);
    const nextMode = inferMode(normalized, scheduleDays, month);
    setPlan(normalized);
    setMode(nextMode);
    setWeekdays(scheduleDays);
    setSelectedDates(normalized.regularDates);
    setReason("");
    setInitialEditorSnapshot(buildEditorSnapshot({
      mode: nextMode,
      weekdays: scheduleDays,
      selectedDates: normalized.regularDates,
      reason: "",
    }));
    setStatus("ready");
  }, [classId, isCurrentRequest, month, requestContext, scheduleDays]);

  useEffect(() => {
    requestContextRef.current = requestContext;
    if (!requestContext) {
      loadRequestRef.current += 1;
      saveRequestRef.current += 1;
      setPlan(null);
      setStatus("idle");
      setMessage("");
      setReason("");
      setInitialEditorSnapshot("");
      return;
    }
    loadPlan();
    return () => {
      requestContextRef.current = "";
      loadRequestRef.current += 1;
      saveRequestRef.current += 1;
    };
  }, [loadPlan, requestContext]);

  const fixedDates = useMemo(
    () => generateFixedMonthPlanDates(month, weekdays),
    [month, weekdays],
  );
  const previewDates = mode === "fixed_weekdays" ? fixedDates : selectedDates;
  const feePreview = useMemo(
    () => buildMonthPlanFeePreview({
      billingPolicy: classSchedule?.billing_policy,
      feeAmount: classSchedule?.fee_per_day,
      sessionCount: previewDates.length,
    }),
    [classSchedule?.billing_policy, classSchedule?.fee_per_day, previewDates.length],
  );
  const days = useMemo(() => monthDays(month), [month]);
  const occupiedDates = useMemo(
    () => new Set(
      (plan?.sessions || [])
        .filter((session) => session.kind && session.kind !== "regular")
        .map((session) => String(session.date || session.session_date || "").slice(0, 10)),
    ),
    [plan],
  );
  const isMutable = plan?.state === "open";
  const hasSelection = previewDates.length > 0;
  const nonRegularDates = useMemo(
    () => findMonthPlanDateConflicts(plan?.sessions),
    [plan?.sessions],
  );
  const conflictingDates = useMemo(
    () => findMonthPlanDateConflicts(plan?.sessions)
      .filter((date) => previewDates.includes(date)),
    [plan?.sessions, previewDates],
  );
  const hasDateConflict = conflictingDates.length > 0;
  const usesPatchSemantics = nonRegularDates.length > 0;
  const controlsDisabled = !isMutable || status === "loading" || status === "saving";
  const currentEditorSnapshot = useMemo(
    () => buildEditorSnapshot({ mode, weekdays, selectedDates, reason }),
    [mode, reason, selectedDates, weekdays],
  );
  const hasUnsavedChanges = Boolean(initialEditorSnapshot) &&
    currentEditorSnapshot !== initialEditorSnapshot;

  const toggleWeekday = (day) => {
    setStatus("ready");
    setMessage("");
    setWeekdays((current) =>
      current.includes(day) ? current.filter((item) => item !== day) : [...current, day].sort(),
    );
  };

  const toggleDate = (date) => {
    if (occupiedDates.has(date)) return;
    setStatus("ready");
    setMessage("");
    setSelectedDates((current) =>
      current.includes(date)
        ? current.filter((item) => item !== date)
        : [...current, date].sort(),
    );
  };

  const handleSave = async () => {
    const context = requestContext;
    if (!context || controlsDisabled || hasDateConflict) return;
    setMessage("");
    let payload;
    try {
      payload = usesPatchSemantics
        ? buildMonthPlanPatchRequest({
            classId,
            month,
            requestedDates: previewDates,
            reason,
            plan,
          })
        : buildMonthPlanRequest({
            classId,
            month,
            mode,
            weekdays,
            sessionsPerWeek: weekdays.length,
            selectedDates,
            reason,
            plan,
          });
      if (
        usesPatchSemantics &&
        payload.add_sessions.length === 0 &&
        payload.remove_session_ids.length === 0
      ) {
        setReason("");
        setInitialEditorSnapshot(buildEditorSnapshot({
          mode,
          weekdays,
          selectedDates,
          reason: "",
        }));
        setStatus("success");
        setMessage("Không có thay đổi buổi chính khóa; các buổi bù và buổi thêm được giữ nguyên.");
        return;
      }
    } catch (error) {
      setStatus("error");
      setMessage(error?.message || "Kế hoạch tháng chưa hợp lệ.");
      return;
    }

    setStatus("saving");
    const requestId = saveRequestRef.current + 1;
    saveRequestRef.current = requestId;
    let response;
    try {
      response = usesPatchSemantics
        ? await classSessionsService.patchMonthPlan(payload)
        : await classSessionsService.replaceMonthPlan(payload);
    } catch (error) {
      if (!isCurrentRequest(saveRequestRef, requestId, context)) return;
      setStatus("error");
      setMessage(error?.message || "Không thể lưu kế hoạch tháng.");
      return;
    }
    if (!isCurrentRequest(saveRequestRef, requestId, context)) return;
    if (!response.success) {
      const isConflict = CONFLICT_CODES.has(response.error?.code);
      setStatus(isConflict ? "conflict" : "error");
      setMessage(
        isConflict
          ? response.error?.message || "Kế hoạch đã thay đổi hoặc có buổi học đang được sử dụng. Tải lại dữ liệu trước khi thử lại."
          : response.error?.message || "Không thể lưu kế hoạch tháng.",
      );
      return;
    }

    const normalized = normalizeMonthPlanResponse(response);
    setPlan(normalized);
    setSelectedDates(normalized.regularDates);
    setReason("");
    setInitialEditorSnapshot(buildEditorSnapshot({
      mode,
      weekdays,
      selectedDates: normalized.regularDates,
      reason: "",
    }));
    setStatus("success");
    setMessage(`Đã lưu ${normalized.regularDates.length} buổi chính khóa.`);
    await onSaved?.({ month, response });
  };

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title={`Kế hoạch học ${formatTuitionMonth(month)}`}
      size="xl"
      busy={status === "saving"}
      busyLabel="Đang lưu kế hoạch tháng..."
      confirmOnClose={Boolean(plan)}
      hasUnsavedChanges={hasUnsavedChanges}
    >
      <div
        className="space-y-5"
        aria-busy={status === "saving" || status === "loading"}
      >
        {status === "loading" && (
          <div className="flex min-h-52 flex-col items-center justify-center gap-3 text-center" role="status" aria-live="polite">
            <RefreshCw className="h-7 w-7 animate-spin text-blue-600 motion-reduce:animate-none" aria-hidden="true" />
            <div>
              <p className="font-semibold text-slate-900">Đang tải kế hoạch mới nhất</p>
              <p className="mt-1 text-sm text-slate-500">Version và các buổi hiện có được kiểm tra trước khi sửa.</p>
            </div>
          </div>
        )}

        {status === "error" && !plan && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-4" role="alert">
            <p className="font-semibold text-rose-900">Không thể mở kế hoạch tháng</p>
            <p className="mt-1 text-sm text-rose-800">{message}</p>
            <button type="button" onClick={loadPlan} aria-label="Tải lại kế hoạch tháng" className="mt-3 inline-flex items-center gap-2 rounded-md border border-rose-300 bg-white px-3 py-2 text-sm font-semibold text-rose-800 hover:bg-rose-100">
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Thử tải lại
            </button>
          </div>
        )}

        {plan && status !== "loading" && (
          <>
            <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">Version {plan.version}</p>
                <p className="mt-1 text-xs text-slate-600">
                  Hiện có {plan.regularDates.length} buổi chính khóa; nguồn {plan.source || "backend chưa cung cấp"}.
                </p>
              </div>
              <span className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${isMutable ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"}`}>
                {isMutable ? "Có thể chỉnh sửa" : "Chỉ xem"}
              </span>
            </div>

            {!isMutable && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900" role="status">
                Kế hoạch đã được khóa cùng kỳ điểm danh. Mở lại kỳ trước khi thay đổi ngày học.
              </div>
            )}

            <div className="grid grid-cols-2 rounded-lg border border-slate-200 bg-slate-100 p-1" role="group" aria-label="Kiểu kế hoạch tháng">
              <button type="button" aria-label="Chọn lịch cố định" aria-pressed={mode === "fixed_weekdays"} onClick={() => { setMode("fixed_weekdays"); setStatus("ready"); setMessage(""); }} disabled={controlsDisabled} className={`rounded-md px-3 py-2.5 text-sm font-semibold transition ${mode === "fixed_weekdays" ? "bg-white text-blue-700 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}>
                Lịch cố định
              </button>
              <button type="button" aria-label="Chọn ngày linh hoạt" aria-pressed={mode === "flexible"} onClick={() => { setMode("flexible"); setStatus("ready"); setMessage(""); }} disabled={controlsDisabled} className={`rounded-md px-3 py-2.5 text-sm font-semibold transition ${mode === "flexible" ? "bg-white text-blue-700 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}>
                Chọn ngày linh hoạt
              </button>
            </div>

            {mode === "fixed_weekdays" ? (
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Ngày học hàng tuần</p>
                  <div className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-7">
                    {WEEKDAYS.map((day) => (
                      <button key={day.value} type="button" onClick={() => toggleWeekday(day.value)} disabled={controlsDisabled} aria-label={`Chọn ${day.label} làm ngày học hàng tuần`} aria-pressed={weekdays.includes(day.value)} className={`h-10 rounded-md border text-sm font-semibold ${weekdays.includes(day.value) ? "border-blue-600 bg-blue-600 text-white" : "border-slate-200 bg-white text-slate-600 hover:border-blue-300"} disabled:cursor-not-allowed disabled:opacity-60`}>
                        {day.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
                  <p className="text-sm font-semibold text-blue-950">Preview cố định: {fixedDates.length} buổi</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {fixedDates.map((date) => <span key={date} className="rounded-md bg-white px-2 py-1 text-xs font-medium text-blue-800">{formatSessionDate(date)}</span>)}
                    {!fixedDates.length && <span className="text-sm text-blue-800">Chọn ít nhất một thứ trong tuần.</span>}
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-900">Chọn ngày học cụ thể</p>
                  <span className="text-xs font-semibold text-blue-700">{selectedDates.length} ngày đã chọn</span>
                </div>
                <div className="mt-3 grid grid-cols-7 gap-1 rounded-lg border border-slate-200 bg-slate-50 p-2 sm:gap-2 sm:p-3">
                  {WEEKDAYS.map((day) => (
                    <span key={`heading-${day.value}`} className="pb-1 text-center text-[10px] font-semibold text-slate-500 sm:text-xs">
                      {day.label}
                    </span>
                  ))}
                  {days.map((item, index) => {
                    const selected = selectedDates.includes(item.date);
                    const occupied = occupiedDates.has(item.date);
                    return (
                      <button key={item.date} type="button" onClick={() => toggleDate(item.date)} disabled={controlsDisabled || occupied} aria-label={`Chọn ngày học ${formatSessionDate(item.date)}`} aria-pressed={selected} title={occupied ? "Ngày đã có buổi bù hoặc buổi thêm" : formatSessionDate(item.date)} style={index === 0 ? { gridColumnStart: ((item.weekday + 6) % 7) + 1 } : undefined} className={`aspect-square min-w-0 rounded-md border text-xs font-semibold sm:text-sm ${selected ? "border-blue-600 bg-blue-600 text-white" : occupied ? "border-amber-200 bg-amber-100 text-amber-700" : "border-slate-200 bg-white text-slate-700 hover:border-blue-300"} disabled:cursor-not-allowed disabled:opacity-60`}>
                        {item.day}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {hasDateConflict && (
              <div
                id="attendance-month-plan-conflict"
                className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-950"
                role="alert"
              >
                <p className="text-sm font-semibold">Ngày chính khóa đang xung đột</p>
                <p className="mt-1 text-xs leading-5">
                  Ngày {conflictingDates.map(formatSessionDate).join(", ")} đã có buổi bù hoặc buổi thêm.
                  Bỏ các ngày xung đột khỏi lịch chính khóa rồi lưu lại; các buổi không xung đột vẫn được giữ nguyên.
                </p>
              </div>
            )}

            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4" aria-live="polite">
              {feePreview ? (
                <>
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-sm font-semibold text-emerald-950">
                      {feePreview.billingPolicy === "monthly_prorated"
                        ? "Học phí gói tháng"
                        : "Học phí theo buổi"}
                    </p>
                    <p className="text-lg font-bold text-emerald-800">
                      {VND_FORMATTER.format(feePreview.total)}đ
                    </p>
                  </div>
                  <p className="mt-1 text-xs leading-5 text-emerald-800">
                    {feePreview.billingPolicy === "monthly_prorated"
                      ? `Tổng chính xác của gói cho ${feePreview.sessionCount} buổi; không nhân lại đơn giá đã làm tròn.`
                      : `${feePreview.sessionCount} buổi × ${VND_FORMATTER.format(Number(classSchedule?.fee_per_day) || 0)}đ.`}
                  </p>
                </>
              ) : (
                <p className="text-sm font-medium text-emerald-900">
                  {hasSelection
                    ? "Thiếu chính sách hoặc mức học phí của lớp; chưa thể tính preview chính xác."
                    : "Chọn ít nhất một ngày học để xem học phí dự kiến."}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="attendance-month-plan-reason" className="block text-sm font-semibold text-slate-900">
                Lý do thay đổi <span className="text-rose-600">*</span>
              </label>
              <textarea
                id="attendance-month-plan-reason"
                value={reason}
                onChange={(event) => {
                  setReason(event.target.value);
                  if (status === "error" || status === "conflict" || status === "success") {
                    setStatus("ready");
                    setMessage("");
                  }
                }}
                rows={2}
                disabled={controlsDisabled}
                placeholder="Ví dụ: Điều chỉnh lịch theo thông báo nghỉ lễ"
                className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>

            {(status === "error" || status === "conflict" || status === "success") && message && (
              <div className={`flex gap-3 rounded-lg border p-4 ${status === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-900" : status === "conflict" ? "border-amber-200 bg-amber-50 text-amber-950" : "border-rose-200 bg-rose-50 text-rose-900"}`} role={status === "error" ? "alert" : "status"} aria-live="polite">
                {status === "success" ? <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" /> : <AlertTriangle className="h-5 w-5 shrink-0" aria-hidden="true" />}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{message}</p>
                  {status === "conflict" && (
                    <button type="button" onClick={loadPlan} aria-label="Tải version kế hoạch mới nhất" className="mt-2 inline-flex items-center gap-2 rounded-md border border-amber-300 bg-white px-3 py-2 text-xs font-semibold hover:bg-amber-100">
                      <RefreshCw className="h-4 w-4" aria-hidden="true" />
                      Tải version mới nhất
                    </button>
                  )}
                </div>
              </div>
            )}

            <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                <CalendarDays className="h-4 w-4" aria-hidden="true" />
                {previewDates.length} buổi sẽ được công bố cho tháng này
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" data-modal-close disabled={status === "saving"} className="rounded-md px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100">Đóng</button>
                <ActionProgressButton aria-label="Lưu kế hoạch tháng" aria-describedby={hasDateConflict ? "attendance-month-plan-conflict" : undefined} onClick={handleSave} loading={status === "saving"} loadingLabel="Đang lưu..." disabled={controlsDisabled || !hasSelection || hasDateConflict || !reason.trim()} className="rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">
                  Lưu kế hoạch
                </ActionProgressButton>
              </div>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
