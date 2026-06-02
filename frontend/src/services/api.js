// VI: API service module - Gọi backend APIs

const API_BASE = (import.meta.env.VITE_API_BASE || "/api").replace(/\/$/, "");
const RETRYABLE_METHODS = new Set(["GET", "HEAD"]);
const GET_CACHE_TTL_MS = 15_000;
const getResponseCache = new Map();
const inFlightGetRequests = new Map();
const NON_CACHEABLE_GET_PATTERNS = [
  /\/pdf(?:$|[/?#])/i,
  /upload/i,
  /parent-portal/i,
];

let cacheVersion = 0;

function invalidateGetCache() {
  cacheVersion += 1;
  getResponseCache.clear();
  inFlightGetRequests.clear();
}

function shouldUseGetCache(method, endpoint, options) {
  return (
    method === "GET" &&
    !options.signal &&
    options.cache !== "no-store" &&
    options.skipCache !== true &&
    !NON_CACHEABLE_GET_PATTERNS.some((pattern) => pattern.test(endpoint))
  );
}

function getCacheKey(endpoint, token, options) {
  const headers = options.headers
    ? JSON.stringify(Object.entries(options.headers).sort())
    : "";
  return `${token || "anonymous"}::${endpoint}::${headers}`;
}

function getCachedResponse(cacheKey) {
  const cached = getResponseCache.get(cacheKey);
  if (!cached) return null;

  if (cached.expiresAt <= Date.now()) {
    getResponseCache.delete(cacheKey);
    return null;
  }

  return cached.data;
}

function shouldCacheResponse(data) {
  return data?.success !== false;
}

function isUnauthorized(response, data) {
  if (response.status !== 401) return false;
  const code = data?.error?.code;
  return (
    code === "TOKEN_EXPIRED" ||
    code === "TOKEN_INVALID" ||
    code === "UNAUTHORIZED"
  );
}

function handleUnauthorized(data) {
  invalidateGetCache();
  localStorage.removeItem("token");
  localStorage.removeItem("refreshToken");
  window.dispatchEvent(
    new CustomEvent("auth:unauthorized", { detail: data?.error || null })
  );
}

async function parseResponse(response) {
  const text = await response.text();
  if (!text) {
    return {
      success: response.ok,
      data: response.ok ? null : undefined,
      error: response.ok
        ? undefined
        : { code: `HTTP_${response.status}`, message: response.statusText },
    };
  }

  try {
    return JSON.parse(text);
  } catch {
    return {
      success: false,
      error: {
        code: "INVALID_RESPONSE",
        message: "Server returned an invalid response",
      },
    };
  }
}

async function fetchWithRetry(endpoint, config, retries) {
  let lastNetworkError = null;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(`${API_BASE}${endpoint}`, config);
      const data = await parseResponse(response);

      if (isUnauthorized(response, data)) {
        handleUnauthorized(data);
        return { success: false, error: data.error };
      }

      if (!response.ok && data.success !== false) {
        return {
          success: false,
          error: {
            code: `HTTP_${response.status}`,
            message: response.statusText || "Request failed",
          },
        };
      }

      if (response.status >= 500 && attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, 250));
        continue;
      }

      return data;
    } catch (error) {
      lastNetworkError = error;
      if (attempt < retries && error.name !== "AbortError") {
        await new Promise((resolve) => setTimeout(resolve, 250));
        continue;
      }
      throw error;
    }
  }

  throw lastNetworkError || new Error("Request failed");
}

function normalizeRequestError(error) {
  if (import.meta.env.DEV) {
    console.error("API Error:", error);
  }

  if (error.name === "TimeoutError" || error.name === "AbortError") {
    return {
      success: false,
      error: {
        code: "TIMEOUT",
        message: "Yeu cau qua thoi gian, vui long thu lai",
      },
    };
  }

  return {
    success: false,
    error: {
      code: "NETWORK_ERROR",
      message: "Khong the ket noi server",
    },
  };
}

