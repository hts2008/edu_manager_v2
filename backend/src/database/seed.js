import { getDb } from './index.js';
import { migrate } from './migrate.js';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

/**
 * Seed database with sample data
 */
export async function seed() {
  const db = getDb();
  
  console.log('🌱 Seeding database...');
  
  // Run migrations first
  migrate();
  
  // Check if already seeded
  const existingUsers = db.prepare('SELECT COUNT(*) as count FROM users').get();
  if (existingUsers.count > 0) {
    console.log('⚠️  Database already has data. Skipping seed.');
    return;
  }
  
  // ========================================
  // CREATE DEFAULT ADMIN USER
  // ========================================
  const adminId = 'USR' + new Date().toISOString().slice(0,10).replace(/-/g,'') + '001';
  const adminPassword = await bcrypt.hash('admin123', 10);
  
  db.prepare(`
    INSERT INTO users (id, username, password_hash, role, full_name, email)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(adminId, 'admin', adminPassword, 'admin', 'Administrator', 'admin@edumanager.local');
  
  console.log('✅ Created admin user (admin / admin123)');
  
  // ========================================
  // CREATE SAMPLE PARENTS
  // ========================================
  const parents = [
    { name: 'Nguyễn Văn Minh', phone: '0901234567', rel: 'father' },
    { name: 'Trần Thị Hương', phone: '0912345678', rel: 'mother' },
    { name: 'Lê Văn Đức', phone: '0923456789', rel: 'father' },
    { name: 'Phạm Thị Mai', phone: '0934567890', rel: 'mother' },
    { name: 'Hoàng Văn Nam', phone: '0945678901', rel: 'guardian' },
  ];
  
  const parentIds = [];
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  
  parents.forEach((p, i) => {
    const id = `PAR${today}${String(i + 1).padStart(3, '0')}`;
    parentIds.push(id);
    db.prepare(`
      INSERT INTO parents (id, full_name, phone, relationship)
      VALUES (?, ?, ?, ?)
    `).run(id, p.name, p.phone, p.rel);
  });
  
  console.log(`✅ Created ${parents.length} sample parents`);
  
  // ========================================
  // CREATE SAMPLE TEACHERS
  // ========================================
  const teachers = [
    { name: 'Nguyễn Thị Lan', phone: '0981111111', salary: 200000 },
    { name: 'Trần Văn Hùng', phone: '0982222222', salary: 250000 },
    { name: 'Lê Thị Phương', phone: '0983333333', salary: 180000 },
  ];
  
  const teacherIds = [];
  
  teachers.forEach((t, i) => {
    const id = `TEA${today}${String(i + 1).padStart(3, '0')}`;
    teacherIds.push(id);
    db.prepare(`
      INSERT INTO teachers (id, full_name, phone, salary_type, salary_amount)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, t.name, t.phone, 'hourly', t.salary);
  });
  
  console.log(`✅ Created ${teachers.length} sample teachers`);
  
  // ========================================
  // CREATE SAMPLE CLASSES
  // ========================================
  const classes = [
    { name: 'Starters A1', days: '[2,4,6]', start: '08:00', end: '09:30', fee: 100000, teacher: 0 },
    { name: 'Movers B1', days: '[3,5,7]', start: '09:30', end: '11:00', fee: 120000, teacher: 1 },
    { name: 'Flyers C1', days: '[2,4,6]', start: '14:00', end: '15:30', fee: 150000, teacher: 2 },
    { name: 'KET Preparation', days: '[3,5]', start: '16:00', end: '18:00', fee: 200000, teacher: 0 },
  ];
  
  const classIds = [];
  
  classes.forEach((c, i) => {
    const id = `CLS${today}${String(i + 1).padStart(3, '0')}`;
    classIds.push(id);
    db.prepare(`
      INSERT INTO classes (id, class_name, schedule_days, start_time, end_time, fee_per_day, teacher_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, c.name, c.days, c.start, c.end, c.fee, teacherIds[c.teacher]);
  });
  
  console.log(`✅ Created ${classes.length} sample classes`);
  
  // ========================================
  // CREATE SAMPLE STUDENTS
  // ========================================
  const students = [
    { name: 'Nguyễn Minh Anh', dob: '2015-03-15', gender: 'female', parent: 0 },
    { name: 'Trần Hương Giang', dob: '2014-07-22', gender: 'female', parent: 1 },
    { name: 'Lê Đức Minh', dob: '2016-01-10', gender: 'male', parent: 2 },
    { name: 'Phạm Mai Linh', dob: '2015-09-05', gender: 'female', parent: 3 },
    { name: 'Hoàng Nam Khánh', dob: '2014-12-20', gender: 'male', parent: 4 },
    { name: 'Nguyễn Minh Tuấn', dob: '2016-05-18', gender: 'male', parent: 0 },
    { name: 'Trần Hương Mai', dob: '2015-11-30', gender: 'female', parent: 1 },
    { name: 'Lê Hoàng Long', dob: '2014-04-25', gender: 'male', parent: 2 },
  ];
  
  const studentIds = [];
  const enrollDate = new Date().toISOString().slice(0, 10);
  
  students.forEach((s, i) => {
    const id = `STU${today}${String(i + 1).padStart(3, '0')}`;
    studentIds.push(id);
    db.prepare(`
      INSERT INTO students (id, full_name, date_of_birth, gender, parent_id, enrollment_date)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, s.name, s.dob, s.gender, parentIds[s.parent], enrollDate);
  });
  
  console.log(`✅ Created ${students.length} sample students`);
  
  // ========================================
  // ENROLL STUDENTS IN CLASSES
  // ========================================
  const enrollments = [
    [0, 0], [0, 1], // Student 0 in class 0 and 1
    [1, 1], [1, 2], // Student 1 in class 1 and 2
    [2, 0],         // Student 2 in class 0
    [3, 2], [3, 3], // Student 3 in class 2 and 3
    [4, 0], [4, 3], // Student 4 in class 0 and 3
    [5, 1],         // Student 5 in class 1
    [6, 2],         // Student 6 in class 2
    [7, 3],         // Student 7 in class 3
  ];
  
  enrollments.forEach(([s, c]) => {
    db.prepare(`
      INSERT INTO student_classes (student_id, class_id, enrollment_date)
      VALUES (?, ?, ?)
    `).run(studentIds[s], classIds[c], enrollDate);
  });
  
  console.log(`✅ Created ${enrollments.length} class enrollments`);
  
  // ========================================
  // CREATE DEFAULT TEMPLATES
  // ========================================
  const receiptTemplate = {
    template_name: 'Phiếu Thu Mặc Định',
    type: 'receipt',
    paper_size: 'a4',
    orientation: 'portrait',
    elements: [
      { id: 'e1', type: 'static_text', x: 297, y: 30, text: 'PHIẾU THU HỌC PHÍ', font: 'Arial', size: 24, bold: true, align: 'center' },
      { id: 'e2', type: 'text_input', x: 50, y: 100, binding: 'receipt_id', label: 'Số phiếu:', font: 'Arial', size: 14 },
      { id: 'e3', type: 'text_input', x: 50, y: 140, binding: 'student_name', label: 'Học viên:', font: 'Arial', size: 14 },
      { id: 'e4', type: 'text_input', x: 50, y: 180, binding: 'class_name', label: 'Lớp:', font: 'Arial', size: 14 },
      { id: 'e5', type: 'text_input', x: 50, y: 220, binding: 'month', label: 'Tháng:', font: 'Arial', size: 14 },
      { id: 'e6', type: 'number', x: 50, y: 260, binding: 'days_count', label: 'Số ngày học:', font: 'Arial', size: 14 },
      { id: 'e7', type: 'number', x: 50, y: 300, binding: 'total_amount', label: 'Tổng tiền:', font: 'Arial', size: 16, bold: true },
      { id: 'e8', type: 'text_input', x: 50, y: 360, binding: 'receipt_date', label: 'Ngày:', font: 'Arial', size: 12 },
    ]
  };
  
  const paymentTemplate = {
    template_name: 'Phiếu Chi Mặc Định',
    type: 'payment',
    paper_size: 'a4',
    orientation: 'portrait',
    elements: [
      { id: 'e1', type: 'static_text', x: 297, y: 30, text: 'PHIẾU CHI', font: 'Arial', size: 24, bold: true, align: 'center' },
      { id: 'e2', type: 'text_input', x: 50, y: 100, binding: 'payment_id', label: 'Số phiếu:', font: 'Arial', size: 14 },
      { id: 'e3', type: 'text_input', x: 50, y: 140, binding: 'recipient_name', label: 'Người nhận:', font: 'Arial', size: 14 },
      { id: 'e4', type: 'text_input', x: 50, y: 180, binding: 'category', label: 'Danh mục:', font: 'Arial', size: 14 },
      { id: 'e5', type: 'number', x: 50, y: 220, binding: 'amount', label: 'Số tiền:', font: 'Arial', size: 16, bold: true },
      { id: 'e6', type: 'text_input', x: 50, y: 280, binding: 'notes', label: 'Ghi chú:', font: 'Arial', size: 12 },
      { id: 'e7', type: 'text_input', x: 50, y: 340, binding: 'payment_date', label: 'Ngày:', font: 'Arial', size: 12 },
    ]
  };
  
  db.prepare(`
    INSERT INTO templates (id, template_name, type, paper_size, orientation, json_config, is_default, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    `TPL${today}001`,
    receiptTemplate.template_name,
    receiptTemplate.type,
    receiptTemplate.paper_size,
    receiptTemplate.orientation,
    JSON.stringify(receiptTemplate),
    1,
    adminId
  );
  
  db.prepare(`
    INSERT INTO templates (id, template_name, type, paper_size, orientation, json_config, is_default, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    `TPL${today}002`,
    paymentTemplate.template_name,
    paymentTemplate.type,
    paymentTemplate.paper_size,
    paymentTemplate.orientation,
    JSON.stringify(paymentTemplate),
    1,
    adminId
  );
  
  console.log('✅ Created default receipt and payment templates');
  
  // ========================================
  // SUMMARY
  // ========================================
  console.log('\n🎉 Database seeding completed!');
  console.log('📊 Summary:');
  console.log('   - 1 admin user (admin / admin123)');
  console.log(`   - ${parents.length} parents`);
  console.log(`   - ${teachers.length} teachers`);
  console.log(`   - ${classes.length} classes`);
  console.log(`   - ${students.length} students`);
  console.log(`   - ${enrollments.length} enrollments`);
  console.log('   - 2 default templates');
}

// Run if called directly
if (process.argv[1].includes('seed.js')) {
  seed().then(() => process.exit(0));
}
