import { NavLink, useLocation } from "react-router-dom";
import { useMemo, useState } from "react";
import { motion as Motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useAuth } from "../../context/AuthContext";
import {
  Home, Users, UsersRound, School, GraduationCap,
  CalendarCheck, BarChart2, Lock, Receipt, CircleDollarSign,
  Wallet, History, LayoutTemplate, PieChart, ClipboardList,
  Settings, UploadCloud, Bell, DatabaseBackup, Trash2,
  ChevronDown, X, Sparkles
} from "lucide-react";
import { getMotionTransition } from "../../design/motion";

const iconsMap = {
  home: Home,
  users: Users,
  parents: UsersRound,
  building: School,
  teacher: GraduationCap,
  check: CalendarCheck,
  chart: BarChart2,
  lock: Lock,
  receipt: Receipt,
  fee: CircleDollarSign,
  wallet: Wallet,
  history: History,
  template: LayoutTemplate,
  report: PieChart,
  audit: ClipboardList,
  settings: Settings,
  import: UploadCloud,
  bell: Bell,
  backup: DatabaseBackup,
  trash: Trash2,
};

const menuGroups = [
  {
    label: "Menu chính",
    sections: [
      {
        title: "Vận hành",
        items: [
          { title: "Tổng quan", icon: "home", path: "/" },
          { title: "Học viên", icon: "users", path: "/students" },
          { title: "Phụ huynh", icon: "parents", path: "/parents" },
          { title: "Lớp học", icon: "building", path: "/classes" },
          { title: "Giáo viên", icon: "teacher", path: "/teachers", adminOnly: true },
          { title: "Điểm danh", icon: "check", path: "/attendance" },
          { title: "Insight điểm danh", icon: "chart", path: "/attendance-insights" },
          { title: "Chốt điểm danh", icon: "lock", path: "/attendance-periods" },
        ],
      },
      {
        title: "Tài chính",
        items: [
          { title: "Thu tiền", icon: "fee", path: "/fee-collection" },
          { title: "Chi tiền", icon: "wallet", path: "/payments", adminOnly: true },
          { title: "Lịch sử giao dịch", icon: "history", path: "/history" },
        ],
      },
    ],
  },
  {
    label: "Menu phụ",
    sections: [
      {
        title: "Báo cáo",
        items: [
          { title: "Trung tâm phân tích", icon: "report", path: "/reports", adminOnly: true },
          { title: "Tiến bộ học viên", icon: "teacher", path: "/student-progress", adminOnly: true },
          { title: "Báo cáo nâng cao", icon: "chart", path: "/advanced-reports", adminOnly: true },
          { title: "Nhật ký", icon: "audit", path: "/audit-logs", adminOnly: true },
        ],
      },
      {
        title: "Quản trị",
        items: [
          { title: "Mẫu in", icon: "template", path: "/templates", adminOnly: true },
          { title: "Người dùng", icon: "users", path: "/users", adminOnly: true },
          { title: "Import CSV", icon: "import", path: "/imports", adminOnly: true },
          { title: "Nhắc học phí", icon: "bell", path: "/fee-reminders", adminOnly: true },
          { title: "Sao lưu", icon: "backup", path: "/backups", adminOnly: true },
          { title: "Thùng rác", icon: "trash", path: "/recycle-bin", adminOnly: true },
          { title: "Cài đặt", icon: "settings", path: "/settings", adminOnly: true },
        ],
      },
    ],
  },
];

function isActivePath(pathname, path) {
  if (path === "/") return pathname === "/";
  return pathname === path || pathname.startsWith(`${path}/`);
}

