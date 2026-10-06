import { useMemo, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { motion as Motion, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  Building2,
  GraduationCap,
  Landmark,
  LayoutDashboard,
  Menu,
  PlugZap,
  Search,
  Settings2,
  ShieldCheck,
  WalletCards,
  X,
} from "lucide-react";
import { getMotionTransition } from "../design/motion";
import { filterConsoleNavigation } from "./consoleManifest";
import { useAuth } from "../context/AuthContext";

const consoleIcons = {
  "building-2": Building2,
  "graduation-cap": GraduationCap,
  landmark: Landmark,
  "layout-dashboard": LayoutDashboard,
  "plug-zap": PlugZap,
  "settings-2": Settings2,
  "shield-check": ShieldCheck,
  "wallet-cards": WalletCards,
};

function ConsoleNavigation({ items, onNavigate }) {
  if (!items.length) {
    return (
      <p className="rounded-xl border border-dashed border-slate-300 px-3 py-5 text-center text-sm text-slate-500" role="status">
        Không tìm thấy mục cấu hình phù hợp.
      </p>
    );
  }

  return (
    <nav aria-label="Điều hướng Admin Console" className="space-y-1.5">
      {items.map((item) => {
        const Icon = consoleIcons[item.icon] || Settings2;

        return (
          <NavLink
            key={item.id}
            to={item.path}
            end={item.path === "/admin"}
            onClick={onNavigate}
            className={({ isActive }) =>
              `group flex min-h-12 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition-colors motion-reduce:transition-none ${
                isActive
                  ? "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
              }`
            }
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-slate-500 shadow-sm ring-1 ring-slate-200 group-hover:text-indigo-600">
              <Icon size={18} aria-hidden="true" />
            </span>
            <span className="min-w-0 truncate">{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}

export default function ConsoleLayout() {
  const { user } = useAuth();
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);
  const [query, setQuery] = useState("");
  const reducedMotion = useReducedMotion();
  const navigation = useMemo(
    () => filterConsoleNavigation(query, {
      isPlatformOwner: user?.is_platform_owner === true,
      permissions: user?.permissions || [],
    }),
    [query, user?.is_platform_owner, user?.permissions],
  );

  const sidebarContent = (
    <>
      <div className="border-b border-slate-200 px-4 py-5">
        <p className="text-[11px] font-black uppercase tracking-[0.16em] text-indigo-600">Control plane</p>
        <h1 className="mt-1 text-xl font-black text-slate-950">Admin Console</h1>
        <p className="mt-1 text-xs leading-5 text-slate-500">Cấu hình hệ thống theo đúng phạm vi quyền.</p>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-3 py-4">
        <label className="relative block">
          <span className="sr-only">Tìm trong Admin Console</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm cài đặt..."
            className="input min-h-11 w-full min-w-0 pl-10"
          />
        </label>
        <div>
          <ConsoleNavigation items={navigation} onNavigate={() => setMobileNavigationOpen(false)} />
        </div>
      </div>

      <div className="border-t border-slate-200 p-3">
        <NavLink to="/" className="btn-secondary flex min-h-11 w-full items-center justify-center gap-2">
          <ArrowLeft size={17} aria-hidden="true" />
          Về ứng dụng
        </NavLink>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen min-w-0 bg-slate-50 text-slate-900">
      <aside className="sticky top-0 hidden h-screen w-[288px] shrink-0 flex-col border-r border-slate-200 bg-white lg:flex">
        {sidebarContent}
      </aside>

      {mobileNavigationOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Menu Admin Console"
          onKeyDown={(event) => {
            if (event.key === "Escape") setMobileNavigationOpen(false);
          }}
        >
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/35 backdrop-blur-sm"
            onClick={() => setMobileNavigationOpen(false)}
            aria-label="Đóng menu Admin Console"
          />
          <Motion.aside
            initial={reducedMotion ? { opacity: 0 } : { opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={getMotionTransition({ reduced: reducedMotion, duration: "fast" })}
            className="relative flex h-full w-[min(88vw,320px)] flex-col bg-white shadow-2xl"
          >
            <button
              type="button"
              onClick={() => setMobileNavigationOpen(false)}
              className="absolute right-3 top-3 z-10 rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              aria-label="Đóng menu"
            >
              <X size={20} />
            </button>
            {sidebarContent}
          </Motion.aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex min-h-[68px] items-center gap-3 border-b border-slate-200 bg-white/95 px-4 shadow-sm supports-[backdrop-filter]:backdrop-blur-xl sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => setMobileNavigationOpen(true)}
            className="rounded-xl p-2.5 text-slate-600 hover:bg-slate-100 lg:hidden"
            aria-label="Mở menu Admin Console"
          >
            <Menu size={22} />
          </button>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-indigo-600">EduManager V2</p>
            <p className="truncate text-base font-black text-slate-950 sm:text-lg">Trung tâm điều khiển</p>
          </div>
          <span className="ml-auto rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 ring-1 ring-emerald-100">
            Phiên quản trị
          </span>
        </header>

        <main className="min-w-0 flex-1 px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
          <div className="sr-only" role="status" aria-live="polite">Admin Console sẵn sàng</div>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
