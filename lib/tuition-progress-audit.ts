import { createHash } from "node:crypto";
import { resolveTuitionProgressTestTarget } from "./tuition-progress-test-target.js";
import type { ReportCubeRow } from "./report-cube.js";
import type { ProgressMonthSnapshot } from "./student-progress-assessment.js";

type Row = Record<string, any>;
type Finding = { finding: "R1" | "R2" | "R3" | "R4" | "R5";
  classification: "difference" | "unknown" | "invalid_configuration" | "read_model_only";
  reason: string; stored?: number | null; canonical?: number | null };
type Metric = { value: number | null; source: any; signature: string | null };
type Outcome = { category: string; protection: string[]; findings: Finding[]; metric?: Metric };
export type AuditReadDatabase = Record<string, any>;

function canonical(value: any): any {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "bigint") return value.toString();
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") return Object.fromEntries(
    Object.keys(value).sort().map(key => [key, canonical(value[key])]),
  );
  return value;
}

export function auditFingerprint(value: unknown) {
  return createHash("sha256").update(JSON.stringify(canonical(value))).digest("hex");
}

export function parseAuditArguments(args: string[], env: Record<string, string | undefined>) {
  if (args.some(arg => arg.startsWith("--apply"))) throw new Error("Inventory is read-only; apply is unsupported");
  if (args.some(arg => arg !== "--dry-run" && !arg.startsWith("--cutoff="))) throw new Error("Unsupported audit argument");
  if (args.filter(arg => arg.startsWith("--cutoff=")).length > 1) throw new Error("Duplicate cutoff");
  const raw = args.find(arg => arg.startsWith("--cutoff="))?.slice(9);
  const cutoff = raw ? new Date(raw) : new Date();
  if (Number.isNaN(cutoff.getTime()) || (raw && !/^\d{4}-\d{2}-\d{2}T.*Z$/.test(raw))) throw new Error("Cutoff must be UTC ISO timestamp");
  const target = resolveTuitionProgressTestTarget({ ...env, TPR_RELEASE_MODE: "true" });
  if (!target) throw new Error("Isolated target is required");
  return { mode: "dry-run" as const, cutoff, target };
}

export function auditProtection(row: Row) {
  if (row.finalizedAt) return ["finalized_academic"];
  const fee = row.monthlyFee || {};
  return [...new Set([
    ...[row.status, fee.status].filter(status => ["confirmed", "paid"].includes(status)),
    ...(row.paidAt || fee.paidAt ? ["paid"] : []),
    ...(row.receiptId || fee.receiptId || row.receiptLines?.length ? ["receipt_linked"] : []),
  ])].sort();
}

function outcome(row: Row, findings: Finding[], metric?: Metric): Outcome {
  const protection = auditProtection(row);
  const category = protection.includes("finalized_academic") ? "finalized_academic"
    : protection.length ? "protected_financial"
    : findings.some(f => f.classification === "invalid_configuration") ? "invalid_configuration"
    : findings.some(f => f.classification === "unknown") ? "provenance_unknown"
    : findings.some(f => f.classification === "difference") ? "mutable_draft"
    : findings.length ? "read_model_only" : "unaffected";
  return { category, protection, findings, ...(metric ? { metric } : {}) };
}

export function auditRecord(row: Row, result: Outcome, sources: unknown) {
  const refs = Object.fromEntries(["tenantId", "studentId", "classId", "id"].map(key =>
    [key.replace("Id", "Ref"), row[key] ? auditFingerprint([row.tenantId, key, row[key]]) : null]));
  return { refs, month: row.month, category: result.category, protection: result.protection,
    action: "none", sourceFingerprint: auditFingerprint(sources),
    findings: result.findings.map(f => ({ ...f, id: auditFingerprint([
      "TPR05-inventory-v1", refs, row.month, f.finding, f.reason,
    ]) })).sort((a, b) => a.id.localeCompare(b.id)) };
}

