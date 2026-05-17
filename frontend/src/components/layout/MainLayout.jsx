import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Header from "./Header";
import Sidebar from "./Sidebar";
import PageTransition from "../ui/PageTransition";

export default function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col">
        <Header onMenuClick={() => setSidebarOpen(true)} />

        <main className="flex-1 overflow-auto px-3 py-4 sm:px-4 lg:px-6 lg:py-6">
          <PageTransition key={location.pathname}>
            <Outlet />
          </PageTransition>
        </main>

        <div className="h-safe-area-inset-bottom lg:hidden" />
      </div>
    </div>
  );
}
