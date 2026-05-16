import { Router } from 'express';
import { randomUUID } from 'crypto';
import { execute, query, queryOne, transaction } from '../database/index.js';
import { verifyToken, adminOnly } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();
router.use(verifyToken, adminOnly);

const aliases = {
  student_full_name: 'student_full_name',
  student_name: 'student_full_name',
  full_name: 'student_full_name',
  date_of_birth: 'date_of_birth',
  dob: 'date_of_birth',
  gender: 'gender',
  parent_full_name: 'parent_full_name',
  parent_name: 'parent_full_name',
  parent_phone: 'parent_phone',
  relationship: 'relationship',
  enrollment_date: 'enrollment_date',
  start_date: 'enrollment_date',
  student_phone: 'student_phone',
  phone: 'student_phone',
  student_email: 'student_email',
  email: 'student_email',
  address: 'address',
  notes: 'notes',
};

function stripDiacritics(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function normalizeHeader(value) {
  const key = stripDiacritics(value)
    .replace(/^\uFEFF/, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return aliases[key] || key;
}

function normalizeComparable(value) {
  return stripDiacritics(value).trim().toLowerCase().replace(/\s+/g, ' ');
}

function normalizePhone(value) {
  return String(value || '').trim().replace(/[^\d+]/g, '');
}

function text(value) {
  return String(value || '').trim();
}

function optionalText(value) {
  const item = text(value);
  return item || null;
}

function importKey(phone, studentName) {
  return `${normalizePhone(phone)}:${normalizeComparable(studentName)}`;
}

function parseDate(value) {
  const input = text(value);
  if (!input) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) return Number.isNaN(new Date(input).getTime()) ? null : input;
  const match = input.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (!match) return null;
  const [, dayRaw, monthRaw, yearRaw] = match;
  const day = Number(dayRaw);
  const month = Number(monthRaw);
  const year = Number(yearRaw);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return null;
  }
  return `${yearRaw}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function normalizeGender(value) {
  const key = normalizeComparable(value);
  if (['male', 'm', 'nam', 'boy'].includes(key)) return 'male';
  if (['female', 'f', 'nu', 'girl'].includes(key)) return 'female';
  if (['other', 'o', 'khac'].includes(key)) return 'other';
  return null;
}

function normalizeRelationship(value) {
  const key = normalizeComparable(value);
  if (['father', 'dad', 'bo', 'cha'].includes(key)) return 'father';
  if (['mother', 'mom', 'me'].includes(key)) return 'mother';
  if (['guardian', 'nguoi giam ho', 'giam ho', 'other'].includes(key)) return 'guardian';
  return null;
}

function parseCsvRecords(csv) {
  const rows = [];
  let row = [];
  let field = '';
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
    if (char === ',' && !inQuotes) {
      row.push(field);
      field = '';
      continue;
    }
    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') index += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      continue;
    }
    field += char;
  }

  row.push(field);
  rows.push(row);
  return rows.filter((cells) => cells.some((cell) => text(cell)));
}

function parseStudentImportCsv(csv) {
  const records = parseCsvRecords(csv || '');
  if (!records.length) return { headers: [], rows: [] };
  const headers = records[0].map(normalizeHeader);
  return {
    headers,
    rows: records.slice(1).map((record) => {
      const item = {};
      headers.forEach((header, index) => {
        item[header] = text(record[index]);
      });
      return item;
    }),
  };
}

function addIssue(list, field, code, message) {
  list.push({ field, code, message });
}

function buildPreview(csv) {
  const parsed = parseStudentImportCsv(csv);
  const parents = query('SELECT id, full_name, phone FROM parents');
  const students = query(`
    SELECT s.id, s.full_name, s.parent_id, p.phone as parent_phone
    FROM students s
    JOIN parents p ON p.id = s.parent_id
  `);
  const parentByPhone = new Map(parents.map((parent) => [normalizePhone(parent.phone), parent]));
  const existingByKey = new Map(students.map((student) => [
    importKey(student.parent_phone, student.full_name),
    student,
  ]));
  const seen = new Set();

  const rows = parsed.rows.map((raw, index) => {
    const errors = [];
    const warnings = [];
    const studentName = text(raw.student_full_name);
    const parentName = text(raw.parent_full_name);
    const parentPhone = normalizePhone(raw.parent_phone);
    const dateOfBirth = parseDate(raw.date_of_birth);
    const enrollmentDate = parseDate(raw.enrollment_date);
    const gender = normalizeGender(raw.gender);
    const relationship = normalizeRelationship(raw.relationship);

    if (!studentName) addIssue(errors, 'student_full_name', 'REQUIRED', 'student_full_name is required');
    if (!text(raw.date_of_birth)) addIssue(errors, 'date_of_birth', 'REQUIRED', 'date_of_birth is required');
    else if (!dateOfBirth) addIssue(errors, 'date_of_birth', 'INVALID_DATE', 'date_of_birth must be YYYY-MM-DD or DD/MM/YYYY');
    if (!text(raw.gender)) addIssue(errors, 'gender', 'REQUIRED', 'gender is required');
    else if (!gender) addIssue(errors, 'gender', 'INVALID_GENDER', 'gender must be male, female, or other');
    if (!parentName) addIssue(errors, 'parent_full_name', 'REQUIRED', 'parent_full_name is required');
    if (!parentPhone) addIssue(errors, 'parent_phone', 'REQUIRED', 'parent_phone is required');
    else if (parentPhone.replace(/\D/g, '').length < 6) addIssue(errors, 'parent_phone', 'INVALID_PHONE', 'parent_phone is too short');
    if (!text(raw.relationship)) addIssue(errors, 'relationship', 'REQUIRED', 'relationship is required');
    else if (!relationship) addIssue(errors, 'relationship', 'INVALID_RELATIONSHIP', 'relationship must be father, mother, or guardian');
    if (!text(raw.enrollment_date)) addIssue(errors, 'enrollment_date', 'REQUIRED', 'enrollment_date is required');
    else if (!enrollmentDate) addIssue(errors, 'enrollment_date', 'INVALID_DATE', 'enrollment_date must be YYYY-MM-DD or DD/MM/YYYY');

    const parent = parentByPhone.get(parentPhone) || null;
    if (parent && normalizeComparable(parent.full_name) !== normalizeComparable(parentName)) {
      addIssue(warnings, 'parent_full_name', 'PARENT_NAME_MISMATCH', `Existing parent phone belongs to ${parent.full_name}`);
    }

    const key = importKey(parentPhone, studentName);
    const duplicateInFile = studentName && parentPhone && seen.has(key);
    if (duplicateInFile) addIssue(errors, 'student_full_name', 'DUPLICATE_IN_FILE', 'Student is duplicated in this CSV');
    if (studentName && parentPhone && !duplicateInFile) seen.add(key);
    const existingStudent = existingByKey.get(key) || null;
    if (existingStudent) {
      addIssue(errors, 'student_full_name', 'DUPLICATE_EXISTING_STUDENT', 'Student already exists for this parent phone');
    }

    return {
      row_number: index + 2,
      valid: errors.length === 0,
      errors,
      warnings,
      parent_action: parent ? 'reuse' : 'create',
      existing_parent_id: parent?.id || null,
      existing_student_id: existingStudent?.id || null,
      duplicate_in_file: Boolean(duplicateInFile),
      data: {
        student_full_name: studentName,
        date_of_birth: dateOfBirth || '',
        gender: gender || 'other',
        parent_full_name: parentName,
        parent_phone: parentPhone,
        relationship: relationship || 'guardian',
        enrollment_date: enrollmentDate || '',
        student_phone: optionalText(raw.student_phone),
        student_email: optionalText(raw.student_email),
        address: optionalText(raw.address),
        notes: optionalText(raw.notes),
      },
    };
  });

  const validRows = rows.filter((row) => row.valid);
  return {
    mode: 'preview',
    rows,
    summary: {
      total_rows: rows.length,
      valid_rows: validRows.length,
      invalid_rows: rows.length - validRows.length,
      duplicate_rows: rows.filter((row) => row.errors.some((error) => error.code === 'DUPLICATE_IN_FILE')).length,
      existing_duplicate_rows: rows.filter((row) => row.errors.some((error) => error.code === 'DUPLICATE_EXISTING_STUDENT')).length,
      will_create_parents: new Set(validRows.filter((row) => row.parent_action === 'create').map((row) => row.data.parent_phone)).size,
      will_reuse_parents: new Set(validRows.filter((row) => row.parent_action === 'reuse').map((row) => row.existing_parent_id || row.data.parent_phone)).size,
      will_create_students: validRows.length,
    },
  };
}

function readCsv(body) {
  const csv = body?.csv || body?.csv_content || body?.content;
  if (typeof csv !== 'string' || !csv.trim()) {
    throw new AppError('csv content is required', 400, 'CSV_REQUIRED');
  }
  return csv;
}

router.post('/students', (req, res, next) => {
  try {
    const mode = req.body?.mode === 'commit' ? 'commit' : 'preview';
    const csv = readCsv(req.body);
    const preview = buildPreview(csv);

    if (mode === 'preview') {
      return res.json({ success: true, data: preview });
    }

    if (preview.summary.total_rows === 0) {
      throw new AppError('CSV must include at least one student row', 400, 'EMPTY_IMPORT');
    }
    if (preview.summary.invalid_rows > 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'IMPORT_VALIDATION_FAILED',
          message: 'Fix invalid rows before committing import',
          details: preview,
        },
      });
    }

    const committed = transaction(() => {
      const students = [];
      const createdParents = new Set();
      const reusedParents = new Set();
      for (const row of preview.rows) {
        const item = row.data;
        let parent = queryOne('SELECT id, phone FROM parents WHERE phone = ?', [item.parent_phone]);
        if (!parent) {
          const parentId = randomUUID();
          execute(
            'INSERT INTO parents (id, full_name, phone, relationship, address, notes) VALUES (?, ?, ?, ?, ?, ?)',
            [parentId, item.parent_full_name, item.parent_phone, item.relationship, item.address, item.notes]
          );
          parent = { id: parentId, phone: item.parent_phone };
          createdParents.add(parentId);
        } else {
          reusedParents.add(parent.id);
        }

        const duplicate = queryOne(
          'SELECT id FROM students WHERE parent_id = ? AND lower(full_name) = lower(?)',
          [parent.id, item.student_full_name]
        );
        if (duplicate) {
          throw new AppError(`Duplicate student detected during import: ${item.student_full_name}`, 409, 'DUPLICATE_EXISTING_STUDENT');
        }

        const studentId = randomUUID();
        execute(
          `INSERT INTO students (
            id, full_name, date_of_birth, gender, parent_id, phone, email, address, enrollment_date, notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            studentId,
            item.student_full_name,
            item.date_of_birth,
            item.gender,
            parent.id,
            item.student_phone,
            item.student_email,
            item.address,
            item.enrollment_date,
            item.notes,
          ]
        );
        students.push({ id: studentId, full_name: item.student_full_name, parent_id: parent.id });
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

    return res.status(201).json({
      success: true,
      data: {
        mode: 'commit',
        students: committed.students,
        summary: committed.summary,
        preview_summary: preview.summary,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
