import { useState, useEffect } from 'react';
import { classesService, attendanceService, studentsService } from '../services/api';

// VI: Trang điểm danh học viên theo lớp/ngày
export default function AttendancePage() {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    loadClasses();
  }, []);

  useEffect(() => {
    if (selectedClass && selectedDate) {
      loadAttendance();
    }
  }, [selectedClass, selectedDate]);

  const loadClasses = async () => {
    const response = await classesService.getAll();
    if (response.success) {
      setClasses(response.data.classes || []);
    }
  };

  const loadAttendance = async () => {
    setLoading(true);
    setMessage({ type: '', text: '' });
    
    // Get class details including students
    const classRes = await classesService.getById(selectedClass);
    if (classRes.success) {
      const classStudents = classRes.data.students || [];
      setStudents(classStudents);
      
      // Get attendance for this date if exists
      const attRes = await attendanceService.getByDate(selectedDate, selectedClass);
      const attMap = {};
      
      if (attRes.success && attRes.data.attendance) {
        attRes.data.attendance.forEach(a => {
          attMap[a.student_id] = a.status;
        });
      }
      
      // Set default 'present' for students without attendance record
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
    setAttendance(prev => ({
      ...prev,
      [studentId]: status
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage({ type: '', text: '' });

    const records = students.map(s => ({
      student_id: s.id,
      class_id: selectedClass,
      attendance_date: selectedDate,
      status: attendance[s.id] || 'present'
    }));

    const response = await attendanceService.bulkCreate(records);
    
    if (response.success) {
      setMessage({ type: 'success', text: 'Đã lưu điểm danh thành công!' });
    } else {
      setMessage({ type: 'error', text: response.error?.message || 'Không thể lưu điểm danh' });
    }
    setSaving(false);
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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Điểm danh</h1>
        <p className="text-gray-500">Điểm danh học viên theo lớp và ngày</p>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            <div className="flex items-end">
              <button
                onClick={handleSave}
                disabled={!selectedClass || students.length === 0 || saving}
                className="btn-primary w-full"
              >
                {saving ? 'Đang lưu...' : 'Lưu điểm danh'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Message */}
      {message.text && (
        <div className={`p-4 rounded-xl border ${
          message.type === 'success' 
            ? 'bg-green-50 border-green-200 text-green-700' 
            : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          {message.text}
        </div>
      )}

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
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                              attendance[student.id] === status
                                ? getStatusColor(status)
                                : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                            }`}
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
    </div>
  );
}
