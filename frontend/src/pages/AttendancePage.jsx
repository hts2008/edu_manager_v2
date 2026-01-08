import { useState, useEffect, useMemo } from 'react';
import { classesService, attendanceService, attendancePeriodsService } from '../services/api';
import { useToast } from '../components/ui/Toast';
import { useAuth } from '../context/AuthContext';

// VI: Điểm danh kiểu SAP Timesheet với calendar grid

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

export default function AttendancePage() {
  const [activeTab, setActiveTab] = useState('calendar'); // calendar, periods
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({}); // { studentId: { 'YYYY-MM-DD': status } }
  const [period, setPeriod] = useState(null);
  const [periods, setPeriods] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [classSchedule, setClassSchedule] = useState(null);
  const toast = useToast();
  const { user, isAdmin } = useAuth();

  // Generate schedule dates for the month based on class schedule_days
  const scheduleDates = useMemo(() => {
    if (!classSchedule || !selectedMonth) return [];
    
    const dates = [];
    const [year, month] = selectedMonth.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    
    // schedule_days format: ["monday", "wednesday", "friday"] or similar
    const scheduleDays = classSchedule.schedule_days ? 
      (typeof classSchedule.schedule_days === 'string' ? 
        JSON.parse(classSchedule.schedule_days) : classSchedule.schedule_days) 
      : [];
    
    const dayMap = {
      sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
      thursday: 4, friday: 5, saturday: 6
    };
    
    const allowedDays = scheduleDays.map(d => dayMap[d.toLowerCase()]).filter(d => d !== undefined);
    
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day);
      if (allowedDays.length === 0 || allowedDays.includes(date.getDay())) {
        dates.push({
          date: date.toISOString().split('T')[0],
          dayOfWeek: date.toLocaleDateString('vi-VN', { weekday: 'short' }),
          dayNum: day
        });
      }
    }
    
    return dates;
  }, [classSchedule, selectedMonth]);

  // Calculate fee summary per student
  const feeSummary = useMemo(() => {
    const summary = {};
    students.forEach(student => {
      const studentAtt = attendance[student.id] || {};
      let presentDays = 0;
      let absentWithFee = 0;
      let absentNoFee = 0;
      
      scheduleDates.forEach(({ date }) => {
        const status = studentAtt[date];
        if (status === 'present') presentDays++;
        else if (status === 'absent_with_fee') absentWithFee++;
        else if (status === 'absent_no_fee') absentNoFee++;
      });
      
      const feePerDay = student.fee_per_day_snapshot || classSchedule?.fee_per_day || 0;
      const totalDays = presentDays + absentWithFee; // Nghỉ có phép vẫn tính phí
      
      summary[student.id] = {
        presentDays,
        absentWithFee,
        absentNoFee,
        totalDays,
        totalSessions: scheduleDates.length,
        fee: totalDays * feePerDay
      };
    });
    return summary;
  }, [students, attendance, scheduleDates, classSchedule]);

  // Total projected fee
  const totalFee = useMemo(() => {
    return Object.values(feeSummary).reduce((sum, s) => sum + s.fee, 0);
  }, [feeSummary]);

  useEffect(() => {
    loadClasses();
  }, []);

  useEffect(() => {
    if (selectedClass && selectedMonth) {
      loadClassData();
    }
  }, [selectedClass, selectedMonth]);

  useEffect(() => {
    if (activeTab === 'periods') {
      loadAllPeriods();
    }
  }, [activeTab, selectedMonth]);

  const loadClasses = async () => {
    const response = await classesService.getAll();
    if (response.success) {
      setClasses(response.data.classes || []);
    }
  };

  const loadClassData = async () => {
    setLoading(true);
    
    // Load class details including schedule and students
    const classRes = await classesService.getById(selectedClass);
    if (classRes.success) {
      setClassSchedule(classRes.data);
      const classStudents = classRes.data.students || [];
      setStudents(classStudents);
      
      // Load existing attendance for this month
      const [year, month] = selectedMonth.split('-');
      const startDate = `${selectedMonth}-01`;
      const endDate = `${selectedMonth}-31`;
      
      const attRes = await attendanceService.getByDate(startDate, selectedClass);
      // We need to load all attendance for the month
      const allAttendance = {};
      
      // Try to get attendance for each date in scheduleDates
      classStudents.forEach(s => {
        allAttendance[s.id] = {};
      });
      
      // Load attendance period
      const periodRes = await attendancePeriodsService.getAll({ 
        class_id: selectedClass, 
        month: selectedMonth 
      });
      if (periodRes.success && periodRes.data.periods?.length > 0) {
        setPeriod(periodRes.data.periods[0]);
      } else {
        setPeriod(null);
      }
      
      // Fetch attendance data for this class and month
      // Note: We need a bulk endpoint, for now simulate with API
      try {
        const res = await fetch(`/api/attendance/month?class_id=${selectedClass}&month=${selectedMonth}`, {
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
      } catch (e) {
        // API might not exist yet
      }
      
      setAttendance(allAttendance);
    }
    setLoading(false);
  };

  const loadAllPeriods = async () => {
    setLoading(true);
    const res = await attendancePeriodsService.getAll({ month: selectedMonth });
    if (res.success) {
      setPeriods(res.data.periods || []);
    }
    setLoading(false);
  };

  const handleCellClick = (studentId, date) => {
    if (period?.status === 'locked') {
      toast.error('Không thể sửa điểm danh đã chốt');
      return;
    }
    
    // Cycle through statuses
    const currentStatus = attendance[studentId]?.[date] || 'empty';
    const currentIdx = STATUS_CYCLE.indexOf(currentStatus);
    const nextStatus = currentIdx === -1 ? STATUS_CYCLE[0] : 
                       currentIdx === STATUS_CYCLE.length - 1 ? null : 
                       STATUS_CYCLE[currentIdx + 1];
    
    setAttendance(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [date]: nextStatus
      }
    }));
  };

  const handleSave = async () => {
    if (period?.status === 'locked') {
      toast.error('Không thể sửa điểm danh đã chốt');
      return;
    }

    setSaving(true);

    // Ensure period exists
    if (!period) {
      await attendancePeriodsService.create({ 
        class_id: selectedClass, 
        month: selectedMonth 
      });
    }

    // Prepare bulk attendance records
    const records = [];
    students.forEach(student => {
      const studentAtt = attendance[student.id] || {};
      scheduleDates.forEach(({ date }) => {
        const status = studentAtt[date];
        if (status && STATUS_CYCLE.includes(status)) {
          records.push({
            student_id: student.id,
            class_id: selectedClass,
            attendance_date: date,
            status
          });
        }
      });
    });

    const response = await attendanceService.bulkCreate(records);
    
    if (response.success) {
      toast.success(`Đã lưu ${records.length} bản ghi điểm danh`);
      await loadClassData();
    } else {
      toast.error(response.error?.message || 'Không thể lưu điểm danh');
    }
    setSaving(false);
  };

  const handleSubmit = async (periodId) => {
    const res = await attendancePeriodsService.submit(periodId || period?.id);
    if (res.success) {
      toast.success('Đã gửi điểm danh để duyệt');
      loadAllPeriods();
      loadClassData();
    } else {
      toast.error(res.error?.message || 'Lỗi');
    }
  };

  const handleApprove = async (periodId) => {
    const res = await attendancePeriodsService.approve(periodId);
    if (res.success) {
      toast.success('Đã duyệt điểm danh');
      loadAllPeriods();
      loadClassData();
    } else {
      toast.error(res.error?.message || 'Lỗi');
    }
  };

  const handleLock = async (periodId) => {
    const res = await attendancePeriodsService.lock(periodId || period?.id);
    if (res.success) {
      toast.success('Đã chốt điểm danh và tạo phí học');
      loadAllPeriods();
      loadClassData();
    } else {
      toast.error(res.error?.message || 'Lỗi');
    }
  };

  const handleUnlock = async (periodId) => {
    const res = await attendancePeriodsService.unlock(periodId);
    if (res.success) {
      toast.success('Đã mở lại điểm danh');
      loadAllPeriods();
      loadClassData();
    } else {
      toast.error(res.error?.message || 'Lỗi');
    }
  };

  // Navigate months
  const navigateMonth = (delta) => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const date = new Date(year, month - 1 + delta, 1);
    setSelectedMonth(date.toISOString().slice(0, 7));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">📋 Điểm danh</h1>
          <p className="text-gray-500">Điểm danh theo lịch học - Giống SAP Timesheet</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setActiveTab('calendar')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeTab === 'calendar'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          📅 Điểm danh theo lịch
        </button>
        <button
          onClick={() => setActiveTab('periods')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeTab === 'periods'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          🔒 Quản lý chốt tháng
        </button>
      </div>

      {activeTab === 'calendar' && (
        <>
          {/* Filters */}
          <div className="card">
            <div className="card-body">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex-1 min-w-48">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Chọn lớp</label>
                  <select
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                    className="input"
                  >
                    <option value="">-- Chọn lớp --</option>
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>{c.class_name}</option>
                    ))}
                  </select>
                </div>

                {/* Month Navigator */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tháng</label>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => navigateMonth(-1)}
                      className="p-2 hover:bg-gray-100 rounded-lg"
                    >
                      ◀
                    </button>
                    <input
                      type="month"
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      className="input w-auto"
                    />
                    <button 
                      onClick={() => navigateMonth(1)}
                      className="p-2 hover:bg-gray-100 rounded-lg"
                    >
                      ▶
                    </button>
                  </div>
                </div>

                {/* Period Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái</label>
                  <div className="flex items-center gap-2">
                    {period ? (
                      <span className={`px-3 py-2 rounded-lg text-sm font-medium ${PERIOD_STATUS[period.status]?.color}`}>
                        {PERIOD_STATUS[period.status]?.icon} {PERIOD_STATUS[period.status]?.label}
                      </span>
                    ) : (
                      <span className="px-3 py-2 rounded-lg text-sm bg-gray-100 text-gray-500">
                        Chưa có dữ liệu
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-end gap-2">
                  <button
                    onClick={handleSave}
                    disabled={!selectedClass || students.length === 0 || saving || period?.status === 'locked'}
                    className="btn-primary"
                  >
                    {saving ? 'Đang lưu...' : '💾 Lưu điểm danh'}
                  </button>
                  {period && period.status === 'open' && (
                    <button
                      onClick={() => handleSubmit()}
                      className="px-4 py-2 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200"
                    >
                      📤 Nộp duyệt
                    </button>
                  )}
                  {period && period.status === 'approved' && isAdmin() && (
                    <button
                      onClick={() => handleLock()}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                    >
                      🔒 Chốt tháng
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Legend */}
          {selectedClass && (
            <div className="flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1">
                <span className="text-lg">{STATUS_ICONS.present}</span> Có mặt
              </span>
              <span className="flex items-center gap-1">
                <span className="text-lg">{STATUS_ICONS.absent_with_fee}</span> Nghỉ có phép (tính phí)
              </span>
              <span className="flex items-center gap-1">
                <span className="text-lg">{STATUS_ICONS.absent_no_fee}</span> Nghỉ không phép
              </span>
              <span className="flex items-center gap-1">
                <span className="text-lg">{STATUS_ICONS.empty}</span> Chưa điểm danh
              </span>
            </div>
          )}

          {/* Calendar Grid */}
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
                Vui lòng chọn lớp học
              </div>
            </div>
          ) : students.length === 0 ? (
            <div className="card">
              <div className="card-body text-center py-12 text-gray-500">
                Lớp học chưa có học viên
              </div>
            </div>
          ) : (
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b">
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 sticky left-0 bg-gray-50 z-10">
                        Học viên
                      </th>
                      {scheduleDates.map(({ date, dayOfWeek, dayNum }) => (
                        <th key={date} className="px-2 py-2 text-center text-xs font-medium text-gray-600 min-w-[50px]">
                          <div>{dayOfWeek}</div>
                          <div className="font-bold">{dayNum}</div>
                        </th>
                      ))}
                      <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 bg-blue-50">
                        Buổi học
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 bg-green-50">
                        Tiền dự thu
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
                                <p className="text-xs text-gray-500">{student.id}</p>
                              </div>
                            </div>
                          </td>
                          {scheduleDates.map(({ date }) => {
                            const status = attendance[student.id]?.[date];
                            const isPast = new Date(date) <= new Date();
                            return (
                              <td 
                                key={date} 
                                className="px-2 py-2 text-center"
                              >
                                <button
                                  onClick={() => handleCellClick(student.id, date)}
                                  disabled={period?.status === 'locked'}
                                  className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg transition-all
                                    ${status === 'present' ? 'bg-green-100 hover:bg-green-200' :
                                      status === 'absent_with_fee' ? 'bg-yellow-100 hover:bg-yellow-200' :
                                      status === 'absent_no_fee' ? 'bg-red-100 hover:bg-red-200' :
                                      isPast ? 'bg-gray-100 hover:bg-gray-200' : 'bg-gray-50 hover:bg-gray-100'}
                                    ${period?.status === 'locked' ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
                                  `}
                                  title={status ? STATUS_LABELS[status] : 'Click để điểm danh'}
                                >
                                  {status ? STATUS_ICONS[status] : STATUS_ICONS.empty}
                                </button>
                              </td>
                            );
                          })}
                          <td className="px-4 py-3 text-center bg-blue-50">
                            <span className="font-medium">
                              {summary.totalDays || 0}/{summary.totalSessions || 0}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right bg-green-50">
                            <span className="font-medium text-green-700">
                              {new Intl.NumberFormat('vi-VN').format(summary.fee || 0)}đ
                            </span>
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
                        colSpan={scheduleDates.length} 
                        className="px-4 py-3 text-center text-sm text-gray-600"
                      >
                        {scheduleDates.length} buổi học trong tháng
                      </td>
                      <td className="px-4 py-3 text-center bg-blue-100">
                        {Object.values(feeSummary).reduce((sum, s) => sum + (s.totalDays || 0), 0)} buổi
                      </td>
                      <td className="px-4 py-3 text-right bg-green-100">
                        <span className="text-green-800">
                          {new Intl.NumberFormat('vi-VN').format(totalFee)}đ
                        </span>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {activeTab === 'periods' && (
        <>
          {/* Month Filter */}
          <div className="flex items-center gap-4">
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="input w-auto"
            />
          </div>

          {/* Periods List */}
          <div className="card">
            <div className="overflow-hidden">
              <table className="table">
                <thead>
                  <tr>
                    <th>Lớp</th>
                    <th>Tháng</th>
                    <th>Số buổi</th>
                    <th>Có mặt</th>
                    <th>Tổng tiền</th>
                    <th>Trạng thái</th>
                    <th>Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8">
                        <div className="spinner w-6 h-6 mx-auto"></div>
                      </td>
                    </tr>
                  ) : periods.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-gray-500">
                        Chưa có dữ liệu điểm danh cho tháng này
                      </td>
                    </tr>
                  ) : periods.map(p => (
                    <tr key={p.id}>
                      <td className="font-medium">{p.class_name}</td>
                      <td>{p.period_month}</td>
                      <td>{p.total_sessions || 0}</td>
                      <td>{p.total_present || 0}</td>
                      <td className="font-medium text-green-600">
                        {new Intl.NumberFormat('vi-VN').format(p.total_fee || 0)}đ
                      </td>
                      <td>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${PERIOD_STATUS[p.status]?.color}`}>
                          {PERIOD_STATUS[p.status]?.icon} {PERIOD_STATUS[p.status]?.label}
                        </span>
                      </td>
                      <td>
                        <div className="flex gap-2">
                          {p.status === 'open' && (
                            <button
                              onClick={() => handleSubmit(p.id)}
                              className="px-3 py-1 text-sm bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200"
                            >
                              Nộp duyệt
                            </button>
                          )}
                          {p.status === 'submitted' && isAdmin() && (
                            <button
                              onClick={() => handleApprove(p.id)}
                              className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
                            >
                              Duyệt
                            </button>
                          )}
                          {p.status === 'approved' && isAdmin() && (
                            <button
                              onClick={() => handleLock(p.id)}
                              className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                            >
                              🔒 Chốt
                            </button>
                          )}
                          {p.status !== 'open' && isAdmin() && (
                            <button
                              onClick={() => handleUnlock(p.id)}
                              className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                            >
                              Mở lại
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
