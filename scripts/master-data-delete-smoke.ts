import assert from "node:assert/strict";
import prisma from "../lib/prisma.js";
import router from "../api/router.js";
import {
  createTestRequest,
  createTestResponse,
} from "../lib/request-response-adapter.js";

type ApiBody = {
  success?: boolean;
  data?: any;
  error?: { code?: string; message?: string };
};

function assertIsolatedDatabase() {
  const rawUrl = process.env.DATABASE_URL;
  assert.ok(rawUrl, "DATABASE_URL is required");
  const url = new URL(rawUrl);
  assert.ok(
    ["127.0.0.1", "localhost"].includes(url.hostname),
    "Delete smoke is restricted to a loopback database",
  );
  assert.match(url.pathname, /review|preview|demo|test/i);
}

async function cleanupStaleSmokeUsers() {
  const staleUsers = await prisma.user.findMany({
    where: { username: { startsWith: "delete-smoke-receptionist-" } },
    select: { id: true },
  });
  const staleUserIds = staleUsers.map((user) => user.id);
  if (staleUserIds.length === 0) return;
  await prisma.activityLog.deleteMany({ where: { userId: { in: staleUserIds } } });
  await prisma.user.deleteMany({ where: { id: { in: staleUserIds } } });
}

async function api(
  method: string,
  path: string,
  options: { token?: string; body?: unknown; query?: Record<string, string> } = {},
) {
  const response = createTestResponse();
  await router(
    createTestRequest({
      method,
      query: { path, ...(options.query || {}) },
      body: options.body,
      headers: options.token
        ? { authorization: `Bearer ${options.token}` }
        : {},
    }),
    response.res,
  );
  return {
    status: response.state.statusCode,
    body: response.state.body as ApiBody,
  };
}

function expectSuccess(result: Awaited<ReturnType<typeof api>>, label: string) {
  assert.equal(
    result.body?.success,
    true,
    `${label}: ${result.body?.error?.code || result.status} ${result.body?.error?.message || ""}`,
  );
  return result.body.data;
}

function expectError(
  result: Awaited<ReturnType<typeof api>>,
  status: number,
  code: string,
  label: string,
) {
  assert.equal(result.status, status, `${label}: unexpected status`);
  assert.equal(result.body?.success, false, `${label}: expected failure`);
  assert.equal(result.body?.error?.code, code, `${label}: unexpected error code`);
}

