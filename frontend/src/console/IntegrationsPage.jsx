import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BellRing,
  CheckCircle2,
  CircleOff,
  ExternalLink,
  KeyRound,
  Link2,
  LoaderCircle,
  MessageSquareText,
  RefreshCw,
  Save,
  Send,
  ShieldCheck,
  ToggleLeft,
  Trash2,
} from "lucide-react";
import AsyncBoundary from "../components/ui/AsyncBoundary";
import PageState from "../components/ui/PageState";
import {
  ListPanel,
  MetricGrid,
  OperationalPage,
  PageIntro,
} from "../components/ui/OperationalPage";
import { adminFeaturesService, adminIntegrationsService } from "../services/api";
const REMINDER_KIND = "fee_reminder_webhook";

const FEATURE_COPY = {
  "flags.fee_reminders_enabled": {
    title: "Nhắc học phí",
    description: "Cho phép tenant sử dụng luồng gửi nhắc học phí khi hạ tầng đã sẵn sàng.",
    icon: BellRing,
  },
  "flags.parent_portal_enabled": {
    title: "Cổng thông tin phụ huynh",
    description: "Mở quyền truy cập portal phụ huynh cho tenant hiện tại.",
    icon: ExternalLink,
  },
};

export const integrationsConsoleService = {
  listFeatures: (options) => adminFeaturesService.list(options),
  updateFeature: (key, enabled) => adminFeaturesService.update({
    key,
    enabled,
    change_note: `Cập nhật từ Admin Console: ${enabled ? "bật" : "tắt"}`,
  }),
  listIntegrations: (options) => adminIntegrationsService.list(options),
  updateProvider: (kind, config, secret = "") => {
    const payload = { kind, config, secret };
    if (secret === "") delete payload.secret;
    return adminIntegrationsService.update(payload);
  },
  testIntegration: (kind) => adminIntegrationsService.test(kind),
  updateIntegration: (field, value) => adminIntegrationsService.update({
    kind: REMINDER_KIND,
    field,
    value,
    change_note: "Cập nhật cấu hình tích hợp từ Admin Console",
  }),
};

function normalizeFeatures(payload) {
  return Array.isArray(payload?.features) ? payload.features.filter(Boolean) : [];
}

function normalizeIntegration(payload) {
  const integrations = Array.isArray(payload?.integrations) ? payload.integrations : [];
  return integrations.find((item) => item?.kind === REMINDER_KIND) || null;
}

function statusCopy(status) {
  if (status === "ready") return { label: "Sẵn sàng", tone: "emerald" };
  if (status === "not_configured") return { label: "Thiếu cấu hình", tone: "amber" };
  return { label: "Đang tắt", tone: "slate" };
}

