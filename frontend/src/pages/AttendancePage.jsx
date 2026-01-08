import { useState, useEffect, useMemo } from 'react';
import { classesService, attendanceService, attendancePeriodsService } from '../services/api';
import { useToast } from '../components/ui/Toast';
import { useAuth } from '../context/AuthContext';

// VI: Điểm danh kiểu SAP Timesheet - Hiển thị 3 tháng, chọn tuần để điểm danh

const PERIOD_STATUS = {
  open: { label: 'Đang mở', color: 'bg-green-100 text-green-700', icon: '🟢' },
  submitted: { label: 'Đã nộp', color: 'bg-yellow-100 text-yellow-700', icon: '🟡' },
  approved: { label: 'Đã duyệt', color: 'bg-blue-100 text-blue-700', icon: '🔵' },
  locked: { label: 'Đã chốt', color: 'bg-gray-100 text-gray-700', icon: '🔒' },
};

const STATUS_CYCLE = ['present', 'absent_with_fee', 'absent_no_fee'];
const STATUS_ICONS = {
  present: '✅',
  absent_with_fee: '⚠️',
  absent_no_fee: '❌',
  empty: '−'
};
const STATUS_LABELS = {
  present: 'Có mặt',
  absent_with_fee: 'Nghỉ có phép',
  absent_no_fee: 'Nghỉ không phép'
};

// Calendar Legend colors matching SAP style
const LEGEND = [
  { status: 'complete', label: 'Đã điểm danh', color: 'bg-green-500' },
  { status: 'incomplete', label: 'Chưa hoàn thành', color: 'bg-yellow-500' },
  { status: 'empty', label: 'Chưa điểm danh', color: 'bg-gray-200' },
  { status: 'locked', label: 'Đã chốt', color: 'bg-blue-500' },
  { status: 'today', label: 'Hôm nay', color: 'border-2 border-primary-600' },
];

