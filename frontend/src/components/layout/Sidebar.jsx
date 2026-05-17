import { NavLink, useLocation } from "react-router-dom";
import { useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";

const icons = {
  home: "M3 12l9-8 9 8M5 10v10h14V10M10 20v-6h4v6",
  users: "M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 7a4 4 0 100-8 4 4 0 000 8M22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75",
  parents: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 7a4 4 0 100-8 4 4 0 000 8M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75",
  building: "M3 21h18M5 21V5a2 2 0 012-2h10a2 2 0 012 2v16M9 7h1M14 7h1M9 11h1M14 11h1M9 15h1M14 15h1",
  teacher: "M20 7h-7M20 12h-7M20 17h-7M4 19V5a2 2 0 012-2h5v18H6a2 2 0 01-2-2z",
  check: "M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11",
  chart: "M4 19h16M7 16V9M12 16V5M17 16v-7",
  lock: "M6 10V8a6 6 0 1112 0v2M5 10h14v11H5V10z",
  receipt: "M7 3h10l2 2v16l-3-2-3 2-3-2-3 2V3zM9 8h6M9 12h6M9 16h4",
  fee: "M9 5h6M9 9h6M5 3h14v18H5V3zM9 13h2M13 13h2M9 17h6",
  wallet: "M3 7h18v12H3V7zM16 12h4M5 7V5h12v2",
  history: "M3 12a9 9 0 109-9M3 3v6h6M12 7v6l4 2",
  template: "M4 5h16v4H4V5zM4 13h7v6H4v-6zM15 13h5v6h-5v-6z",
  report: "M4 19V5M9 19v-8M14 19V8M19 19V3",
  audit: "M7 4h10a2 2 0 012 2v14H5V6a2 2 0 012-2zM8 9h8M8 13h8M8 17h5",
  settings: "M12 8a4 4 0 100 8 4 4 0 000-8zM12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12",
  import: "M12 3v12M8 11l4 4 4-4M4 19h16",
  bell: "M18 8a6 6 0 00-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M13.73 21a2 2 0 01-3.46 0",
  backup: "M4 7h16v10H4V7zM7 11h10M7 15h6M8 7V5h8v2",
  trash: "M3 6h18M8 6V4h8v2M6 6l1 15h10l1-15M10 11v6M14 11v6",
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
          { title: "Thu tiền", icon: "receipt", path: "/receipts" },
          { title: "Thu học phí", icon: "fee", path: "/fee-collection" },
          { title: "Chi tiền", icon: "wallet", path: "/payments", adminOnly: true },
          { title: "Lịch sử", icon: "history", path: "/history" },
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
          { title: "Báo cáo", icon: "report", path: "/reports", adminOnly: true },
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

function Icon({ name }) {
  return (
    <svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.9} d={icons[name]} />
    </svg>
  );
}

function isActivePath(pathname, path) {
  if (path === "/") return pathname === "/";
  return pathname === path || pathname.startsWith(`${path}/`);
}

export default function Sidebar({ isOpen, onClose }) {
  const { isAdmin } = useAuth();
  const { pathname } = useLocation();
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
      {isOpen && (
        <button
          type="button"
          aria-label="Đóng menu"
          className="fixed inset-0 z-40 bg-slate-950/55 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[280px] transform flex-col border-r border-slate-200 bg-white shadow-2xl shadow-slate-900/10 transition-transform duration-200 ease-out lg:static lg:translate-x-0 lg:shadow-none ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-slate-200 px-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
              <Icon name="building" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-slate-950">Edu Manager</p>
              <p className="truncate text-xs text-slate-500">Quản lý trung tâm</p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Đóng menu"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {visibleGroups.map((block) => (
            <div key={block.label} className="mb-5">
              <div className="mb-2 px-2 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
                {block.label}
              </div>
              <div className="space-y-2">
                {block.sections.map((section) => {
                  const hasActive = section.title === activeSection;
                  const isClosed = closedSections.has(section.title) && !hasActive;
                  return (
                    <div key={section.title} className="rounded-xl border border-slate-200 bg-slate-50/80">
                      <button
                        type="button"
                        className="flex w-full items-center justify-between px-3 py-2 text-left text-xs font-bold uppercase tracking-[0.12em] text-slate-500"
                        onClick={() => toggleSection(section.title)}
                      >
                        <span>{section.title}</span>
                        <svg
                          className={`h-4 w-4 transition-transform ${isClosed ? "" : "rotate-180"}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      {!isClosed && (
                        <div className="space-y-1 px-1.5 pb-1.5">
                          {section.items.map((item) => (
                            <NavLink
                              key={item.path}
                              to={item.path}
                              end={item.path === "/"}
                              onClick={onClose}
                              className={({ isActive }) =>
                                `group flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                                  isActive
                                    ? "bg-blue-600 text-white shadow-sm"
                                    : "text-slate-600 hover:bg-white hover:text-slate-950"
                                }`
                              }
                            >
                              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-current/10">
                                <Icon name={item.icon} />
                              </span>
                              <span className="truncate">{item.title}</span>
                            </NavLink>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-slate-200 px-4 py-3">
          <div className="flex items-center justify-between rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Online
            </span>
            <span>v2.0</span>
          </div>
        </div>
      </aside>
    </>
  );
}
