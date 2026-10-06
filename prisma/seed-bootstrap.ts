const DEFAULT_TENANT_ID = "tenant_default";

export type BootstrapOptions = {
  adminPasswordHash: string;
  freshPlatformOwner?: boolean;
  approvedOwnerId?: string;
};

export type BusinessTenantOptions = {
  slug: string;
  name: string;
  adminUsername: string;
  adminPasswordHash: string;
};

function requiredText(value: string, field: string, limit: number) {
  if (typeof value !== "string" || !value.trim() || value.trim().length > limit) throw new Error(`Invalid ${field}`);
  return value.trim();
}

function assertPasswordHash(hash: string) {
  if (typeof hash !== "string" || !/^\$2[aby]\$(0[4-9]|[12][0-9]|3[01])\$[./A-Za-z0-9]{53}$/.test(hash)) {
    throw new Error("adminPasswordHash must be a bcrypt credential hash");
  }
}

async function ensureDefaults(tx: any, tenant: any, adminId: string) {
  if (!await tx.centerSettings.findFirst({ where: { tenantId: tenant.id } })) {
    await tx.centerSettings.create({ data: { tenantId: tenant.id, centerName: tenant.name } });
  }
  for (const type of ["receipt", "payment"]) {
    const defaults = await tx.template.findMany({ where: { tenantId: tenant.id, type, isDefault: true } });
    if (defaults.length > 1) throw new Error("Competing default templates require operator reconciliation");
    if (defaults.length === 0) {
      await tx.template.create({
        data: {
          tenantId: tenant.id, templateName: type === "receipt" ? "Default Receipt" : "Default Payment",
          type, paperSize: "a5", orientation: "portrait", jsonConfig: { elements: [], version: "1.0" },
          isDefault: true, createdById: adminId,
        },
      });
    }
  }
}

async function approveOwner(tx: any, id: string) {
  const owner = await tx.user.findUnique({ where: { id } });
  if (!owner || owner.role !== "admin" || owner.status !== "active") throw new Error("Approved owner must identify an existing active admin");
  const tenant = await tx.tenant.findUnique({ where: { id: owner.tenantId } });
  if (!tenant || tenant.status !== "active") throw new Error("Approved owner tenant must be active");
  await tx.user.update({ where: { id: owner.id }, data: { isPlatformOwner: true } });
}

export async function bootstrapDatabase(prisma: any, options: BootstrapOptions) {
  assertPasswordHash(options.adminPasswordHash);
  if (options.freshPlatformOwner !== undefined && typeof options.freshPlatformOwner !== "boolean") throw new Error("freshPlatformOwner must be a boolean");
  const approvedOwnerId = options.approvedOwnerId === undefined ? undefined : requiredText(options.approvedOwnerId, "approvedOwnerId", 128);
  if (options.freshPlatformOwner && approvedOwnerId) throw new Error("Owner approval options are mutually exclusive");
  return prisma.$transaction(async (tx: any) => {
    // Expand seeds the default tenant even on an empty installation.
    if (options.freshPlatformOwner && await tx.user.count() !== 0) throw new Error("Fresh owner approval is only valid before any users exist");
    if (approvedOwnerId) await approveOwner(tx, approvedOwnerId);
    let tenant = await tx.tenant.findUnique({ where: { id: DEFAULT_TENANT_ID } });
    if (!tenant) tenant = await tx.tenant.create({ data: { id: DEFAULT_TENANT_ID, slug: "default", name: "EduManager Default Tenant", status: "active" } });
    if (tenant.status !== "active") throw new Error("Default tenant is suspended; bootstrap refused");
    let admin = await tx.user.findFirst({ where: { tenantId: tenant.id, username: "admin" } });
    if (!admin) {
      admin = await tx.user.create({
        data: { tenantId: tenant.id, username: "admin", passwordHash: options.adminPasswordHash,
          fullName: "System Administrator", role: "admin", status: "active", isPlatformOwner: options.freshPlatformOwner === true },
      });
    }
    await ensureDefaults(tx, tenant, admin.id);
    return { admin: "admin", tenant: tenant.slug, center_settings: true, templates: 2 };
  }, { isolationLevel: "Serializable" });
}

export async function provisionBusinessTenant(prisma: any, options: BusinessTenantOptions) {
  const slug = requiredText(options.slug, "slug", 63);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug === "default") throw new Error("Invalid business tenant slug");
  const name = requiredText(options.name, "name", 160);
  const username = requiredText(options.adminUsername, "adminUsername", 128);
  assertPasswordHash(options.adminPasswordHash);
  return prisma.$transaction(async (tx: any) => {
    // Create rather than upsert: collisions abort the entire provisioning.
    const tenant = await tx.tenant.create({ data: { slug, name, status: "active" } });
    const admin = await tx.user.create({
      data: { tenantId: tenant.id, username, passwordHash: options.adminPasswordHash,
        fullName: "Tenant Administrator", role: "admin", status: "active", isPlatformOwner: false },
    });
    await ensureDefaults(tx, tenant, admin.id);
    return { tenantId: tenant.id, tenantSlug: tenant.slug, adminId: admin.id };
  }, { isolationLevel: "Serializable" });
}