export async function classifyFinance(input: {
  line: Row; classData: Row | null; enrollments: Row[]; sessions: Row[]; attendance: Row[]; settings: Row;
}) {
  const { line, classData, enrollments, sessions, attendance, settings } = input;
  const findings: Finding[] = [];
  const unknown = (reason: string) => findings.push({ finding: "R1", classification: "unknown", reason });
  if (settings.settings.some((s: Row) => s.warnings?.length)) {
    return outcome(line, [{ finding: "R1", classification: "invalid_configuration", reason: "invalidsettings" }]);
  }
  if (!classData || !enrollments.length || !sessions.length ||
      [classData, ...enrollments, ...sessions, ...attendance].some(r => r.tenantId !== line.tenantId) ||
      !["per_session", "monthly_prorated"].includes(classData.billingPolicy)) {
    unknown("finance_inputs_incomplete"); return outcome(line, findings);
  }
  const sessionIds = new Set(sessions.map(s => s.id));
  if (sessions.some(s => s.replacementForId && !sessionIds.has(s.replacementForId)) ||
      sessions.some(s => !["regular", "extra", "makeup"].includes(s.kind) ||
        !["planned", "held", "cancelled", "holiday"].includes(s.status) ||
        !["included", "surcharge"].includes(s.extraFeeMode)) ||
      new Set(attendance.map(a => a.classSessionId || String(a.attendanceDate))).size !== attendance.length) {
    unknown("finance_inputs_ambiguous"); return outcome(line, findings);
  }
  const { buildStudentTuitionV3 } = await import("./tuition-v3-service.js");
  const { buildTuitionSettingsContext } = await import("./tuition-settings.js");
  let context;
  try {
    context = buildTuitionSettingsContext(Object.fromEntries(settings.settings.map((s: Row) => [s.key, s.value])));
  } catch {
    return outcome(line, [{ finding: "R1", classification: "invalid_configuration", reason: "invalidsettings" }]);
  }
  try {
    const result = buildStudentTuitionV3({ month: line.month, classData: classData as any,
      enrollment: { periods: enrollments }, sessions: sessions as any, attendance: attendance as any, settings: context });
    if (line.amount !== result.amount) findings.push({ finding: "R1", classification: "difference",
      reason: "current_source_amount_mismatch", stored: line.amount, canonical: result.amount });
    // The current ledger snapshot does not pin original settings/class/enrollment provenance.
    unknown("historical_finance_provenance_unverified");
  } catch {
    unknown("finance_inputs_incomplete");
  }
  return outcome(line, findings);
}

function snapshot(record: Row): ProgressMonthSnapshot {
  return { ...record, skills: record.skills.map((s: Row) => ({ skill_key: s.skillKey, score: s.score,
    max_score: s.maxScore, weight: s.weight, source: s.source })),
  dailyEntries: record.dailyEntries.map((e: Row) => ({ entry_date: e.entryDate,
    entry_type: e.entryType, skill_key: e.skillKey, score: e.score,
    exam_set_level: e.examSetLevel, difficulty_level: e.difficultyLevel })) } as ProgressMonthSnapshot;
}

export async function classifyAcademic(input: {
  record: Row; row: ReportCubeRow | null; settings: Row; previous?: Metric;
}): Promise<Outcome> {
  const { record, row, settings, previous } = input;
  const findings: Finding[] = [];
  if (settings.settings.some((s: Row) => s.warnings?.length)) return outcome(record,
    [{ finding: "R5", classification: "invalid_configuration", reason: "invalidsettings" }]);
  if (!row) return outcome(record, [{ finding: "R3", classification: "unknown", reason: "operational_source_missing" }]);
  if (!["communicative", "exam_prep", "mixed"].includes(record.classType) ||
      !["starters", "movers", "flyers", "ket", "pet"].includes(record.trackKey)) {
    return outcome(record, [{ finding: "R3", classification: "unknown", reason: "class_unknown" }]);
  }
  const { buildProgressAssessment, summarizeDailyAssessmentRollup } = await import("./student-progress-assessment.js");
  const { compareProgressScores, storedProgressScore, PROGRESS_FORMULA_VERSION } = await import("./student-progress-evidence.js");
  const { getDifficultyWeight } = await import("./progress-difficulty.js");
  const { academicContextFromSnapshot, resolveAcademicSettings } = await import("./academic-settings.js");
  const progressMonth = snapshot(record);
  const frozen = record.rubricSnapshot?.academicSettings;
  if (record.rubricSnapshot?.scoreEvidence?.formulaVersion !== PROGRESS_FORMULA_VERSION ||
      (record.finalizedAt && !academicContextFromSnapshot(frozen))) findings.push({
    finding: "R3", classification: "unknown", reason: "legacy_provenance_missing" });
  const context = record.finalizedAt ? academicContextFromSnapshot(frozen) : { settings: settings.settings };
  if (record.finalizedAt && !context) return outcome(record, findings);
  try { resolveAcademicSettings(context); } catch {
    return outcome(record, [...findings, { finding: "R5", classification: "invalid_configuration", reason: "invalidsettings" }]);
  }
    const assessment = buildProgressAssessment({ row, progressMonth, settings: context });
    const metric = { value: assessment.progressScore, source: assessment.scoreSource, signature: assessment.comparisonSignature };
    if (!record.finalizedAt && storedProgressScore(record) !== assessment.progressScore) findings.push({
      finding: "R3", classification: "difference", reason: "persisted_open_score_mismatch",
      stored: storedProgressScore(record), canonical: assessment.progressScore });
    const comparison = compareProgressScores(metric, previous);
    if (previous && !comparison.comparable) findings.push({ finding: "R2", classification: "read_model_only",
      reason: "monthly_comparison_requires_disclosure" });
    const daily = summarizeDailyAssessmentRollup(progressMonth.dailyEntries || []);
    if ((record.dailyScoreDelta ?? null) !== daily.scoreDelta) findings.push({ finding: "R4",
      classification: "read_model_only", reason: "daily_comparison_basis_mismatch",
      stored: record.dailyScoreDelta ?? null, canonical: daily.scoreDelta });
    if ((progressMonth.dailyEntries || []).some(e => e.score != null &&
        getDifficultyWeight(e.exam_set_level, record.trackKey, e.difficulty_level, context) !== 1)) {
      findings.push({ finding: "R5", classification: "read_model_only", reason: "raw_performance_settings_disclosure" });
    }
    return outcome(record, findings, metric);
}

