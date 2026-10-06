export function tenantIdOf(db: any): string | undefined {
  return typeof db?.$tenantId === "string" && db.$tenantId.trim()
    ? db.$tenantId
    : undefined;
}

export function classSessionUniqueWhere(
  db: any,
  classId: string,
  sessionDate: Date,
) {
  const tenantId = tenantIdOf(db);
  if (tenantId) {
    return {
      tenantId_classId_sessionDate: {
        tenantId,
        classId,
        sessionDate,
      },
    };
  }
  return { classId_sessionDate: { classId, sessionDate } };
}

export function classMonthPlanUniqueWhere(
  db: any,
  classId: string,
  billingMonth: string,
) {
  const tenantId = tenantIdOf(db);
  if (tenantId) {
    return {
      tenantId_classId_billingMonth: {
        tenantId,
        classId,
        billingMonth,
      },
    };
  }
  return { classId_billingMonth: { classId, billingMonth } };
}

export function classMonthPlanRevisionUniqueWhere(
  db: any,
  planId: string,
  revision: number,
) {
  const tenantId = tenantIdOf(db);
  if (tenantId) {
    return {
      tenantId_planId_revision: {
        tenantId,
        planId,
        revision,
      },
    };
  }
  return { planId_revision: { planId, revision } };
}

export function attendancePeriodUniqueWhere(
  db: any,
  classId: string,
  periodMonth: string,
) {
  const tenantId = tenantIdOf(db);
  if (tenantId) {
    return {
      tenantId_classId_periodMonth: {
        tenantId,
        classId,
        periodMonth,
      },
    };
  }
  return { classId_periodMonth: { classId, periodMonth } };
}

export function attendanceUniqueWhere(
  db: any,
  studentId: string,
  classId: string,
  attendanceDate: Date,
) {
  const tenantId = tenantIdOf(db);
  if (tenantId) {
    return {
      tenantId_studentId_classId_attendanceDate: {
        tenantId,
        studentId,
        classId,
        attendanceDate,
      },
    };
  }
  return {
    studentId_classId_attendanceDate: {
      studentId,
      classId,
      attendanceDate,
    },
  };
}

export function monthlyFeeLineUniqueWhere(
  db: any,
  studentId: string,
  month: string,
  allocationKey: string,
) {
  const tenantId = tenantIdOf(db);
  if (tenantId) {
    return {
      tenantId_studentId_month_allocationKey: {
        tenantId,
        studentId,
        month,
        allocationKey,
      },
    };
  }
  return {
    studentId_month_allocationKey: {
      studentId,
      month,
      allocationKey,
    },
  };
}

export function monthlyFeeUniqueWhere(
  db: any,
  studentId: string,
  month: string,
) {
  const tenantId = tenantIdOf(db);
  if (tenantId) {
    return {
      tenantId_studentId_month: {
        tenantId,
        studentId,
        month,
      },
    };
  }
  return {
    studentId_month: {
      studentId,
      month,
    },
  };
}
