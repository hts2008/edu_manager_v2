// VI: API service module - Gọi backend APIs

const API_BASE = "/api";

// Helper function to make API requests
async function request(endpoint, options = {}) {
  const token = localStorage.getItem("token");

  const config = {
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
    // Add 30-second timeout for all requests
    signal: options.signal || AbortSignal.timeout(30000),
  };

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, config);
    const data = await response.json();

    // Handle token expiry
    if (response.status === 401 && data.error?.code === "TOKEN_EXPIRED") {
      localStorage.removeItem("token");
      window.location.href = "/login";
      return { success: false, error: data.error };
    }

    return data;
  } catch (error) {
    console.error("API Error:", error);

    // Differentiate between timeout and network errors
    if (error.name === "TimeoutError" || error.name === "AbortError") {
      return {
        success: false,
        error: {
          code: "TIMEOUT",
          message: "Yêu cầu quá thời gian, vui lòng thử lại",
        },
      };
    }

    return {
      success: false,
      error: { code: "NETWORK_ERROR", message: "Không thể kết nối server" },
    };
  }
}

// Auth API
export const authService = {
  login: (username, password) =>
    request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),

  logout: () => request("/auth/logout", { method: "POST" }),

  me: () => request("/auth/me"),

  changePassword: (oldPassword, newPassword) =>
    request("/auth/change-password", {
      method: "POST",
      body: JSON.stringify({ oldPassword, newPassword }),
    }),
};

// Students API
export const studentsService = {
  getAll: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/students${query ? `?${query}` : ""}`);
  },
  getById: (id) => request(`/students?id=${id}`),
  create: (data) =>
    request("/students", { method: "POST", body: JSON.stringify(data) }),
  update: (id, data) =>
    request(`/students?id=${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  delete: (id) => request(`/students?id=${id}`, { method: "DELETE" }),
};

// Parents API
export const parentsService = {
  getAll: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/parents${query ? `?${query}` : ""}`);
  },
  getById: (id) => request(`/parents?id=${id}`),
  create: (data) =>
    request("/parents", { method: "POST", body: JSON.stringify(data) }),
  update: (id, data) =>
    request(`/parents?id=${id}`, { method: "PUT", body: JSON.stringify(data) }),
  delete: (id) => request(`/parents?id=${id}`, { method: "DELETE" }),
};

// Teachers API
export const teachersService = {
  getAll: () => request("/teachers"),
  getById: (id) => request(`/teachers?id=${id}`),
  create: (data) =>
    request("/teachers", { method: "POST", body: JSON.stringify(data) }),
  update: (id, data) =>
    request(`/teachers?id=${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  delete: (id) => request(`/teachers?id=${id}`, { method: "DELETE" }),
};

// Classes API
export const classesService = {
  getAll: () => request("/classes"),
  getById: (id) => request(`/classes?id=${id}`),
  create: (data) =>
    request("/classes", { method: "POST", body: JSON.stringify(data) }),
  update: (id, data) =>
    request(`/classes?id=${id}`, { method: "PUT", body: JSON.stringify(data) }),
  delete: (id) => request(`/classes?id=${id}`, { method: "DELETE" }),
  // Note: enrollStudent endpoint may need consolidation in future
  enrollStudent: (classId, studentId) =>
    request(`/classes?id=${classId}`, {
      method: "POST",
      body: JSON.stringify({ action: "enroll", student_id: studentId }),
    }),
};

// Attendance API
export const attendanceService = {
  getByDate: (date, classId) =>
    request(`/attendance?class_id=${classId}&date=${date}`),
  getByClassDate: (classId, date) =>
    request(`/attendance?class_id=${classId}&date=${date}`),
  getByStudentMonth: (studentId, month) =>
    request(`/attendance?student_id=${studentId}&month=${month}`),
  create: (data) =>
    request("/attendance", { method: "POST", body: JSON.stringify(data) }),
  bulkCreate: (records, classId, dates) =>
    request("/attendance/bulk", {
      method: "POST",
      body: JSON.stringify({ records, class_id: classId, dates }),
    }),
  calculateFee: (studentId, month) =>
    request(`/attendance/calculate-fee?student_id=${studentId}&month=${month}`),
};

// Receipts API
export const receiptsService = {
  getAll: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/receipts${query ? `?${query}` : ""}`);
  },
  getById: (id) => request(`/receipts/${id}`),
  create: (data) =>
    request("/receipts", { method: "POST", body: JSON.stringify(data) }),
  delete: (id) => request(`/receipts/${id}`, { method: "DELETE" }),
};

// Payments API
export const paymentsService = {
  getAll: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/payments${query ? `?${query}` : ""}`);
  },
  getById: (id) => request(`/payments/${id}`),
  create: (data) =>
    request("/payments", { method: "POST", body: JSON.stringify(data) }),
  delete: (id) => request(`/payments/${id}`, { method: "DELETE" }),
};

// Templates API
export const templatesService = {
  getAll: (type) => request(`/templates${type ? `?type=${type}` : ""}`),
  getById: (id) => request(`/templates/${id}`),
  getDefault: (type) => request(`/templates/default/${type}`),
  create: (data) =>
    request("/templates", { method: "POST", body: JSON.stringify(data) }),
  update: (id, data) =>
    request(`/templates/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  delete: (id) => request(`/templates/${id}`, { method: "DELETE" }),
  setDefault: (id) =>
    request(`/templates/${id}/set-default`, { method: "POST" }),
  uploadImage: (file) => {
    const formData = new FormData();
    formData.append("image", file);
    return fetch(`${API_BASE}/templates/upload-image`, {
      method: "POST",
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      body: formData,
    }).then((r) => r.json());
  },
};

// Reports API
export const reportsService = {
  getDashboard: () => request("/reports/dashboard"),
  getFinancial: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/reports/financial${query ? `?${query}` : ""}`);
  },
  getUnpaidStudents: (month) =>
    request(`/reports/unpaid-students${month ? `?month=${month}` : ""}`),
};

// Attendance Periods API (SAP Timesheet-style)
export const attendancePeriodsService = {
  getAll: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/attendance-periods${query ? `?${query}` : ""}`);
  },
  getById: (id) => request(`/attendance-periods/${id}`),
  create: (data) =>
    request("/attendance-periods", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  submit: (id) =>
    request(`/attendance-periods/${id}?action=submit`, { method: "POST" }),
  approve: (id) =>
    request(`/attendance-periods/${id}?action=approve`, { method: "POST" }),
  lock: (id) =>
    request(`/attendance-periods/${id}?action=lock`, { method: "POST" }),
  unlock: (id) =>
    request(`/attendance-periods/${id}?action=unlock`, { method: "POST" }),
  reject: (id, reason) =>
    request(`/attendance-periods/${id}?action=reject`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    }),
};

// Monthly Fees API (Fee Collection with Status)
export const monthlyFeesService = {
  getAll: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/monthly-fees${query ? `?${query}` : ""}`);
  },
  getById: (id) => request(`/monthly-fees/${id}`),
  calculate: (data) =>
    request("/monthly-fees/calculate", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  confirm: (id) => request(`/monthly-fees/${id}/confirm`, { method: "POST" }),
  pay: (id, data) =>
    request(`/monthly-fees/${id}/pay`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  cancel: (id) => request(`/monthly-fees/${id}/cancel`, { method: "POST" }),
};