export default function Sidebar({ isOpen, onClose }) {
  const { isAdmin } = useAuth();
  const { pathname } = useLocation();
  const reducedMotion = useReducedMotion();
  const visibleGroups = useMemo(
    () =>
      menuGroups
        .map((block) => ({
          ...block,
          sections: block.sections
            .map((section) => ({
              ...section,
              items: section.items.filter((item) => !item.adminOnly || isAdmin()),
            }))
            .filter((section) => section.items.length > 0),
        }))
        .filter((block) => block.sections.length > 0),
    [isAdmin]
  );

  const activeSection = visibleGroups
    .flatMap((block) => block.sections)
    .find((section) => section.items.some((item) => isActivePath(pathname, item.path)))?.title;

  const [closedSections, setClosedSections] = useState(() => new Set());

  const toggleSection = (sectionTitle) => {
    setClosedSections((current) => {
      const next = new Set(current);
      if (next.has(sectionTitle)) next.delete(sectionTitle);
      else next.add(sectionTitle);
      return next;
    });
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <Motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            type="button"
            aria-label="Đóng menu"
            className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[280px] xl:w-[300px] transform flex-col border-r border-slate-200/70 bg-white shadow-2xl transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none lg:static lg:translate-x-0 lg:shadow-none ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-[72px] items-center justify-between border-b border-slate-200/50 px-6">
          <div className="flex items-center gap-3">
            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 via-violet-500 to-cyan-500 text-white shadow-lg shadow-primary-500/30">
              <Sparkles size={20} />
              <div className="absolute inset-0 rounded-xl ring-1 ring-inset ring-white/20"></div>
            </div>
            <div className="min-w-0">
              <p className="truncate text-base font-black tracking-tight text-slate-900">EduManager</p>
              <p className="truncate text-[10px] font-bold uppercase tracking-wider text-primary-600">EduFlow V2</p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Đóng menu"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors lg:hidden"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 py-6 scrollbar-hide">
          {visibleGroups.map((block) => (
            <div key={block.label} className="mb-6">
              <div className="mb-3 px-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                {block.label}
              </div>
              <div className="space-y-3">
                {block.sections.map((section) => {
                  const hasActive = section.title === activeSection;
                  const isClosed = closedSections.has(section.title) && !hasActive;

                  return (
                    <div key={section.title} className="rounded-[18px] border border-slate-200/80 bg-white shadow-sm overflow-hidden transition-all duration-300 motion-reduce:transition-none">
                      <button
                        type="button"
                        aria-expanded={!isClosed}
                        className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-slate-50"
                        onClick={() => toggleSection(section.title)}
                      >
                        <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">{section.title}</span>
                        <ChevronDown
                          size={14}
                          className={`text-slate-400 transition-transform duration-300 motion-reduce:transition-none ${isClosed ? "" : "rotate-180"}`}
                        />
                      </button>

                      <AnimatePresence initial={false}>
                        {!isClosed && (
                          <Motion.div
                            initial={reducedMotion ? false : { height: 0, opacity: 0 }}
                            animate={reducedMotion ? { opacity: 1 } : { height: "auto", opacity: 1 }}
                            exit={reducedMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
                            transition={getMotionTransition({ reduced: reducedMotion, duration: "fast" })}
                            className="overflow-hidden"
                          >
                            <div className="space-y-0.5 px-2 pb-2">
                              {section.items.map((item) => {
                                const IconComp = iconsMap[item.icon] || Sparkles;
                                return (
                                  <NavLink
                                    key={item.path}
                                    to={item.path}
                                    end={item.path === "/"}
                                    onClick={onClose}
                                    className={({ isActive }) =>
                                      `group relative flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition-all duration-200 ${
                                        isActive
                                          ? "bg-primary-50 text-primary-700 shadow-sm"
                                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                      }`
                                    }
                                  >
                                    {({ isActive }) => (
                                      <>
                                        {isActive && (
                                          <Motion.div
                                            layoutId="activeNavBubble"
                                            className="absolute inset-0 rounded-xl border border-primary-100 bg-primary-50"
                                            initial={false}
                                            transition={getMotionTransition({ reduced: reducedMotion, duration: "fast" })}
                                          />
                                        )}
                                        <div className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${isActive ? 'bg-white text-primary-600 shadow-sm' : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200 group-hover:text-slate-600'}`}>
                                          <IconComp size={16} strokeWidth={isActive ? 2.5 : 2} />
                                        </div>
                                        <span className="relative z-10 truncate tracking-tight">{item.title}</span>
                                      </>
                                    )}
                                  </NavLink>
                                );
                              })}
                            </div>
                          </Motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-slate-200/50 p-4">
          <div className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-100 px-4 py-3 shadow-sm">
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Version</span>
              <span className="text-xs font-bold text-slate-700">2.0.1 PRO</span>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-100/50 text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 motion-safe:animate-pulse motion-reduce:animate-none" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Stable</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
