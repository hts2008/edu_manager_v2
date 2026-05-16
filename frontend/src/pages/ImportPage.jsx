import { useState } from "react";
import { importService } from "../services/api";

const sampleCsv = [
  "student_full_name,date_of_birth,gender,parent_full_name,parent_phone,relationship,enrollment_date,student_phone,student_email,address,notes",
  "Nguyen An,2015-01-02,male,Tran Thi B,0900000001,mother,2026-05-01,,,,",
].join("\n");

function summaryItems(summary) {
  return [
    ["Total rows", summary?.total_rows || 0],
    ["Valid rows", summary?.valid_rows || 0],
    ["Invalid rows", summary?.invalid_rows || 0],
    ["Create parents", summary?.will_create_parents || 0],
    ["Reuse parents", summary?.will_reuse_parents || 0],
    ["Create students", summary?.will_create_students || 0],
  ];
}

function issueText(issues) {
  if (!issues?.length) return "-";
  return issues.map((issue) => `${issue.field}: ${issue.code}`).join(", ");
}

export default function ImportPage() {
  const [csv, setCsv] = useState("");
  const [fileName, setFileName] = useState("");
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function readFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setPreview(null);
    setMessage("");
    setError("");
    const content = await file.text();
    setCsv(content);
  }

  async function runPreview() {
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const response = await importService.previewStudents(csv);
      if (!response.success) {
        setError(response.error?.message || "Preview failed");
        return;
      }
      setPreview(response.data);
      setMessage("Preview ready");
    } finally {
      setLoading(false);
    }
  }

  async function commitImport() {
    if (!preview || preview.summary.invalid_rows > 0) {
      setError("Fix invalid rows before commit");
      return;
    }
    if (!window.confirm(`Commit ${preview.summary.valid_rows} students?`)) return;

    setLoading(true);
    setError("");
    setMessage("");
    try {
      const response = await importService.commitStudents(csv);
      if (!response.success) {
        setError(response.error?.message || "Import failed");
        setPreview(response.error?.details || preview);
        return;
      }
      setMessage(`Imported ${response.data.summary.created_students} students`);
      setPreview(null);
      setCsv("");
      setFileName("");
    } finally {
      setLoading(false);
    }
  }

  function useSample() {
    setCsv(sampleCsv);
    setFileName("sample.csv");
    setPreview(null);
    setError("");
    setMessage("");
  }

  const rows = preview?.rows || [];
  const canCommit =
    preview && preview.summary.valid_rows > 0 && preview.summary.invalid_rows === 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Import CSV</h1>
          <p className="text-gray-500">
            Preview, validate, and commit student-parent CSV imports.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={useSample} className="btn-secondary">
            Load sample
          </button>
          <button
            onClick={runPreview}
            disabled={!csv.trim() || loading}
            className="btn-primary disabled:opacity-50"
          >
            Preview
          </button>
          <button
            onClick={commitImport}
            disabled={!canCommit || loading}
            className="btn-secondary disabled:opacity-50"
          >
            Commit import
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-body space-y-4">
          <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700" htmlFor="csv-file">
                CSV file
              </label>
              <input
                id="csv-file"
                type="file"
                accept=".csv,text/csv"
                onChange={readFile}
                className="input"
              />
              {fileName && <p className="mt-2 text-sm text-gray-500">{fileName}</p>}
            </div>
            <div>
              <label
                className="mb-2 block text-sm font-medium text-gray-700"
                htmlFor="csv-content"
              >
                CSV content
              </label>
              <textarea
                id="csv-content"
                aria-label="CSV content"
                value={csv}
                onChange={(event) => {
                  setCsv(event.target.value);
                  setPreview(null);
                }}
                rows={9}
                className="input font-mono text-sm"
                placeholder="student_full_name,date_of_birth,gender,parent_full_name,parent_phone,relationship,enrollment_date"
              />
            </div>
          </div>
        </div>
      </div>

      {message && (
        <div className="rounded border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {message}
        </div>
      )}
      {error && (
        <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {preview && (
        <>
          <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6" data-testid="import-summary">
            {summaryItems(preview.summary).map(([label, value]) => (
              <div key={label} className="card">
                <div className="card-body">
                  <p className="text-sm text-gray-500">{label}</p>
                  <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="card" data-testid="import-preview-table">
            <div className="card-header flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Preview results</h2>
              {loading && <div className="spinner h-5 w-5" />}
            </div>
            <div className="card-body overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="py-2 pr-4 font-medium">Row</th>
                    <th className="py-2 pr-4 font-medium">Student</th>
                    <th className="py-2 pr-4 font-medium">Parent phone</th>
                    <th className="py-2 pr-4 font-medium">Parent action</th>
                    <th className="py-2 pr-4 font-medium">Status</th>
                    <th className="py-2 pr-4 font-medium">Errors</th>
                    <th className="py-2 pr-4 font-medium">Warnings</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.row_number} className="border-b last:border-0">
                      <td className="py-2 pr-4">{row.row_number}</td>
                      <td className="py-2 pr-4 font-medium text-gray-900">
                        {row.data.student_full_name || "-"}
                      </td>
                      <td className="py-2 pr-4">{row.data.parent_phone || "-"}</td>
                      <td className="py-2 pr-4">{row.parent_action}</td>
                      <td className="py-2 pr-4">
                        <span
                          className={`rounded px-2 py-1 text-xs ${
                            row.valid
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-red-50 text-red-700"
                          }`}
                        >
                          {row.valid ? "valid" : "invalid"}
                        </span>
                      </td>
                      <td className="py-2 pr-4 text-red-700">{issueText(row.errors)}</td>
                      <td className="py-2 pr-4 text-amber-700">{issueText(row.warnings)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
