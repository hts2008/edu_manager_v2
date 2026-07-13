import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { generateMonthlyFees } from "../lib/monthly-fee-generator.js";

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

const monthlyClass = {
  id: "class-monthly",
  className: "Monthly English",
  billingPolicy: "monthly_prorated",
  feePerDay: 1_000_000,
  sessionsPerWeek: 7,
  scheduleDays: [],
  teacher: { fullName: "Teacher One" },
};

const legacyMonthlyClass = {
  ...monthlyClass,
  id: "class-legacy",
  className: "Legacy Monthly English",
  teacher: { fullName: "Teacher Two" },
};

function enrollment(overrides: Record<string, unknown> = {}) {
  return {
    id: "enrollment-1",
    studentId: "student-1",
    classId: monthlyClass.id,
    startedAt: new Date("2026-07-02T00:00:00.000Z"),
    endedAt: new Date("2026-07-03T00:00:00.000Z"),
    class: monthlyClass,
    ...overrides,
  };
}

function student(existingFee: any = null, enrollmentOverrides: Record<string, unknown> = {}) {
  return {
    id: "student-1",
    fullName: "Student One",
    monthlyFees: existingFee ? [existingFee] : [],
    enrollmentPeriods: [enrollment(enrollmentOverrides)],
    studentClasses: [],
  };
}

function regularSession(id: string, date: string, classId = monthlyClass.id) {
  return {
    id,
    classId,
    sessionDate: new Date(`${date}T00:00:00.000Z`),
    billingMonth: "2026-07",
    kind: "regular",
    status: "held",
    extraFeeMode: "included",
    replacementForId: null,
  };
}

function createGeneratorPrisma(options: {
  existingFee?: any;
  authoritativeFee?: any;
  studentRow?: any;
  authoritativeStudentRow?: any;
  sessions?: any[];
  authoritativeSessions?: any[];
  attendance?: any[];
  authoritativeAttendance?: any[];
  attendancePeriodStatuses?: Record<string, string>;
  classMonthPlanStates?: Record<string, string>;
  legacyChargeableCount?: number;
}) {
  const sessions = options.sessions ?? [];
  const attendance = options.attendance ?? [];
  const initialStudent = options.studentRow ?? student(options.existingFee);
  const authoritativeStudent = options.authoritativeStudentRow ?? initialStudent;
  const authoritativeSessions = options.authoritativeSessions ?? sessions;
  const authoritativeAttendance = options.authoritativeAttendance ?? attendance;
  const createdLines: any[] = [];
  const events: string[] = [];
  let batchLedgerReads = 0;
  let transactionLedgerReads = 0;
  let writes = 0;
  const batchClassInputs: string[][] = [];
  const transactionClassInputs: string[][] = [];
  const lockClassInputs: string[][] = [];

  const applyStudentClassWindow = (row: any, query: any) => {
    const enrollmentDateLimit =
      query?.include?.studentClasses?.where?.enrollmentDate?.lte;
    if (!enrollmentDateLimit) return row;
    return {
      ...row,
      studentClasses: (row.studentClasses || []).filter(
        (studentClass: any) =>
          studentClass.enrollmentDate <= enrollmentDateLimit,
      ),
    };
  };

  const attendanceRows = (rows: any[]) => rows.map((row) => ({
    studentId: "student-1",
    classId: monthlyClass.id,
    ...row,
  }));
  const authoritativeFee = options.authoritativeFee ?? options.existingFee ?? null;
  const existingLine = authoritativeFee?.lines?.[0] ?? null;
  const tx: any = {
    $queryRaw: async () => {
      events.push("lock");
      return [];
    },
    student: {
      findUnique: async (query: any) => {
        events.push("student.findUnique");
        return applyStudentClassWindow(authoritativeStudent, query);
      },
    },
    classSession: {
      findMany: async (query: any) => {
        events.push("classSession.findMany");
        transactionLedgerReads += 1;
        transactionClassInputs.push(query.where.classId.in);
        return authoritativeSessions;
      },
    },
    attendance: {
      findMany: async () => {
        events.push("attendance.findMany");
        return attendanceRows(authoritativeAttendance);
      },
    },
    attendancePeriod: {
      findMany: async (query: any) => {
        lockClassInputs.push(query.where.classId.in);
        return query.where.classId.in.map((classId: string) => ({
          classId,
          status: options.attendancePeriodStatuses?.[classId] ?? "locked",
        }));
      },
    },
    classMonthPlan: {
      findMany: async (query: any) => query.where.classId.in.map((classId: string) => ({
        classId,
        state: options.classMonthPlanStates?.[classId] ?? "frozen",
      })),
    },
    monthlyFee: {
      findUnique: async () => {
        events.push("fee.findUnique");
        return authoritativeFee;
      },
      create: async ({ data }: any) => {
        writes += 1;
        return { id: "fee-created", ...data };
      },
      updateMany: async () => {
        if (
          authoritativeFee &&
          (authoritativeFee.receiptId ||
            authoritativeFee.paidAt ||
            !["pending", "ready"].includes(authoritativeFee.status))
        ) {
          return { count: 0 };
        }
        writes += 1;
        return { count: 1 };
      },
      findUniqueOrThrow: async () => authoritativeFee,
    },
    monthlyFeeLine: {
      findUnique: async () => existingLine,
      create: async ({ data }: any) => {
        writes += 1;
        const line = { id: "line-created", ...data };
        createdLines.push(line);
        return line;
      },
      update: async ({ data }: any) => {
        writes += 1;
        return { ...existingLine, ...data };
      },
      deleteMany: async () => ({ count: 0 }),
    },
  };

  const prisma: any = {
    student: {
      findMany: async (query: any) => [applyStudentClassWindow(initialStudent, query)],
    },
    classSession: {
      findMany: async (query: any) => {
        batchLedgerReads += 1;
        batchClassInputs.push(query.where.classId.in);
        return sessions;
      },
    },
    attendance: {
      findMany: async () => attendanceRows(attendance),
      groupBy: async () => [{
        studentId: "student-1",
        classId: monthlyClass.id,
        _count: { id: options.legacyChargeableCount ?? attendance.length },
      }],
    },
    $transaction: async (work: (client: any) => unknown) => work(tx),
  };

  return {
    prisma,
    createdLines,
    events,
    batchLedgerReads: () => batchLedgerReads,
    transactionLedgerReads: () => transactionLedgerReads,
    writes: () => writes,
    batchClassInputs,
    transactionClassInputs,
    lockClassInputs,
  };
}