// Helper function to make API requests
async function request(endpoint, options = {}) {
  const token = localStorage.getItem("token");
  const method = String(options.method || "GET").toUpperCase();
  const retries = options.retries ?? (RETRYABLE_METHODS.has(method) ? 1 : 0);
  const useGetCache = shouldUseGetCache(method, endpoint, options);

  if (method !== "GET") {
    invalidateGetCache();
  }

  const config = {
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
      ...(options.headers || {}),
    },
    ...options,
    // Add 30-second timeout for all requests
    signal: options.signal || AbortSignal.timeout(30000),
  };

  if (useGetCache) {
    const cacheKey = getCacheKey(endpoint, token, options);
    const cached = getCachedResponse(cacheKey);
    if (cached) return cached;

    const inFlight = inFlightGetRequests.get(cacheKey);
    if (inFlight) return inFlight;

    const requestCacheVersion = cacheVersion;
    let requestPromise;
    requestPromise = fetchWithRetry(endpoint, config, retries)
      .then((data) => {
        if (
          cacheVersion === requestCacheVersion &&
          shouldCacheResponse(data)
        ) {
          getResponseCache.set(cacheKey, {
            data,
            expiresAt: Date.now() + GET_CACHE_TTL_MS,
          });
        }
        return data;
      })
      .catch(normalizeRequestError)
      .finally(() => {
        if (inFlightGetRequests.get(cacheKey) === requestPromise) {
          inFlightGetRequests.delete(cacheKey);
        }
      });

    inFlightGetRequests.set(cacheKey, requestPromise);
    return requestPromise;
  }

  try {
    let lastNetworkError = null;

    for (let attempt = 0; attempt <= retries; attempt += 1) {
      try {
        const response = await fetch(`${API_BASE}${endpoint}`, config);
        const data = await parseResponse(response);

        if (isUnauthorized(response, data)) {
          handleUnauthorized(data);
          return { success: false, error: data.error };
        }

        if (!response.ok && data.success !== false) {
          return {
            success: false,
            error: {
              code: `HTTP_${response.status}`,
              message: response.statusText || "Request failed",
            },
          };
        }

        if (response.status >= 500 && attempt < retries) {
          await new Promise((resolve) => setTimeout(resolve, 250));
          continue;
        }

        return data;
      } catch (error) {
        lastNetworkError = error;
        if (attempt < retries && error.name !== "AbortError") {
          await new Promise((resolve) => setTimeout(resolve, 250));
          continue;
        }
        throw error;
      }
    }

    throw lastNetworkError || new Error("Request failed");
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error("API Error:", error);
    }

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
  getAll: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/classes${query ? `?${query}` : ""}`);
  },
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
  getInsights: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/attendance/insights${query ? `?${query}` : ""}`);
  },
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
  correct: (id, data = {}) =>
    request(`/receipts/${id}/correct`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
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

// Bulk Actions API
export const bulkActionsService = {
  execute: ({ resource, action, ids }) =>
    request("/bulk-actions", {
      method: "POST",
      body: JSON.stringify({ resource, action, ids }),
    }),
};

// Import API
export const importService = {
  previewStudents: (csv) =>
    request("/import/students", {
      method: "POST",
      body: JSON.stringify({ mode: "preview", csv }),
    }),
  commitStudents: (csv) =>
    request("/import/students", {
      method: "POST",
      body: JSON.stringify({ mode: "commit", csv }),
    }),
};

// Backups API
export const backupsService = {
  run: (dryRun = true) =>
    request("/backups", {
      method: "POST",
      body: JSON.stringify({ action: "run", dry_run: dryRun }),
    }),
  verify: (url) =>
    request("/backups", {
      method: "POST",
      body: JSON.stringify({ action: "verify", url }),
    }),
};

// Recycle Bin API
export const recycleBinService = {
  getAll: (resource) =>
    request(`/recycle-bin${resource ? `?resource=${resource}` : ""}`),
  restore: (resource, id) =>
    request("/recycle-bin", {
      method: "POST",
      body: JSON.stringify({ resource, id, action: "restore" }),
    }),
  purge: (resource, id) =>
    request("/recycle-bin", {
      method: "POST",
      body: JSON.stringify({ resource, id, action: "purge" }),
    }),
};

// Fee Reminders API
export const feeRemindersService = {
  preview: (month) =>
    request(`/fee-reminders${month ? `?month=${month}` : ""}`),
  send: (month, dryRun = true) =>
    request("/fee-reminders", {
      method: "POST",
      body: JSON.stringify({ month, dry_run: dryRun }),
    }),
};

async function parentPortalRequest(endpoint, options = {}) {
  const token = localStorage.getItem("parentPortalToken");
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
      ...(options.headers || {}),
    },
    ...options,
  });
  return parseResponse(response);
}