export default function IntegrationsPage({ service = integrationsConsoleService }) {
  const [features, setFeatures] = useState([]);
  const [integration, setIntegration] = useState(null);
  const [template, setTemplate] = useState("");
  const [providerUrl, setProviderUrl] = useState("");
  const [providerEnabled, setProviderEnabled] = useState(false);
  const [providerSecret, setProviderSecret] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [notice, setNotice] = useState("");
  const [pendingFeature, setPendingFeature] = useState("");
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [savingProvider, setSavingProvider] = useState(false);
  const [testingIntegration, setTestingIntegration] = useState(false);
  const [clearingSecret, setClearingSecret] = useState(false);

  const applyIntegration = useCallback((nextIntegration) => {
    setIntegration(nextIntegration);
    setTemplate(String(nextIntegration?.message_template || ""));
    setProviderUrl(String(nextIntegration?.config?.url || ""));
    setProviderEnabled(Boolean(nextIntegration?.config?.enabled));
    setProviderSecret("");
  }, []);

  const reloadIntegration = useCallback(async () => {
    const payload = await service.listIntegrations();
    const nextIntegration = normalizeIntegration(payload);
    applyIntegration(nextIntegration);
    return nextIntegration;
  }, [applyIntegration, service]);

  const load = useCallback(async (options = {}) => {
    setLoading(true);
    setError(null);
    try {
      const [featurePayload, integrationPayload] = await Promise.all([
        service.listFeatures(options),
        service.listIntegrations(options),
      ]);
      const nextIntegration = normalizeIntegration(integrationPayload);
      setFeatures(normalizeFeatures(featurePayload));
      applyIntegration(nextIntegration);
    } catch (requestError) {
      if (requestError?.name !== "AbortError") {
        setError(requestError instanceof Error ? requestError : new Error(String(requestError)));
      }
    } finally {
      if (!options.signal?.aborted) setLoading(false);
    }
  }, [applyIntegration, service]);

  useEffect(() => {
    const controller = new AbortController();
    load({ signal: controller.signal });
    return () => controller.abort();
  }, [load]);

  const toggleFeature = async (feature) => {
    setPendingFeature(feature.key);
    setNotice("");
    setActionError(null);
    try {
      const enabled = !feature.enabled;
      await service.updateFeature(feature.key, enabled);
      setFeatures((current) => current.map((item) => (
        item.key === feature.key ? { ...item, enabled } : item
      )));
      if (feature.key === "flags.fee_reminders_enabled") {
        await reloadIntegration();
      }
      setNotice(`Đã ${enabled ? "bật" : "tắt"} ${FEATURE_COPY[feature.key]?.title || "tính năng"}.`);
    } catch (requestError) {
      setActionError(requestError instanceof Error ? requestError : new Error(String(requestError)));
    } finally {
      setPendingFeature("");
    }
  };

  const validateProviderUrl = () => {
    const nextUrl = providerUrl.trim();
    if (!nextUrl) {
      if (providerEnabled) throw new Error("Cần nhập URL provider trước khi kích hoạt kênh gửi.");
      return "";
    }
    try {
      const parsed = new URL(nextUrl);
      if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("unsupported protocol");
      return parsed.toString();
    } catch {
      throw new Error("URL provider phải là địa chỉ HTTP hoặc HTTPS hợp lệ.");
    }
  };

  const saveProvider = async () => {
    setSavingProvider(true);
    setActionError(null);
    setNotice("");
    try {
      await service.updateProvider(
        REMINDER_KIND,
        { url: validateProviderUrl(), enabled: providerEnabled },
        providerSecret,
      );
      await reloadIntegration();
      setNotice("Đã lưu cấu hình provider. Token được mã hóa và không hiển thị lại.");
    } catch (requestError) {
      setActionError(requestError instanceof Error ? requestError : new Error(String(requestError)));
    } finally {
      setSavingProvider(false);
    }
  };

  const clearProviderSecret = async () => {
    setClearingSecret(true);
    setActionError(null);
    setNotice("");
    try {
      await service.updateProvider(
        REMINDER_KIND,
        { url: validateProviderUrl(), enabled: providerEnabled },
        null,
      );
      await reloadIntegration();
      setNotice("Đã xóa token provider đã lưu.");
    } catch (requestError) {
      setActionError(requestError instanceof Error ? requestError : new Error(String(requestError)));
    } finally {
      setClearingSecret(false);
    }
  };

  const testProvider = async () => {
    setTestingIntegration(true);
    setActionError(null);
    setNotice("");
    try {
      await service.testIntegration(REMINDER_KIND);
      setNotice("Đã gửi thử thành công. Provider đã chấp nhận yêu cầu kiểm tra.");
    } catch (requestError) {
      setActionError(requestError instanceof Error ? requestError : new Error(String(requestError)));
    } finally {
      setTestingIntegration(false);
    }
  };

  const saveTemplate = async () => {
    const nextTemplate = template.trim();
    if (!nextTemplate) {
      setNotice("");
      setActionError(new Error("Mẫu tin nhắn không được để trống."));
      return;
    }
    setSavingTemplate(true);
    setActionError(null);
    setNotice("");
    try {
      const payload = await service.updateIntegration("message_template", nextTemplate);
      const updated = payload?.integration || integration;
      setIntegration(updated);
      setTemplate(String(updated?.message_template || nextTemplate));
      setNotice("Đã lưu mẫu tin nhắn nhắc học phí.");
    } catch (requestError) {
      setActionError(requestError instanceof Error ? requestError : new Error(String(requestError)));
    } finally {
      setSavingTemplate(false);
    }
  };

  const metrics = useMemo(() => {
    const enabledCount = features.filter((feature) => feature.enabled).length;
    const readiness = statusCopy(integration?.status);
    return [
      { label: "Feature đang bật", value: `${enabledCount}/${features.length || 2}`, helper: "Theo tenant hiện tại", icon: ToggleLeft, tone: "indigo" },
      { label: "Kênh nhắc học phí", value: readiness.label, helper: "Không hiển thị thông tin nhạy cảm", icon: BellRing, tone: readiness.tone },
      { label: "Endpoint", value: integration?.endpoint_configured ? "Đã cấu hình" : "Chưa cấu hình", helper: "Cấu hình riêng theo tenant", icon: ShieldCheck, tone: integration?.endpoint_configured ? "emerald" : "amber" },
      { label: "Credential", value: integration?.credential_configured ? "Đã cấu hình" : "Chưa cấu hình", helper: "Giá trị bí mật luôn được che", icon: MessageSquareText, tone: integration?.credential_configured ? "emerald" : "slate" },
    ];
  }, [features, integration]);

  const isEmpty = features.length === 0 && !integration;
  const readiness = statusCopy(integration?.status);

  return (
    <OperationalPage className="w-full min-w-0" data-testid="console-integrations-page">
      <PageIntro
        eyebrow="Admin Console"
        title="Tích hợp và feature flags"
        description="Kiểm soát khả năng theo tenant và theo dõi mức sẵn sàng của kênh nhắc học phí mà không làm lộ thông tin bí mật."
        status={readiness.label}
        actions={(
          <button type="button" className="btn-secondary inline-flex items-center gap-2" onClick={() => load()} disabled={loading || Boolean(pendingFeature) || savingTemplate || savingProvider || testingIntegration || clearingSecret}>
            <RefreshCw size={17} aria-hidden="true" /> Làm mới
          </button>
        )}
      />

      {notice && (
        <div role="status" className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
          <CheckCircle2 size={18} aria-hidden="true" /> {notice}
        </div>
      )}

      {actionError && (
        <div role="alert" className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">
          <CircleOff size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>{actionError.message}</span>
        </div>
      )}

      <AsyncBoundary
        loading={loading}
        error={error}
        onRetry={() => load()}
        loadingLabel="Đang tải cấu hình tích hợp..."
        loadingDetail="Hệ thống đang đối chiếu feature flags, endpoint và trạng thái môi trường của tenant."
        errorTitle="Không tải được cấu hình tích hợp"
      >
        {isEmpty ? (
          <PageState
            title="Chưa có cấu hình tích hợp"
            message="Feature flags hoặc tích hợp nhắc học phí chưa được đăng ký cho tenant này."
            tone="slate"
            action={() => load()}
            actionLabel="Tải lại"
          />
        ) : (
          <>
            <MetricGrid metrics={metrics} />
            <ListPanel
              title="Feature flags"
              description="Thay đổi chỉ áp dụng cho tenant hiện tại và được backend ghi lịch sử cấu hình."
              countLabel={`${features.length} tính năng`}
            >
              <div className="grid gap-3 p-4 lg:grid-cols-2">
                {features.map((feature) => {
                  const copy = FEATURE_COPY[feature.key] || {};
                  const Icon = copy.icon || ToggleLeft;
                  const pending = pendingFeature === feature.key;
                  return (
                    <article key={feature.key} className="flex min-w-0 items-start justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="flex min-w-0 gap-3">
                        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${feature.enabled ? "bg-indigo-50 text-indigo-700" : "bg-slate-100 text-slate-500"}`}>
                          <Icon size={19} aria-hidden="true" />
                        </span>
                        <div className="min-w-0">
                          <h3 className="text-sm font-black text-slate-950">{copy.title || feature.label_vi || feature.key}</h3>
                          <p className="mt-1 text-sm leading-6 text-slate-600">{feature.description_vi || copy.description}</p>
                          <p className="mt-2 text-xs font-semibold text-slate-400">Revision {feature.revision ?? 0} · {feature.provenance || "default"}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={Boolean(feature.enabled)}
                        aria-label={`${feature.enabled ? "Tắt" : "Bật"} ${copy.title || feature.key}`}
                        disabled={Boolean(pendingFeature)}
                        onClick={() => toggleFeature(feature)}
                        className={`relative mt-1 h-7 w-12 shrink-0 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 ${feature.enabled ? "bg-indigo-600" : "bg-slate-300"}`}
                      >
                        <span className={`absolute top-1 flex h-5 w-5 items-center justify-center rounded-full bg-white shadow transition-transform ${feature.enabled ? "translate-x-6" : "translate-x-1"}`}>
                          {pending && <LoaderCircle size={13} className="animate-spin text-indigo-600" aria-hidden="true" />}
                        </span>
                      </button>
                    </article>
                  );
                })}
              </div>
            </ListPanel>

            {integration && (
              <div className="grid min-w-0 gap-5 xl:grid-cols-2">
                <ListPanel title="Mức sẵn sàng" description="Chỉ hiển thị trạng thái, không đọc hoặc trả về secret." countLabel={readiness.label}>
                  <div className="space-y-3 p-4">
                    <ReadinessRow label="Tenant cho phép gửi" ready={integration.enabled} />
                    <ReadinessRow label="Môi trường cho phép gửi" ready={integration.environment_allows_send} />
                    <ReadinessRow label="Endpoint đã cấu hình" ready={integration.endpoint_configured} />
                    <ReadinessRow label="Credential đã cấu hình" ready={integration.credential_configured} />
                    {Array.isArray(integration.warnings) && integration.warnings.length > 0 && (
                      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
                        {integration.warnings.join(" · ")}
                      </div>
                    )}
                  </div>
                </ListPanel>

                <ListPanel title="Cấu hình provider" description="URL và token được lưu theo tenant. Token hiện có không bao giờ được trả về trình duyệt." countLabel={integration.config_source === "database" ? "Database" : "Fallback"}>
                  <div className="space-y-4 p-4">
                    <label className="block text-sm font-bold text-slate-700">
                      URL provider
                      <span className="relative mt-2 block">
                        <Link2 size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                        <input
                          type="url"
                          className="input w-full pl-10"
                          value={providerUrl}
                          onChange={(event) => setProviderUrl(event.target.value)}
                          placeholder="https://provider.example.com/webhook"
                          autoComplete="url"
                          disabled={savingProvider || clearingSecret}
                        />
                      </span>
                    </label>

                    <label className="block text-sm font-bold text-slate-700">
                      Token truy cập
                      <span className="relative mt-2 block">
                        <KeyRound size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                        <input
                          type="password"
                          className="input w-full pl-10"
                          value={providerSecret}
                          onChange={(event) => setProviderSecret(event.target.value)}
                          placeholder={integration.secret_configured ? "Để trống để giữ token hiện tại" : "Nhập token provider"}
                          autoComplete="new-password"
                          disabled={savingProvider || clearingSecret}
                          aria-describedby="provider-secret-help"
                        />
                      </span>
                      <span id="provider-secret-help" className="mt-2 block text-xs font-medium leading-5 text-slate-500">
                        {integration.secret_configured
                          ? "Đã có token được mã hóa. Để trống để giữ token hiện tại; nhập giá trị mới để thay thế."
                          : "Chưa có token. Giá trị mới sẽ được mã hóa trước khi lưu."}
                      </span>
                    </label>

                    <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 px-4 py-3">
                      <div>
                        <p className="text-sm font-bold text-slate-800">Kích hoạt kênh gửi</p>
                        <p className="mt-1 text-xs leading-5 text-slate-500">Provider chỉ gửi khi feature flag và môi trường cũng cho phép.</p>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={providerEnabled}
                        aria-label="Kích hoạt kênh gửi"
                        onClick={() => setProviderEnabled((current) => !current)}
                        disabled={savingProvider || clearingSecret}
                        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 ${providerEnabled ? "bg-indigo-600" : "bg-slate-300"}`}
                      >
                        <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${providerEnabled ? "translate-x-6" : "translate-x-1"}`} />
                      </button>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
                      {integration.secret_configured && (
                        <button type="button" className="btn-secondary inline-flex items-center justify-center gap-2 text-rose-700" onClick={clearProviderSecret} disabled={savingProvider || clearingSecret || testingIntegration}>
                          {clearingSecret ? <LoaderCircle size={17} className="animate-spin" aria-hidden="true" /> : <Trash2 size={17} aria-hidden="true" />}
                          {clearingSecret ? "Đang xóa..." : "Xóa token đã lưu"}
                        </button>
                      )}
                      <button type="button" className="btn-secondary inline-flex items-center justify-center gap-2" onClick={testProvider} disabled={savingProvider || clearingSecret || testingIntegration || !integration.endpoint_configured}>
                        {testingIntegration ? <LoaderCircle size={17} className="animate-spin" aria-hidden="true" /> : <Send size={17} aria-hidden="true" />}
                        {testingIntegration ? "Đang gửi thử..." : "Gửi thử"}
                      </button>
                      <button type="button" className="btn-primary inline-flex items-center justify-center gap-2" onClick={saveProvider} disabled={savingProvider || clearingSecret || testingIntegration}>
                        {savingProvider ? <LoaderCircle size={17} className="animate-spin" aria-hidden="true" /> : <Save size={17} aria-hidden="true" />}
                        {savingProvider ? "Đang lưu..." : "Lưu cấu hình provider"}
                      </button>
                    </div>
                  </div>
                </ListPanel>

                <ListPanel title="Mẫu tin nhắn nhắc học phí" description="Nội dung dùng khi provider thật được bật. Không đặt token hoặc URL trong mẫu." countLabel={`Revision ${integration.revision?.message_template ?? 0}`}>
                  <div className="space-y-3 p-4">
                    <label className="block text-sm font-bold text-slate-700">
                      Nội dung tin nhắn
                      <textarea
                        className="input mt-2 min-h-36 w-full resize-y leading-6"
                        value={template}
                        onChange={(event) => setTemplate(event.target.value)}
                        maxLength={1000}
                        placeholder="Ví dụ: Trung tâm xin nhắc học phí tháng {{month}} của học viên {{student_name}}..."
                        disabled={savingTemplate}
                      />
                    </label>
                    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                      <p className="text-xs text-slate-500">{template.length}/1000 ký tự · Kiểm tra nội dung trước khi kích hoạt provider.</p>
                      <button type="button" className="btn-primary inline-flex items-center justify-center gap-2" onClick={saveTemplate} disabled={savingTemplate || template.trim() === String(integration.message_template || "").trim()}>
                        {savingTemplate ? <LoaderCircle size={17} className="animate-spin" aria-hidden="true" /> : <Save size={17} aria-hidden="true" />}
                        {savingTemplate ? "Đang lưu..." : "Lưu mẫu tin nhắn"}
                      </button>
                    </div>
                  </div>
                </ListPanel>
              </div>
            )}
          </>
        )}
      </AsyncBoundary>
    </OperationalPage>
  );
}

function ReadinessRow({ label, ready }) {
  const Icon = ready ? CheckCircle2 : CircleOff;
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 px-4 py-3">
      <span className="text-sm font-bold text-slate-700">{label}</span>
      <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-black ${ready ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
        <Icon size={14} aria-hidden="true" /> {ready ? "Có" : "Không"}
      </span>
    </div>
  );
}
