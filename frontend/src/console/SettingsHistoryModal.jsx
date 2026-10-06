import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock3,
  History,
  RotateCcw,
  UserRound,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import Modal from "../components/ui/Modal";
import Spinner from "../components/ui/Spinner";
import { adminSettingsService } from "../services/api";
import {
  formatRevisionDate,
  formatRevisionValue,
  normalizeSettingHistoryPayload,
  revisionActorLabel,
} from "./consoleSettingsHistoryModel";

const PAGE_SIZE = 10;

function RevisionValue({ label, value, tone = "slate" }) {
  const toneClass = tone === "indigo"
    ? "border-indigo-100 bg-indigo-50/70"
    : "border-slate-200 bg-slate-50";

  return (
    <div className={`min-w-0 rounded-xl border p-3 ${toneClass}`}>
      <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">{label}</p>
      <pre className="mt-2 max-h-36 overflow-auto whitespace-pre-wrap break-words font-sans text-sm leading-5 text-slate-800">
        {formatRevisionValue(value)}
      </pre>
    </div>
  );
}

export default function SettingsHistoryModal({ setting, isOpen, onClose, onRolledBack }) {
  const settingKey = setting?.key || "";
  const [history, setHistory] = useState(() => normalizeSettingHistoryPayload(null));
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rollbackRevision, setRollbackRevision] = useState(null);
  const [changeNote, setChangeNote] = useState("");
  const [rollbackError, setRollbackError] = useState("");
  const [rollingBack, setRollingBack] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const loadHistory = useCallback(async (requestedPage) => {
    if (!settingKey) return;
    setLoading(true);
    setError("");
    const response = await adminSettingsService.getRevisions(settingKey, {
      page: requestedPage,
      page_size: PAGE_SIZE,
    });
    if (!response?.success) {
      setError(response?.error?.message || "Không thể tải lịch sử thay đổi.");
    } else {
      setHistory(normalizeSettingHistoryPayload(response.data));
    }
    setLoading(false);
  }, [settingKey]);

  useEffect(() => {
    if (!isOpen || !settingKey) return;
    setPage(1);
    setRollbackRevision(null);
    setChangeNote("");
    setRollbackError("");
    setSuccessMessage("");
    loadHistory(1);
  }, [isOpen, loadHistory, settingKey]);

  async function changePage(nextPage) {
    if (loading || nextPage < 1 || nextPage > history.totalPages) return;
    setPage(nextPage);
    setRollbackRevision(null);
    await loadHistory(nextPage);
  }

  function beginRollback(revision) {
    setRollbackRevision(revision);
    setChangeNote("");
    setRollbackError("");
    setSuccessMessage("");
  }

  async function confirmRollback() {
    const note = changeNote.trim();
    if (!note) {
      setRollbackError("Nhập lý do rollback để lưu dấu vết kiểm toán.");
      return;
    }

    setRollingBack(true);
    setRollbackError("");
    const response = await adminSettingsService.rollback(
      settingKey,
      rollbackRevision.id,
      note,
    );
    if (!response?.success) {
      setRollbackError(response?.error?.message || "Không thể rollback phiên bản này.");
      setRollingBack(false);
      return;
    }

    setRollbackRevision(null);
    setChangeNote("");
    setSuccessMessage("Đã rollback và tạo một phiên bản lịch sử mới.");
    await Promise.all([loadHistory(1), onRolledBack?.()]);
    setPage(1);
    setRollingBack(false);
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Lịch sử: ${setting?.labelVi || setting?.label || setting?.key || "Cấu hình"}`}
      size="xl"
      busy={rollingBack}
      busyLabel="Đang rollback cấu hình..."
    >
      <div data-testid="settings-history-modal" className="space-y-4">
        <div className="rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3">
          <p className="break-all font-mono text-xs font-bold text-indigo-700">{setting?.key}</p>
          <p className="mt-1 text-sm text-indigo-900">Mỗi rollback tạo revision mới; lịch sử cũ không bị ghi đè.</p>
        </div>

        {successMessage && (
          <div role="status" className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
            <CheckCircle2 size={18} /> {successMessage}
          </div>
        )}

        {loading ? (
          <div role="status" aria-live="polite" className="flex min-h-56 flex-col items-center justify-center gap-3 rounded-xl border border-slate-200 bg-slate-50">
            <Spinner size="md" />
            <p className="text-sm font-bold text-slate-700">Đang tải lịch sử phiên bản...</p>
          </div>
        ) : error ? (
          <div role="alert" className="flex min-h-48 flex-col items-center justify-center rounded-xl border border-rose-200 bg-rose-50 p-6 text-center">
            <AlertCircle className="text-rose-600" size={28} />
            <p className="mt-3 font-bold text-rose-800">Không tải được lịch sử</p>
            <p className="mt-1 text-sm text-rose-700">{error}</p>
            <button type="button" onClick={() => loadHistory(page)} className="mt-4 rounded-lg bg-white px-4 py-2 text-sm font-bold text-rose-700 ring-1 ring-rose-200">
              Thử lại
            </button>
          </div>
        ) : !history.revisions.length ? (
          <div className="flex min-h-48 flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
            <History size={30} className="text-slate-400" />
            <p className="mt-3 font-bold text-slate-800">Chưa có lịch sử thay đổi</p>
            <p className="mt-1 text-sm text-slate-500">Revision đầu tiên sẽ xuất hiện sau khi cấu hình được cập nhật.</p>
          </div>
        ) : (
          <div className="space-y-3" aria-label="Danh sách phiên bản cấu hình">
            {history.revisions.map((revision) => (
              <article key={revision.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-black text-slate-950">Revision #{revision.revision}</p>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1.5"><Clock3 size={14} /> {formatRevisionDate(revision.createdAt)}</span>
                      <span className="inline-flex items-center gap-1.5"><UserRound size={14} /> {revisionActorLabel(revision)}</span>
                    </div>
                    {revision.changeNote && <p className="mt-2 text-sm text-slate-600">{revision.changeNote}</p>}
                  </div>
                  {!setting?.readOnly && (
                    <button
                      type="button"
                      onClick={() => beginRollback(revision)}
                      aria-label={`Rollback về revision ${revision.revision}`}
                      className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-indigo-50 px-3 text-sm font-bold text-indigo-700 hover:bg-indigo-100"
                    >
                      <RotateCcw size={15} /> Rollback
                    </button>
                  )}
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <RevisionValue label="Giá trị trước" value={revision.oldValue} />
                  <RevisionValue label="Giá trị của revision" value={revision.newValue} tone="indigo" />
                </div>
              </article>
            ))}
          </div>
        )}

        {!loading && !error && history.total > 0 && (
          <nav aria-label="Phân trang lịch sử cấu hình" className="flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">{history.total} phiên bản · Trang {history.page}/{history.totalPages}</p>
            <div className="flex gap-2">
              <button type="button" aria-label="Trang lịch sử trước" onClick={() => changePage(page - 1)} disabled={loading || page <= 1} className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-bold text-slate-700 disabled:opacity-40">
                <ArrowLeft size={15} /> Trước
              </button>
              <button type="button" aria-label="Trang lịch sử tiếp theo" onClick={() => changePage(page + 1)} disabled={loading || page >= history.totalPages} className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-bold text-slate-700 disabled:opacity-40">
                Tiếp <ArrowRight size={15} />
              </button>
            </div>
          </nav>
        )}

        {rollbackRevision && (
          <section aria-label="Xác nhận rollback" className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <h3 className="font-black text-amber-950">Xác nhận rollback revision #{rollbackRevision.revision}</h3>
            <p className="mt-1 text-sm leading-6 text-amber-800">Giá trị của revision này sẽ trở thành cấu hình hiện hành và một revision mới sẽ được tạo.</p>
            <label className="mt-4 block text-sm font-bold text-amber-950">
              Lý do rollback <span aria-hidden="true">*</span>
              <textarea
                value={changeNote}
                onChange={(event) => setChangeNote(event.target.value)}
                disabled={rollingBack}
                rows={3}
                maxLength={500}
                aria-required="true"
                placeholder="Ví dụ: Khôi phục chính sách trước sau khi rà soát vận hành"
                className="mt-2 w-full resize-y rounded-lg border border-amber-200 bg-white p-3 text-sm text-slate-800"
              />
            </label>
            {rollbackError && <p role="alert" className="mt-2 text-sm font-bold text-rose-700">{rollbackError}</p>}
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button type="button" onClick={() => setRollbackRevision(null)} disabled={rollingBack} className="h-10 rounded-lg bg-white px-4 text-sm font-bold text-slate-700 ring-1 ring-slate-200 disabled:opacity-50">Hủy</button>
              <button type="button" onClick={confirmRollback} disabled={rollingBack} className="inline-flex h-10 items-center gap-2 rounded-lg bg-amber-600 px-4 text-sm font-bold text-white disabled:opacity-50">
                <RotateCcw size={15} /> {rollingBack ? "Đang rollback..." : "Xác nhận rollback"}
              </button>
            </div>
          </section>
        )}
      </div>
    </Modal>
  );
}
