import { useCallback, useEffect, useMemo, useState } from "react";
import {
  KeyRound,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import AsyncBoundary from "../components/ui/AsyncBoundary";
import PageState from "../components/ui/PageState";
import {
  ListPanel,
  MetricGrid,
  OperationalPage,
  PageIntro,
} from "../components/ui/OperationalPage";
import { adminPermissionsService, adminSettingsService } from "../services/api";
import SettingEditorCard from "./SettingEditorCard";
import { normalizeSettingsPayload } from "./consoleSettingsModel";

const DOMAIN_LABELS = Object.freeze({
  people: "Con người",
  academic: "Học thuật",
  attendance: "Điểm danh",
  finance: "Tài chính",
  reports: "Báo cáo",
  operations: "Vận hành",
  console: "Admin Console",
});

const ROLE_LABELS = Object.freeze({
  admin: "Quản trị viên",
  receptionist: "Lễ tân",
});

const PROTECTED_ADMIN_PERMISSIONS = new Set([
  "console.access",
  "console.access.edit",
]);

export const accessManagementService = adminPermissionsService;

export function normalizePermissionPayload(payload) {
  const source = payload?.data && typeof payload.data === "object"
    ? payload.data
    : payload;
  return {
    roles: Array.isArray(source?.roles) ? source.roles : [],
    catalog: Array.isArray(source?.catalog) ? source.catalog : [],
    matrix: source?.effective_matrix && typeof source.effective_matrix === "object"
      ? source.effective_matrix
      : {},
  };
}

export function groupPermissionsByDomain(catalog) {
  return catalog.reduce((groups, permission) => {
    const domain = permission.domain || "operations";
    if (!groups[domain]) groups[domain] = [];
    groups[domain].push(permission);
    return groups;
  }, {});
}

function cellKey(role, permissionKey) {
  return `${role}:${permissionKey}`;
}

function isProtectedAdminCell(role, permissionKey) {
  return role === "admin" && PROTECTED_ADMIN_PERMISSIONS.has(permissionKey);
}

function roleLabel(role) {
  return ROLE_LABELS[role] || role;
}

function PermissionToggle({
  role,
  permission,
  state,
  pending,
  disabled,
  onToggle,
}) {
  const checked = state?.allowed === true;
  const protectedCell = isProtectedAdminCell(role, permission.key);
  const label = `${checked ? "Tắt" : "Bật"} quyền ${permission.label_vi} cho ${roleLabel(role)}`;

  return (
    <div className="flex min-w-28 flex-col items-center gap-1.5">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={protectedCell ? "Quyền bắt buộc để tránh khóa Admin Console" : label}
        title={protectedCell ? "Quyền bắt buộc để tránh khóa Admin Console" : label}
        disabled={disabled || protectedCell}
        onClick={() => onToggle(role, permission.key, !checked)}
        className={`relative inline-flex h-7 w-12 items-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed ${checked ? "border-indigo-600 bg-indigo-600" : "border-slate-300 bg-slate-200"} ${pending ? "animate-pulse" : ""}`}
      >
        <span className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${checked ? "translate-x-6" : "translate-x-1"}`} />
      </button>
      <span className={`text-center text-[11px] font-bold ${protectedCell ? "text-amber-700" : state?.is_override ? "text-indigo-700" : "text-slate-500"}`}>
        {pending
          ? "Đang lưu..."
          : protectedCell
            ? "Bắt buộc"
            : state?.is_override
              ? "Tùy chỉnh"
              : "Mặc định"}
      </span>
    </div>
  );
}

export default function AccessPage({ service = accessManagementService, settingsService = adminSettingsService }) {
  const [roles, setRoles] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [matrix, setMatrix] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState("");
  const [updateError, setUpdateError] = useState("");
  const [pendingCell, setPendingCell] = useState("");
  const [securitySettings, setSecuritySettings] = useState([]);
  const [savingSetting, setSavingSetting] = useState("");

  const loadMatrix = useCallback(async (options = {}) => {
    setLoading(true);
    setError(null);
    try {
      const [permissionPayload, settingsResponse] = await Promise.all([
        service.get(options),
        settingsService.getAll({ group: "access" }, { ...options, skipCache: true }),
      ]);
      const normalized = normalizePermissionPayload(permissionPayload);
      setRoles(normalized.roles);
      setCatalog(normalized.catalog);
      setMatrix(normalized.matrix);
      if (!settingsResponse?.success) throw new Error(settingsResponse?.error?.message || "Không tải được chính sách bảo mật");
      setSecuritySettings(normalizeSettingsPayload(settingsResponse.data));
    } catch (requestError) {
      if (requestError?.name !== "AbortError") {
        setError(requestError instanceof Error ? requestError : new Error(String(requestError)));
      }
    } finally {
      if (!options.signal?.aborted) setLoading(false);
    }
  }, [service]);

  const saveSecuritySetting = async (key, payload) => {
    setSavingSetting(key);
    setUpdateError("");
    try {
      const response = await settingsService.update(key, payload);
      if (!response?.success) throw new Error(response?.error?.message || "Không lưu được chính sách bảo mật");
      setNotice("Đã cập nhật chính sách bảo mật.");
      const refreshed = await settingsService.getAll({ group: "access" }, { skipCache: true });
      if (refreshed?.success) setSecuritySettings(normalizeSettingsPayload(refreshed.data));
    } catch (requestError) {
      setUpdateError(requestError?.message || "Không lưu được chính sách bảo mật.");
    } finally {
      setSavingSetting("");
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    loadMatrix({ signal: controller.signal });
    return () => controller.abort();
  }, [loadMatrix]);

  const groupedPermissions = useMemo(
    () => groupPermissionsByDomain(catalog),
    [catalog],
  );

  const metrics = useMemo(() => {
    const enabled = roles.reduce(
      (total, role) => total + catalog.filter(
        (permission) => matrix?.[role]?.[permission.key]?.allowed === true,
      ).length,
      0,
    );
    const overrides = roles.reduce(
      (total, role) => total + catalog.filter(
        (permission) => matrix?.[role]?.[permission.key]?.is_override === true,
      ).length,
      0,
    );
    return [
      { label: "Vai trò", value: roles.length, helper: "Nhóm quyền đang quản lý", icon: UsersRound, tone: "indigo" },
      { label: "Quyền hệ thống", value: catalog.length, helper: "Permission trong catalog", icon: KeyRound, tone: "sky" },
      { label: "Đang cấp", value: enabled, helper: "Tổng quyền effective", icon: ShieldCheck, tone: "emerald" },
      { label: "Tùy chỉnh", value: overrides, helper: "Khác cấu hình mặc định", icon: RefreshCw, tone: overrides ? "amber" : "slate" },
    ];
  }, [catalog, matrix, roles]);

  const togglePermission = async (role, permissionKey, allowed) => {
    if (pendingCell || isProtectedAdminCell(role, permissionKey)) return;
    const key = cellKey(role, permissionKey);
    const previousMatrix = matrix;
    const previousCell = matrix?.[role]?.[permissionKey] || {};
    setNotice("");
    setUpdateError("");
    setPendingCell(key);
    setMatrix((current) => ({
      ...current,
      [role]: {
        ...current[role],
        [permissionKey]: {
          ...current[role]?.[permissionKey],
          allowed,
        },
      },
    }));

    try {
      const result = await service.update({
        role,
        permission_key: permissionKey,
        allowed,
      });
      setMatrix((current) => ({
        ...current,
        [role]: {
          ...current[role],
          [permissionKey]: {
            ...previousCell,
            allowed: result.allowed ?? allowed,
            is_override: result.isOverride ?? result.is_override ?? (allowed !== previousCell.default_allowed),
            override: result.isOverride === false || result.is_override === false ? null : allowed,
          },
        },
      }));
      setNotice(`Đã cập nhật “${catalog.find((item) => item.key === permissionKey)?.label_vi || permissionKey}” cho ${roleLabel(role)}.`);
    } catch (requestError) {
      setMatrix(previousMatrix);
      setUpdateError(
        requestError?.code === "LOCKOUT_PREVENTED"
          ? "Không thể tắt quyền cốt lõi vì thao tác này sẽ khóa quản trị viên khỏi Admin Console."
          : requestError?.message || "Không thể cập nhật quyền. Thay đổi đã được hoàn tác.",
      );
    } finally {
      setPendingCell("");
    }
  };

  return (
    <OperationalPage className="w-full min-w-0" data-testid="console-access-page">
      <PageIntro
        eyebrow="Security & Access"
        title="Ma trận phân quyền"
        description="Quản lý quyền effective theo vai trò. Tùy chỉnh được ghi audit và áp dụng trong phạm vi trung tâm hiện tại."
        status="Tenant scoped"
        actions={(
          <button type="button" className="btn-secondary inline-flex items-center gap-2" onClick={() => loadMatrix()} disabled={loading || Boolean(pendingCell)}>
            <RefreshCw size={17} aria-hidden="true" /> Làm mới
          </button>
        )}
      />

      {notice && (
        <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
          {notice}
        </div>
      )}
      {updateError && (
        <div role="alert" className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          <LockKeyhole size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>{updateError}</span>
        </div>
      )}
      {pendingCell && (
        <p role="status" className="sr-only">Đang lưu quyền, vui lòng chờ.</p>
      )}

      <AsyncBoundary
        loading={loading}
        error={error}
        onRetry={() => loadMatrix()}
        loadingLabel="Đang tải ma trận quyền..."
        loadingDetail="Hệ thống đang tổng hợp quyền mặc định và các tùy chỉnh của trung tâm."
        errorTitle="Không tải được ma trận quyền"
      >
        {roles.length === 0 || catalog.length === 0 ? (
          <PageState
            title="Chưa có quyền nào được cấu hình"
            message="Catalog quyền hoặc danh sách vai trò đang trống. Kiểm tra cấu hình backend trước khi phân quyền."
            tone="amber"
            action={() => loadMatrix()}
            actionLabel="Tải lại"
          />
        ) : (
          <>
            <MetricGrid metrics={metrics} />
            <ListPanel
              title="Ma trận phân quyền"
              description="Bật hoặc tắt quyền theo từng vai trò. Nhãn “Tùy chỉnh” cho biết giá trị đã khác mặc định hệ thống."
              countLabel={`${catalog.length} quyền · ${roles.length} vai trò`}
            >
              <div className="mb-3 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                <LockKeyhole size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
                <p><strong>Chống tự khóa:</strong> quyền truy cập và sửa phân quyền của Quản trị viên luôn được giữ bật.</p>
              </div>
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full min-w-[760px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-xs font-black uppercase tracking-[0.08em] text-slate-500">
                      <th className="sticky left-0 z-10 min-w-80 bg-slate-50 px-4 py-3">Quyền</th>
                      {roles.map((role) => (
                        <th key={role} className="min-w-36 px-4 py-3 text-center">{roleLabel(role)}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(groupedPermissions).map(([domain, permissions]) => (
                      <PermissionDomainRows
                        key={domain}
                        domain={domain}
                        permissions={permissions}
                        roles={roles}
                        matrix={matrix}
                        pendingCell={pendingCell}
                        onToggle={togglePermission}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </ListPanel>
            <ListPanel
              title="Chính sách bảo mật"
              description="Thời hạn phiên và giới hạn đăng nhập của tenant hiện tại. Mọi thay đổi đều tạo revision."
              countLabel={`${securitySettings.length} tham số`}
            >
              <div className="space-y-4 p-4">
                {securitySettings.map((setting) => (
                  <SettingEditorCard
                    key={setting.key}
                    setting={setting}
                    saving={savingSetting === setting.key}
                    onSave={saveSecuritySetting}
                  />
                ))}
              </div>
            </ListPanel>
          </>
        )}
      </AsyncBoundary>
    </OperationalPage>
  );
}

function PermissionDomainRows({
  domain,
  permissions,
  roles,
  matrix,
  pendingCell,
  onToggle,
}) {
  return (
    <>
      <tr className="border-y border-slate-200 bg-indigo-50/70">
        <th colSpan={roles.length + 1} className="px-4 py-2 text-xs font-black uppercase tracking-[0.1em] text-indigo-700">
          {DOMAIN_LABELS[domain] || domain}
        </th>
      </tr>
      {permissions.map((permission) => (
        <tr key={permission.key} className="border-b border-slate-100 transition-colors hover:bg-slate-50/70">
          <th scope="row" className="sticky left-0 z-[1] bg-white px-4 py-4 align-top shadow-[1px_0_0_0_rgb(226_232_240)]">
            <p className="text-sm font-black text-slate-950">{permission.label_vi}</p>
            <p className="mt-1 max-w-xl text-xs font-normal leading-5 text-slate-500">{permission.description_vi}</p>
            <code className="mt-2 block break-all text-[11px] font-semibold text-indigo-600">{permission.key}</code>
          </th>
          {roles.map((role) => {
            const key = cellKey(role, permission.key);
            return (
              <td key={role} className="px-4 py-4 text-center align-middle">
                <PermissionToggle
                  role={role}
                  permission={permission}
                  state={matrix?.[role]?.[permission.key]}
                  pending={pendingCell === key}
                  disabled={Boolean(pendingCell)}
                  onToggle={onToggle}
                />
              </td>
            );
          })}
        </tr>
      ))}
    </>
  );
}
