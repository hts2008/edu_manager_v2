import { useState, useEffect } from 'react';
import { classesService, attendanceService, attendancePeriodsService } from '../services/api';
import { useToast } from '../components/ui/Toast';
import { useAuth } from '../context/AuthContext';

// VI: Trang điểm danh với tabs và lock workflow

const PERIOD_STATUS = {
  open: { label: 'Đang mở', color: 'bg-green-100 text-green-700', icon: '🟢' },
  submitted: { label: 'Đã nộp', color: 'bg-yellow-100 text-yellow-700', icon: '🟡' },
  approved: { label: 'Đã duyệt', color: 'bg-blue-100 text-blue-700', icon: '🔵' },
  locked: { label: 'Đã chốt', color: 'bg-gray-100 text-gray-700', icon: '🔒' },
};

export default function AttendancePage() {
  const [activeTab, setActiveTab] = useState('class'); // class, periods
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [period, setPeriod] = useState(null);
  const [periods, setPeriods] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const { user, isAdmin } = useAuth();

  useEffect(() => {
    loadClasses();
  }, []);

  useEffect(() => {
    if (selectedClass && selectedDate) {
      loadAttendance();
    }
  }, [selectedClass, selectedDate]);

  useEffect(() => {
    if (selectedClass && selectedMonth) {
      loadPeriod();
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

  const loadPeriod = async () => {
    const res = await attendancePeriodsService.getAll({ class_id: selectedClass, month: selectedMonth });
    if (res.success && res.data.periods?.length > 0) {
      setPeriod(res.data.periods[0]);
    } else {
      setPeriod(null);
    }
  };

  const loadAllPeriods = async () => {
    setLoading(true);
    const res = await attendancePeriodsService.getAll({ month: selectedMonth });
    if (res.success) {
      setPeriods(res.data.periods || []);
    }
    setLoading(false);
  };

  const loadAttendance = async () => {
    setLoading(true);
    
    const classRes = await classesService.getById(selectedClass);
    if (classRes.success) {
      const classStudents = classRes.data.students || [];
      setStudents(classStudents);
      
      const attRes = await attendanceService.getByDate(selectedDate, selectedClass);
      const attMap = {};
      
      if (attRes.success && attRes.data.attendance) {
        attRes.data.attendance.forEach(a => {
          attMap[a.student_id] = a.status;
        });
      }
      
      classStudents.forEach(s => {
        if (!attMap[s.id]) {
          attMap[s.id] = 'present';
        }
      });
      
      setAttendance(attMap);
    }
    setLoading(false);
  };

  const handleStatusChange = (studentId, status) => {
    if (period?.status === 'locked') {
      toast.error('Không thể sửa điểm danh đã chốt');
      return;
    }
    setAttendance(prev => ({
      ...prev,
      [studentId]: status
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
      await attendancePeriodsService.create({ class_id: selectedClass, month: selectedMonth });
      await loadPeriod();
    }

    const records = students.map(s => ({
      student_id: s.id,
      class_id: selectedClass,
      attendance_date: selectedDate,
      status: attendance[s.id] || 'present'
    }));

    const response = await attendanceService.bulkCreate(records);
    
    if (response.success) {
      toast.success('Đã lưu điểm danh thành công!');
    } else {
      toast.error(response.error?.message || 'Không thể lưu điểm danh');
    }
    setSaving(false);
  };

  const handleSubmit = async (periodId) => {
    const res = await attendancePeriodsService.submit(periodId);
    if (res.success) {
      toast.success('Đã gửi điểm danh để duyệt');
      loadAllPeriods();
      loadPeriod();
    } else {
      toast.error(res.error?.message || 'Lỗi');
    }
  };

  const handleApprove = async (periodId) => {
    const res = await attendancePeriodsService.approve(periodId);
    if (res.success) {
      toast.success('Đã duyệt điểm danh');
      loadAllPeriods();
      loadPeriod();
    } else {
      toast.error(res.error?.message || 'Lỗi');
    }
  };

  const handleLock = async (periodId) => {
    const res = await attendancePeriodsService.lock(periodId);
    if (res.success) {
      toast.success('Đã chốt điểm danh và tạo phí học');
      loadAllPeriods();
      loadPeriod();
    } else {
      toast.error(res.error?.message || 'Lỗi');
    }
  };

  const handleUnlock = async (periodId) => {
    const res = await attendancePeriodsService.unlock(periodId);
    if (res.success) {
      toast.success('Đã mở lại điểm danh');
      loadAllPeriods();
      loadPeriod();
    } else {
      toast.error(res.error?.message || 'Lỗi');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'present': return 'bg-green-100 text-green-700 border-green-300';
      case 'absent_with_fee': return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'absent_no_fee': return 'bg-red-100 text-red-700 border-red-300';
      default: return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const statusLabels = {
    present: 'Có mặt',
    absent_with_fee: 'Nghỉ có phép',
    absent_no_fee: 'Nghỉ không phép'
  };

  const presentCount = Object.values(attendance).filter(s => s === 'present').length;
  const absentWithFeeCount = Object.values(attendance).filter(s => s === 'absent_with_fee').length;
  const absentNoFeeCount = Object.values(attendance).filter(s => s === 'absent_no_fee').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">📋 Điểm danh</h1>
          <p className="text-gray-500">Điểm danh học viên và quản lý chốt tháng</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setActiveTab('class')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeTab === 'class'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Điểm danh theo ngày
        </button>
        <button
          onClick={() => setActiveTab('periods')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeTab === 'periods'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Quản lý chốt tháng
        </button>
      </div>

      {activeTab === 'class' && (
        <>
          {/* Filters */}
          <div className="card">
            <div className="card-body">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ngày</label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái tháng</label>
                  <div className="input bg-gray-50">
                    {period ? (
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${PERIOD_STATUS[period.status]?.color}`}>
                        {PERIOD_STATUS[period.status]?.icon} {PERIOD_STATUS[period.status]?.label}
                      </span>
                    ) : (
                      <span className="text-gray-400">Chưa có dữ liệu</span>
                    )}
                  </div>
                </div>
                <div className="flex items-end">
                  <button
                    onClick={handleSave}
                    disabled={!selectedClass || students.length === 0 || saving || period?.status === 'locked'}
                    className="btn-primary w-full"
                  >
                    {saving ? 'Đang lưu...' : 'Lưu điểm danh'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Summary Stats */}
          {selectedClass && students.length > 0 && (
            <div className="grid grid-cols-3 gap-4">
              <div className="card bg-green-50 border-green-200">
                <div className="card-body text-center">
                  <p className="text-3xl font-bold text-green-600">{presentCount}</p>
                  <p className="text-sm text-green-700">Có mặt</p>
                </div>
              </div>
              <div className="card bg-yellow-50 border-yellow-200">
                <div className="card-body text-center">
                  <p className="text-3xl font-bold text-yellow-600">{absentWithFeeCount}</p>
                  <p className="text-sm text-yellow-700">Nghỉ có phép</p>
                </div>
              </div>
              <div className="card bg-red-50 border-red-200">
                <div className="card-body text-center">
                  <p className="text-3xl font-bold text-red-600">{absentNoFeeCount}</p>
                  <p className="text-sm text-red-700">Nghỉ không phép</p>
                </div>
              </div>
            </div>
          )}

          {/* Student List */}
          {loading ? (
            <div className="card">
              <div className="card-body text-center py-12">
                <div className="spinner w-8 h-8 mx-auto mb-4"></div>
                <p className="text-gray-500">Đang tải danh sách...</p>
              </div>
            </div>
          ) : !selectedClass ? (
            <div className="card">
              <div className="card-body text-center py-12 text-gray-500">
                Vui lòng chọn lớp học để điểm danh
              </div>
            </div>
          ) : students.length === 0 ? (
            <div className="card">
              <div className="card-body text-center py-12 text-gray-500">
                Lớp học này chưa có học viên nào
              </div>
            </div>
          ) : (
            <div className="card">
              <div className="overflow-hidden">
                <table className="table">
                  <thead>
                    <tr>
                      <th className="w-12">#</th>
                      <th>Học viên</th>
                      <th className="text-center">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student, index) => (
                      <tr key={student.id}>
                        <td className="text-gray-500">{index + 1}</td>
                        <td>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                              <span className="font-medium text-primary-700">
                                {student.full_name?.charAt(0)}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{student.full_name}</p>
                              <p className="text-xs text-gray-500">{student.id}</p>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="flex justify-center gap-2">
                            {Object.entries(statusLabels).map(([status, label]) => (
                              <button
                                key={status}
                                onClick={() => handleStatusChange(student.id, status)}
                                disabled={period?.status === 'locked'}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                                  attendance[student.id] === status
                                    ? getStatusColor(status)
                                    : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                                } ${period?.status === 'locked' ? 'opacity-50 cursor-not-allowed' : ''}`}
                              >
                                {label}
                              </button>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
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
                    <th>Trạng thái</th>
                    <th>Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8">
                        <div className="spinner w-6 h-6 mx-auto"></div>
                      </td>
                    </tr>
                  ) : periods.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-gray-500">
                        Chưa có dữ liệu điểm danh cho tháng này
                      </td>
                    </tr>
                  ) : periods.map(p => (
                    <tr key={p.id}>
                      <td className="font-medium">{p.class_name}</td>
                      <td>{p.period_month}</td>
                      <td>{p.total_sessions || 0}</td>
                      <td>{p.total_present || 0}</td>
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
