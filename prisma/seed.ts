// Seed script for PostgreSQL (Supabase)
// Run: npx tsx prisma/seed.ts

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Create default admin user
  const passwordHash = await bcrypt.hash("admin123", 10);

  const admin = await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      passwordHash,
      fullName: "Administrator",
      email: "admin@edumanager.local",
      role: "admin",
      status: "active",
    },
  });
  console.log("✅ Created admin user:", admin.username);

  // Create sample parent
  const parent = await prisma.parent.upsert({
    where: { phone: "0901234567" },
    update: {},
    create: {
      fullName: "Nguyễn Văn Cha",
      phone: "0901234567",
      email: "nguyen.parent@example.com",
      address: "123 Đường ABC, Quận 1, TP.HCM",
      relationship: "father",
    },
  });
  console.log("✅ Created sample parent:", parent.fullName);

  // Create sample teacher
  const teacher = await prisma.teacher.upsert({
    where: { phone: "0909876543" },
    update: {},
    create: {
      fullName: "Trần Thị Giáo Viên",
      phone: "0909876543",
      email: "tran.teacher@example.com",
      salaryType: "hourly",
      salaryAmount: 200000,
      status: "active",
    },
  });
  console.log("✅ Created sample teacher:", teacher.fullName);

  // Create sample class
  const sampleClass = await prisma.class.create({
    data: {
      className: "Toán Lớp 10 - Chiều Thứ 3,5,7",
      scheduleDays: [2, 4, 6], // Tue, Thu, Sat
      startTime: "14:00",
      endTime: "16:00",
      feePerDay: 100000,
      maxStudents: 30,
      teacherId: teacher.id,
      status: "active",
    },
  });
  console.log("✅ Created sample class:", sampleClass.className);

  // Create sample student
  const student = await prisma.student.create({
    data: {
      fullName: "Nguyễn Văn Học Sinh",
      dateOfBirth: new Date("2010-05-15"),
      gender: "male",
      parentId: parent.id,
      phone: "0912345678",
      enrollmentDate: new Date(),
      status: "active",
    },
  });
  console.log("✅ Created sample student:", student.fullName);

  // Enroll student in class
  await prisma.studentClass.create({
    data: {
      studentId: student.id,
      classId: sampleClass.id,
      enrollmentDate: new Date(),
      status: "active",
    },
  });
  console.log("✅ Enrolled student in class");

  // Create default receipt template
  const template = await prisma.template.create({
    data: {
      templateName: "Phiếu Thu Mặc Định",
      type: "receipt",
      paperSize: "a4",
      orientation: "portrait",
      jsonConfig: {
        elements: [],
        version: "1.0",
      },
      isDefault: true,
      createdById: admin.id,
    },
  });
  console.log("✅ Created default template:", template.templateName);

  // Create center settings
  await prisma.centerSettings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      centerName: "Trung Tâm Dạy Thêm EduManager",
      centerAddress: "123 Đường Giáo Dục, Quận 1, TP.HCM",
      centerPhone: "028 1234 5678",
      centerEmail: "contact@edumanager.vn",
    },
  });
  console.log("✅ Created center settings");

  console.log("\n🎉 Seeding completed!");
  console.log("\n📝 Login credentials:");
  console.log("   Username: admin");
  console.log("   Password: admin123");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