async function main() {
  assertIsolatedDatabase();
  await cleanupStaleSmokeUsers();
  const username = process.env.SMOKE_ADMIN_USERNAME || "admin";
  const password = process.env.SMOKE_ADMIN_PASSWORD;
  assert.ok(password, "SMOKE_ADMIN_PASSWORD is required");

  const login = await api("POST", "auth/login", {
    body: { username, password },
  });
  const loginData = expectSuccess(login, "login");
  assert.equal(loginData.user.role, "admin", "Smoke account must be an admin");
  const token = loginData.token as string;
  const suffix = `${Date.now()}`;

  let parentId: string | undefined;
  let teacherId: string | undefined;
  let classId: string | undefined;
  let studentId: string | undefined;
  let receptionistUserId: string | undefined;

  try {
    for (const path of ["students", "parents", "classes", "teachers"]) {
      expectError(
        await api("DELETE", path, { query: { id: "missing-smoke-id" } }),
        401,
        "UNAUTHORIZED",
        `anonymous delete ${path}`,
      );
    }

    const receptionistPassword = `ReviewOnly!${suffix}`;
    const receptionist = expectSuccess(
      await api("POST", "users", {
        token,
        body: {
          username: `delete-smoke-receptionist-${suffix}`,
          password: receptionistPassword,
          full_name: `DELETE SMOKE Receptionist ${suffix}`,
          role: "receptionist",
          status: "active",
        },
      }),
      "create receptionist",
    );
    receptionistUserId = receptionist.user.id;
    const receptionistLogin = expectSuccess(
      await api("POST", "auth/login", {
        body: {
          username: receptionist.user.username,
          password: receptionistPassword,
        },
      }),
      "login receptionist",
    );
    for (const path of ["students", "parents", "classes", "teachers"]) {
      expectError(
        await api("DELETE", path, {
          token: receptionistLogin.token,
          query: { id: "missing-smoke-id" },
        }),
        403,
        "FORBIDDEN",
        `receptionist delete ${path}`,
      );
    }

    const parent = expectSuccess(
      await api("POST", "parents", {
        token,
        body: {
          full_name: `DELETE SMOKE Parent ${suffix}`,
          phone: `09${suffix.slice(-8)}`,
        },
      }),
      "create parent",
    );
    parentId = parent.parent.id;

    const teacher = expectSuccess(
      await api("POST", "teachers", {
        token,
        body: {
          full_name: `DELETE SMOKE Teacher ${suffix}`,
          phone: `08${suffix.slice(-8)}`,
        },
      }),
      "create teacher",
    );
    teacherId = teacher.teacher.id;

    const classData = expectSuccess(
      await api("POST", "classes", {
        token,
        body: {
          class_name: `DELETE SMOKE Class ${suffix}`,
          sessions_per_week: 2,
          start_time: "18:00",
          end_time: "19:30",
          fee_per_day: 500000,
          max_students: 10,
          teacher_id: teacherId,
          student_ids: [],
        },
      }),
      "create class",
    );
    classId = classData.class.id;

    const student = expectSuccess(
      await api("POST", "students", {
        token,
        body: {
          full_name: `DELETE SMOKE Student ${suffix}`,
          date_of_birth: "2015-01-01",
          gender: "other",
          parent_id: parentId,
          enrollment_date: new Date().toISOString().slice(0, 10),
          class_ids: [classId],
        },
      }),
      "create student",
    );
    studentId = student.id;

    for (const [path, id] of [
      ["students", studentId],
      ["parents", parentId],
      ["classes", classId],
      ["teachers", teacherId],
    ] as const) {
      expectSuccess(
        await api("DELETE", path, { token, query: { id } }),
        `delete ${path}`,
      );
    }

    const [
      studentRow,
      parentRow,
      classRow,
      teacherRow,
      studentClassRow,
      enrollmentPeriodRow,
    ] = await Promise.all([
      prisma.student.findUnique({ where: { id: studentId } }),
      prisma.parent.findUnique({ where: { id: parentId } }),
      prisma.class.findUnique({ where: { id: classId } }),
      prisma.teacher.findUnique({ where: { id: teacherId } }),
      prisma.studentClass.findFirst({
        where: { studentId, classId },
        orderBy: { id: "desc" },
      }),
      prisma.enrollmentPeriod.findFirst({
        where: { studentId, classId },
        orderBy: { startedAt: "desc" },
      }),
    ]);
    assert.ok(studentRow?.deletedAt);
    assert.ok(parentRow?.deletedAt);
    assert.equal(classRow?.status, "inactive");
    assert.equal(classRow?.teacherId, null);
    assert.equal(teacherRow?.status, "inactive");
    assert.equal(studentClassRow?.status, "inactive");
    assert.ok(enrollmentPeriodRow?.endedAt);

    process.stdout.write(
      "master-data-delete-smoke: PASS (student, parent, class, teacher)\n",
    );
  } finally {
    if (studentId) {
      await prisma.student.deleteMany({ where: { id: studentId } });
    }
    if (classId) {
      await prisma.class.deleteMany({ where: { id: classId } });
    }
    if (teacherId) {
      await prisma.teacher.deleteMany({ where: { id: teacherId } });
    }
    if (parentId) {
      await prisma.parent.deleteMany({ where: { id: parentId } });
    }
    if (receptionistUserId) {
      await prisma.activityLog.deleteMany({
        where: { userId: receptionistUserId },
      });
      await prisma.user.deleteMany({ where: { id: receptionistUserId } });
    }
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