function missingPlanCode(result: any) {
  const item = result?.items?.[0];
  return item?.reason ?? item?.code ?? item?.error?.code;
}

describe("monthly fee generator Tuition V3 ledger", () => {
  it("excludes a future legacy StudentClass from dry-run ledger and fee inputs", async () => {
    const harness = createGeneratorPrisma({
      studentRow: {
        ...student(),
        enrollmentPeriods: [],
        studentClasses: [{
          classId: legacyMonthlyClass.id,
          enrollmentDate: new Date("2026-08-01T00:00:00.000Z"),
          class: legacyMonthlyClass,
        }],
      },
      sessions: [regularSession("future-session", "2026-07-02", legacyMonthlyClass.id)],
    });

    const result = await generateMonthlyFees(harness.prisma, {
      month: "2026-07",
      dryRun: true,
    });

    assert.equal(harness.batchLedgerReads(), 0);
    assert.deepEqual(harness.batchClassInputs, []);
    assert.equal(result.items[0].action, "skipped");
    assert.equal(result.items[0].reason, "NO_ACTIVE_CLASS");
  });

  it("excludes a future legacy StudentClass from transactional lock and fee inputs", async () => {
    const futureClass = {
      ...legacyMonthlyClass,
      id: "class-future",
      className: "Future Monthly English",
    };
    const authoritativeStudent = {
      ...student(),
      studentClasses: [{
        classId: futureClass.id,
        enrollmentDate: new Date("2026-08-01T00:00:00.000Z"),
        class: futureClass,
      }],
    };
    const harness = createGeneratorPrisma({
      authoritativeStudentRow: authoritativeStudent,
      authoritativeSessions: [regularSession("current-session", "2026-07-02")],
      authoritativeAttendance: [{
        classSessionId: "current-session",
        attendanceDate: new Date("2026-07-02T00:00:00.000Z"),
        status: "present",
      }],
    });

    const result = await generateMonthlyFees(harness.prisma, {
      month: "2026-07",
      dryRun: false,
    });

    assert.deepEqual(harness.transactionClassInputs, [[monthlyClass.id]]);
    assert.deepEqual(harness.lockClassInputs, [[monthlyClass.id]]);
    assert.deepEqual(
      harness.createdLines.map((line) => line.classId),
      [monthlyClass.id],
    );
    assert.equal(result.items[0].total_amount, 1_000_000);
  });

  it("merges EnrollmentPeriod and legacy StudentClass per class without duplicates", async () => {
    const harness = createGeneratorPrisma({
      studentRow: {
        ...student(),
        enrollmentPeriods: [enrollment()],
        studentClasses: [
          {
            classId: monthlyClass.id,
            enrollmentDate: new Date("2026-07-01T00:00:00.000Z"),
            class: monthlyClass,
          },
          {
            classId: legacyMonthlyClass.id,
            enrollmentDate: new Date("2026-07-01T00:00:00.000Z"),
            class: legacyMonthlyClass,
          },
        ],
      },
      sessions: [
        regularSession("session-period", "2026-07-02"),
        regularSession("session-legacy", "2026-07-02", legacyMonthlyClass.id),
      ],
      attendance: [
        {
          classId: monthlyClass.id,
          classSessionId: "session-period",
          attendanceDate: new Date("2026-07-02T00:00:00.000Z"),
          status: "present",
        },
        {
          classId: legacyMonthlyClass.id,
          classSessionId: "session-legacy",
          attendanceDate: new Date("2026-07-02T00:00:00.000Z"),
          status: "present",
        },
      ],
    });

    const result = await generateMonthlyFees(harness.prisma, {
      month: "2026-07",
      dryRun: false,
    });

    assert.deepEqual(
      harness.createdLines.map((line) => line.classId).sort(),
      [legacyMonthlyClass.id, monthlyClass.id].sort(),
    );
    assert.equal(result.items[0].total_days, 2);
    assert.equal(result.items[0].total_amount, 2_000_000);
  });

  it("uses regular ClassSession rows, half-open enrollment, attendance, and integer allocation", async () => {
    const sessions = [
      regularSession("session-1", "2026-07-01"),
      regularSession("session-2", "2026-07-02"),
      regularSession("session-3", "2026-07-03"),
    ];
    const harness = createGeneratorPrisma({
      sessions,
      attendance: [{
        classSessionId: "session-2",
        attendanceDate: new Date("2026-07-02T00:00:00.000Z"),
        status: "present",
      }],
      legacyChargeableCount: 1,
    });

    const result = await generateMonthlyFees(harness.prisma, {
      month: "2026-07",
      dryRun: false,
    });

    assert.equal(harness.batchLedgerReads(), 0, "write mode must not calculate from a batch snapshot");
    assert.ok(
      harness.transactionLedgerReads() > 0,
      "write mode must read the ClassSession month ledger inside the transaction",
    );
    assert.equal(result.items[0].total_days, 1);
    assert.equal(result.items[0].total_amount, 333_333);
    assert.ok(Number.isInteger(result.items[0].total_amount));

    const line = harness.createdLines[0];
    assert.equal(line.contractSessions, 3);
    assert.equal(line.eligibleSessions, 1, "endedAt is exclusive");
    assert.equal(line.chargedSessions, 1);
    assert.equal(line.amount, 333_333);
    assert.equal(line.scheduleMode, "class_session_ledger");
    assert.equal(line.calculationVersion, "tuition-v3-session-ledger");
  });

  it("returns or throws MISSING_MONTH_PLAN instead of falling back to sessions_per_week", async () => {
    const harness = createGeneratorPrisma({
      sessions: [],
      attendance: [{
        classSessionId: null,
        attendanceDate: new Date("2026-07-02T00:00:00.000Z"),
        status: "present",
      }],
      legacyChargeableCount: 12,
    });

    let result: any;
    let thrown: any;
    try {
      result = await generateMonthlyFees(harness.prisma, {
        month: "2026-07",
        dryRun: true,
      });
    } catch (error) {
      thrown = error;
    }

    if (thrown) {
      assert.equal(thrown?.code, "MISSING_MONTH_PLAN");
    } else {
      assert.equal(missingPlanCode(result), "MISSING_MONTH_PLAN");
      assert.equal(result.items[0].action, "skipped");
    }
  });
});

