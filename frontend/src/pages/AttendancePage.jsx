import { useState, useEffect, useMemo, useRef } from "react";
import { motion as Motion } from "framer-motion";
import {
  classesService,
  attendanceService,
  attendancePeriodsService,
} from "../services/api";
import { useToast } from "../components/ui/Toast";
import { useAuth } from "../context/AuthContext";
import ActionProgressButton from "../components/ui/ActionProgressButton";
import LongOperationStatus from "../components/ui/LongOperationStatus";
import SelectField from "../components/ui/SelectField";
import {
  countMonthBoundedWeeklySessions,
  countScheduleDaysInMonth,
  normalizeScheduleDays,
  toDateKey,
  toMonthKey,
} from "../utils/dateKeys";

// VI: Điểm danh kiểu SAP Timesheet - Hiển thị 3 tháng, chọn tuần để điểm danh

const PERIOD_STATUS = {
  open: { label: "Đang mở", color: "bg-green-100 text-green-700", icon: "🟢" },
  submitted: {
    label: "Đã nộp",
    color: "bg-yellow-100 text-yellow-700",
    icon: "🟡",
  },
  approved: {
    label: "Đã duyệt",
    color: "bg-blue-100 text-blue-700",
    icon: "🔵",
  },
  locked: { label: "Đã chốt", color: "bg-gray-100 text-gray-700", icon: "🔒" },
};

const STATUS_CYCLE = ["present", "absent_with_fee", "absent_no_fee", "holiday"];
const STATUS_ICONS = {
  present: "✅",
  absent_with_fee: "⚠️",
  absent_no_fee: "❌",
  holiday: "🎉",
  empty: "−",
};
const STATUS_LABELS = {
  present: "Có mặt",
  absent_with_fee: "Nghỉ có phép",
  absent_no_fee: "Nghỉ không phép",
  holiday: "Ngày lễ",
};

const MAKE_UP_REASON = "Hoc bu ngoai lich";
const buildWeekKey = (classId, week) =>
  classId && week ? `${classId}:${toDateKey(week.start)}:${toDateKey(week.end)}` : "";

function getCalendarRowWeekRange(weekStart, weekEnd) {
  const start = new Date(weekStart);
  const end = new Date(weekEnd || weekStart);
  return { start, end };
}

// Calendar Legend colors matching SAP style
const LEGEND = [
  { status: "complete", label: "Đã điểm danh", color: "bg-green-500" },
  { status: "incomplete", label: "Chưa hoàn thành", color: "bg-yellow-500" },
  { status: "empty", label: "Chưa điểm danh", color: "bg-gray-200" },
  { status: "locked", label: "Đã chốt", color: "bg-blue-500" },
  { status: "holiday", label: "Ngày lễ", color: "bg-red-500" },
  { status: "today", label: "Hôm nay", color: "border-2 border-primary-600" },
];

