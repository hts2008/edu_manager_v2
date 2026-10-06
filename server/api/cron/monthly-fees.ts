import type { VercelRequest, VercelResponse } from "../../../lib/vercel-types.js";
import prisma from "../../../lib/prisma.js";
import { errorResponse, handleCors, successResponse } from "../../../lib/auth.js";
import { getString, sendApiError } from "../../../lib/api-utils.js";
import { assertCronRequest, getCronAuthorization } from "../../../lib/cron.js";
import { currentMonth, generateMonthlyFees } from "../../../lib/monthly-fee-generator.js";
import { getTenantClient } from "../../../lib/prisma-tenant.js";
import { loadTuitionSettings } from "../../../lib/tuition-settings.js";

type CronGeneratorResult = Awaited<ReturnType<typeof generateMonthlyFees>>;

type RunMonthlyFeeCronInput = {
  rootDb: any;
  month: string;
  dryRun: boolean;
  getTenantDb?: (tenantId: string) => any;
  loadSettings?: typeof loadTuitionSettings;
  generate?: typeof generateMonthlyFees;
};

export async function runMonthlyFeeCron({
  rootDb,
  month,
  dryRun,
  getTenantDb = getTenantClient,
  loadSettings = loadTuitionSettings,
  generate = generateMonthlyFees,
}: RunMonthlyFeeCronInput) {
  const tenants = await rootDb.tenant.findMany({
    where: { status: "active" },
    select: { id: true, slug: true },
    orderBy: { id: "asc" },
  });
  const tenantResults: Array<{
    tenant_id: string;
    tenant_slug: string;
    result: CronGeneratorResult;
  }> = [];

  // Keep execution deterministic and bounded per tenant. A failure stops the
  // cron so Vercel records it, while already-created rows remain idempotent.
  for (const tenant of tenants) {
    const tenantDb = getTenantDb(tenant.id);
    const settings = await loadSettings(tenantDb, {
      tenantId: tenant.id,
      effectiveMonth: month,
    });
    const result = await generate(tenantDb, {
      month,
      dryRun,
      tenantId: tenant.id,
      settings,
    });
    tenantResults.push({
      tenant_id: tenant.id,
      tenant_slug: tenant.slug,
      result,
    });
  }

  const summary = tenantResults.reduce(
    (aggregate, tenant) => {
      const current = tenant.result.summary;
      aggregate.total_students += current.total_students;
      aggregate.created += current.created;
      aggregate.updated += current.updated;
      aggregate.skipped += current.skipped;
      aggregate.would_create += current.would_create;
      aggregate.would_update += current.would_update;
      aggregate.total_amount += current.total_amount;
      return aggregate;
    },
    {
      dry_run: dryRun,
      total_students: 0,
      created: 0,
      updated: 0,
      skipped: 0,
      would_create: 0,
      would_update: 0,
      total_amount: 0,
    },
  );

  return {
    month,
    total_tenants: tenantResults.length,
    ...summary,
    summary,
    items: tenantResults.flatMap((tenant) => tenant.result.items.map((item) => ({
      ...item,
      tenant_id: tenant.tenant_id,
    }))),
    tenants: tenantResults.map((tenant) => ({
      tenant_id: tenant.tenant_id,
      tenant_slug: tenant.tenant_slug,
      ...tenant.result,
    })),
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;
  if (req.method !== "GET" && req.method !== "POST") {
    return errorResponse(res, "METHOD_NOT_ALLOWED", "Only GET and POST allowed", 405);
  }
  if (!getCronAuthorization()) {
    return errorResponse(res, "CRON_NOT_CONFIGURED", "CRON_SECRET is not configured", 503);
  }
  if (!assertCronRequest(req)) {
    return errorResponse(res, "FORBIDDEN", "Invalid cron request", 403);
  }

  try {
    const month = getString(req.query.month || req.body?.month) || currentMonth();
    const dryRun = getString(req.query.dry_run || req.body?.dry_run) === "true";
    const result = await runMonthlyFeeCron({ rootDb: prisma, month, dryRun });
    return successResponse(res, { job: "monthly-fees", ...result });
  } catch (error) {
    return sendApiError(res, error, "CRON_MONTHLY_FEES_ERROR");
  }
}
