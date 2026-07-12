import assert from "node:assert/strict";
import test from "node:test";
import { ApiError } from "../lib/api-utils.js";
import { parsePagination } from "../lib/pagination.js";
import prisma from "../lib/prisma.js";
import { handler as studentsHandler } from "../server/api/students/index.js";

function createResponse() {
  const response: any = {
    statusCode: 200,
    body: undefined,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(body: unknown) {
      this.body = body;
      return this;
    },
  };
  return response;
}

test("parsePagination applies defaults and caps limit at 500", () => {
  assert.deepEqual(parsePagination({}), { limit: 100, offset: 0 });
  assert.deepEqual(parsePagination({ limit: "999", offset: "12" }), {
    limit: 500,
    offset: 12,
  });
});

for (const [field, value] of [
  ["limit", "-1"],
  ["offset", "-1"],
  ["limit", "NaN"],
  ["offset", "12px"],
  ["limit", ["10"]],
  ["offset", ["0"]],
  ["limit", "0"],
  ["offset", "1.5"],
] as const) {
  test(`parsePagination rejects invalid ${field}: ${JSON.stringify(value)}`, () => {
    assert.throws(
      () => parsePagination({ [field]: value }),
      (error: unknown) => {
        assert.ok(error instanceof ApiError);
        assert.equal(error.status, 400);
        assert.equal(error.code, "INVALID_PAGINATION");
        return true;
      },
    );
  });
}

test("students rejects invalid pagination before calling Prisma", async () => {
  const student = prisma.student as any;
  const originalFindMany = student.findMany;
  const originalFindFirst = student.findFirst;
  let prismaCalls = 0;
  student.findMany = async () => {
    prismaCalls += 1;
    return [];
  };
  student.findFirst = async () => {
    prismaCalls += 1;
    return null;
  };

  try {
    const response = createResponse();
    await studentsHandler(
      { method: "GET", query: { id: "student-1", limit: ["10"] } } as any,
      response,
    );

    assert.equal(response.statusCode, 400);
    assert.equal(response.body?.error?.code, "INVALID_PAGINATION");
    assert.equal(prismaCalls, 0);
  } finally {
    student.findMany = originalFindMany;
    student.findFirst = originalFindFirst;
  }
});

for (const fields of ["options", "table", undefined]) {
  test(`students applies shared pagination to ${fields ?? "default"} branch`, async () => {
    const student = prisma.student as any;
    const originalFindMany = student.findMany;
    const originalCount = student.count;
    let findManyArgs: any;
    student.findMany = async (args: any) => {
      findManyArgs = args;
      return [];
    };
    student.count = async () => 0;

    try {
      const response = createResponse();
      await studentsHandler(
        {
          method: "GET",
          query: { fields, limit: "900", offset: "17" },
        } as any,
        response,
      );

      assert.equal(response.statusCode, 200);
      assert.equal(findManyArgs.take, 500);
      assert.equal(findManyArgs.skip, 17);
    } finally {
      student.findMany = originalFindMany;
      student.count = originalCount;
    }
  });
}