export default function AttendancePage() {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedWeek, setSelectedWeek] = useState(null); // { start: Date, end: Date, anchor: Date }
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [calendarAttendance, setCalendarAttendance] = useState({}); // { "2026-01-15": { present: 5, holiday: 1, ... } }
  const [periods, setPeriods] = useState({});
  const [classSchedule, setClassSchedule] = useState(null);
  const [classListLoading, setClassListLoading] = useState(false);
  const [classListError, setClassListError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [weekLoading, setWeekLoading] = useState(false);
  const [weekError, setWeekError] = useState(null);
  const [loadedWeekKey, setLoadedWeekKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [reopeningMonth, setReopeningMonth] = useState(null);
  const classDataRequestRef = useRef(0);
  const classListRequestRef = useRef(0);
  const weekAttendanceRequestRef = useRef(0);
  const toast = useToast();
  const { isAdmin } = useAuth();

  // Get today and calculate the visible 3-month window.
  const today = useMemo(() => new Date(), []);
  const [visibleMonthAnchor, setVisibleMonthAnchor] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const baseMonth = visibleMonthAnchor;
  const visibleMonthKey = useMemo(() => toMonthKey(baseMonth), [baseMonth]);

  // Generate 3 months: previous, current, next
  const threeMonths = useMemo(() => {
    return [-1, 0, 1].map((offset) => {
      const d = new Date(
        baseMonth.getFullYear(),
        baseMonth.getMonth() + offset,
        1,
      );
      return {
        year: d.getFullYear(),
        month: d.getMonth(),
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      };
    });
  }, [baseMonth]);

  // Generate calendar grids for each month
  const generateMonthCalendar = (year, month, scheduleDays = []) => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startWeekday = firstDay.getDay(); // 0 = Sunday

    const weeks = [];
    let currentWeek = [];

    // Fill empty days at start
    for (let i = 0; i < startWeekday; i++) {
      currentWeek.push(null);
    }

    // Fill days
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const isScheduleDay =
        scheduleDays.length === 0 || scheduleDays.includes(date.getDay());
      currentWeek.push({
        day,
        date,
        dateStr: toDateKey(date),
        isScheduleDay,
        isToday: date.toDateString() === today.toDateString(),
        weekday: date.getDay(),
      });

      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }

    // Fill empty days at end
    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push(null);
      }
      weeks.push(currentWeek);
    }

    return weeks;
  };

  // Get schedule days as numbers
  const scheduleDayNumbers = useMemo(
    () => normalizeScheduleDays(classSchedule?.schedule_days),
    [classSchedule],
  );

  const activeFeeMonth = selectedWeek
    ? selectedWeek.anchor || selectedWeek.start
    : new Date(baseMonth.getFullYear(), baseMonth.getMonth(), 1);

  const plannedSessionsInMonth = useMemo(() => {
    if (!classSchedule) return 0;
    const year = activeFeeMonth.getFullYear();
    const month = activeFeeMonth.getMonth();
    if (scheduleDayNumbers.length) {
      return countScheduleDaysInMonth(year, month, scheduleDayNumbers);
    }
    const sessions = Number(classSchedule.sessions_per_week || 0);
    if (sessions > 0) return countMonthBoundedWeeklySessions(year, month, sessions);
    return 0;
  }, [activeFeeMonth, classSchedule, scheduleDayNumbers]);

  // Calculate fee per session from monthly tuition and the real month calendar.
  const feePerSession = useMemo(() => {
    if (!classSchedule?.fee_per_day) return 0;
    if (!plannedSessionsInMonth) return classSchedule.fee_per_day;
    return Math.round(classSchedule.fee_per_day / plannedSessionsInMonth);
  }, [classSchedule, plannedSessionsInMonth]);

  // Get sessions_per_week limit for the class (default to 7 if not set)
  const sessionsPerWeek = useMemo(() => {
    return classSchedule?.sessions_per_week || 7;
  }, [classSchedule]);

  // Fixed-weekday classes expose off-schedule weekdays as make-up candidates.
  const weekDates = useMemo(() => {
    if (!selectedWeek) return [];
    const dates = [];
    const current = new Date(selectedWeek.start);
    const hasScheduleDays = scheduleDayNumbers.length > 0;

    while (current <= selectedWeek.end) {
      const dayOfWeek = current.getDay();
      const isWeekday = dayOfWeek !== 0;
      const isScheduleDay =
        !hasScheduleDays || scheduleDayNumbers.includes(dayOfWeek);
      const shouldInclude = isWeekday;

      if (shouldInclude) {
        dates.push({
          date: new Date(current),
          dateStr: toDateKey(current),
          dayOfWeek: current.toLocaleDateString("vi-VN", { weekday: "short" }),
          dayNum: current.getDate(),
          isScheduleDay,
          isMakeUpDate: hasScheduleDays && !isScheduleDay,
        });
      }
      current.setDate(current.getDate() + 1);
    }

    return dates;
  }, [selectedWeek, scheduleDayNumbers]);

  const selectedWeekMonthKeys = useMemo(
    () => [...new Set(weekDates.map(({ dateStr }) => dateStr.slice(0, 7)))],
    [weekDates],
  );

  const selectedWeekKey = useMemo(
    () => buildWeekKey(selectedClass, selectedWeek),
    [selectedClass, selectedWeek],
  );

  const isWeekReady = Boolean(
    selectedWeek && selectedWeekKey && loadedWeekKey === selectedWeekKey && !weekLoading && !weekError,
  );

  const nonEditableSelectedMonth = useMemo(
    () => selectedWeekMonthKeys.find((monthKey) => {
      const status = periods[monthKey]?.status;
      return status && status !== "open";
    }),
    [periods, selectedWeekMonthKeys],
  );

  const selectedWeekPeriodLabels = useMemo(
    () =>
      selectedWeekMonthKeys.map((monthKey) => {
        const status = periods[monthKey]?.status || "open";
        return `${monthKey}: ${PERIOD_STATUS[status]?.label || "Đang mở"}`;
      }),
    [periods, selectedWeekMonthKeys],
  );

  const weekSessionLimit = useMemo(() => {
    if (!selectedWeek || !classSchedule) return sessionsPerWeek;
    const sessions = Number(classSchedule.sessions_per_week || 0);
    const eligibleDatesInMonth = weekDates.filter(
      ({ date, isScheduleDay }) =>
        date.getFullYear() === activeFeeMonth.getFullYear() &&
        date.getMonth() === activeFeeMonth.getMonth() &&
        (!scheduleDayNumbers.length || isScheduleDay)
    ).length;
    if (scheduleDayNumbers.length) return eligibleDatesInMonth;
    if (sessions > 0) return Math.max(1, Math.min(sessions, eligibleDatesInMonth || sessions));
    return sessionsPerWeek;
  }, [activeFeeMonth, classSchedule, scheduleDayNumbers, selectedWeek, sessionsPerWeek, weekDates]);

  // Calculate fee summary per student for selected week
  const feeSummary = useMemo(() => {
    const summary = {};
    students.forEach((student) => {
      const studentAtt = attendance[student.id] || {};
      let presentDays = 0;
      let absentWithFee = 0;
      let absentNoFee = 0;
      let holidayDays = 0;

      weekDates.forEach(({ dateStr }) => {
        const status = studentAtt[dateStr];
        if (status === "present") presentDays++;
        else if (status === "absent_with_fee") absentWithFee++;
        else if (status === "absent_no_fee") absentNoFee++;
        else if (status === "holiday") holidayDays++;
      });

      // Holiday doesn't count towards fees
      const totalDays = presentDays + absentWithFee;
      const fee = totalDays * feePerSession;
      // Check if exceeding the limit
      const isExceeding = totalDays > weekSessionLimit;
      const extraSessions = isExceeding ? totalDays - weekSessionLimit : 0;

      summary[student.id] = {
        presentDays,
        absentWithFee,
        absentNoFee,
        holidayDays,
        totalDays,
        sessionsLimit: weekSessionLimit,
        fee,
        isExceeding,
        extraSessions,
      };
    });
    return summary;
  }, [students, attendance, weekDates, feePerSession, weekSessionLimit]);

  const totalFee = useMemo(() => {
    return Object.values(feeSummary).reduce((sum, s) => sum + s.fee, 0);
  }, [feeSummary]);

  useEffect(() => {
    loadClasses();
  }, []);

  useEffect(() => {
    if (!selectedClass) {
      classDataRequestRef.current += 1;
      weekAttendanceRequestRef.current += 1;
      setSelectedWeek(null);
      setStudents([]);
      setAttendance({});
      setCalendarAttendance({});
      setPeriods({});
      setClassSchedule(null);
      setLoading(false);
      setLoadError(null);
      setWeekLoading(false);
      setWeekError(null);
      setLoadedWeekKey("");
      return;
    }

    setSelectedWeek(null);
    setAttendance({});
    setWeekError(null);
    setLoadedWeekKey("");
    loadClassData(selectedClass, threeMonths);
  }, [selectedClass, visibleMonthKey]);

  useEffect(() => {
    if (selectedClass && selectedWeek) {
      loadWeekAttendance(selectedClass, selectedWeek, students);
    }
  }, [selectedClass, selectedWeek]);

  const loadClasses = async () => {
    const requestId = classListRequestRef.current + 1;
    classListRequestRef.current = requestId;
    setClassListLoading(true);
    setClassListError(null);
    try {
      const response = await classesService.getAll();
      if (classListRequestRef.current !== requestId) return;
      if (response.success) {
        setClasses(response.data.classes || []);
      } else {
        setClassListError(response.error?.message || "Không thể tải danh sách lớp");
      }
    } catch (error) {
      if (classListRequestRef.current === requestId) {
        setClassListError(error?.message || "Không thể tải danh sách lớp");
      }
    } finally {
      if (classListRequestRef.current === requestId) {
        setClassListLoading(false);
      }
    }
  };

  const loadClassData = async (classId = selectedClass, monthsWindow = threeMonths) => {
    if (!classId) return;

    const requestId = classDataRequestRef.current + 1;
    classDataRequestRef.current = requestId;
    setLoading(true);
    setLoadError(null);

    try {
      const token = localStorage.getItem("token");
      const classPromise = classesService.getById(classId);
      const periodsPromise = Promise.all(
        monthsWindow.map(async (m) => ({
          month: m.key,
          response: await attendancePeriodsService.getAll({
            class_id: classId,
            month: m.key,
          }),
        })),
      );
      const calendarPromise = Promise.all(
        monthsWindow.map(async (m) => {
          try {
            const res = await fetch(
              `/api/attendance/month?class_id=${encodeURIComponent(classId)}&month=${m.key}`,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              },
            );
            if (!res.ok) return [];
            const data = await res.json();
            return data.success ? data.data.attendance || [] : [];
          } catch (e) {
            console.error(
              "Error loading calendar attendance for month",
              m.key,
              e,
            );
            return [];
          }
        }),
      );

      const [classRes, periodResults, calendarResults] = await Promise.all([
        classPromise,
        periodsPromise,
        calendarPromise,
      ]);

      if (classDataRequestRef.current !== requestId) return;

      if (!classRes.success) {
        setClassSchedule(null);
        setStudents([]);
        setPeriods({});
        setCalendarAttendance({});
        setLoadError(classRes.error?.message || "Không thể tải dữ liệu điểm danh của lớp");
        return;
      }

      setClassSchedule(classRes.data);
      setStudents(classRes.data.students || []);

      const periodsMap = {};
      periodResults.forEach(({ month, response: periodRes }) => {
        if (periodRes.success && periodRes.data.periods?.length > 0) {
          periodsMap[month] = periodRes.data.periods[0];
        }
      });
      setPeriods(periodsMap);

      const calendarData = {};
      calendarResults.flat().forEach((a) => {
        const dateKey = a.attendance_date;
        if (!calendarData[dateKey]) {
          calendarData[dateKey] = {
            present: 0,
            absent_with_fee: 0,
            absent_no_fee: 0,
            holiday: 0,
            total: 0,
          };
        }
        calendarData[dateKey][a.status] =
          (calendarData[dateKey][a.status] || 0) + 1;
        calendarData[dateKey].total++;
      });
      setCalendarAttendance(calendarData);
    } catch (error) {
      if (classDataRequestRef.current === requestId) {
        setLoadError(error?.message || "Không thể tải dữ liệu điểm danh");
      }
    } finally {
      if (classDataRequestRef.current === requestId) {
        setLoading(false);
      }
    }
  };

  const loadWeekAttendance = async (
    classId = selectedClass,
    week = selectedWeek,
    studentList = students,
  ) => {
    if (!classId || !week) return;

    const requestId = weekAttendanceRequestRef.current + 1;
    weekAttendanceRequestRef.current = requestId;
    const nextWeekKey = buildWeekKey(classId, week);
    setWeekLoading(true);
    setWeekError(null);
    setLoadedWeekKey("");

    const allAttendance = {};
    studentList.forEach((s) => {
      allAttendance[s.id] = {};
    });

    // Get months for the week (could span 2 months)
    const startMonth = toMonthKey(week.start);
    const endMonth = toMonthKey(week.end);
    const months = [startMonth];
    if (endMonth !== startMonth) {
      months.push(endMonth);
    }

    const token = localStorage.getItem("token");
    try {
      const monthResults = await Promise.all(
        months.map(async (month) => {
          try {
            const res = await fetch(
              `/api/attendance/month?class_id=${encodeURIComponent(classId)}&month=${month}`,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              },
            );
            if (!res.ok) {
              return { month, error: `HTTP ${res.status}`, attendance: [] };
            }
            const data = await res.json();
            if (!data.success) {
              return {
                month,
                error: data.error?.message || "API khong tra ve du lieu diem danh",
                attendance: [],
              };
            }
            return { month, error: null, attendance: data.data.attendance || [] };
          } catch (e) {
            console.error("Error loading attendance for month", month, e);
            return { month, error: e?.message || "Network error", attendance: [] };
          }
        }),
      );

      if (weekAttendanceRequestRef.current !== requestId) return;

      const failedMonths = monthResults.filter((result) => result.error);
      if (failedMonths.length) {
        setWeekError(
          `Không thể tải điểm danh tháng ${failedMonths
            .map((item) => item.month)
            .join(", ")}. Vui lòng thử lại trước khi lưu.`,
        );
        return;
      }

      monthResults.flatMap((result) => result.attendance).forEach((a) => {
        if (!allAttendance[a.student_id]) {
          allAttendance[a.student_id] = {};
        }
        allAttendance[a.student_id][a.attendance_date] = a.status;
      });

      setAttendance(allAttendance);
      setLoadedWeekKey(nextWeekKey);
    } finally {
      if (weekAttendanceRequestRef.current === requestId) {
        setWeekLoading(false);
      }
    }
  };

  const handleWeekClick = (weekStart, weekEnd = weekStart) => {
    const rowRange = getCalendarRowWeekRange(weekStart, weekEnd);
    setAttendance({});
    setWeekError(null);
    setLoadedWeekKey("");
    setSelectedWeek({
      ...rowRange,
      anchor: rowRange.start,
    });
  };

  const handleCellClick = (studentId, dateStr) => {
    if (!isWeekReady) {
      toast.error("Vui long doi tai xong tuan diem danh truoc khi sua");
      return;
    }
    const monthKey = dateStr.slice(0, 7);
    const period = periods[monthKey];
    if (period?.status && period.status !== "open") {
      toast.error("Chỉ có thể sửa kỳ điểm danh đang mở");
      return;
    }

    const currentStatus = attendance[studentId]?.[dateStr] || "empty";
    const currentIdx = STATUS_CYCLE.indexOf(currentStatus);
    const nextStatus =
      currentIdx === -1
        ? STATUS_CYCLE[0]
        : currentIdx === STATUS_CYCLE.length - 1
          ? null
          : STATUS_CYCLE[currentIdx + 1];

    setAttendance((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [dateStr]: nextStatus,
      },
    }));
  };

  const handleSave = async () => {
    if (!selectedWeek) {
      toast.error("Vui lòng chọn tuần để lưu");
      return;
    }

    if (!isWeekReady) {
      toast.error("Vui long tai xong du lieu tuan truoc khi luu");
      return;
    }

    if (nonEditableSelectedMonth) {
      toast.error("Chỉ có thể sửa kỳ điểm danh đang mở");
      return;
    }

    setSaving(true);

    try {
      for (const monthKey of selectedWeekMonthKeys) {
        if (periods[monthKey]) continue;
        const createRes = await attendancePeriodsService.create({
          class_id: selectedClass,
          month: monthKey,
        });
        if (!createRes.success) {
          toast.error(createRes.error?.message || "Không thể tạo kỳ điểm danh");
          return;
        }
        if (
          createRes.data?.period?.status &&
          createRes.data.period.status !== "open"
        ) {
          toast.error("Chỉ có thể sửa kỳ điểm danh đang mở");
          return;
        }
      }

      const records = [];
      const allDates = weekDates.map((w) => w.dateStr); // All dates in the week for deletion

      students.forEach((student) => {
      const studentAtt = attendance[student.id] || {};
      weekDates.forEach(({ dateStr, isMakeUpDate }) => {
        const status = studentAtt[dateStr];
        if (status && STATUS_CYCLE.includes(status)) {
          records.push({
            student_id: student.id,
            class_id: selectedClass,
            attendance_date: dateStr,
            status,
            is_make_up: Boolean(isMakeUpDate),
            make_up_reason: isMakeUpDate ? MAKE_UP_REASON : null,
          });
        }
      });
    });

    // Pass class_id and all dates so backend can delete the full range
    const response = await attendanceService.bulkCreate(
      records,
      selectedClass,
      allDates,
    );

    if (response.success) {
      toast.success(`Đã lưu ${records.length} bản ghi điểm danh`);
      await loadClassData();
      await loadWeekAttendance();
    } else {
      toast.error(response.error?.message || "Không thể lưu điểm danh");
    }
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (monthKey) => {
    const period = periods[monthKey];
    if (!period) {
      // Create period first
      const createRes = await attendancePeriodsService.create({
        class_id: selectedClass,
        month: monthKey,
      });
      if (!createRes.success) {
        toast.error("Không thể tạo kỳ điểm danh");
        return;
      }
      // Submit the newly created period
      const submitRes = await attendancePeriodsService.submit(
        createRes.data.period.id,
      );
      if (submitRes.success) {
        toast.success("Đã nộp điểm danh tháng " + monthKey);
        loadClassData();
      } else {
        toast.error(submitRes.error?.message || "Lỗi nộp điểm danh");
      }
      return;
    }

    const res = await attendancePeriodsService.submit(period.id);
    if (res.success) {
      toast.success("Đã nộp điểm danh tháng " + monthKey);
      loadClassData();
    } else {
      toast.error(res.error?.message || "Lỗi nộp điểm danh");
    }
  };

  const handleApprove = async (monthKey) => {
    const period = periods[monthKey];
    if (!period) {
      toast.error("Chưa có dữ liệu điểm danh cho tháng này");
      return;
    }
    const res = await attendancePeriodsService.approve(period.id);
    if (res.success) {
      toast.success("Đã duyệt điểm danh tháng " + monthKey);
      loadClassData();
    } else {
      toast.error(res.error?.message || "Lỗi duyệt điểm danh");
    }
  };

  const handleLock = async (monthKey) => {
    const period = periods[monthKey];
    if (!period) {
      toast.error("Chưa có dữ liệu điểm danh cho tháng này");
      return;
    }
    const res = await attendancePeriodsService.lock(period.id);
    if (res.success) {
      toast.success(
        "🔒 Đã chốt điểm danh tháng " +
          monthKey +
          ". Học phí đã sẵn sàng để thu!",
      );
      loadClassData();
    } else {
      toast.error(res.error?.message || "Lỗi chốt điểm danh");
    }
  };

  const handleUnlock = async (monthKey) => {
    const period = periods[monthKey];
    if (!period) return;

    const reason = window.prompt(
      `Nhập lý do mở lại điểm danh tháng ${monthKey}:`,
    );
    if (reason === null) return;
    if (!reason.trim()) {
      toast.error("Vui lòng nhập lý do mở lại điểm danh");
      return;
    }

    setReopeningMonth(monthKey);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `/api/attendance-periods/${period.id}?action=unlock`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ reason: reason.trim() }),
        },
      );
      const res = await response.json();
      if (res.success) {
        toast.success("Đã mở lại điểm danh tháng " + monthKey + " để chỉnh sửa");
        await loadClassData();
      } else {
        toast.error(res.error?.message || "Không thể mở lại điểm danh");
      }
    } catch (error) {
      toast.error(error?.message || "Không thể mở lại điểm danh");
    } finally {
      setReopeningMonth(null);
    }
  };

  const shiftVisibleMonths = (delta) => {
    setVisibleMonthAnchor((current) => {
      const next = new Date(current);
      next.setMonth(next.getMonth() + delta);
      return new Date(next.getFullYear(), next.getMonth(), 1);
    });
  };

  const resetVisibleMonths = () => {
    setVisibleMonthAnchor(new Date(today.getFullYear(), today.getMonth(), 1));
  };

  // Month header with Vietnamese name
  const formatMonthName = (year, month) => {
    return new Date(year, month).toLocaleDateString("vi-VN", {
      month: "long",
      year: "numeric",
    });
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  const initialClassLoading = loading && selectedClass && students.length === 0;
  const isCalendarRefreshing = loading && selectedClass && students.length > 0;
  const classFilterState = classListError
    ? "error"
    : classListLoading
      ? classes.length
        ? "refreshing"
        : "initial-loading"
      : classes.length
        ? "ready"
        : "empty";

  return (
    <Motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      {/* Header */}
      <Motion.div variants={itemVariants} className="relative overflow-hidden rounded-3xl border border-white/70 bg-gradient-to-br from-violet-950 via-indigo-950 to-sky-900 p-6 shadow-2xl shadow-indigo-950/20">
        <div className="absolute -left-24 -top-24 h-64 w-64 rounded-full bg-fuchsia-400/20 blur-3xl"></div>
        <div className="absolute -bottom-24 right-1/4 h-64 w-64 rounded-full bg-cyan-300/20 blur-3xl"></div>
        <div className="relative">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-sm font-semibold text-indigo-100 backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-cyan-300 shadow-lg shadow-cyan-300/50"></span>
            SAP Timesheet Style
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
            Điểm danh
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-indigo-100/85 sm:text-base">
            Quản lý điểm danh học viên theo tuần, tính toán học phí theo lịch học thực tế.
          </p>
        </div>
      </Motion.div>

      {/* Class Selector */}
      <Motion.div variants={itemVariants} className="rounded-3xl border border-slate-200/70 bg-white/95 shadow-sm overflow-hidden">
        <div className="card-body">
          <div className="flex items-center gap-4">
            <div className="flex-1 max-w-sm">
              <SelectField
                label="Chọn lớp"
                aria-label="Chon lop"
                value={selectedClass}
                onChange={(e) => {
                  setSelectedClass(e.target.value);
                  setSelectedWeek(null);
                }}
                state={classFilterState}
                error={classListError}
                onRetry={loadClasses}
                data-testid="attendance-class-field"
                placeholder={{ value: "", label: "-- Chọn lớp --" }}
                options={classes.map((classItem) => ({
                  value: classItem.id,
                  label: classItem.class_name,
                }))}
                statusLabels={{
                  "initial-loading": "Đang tải danh sách lớp...",
                  refreshing: "Đang cập nhật danh sách lớp...",
                  empty: "Chưa có lớp học nào.",
                  error: "Không thể tải danh sách lớp.",
                }}
              />
            </div>
            {classSchedule && (
              <div className="text-sm text-gray-600">
                <p>
                  <strong>Học phí tháng:</strong>{" "}
                  {new Intl.NumberFormat("vi-VN").format(
                    classSchedule.fee_per_day,
                  )}
                  đ
                </p>
                <p>
                  <strong>Học phí/buổi:</strong>{" "}
                  {new Intl.NumberFormat("vi-VN").format(feePerSession)}đ
                  {plannedSessionsInMonth ? (
                    <span className="text-gray-400">
                      {" "}
                      / {plannedSessionsInMonth} buổi trong tháng
                    </span>
                  ) : null}
                </p>
              </div>
            )}
          </div>
        </div>
      </Motion.div>

      {initialClassLoading ? (
        <Motion.div variants={itemVariants} className="rounded-3xl border border-slate-200/70 bg-white/95 shadow-sm overflow-hidden">
          <div className="card-body text-center py-12">
            <div className="spinner w-8 h-8 mx-auto mb-4"></div>
            <p className="text-gray-500">Đang tải...</p>
          </div>
        </Motion.div>
      ) : loadError && selectedClass && students.length === 0 ? (
        <Motion.div variants={itemVariants} className="rounded-3xl border border-rose-100 bg-rose-50 p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-black text-rose-800">Không thể tải dữ liệu điểm danh</p>
              <p className="mt-1 text-sm font-semibold text-rose-700">{loadError}</p>
            </div>
            <button type="button" onClick={() => loadClassData()} className="btn-secondary">
              Thử lại
            </button>
          </div>
        </Motion.div>
      ) : !selectedClass ? (
        <Motion.div variants={itemVariants} className="rounded-3xl border border-slate-200/70 bg-white/95 shadow-sm overflow-hidden">
          <div className="card-body text-center py-12 text-gray-500">
            Vui lòng chọn lớp học để xem lịch điểm danh
          </div>
        </Motion.div>
      ) : (
        <>
          {isCalendarRefreshing && (
            <LongOperationStatus
              title="Đang cập nhật lịch điểm danh"
              message="He thong dang tai lai hoc vien, trang thai ky va dau cham diem danh. Cac thao tac tuan se tam khoa den khi dong bo xong."
              steps={["Tai hoc vien", "Tai ky diem danh", "Dong bo lich thang"]}
              activeStep={1}
            />
          )}

          {/* 3-Month Calendar Grid - SAP Style */}
          <Motion.div variants={itemVariants} className="rounded-3xl border border-slate-200/70 bg-white/95 shadow-sm overflow-hidden">
            <div className="card-body">
              <div className="flex flex-col gap-3 mb-4 xl:flex-row xl:items-start xl:justify-between">
                <h3 className="font-semibold text-gray-900">
                  📅 Lịch điểm danh - Chọn tuần
                </h3>
                <div className="flex flex-wrap items-center gap-2">
                  <button type="button" onClick={() => shiftVisibleMonths(-3)} className="rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-xs font-bold text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:border-primary-200 hover:text-primary-700">
                    ← 3 tháng
                  </button>
                  <button type="button" onClick={() => shiftVisibleMonths(-1)} className="rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-xs font-bold text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:border-primary-200 hover:text-primary-700">
                    Tháng trước
                  </button>
                  <button type="button" onClick={resetVisibleMonths} className="rounded-xl bg-primary-600 px-3 py-2 text-xs font-bold text-white shadow-lg shadow-primary-600/20 transition hover:-translate-y-0.5 hover:bg-primary-700">
                    Hôm nay
                  </button>
                  <button type="button" onClick={() => shiftVisibleMonths(1)} className="rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-xs font-bold text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:border-primary-200 hover:text-primary-700">
                    Tháng sau
                  </button>
                  <button type="button" onClick={() => shiftVisibleMonths(3)} className="rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-xs font-bold text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:border-primary-200 hover:text-primary-700">
                    3 tháng →
                  </button>
                </div>
                <div className="flex flex-wrap gap-3 text-xs xl:max-w-md xl:justify-end">
                  {LEGEND.map((l) => (
                    <div key={l.status} className="flex items-center gap-1">
                      <div className={`w-4 h-4 rounded ${l.color}`}></div>
                      <span>{l.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 xl:grid-cols-3 xl:gap-6">
                {threeMonths.map(({ year, month, key }) => {
                  const calendar = generateMonthCalendar(
                    year,
                    month,
                    scheduleDayNumbers,
                  );
                  const period = periods[key];

                  return (
                    <div key={key} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-gray-800">
                          {formatMonthName(year, month)}
                        </h4>
                        {period && (
                          <span
                            className={`px-2 py-0.5 text-xs rounded-full ${
                              PERIOD_STATUS[period.status]?.color
                            }`}
                          >
                            {PERIOD_STATUS[period.status]?.label}
                          </span>
                        )}
                      </div>
                      <table className="w-full text-center text-sm">
                        <thead>
                          <tr className="text-gray-500 text-xs">
                            <th className="py-1">CN</th>
                            <th className="py-1">T2</th>
                            <th className="py-1">T3</th>
                            <th className="py-1">T4</th>
                            <th className="py-1">T5</th>
                            <th className="py-1">T6</th>
                            <th className="py-1">T7</th>
                          </tr>
                        </thead>
                        <tbody>
                          {calendar.map((week, wi) => {
                            const weekStart = week.find((d) => d)?.date;
                            const weekEnd = [...week]
                              .reverse()
                              .find((d) => d)?.date;
                            const weekRange = weekStart && weekEnd
                              ? getCalendarRowWeekRange(weekStart, weekEnd)
                              : null;
                            const isSelected =
                              selectedWeek &&
                              weekRange?.start.toDateString() ===
                                selectedWeek.start.toDateString();

                            return (
                              <tr
                                key={wi}
                                onClick={() =>
                                  weekStart &&
                                  weekEnd &&
                                  handleWeekClick(weekStart, weekEnd)
                                }
                                className={`cursor-pointer hover:bg-gray-50 transition-colors ${
                                  isSelected ? "bg-primary-100" : ""
                                }`}
                              >
                                {week.map((d, di) => {
                                  // Get attendance data for this date
                                  const dateAtt = d
                                    ? calendarAttendance[d.dateStr]
                                    : null;
                                  const hasAttendance =
                                    dateAtt && dateAtt.total > 0;
                                  const hasHoliday =
                                    dateAtt && dateAtt.holiday > 0;

                                  return (
                                    <td key={di} className="py-1">
                                      {d ? (
                                        <div className="relative">
                                          <div
                                            className={`w-7 h-7 mx-auto rounded flex items-center justify-center text-xs
                                          ${
                                            d.isToday
                                              ? "border-2 border-primary-600 font-bold"
                                              : ""
                                          }
                                          ${
                                            d.isScheduleDay
                                              ? "bg-blue-50 text-blue-700"
                                              : "text-gray-400"
                                          }
                                          ${isSelected ? "bg-primary-200" : ""}
                                        `}
                                          >
                                            {d.day}
                                          </div>
                                          {/* Attendance marker dot */}
                                          {hasAttendance && (
                                            <div
                                              className={`absolute -bottom-0.5 left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 rounded-full ${hasHoliday ? "bg-red-500" : "bg-green-500"}`}
                                            ></div>
                                          )}
                                        </div>
                                      ) : (
                                        <div className="w-7 h-7"></div>
                                      )}
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>

                      {/* Period actions - Workflow buttons */}
                      <div className="mt-2 pt-2 border-t space-y-1">
                        {/* Show workflow status */}
                        <div className="text-center text-xs text-gray-500 mb-1">
                          {!period && "Chưa có điểm danh"}
                          {period?.status === "open" && "🟢 Đang mở"}
                          {period?.status === "submitted" && "🟡 Chờ duyệt"}
                          {period?.status === "approved" && "🔵 Đã duyệt"}
                          {period?.status === "locked" && "🔒 Đã chốt"}
                        </div>

                        {/* No period or Open status - show submit button */}
                        {(!period || period?.status === "open") && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSubmit(key);
                            }}
                            className="w-full py-2 text-xs bg-green-500 text-white rounded hover:bg-green-600 font-medium"
                          >
                            📤 Nộp điểm danh
                          </button>
                        )}

                        {/* Submitted status - show approve button */}
                        {period?.status === "submitted" && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleApprove(key);
                            }}
                            className="w-full py-2 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 font-medium"
                          >
                            ✓ Duyệt điểm danh
                          </button>
                        )}

                        {/* Approved status - show lock button */}
                        {period?.status === "approved" && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleLock(key);
                            }}
                            className="w-full py-2 text-xs bg-purple-500 text-white rounded hover:bg-purple-600 font-medium"
                          >
                            🔒 Chốt để thu học phí
                          </button>
                        )}

                        {/* Locked status - show unlock button */}
                        {period?.status === "locked" && (
                          <div className="space-y-1">
                            <div className="text-center py-1 bg-gray-100 rounded text-xs text-gray-600">
                              ✅ Sẵn sàng thu phí
                            </div>
                            {isAdmin() && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleUnlock(key);
                                }}
                                disabled={reopeningMonth === key}
                                className="w-full py-1.5 text-xs bg-gray-200 text-gray-600 rounded hover:bg-gray-300 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {reopeningMonth === key ? "Đang mở lại..." : "Mở lại để chỉnh sửa"}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Motion.div>

          {/* Week Timesheet - SAP Style */}
          {selectedWeek && (
            <Motion.div variants={itemVariants} className="rounded-3xl border border-slate-200/70 bg-white/95 shadow-sm overflow-hidden">
              <div className="card-body">
                <div className="flex flex-col gap-4 mb-4 xl:flex-row xl:items-center xl:justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      📝 Điểm danh tuần:{" "}
                      {selectedWeek.start.toLocaleDateString("vi-VN")} -{" "}
                      {selectedWeek.end.toLocaleDateString("vi-VN")}
                    </h3>
                    <div className="flex flex-wrap items-center gap-3">
                      {/* Show session requirement if configured */}
                      {classSchedule?.sessions_per_week && (
                        <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                          📊 Quy định: {classSchedule.sessions_per_week}{" "}
                          buổi/tuần
                        </span>
                      )}
                      <p className="text-sm text-gray-500">
                        Click vào ô để thay đổi trạng thái
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex flex-wrap gap-2 text-sm">
                      {STATUS_CYCLE.map((s) => (
                        <span key={s} className="flex items-center gap-1">
                          <span className="text-lg">{STATUS_ICONS[s]}</span>
                          <span>{STATUS_LABELS[s]}</span>
                        </span>
                      ))}
                    </div>
                    <ActionProgressButton
                      onClick={handleSave}
                      loading={saving}
                      loadingLabel="Đang lưu điểm danh..."
                      disabled={!isWeekReady || Boolean(nonEditableSelectedMonth) || students.length === 0}
                      className="btn-primary"
                    >
                      Luu diem danh
                    </ActionProgressButton>
                  </div>
                </div>

                {weekLoading && (
                  <LongOperationStatus
                    title="Đang tải điểm danh của tuần"
                    message="Đang lấy dữ liệu theo từng tháng trong tuần được chọn. Nút lưu và các ô điểm danh tạm khóa để tránh ghi đè dữ liệu cũ."
                    steps={selectedWeekMonthKeys.length > 1 ? ["Tai thang dau", "Tai thang tiep noi", "San sang sua"] : ["Tai diem danh", "Kiem tra ky", "San sang sua"]}
                    activeStep={selectedWeekMonthKeys.length > 1 ? 1 : 0}
                  />
                )}

                {weekError && (
                  <div className="mb-4 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800" role="alert">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <span>{weekError}</span>
                      <button type="button" onClick={() => loadWeekAttendance()} className="rounded-xl bg-white px-3 py-2 text-xs font-black text-rose-700 shadow-sm">
                        Thử lại tuần này
                      </button>
                    </div>
                  </div>
                )}

                {selectedWeek && (
                  <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-bold text-slate-600">
                    <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                      <span>
                        Trang thai ky: {selectedWeekPeriodLabels.join(" | ")}
                      </span>
                      <span className={nonEditableSelectedMonth ? "text-rose-700" : "text-emerald-700"}>
                        {nonEditableSelectedMonth ? `Tháng ${nonEditableSelectedMonth} không ở trạng thái mở - chỉ xem` : isWeekReady ? "Đã tải xong - có thể thao tác" : "Đang chờ dữ liệu tuần"}
                      </span>
                    </div>
                  </div>
                )}

                {weekDates.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    Tuần này không có buổi học theo lịch
                  </div>
                ) : students.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    Lớp học chưa có học viên
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead>
                        <tr className="bg-gray-50 border-b">
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 sticky left-0 bg-gray-50 z-10">
                            Học viên
                          </th>
                          {weekDates.map(({ dateStr, dayOfWeek, dayNum, isMakeUpDate }) => {
                            // Check if all students are marked present for this date
                            const allPresent = students.every(
                              (s) => attendance[s.id]?.[dateStr] === "present",
                            );
                            const anyMarked = students.some(
                              (s) => attendance[s.id]?.[dateStr],
                            );
                            const datePeriodStatus = periods[dateStr.slice(0, 7)]?.status;
                            const isDateReadOnly = Boolean(
                              datePeriodStatus && datePeriodStatus !== "open",
                            );
                            return (
                              <th
                                key={dateStr}
                                className="px-3 py-2 text-center text-xs font-medium text-gray-600 min-w-[70px]"
                              >
                                <div>{dayOfWeek}</div>
                                <div className="font-bold">{dayNum}</div>
                                {isMakeUpDate && (
                                  <div className="mt-1 text-[10px] font-semibold text-orange-700">
                                    Hoc bu
                                  </div>
                                )}
                                {/* Select All checkbox */}
                                <div className="mt-1">
                                  <button
                                    onClick={() => {
                                      if (!isWeekReady) {
                                        toast.error("Vui long doi tai xong tuan diem danh truoc khi sua");
                                        return;
                                      }
                                      if (isDateReadOnly) {
                                        toast.error("Chỉ có thể sửa kỳ điểm danh đang mở");
                                        return;
                                      }
                                      // Toggle all students for this date
                                      const newStatus = allPresent
                                        ? null
                                        : "present";
                                      setAttendance((prev) => {
                                        const updated = { ...prev };
                                        students.forEach((s) => {
                                          if (!updated[s.id])
                                            updated[s.id] = {};
                                          updated[s.id] = {
                                            ...updated[s.id],
                                            [dateStr]: newStatus,
                                          };
                                        });
                                        return updated;
                                      });
                                    }}
                                    disabled={!isWeekReady || isDateReadOnly}
                                    className={`px-2 py-1 text-[10px] rounded font-medium transition-colors ${
                                      allPresent
                                        ? "bg-green-500 text-white"
                                        : !isWeekReady || isDateReadOnly
                                          ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                          : anyMarked
                                          ? "bg-yellow-200 text-yellow-800"
                                          : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                                    }`}
                                    title={
                                      allPresent
                                        ? "Bỏ chọn tất cả"
                                        : "Chọn tất cả có mặt"
                                    }
                                  >
                                    {allPresent ? "✓ Cả lớp" : "☐ Tất cả"}
                                  </button>
                                </div>
                              </th>
                            );
                          })}
                          <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 bg-blue-50">
                            Buổi
                          </th>
                          <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 bg-green-50">
                            Tiền
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {students.map((student, idx) => {
                          const summary = feeSummary[student.id] || {};
                          return (
                            <tr
                              key={student.id}
                              className={
                                idx % 2 === 0 ? "bg-white" : "bg-gray-50"
                              }
                            >
                              <td className="px-4 py-3 sticky left-0 bg-inherit z-10">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-xs font-medium text-primary-700">
                                    {student.full_name?.charAt(0)}
                                  </div>
                                  <div>
                                    <p className="font-medium text-gray-900 text-sm">
                                      {student.full_name}
                                    </p>
                                  </div>
                                </div>
                              </td>
                              {weekDates.map(({ dateStr, isMakeUpDate }) => {
                                const status =
                                  attendance[student.id]?.[dateStr];
                                const datePeriodStatus = periods[dateStr.slice(0, 7)]?.status;
                                const isDateReadOnly = Boolean(
                                  datePeriodStatus && datePeriodStatus !== "open",
                                );
                                const isCellDisabled = !isWeekReady || isDateReadOnly;
                                return (
                                  <td
                                    key={dateStr}
                                    className="px-2 py-2 text-center"
                                  >
                                    <button
                                      onClick={() =>
                                        handleCellClick(student.id, dateStr)
                                      }
                                      disabled={isCellDisabled}
                                      className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg transition-all cursor-pointer
                                        ${
                                          status === "present"
                                            ? "bg-green-100 hover:bg-green-200"
                                            : status === "absent_with_fee"
                                              ? "bg-yellow-100 hover:bg-yellow-200"
                                              : status === "absent_no_fee"
                                                ? "bg-red-100 hover:bg-red-200"
                                                : "bg-gray-100 hover:bg-gray-200"
                                        }
                                        ${isMakeUpDate ? "ring-2 ring-orange-300" : ""}
                                        ${isCellDisabled ? "cursor-not-allowed opacity-60 hover:bg-gray-100" : ""}
                                      `}
                                      title={
                                        status
                                          ? STATUS_LABELS[status]
                                          : "Click để điểm danh"
                                      }
                                    >
                                      {status
                                        ? STATUS_ICONS[status]
                                        : STATUS_ICONS.empty}
                                    </button>
                                  </td>
                                );
                              })}
                              <td
                                className={`px-4 py-3 text-center font-medium ${
                                  summary.isExceeding
                                    ? "bg-orange-100"
                                    : "bg-blue-50"
                                }`}
                              >
                                <div className="flex flex-col items-center">
                                  <span
                                    className={
                                      summary.isExceeding
                                        ? "text-orange-700"
                                        : ""
                                    }
                                  >
                                    {summary.totalDays || 0}/
                                    {summary.sessionsLimit || sessionsPerWeek}
                                  </span>
                                  {summary.isExceeding && (
                                    <span className="text-[10px] text-orange-600 bg-orange-200 px-1 rounded mt-0.5">
                                      +{summary.extraSessions} tăng cường
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-right bg-green-50 font-medium text-green-700">
                                {new Intl.NumberFormat("vi-VN").format(
                                  summary.fee || 0,
                                )}
                                đ
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="bg-gray-100 font-bold">
                          <td className="px-4 py-3 sticky left-0 bg-gray-100">
                            TỔNG CỘNG
                          </td>
                          <td
                            colSpan={weekDates.length}
                            className="text-center text-sm"
                          >
                            Quy định: {sessionsPerWeek} buổi/tuần
                          </td>
                          <td className="px-4 py-3 text-center bg-blue-100">
                            {Object.values(feeSummary).reduce(
                              (sum, s) => sum + (s.totalDays || 0),
                              0,
                            )}
                          </td>
                          <td className="px-4 py-3 text-right bg-green-100 text-green-800">
                            {new Intl.NumberFormat("vi-VN").format(totalFee)}đ
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            </Motion.div>
          )}
        </>
      )}
    </Motion.div>
  );
}