export default function AttendancePage() {
  const [activeTab, setActiveTab] = useState('calendar');
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedWeek, setSelectedWeek] = useState(null); // { start: Date, end: Date }
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [periods, setPeriods] = useState({});
  const [classSchedule, setClassSchedule] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const { isAdmin } = useAuth();

  // Get today and calculate 3 months to display
  const today = new Date();
  const baseMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  // Generate 3 months: previous, current, next
  const threeMonths = useMemo(() => {
    return [-1, 0, 1].map(offset => {
      const d = new Date(baseMonth.getFullYear(), baseMonth.getMonth() + offset, 1);
      return {
        year: d.getFullYear(),
        month: d.getMonth(),
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
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
      const isScheduleDay = scheduleDays.length === 0 || scheduleDays.includes(date.getDay());
      currentWeek.push({
        day,
        date,
        dateStr: date.toISOString().split('T')[0],
        isScheduleDay,
        isToday: date.toDateString() === today.toDateString(),
        weekday: date.getDay()
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
  const scheduleDayNumbers = useMemo(() => {
    if (!classSchedule?.schedule_days) return [];
    let days = classSchedule.schedule_days;
    if (typeof days === 'string') {
      try { days = JSON.parse(days); } catch { days = []; }
    }
    if (!Array.isArray(days)) return [];
    return days.map(d => typeof d === 'number' ? d : ({ sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 }[String(d).toLowerCase()] ?? -1)).filter(d => d >= 0);
  }, [classSchedule]);

  // Calculate fee per session (monthly fee / sessions per month)
  const feePerSession = useMemo(() => {
    if (!classSchedule?.fee_per_day || scheduleDayNumbers.length === 0) return 0;
    // fee_per_day is actually MONTHLY fee, divide by approximate sessions per month
    // Average: 4.33 weeks per month
    const sessionsPerMonth = scheduleDayNumbers.length * 4.33;
    return Math.round(classSchedule.fee_per_day / sessionsPerMonth);
  }, [classSchedule, scheduleDayNumbers]);

  // Generate week dates for selected week
  const weekDates = useMemo(() => {
    if (!selectedWeek) return [];
    const dates = [];
    const current = new Date(selectedWeek.start);
    while (current <= selectedWeek.end) {
      const isScheduleDay = scheduleDayNumbers.length === 0 || scheduleDayNumbers.includes(current.getDay());
      if (isScheduleDay) {
        dates.push({
          date: new Date(current),
          dateStr: current.toISOString().split('T')[0],
          dayOfWeek: current.toLocaleDateString('vi-VN', { weekday: 'short' }),
          dayNum: current.getDate()
        });
      }
      current.setDate(current.getDate() + 1);
    }
    return dates;
  }, [selectedWeek, scheduleDayNumbers]);

  // Calculate fee summary per student for selected week
  const feeSummary = useMemo(() => {
    const summary = {};
    students.forEach(student => {
      const studentAtt = attendance[student.id] || {};
      let presentDays = 0;
      let absentWithFee = 0;
      let absentNoFee = 0;

      weekDates.forEach(({ dateStr }) => {
        const status = studentAtt[dateStr];
        if (status === 'present') presentDays++;
        else if (status === 'absent_with_fee') absentWithFee++;
        else if (status === 'absent_no_fee') absentNoFee++;
      });

      const totalDays = presentDays + absentWithFee;
      const fee = totalDays * feePerSession;

      summary[student.id] = {
        presentDays,
        absentWithFee,
        absentNoFee,
        totalDays,
        totalSessions: weekDates.length,
        fee
      };
    });
    return summary;
  }, [students, attendance, weekDates, feePerSession]);

  const totalFee = useMemo(() => {
    return Object.values(feeSummary).reduce((sum, s) => sum + s.fee, 0);
  }, [feeSummary]);

  useEffect(() => {
    loadClasses();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      loadClassData();
    }
  }, [selectedClass]);

  useEffect(() => {
    if (selectedClass && selectedWeek) {
      loadWeekAttendance();
    }
  }, [selectedClass, selectedWeek]);

  const loadClasses = async () => {
    const response = await classesService.getAll();
    if (response.success) {
      setClasses(response.data.classes || []);
    }
  };

  const loadClassData = async () => {
    setLoading(true);
    const classRes = await classesService.getById(selectedClass);
    if (classRes.success) {
      setClassSchedule(classRes.data);
      setStudents(classRes.data.students || []);

      // Load periods for all 3 months
      const periodsMap = {};
      for (const m of threeMonths) {
        const periodRes = await attendancePeriodsService.getAll({
          class_id: selectedClass,
          month: m.key
        });
        if (periodRes.success && periodRes.data.periods?.length > 0) {
          periodsMap[m.key] = periodRes.data.periods[0];
        }
      }
      setPeriods(periodsMap);
    }
    setLoading(false);
  };

  const loadWeekAttendance = async () => {
    if (!selectedWeek) return;

    const allAttendance = {};
    students.forEach(s => { allAttendance[s.id] = {}; });

    // Load attendance for the week's month
    const month = selectedWeek.start.toISOString().slice(0, 7);
    try {
      const res = await fetch(`/api/attendance/month?class_id=${selectedClass}&month=${month}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data.attendance) {
          data.data.attendance.forEach(a => {
            if (!allAttendance[a.student_id]) allAttendance[a.student_id] = {};
            allAttendance[a.student_id][a.attendance_date] = a.status;
          });
        }
      }
    } catch (e) {}

    setAttendance(allAttendance);
  };

  const handleWeekClick = (weekStart, weekEnd) => {
    setSelectedWeek({ start: weekStart, end: weekEnd });
  };

  const handleCellClick = (studentId, dateStr) => {
    const monthKey = dateStr.slice(0, 7);
    const period = periods[monthKey];
    if (period?.status === 'locked') {
      toast.error('Không thể sửa điểm danh đã chốt');
      return;
    }

    const currentStatus = attendance[studentId]?.[dateStr] || 'empty';
    const currentIdx = STATUS_CYCLE.indexOf(currentStatus);
    const nextStatus = currentIdx === -1 ? STATUS_CYCLE[0] :
                       currentIdx === STATUS_CYCLE.length - 1 ? null :
                       STATUS_CYCLE[currentIdx + 1];

    setAttendance(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [dateStr]: nextStatus
      }
    }));
  };

  const handleSave = async () => {
    if (!selectedWeek) {
      toast.error('Vui lòng chọn tuần để lưu');
      return;
    }

    const monthKey = selectedWeek.start.toISOString().slice(0, 7);
    const period = periods[monthKey];
    if (period?.status === 'locked') {
      toast.error('Không thể sửa điểm danh đã chốt');
      return;
    }

    setSaving(true);

    // Ensure period exists
    if (!period) {
      await attendancePeriodsService.create({
        class_id: selectedClass,
        month: monthKey
      });
    }

    const records = [];
    students.forEach(student => {
      const studentAtt = attendance[student.id] || {};
      weekDates.forEach(({ dateStr }) => {
        const status = studentAtt[dateStr];
        if (status && STATUS_CYCLE.includes(status)) {
          records.push({
            student_id: student.id,
            class_id: selectedClass,
            attendance_date: dateStr,
            status
          });
        }
      });
    });

    const response = await attendanceService.bulkCreate(records);

    if (response.success) {
      toast.success(`Đã lưu ${records.length} bản ghi điểm danh`);
      await loadClassData();
      await loadWeekAttendance();
    } else {
      toast.error(response.error?.message || 'Không thể lưu điểm danh');
    }
    setSaving(false);
  };

  const handleSubmit = async (monthKey) => {
    const period = periods[monthKey];
    if (!period) {
      // Create period first
      const createRes = await attendancePeriodsService.create({ class_id: selectedClass, month: monthKey });
      if (!createRes.success) {
        toast.error('Không thể tạo kỳ điểm danh');
        return;
      }
      // Submit the newly created period
      const submitRes = await attendancePeriodsService.submit(createRes.data.period.id);
      if (submitRes.success) {
        toast.success('Đã nộp điểm danh tháng ' + monthKey);
        loadClassData();
      } else {
        toast.error(submitRes.error?.message || 'Lỗi nộp điểm danh');
      }
      return;
    }

    const res = await attendancePeriodsService.submit(period.id);
    if (res.success) {
      toast.success('Đã nộp điểm danh tháng ' + monthKey);
      loadClassData();
    } else {
      toast.error(res.error?.message || 'Lỗi nộp điểm danh');
    }
  };

  const handleApprove = async (monthKey) => {
    const period = periods[monthKey];
    if (!period) {
      toast.error('Chưa có dữ liệu điểm danh cho tháng này');
      return;
    }
    const res = await attendancePeriodsService.approve(period.id);
    if (res.success) {
      toast.success('Đã duyệt điểm danh tháng ' + monthKey);
      loadClassData();
    } else {
      toast.error(res.error?.message || 'Lỗi duyệt điểm danh');
    }
  };

  const handleLock = async (monthKey) => {
    const period = periods[monthKey];
    if (!period) {
      toast.error('Chưa có dữ liệu điểm danh cho tháng này');
      return;
    }
    const res = await attendancePeriodsService.lock(period.id);
    if (res.success) {
      toast.success('🔒 Đã chốt điểm danh tháng ' + monthKey + '. Học phí đã sẵn sàng để thu!');
      loadClassData();
    } else {
      toast.error(res.error?.message || 'Lỗi chốt điểm danh');
    }
  };

  const handleUnlock = async (monthKey) => {
    const period = periods[monthKey];
    if (!period) return;
    const res = await attendancePeriodsService.unlock(period.id);
    if (res.success) {
      toast.success('Đã mở lại điểm danh tháng ' + monthKey);
      loadClassData();
    } else {
      toast.error(res.error?.message || 'Lỗi');
    }
  };

  // Month header with Vietnamese name
  const formatMonthName = (year, month) => {
    return new Date(year, month).toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">📋 Điểm danh</h1>
          <p className="text-gray-500">Điểm danh theo tuần - Giống SAP Timesheet</p>
        </div>
      </div>

      {/* Class Selector */}
      <div className="card">
        <div className="card-body">
          <div className="flex items-center gap-4">
            <div className="flex-1 max-w-sm">
              <label className="block text-sm font-medium text-gray-700 mb-1">Chọn lớp</label>
              <select
                value={selectedClass}
                onChange={(e) => { setSelectedClass(e.target.value); setSelectedWeek(null); }}
                className="input"
              >
                <option value="">-- Chọn lớp --</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.class_name}</option>
                ))}
              </select>
            </div>
            {classSchedule && (
              <div className="text-sm text-gray-600">
                <p><strong>Học phí tháng:</strong> {new Intl.NumberFormat('vi-VN').format(classSchedule.fee_per_day)}đ</p>
                <p><strong>Học phí/buổi:</strong> {new Intl.NumberFormat('vi-VN').format(feePerSession)}đ</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="card">
          <div className="card-body text-center py-12">
            <div className="spinner w-8 h-8 mx-auto mb-4"></div>
            <p className="text-gray-500">Đang tải...</p>
          </div>
        </div>
      ) : !selectedClass ? (
        <div className="card">
          <div className="card-body text-center py-12 text-gray-500">
            Vui lòng chọn lớp học để xem lịch điểm danh
          </div>
        </div>
      ) : (
        <>
          {/* 3-Month Calendar Grid - SAP Style */}
          <div className="card">
            <div className="card-body">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">📅 Lịch điểm danh - Chọn tuần</h3>
                <div className="flex gap-4 text-xs">
                  {LEGEND.map(l => (
                    <div key={l.status} className="flex items-center gap-1">
                      <div className={`w-4 h-4 rounded ${l.color}`}></div>
                      <span>{l.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-6">
                {threeMonths.map(({ year, month, key }) => {
                  const calendar = generateMonthCalendar(year, month, scheduleDayNumbers);
                  const period = periods[key];

                  return (
                    <div key={key} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-gray-800">{formatMonthName(year, month)}</h4>
                        {period && (
                          <span className={`px-2 py-0.5 text-xs rounded-full ${PERIOD_STATUS[period.status]?.color}`}>
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
                            const weekStart = week.find(d => d)?.date;
                            const weekEnd = [...week].reverse().find(d => d)?.date;
                            const isSelected = selectedWeek &&
                              weekStart?.toDateString() === selectedWeek.start.toDateString();

                            return (
                              <tr
                                key={wi}
                                onClick={() => weekStart && weekEnd && handleWeekClick(weekStart, weekEnd)}
                                className={`cursor-pointer hover:bg-gray-50 transition-colors ${isSelected ? 'bg-primary-100' : ''}`}
                              >
                                {week.map((d, di) => (
                                  <td key={di} className="py-1">
                                    {d ? (
                                      <div className={`w-7 h-7 mx-auto rounded flex items-center justify-center text-xs
                                        ${d.isToday ? 'border-2 border-primary-600 font-bold' : ''}
                                        ${d.isScheduleDay ? 'bg-blue-50 text-blue-700' : 'text-gray-400'}
                                        ${isSelected ? 'bg-primary-200' : ''}
                                      `}>
                                        {d.day}
                                      </div>
                                    ) : (
                                      <div className="w-7 h-7"></div>
                                    )}
                                  </td>
                                ))}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>

                      {/* Period actions - Workflow buttons */}
                      <div className="mt-2 pt-2 border-t space-y-1">
                        {/* Show workflow status */}
                        <div className="text-center text-xs text-gray-500 mb-1">
                          {!period && 'Chưa có điểm danh'}
                          {period?.status === 'open' && '🟢 Đang mở'}
                          {period?.status === 'submitted' && '🟡 Chờ duyệt'}
                          {period?.status === 'approved' && '🔵 Đã duyệt'}
                          {period?.status === 'locked' && '🔒 Đã chốt'}
                        </div>

                        {/* No period or Open status - show submit button */}
                        {(!period || period?.status === 'open') && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleSubmit(key); }}
                            className="w-full py-2 text-xs bg-green-500 text-white rounded hover:bg-green-600 font-medium"
                          >
                            📤 Nộp điểm danh
                          </button>
                        )}

                        {/* Submitted status - show approve button */}
                        {period?.status === 'submitted' && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleApprove(key); }}
                            className="w-full py-2 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 font-medium"
                          >
                            ✓ Duyệt điểm danh
                          </button>
                        )}

                        {/* Approved status - show lock button */}
                        {period?.status === 'approved' && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleLock(key); }}
                            className="w-full py-2 text-xs bg-purple-500 text-white rounded hover:bg-purple-600 font-medium"
                          >
                            🔒 Chốt để thu học phí
                          </button>
                        )}

                        {/* Locked status - show unlock button */}
                        {period?.status === 'locked' && (
                          <div className="space-y-1">
                            <div className="text-center py-1 bg-gray-100 rounded text-xs text-gray-600">
                              ✅ Sẵn sàng thu phí
                            </div>
                            {isAdmin() && (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleUnlock(key); }}
                                className="w-full py-1.5 text-xs bg-gray-200 text-gray-600 rounded hover:bg-gray-300"
                              >
                                🔓 Mở lại
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
          </div>

          {/* Week Timesheet - SAP Style */}
          {selectedWeek && (
            <div className="card">
              <div className="card-body">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      📝 Điểm danh tuần: {selectedWeek.start.toLocaleDateString('vi-VN')} - {selectedWeek.end.toLocaleDateString('vi-VN')}
                    </h3>
                    <p className="text-sm text-gray-500">Click vào ô để thay đổi trạng thái</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex gap-2 text-sm">
                      {STATUS_CYCLE.map(s => (
                        <span key={s} className="flex items-center gap-1">
                          <span className="text-lg">{STATUS_ICONS[s]}</span>
                          <span>{STATUS_LABELS[s]}</span>
                        </span>
                      ))}
                    </div>
                    <button
                      onClick={handleSave}
                      disabled={saving || students.length === 0}
                      className="btn-primary"
                    >
                      {saving ? 'Đang lưu...' : '💾 Lưu điểm danh'}
                    </button>
                  </div>
                </div>

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
                          {weekDates.map(({ dateStr, dayOfWeek, dayNum }) => (
                            <th key={dateStr} className="px-3 py-2 text-center text-xs font-medium text-gray-600 min-w-[60px]">
                              <div>{dayOfWeek}</div>
                              <div className="font-bold">{dayNum}</div>
                            </th>
                          ))}
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
                            <tr key={student.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                              <td className="px-4 py-3 sticky left-0 bg-inherit z-10">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-xs font-medium text-primary-700">
                                    {student.full_name?.charAt(0)}
                                  </div>
                                  <div>
                                    <p className="font-medium text-gray-900 text-sm">{student.full_name}</p>
                                  </div>
                                </div>
                              </td>
                              {weekDates.map(({ dateStr }) => {
                                const status = attendance[student.id]?.[dateStr];
                                return (
                                  <td key={dateStr} className="px-2 py-2 text-center">
                                    <button
                                      onClick={() => handleCellClick(student.id, dateStr)}
                                      className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg transition-all cursor-pointer
                                        ${status === 'present' ? 'bg-green-100 hover:bg-green-200' :
                                          status === 'absent_with_fee' ? 'bg-yellow-100 hover:bg-yellow-200' :
                                          status === 'absent_no_fee' ? 'bg-red-100 hover:bg-red-200' :
                                          'bg-gray-100 hover:bg-gray-200'}
                                      `}
                                      title={status ? STATUS_LABELS[status] : 'Click để điểm danh'}
                                    >
                                      {status ? STATUS_ICONS[status] : STATUS_ICONS.empty}
                                    </button>
                                  </td>
                                );
                              })}
                              <td className="px-4 py-3 text-center bg-blue-50 font-medium">
                                {summary.totalDays || 0}/{summary.totalSessions || 0}
                              </td>
                              <td className="px-4 py-3 text-right bg-green-50 font-medium text-green-700">
                                {new Intl.NumberFormat('vi-VN').format(summary.fee || 0)}đ
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="bg-gray-100 font-bold">
                          <td className="px-4 py-3 sticky left-0 bg-gray-100">TỔNG CỘNG</td>
                          <td colSpan={weekDates.length} className="text-center text-sm">
                            {weekDates.length} buổi trong tuần
                          </td>
                          <td className="px-4 py-3 text-center bg-blue-100">
                            {Object.values(feeSummary).reduce((sum, s) => sum + (s.totalDays || 0), 0)}
                          </td>
                          <td className="px-4 py-3 text-right bg-green-100 text-green-800">
                            {new Intl.NumberFormat('vi-VN').format(totalFee)}đ
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
