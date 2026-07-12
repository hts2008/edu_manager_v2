type ExistingParent = {
  id: string;
  fullName: string;
  phone: string;
};

type ExistingStudent = {
  id: string;
  fullName: string;
  parentId?: string | null;
  parentPhone?: string | null;
};

type ImportLookup = {
  parents?: ExistingParent[];
  students?: ExistingStudent[];
};

type ImportIssue = {
  field: string;
  code: string;
  message: string;
};

type StudentImportData = {
  student_full_name: string;
  date_of_birth: string;
  gender: "male" | "female" | "other";
  parent_full_name: string;
  parent_phone: string;
  relationship: "father" | "mother" | "guardian";
  enrollment_date: string;
  student_phone: string | null;
  student_email: string | null;
  address: string | null;
  notes: string | null;
};

export type StudentImportRow = {
  row_number: number;
  valid: boolean;
  errors: ImportIssue[];
  warnings: ImportIssue[];
  parent_action: "create" | "reuse";
  existing_parent_id: string | null;
  existing_student_id: string | null;
  duplicate_in_file: boolean;
  data: StudentImportData;
};

export type StudentImportPreview = {
  mode: "preview";
  rows: StudentImportRow[];
  summary: {
    total_rows: number;
    valid_rows: number;
    invalid_rows: number;
    duplicate_rows: number;
    existing_duplicate_rows: number;
    will_create_parents: number;
    will_reuse_parents: number;
    will_create_students: number;
  };
};

const headerAliases: Record<string, keyof StudentImportData> = {
  student_full_name: "student_full_name",
  student_name: "student_full_name",
  full_name: "student_full_name",
  name: "student_full_name",
  date_of_birth: "date_of_birth",
  dob: "date_of_birth",
  birth_date: "date_of_birth",
  gender: "gender",
  parent_full_name: "parent_full_name",
  parent_name: "parent_full_name",
  parent_phone: "parent_phone",
  phone_parent: "parent_phone",
  relationship: "relationship",
  enrollment_date: "enrollment_date",
  start_date: "enrollment_date",
  student_phone: "student_phone",
  phone: "student_phone",
  student_email: "student_email",
  email: "student_email",
  address: "address",
  notes: "notes",
};

