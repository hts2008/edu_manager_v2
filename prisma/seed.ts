// Seed script for PostgreSQL (Supabase) - Extended Data
// Run: npx tsx prisma/seed.ts

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Vietnamese name data for realistic generation
const lastNames = [
  "Nguyễn",
  "Trần",
  "Lê",
  "Phạm",
  "Hoàng",
  "Huỳnh",
  "Vũ",
  "Võ",
  "Đặng",
  "Bùi",
];
const maleFirstNames = [
  "Anh",
  "Bảo",
  "Cường",
  "Dũng",
  "Đức",
  "Hải",
  "Hùng",
  "Khoa",
  "Long",
  "Minh",
  "Nam",
  "Phong",
  "Quang",
  "Thành",
  "Tuấn",
];
const femaleFirstNames = [
  "An",
  "Bích",
  "Chi",
  "Dung",
  "Hà",
  "Hương",
  "Lan",
  "Linh",
  "Mai",
  "Ngọc",
  "Phương",
  "Tâm",
  "Thanh",
  "Thảo",
  "Yến",
];
const middleNames = [
  "Văn",
  "Thị",
  "Hoàng",
  "Minh",
  "Thanh",
  "Kim",
  "Ngọc",
  "Bảo",
  "Gia",
  "Hữu",
];

function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateVietnameseName(gender: "male" | "female"): string {
  const lastName = randomPick(lastNames);
  const middleName =
    gender === "male"
      ? randomPick(["Văn", "Hoàng", "Minh", "Hữu", "Gia"])
      : randomPick(["Thị", "Ngọc", "Kim", "Thanh", "Bảo"]);
  const firstName =
    gender === "male"
      ? randomPick(maleFirstNames)
      : randomPick(femaleFirstNames);
  return `${lastName} ${middleName} ${firstName}`;
}

function generatePhone(): string {
  const prefixes = [
    "090",
    "091",
    "093",
    "094",
    "096",
    "097",
    "098",
    "070",
    "076",
    "077",
    "078",
    "079",
    "081",
    "082",
    "083",
    "084",
    "085",
  ];
  return `${randomPick(prefixes)}${Math.floor(
    1000000 + Math.random() * 9000000
  )}`;
}

function randomDate(start: Date, end: Date): Date {
  return new Date(
    start.getTime() + Math.random() * (end.getTime() - start.getTime())
  );
}

