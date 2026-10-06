import { Activity, Building2, History, SlidersHorizontal } from "lucide-react";
import AsyncBoundary from "../components/ui/AsyncBoundary";
import PageState from "../components/ui/PageState";
import {
  ListPanel,
  MetricGrid,
  OperationalPage,
  PageIntro,
} from "../components/ui/OperationalPage";

function hasConsoleSummary(summary) {
  return Boolean(summary && typeof summary === "object");
}

export default function ConsoleHomePage({
  loading = false,
  error = null,
  summary = null,
  onRetry,
}) {
  return (
    <OperationalPage className="w-full min-w-0" data-testid="console-home-page">
      <PageIntro
        eyebrow="Admin Console"
        title="Tổng quan cấu hình"
        description="Theo dõi nguồn cấu hình, phạm vi áp dụng và lịch sử thay đổi mà không trộn với luồng vận hành hằng ngày."
      />

      <AsyncBoundary
        loading={loading}
        error={error}
        onRetry={onRetry}
        loadingLabel="Đang tải trạng thái Admin Console..."
        loadingDetail="Hệ thống đang kiểm tra tenant, cấu hình và lịch sử thay đổi."
        errorTitle="Không tải được Admin Console"
      >
        {!hasConsoleSummary(summary) ? (
          <PageState
            title="Chưa có dữ liệu cấu hình"
            message="Console shell đã sẵn sàng. Dữ liệu sẽ xuất hiện sau khi API cấu hình được kết nối và trả về thành công."
            tone="slate"
            action={onRetry}
            actionLabel="Tải lại"
          />
        ) : (
          <ConsoleSummary summary={summary} />
        )}
      </AsyncBoundary>
    </OperationalPage>
  );
}

function ConsoleSummary({ summary }) {
  const recentChanges = Array.isArray(summary.recentChanges) ? summary.recentChanges : [];
  const metrics = [
    {
      label: "Trung tâm",
      value: summary.tenantName || "Chưa xác định",
      helper: summary.tenantSlug ? `Mã: ${summary.tenantSlug}` : "Chưa có mã tenant",
      icon: Building2,
      tone: "indigo",
    },
    {
      label: "Đã tùy chỉnh",
      value: Number.isFinite(summary.overrideCount) ? summary.overrideCount : "—",
      helper: "Setting khác mặc định hệ thống",
      icon: SlidersHorizontal,
      tone: "sky",
    },
    {
      label: "Phiên bản cấu hình",
      value: Number.isFinite(summary.configVersion) ? summary.configVersion : "—",
      helper: "Dùng để kiểm soát cache và revision",
      icon: History,
      tone: "emerald",
    },
    {
      label: "Thay đổi gần đây",
      value: recentChanges.length,
      helper: "Bản ghi được API trả về",
      icon: Activity,
      tone: "amber",
    },
  ];

  return (
    <>
      <MetricGrid metrics={metrics} />
      <ListPanel
        title="Thay đổi cấu hình gần đây"
        description="Chỉ hiển thị các revision đã được backend xác nhận."
        countLabel={`${recentChanges.length} thay đổi`}
      >
        {recentChanges.length ? (
          <ul className="divide-y divide-slate-100" aria-label="Danh sách thay đổi cấu hình gần đây">
            {recentChanges.map((change) => (
              <li key={change.id} className="grid gap-1 px-3 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-900">{change.label || change.key}</p>
                  <p className="mt-1 text-xs text-slate-500">{change.actorName || "Không rõ người cập nhật"}</p>
                </div>
                <time className="text-xs font-semibold text-slate-500" dateTime={change.updatedAt}>
                  {change.updatedAtLabel || change.updatedAt || "Chưa có thời gian"}
                </time>
              </li>
            ))}
          </ul>
        ) : (
          <PageState
            title="Chưa có thay đổi cấu hình"
            message="Tenant này chưa có revision nào được API trả về. Các giá trị mặc định không được tính là tùy chỉnh."
            tone="slate"
          />
        )}
      </ListPanel>
    </>
  );
}

