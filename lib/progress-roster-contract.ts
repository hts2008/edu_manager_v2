import { createHash } from "node:crypto";
import { z } from "zod";
import { ApiError } from "./api-utils.js";
import { academicContextFromSnapshot, snapshotAcademicSettings } from "./academic-settings.js";

const skillKeys = ["listening", "speaking", "reading", "writing", "homework", "daily_practice", "mock_test"] as const;
const changesSchema = z.partialRecord(z.enum(skillKeys), z.number().min(0).max(100).nullable());
type Row = Record<string, any>;
export type RosterChanges = z.infer<typeof changesSchema>;

function isCivilDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  if (year < 1 || month < 1 || month > 12 || day < 1) return false;
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  return day <= [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
}

export const rosterPatchSchema = z.object({
  student_id: z.string().trim().min(1),
  class_id: z.string().trim().min(1),
  entry_date: z.string().refine(isCivilDate, "Invalid civil date"),
  expected_evidence_version: z.string().regex(/^[a-fA-F0-9]{64}$/),
  operation_id: z.string().uuid(),
  changes: changesSchema.refine(value => Object.keys(value).length <= 7),
  note: z.string().max(2000).optional(),
  assessment_context: z.object({
    exam_set_level: z.enum(["starters", "movers", "flyers", "ket", "pet"]).nullable(),
    difficulty_level: z.enum(["easy", "medium", "hard"]),
  }).strict().optional(),
}).strict().refine(value => Object.keys(value.changes).length > 0 || value.note !== undefined,
  "At least one score change or note is required");

function canonical(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) {
    return value.map(canonical).sort((a, b) => {
      const left = JSON.stringify(a);
      const right = JSON.stringify(b);
      return left < right ? -1 : left > right ? 1 : 0;
    });
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined)
      .sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
      .map(([key, item]) => [key, canonical(item)]));
  }
  return value;
}

/** Include the entire month and evidence rows, not just the edited day's scores. */
export function progressRosterVersion(record: Row | null, academicSettings: any,
  entries: readonly Row[], skills: readonly Row[], basis?: unknown): string {
  const supplied = Array.isArray(academicSettings) ? { settings: academicSettings } : academicSettings;
  const settings = snapshotAcademicSettings(academicContextFromSnapshot(supplied) ?? supplied);
  const snapshot = canonical({ contractVersion: 1, record, settings, entries, skills, basis: basis ?? null });
  return createHash("sha256").update(JSON.stringify(snapshot)).digest("hex");
}

export type RosterNoteOperation = { type: "create"; note: string }
  | { type: "update"; id: string; note: string } | { type: "delete"; id: string };
export type RosterChangePlan = {
  deleteIds: string[];
  updates: { id: string; score: number }[];
  creates: { skill_key: string; score: number }[];
  noteOperation?: RosterNoteOperation;
};

/** Caller must supply only the authorized date's entries; other evidence types remain untouched. */
export function planRosterChanges(entries: readonly Row[], changes: RosterChanges, note?: string): RosterChangePlan {
  const parsed = changesSchema.parse(changes);
  if (note !== undefined) z.string().max(2000).parse(note);
  const plan: RosterChangePlan = { deleteIds: [], updates: [], creates: [] };
  const typeOf = (row: Row) => row.entryType ?? row.entry_type;
  for (const key of skillKeys) {
    if (!Object.hasOwn(parsed, key)) continue;
    const score = parsed[key];
    if (score === undefined) continue;
    const matches = entries.filter(row => typeOf(row) === "skill_assessment" && (row.skillKey ?? row.skill_key) === key);
    if (matches.length > 1) throw new ApiError("MULTIPLE_ASSESSMENTS", "Multiple assessments require explicit evidence editing", 409);
    if (score === null) {
      if (matches.length) plan.deleteIds.push(matches[0].id);
    } else if (matches.length) plan.updates.push({ id: matches[0].id, score });
    else plan.creates.push({ skill_key: key, score });
  }
  if (note !== undefined) {
    const notes = entries.filter(row => typeOf(row) === "note");
    if (notes.length > 1) throw new ApiError("MULTIPLE_NOTES", "Multiple notes require explicit evidence editing", 409);
    if (note.length > 0) plan.noteOperation = notes.length
      ? { type: "update", id: notes[0].id, note } : { type: "create", note };
    else if (notes.length) plan.noteOperation = { type: "delete", id: notes[0].id };
  }
  return plan;
}
