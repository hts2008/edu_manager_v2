import { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/api';

// VI: Context quản lý authentication state
const AuthContext = createContext(null);

export function normalizeAuthenticatedUser(user) {
  if (!user || !Array.isArray(user?.permissions)) return null;
  return { ...user, permissions: [...new Set(user.permissions.filter(Boolean))] };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check if user is logged in on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetchCurrentUser();
    } else {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const handleUnauthorized = () => {
      setUser(null);
      setLoading(false);
    };

    window.addEventListener("auth:unauthorized", handleUnauthorized);
    return () => {
      window.removeEventListener("auth:unauthorized", handleUnauthorized);
    };
  }, []);

  // Fetch current user from API
  const fetchCurrentUser = async () => {
    try {
      const response = await authService.me();
      const authenticatedUser = response.success
        ? normalizeAuthenticatedUser(response.data?.user)
        : null;
      if (!authenticatedUser) throw new Error('AUTH_PROFILE_UNAVAILABLE');
      setUser(authenticatedUser);
      setError(null);
    } catch {
      setUser(null);
      setError('AUTH_PROFILE_UNAVAILABLE');
    } finally {
      setLoading(false);
    }
  };

  // Login function
  const login = async (username, password, tenantSlug) => {
    setError(null);
    try {
      const response = await authService.login(username, password, tenantSlug);
      if (response.success) {
        localStorage.setItem('token', response.data.token);
        localStorage.removeItem('refreshToken');
        const currentUser = await authService.me();
        const authenticatedUser = currentUser.success
          ? normalizeAuthenticatedUser(currentUser.data?.user)
          : null;
        if (!authenticatedUser) {
          localStorage.removeItem('token');
          setUser(null);
          const authError = { code: 'AUTH_PROFILE_UNAVAILABLE', message: 'Không thể tải quyền truy cập. Vui lòng đăng nhập lại.' };
          setError(authError.message);
          return { success: false, error: authError };
        }
        setUser(authenticatedUser);
        return { success: true };
      } else {
        setError(response.error?.message || 'Đăng nhập thất bại');
        return { success: false, error: response.error };
      }
    } catch (err) {
      const message = err.message || 'Lỗi kết nối server';
      setError(message);
      return { success: false, error: { message } };
    }
  };

  // Logout function
  const logout = async () => {
    try {
      await authService.logout();
    } catch {
      // Ignore logout errors
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      setUser(null);
    }
  };

  // Check if user has specific role
  const hasRole = (role) => {
    return user?.role === role;
  };

  // Check if user is admin
  const isAdmin = () => hasRole('admin');

  const hasPermission = (permission) =>
    Boolean(permission && user?.permissions?.includes(permission));

  const value = {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    login,
    logout,
    hasRole,
    isAdmin,
    hasPermission,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// VI: Hook để sử dụng auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
