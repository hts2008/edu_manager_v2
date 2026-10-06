import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Building2,
  CheckCircle2,
  CirclePause,
  Pencil,
  Plus,
  RefreshCw,
  ShieldAlert,
  X,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import AsyncBoundary from "../components/ui/AsyncBoundary";
import PageState from "../components/ui/PageState";
import {
  ListPanel,
  MetricGrid,
  OperationalPage,
  PageIntro,
} from "../components/ui/OperationalPage";
import { adminTenantsService } from "../services/api";
const EMPTY_FORM = { name: "", slug: "", status: "active" };

export const tenantManagementService = adminTenantsService;

export function normalizeTenantList(payload) {
  const source = payload?.data && typeof payload.data === "object" ? payload.data : payload;
  return Array.isArray(source?.tenants) ? source.tenants : [];
}

export function slugifyTenantName(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function isOwner(user, explicitValue) {
  if (typeof explicitValue === "boolean") return explicitValue;
  return Boolean(user?.is_platform_owner ?? user?.isPlatformOwner);
}

function formatDate(value) {
  if (!value) return "Chưa có dữ liệu";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Chưa có dữ liệu";
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export default function TenantsPage({
  service = tenantManagementService,
  isPlatformOwner,
}) {
  const { user } = useAuth();
  const platformOwner = isOwner(user, isPlatformOwner);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(platformOwner);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState("");
  const [editor, setEditor] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const loadTenants = useCallback(async (options = {}) => {
    if (!platformOwner) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setTenants(normalizeTenantList(await service.list(options)));
    } catch (requestError) {
      if (requestError?.name !== "AbortError") {
        setError(requestError instanceof Error ? requestError : new Error(String(requestError)));
      }
    } finally {
      if (!options.signal?.aborted) setLoading(false);
    }
  }, [platformOwner, service]);

  useEffect(() => {
    if (!platformOwner) {
      setLoading(false);
      return undefined;
    }
    const controller = new AbortController();
    loadTenants({ signal: controller.signal });
    return () => controller.abort();
  }, [loadTenants, platformOwner]);

  const metrics = useMemo(() => {
    const active = tenants.filter((tenant) => tenant.status === "active").length;
    const suspended = tenants.length - active;
    const overrides = tenants.reduce(
      (sum, tenant) => sum + (Number(tenant.config_version) || 0),
      0,
    );
    return [
      { label: "Tổng trung tâm", value: tenants.length, helper: "Tenant trên platform", icon: Building2, tone: "indigo" },
      { label: "Đang hoạt động", value: active, helper: "Cho phép đăng nhập", icon: CheckCircle2, tone: "emerald" },
      { label: "Tạm ngưng", value: suspended, helper: "Đã khóa đăng nhập", icon: CirclePause, tone: suspended ? "amber" : "slate" },
      { label: "Phiên bản cấu hình", value: overrides, helper: "Tổng config version", icon: RefreshCw, tone: "sky" },
    ];
  }, [tenants]);

  const openCreate = () => {
    setNotice("");
    setEditor({ mode: "create", tenant: null });
  };

  const openEdit = (tenant) => {
    setNotice("");
    setEditor({ mode: "edit", tenant });
  };

  const saveTenant = async (form) => {
    setSubmitting(true);
    setNotice("");
    try {
      if (editor.mode === "create") {
        await service.create({ name: form.name.trim(), slug: form.slug.trim().toLowerCase() });
        setNotice("Đã tạo trung tâm mới.");
      } else {
        await service.update({
          id: editor.tenant.id,
          name: form.name.trim(),
          slug: form.slug.trim().toLowerCase(),
          status: form.status,
        });
        setNotice("Đã cập nhật trung tâm.");
      }
      setEditor(null);
      await loadTenants();
    } catch (requestError) {
      throw requestError instanceof Error ? requestError : new Error(String(requestError));
    } finally {
      setSubmitting(false);
    }
  };

  if (!platformOwner) {
    return (
      <OperationalPage className="w-full min-w-0" data-testid="console-tenants-page">
        <PageIntro
          eyebrow="Admin Console"
          title="Quản lý trung tâm"
          description="Control plane quản lý vòng đời tenant của Edu Manager."
        />
        <PageState
          title="Chỉ Platform Owner được truy cập"
          message="Tài khoản hiện tại không có quyền xem hoặc thay đổi trung tâm trên platform."
          tone="red"
        />
      </OperationalPage>
    );
  }

  return (
    <OperationalPage className="w-full min-w-0" data-testid="console-tenants-page">
      <PageIntro
        eyebrow="Platform Control Plane"
        title="Quản lý trung tâm"
        description="Tạo trung tâm, cập nhật nhận diện và kiểm soát trạng thái đăng nhập của từng tenant."
        status="Platform Owner"
        actions={(
          <>
            <button type="button" className="btn-primary inline-flex items-center gap-2" onClick={openCreate}>
              <Plus size={17} aria-hidden="true" /> Thêm trung tâm
            </button>
            <button type="button" className="btn-secondary inline-flex items-center gap-2" onClick={() => loadTenants()} disabled={loading}>
              <RefreshCw size={17} aria-hidden="true" /> Làm mới
            </button>
          </>
        )}
      />

      {notice && (
        <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
          {notice}
        </div>
      )}

      <AsyncBoundary
        loading={loading}
        error={error}
        onRetry={() => loadTenants()}
        loadingLabel="Đang tải danh sách trung tâm..."
        loadingDetail="Hệ thống đang kiểm tra trạng thái và phiên bản cấu hình của từng tenant."
        errorTitle="Không tải được danh sách trung tâm"
      >
        {tenants.length === 0 ? (
          <PageState
            title="Chưa có trung tâm"
            message="Tạo tenant đầu tiên để bắt đầu cấu hình control plane."
            tone="slate"
            action={openCreate}
            actionLabel="Thêm trung tâm"
          />
        ) : (
          <>
            <MetricGrid metrics={metrics} />
            <ListPanel
              title="Danh sách trung tâm"
              description="Tenant bị tạm ngưng sẽ không thể đăng nhập. Mọi thay đổi được backend ghi audit."
              countLabel={`${tenants.length} trung tâm`}
            >
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-black uppercase tracking-[0.08em] text-slate-500">
                      <th className="px-4 py-3">Trung tâm</th>
                      <th className="px-4 py-3">Trạng thái</th>
                      <th className="px-4 py-3">Config version</th>
                      <th className="px-4 py-3">Cập nhật</th>
                      <th className="px-4 py-3 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {tenants.map((tenant) => (
                      <tr key={tenant.id} className="transition-colors hover:bg-slate-50/70">
                        <td className="px-4 py-4">
                          <div className="flex min-w-0 items-center gap-3">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100">
                              <Building2 size={19} aria-hidden="true" />
                            </span>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-black text-slate-950">{tenant.name}</p>
                              <code className="mt-1 block truncate text-xs text-slate-500">{tenant.slug}</code>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold ${tenant.status === "active" ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100" : "bg-amber-50 text-amber-800 ring-1 ring-amber-100"}`}>
                            <span className={`h-2 w-2 rounded-full ${tenant.status === "active" ? "bg-emerald-500" : "bg-amber-500"}`} />
                            {tenant.status === "active" ? "Đang hoạt động" : "Tạm ngưng"}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-sm font-bold text-slate-700">{Number(tenant.config_version) || 0}</td>
                        <td className="px-4 py-4 text-sm text-slate-500">{formatDate(tenant.updated_at)}</td>
                        <td className="px-4 py-4 text-right">
                          <button type="button" className="btn-secondary inline-flex items-center gap-2" onClick={() => openEdit(tenant)} aria-label={`Sửa trung tâm ${tenant.name}`}>
                            <Pencil size={15} aria-hidden="true" /> Sửa
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ListPanel>
          </>
        )}
      </AsyncBoundary>

      {editor && (
        <TenantEditor
          mode={editor.mode}
          tenant={editor.tenant}
          submitting={submitting}
          onClose={() => !submitting && setEditor(null)}
          onSubmit={saveTenant}
        />
      )}
    </OperationalPage>
  );
}

function TenantEditor({ mode, tenant, submitting, onClose, onSubmit }) {
  const [form, setForm] = useState(() => tenant ? {
    name: tenant.name || "",
    slug: tenant.slug || "",
    status: tenant.status || "active",
  } : EMPTY_FORM);
  const [slugTouched, setSlugTouched] = useState(mode === "edit");
  const [formError, setFormError] = useState("");

  const updateName = (name) => {
    setForm((current) => ({
      ...current,
      name,
      ...(!slugTouched ? { slug: slugifyTenantName(name) } : {}),
    }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setFormError("");
    if (!form.name.trim() || !form.slug.trim()) {
      setFormError("Tên trung tâm và mã tenant là bắt buộc.");
      return;
    }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(form.slug.trim().toLowerCase())) {
      setFormError("Mã tenant chỉ gồm chữ thường, số và dấu gạch nối đơn.");
      return;
    }
    try {
      await onSubmit(form);
    } catch (requestError) {
      setFormError(requestError?.message || "Không thể lưu trung tâm.");
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/45 p-3 backdrop-blur-sm sm:p-6" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section role="dialog" aria-modal="true" aria-labelledby="tenant-editor-title" className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/70 bg-white shadow-2xl">
        <header className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.12em] text-indigo-600">Platform tenant</p>
            <h2 id="tenant-editor-title" className="mt-1 text-xl font-black text-slate-950">{mode === "create" ? "Thêm trung tâm" : "Cập nhật trung tâm"}</h2>
          </div>
          <button type="button" className="btn-icon" onClick={onClose} disabled={submitting} aria-label="Đóng cửa sổ">
            <X size={20} aria-hidden="true" />
          </button>
        </header>

        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-6">
            {formError && (
              <div role="alert" className="flex gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                <ShieldAlert size={18} className="mt-0.5 shrink-0" aria-hidden="true" /> {formError}
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-bold text-slate-700">
                Tên trung tâm *
                <input className="input mt-2 w-full" value={form.name} onChange={(event) => updateName(event.target.value)} maxLength={160} autoFocus />
              </label>
              <label className="block text-sm font-bold text-slate-700">
                Mã tenant *
                <input className="input mt-2 w-full font-mono" value={form.slug} onChange={(event) => { setSlugTouched(true); setForm((current) => ({ ...current, slug: event.target.value.toLowerCase() })); }} maxLength={63} placeholder="gau-center" />
              </label>
            </div>
            <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
              Mã tenant dùng để định danh trung tâm khi đăng nhập và phải duy nhất trên toàn platform.
            </p>
            {mode === "edit" && (
              <fieldset>
                <legend className="text-sm font-bold text-slate-700">Trạng thái đăng nhập</legend>
                <div className="mt-2 grid gap-3 sm:grid-cols-2">
                  {[{ value: "active", label: "Đang hoạt động", detail: "Người dùng được phép đăng nhập." }, { value: "suspended", label: "Tạm ngưng", detail: "Khóa toàn bộ đăng nhập của tenant." }].map((option) => (
                    <label key={option.value} className={`cursor-pointer rounded-xl border p-4 transition ${form.status === option.value ? "border-indigo-400 bg-indigo-50 ring-2 ring-indigo-100" : "border-slate-200 hover:bg-slate-50"}`}>
                      <input type="radio" name="tenant-status" value={option.value} checked={form.status === option.value} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))} className="sr-only" />
                      <span className="block text-sm font-black text-slate-900">{option.label}</span>
                      <span className="mt-1 block text-xs leading-5 text-slate-500">{option.detail}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            )}
          </div>
          <footer className="flex justify-end gap-3 border-t border-slate-200 bg-white px-5 py-4 sm:px-6">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={submitting}>Hủy</button>
            <button type="submit" className="btn-primary min-w-32" disabled={submitting}>{submitting ? "Đang lưu..." : mode === "create" ? "Tạo trung tâm" : "Lưu thay đổi"}</button>
          </footer>
        </form>
      </section>
    </div>
  );
}
