import test from "node:test";
import assert from "node:assert/strict";
import {
  buildStudentImportPreview,
  parseStudentImportCsv,
} from "../lib/import-students.js";

test("parseStudentImportCsv handles quoted commas and CRLF rows", () => {
  const parsed = parseStudentImportCsv(
    'student_full_name,parent_full_name,parent_phone\r\n"Nguyen, An",Tran Thi B,0900000001\r\n'
  );

  assert.equal(parsed.headers.length, 3);
  assert.equal(parsed.rows.length, 1);
  assert.equal(parsed.rows[0].student_full_name, "Nguyen, An");
});

test("buildStudentImportPreview validates rows and detects file duplicates", () => {
  const csv = [
    "student_full_name,date_of_birth,gender,parent_full_name,parent_phone,relationship,enrollment_date",
    "Nguyen An,2015-01-02,male,Tran B,0900000001,mother,2026-05-01",
    "Nguyen An,2015-01-02,male,Tran B,0900000001,mother,2026-05-01",
    "Missing Date,,male,Tran C,0900000002,father,2026-05-01",
  ].join("\n");

  const preview = buildStudentImportPreview(csv);

  assert.equal(preview.summary.total_rows, 3);
  assert.equal(preview.summary.valid_rows, 1);
  assert.equal(preview.summary.invalid_rows, 2);
  assert.equal(preview.rows[0].valid, true);
  assert.equal(preview.rows[1].errors[0].code, "DUPLICATE_IN_FILE");
  assert.equal(preview.rows[2].errors[0].field, "date_of_birth");
});

test("buildStudentImportPreview reuses existing parents and blocks existing students", () => {
  const csv = [
    "student_full_name,date_of_birth,gender,parent_full_name,parent_phone,relationship,enrollment_date",
    "Nguyen An,2015-01-02,nam,Different Parent,0900000001,mother,01/05/2026",
  ].join("\n");

  const preview = buildStudentImportPreview(csv, {
    parents: [{ id: "parent-1", fullName: "Tran B", phone: "0900000001" }],
    students: [
      {
        id: "student-1",
        fullName: "Nguyen An",
        parentId: "parent-1",
        parentPhone: "0900000001",
      },
    ],
  });

  assert.equal(preview.rows[0].parent_action, "reuse");
  assert.equal(preview.rows[0].existing_parent_id, "parent-1");
  assert.equal(preview.rows[0].valid, false);
  assert.equal(preview.rows[0].errors[0].code, "DUPLICATE_EXISTING_STUDENT");
  assert.equal(preview.rows[0].data.gender, "male");
  assert.equal(preview.rows[0].data.enrollment_date, "2026-05-01");
});
