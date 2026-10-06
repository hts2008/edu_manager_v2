import { Prisma, PrismaClient } from "@prisma/client";

import { prisma } from "./prisma.js";

export const TENANT_SCOPED_MODELS = [
  "SettingValue",
  "SettingRevision",
  "RolePermission",
  "IntegrationConfig",
  "User",
  "Parent",
  "AuthSession",
  "Student",
  "Teacher",
  "Class",
  "ClassSession",
  "ClassMonthPlan",
  "ClassMonthPlanRevision",
  "StudentClass",
  "EnrollmentPeriod",
  "Attendance",
  "AttendancePeriod",
  "MonthlyFee",
  "MonthlyFeeLine",
  "MonthlyFeeLineRevision",
  "Template",
  "Receipt",
  "ReceiptLine",
  "BulkFeePaymentBatch",
  "BulkFeePaymentItem",
  "Payment",
  "ActivityLog",
  "StudentProgressMonth",
  "StudentProgressRevision",
  "StudentProgressSkill",
  "StudentProgressDailyEntry",
  "CenterSettings",
] as const;

export type TenantScopedModel = (typeof TENANT_SCOPED_MODELS)[number];

export const TENANT_OPERATION_MATRIX = {
  scopedRead: [
    "findUnique",
    "findUniqueOrThrow",
    "findFirst",
    "findFirstOrThrow",
    "findMany",
    "count",
    "aggregate",
    "groupBy",
  ],
  scopedCreate: ["create", "createMany", "createManyAndReturn"],
  scopedUpdate: ["update", "updateMany", "updateManyAndReturn"],
  scopedDelete: ["delete", "deleteMany"],
  scopedUpsert: ["upsert"],
  rejectedModelOperations: ["findRaw", "aggregateRaw"],
  rejectedClientOperations: [
    "$queryRaw",
    "$queryRawUnsafe",
    "$executeRaw",
    "$executeRawUnsafe",
    "$runCommandRaw",
  ],
} as const;

type OperationGroup = keyof typeof TENANT_OPERATION_MATRIX;
type GuardArgs = Record<string, unknown>;
type PrismaLikeClient = Record<string, any>;
type TenantClientOptions = {
  allowRawOperations?: boolean;
};

const SCOPED_MODEL_SET = new Set<string>(TENANT_SCOPED_MODELS);
const OPERATION_GROUP = new Map<string, OperationGroup>();
const CLIENT_REJECTIONS = new Set<string>(TENANT_OPERATION_MATRIX.rejectedClientOperations);
const UNIQUE_OPERATIONS = new Set(["findUnique", "findUniqueOrThrow", "update", "delete", "upsert"]);
const NESTED_WRITE_OPERATORS = new Set([
  "create",
  "createMany",
  "connect",
  "connectOrCreate",
  "disconnect",
  "delete",
  "deleteMany",
  "set",
  "update",
  "updateMany",
  "upsert",
]);

for (const [group, operations] of Object.entries(TENANT_OPERATION_MATRIX)) {
  if (group === "rejectedClientOperations") continue;
  for (const operation of operations) OPERATION_GROUP.set(operation, group as OperationGroup);
}

const MODEL_BY_DELEGATE = new Map<string, string>();
const RELATION_FIELDS_BY_MODEL = new Map<string, ReadonlySet<string>>();

for (const model of Prisma.dmmf.datamodel.models) {
  const delegate = model.name.charAt(0).toLowerCase() + model.name.slice(1);
  MODEL_BY_DELEGATE.set(delegate, model.name);
  RELATION_FIELDS_BY_MODEL.set(
    model.name,
    new Set(model.fields.filter((field) => field.kind === "object").map((field) => field.name)),
  );
}

export class TenantIsolationError extends Error {
  readonly code: string;
  readonly model?: string;
  readonly operation?: string;

  constructor(
    code: string,
    message: string,
    context: { model?: string; operation?: string } = {},
  ) {
    super(message);
    this.name = "TenantIsolationError";
    this.code = code;
    this.model = context.model;
    this.operation = context.operation;
  }
}

