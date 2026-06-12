import { useEffect, useState } from "react";
import { centerSettingsService } from "../services/api";
import { useAsyncData } from "../hooks/useAsyncData";
import { useToast } from "../components/ui/Toast";
import ActionProgressButton from "../components/ui/ActionProgressButton";

const emptyForm = {
  center_name: "",
  center_address: "",
  center_phone: "",
  center_email: "",
  center_logo: "",
};

export default function CenterSettingsPage() {
  const toast = useToast();
  const [formData, setFormData] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const { data, loading, error, reload } = useAsyncData(async () => {
    const response = await centerSettingsService.get();
    if (!response.success) {
      throw new Error(response.error?.message || "Không tải được cài đặt");
    }
    return response.data;
  }, "center-settings");

  useEffect(() => {
    if (data) {
      setFormData({
        center_name: data.center_name || "",
        center_address: data.center_address || "",
        center_phone: data.center_phone || "",
        center_email: data.center_email || "",
        center_logo: data.center_logo || "",
      });
    }
  }, [data]);

  function updateField(key, value) {
    setFormData((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await centerSettingsService.update(formData);
      if (!response.success) {
        throw new Error(response.error?.message || "Không lưu được cài đặt");
      }
      toast.success("Đã lưu cài đặt trung tâm");
      await reload();
    } catch (saveError) {
      toast.error(saveError.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleReload() {
    try {
      await reload();
    } catch (reloadError) {
      toast.error(reloadError.message);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cài đặt trung tâm</h1>
          <p className="text-gray-500">Thông tin dùng cho phiếu in, báo cáo và hồ sơ vận hành.</p>
        </div>
        <button
          type="button"
          onClick={handleReload}
          disabled={loading || saving}
          className="btn-secondary self-start disabled:cursor-not-allowed disabled:opacity-60 lg:self-auto"
        >
          Làm mới
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <form onSubmit={handleSubmit} className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900">Hồ sơ trung tâm</h2>
          </div>
          <div className="card-body space-y-4">
            {error && (
              <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error.message}
              </div>
            )}

            <div>
              <label htmlFor="center_name" className="mb-1 block text-sm font-medium text-gray-700">
                Tên trung tâm
              </label>
              <input
                id="center_name"
                className="input"
                value={formData.center_name}
                onChange={(event) => updateField("center_name", event.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="center_address" className="mb-1 block text-sm font-medium text-gray-700">
                Địa chỉ
              </label>
              <input
                id="center_address"
                className="input"
                value={formData.center_address}
                onChange={(event) => updateField("center_address", event.target.value)}
                disabled={loading}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label htmlFor="center_phone" className="mb-1 block text-sm font-medium text-gray-700">
                  Điện thoại
                </label>
                <input
                  id="center_phone"
                  className="input"
                  value={formData.center_phone}
                  onChange={(event) => updateField("center_phone", event.target.value)}
                  disabled={loading}
                />
              </div>
              <div>
                <label htmlFor="center_email" className="mb-1 block text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  id="center_email"
                  className="input"
                  type="email"
                  value={formData.center_email}
                  onChange={(event) => updateField("center_email", event.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label htmlFor="center_logo" className="mb-1 block text-sm font-medium text-gray-700">
                Logo URL
              </label>
              <input
                id="center_logo"
                className="input"
                value={formData.center_logo}
                onChange={(event) => updateField("center_logo", event.target.value)}
                disabled={loading}
                placeholder="https://..."
              />
            </div>
          </div>
          <div className="card-footer flex justify-end">
            <ActionProgressButton
              type="submit"
              loading={saving}
              disabled={loading}
              loadingLabel="Đang lưu..."
              className="btn-primary"
            >
              Lưu cài đặt
            </ActionProgressButton>
          </div>
        </form>

        <aside className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900">Xem trước</h2>
          </div>
          <div className="card-body space-y-3">
            <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-primary-100 text-xl font-bold text-primary-700">
              {(formData.center_name || "E").slice(0, 1).toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-gray-900">{formData.center_name || "Tên trung tâm"}</p>
              <p className="text-sm text-gray-500">{formData.center_address || "Địa chỉ"}</p>
            </div>
            <div className="space-y-1 text-sm text-gray-600">
              <p>{formData.center_phone || "Điện thoại"}</p>
              <p>{formData.center_email || "Email"}</p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