// Parent Portal API
export const parentPortalService = {
  login: (data) =>
    parentPortalRequest("/parent-portal/login", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  me: () => parentPortalRequest("/parent-portal/me"),
  logout: () => {
    localStorage.removeItem("parentPortalToken");
  },
};

// Templates API
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      resolve(result.includes(",") ? result.split(",")[1] : result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

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
  uploadImage: async (file) => {
    const base64 = await fileToBase64(file);
    return request("/templates/upload-image", {
      method: "POST",
      body: JSON.stringify({
        filename: file.name,
        contentType: file.type || "application/octet-stream",
        base64,
      }),
    });
  },
};

// Reports API
export const reportsService = {
  getDashboard: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/reports/dashboard${query ? `?${query}` : ""}`);
  },
  getAdvanced: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/reports/advanced${query ? `?${query}` : ""}`);
  },
  getFinancial: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/reports/financial${query ? `?${query}` : ""}`);
  },
  getFinanceDashboard: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/reports/finance-dashboard${query ? `?${query}` : ""}`);
  },
  getStudentFees: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/reports/student-fees${query ? `?${query}` : ""}`);
  },
  getUnpaidStudents: (month) =>
    request(`/reports/unpaid-students${month ? `?month=${month}` : ""}`),
};

// Activity Logs API
export const activityLogsService = {
  getAll: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/activity-logs${query ? `?${query}` : ""}`);
  },
};

// Center Settings API
export const centerSettingsService = {
  get: () => request("/center-settings"),
  update: (data) =>
    request("/center-settings", {
      method: "PUT",
      body: JSON.stringify(data),
    }),
};

// Users API
export const usersService = {
  getAll: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/users${query ? `?${query}` : ""}`);
  },
  getById: (id) => request(`/users/${id}`),
  create: (data) =>
    request("/users", { method: "POST", body: JSON.stringify(data) }),
  update: (id, data) =>
    request(`/users/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deactivate: (id) => request(`/users/${id}`, { method: "DELETE" }),
  resetPassword: (id, password) =>
    request(`/users/${id}/reset-password`, {
      method: "POST",
      body: JSON.stringify({ password }),
    }),
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
  getWorkbench: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/monthly-fees/workbench${query ? `?${query}` : ""}`);
  },
  getById: (id) => request(`/monthly-fees/${id}`),
  calculate: (studentOrData, month) => {
    const payload =
      typeof studentOrData === "object"
        ? studentOrData
        : { student_id: studentOrData, month };
    return request("/monthly-fees/calculate", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  generate: (data = {}) =>
    request("/monthly-fees/generate", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  confirm: (id) => request(`/monthly-fees/${id}/confirm`, { method: "POST" }),
  pay: (id, paymentMethodOrData) => {
    const payload =
      typeof paymentMethodOrData === "object"
        ? paymentMethodOrData
        : { payment_method: paymentMethodOrData };
    return request(`/monthly-fees/${id}/pay`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  bulkPay: (data = {}) =>
    request("/monthly-fees/bulk-pay", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  cancel: (id) => request(`/monthly-fees/${id}/cancel`, { method: "POST" }),
};
