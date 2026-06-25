import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion as Motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Menu, User, Settings, LogOut, ChevronDown, Bell } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import ChangePasswordModal from "../auth/ChangePasswordModal";
import { getMotionTransition } from "../../design/motion";

const routeMeta = [
  { path: "/student-progress", title: "Tiến bộ học viên", group: "Báo cáo" },
  { path: "/", title: "Tổng quan", group: "Vận hành" },
  { path: "/students", title: "Học viên", group: "Vận hành" },
  { path: "/parents", title: "Phụ huynh", group: "Vận hành" },
  { path: "/classes", title: "Lớp học", group: "Vận hành" },
  { path: "/teachers", title: "Giáo viên", group: "Vận hành" },
  { path: "/attendance", title: "Điểm danh", group: "Vận hành" },
  { path: "/attendance-insights", title: "Insight điểm danh", group: "Vận hành" },
  { path: "/attendance-periods", title: "Chốt điểm danh", group: "Vận hành" },
  { path: "/receipts", title: "Phiếu thu", group: "Tài chính" },
  { path: "/fee-collection", title: "Thu tiền", group: "Tài chính" },
  { path: "/payments", title: "Chi tiền", group: "Tài chính" },
  { path: "/history", title: "Lịch sử giao dịch", group: "Tài chính" },
  { path: "/reports", title: "Trung tâm phân tích", group: "Báo cáo" },
  { path: "/advanced-reports", title: "Báo cáo nâng cao", group: "Báo cáo" },
  { path: "/audit-logs", title: "Nhật ký hệ thống", group: "Báo cáo" },
  { path: "/templates", title: "Mẫu in", group: "Quản trị" },
  { path: "/settings", title: "Cài đặt hệ thống", group: "Quản trị" },
  { path: "/users", title: "Quản lý nhân sự", group: "Quản trị" },
  { path: "/imports", title: "Nhập dữ liệu (CSV)", group: "Quản trị" },
  { path: "/fee-reminders", title: "Nhắc học phí", group: "Quản trị" },
  { path: "/backups", title: "Sao lưu an toàn", group: "Quản trị" },
  { path: "/recycle-bin", title: "Thùng rác", group: "Quản trị" },
];

function getRouteMeta(pathname) {
  return (
    routeMeta
      .filter((item) => pathname === item.path || pathname.startsWith(`${item.path}/`))
      .sort((a, b) => b.path.length - a.path.length)[0] || routeMeta[0]
  );
}

