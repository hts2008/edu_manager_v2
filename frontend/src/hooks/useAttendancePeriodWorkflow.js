import { useCallback, useEffect, useRef, useState } from "react";
import { normalizeAttendanceReadiness, getAttendanceReadinessError } from "../components/attendance/attendanceReadiness";
import { attendancePeriodsService } from "../services/api";

const ACTION_IN_PROGRESS = Object.freeze({
  success: false,
  ignored: true,
  error: {
    code: "ACTION_IN_PROGRESS",
    message: "Một thao tác điểm danh khác đang được xử lý",
  },
});

function normalizeClientFailure(error, fallbackMessage = "Không thể thực hiện thao tác") {
  const source = error?.error || error;
  return {
    success: false,
    error: {
      code: source?.code || "CLIENT_ERROR",
      message: source?.message || fallbackMessage,
      ...(source?.details === undefined ? {} : { details: source.details }),
    },
  };
}

export default function useAttendancePeriodWorkflow({ onChanged, toast }) {
  const [activeAction, setActiveAction] = useState("");
  const [lockTarget, setLockTarget] = useState(null);
  const [preflight, setPreflight] = useState(null);
  const [preflightError, setPreflightError] = useState("");
  const [lockActionError, setLockActionError] = useState("");
  const [readinessIssue, setReadinessIssue] = useState(null);
  const activeActionRef = useRef("");
  const preflightRequestRef = useRef(0);
  const onChangedRef = useRef(onChanged);
  const toastRef = useRef(toast);

  useEffect(() => {
    onChangedRef.current = onChanged;
    toastRef.current = toast;
  }, [onChanged, toast]);

  useEffect(
    () => () => {
      preflightRequestRef.current += 1;
    },
    [],
  );

  const runSingleFlight = useCallback(async (actionKey, operation) => {
    if (activeActionRef.current) return ACTION_IN_PROGRESS;

    activeActionRef.current = actionKey;
    setActiveAction(actionKey);
    try {
      const response = await operation();
      if (!response || typeof response.success !== "boolean") {
        return normalizeClientFailure(null, "Phản hồi thao tác điểm danh không hợp lệ");
      }
      return response;
    } catch (error) {
      return normalizeClientFailure(error);
    } finally {
      activeActionRef.current = "";
      setActiveAction("");
    }
  }, []);

  const refreshView = useCallback(async () => {
    try {
      await onChangedRef.current?.();
      return null;
    } catch (error) {
      const failure = normalizeClientFailure(error, "Không thể tải lại dữ liệu sau thao tác");
      toastRef.current?.error(failure.error.message);
      return failure;
    }
  }, []);

  const runAction = useCallback(
    async ({
      key,
      operation,
      successMessage,
      errorMessage,
      refresh = true,
      refreshOnFailure = false,
      issueContext = null,
    }) => {
      const response = await runSingleFlight(key, operation);
      if (response.ignored) return response;

      if (!response.success) {
        const typedIssue = getAttendanceReadinessError(response);
        setReadinessIssue(
          typedIssue
            ? {
                ...issueContext,
                error: typedIssue.error,
                readiness: typedIssue.readiness,
              }
            : null,
        );
        toastRef.current?.error(response.error?.message || errorMessage);
        if (refreshOnFailure) await refreshView();
        return response;
      }

      setReadinessIssue(null);
      if (successMessage) toastRef.current?.success(successMessage);
      if (refresh) await refreshView();
      return response;
    },
    [refreshView, runSingleFlight],
  );

  const loadPreflight = useCallback(
    async (period) => {
      if (!period?.id) return;
      const requestId = preflightRequestRef.current + 1;
      preflightRequestRef.current = requestId;
      setPreflight(null);
      setPreflightError("");
      setLockActionError("");

      const response = await runSingleFlight(`preflight:${period.id}`, () =>
        attendancePeriodsService.getLockPreflight(period.id),
      );
      if (preflightRequestRef.current !== requestId || response.ignored) return;

      if (response.success) {
        const readiness = normalizeAttendanceReadiness(response.data);
        if (readiness) {
          setPreflight(readiness);
        } else {
          setPreflightError("Phản hồi kiểm tra điều kiện chốt không hợp lệ");
        }
      } else {
        setPreflightError(
          response.error?.message || "Không thể kiểm tra điều kiện chốt điểm danh",
        );
      }
    },
    [runSingleFlight],
  );

  const openLockPreflight = useCallback(
    (period) => {
      if (!period?.id || activeActionRef.current) return;
      setLockTarget(period);
      void loadPreflight(period);
    },
    [loadPreflight],
  );

  const closeLockPreflight = useCallback(() => {
    if (
      activeActionRef.current?.startsWith("lock:") ||
      activeActionRef.current?.startsWith("reopen:")
    ) {
      return;
    }
    preflightRequestRef.current += 1;
    setLockTarget(null);
    setPreflight(null);
    setPreflightError("");
    setLockActionError("");
  }, []);

  const confirmLock = useCallback(async () => {
    if (!lockTarget?.id || !preflight?.ready_to_lock) return false;
    setLockActionError("");
    const response = await runSingleFlight(`lock:${lockTarget.id}`, () =>
      attendancePeriodsService.lock(lockTarget.id),
    );
    if (response.ignored) return false;
    if (!response.success) {
      const typedIssue = getAttendanceReadinessError(response);
      if (typedIssue) {
        setPreflight(typedIssue.readiness);
        setLockActionError(
          "Dữ liệu đã thay đổi sau lần kiểm tra. Hãy xử lý các vấn đề mới trước khi chốt.",
        );
      } else {
        setLockActionError(response.error?.message || "Không thể chốt điểm danh");
      }
      return false;
    }

    toastRef.current?.success(
      `Đã chốt điểm danh ${lockTarget.period_month}. Học phí đã sẵn sàng để thu.`,
    );
    setLockTarget(null);
    setPreflight(null);
    setReadinessIssue(null);
    await refreshView();
    return true;
  }, [lockTarget, preflight, refreshView, runSingleFlight]);

  const reopenForCorrection = useCallback(
    async (reason) => {
      if (!lockTarget?.id) return false;
      setLockActionError("");
      const response = await runSingleFlight(`reopen:${lockTarget.id}`, () =>
        attendancePeriodsService.reopenForCorrection(lockTarget.id, reason),
      );
      if (response.ignored) return false;
      if (!response.success) {
        setLockActionError(
          response.error?.message || "Không thể mở lại kỳ điểm danh để chỉnh sửa",
        );
        return false;
      }

      toastRef.current?.success(
        `Đã mở lại điểm danh ${lockTarget.period_month} để chỉnh sửa.`,
      );
      setLockTarget(null);
      setPreflight(null);
      setReadinessIssue(null);
      await refreshView();
      return true;
    },
    [lockTarget, refreshView, runSingleFlight],
  );

  const reopenPeriodForCorrection = useCallback(
    async (period, reason) => {
      if (!period?.id) {
        const failure = normalizeClientFailure(null, "Không xác định được kỳ điểm danh cần mở lại");
        toastRef.current?.error(failure.error.message);
        return failure;
      }

      return runAction({
        key: `reopen:${period.id}`,
        operation: () => attendancePeriodsService.reopenForCorrection(period.id, reason),
        successMessage: `Đã mở lại điểm danh ${period.period_month} để chỉnh sửa.`,
        errorMessage: "Không thể mở lại điểm danh",
      });
    },
    [runAction],
  );

  const retryLockPreflight = useCallback(
    () => loadPreflight(lockTarget),
    [loadPreflight, lockTarget],
  );

  return {
    activeAction,
    isBusy: Boolean(activeAction),
    runAction,
    openLockPreflight,
    closeLockPreflight,
    retryLockPreflight,
    confirmLock,
    reopenForCorrection,
    reopenPeriodForCorrection,
    readinessIssue,
    dismissReadinessIssue: () => setReadinessIssue(null),
    lockDialog: {
      target: lockTarget,
      preflight,
      loading: activeAction === `preflight:${lockTarget?.id}`,
      mutationBusy:
        activeAction === `lock:${lockTarget?.id}` ||
        activeAction === `reopen:${lockTarget?.id}`,
      error: preflightError,
      actionError: lockActionError,
    },
  };
}