function stripDiacritics(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function normalizeHeader(value: string) {
  const cleaned = stripDiacritics(value.replace(/^\uFEFF/, ""))
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return headerAliases[cleaned] || cleaned;
}

function normalizeComparable(value: string | null | undefined) {
  return stripDiacritics(String(value || ""))
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function normalizePhone(value: string | null | undefined) {
  return String(value || "")
    .trim()
    .replace(/[^\d+]/g, "");
}

function importKey(phone: string, studentName: string) {
  return `${normalizePhone(phone)}:${normalizeComparable(studentName)}`;
}

function text(value: unknown) {
  const trimmed = String(value || "").trim();
  return trimmed || "";
}

function optionalText(value: unknown) {
  const trimmed = text(value);
  return trimmed || null;
}

function parseDate(value: string) {
  const input = text(value);
  if (!input) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    const date = new Date(`${input}T00:00:00.000Z`);
    return Number.isNaN(date.getTime()) ? null : input;
  }

  const vnDate = input.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (vnDate) {
    const [, dayRaw, monthRaw, yearRaw] = vnDate;
    const day = Number(dayRaw);
    const month = Number(monthRaw);
    const year = Number(yearRaw);
    const date = new Date(Date.UTC(year, month - 1, day));
    if (
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day
    ) {
      return `${yearRaw}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
    return null;
  }

  if (/^\d+(\.\d+)?$/.test(input)) {
    const serial = Number(input);
    if (serial > 20000 && serial < 80000) {
      const epoch = Date.UTC(1899, 11, 30);
      const date = new Date(epoch + serial * 86400000);
      return date.toISOString().slice(0, 10);
    }
  }

  return null;
}

function normalizeGender(value: string) {
  const key = normalizeComparable(value);
  if (["male", "m", "nam", "boy"].includes(key)) return "male";
  if (["female", "f", "nu", "girl"].includes(key)) return "female";
  if (["other", "o", "khac"].includes(key)) return "other";
  return null;
}

function normalizeRelationship(value: string) {
  const key = normalizeComparable(value);
  if (["father", "dad", "bo", "cha"].includes(key)) return "father";
  if (["mother", "mom", "me"].includes(key)) return "mother";
  if (["guardian", "nguoi giam ho", "giam ho", "other"].includes(key)) {
    return "guardian";
  }
  return null;
}

function pushRequiredError(errors: ImportIssue[], field: string) {
  errors.push({
    field,
    code: "REQUIRED",
    message: `${field} is required`,
  });
}

function addError(
  errors: ImportIssue[],
  field: string,
  code: string,
  message: string
) {
  errors.push({ field, code, message });
}

function addWarning(
  warnings: ImportIssue[],
  field: string,
  code: string,
  message: string
) {
  warnings.push({ field, code, message });
}

function parseCsvRecords(csv: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let index = 0; index < csv.length; index += 1) {
    const char = csv[index];
    const next = csv[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        field += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(field);
      field = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      continue;
    }

    field += char;
  }

  row.push(field);
  rows.push(row);
  return rows.filter((cells) => cells.some((cell) => text(cell)));
}

export function parseStudentImportCsv(csv: string) {
  const records = parseCsvRecords(csv || "");
  if (records.length === 0) {
    return { headers: [] as string[], rows: [] as Record<string, string>[] };
  }

  const headers = records[0].map((header) => normalizeHeader(header));
  const rows = records.slice(1).map((record) => {
    const item: Record<string, string> = {};
    headers.forEach((header, index) => {
      if (header) item[header] = text(record[index]);
    });
    return item;
  });

  return { headers, rows };
}

function createEmptyData(): StudentImportData {
  return {
    student_full_name: "",
    date_of_birth: "",
    gender: "other",
    parent_full_name: "",
    parent_phone: "",
    relationship: "guardian",
    enrollment_date: "",
    student_phone: null,
    student_email: null,
    address: null,
    notes: null,
  };
}

export function buildStudentImportPreview(
  csv: string,
  lookup: ImportLookup = {}
): StudentImportPreview {
  const parsed = parseStudentImportCsv(csv);
  const parents = lookup.parents || [];
  const students = lookup.students || [];
  const parentByPhone = new Map(parents.map((parent) => [normalizePhone(parent.phone), parent]));
  const parentById = new Map(parents.map((parent) => [parent.id, parent]));
  const existingStudentByKey = new Map<string, ExistingStudent>();

  for (const student of students) {
    const parentPhone =
      student.parentPhone ||
      (student.parentId ? parentById.get(student.parentId)?.phone : null);
    if (parentPhone) {
      existingStudentByKey.set(importKey(parentPhone, student.fullName), student);
    }
  }

  const seenFileKeys = new Set<string>();
  const rows: StudentImportRow[] = parsed.rows.map((raw, index) => {
    const errors: ImportIssue[] = [];
    const warnings: ImportIssue[] = [];
    const data = createEmptyData();

    const studentName = text(raw.student_full_name);
    const parentName = text(raw.parent_full_name);
    const parentPhone = normalizePhone(raw.parent_phone);
    const dateOfBirth = parseDate(text(raw.date_of_birth));
    const enrollmentDate = parseDate(text(raw.enrollment_date));
    const gender = normalizeGender(text(raw.gender));
    const relationship = normalizeRelationship(text(raw.relationship));

    if (!studentName) pushRequiredError(errors, "student_full_name");
    if (!text(raw.date_of_birth)) {
      pushRequiredError(errors, "date_of_birth");
    } else if (!dateOfBirth) {
      addError(errors, "date_of_birth", "INVALID_DATE", "date_of_birth must be YYYY-MM-DD or DD/MM/YYYY");
    }
    if (!text(raw.gender)) {
      pushRequiredError(errors, "gender");
    } else if (!gender) {
      addError(errors, "gender", "INVALID_GENDER", "gender must be male, female, or other");
    }
    if (!parentName) pushRequiredError(errors, "parent_full_name");
    if (!parentPhone) {
      pushRequiredError(errors, "parent_phone");
    } else if (parentPhone.replace(/\D/g, "").length < 6) {
      addError(errors, "parent_phone", "INVALID_PHONE", "parent_phone is too short");
    }
    if (!text(raw.relationship)) {
      pushRequiredError(errors, "relationship");
    } else if (!relationship) {
      addError(
        errors,
        "relationship",
        "INVALID_RELATIONSHIP",
        "relationship must be father, mother, or guardian"
      );
    }
    if (!text(raw.enrollment_date)) {
      pushRequiredError(errors, "enrollment_date");
    } else if (!enrollmentDate) {
      addError(
        errors,
        "enrollment_date",
        "INVALID_DATE",
        "enrollment_date must be YYYY-MM-DD or DD/MM/YYYY"
      );
    }

    data.student_full_name = studentName;
    data.date_of_birth = dateOfBirth || "";
    data.gender = gender || "other";
    data.parent_full_name = parentName;
    data.parent_phone = parentPhone;
    data.relationship = relationship || "guardian";
    data.enrollment_date = enrollmentDate || "";
    data.student_phone = optionalText(raw.student_phone);
    data.student_email = optionalText(raw.student_email);
    data.address = optionalText(raw.address);
    data.notes = optionalText(raw.notes);

    const parent = parentByPhone.get(parentPhone) || null;
    if (parent && normalizeComparable(parent.fullName) !== normalizeComparable(parentName)) {
      addWarning(
        warnings,
        "parent_full_name",
        "PARENT_NAME_MISMATCH",
        `Existing parent phone belongs to ${parent.fullName}`
      );
    }

    let duplicateInFile = false;
    let existingStudent: ExistingStudent | null = null;
    if (studentName && parentPhone) {
      const key = importKey(parentPhone, studentName);
      duplicateInFile = seenFileKeys.has(key);
      if (duplicateInFile) {
        addError(errors, "student_full_name", "DUPLICATE_IN_FILE", "Student is duplicated in this CSV");
      } else {
        seenFileKeys.add(key);
      }

      existingStudent = existingStudentByKey.get(key) || null;
      if (existingStudent) {
        addError(
          errors,
          "student_full_name",
          "DUPLICATE_EXISTING_STUDENT",
          "Student already exists for this parent phone"
        );
      }
    }

    return {
      row_number: index + 2,
      valid: errors.length === 0,
      errors,
      warnings,
      parent_action: parent ? "reuse" : "create",
      existing_parent_id: parent?.id || null,
      existing_student_id: existingStudent?.id || null,
      duplicate_in_file: duplicateInFile,
      data,
    };
  });

  const validRows = rows.filter((row) => row.valid);
  const createParentPhones = new Set(
    validRows
      .filter((row) => row.parent_action === "create")
      .map((row) => row.data.parent_phone)
  );
  const reuseParentIds = new Set(
    validRows
      .filter((row) => row.parent_action === "reuse")
      .map((row) => row.existing_parent_id || row.data.parent_phone)
  );

  return {
    mode: "preview",
    rows,
    summary: {
      total_rows: rows.length,
      valid_rows: validRows.length,
      invalid_rows: rows.length - validRows.length,
      duplicate_rows: rows.filter((row) =>
        row.errors.some((error) => error.code === "DUPLICATE_IN_FILE")
      ).length,
      existing_duplicate_rows: rows.filter((row) =>
        row.errors.some((error) => error.code === "DUPLICATE_EXISTING_STUDENT")
      ).length,
      will_create_parents: createParentPhones.size,
      will_reuse_parents: reuseParentIds.size,
      will_create_students: validRows.length,
    },
  };
}

async function loadLookup(prisma: any): Promise<ImportLookup> {
  const [parents, students] = await Promise.all([
    prisma.parent.findMany({
      select: { id: true, fullName: true, phone: true },
    }),
    prisma.student.findMany({
      select: {
        id: true,
        fullName: true,
        parentId: true,
        parent: { select: { phone: true } },
      },
    }),
  ]);

  return {
    parents,
    students: students.map((student: any) => ({
      id: student.id,
      fullName: student.fullName,
      parentId: student.parentId,
      parentPhone: student.parent?.phone || null,
    })),
  };
}

export async function previewStudentImport(prisma: any, csv: string) {
  const lookup = await loadLookup(prisma);
  return buildStudentImportPreview(csv, lookup);
}

export async function commitStudentImport(prisma: any, csv: string) {
  const preview = await previewStudentImport(prisma, csv);
  if (preview.summary.total_rows === 0) {
    return {
      ok: false as const,
      preview,
      code: "EMPTY_IMPORT",
      message: "CSV must include at least one student row",
    };
  }
  if (preview.summary.invalid_rows > 0) {
    return {
      ok: false as const,
      preview,
      code: "IMPORT_VALIDATION_FAILED",
      message: "Fix invalid rows before committing import",
    };
  }

  const committed = await prisma.$transaction(async (tx: any) => {
    const createdParents = new Map<string, string>();
    const reusedParents = new Map<string, string>();
    const students = [];

    for (const row of preview.rows) {
      const item = row.data;
      let parent = await tx.parent.findUnique({
        where: { phoneNormalized: item.parent_phone },
        select: { id: true, phone: true },
      });

      if (!parent) {
        parent = await tx.parent.create({
          data: {
            fullName: item.parent_full_name,
            phone: item.parent_phone,
            phoneNormalized: normalizePhone(item.parent_phone),
            relationship: item.relationship,
            address: item.address,
            notes: item.notes,
          },
          select: { id: true, phone: true },
        });
        createdParents.set(parent.phone, parent.id);
      } else {
        reusedParents.set(parent.phone, parent.id);
      }

      const existingStudent = await tx.student.findFirst({
        where: {
          parentId: parent.id,
          fullName: { equals: item.student_full_name, mode: "insensitive" },
        },
        select: { id: true },
      });
      if (existingStudent) {
        throw new Error(`Duplicate student detected during import: ${item.student_full_name}`);
      }

      const student = await tx.student.create({
        data: {
          fullName: item.student_full_name,
          dateOfBirth: new Date(item.date_of_birth),
          gender: item.gender,
          parentId: parent.id,
          phone: item.student_phone,
          email: item.student_email,
          address: item.address,
          enrollmentDate: new Date(item.enrollment_date),
          notes: item.notes,
        },
        select: {
          id: true,
          fullName: true,
          parentId: true,
          createdAt: true,
        },
      });

      students.push({
        id: student.id,
        full_name: student.fullName,
        parent_id: student.parentId,
        created_at: student.createdAt,
      });
    }

    return {
      students,
      summary: {
        created_students: students.length,
        created_parents: createdParents.size,
        reused_parents: reusedParents.size,
      },
    };
  });

  return {
    ok: true as const,
    preview,
    committed,
  };
}