const MODELS = ["tenant", "monthlyFee", "monthlyFeeLine", "studentProgressMonth", "studentProgressSkill",
  "studentProgressDailyEntry", "studentProgressRevision", "receiptLine", "class", "classSession",
  "classMonthPlan", "enrollmentPeriod", "studentClass", "attendance", "settingValue"];
async function counts(db: AuditReadDatabase) {
  return Object.fromEntries(await Promise.all(MODELS.map(async model => [model, await db[model].count()])));
}

// Deliberately expose no mutators or raw SQL to domain loaders; record their full read inputs.
function readView(db: AuditReadDatabase, tenantId: string, sources: unknown[]) {
  return new Proxy({}, { get: (_, model: string) => new Proxy({}, { get: (_, method: string) => {
    if (!["findMany", "findFirst", "findUnique", "count"].includes(method)) throw new Error("Audit loader attempted non-read operation");
    return async (args: Row = {}) => {
      const scoped = { ...args, where: { ...args.where, ...(model === "tenant" ? { id: tenantId } : { tenantId }) } };
      const result = await db[model][method](scoped);
      const ordered = Array.isArray(result) ? [...result].sort((a, b) => auditFingerprint(a).localeCompare(auditFingerprint(b))) : result;
      sources.push({ model, method, args: scoped, result: ordered });
      return result;
    };
  } }) }) as AuditReadDatabase;
}

async function financeSources(db: AuditReadDatabase, line: Row) {
  const { getSettings } = await import("./settings.js");
  if (!line.classId || !/^\d{4}-(0[1-9]|1[0-2])$/.test(line.month)) {
    return { line, classData: null, enrollments: [], sessions: [], attendance: [],
      settings: { settings: [] } };
  }
  const start = new Date(`${line.month}-01T00:00:00Z`);
  const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1));
  const [classData, enrollments, sessions, attendance, settings] = await Promise.all([
    line.classId ? db.class.findFirst({ where: { id: line.classId } }) : null,
    db.enrollmentPeriod.findMany({ where: { studentId: line.studentId, classId: line.classId,
      startedAt: { lt: end }, OR: [{ endedAt: null }, { endedAt: { gt: start } }] }, orderBy: [{ startedAt: "asc" }, { id: "asc" }] }),
    db.classSession.findMany({ where: { classId: line.classId, billingMonth: line.month }, orderBy: [{ sessionDate: "asc" }, { id: "asc" }] }),
    db.attendance.findMany({ where: { studentId: line.studentId, classId: line.classId,
      attendanceDate: { gte: start, lt: end } }, orderBy: [{ attendanceDate: "asc" }, { id: "asc" }] }),
    getSettings(db, { tenantId: line.tenantId, group: "finance", effectiveMonth: line.month }),
  ]);
  return { line, classData, enrollments, sessions, attendance, settings };
}

