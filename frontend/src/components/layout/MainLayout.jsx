import { useCallback, useEffect, useMemo, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Header from "./Header";
import Sidebar from "./Sidebar";
import PageTransition from "../ui/PageTransition";
import { useAuth } from "../../context/AuthContext";
import { shellPreferenceKey, readShellPreference, writeShellPreference } from "../../utils/shellPreference";

export default function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();
  const preferenceKey = shellPreferenceKey(user);
  const storedCollapsed = useMemo(() => readShellPreference(window.localStorage, preferenceKey), [preferenceKey]);
  const [preference, setPreference] = useState({ key: null, collapsed: false });
  const collapsed = preference.key === preferenceKey ? preference.collapsed : storedCollapsed;
  const toggleCollapsed = () => {
    writeShellPreference(window.localStorage, preferenceKey, !collapsed);
    setPreference({ key: preferenceKey, collapsed: !collapsed });
  };
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);
  const location = useLocation();

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1024px)");
    const closeOnDesktop = () => { if (desktop.matches) closeSidebar(); };
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, [closeSidebar]);

  return (
    <div className="teacher-shell eduflow-app-shell text-slate-900 selection:bg-blue-500/30" data-collapsed={collapsed}>
      <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} collapsed={collapsed} />

      <div className="teacher-shell-content" inert={sidebarOpen}>
        <Header onMenuClick={() => setSidebarOpen(true)} sidebarOpen={sidebarOpen}
          collapsed={collapsed} onCollapseClick={toggleCollapsed} />

        <main className="eduflow-main flex-1 w-full min-w-0 overflow-auto py-6">
          <div className="sr-only" role="status" aria-live="polite">
            Giao dien san sang
          </div>
          <PageTransition key={location.pathname}>
            <Outlet />
          </PageTransition>
        </main>

        <div className="h-safe-area-inset-bottom lg:hidden" />
      </div>
    </div>
  );
}
