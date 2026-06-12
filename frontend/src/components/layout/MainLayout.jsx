import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Header from "./Header";
import Sidebar from "./Sidebar";
import PageTransition from "../ui/PageTransition";

export default function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="eduflow-app-shell flex min-h-screen text-slate-900 selection:bg-blue-500/30">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex flex-col flex-1 min-w-0 z-10 relative">
        <Header onMenuClick={() => setSidebarOpen(true)} />

        <main className="eduflow-main flex-1 overflow-auto px-4 py-6 sm:px-6 lg:px-8 xl:px-10 2xl:px-12 w-full max-w-[1600px] mx-auto">
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
