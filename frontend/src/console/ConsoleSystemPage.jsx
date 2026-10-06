import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarClock, CheckCircle2, ExternalLink, ServerCog, ShieldAlert } from "lucide-react";
import AsyncBoundary from "../components/ui/AsyncBoundary";
import PageState from "../components/ui/PageState";
import { ListPanel, MetricGrid, OperationalPage, PageIntro } from "../components/ui/OperationalPage";
import {
  fetchSystemStatus,
  formatLastRun,
  summarizeEnvironment,
} from "./consoleSystemModel";

export default function ConsoleSystemPage({ loadStatus = fetchSystemStatus }) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setStatus(await loadStatus());
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError : new Error(String(requestError)));
    } finally {
      setLoading(false);
    }
  }, [loadStatus]);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setLoading(true);
    loadStatus({ signal: controller.signal })
      .then((result) => {
        if (active) setStatus(result);
      })
      .catch((requestError) => {
        if (active && requestError?.name !== "AbortError") {
          setError(requestError instanceof Error ? requestError : new Error(String(requestError)));
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [loadStatus]);

  const environmentSummary = useMemo(
    () => summarizeEnvironment(status?.environment),
    [status?.environment],
  );

  const metrics = status ? [
    { label: "Phiên bản", value: status.appVersion, helper: "Package đang vận hành", icon: ServerCog, tone: "indigo" },
    { label: "Env đã đặt", value: environmentSummary.configured, helper: `${environmentSummary.total} biến được kiểm tra`, icon: CheckCircle2, tone: "emerald" },
    { label: "Env còn thiếu", value: environmentSummary.missing, helper: "Không hiển thị giá trị bí mật", icon: ShieldAlert, tone: environmentSummary.missing ? "amber" : "slate" },
    { label: "Cron khai báo", value: status.crons.length, helper: status.cronConfigReadable ? "Đọc từ vercel.json" : "Không đọc được cấu hình", icon: CalendarClock, tone: "sky" },
  ] : [];

  return (
    <OperationalPage className="w-full min-w-0" data-testid="console-system-page">
      <PageIntro
        eyebrow="Admin Console"
        title="Trạng thái hệ thống"
        description="Kiểm tra cấu hình triển khai và các công cụ quản trị mà không làm lộ secret hoặc giá trị môi trường."
        actions={<button type="button" className="btn-secondary" onClick={reload}>Làm mới</button>}
      />

      <AsyncBoundary loading={loading} error={error} onRetry={reload} loadingLabel="Đang kiểm tra trạng thái hệ thống..." errorTitle="Không tải được trạng thái hệ thống">
        {!status ? (
          <PageState title="Chưa có trạng thái hệ thống" message="API chưa trả về dữ liệu trạng thái." tone="slate" action={reload} actionLabel="Tải lại" />
        ) : (
          <>
            <MetricGrid metrics={metrics} />
            <div className="grid gap-6 xl:grid-cols-2">
              <ListPanel title="Biến môi trường" description="Chỉ cho biết Đã đặt hoặc Thiếu; không truyền giá trị về trình duyệt." countLabel={`${environmentSummary.total} biến`}>
                {status.environment.length ? (
                  <ul className="divide-y divide-slate-100">
                    {status.environment.map((item) => (
                      <li key={item.name} className="flex items-center justify-between gap-4 px-4 py-3">
                        <code className="min-w-0 truncate text-xs font-bold text-slate-700 sm:text-sm">{item.name}</code>
                        <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${item.configured ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                          {item.configured ? "Đã đặt" : "Thiếu"}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : <PageState title="Không có biến môi trường được theo dõi" tone="slate" />}
              </ListPanel>

              <ListPanel title="Lịch cron" description="Lịch khai báo và lần ghi nhận gần nhất trong Activity Log." countLabel={`${status.crons.length} lịch`}>
                {!status.cronConfigReadable ? (
                  <PageState title="Không đọc được cấu hình cron" message="Kiểm tra vercel.json trong artifact triển khai." tone="amber" />
                ) : status.crons.length ? (
                  <ul className="divide-y divide-slate-100">
                    {status.crons.map((cron) => (
                      <li key={`${cron.path}-${cron.schedule}`} className="px-4 py-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <code className="text-xs font-bold text-slate-800 sm:text-sm">{cron.path}</code>
                          <code className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600">{cron.schedule}</code>
                        </div>
                        <p className="mt-2 text-xs text-slate-500">Lần chạy gần nhất: {formatLastRun(cron.lastRunAt)}</p>
                      </li>
                    ))}
                  </ul>
                ) : <PageState title="Chưa có lịch cron" tone="slate" />}
              </ListPanel>
            </div>

            <ListPanel title="Công cụ quản trị hiện có" description="Mở các màn quản trị cũ trong ứng dụng vận hành." countLabel={`${status.legacyLinks.length} liên kết`}>
              {status.legacyLinks.length ? (
                <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4">
                  {status.legacyLinks.map((link) => (
                    <a key={link.path} href={link.path} className="btn-secondary flex min-h-12 items-center justify-between gap-3">
                      <span>{link.label}</span><ExternalLink size={16} aria-hidden="true" />
                    </a>
                  ))}
                </div>
              ) : <PageState title="Chưa có công cụ quản trị" tone="slate" />}
            </ListPanel>
          </>
        )}
      </AsyncBoundary>
    </OperationalPage>
  );
}
