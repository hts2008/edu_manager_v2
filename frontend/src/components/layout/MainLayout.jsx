import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import Header from "./Header";
import Sidebar from "./Sidebar";
import PageTransition from "../ui/PageTransition";

export default function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="flex min-h-screen bg-[#f3f4f6] text-slate-900 selection:bg-blue-500/30">
      {/* Background ambient glows */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute top-0 left-[20%] w-[50vw] h-[50vw] rounded-full bg-blue-400/5 blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[40vw] h-[40vw] rounded-full bg-indigo-400/5 blur-[120px]" />
      </div>

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex flex-col flex-1 min-w-0 z-10 relative">
        <Header onMenuClick={() => setSidebarOpen(true)} />

        <main className="flex-1 overflow-auto px-4 py-6 sm:px-6 lg:px-8 xl:px-10 2xl:px-12 w-full max-w-[1600px] mx-auto">
          <AnimatePresence mode="wait">
            <PageTransition key={location.pathname}>
              <Outlet />
            </PageTransition>
          </AnimatePresence>
        </main>

        <div className="h-safe-area-inset-bottom lg:hidden" />
      </div>
    </div>
  );
}
