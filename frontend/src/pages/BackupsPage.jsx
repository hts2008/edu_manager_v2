import { useState } from "react";
import { backupsService } from "../services/api";

export default function BackupsPage() {
  const [backup, setBackup] = useState(null);
  const [verifyUrl, setVerifyUrl] = useState("");
  const [verifyResult, setVerifyResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function runBackup(dryRun) {
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const response = await backupsService.run(dryRun);
      if (!response.success) {
        setError(response.error?.message || "Backup failed");
        return;
      }
      setBackup(response.data);
      if (response.data.url) setVerifyUrl(response.data.url);
      setMessage(dryRun ? "Backup dry-run complete" : "Encrypted backup uploaded");
    } finally {
      setLoading(false);
    }
  }

  async function verifyBackup() {
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const response = await backupsService.verify(verifyUrl);
      if (!response.success) {
        setError(response.error?.message || "Verify failed");
        return;
      }
      setVerifyResult(response.data);
      setMessage("Restore drill verified");
    } finally {
      setLoading(false);
    }
  }

  const counts = backup?.counts || verifyResult?.counts || {};

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Backups</h1>
          <p className="text-gray-500">Encrypted JSON backup and restore-drill validation.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => runBackup(true)} disabled={loading} className="btn-secondary disabled:opacity-50">
            Dry run
          </button>
          <button onClick={() => runBackup(false)} disabled={loading} className="btn-primary disabled:opacity-50">
            Run backup
          </button>
        </div>
      </div>

      {message && <div className="rounded border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div>}
      {error && <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-gray-900">Latest backup</h2>
        </div>
        <div className="card-body space-y-3">
          <div className="grid gap-3 md:grid-cols-3">
            <div><p className="text-sm text-gray-500">Uploaded</p><p className="font-semibold">{backup?.uploaded ? "yes" : "no"}</p></div>
            <div><p className="text-sm text-gray-500">Encrypted</p><p className="font-semibold">{backup?.encrypted ? "yes" : "no"}</p></div>
            <div><p className="text-sm text-gray-500">Created</p><p className="font-semibold">{backup?.created_at || "-"}</p></div>
          </div>
          {backup?.url && (
            <input className="input" value={backup.url} readOnly aria-label="Backup URL" />
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-gray-900">Restore drill</h2>
        </div>
        <div className="card-body space-y-3">
          <div className="grid gap-3 md:grid-cols-[1fr_auto]">
            <input
              className="input"
              value={verifyUrl}
              onChange={(event) => setVerifyUrl(event.target.value)}
              placeholder="Encrypted backup URL"
              aria-label="Verify backup URL"
            />
            <button onClick={verifyBackup} disabled={!verifyUrl || loading} className="btn-secondary disabled:opacity-50">
              Verify
            </button>
          </div>
          {verifyResult && <p className="text-sm text-emerald-700">Valid backup from {verifyResult.created_at}</p>}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-gray-900">Table counts</h2>
        </div>
        <div className="card-body grid gap-3 md:grid-cols-4">
          {Object.entries(counts).map(([table, count]) => (
            <div key={table} className="rounded border border-gray-200 p-3">
              <p className="text-sm text-gray-500">{table}</p>
              <p className="text-xl font-bold text-gray-900">{count}</p>
            </div>
          ))}
          {!Object.keys(counts).length && <p className="text-sm text-gray-500">No backup result yet</p>}
        </div>
      </div>
    </div>
  );
}
