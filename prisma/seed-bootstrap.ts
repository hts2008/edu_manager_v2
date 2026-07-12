const ADMIN_ID = "bootstrap-admin";

export async function bootstrapDatabase(prisma: any, { adminPasswordHash }: { adminPasswordHash: string }) {
  return prisma.$transaction(async (tx: any) => {
    const admin = await tx.user.upsert({
      where: { username: "admin" },
      update: {},
      create: { id: ADMIN_ID, username: "admin", passwordHash: adminPasswordHash, fullName: "System Administrator", email: "admin@edumanager.local", role: "admin", status: "active" },
    });
    await tx.centerSettings.upsert({
      where: { id: 1 },
      update: {},
      create: { id: 1, centerName: "EduManager", centerAddress: "Configure center address", centerPhone: "Configure center phone", centerEmail: "admin@edumanager.local" },
    });
    for (const template of [
      { id: "bootstrap-receipt-template", templateName: "Default Receipt", type: "receipt" },
      { id: "bootstrap-payment-template", templateName: "Default Payment", type: "payment" },
    ]) {
      await tx.template.upsert({
        where: { id: template.id },
        update: {},
        create: { ...template, paperSize: "a5", orientation: "portrait", jsonConfig: { elements: [], version: "1.0" }, isDefault: true, createdById: admin.id },
      });
    }
    return { admin: "admin", center_settings: true, templates: 2 };
  });
}
