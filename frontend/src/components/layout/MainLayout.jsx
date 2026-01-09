import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Header from "./Header";
import Sidebar from "./Sidebar";
import PageTransition from "../ui/PageTransition";

// VI: Main layout với Header, Sidebar, Page transitions và Content area
export default function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100 flex">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-0">
        {/* Header */}
        <Header onMenuClick={() => setSidebarOpen(true)} />

        {/* Page content with transitions */}
        <main className="flex-1 p-3 sm:p-4 lg:p-6 overflow-auto">
          <PageTransition key={location.pathname}>
            <Outlet />
          </PageTransition>
        </main>

        {/* Mobile bottom safe area */}
        <div className="h-safe-area-inset-bottom lg:hidden" />
      </div>
    </div>
  );
}
