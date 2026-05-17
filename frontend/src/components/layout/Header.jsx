import { useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const routeMeta = [
  { path: "/", title: "Tổng quan", group: "Vận hành" },
  { path: "/students", title: "Học viên", group: "Vận hành" },
  { path: "/parents", title: "Phụ huynh", group: "Vận hành" },
  { path: "/classes", title: "Lớp học", group: "Vận hành" },
  { path: "/teachers", title: "Giáo viên", group: "Vận hành" },
  { path: "/attendance", title: "Điểm danh", group: "Vận hành" },
  { path: "/attendance-insights", title: "Insight điểm danh", group: "Vận hành" },
  { path: "/attendance-periods", title: "Chốt điểm danh", group: "Vận hành" },
  { path: "/receipts", title: "Thu tiền", group: "Tài chính" },
  { path: "/fee-collection", title: "Thu học phí", group: "Tài chính" },
  { path: "/payments", title: "Chi tiền", group: "Tài chính" },
  { path: "/history", title: "Lịch sử", group: "Tài chính" },
  { path: "/reports", title: "Báo cáo", group: "Báo cáo" },
  { path: "/advanced-reports", title: "Báo cáo nâng cao", group: "Báo cáo" },
  { path: "/audit-logs", title: "Nhật ký", group: "Báo cáo" },
  { path: "/templates", title: "Mẫu in", group: "Quản trị" },
  { path: "/settings", title: "Cài đặt", group: "Quản trị" },
  { path: "/users", title: "Người dùng", group: "Quản trị" },
  { path: "/imports", title: "Import CSV", group: "Quản trị" },
  { path: "/fee-reminders", title: "Nhắc học phí", group: "Quản trị" },
  { path: "/backups", title: "Sao lưu", group: "Quản trị" },
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
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const currentRoute = useMemo(() => getRouteMeta(pathname), [pathname]);
  const roleLabel = user?.role === "admin" ? "Admin" : "Lễ tân";

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 px-4 backdrop-blur-xl lg:px-6">
      <div className="flex h-16 items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onMenuClick}
            className="rounded-lg p-2 text-slate-600 transition-colors hover:bg-slate-100 lg:hidden"
            aria-label="Mở menu"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
              <span>{currentRoute.group}</span>
              <span className="hidden h-1 w-1 rounded-full bg-slate-300 sm:block" />
              <span className="hidden sm:inline">Production</span>
            </div>
            <h1 className="truncate text-lg font-bold text-slate-950 sm:text-xl">
              {currentRoute.title}
            </h1>
          </div>
        </div>

        <div className="flex min-w-0 items-center gap-3">
          <div className="hidden items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 md:flex">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Online
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => setShowUserMenu((value) => !value)}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-left shadow-sm transition-colors hover:bg-slate-50 sm:px-3"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-sm font-bold text-blue-700">
                {user?.full_name?.charAt(0) || user?.username?.charAt(0) || "U"}
              </div>
              <div className="hidden min-w-0 sm:block">
                <p className="max-w-36 truncate text-sm font-semibold text-slate-900">
                  {user?.full_name || user?.username || "User"}
                </p>
                <p className="text-xs text-slate-500">{roleLabel}</p>
              </div>
              <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showUserMenu && (
              <>
                <button
                  type="button"
                  aria-label="Đóng menu người dùng"
                  className="fixed inset-0 z-40"
                  onClick={() => setShowUserMenu(false)}
                />
                <div className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10">
                  <div className="border-b border-slate-100 px-4 py-3">
                    <p className="truncate text-sm font-bold text-slate-950">
                      {user?.full_name || user?.username}
                    </p>
                    <p className="text-xs text-slate-500">{roleLabel}</p>
                  </div>
                  <button className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50">
                    Thông tin cá nhân
                  </button>
                  <button className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50">
                    Đổi mật khẩu
                  </button>
                  <div className="border-t border-slate-100 p-2">
                    <button
                      type="button"
                      onClick={logout}
                      className="flex w-full items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50"
                    >
                      Đăng xuất
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