export async function inventoryTuitionProgress(db: AuditReadDatabase, cutoff: Date) {
  if (Number.isNaN(cutoff.getTime())) throw new Error("Invalid cutoff");
  const before = await counts(db);
  const [fees, progress] = await Promise.all([
    db.monthlyFeeLine.findMany({ where: { createdAt: { lte: cutoff } },
      include: { monthlyFee: true, receiptLines: { orderBy: { id: "asc" } },
        revisions: { orderBy: { revisionNumber: "asc" } } }, orderBy: { id: "asc" } }),
    db.studentProgressMonth.findMany({ where: { createdAt: { lte: cutoff } },
      include: { skills: { orderBy: { skillKey: "asc" } }, dailyEntries: { orderBy: [{ entryDate: "asc" }, { id: "asc" }] },
        revisions: { orderBy: { revisionNumber: "asc" } } },
      orderBy: [{ tenantId: "asc" }, { studentId: "asc" }, { classId: "asc" }, { month: "asc" }] }),
  ]);
  const records: ReturnType<typeof auditRecord>[] = [];
  const metrics = new Map<string, Metric>();
  const { getSettings } = await import("./settings.js");
  const { loadProgressOperationalRow } = await import("./student-progress-operational-row.js");
  const { previousProgressMonth } = await import("./student-progress-evidence.js");
  for (const line of fees) {
    const reads: unknown[] = [];
    const input = await financeSources(readView(db, line.tenantId, reads), line);
    const result = await classifyFinance(input);
    records.push(auditRecord(line, result, { input, reads: reads.sort((a, b) => auditFingerprint(a).localeCompare(auditFingerprint(b))) }));
  }
  for (const record of progress) {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(record.month)) {
      records.push(auditRecord(record, outcome(record, [{ finding: "R3", classification: "unknown",
        reason: "month_unknown" }]), record));
      continue;
    }
    const reads: unknown[] = [];
    const scoped = readView(db, record.tenantId, reads);
    const settings = await getSettings(scoped, { tenantId: record.tenantId, group: "academic", effectiveMonth: record.month });
    let row: ReportCubeRow | null;
    try { row = await loadProgressOperationalRow(scoped as any, record.studentId, record.classId, record.month); }
    catch (error: any) {
      if (!["ENROLLMENT_NOT_FOUND", "PROGRESS_MONTH_OUT_OF_ENROLLMENT"].includes(error?.code)) throw error;
      row = null;
    }
    const key = [record.tenantId, record.studentId, record.classId];
    const previous = metrics.get(JSON.stringify([...key, previousProgressMonth(record.month)]));
    const result = await classifyAcademic({ record, row, settings, previous });
    if (result.metric) metrics.set(JSON.stringify([...key, record.month]), result.metric);
    records.push(auditRecord(record, result, { record, settings, previous,
      reads: reads.sort((a, b) => auditFingerprint(a).localeCompare(auditFingerprint(b))) }));
  }
  const after = await counts(db);
  if (auditFingerprint(before) !== auditFingerprint(after)) throw new Error("Inventory row counts changed");
  const selectedCounts = await Promise.all(["monthlyFeeLine", "studentProgressMonth"].map(model =>
    db[model].count({ where: { createdAt: { lte: cutoff } } })));
  if (selectedCounts[0] !== fees.length || selectedCounts[1] !== progress.length) throw new Error("Selected row counts do not match inventory");
  records.sort((a, b) => auditFingerprint(a.refs).localeCompare(auditFingerprint(b.refs)));
  const categories = Object.fromEntries(["unaffected", "read_model_only", "mutable_draft", "protected_financial",
    "finalized_academic", "provenance_unknown", "invalid_configuration"].map(c => [c, records.filter(r => r.category === c).length]));
  return { mode: "dry-run", version: "TPR05-inventory-v1", cutoff: cutoff.toISOString(),
    cutoffSemantics: "created_at inclusion; source values from read-only consistent snapshot, not historical as-of reconstruction",
    writes: 0, verifiedCounts: true, rowCounts: { before, after },
    counts: { fee_lines: fees.length, progress_months: progress.length,
      no_op: categories.unaffected, findings: records.reduce((n, r) => n + r.findings.length, 0), categories }, records };
}