describe("monthly fee generator protected fee immutability", () => {
  it("uses a bounded serializable transaction for non-dry-run writes", () => {
    const endpoint = source("lib/monthly-fee-generator.ts");
    assert.match(endpoint, /isolationLevel:\s*"Serializable"/);
    assert.match(endpoint, /maxWait:\s*5_?000/);
    assert.match(endpoint, /timeout:\s*15_?000/);
    assert.match(
      endpoint,
      /runSerializableTransaction\(prisma,[\s\S]*?transactionOptions:\s*GENERATOR_TRANSACTION_OPTIONS/,
    );
  });

  it("locks and re-reads authoritative fee state before preserving a protected row", async () => {
    const existingFee = {
      id: "fee-raced",
      studentId: "student-1",
      month: "2026-07",
      totalDays: 1,
      totalAmount: 333_333,
      status: "ready",
      receiptId: null,
      paidAt: null,
      lines: [],
    };
    const authoritativeFee = {
      ...existingFee,
      totalDays: 9,
      totalAmount: 777_777,
      status: "confirmed",
    };
    const harness = createGeneratorPrisma({
      existingFee,
      authoritativeFee,
      sessions: [regularSession("session-raced", "2026-07-02")],
      attendance: [{
        classSessionId: "session-raced",
        attendanceDate: new Date("2026-07-02T00:00:00.000Z"),
        status: "present",
      }],
    });

    const result = await generateMonthlyFees(harness.prisma, {
      month: "2026-07",
      dryRun: false,
    });

    assert.deepEqual(harness.events.slice(0, 2), ["lock", "fee.findUnique"]);
    assert.equal(harness.writes(), 0);
    assert.equal(result.items[0].action, "skipped");
    assert.equal(result.items[0].existing_status, "confirmed");
    assert.equal(result.items[0].total_days, 9);
    assert.equal(result.items[0].total_amount, 777_777);
  });

  const cases = [
    {
      name: "confirmed aggregate",
      fee: { status: "confirmed", receiptId: null, paidAt: null, lines: [] },
    },
    {
      name: "paid aggregate",
      fee: { status: "paid", receiptId: "receipt-paid", paidAt: new Date("2026-07-10"), lines: [] },
    },
    {
      name: "receipt-linked aggregate",
      fee: { status: "ready", receiptId: "receipt-ready", paidAt: null, lines: [] },
    },
    {
      name: "receipt-line-linked class line",
      fee: {
        status: "ready",
        receiptId: null,
        paidAt: null,
        lines: [{
          id: "line-protected",
          status: "ready",
          receiptId: null,
          paidAt: null,
          receiptLines: [{ id: "receipt-line-1" }],
          amount: 777_777,
        }],
      },
    },
  ];

  for (const scenario of cases) {
    it(`does not mutate a ${scenario.name}`, async () => {
      const existingFee = {
        id: `fee-${scenario.name.replaceAll(" ", "-")}`,
        studentId: "student-1",
        month: "2026-07",
        totalDays: 9,
        totalAmount: 777_777,
        ...scenario.fee,
      };
      const harness = createGeneratorPrisma({
        existingFee,
        sessions: [regularSession("session-protected", "2026-07-02")],
        attendance: [{
          classSessionId: "session-protected",
          attendanceDate: new Date("2026-07-02T00:00:00.000Z"),
          status: "present",
        }],
        legacyChargeableCount: 1,
      });

      const result = await generateMonthlyFees(harness.prisma, {
        month: "2026-07",
        dryRun: false,
      });

      assert.equal(harness.writes(), 0, "protected financial history must not enter a write path");
      assert.equal(result.items[0].action, "skipped");
      assert.equal(result.items[0].total_days, 9);
      assert.equal(result.items[0].total_amount, 777_777);
    });
  }
});

describe("monthly fee generator transactional source authority", () => {
  it("locks before re-reading enrollment, sessions, attendance, and calculating", async () => {
    const staleStudent = student(null, {
      startedAt: new Date("2026-07-02T00:00:00.000Z"),
      endedAt: new Date("2026-07-03T00:00:00.000Z"),
    });
    const authoritativeStudent = student(null, {
      startedAt: new Date("2026-07-01T00:00:00.000Z"),
      endedAt: new Date("2026-07-04T00:00:00.000Z"),
    });
    const harness = createGeneratorPrisma({
      studentRow: staleStudent,
      authoritativeStudentRow: authoritativeStudent,
      sessions: [regularSession("stale-session", "2026-07-02")],
      authoritativeSessions: [
        regularSession("session-1", "2026-07-01"),
        regularSession("session-2", "2026-07-02"),
        regularSession("session-3", "2026-07-03"),
      ],
      attendance: [{
        classSessionId: "stale-session",
        attendanceDate: new Date("2026-07-02T00:00:00.000Z"),
        status: "present",
      }],
      authoritativeAttendance: [
        {
          classSessionId: "session-1",
          attendanceDate: new Date("2026-07-01T00:00:00.000Z"),
          status: "present",
        },
        {
          classSessionId: "session-2",
          attendanceDate: new Date("2026-07-02T00:00:00.000Z"),
          status: "absent_no_fee",
        },
        {
          classSessionId: "session-3",
          attendanceDate: new Date("2026-07-03T00:00:00.000Z"),
          status: "present",
        },
      ],
    });

    const result = await generateMonthlyFees(harness.prisma, {
      month: "2026-07",
      dryRun: false,
    });

    assert.equal(harness.batchLedgerReads(), 0);
    assert.equal(harness.transactionLedgerReads(), 1);
    for (const event of [
      "fee.findUnique",
      "student.findUnique",
      "classSession.findMany",
      "attendance.findMany",
    ]) {
      assert.ok(
        harness.events.indexOf(event) > harness.events.indexOf("lock"),
        `${event} must happen after the advisory lock`,
      );
    }
    assert.equal(result.items[0].total_days, 2);
    assert.equal(result.items[0].total_amount, 666_667);
    assert.equal(harness.createdLines[0].contractSessions, 3);
    assert.equal(harness.createdLines[0].studentWaivedSessions, 1);
  });

  for (const scenario of [
    {
      name: "attendance period is not locked",
      attendancePeriodStatuses: {
        [monthlyClass.id]: "locked",
        [legacyMonthlyClass.id]: "approved",
      },
      classMonthPlanStates: {
        [monthlyClass.id]: "frozen",
        [legacyMonthlyClass.id]: "frozen",
      },
    },
    {
      name: "class month plan is not frozen",
      attendancePeriodStatuses: {
        [monthlyClass.id]: "locked",
        [legacyMonthlyClass.id]: "locked",
      },
      classMonthPlanStates: {
        [monthlyClass.id]: "frozen",
        [legacyMonthlyClass.id]: "open",
      },
    },
  ]) {
    it(`skips every write when any class line ${scenario.name}`, async () => {
      const studentRow = student();
      studentRow.enrollmentPeriods.push(enrollment({
        id: "enrollment-legacy",
        classId: legacyMonthlyClass.id,
        class: legacyMonthlyClass,
      }));
      const harness = createGeneratorPrisma({
        studentRow,
        sessions: [
          regularSession("session-monthly", "2026-07-02"),
          regularSession("session-legacy", "2026-07-02", legacyMonthlyClass.id),
        ],
        attendance: [
          {
            classId: monthlyClass.id,
            classSessionId: "session-monthly",
            attendanceDate: new Date("2026-07-02T00:00:00.000Z"),
            status: "present",
          },
          {
            classId: legacyMonthlyClass.id,
            classSessionId: "session-legacy",
            attendanceDate: new Date("2026-07-02T00:00:00.000Z"),
            status: "present",
          },
        ],
        attendancePeriodStatuses: scenario.attendancePeriodStatuses,
        classMonthPlanStates: scenario.classMonthPlanStates,
      });

      const result = await generateMonthlyFees(harness.prisma, {
        month: "2026-07",
        dryRun: false,
      });

      assert.equal(harness.writes(), 0);
      assert.equal(result.items[0].action, "skipped");
      assert.equal(result.items[0].reason, "FEE_PERIOD_NOT_LOCKED");
    });
  }
});
