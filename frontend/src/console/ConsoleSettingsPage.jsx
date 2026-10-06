import { RefreshCw, SlidersHorizontal } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import AsyncBoundary from "../components/ui/AsyncBoundary";
import PageState from "../components/ui/PageState";
import { OperationalPage, PageIntro } from "../components/ui/OperationalPage";
import { useToast } from "../components/ui/Toast";
import { adminSettingsService } from "../services/api";
import { consoleNavigation } from "./consoleManifest";
import { getSettingGroup, normalizeSettingsPayload } from "./consoleSettingsModel";
import SettingEditorCard from "./SettingEditorCard";
import SettingsHistoryModal from "./SettingsHistoryModal";

export default function ConsoleSettingsPage() {
  const location = useLocation();
  const toast = useToast();
  const group = getSettingGroup(location.pathname);
  const section = consoleNavigation.find((item) => item.path === location.pathname);
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [savingKey, setSavingKey] = useState("");
  const [historySetting, setHistorySetting] = useState(null);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    const response = await adminSettingsService.getAll({ group }, { skipCache: true });
    if (!response?.success) {
      setSettings([]);
      setError(response?.error || new Error("Không tải được cấu hình."));
    } else {
      setSettings(normalizeSettingsPayload(response.data));
    }
    setLoading(false);
  }, [group]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const orderedSettings = useMemo(
    () => [...settings].sort((left, right) => String(left.labelVi || left.key).localeCompare(String(right.labelVi || right.key), "vi")),
    [settings],
  );

  async function saveSetting(key, payload) {
    setSavingKey(key);
    const response = await adminSettingsService.update(key, payload);
    setSavingKey("");
    if (!response?.success) throw new Error(response?.error?.message || "Không thể lưu cấu hình.");
    toast.success("Đã lưu cấu hình và tạo phiên bản lịch sử.");
    await loadSettings();
  }

  return (
    <OperationalPage className="w-full min-w-0" data-testid="console-settings-page">
      <PageIntro
        eyebrow="Admin Console"
        title={section?.label || "Cấu hình hệ thống"}
        description={section?.description || "Quản lý các tham số có phiên bản theo tenant."}
        actions={(
          <button onClick={loadSettings} disabled={loading} className="inline-flex h-10 items-center gap-2 rounded-lg bg-white px-4 text-sm font-bold text-slate-700 ring-1 ring-slate-200 disabled:opacity-50">
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Tải lại
          </button>
        )}
      />

      <AsyncBoundary
        loading={loading}
        error={error}
        onRetry={loadSettings}
        loadingLabel="Đang tải cấu hình tenant..."
        loadingDetail="Hệ thống đang đối chiếu registry, override và tháng hiệu lực."
        errorTitle="Không tải được cấu hình"
      >
        {!orderedSettings.length ? (
          <PageState
            icon={SlidersHorizontal}
            title="Chưa có tham số cấu hình"
            message="API không trả về tham số nào cho nhóm này. Hệ thống không tự tạo dữ liệu giả."
            tone="slate"
            action={loadSettings}
            actionLabel="Tải lại"
          />
        ) : (
          <section className="space-y-4" aria-label={`Cấu hình ${section?.label || group}`}>
            {orderedSettings.map((setting) => (
              <SettingEditorCard
                key={`${setting.key}:${setting.effectiveFromMonth || "default"}`}
                setting={setting}
                saving={savingKey === setting.key}
                onSave={saveSetting}
                onHistory={setHistorySetting}
              />
            ))}
          </section>
        )}
      </AsyncBoundary>

      <SettingsHistoryModal
        setting={historySetting}
        isOpen={Boolean(historySetting)}
        onClose={() => setHistorySetting(null)}
        onRolledBack={async () => {
          toast.success("Đã rollback cấu hình và tạo revision mới.");
          await loadSettings();
        }}
      />
    </OperationalPage>
  );
}