export default function Header({ onMenuClick }) {
  const { user, logout, isAdmin } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const currentRoute = useMemo(() => getRouteMeta(pathname), [pathname]);
  const roleLabel = user?.role === "admin" ? "Admin" : "Lễ tân";
  const reducedMotion = useReducedMotion();
  const routeMotion = reducedMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 } }
    : { initial: { opacity: 0, y: -6 }, animate: { opacity: 1, y: 0 } };
  const menuMotion = reducedMotion
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: getMotionTransition({ reduced: true }),
      }
    : {
        initial: { opacity: 0, y: 8, scale: 0.98 },
        animate: { opacity: 1, y: 0, scale: 1 },
        exit: { opacity: 0, y: 8, scale: 0.98 },
        transition: getMotionTransition({ duration: "fast" }),
      };

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/95 px-4 shadow-sm supports-[backdrop-filter]:bg-white/88 supports-[backdrop-filter]:backdrop-blur-xl lg:px-8">
      <div className="flex h-[72px] items-center justify-between gap-4">
        {/* Left Side: Mobile Menu Toggle & Title */}
        <div className="flex min-w-0 items-center gap-4">
          <button
            type="button"
            onClick={onMenuClick}
            className="rounded-xl p-2.5 text-slate-500 transition-all hover:bg-primary-50 hover:text-primary-600 lg:hidden"
            aria-label="Mở menu"
          >
            <Menu size={24} />
          </button>

          <Motion.div
            key={currentRoute.path}
            initial={routeMotion.initial}
            animate={routeMotion.animate}
            transition={getMotionTransition({ reduced: reducedMotion, duration: "fast" })}
            className="min-w-0"
          >
            <div className="mb-0.5 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-primary-600">
              <span>{currentRoute.group}</span>
              <span className="hidden h-1 w-1 rounded-full bg-cyan-400 sm:block" />
              <span className="hidden sm:inline tracking-widest text-slate-400">EduManager V2</span>
            </div>
            <h1 className="truncate text-xl font-black text-slate-950 tracking-tight sm:text-2xl">
              {currentRoute.title}
            </h1>
          </Motion.div>
        </div>

        {/* Right Side: Actions & Profile */}
        <div className="flex min-w-0 items-center gap-4">
          {/* Status Badge */}
          <div className="hidden items-center gap-2 rounded-full border border-emerald-200/70 bg-emerald-50 px-3 py-1.5 text-xs font-black tracking-wide text-emerald-700 md:flex shadow-sm">
            <span className="relative flex h-2.5 w-2.5">
              <span className="motion-safe:animate-ping motion-reduce:animate-none absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            SYSTEM ONLINE
          </div>

          <button
            type="button"
            aria-label="Thông báo"
            title={isAdmin() ? "Mở nhật ký hệ thống" : "Mở lịch sử giao dịch"}
            onClick={() => navigate(isAdmin() ? "/audit-logs" : "/history")}
            className="relative rounded-xl p-2.5 text-slate-400 transition-colors hover:bg-primary-50 hover:text-primary-600"
          >
            <Bell size={20} />
            <span className="absolute top-2 right-2.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white"></span>
          </button>

          {/* User Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowUserMenu((value) => !value)}
              className="flex items-center gap-3 rounded-2xl border border-slate-200/70 bg-white px-2 py-1.5 text-left shadow-sm transition-all hover:border-primary-200 hover:bg-primary-50/40 hover:shadow-md sm:px-3"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 via-violet-500 to-cyan-500 text-sm font-bold text-white shadow-inner">
                {user?.full_name?.charAt(0) || user?.username?.charAt(0) || "U"}
              </div>
              <div className="hidden min-w-0 sm:block pr-2">
                <p className="max-w-36 truncate text-sm font-bold text-slate-800 tracking-tight">
                  {user?.full_name || user?.username || "Admin"}
                </p>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-primary-600/80">{roleLabel}</p>
              </div>
              <ChevronDown size={16} className={`text-slate-400 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {showUserMenu && (
                <>
                  <button
                    type="button"
                    className="fixed inset-0 z-40 cursor-default"
                    onClick={() => setShowUserMenu(false)}
                  />
                  <Motion.div
                    {...menuMotion}
                    className="absolute right-0 z-50 mt-3 w-64 overflow-hidden rounded-2xl border border-slate-200/60 bg-white/95 backdrop-blur-xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)]"
                  >
                    <div className="border-b border-slate-100/80 px-5 py-4 bg-slate-50/50">
                      <p className="truncate text-sm font-black text-slate-900 tracking-tight">
                        {user?.full_name || user?.username}
                      </p>
                      <p className="mt-0.5 text-xs font-semibold text-primary-600">{roleLabel}</p>
                    </div>
                    <div className="p-2 space-y-1">
                      <div className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-600">
                        <User size={16} /> {user?.full_name || user?.username || "Tài khoản"}
                      </div>
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          setShowChangePassword(true);
                        }}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-primary-50 hover:text-primary-700"
                      >
                        <Settings size={16} /> Đổi mật khẩu
                      </button>
                    </div>
                    <div className="border-t border-slate-100/80 p-2 bg-slate-50/50">
                      <button
                        onClick={logout}
                        className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-rose-600 transition-colors hover:bg-rose-100 hover:text-rose-700"
                      >
                        <LogOut size={16} /> Đăng xuất
                      </button>
                    </div>
                  </Motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
      <ChangePasswordModal
        isOpen={showChangePassword}
        onClose={() => setShowChangePassword(false)}
      />
    </header>
  );
}