async function main() {
  console.log("🌱 Seeding database with extended data...\n");

  // Clear existing data (in correct order due to foreign keys)
  console.log("🧹 Clearing existing data...");
  await prisma.attendance.deleteMany();
  await prisma.studentClass.deleteMany();
  await prisma.receipt.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.student.deleteMany();
  await prisma.class.deleteMany();
  await prisma.teacher.deleteMany();
  await prisma.parent.deleteMany();
  await prisma.template.deleteMany();
  await prisma.user.deleteMany();

  // Create admin user
  const passwordHash = await bcrypt.hash("admin123", 10);
  const admin = await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      passwordHash,
      fullName: "Quản Trị Viên",
      email: "admin@edumanager.local",
      role: "admin",
      status: "active",
    },
  });
  console.log("✅ Created admin user:", admin.username);

  // Create receptionist
  const receptionistHash = await bcrypt.hash("staff123", 10);
  const receptionist = await prisma.user.create({
    data: {
      username: "nhanvien",
      passwordHash: receptionistHash,
      fullName: "Nhân Viên Tiếp Nhận",
      email: "nhanvien@edumanager.local",
      role: "receptionist",
      status: "active",
    },
  });
  console.log("✅ Created receptionist:", receptionist.username);

  // Create 5 teachers
  const teachers = [];
  const teacherData = [
    { name: "Lê Thị Hương", subject: "Toán", phone: "0901234567" },
    { name: "Nguyễn Văn Minh", subject: "Lý", phone: "0912345678" },
    { name: "Trần Thị Lan", subject: "Anh Văn", phone: "0923456789" },
    { name: "Phạm Văn Đức", subject: "Hóa", phone: "0934567890" },
    { name: "Hoàng Thị Mai", subject: "Văn", phone: "0945678901" },
  ];

  for (const t of teacherData) {
    const teacher = await prisma.teacher.create({
      data: {
        fullName: t.name,
        phone: t.phone,
        email: `${t.name.toLowerCase().replace(/\s+/g, ".")}@edumanager.vn`,
        salaryType: "hourly",
        salaryAmount: 180000 + Math.floor(Math.random() * 50000),
        status: "active",
      },
    });
    teachers.push(teacher);
    console.log(`✅ Created teacher: ${t.name} (${t.subject})`);
  }

  // Create 6 classes
  const classes = [];
  const classData = [
    {
      name: "Toán 10 - Chiều T3,T5,T7",
      days: [2, 4, 6],
      teacher: 0,
      time: ["14:00", "16:00"],
      fee: 100000,
    },
    {
      name: "Toán 11 - Sáng T2,T4,T6",
      days: [1, 3, 5],
      teacher: 0,
      time: ["08:00", "10:00"],
      fee: 120000,
    },
    {
      name: "Lý 10 - Chiều T2,T4,T6",
      days: [1, 3, 5],
      teacher: 1,
      time: ["14:00", "16:00"],
      fee: 100000,
    },
    {
      name: "Anh Văn 10 - Tối T3,T5",
      days: [2, 4],
      teacher: 2,
      time: ["18:30", "20:30"],
      fee: 150000,
    },
    {
      name: "Hóa 11 - Sáng T7,CN",
      days: [6, 0],
      teacher: 3,
      time: ["08:00", "10:00"],
      fee: 110000,
    },
    {
      name: "Văn 10 - Chiều CN",
      days: [0],
      teacher: 4,
      time: ["14:00", "17:00"],
      fee: 80000,
    },
  ];

  for (const c of classData) {
    const newClass = await prisma.class.create({
      data: {
        className: c.name,
        scheduleDays: c.days,
        startTime: c.time[0],
        endTime: c.time[1],
        feePerDay: c.fee,
        maxStudents: 30,
        teacherId: teachers[c.teacher].id,
        status: "active",
      },
    });
    classes.push(newClass);
    console.log(`✅ Created class: ${c.name}`);
  }

  // Create 15 parents
  const parents = [];
  for (let i = 0; i < 15; i++) {
    const gender = i % 2 === 0 ? ("male" as const) : ("female" as const);
    const parent = await prisma.parent.create({
      data: {
        fullName: generateVietnameseName(gender),
        phone: generatePhone(),
        email: `phuhuynh${i + 1}@gmail.com`,
        address: `${Math.floor(Math.random() * 200) + 1} Đường ${randomPick([
          "Lê Lợi",
          "Nguyễn Huệ",
          "Trần Hưng Đạo",
          "Hai Bà Trưng",
          "Điện Biên Phủ",
        ])}, TP.HCM`,
        relationship: gender === "male" ? "father" : "mother",
      },
    });
    parents.push(parent);
  }
  console.log(`✅ Created ${parents.length} parents`);

  // Create 25 students
  const students = [];
  for (let i = 0; i < 25; i++) {
    const gender =
      Math.random() > 0.5 ? ("male" as const) : ("female" as const);
    const birthYear = 2008 + Math.floor(Math.random() * 6); // 2008-2013
    const student = await prisma.student.create({
      data: {
        fullName: generateVietnameseName(gender),
        dateOfBirth: randomDate(
          new Date(birthYear, 0, 1),
          new Date(birthYear, 11, 31)
        ),
        gender,
        parentId: parents[i % parents.length].id,
        phone: i > 10 ? generatePhone() : null, // Older students have phones
        enrollmentDate: randomDate(
          new Date(2024, 6, 1),
          new Date(2025, 11, 31)
        ),
        status: Math.random() > 0.1 ? "active" : "inactive",
      },
    });
    students.push(student);

    // Enroll in 1-3 random classes
    const numClasses = 1 + Math.floor(Math.random() * 3);
    const shuffledClasses = [...classes]
      .sort(() => Math.random() - 0.5)
      .slice(0, numClasses);
    for (const c of shuffledClasses) {
      await prisma.studentClass.create({
        data: {
          studentId: student.id,
          classId: c.id,
          enrollmentDate: new Date(),
          status: "active",
        },
      });
    }
  }
  console.log(`✅ Created ${students.length} students with class enrollments`);

  // Create some attendance records (last 30 days)
  const today = new Date();
  let attendanceCount = 0;
  for (const classItem of classes) {
    for (let dayOffset = 0; dayOffset < 30; dayOffset++) {
      const date = new Date(today);
      date.setDate(date.getDate() - dayOffset);

      // Only create attendance for scheduled days
      const dayOfWeek = date.getDay();
      if (!classItem.scheduleDays.includes(dayOfWeek)) continue;

      // Get students in this class
      const enrollments = await prisma.studentClass.findMany({
        where: { classId: classItem.id, status: "active" },
      });

      for (const enrollment of enrollments) {
        const rand = Math.random();
        const status =
          rand > 0.15
            ? "present"
            : rand > 0.1
            ? "absent_with_fee"
            : "absent_no_fee";

        await prisma.attendance.create({
          data: {
            studentId: enrollment.studentId,
            classId: classItem.id,
            attendanceDate: date,
            status,
            createdById: admin.id,
          },
        });
        attendanceCount++;
      }
    }
  }
  console.log(`✅ Created ${attendanceCount} attendance records`);

  // Create templates FIRST (needed for receipts/payments)
  const receiptTemplate = await prisma.template.create({
    data: {
      templateName: "Phiếu Thu Mặc Định",
      type: "receipt",
      paperSize: "a5",
      orientation: "portrait",
      jsonConfig: { elements: [], version: "1.0" },
      isDefault: true,
      createdById: admin.id,
    },
  });
  const paymentTemplate = await prisma.template.create({
    data: {
      templateName: "Phiếu Chi Mặc Định",
      type: "payment",
      paperSize: "a5",
      orientation: "portrait",
      jsonConfig: { elements: [], version: "1.0" },
      isDefault: true,
      createdById: admin.id,
    },
  });
  console.log("✅ Created default templates");

  // Create some receipts
  await prisma.receipt.create({
    data: {
      studentId: students[0].id,
      month: "2026-01",
      daysCount: 12,
      feePerDay: 100000,
      amount: 1200000,
      paymentMethod: "cash",
      templateId: receiptTemplate.id,
      notes: "Học phí tháng 1/2026 - Toán 10",
      createdById: admin.id,
    },
  });
  await prisma.receipt.create({
    data: {
      studentId: students[1].id,
      month: "2026-01",
      daysCount: 20,
      feePerDay: 125000,
      amount: 2500000,
      paymentMethod: "transfer",
      templateId: receiptTemplate.id,
      notes: "Học phí tháng 1/2026 - Lý 10 + Anh Văn",
      createdById: admin.id,
    },
  });
  console.log("✅ Created 2 receipt records");

  // Create some payments
  await prisma.payment.create({
    data: {
      category: "salary",
      recipientName: teachers[0].fullName,
      amount: 5000000,
      templateId: paymentTemplate.id,
      notes: "Lương tháng 12/2025",
      createdById: admin.id,
    },
  });
  await prisma.payment.create({
    data: {
      category: "utility",
      recipientName: "Điện lực TP.HCM",
      amount: 1200000,
      templateId: paymentTemplate.id,
      notes: "Tiền điện tháng 12/2025",
      createdById: admin.id,
    },
  });
  console.log("✅ Created 2 payment records");

  // Create center settings
  await prisma.centerSettings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      centerName: "Trung Tâm Dạy Thêm EduManager",
      centerAddress: "123 Đường Nguyễn Văn Cừ, Quận 5, TP.HCM",
      centerPhone: "028 1234 5678",
      centerEmail: "contact@edumanager.vn",
    },
  });
  console.log("✅ Created center settings");

  console.log("\n🎉 Seeding completed!");
  console.log("\n📊 Summary:");
  console.log(`   - Users: 2 (admin, nhanvien)`);
  console.log(`   - Teachers: ${teachers.length}`);
  console.log(`   - Parents: ${parents.length}`);
  console.log(`   - Students: ${students.length}`);
  console.log(`   - Classes: ${classes.length}`);
  console.log(`   - Attendance records: ${attendanceCount}`);
  console.log("\n📝 Login credentials:");
  console.log("   Admin:       admin / admin123");
  console.log("   Receptionist: nhanvien / staff123");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