function assertTenantId(tenantId: string): void {
  if (typeof tenantId !== "string" || tenantId.trim().length === 0) {
    throw new TenantIsolationError("TENANT_REQUIRED", "A non-empty tenantId is required");
  }
}

function isRecord(value: unknown): value is Record<string, any> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasOwn(value: Record<string, any>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function assertNoNestedRelationWrites(model: string, data: unknown, operation: string): void {
  const relationFields = RELATION_FIELDS_BY_MODEL.get(model) ?? new Set<string>();
  const rows = Array.isArray(data) ? data : [data];

  for (const row of rows) {
    if (!isRecord(row)) continue;
    for (const fieldName of relationFields) {
      const nestedValue = row[fieldName];
      if (!isRecord(nestedValue)) continue;
      const operator = Object.keys(nestedValue).find((key) => NESTED_WRITE_OPERATORS.has(key));
      if (!operator) continue;

      throw new TenantIsolationError(
        "UNSAFE_NESTED_WRITE",
        `${model}.${operation} cannot safely scope nested relation '${fieldName}.${operator}'`,
        { model, operation },
      );
    }
  }
}

function scopeUniqueWhere(
  model: string,
  operation: string,
  where: unknown,
  tenantId: string,
): Record<string, unknown> {
  const original = isRecord(where) ? where : {};

  if (original.tenantId !== undefined && original.tenantId !== tenantId) {
    throw new TenantIsolationError(
      "CROSS_TENANT_WHERE",
      `${model}.${operation} attempted to target tenant '${String(original.tenantId)}' from tenant '${tenantId}'`,
      { model, operation },
    );
  }

  let hasTenantCompoundSelector = false;
  for (const value of Object.values(original)) {
    if (!isRecord(value) || !hasOwn(value, "tenantId")) continue;
    hasTenantCompoundSelector = true;
    if (value.tenantId !== tenantId) {
      throw new TenantIsolationError(
        "CROSS_TENANT_WHERE",
        `${model}.${operation} attempted to target tenant '${String(value.tenantId)}' from tenant '${tenantId}'`,
        { model, operation },
      );
    }
  }

  if (hasTenantCompoundSelector) return original;
  return { ...original, tenantId };
}

function scopeWhere(
  model: string,
  operation: string,
  where: unknown,
  tenantId: string,
  unique: boolean,
): Record<string, unknown> {
  const original = isRecord(where) ? where : {};
  if (unique) return scopeUniqueWhere(model, operation, original, tenantId);
  return { AND: [{ tenantId }, original] };
}

function scopeData(
  model: string,
  operation: string,
  data: unknown,
  tenantId: string,
): unknown {
  assertNoNestedRelationWrites(model, data, operation);

  const scopeRow = (row: unknown): unknown => {
    if (!isRecord(row)) {
      throw new TenantIsolationError(
        "INVALID_WRITE_DATA",
        `${model}.${operation} requires object data`,
        { model, operation },
      );
    }
    if (row.tenantId !== undefined && row.tenantId !== tenantId) {
      throw new TenantIsolationError(
        "CROSS_TENANT_WRITE",
        `${model}.${operation} attempted to write tenant '${String(row.tenantId)}' from tenant '${tenantId}'`,
        { model, operation },
      );
    }
    return { ...row, tenantId };
  };

  return Array.isArray(data) ? data.map(scopeRow) : scopeRow(data);
}

export function applyTenantOperationGuard(
  model: string,
  operation: string,
  args: unknown,
  tenantId: string,
): GuardArgs {
  assertTenantId(tenantId);
  const input = isRecord(args) ? { ...args } : {};

  if (!SCOPED_MODEL_SET.has(model)) return input;

  const group = OPERATION_GROUP.get(operation);
  if (!group || group === "rejectedModelOperations") {
    throw new TenantIsolationError(
      "UNSAFE_MODEL_OPERATION",
      `${model}.${operation} is not allowed through a tenant-scoped client`,
      { model, operation },
    );
  }

  if (group === "scopedRead") {
    input.where = scopeWhere(model, operation, input.where, tenantId, UNIQUE_OPERATIONS.has(operation));
    return input;
  }

  if (group === "scopedCreate") {
    input.data = scopeData(model, operation, input.data, tenantId);
    return input;
  }

  if (group === "scopedUpdate") {
    input.where = scopeWhere(model, operation, input.where, tenantId, operation === "update");
    input.data = scopeData(model, operation, input.data, tenantId);
    return input;
  }

  if (group === "scopedDelete") {
    input.where = scopeWhere(model, operation, input.where, tenantId, operation === "delete");
    return input;
  }

  if (group === "scopedUpsert") {
    input.where = scopeWhere(model, operation, input.where, tenantId, true);
    input.create = scopeData(model, operation, input.create, tenantId);
    input.update = scopeData(model, operation, input.update, tenantId);
    return input;
  }

  throw new TenantIsolationError(
    "UNSAFE_MODEL_OPERATION",
    `${model}.${operation} is not allowed through a tenant-scoped client`,
    { model, operation },
  );
}

function createDelegateProxy(delegate: Record<string, any>, model: string, tenantId: string): unknown {
  return new Proxy(delegate, {
    get(target, property, receiver) {
      const value = Reflect.get(target, property, receiver);
      if (typeof property !== "string" || typeof value !== "function") return value;

      return (args: unknown) => {
        const guardedArgs = applyTenantOperationGuard(model, property, args, tenantId);
        return value.call(target, guardedArgs);
      };
    },
  });
}

export function createTenantClient<TClient extends PrismaLikeClient>(
  source: TClient,
  tenantId: string,
  options: TenantClientOptions = {},
): TClient {
  assertTenantId(tenantId);
  const delegateCache = new Map<string, unknown>();

  return new Proxy(source, {
    get(target, property, receiver) {
      if (typeof property !== "string") return Reflect.get(target, property, receiver);

      if (property === "$tenantId") return tenantId;

      if (CLIENT_REJECTIONS.has(property)) {
        if (options.allowRawOperations) {
          const rawOperation = Reflect.get(target, property, receiver);
          return typeof rawOperation === "function" ? rawOperation.bind(target) : rawOperation;
        }
        return () => {
          throw new TenantIsolationError(
            "UNSAFE_RAW_QUERY",
            `${property} is forbidden on a tenant-scoped client`,
            { operation: property },
          );
        };
      }

      if (property === "$tenantRawTransaction") {
        return (input: unknown, ...transactionOptions: unknown[]) => {
          if (typeof input !== "function") {
            throw new TenantIsolationError(
              "UNSAFE_BATCH_TRANSACTION",
              "Array transactions cannot prove that every query used the tenant-scoped client",
              { operation: property },
            );
          }
          const transaction = Reflect.get(target, "$transaction", receiver);
          return transaction.call(
            target,
            (tx: PrismaLikeClient) => input(createTenantClient(tx, tenantId, { allowRawOperations: true })),
            ...transactionOptions,
          );
        };
      }

      if (property === "$transaction") {
        return (input: unknown, ...options: unknown[]) => {
          if (typeof input !== "function") {
            throw new TenantIsolationError(
              "UNSAFE_BATCH_TRANSACTION",
              "Array transactions cannot prove that every query used the tenant-scoped client",
              { operation: property },
            );
          }
          const transaction = Reflect.get(target, property, receiver);
          return transaction.call(
            target,
            (tx: PrismaLikeClient) => input(createTenantClient(tx, tenantId)),
            ...options,
          );
        };
      }

      const model = MODEL_BY_DELEGATE.get(property);
      const value = Reflect.get(target, property, receiver);
      if (!model || !SCOPED_MODEL_SET.has(model) || !isRecord(value)) return value;

      if (!delegateCache.has(property)) {
        delegateCache.set(property, createDelegateProxy(value, model, tenantId));
      }
      return delegateCache.get(property);
    },
  });
}

const TENANT_CLIENT_CACHE = new Map<string, PrismaClient>();

export function getTenantClient(tenantId: string): PrismaClient {
  assertTenantId(tenantId);
  const normalizedTenantId = tenantId.trim();
  const cached = TENANT_CLIENT_CACHE.get(normalizedTenantId);
  if (cached) return cached;

  const client = createTenantClient(prisma, normalizedTenantId) as PrismaClient;
  TENANT_CLIENT_CACHE.set(normalizedTenantId, client);
  return client;
}
