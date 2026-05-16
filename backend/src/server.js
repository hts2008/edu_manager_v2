import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Import routes
import authRoutes from './routes/auth.js';
import bulkActionsRoutes from './routes/bulk-actions.js';
import studentsRoutes from './routes/students.js';
import parentsRoutes from './routes/parents.js';
import teachersRoutes from './routes/teachers.js';
import classesRoutes from './routes/classes.js';
import attendanceRoutes from './routes/attendance.js';
import attendancePeriodsRoutes from './routes/attendance-periods.js';
import receiptsRoutes from './routes/receipts.js';
import paymentsRoutes from './routes/payments.js';
import monthlyFeesRoutes from './routes/monthly-fees.js';
import templatesRoutes from './routes/templates.js';
import reportsRoutes from './routes/reports.js';
import kanbanRoutes from './routes/kanban.js';
import activityLogsRoutes from './routes/activity-logs.js';
import centerSettingsRoutes from './routes/center-settings.js';
import usersRoutes from './routes/users.js';
import importRoutes from './routes/import.js';
import backupsRoutes from './routes/backups.js';
import feeRemindersRoutes from './routes/fee-reminders.js';
import parentPortalRoutes from './routes/parent-portal.js';
import recycleBinRoutes from './routes/recycle-bin.js';

// Import middleware
import { errorHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// ========================================
// MIDDLEWARE
// ========================================

// CORS for frontend
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 'null', 'file://'],
  credentials: true,
}));

// JSON body parser
app.use(express.json({ limit: '10mb' }));

// URL encoded body parser
app.use(express.urlencoded({ extended: true }));

// Request logger
app.use(requestLogger);

// Static files (uploads)
app.use('/uploads', express.static(join(__dirname, '../uploads')));

// ========================================
// API ROUTES
// ========================================

app.use('/api/auth', authRoutes);
app.use('/api/bulk-actions', bulkActionsRoutes);
app.use('/api/students', studentsRoutes);
app.use('/api/parents', parentsRoutes);
app.use('/api/teachers', teachersRoutes);
app.use('/api/classes', classesRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/attendance-periods', attendancePeriodsRoutes);
app.use('/api/receipts', receiptsRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/monthly-fees', monthlyFeesRoutes);
app.use('/api/templates', templatesRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/kanban', kanbanRoutes);
app.use('/api/activity-logs', activityLogsRoutes);
app.use('/api/center-settings', centerSettingsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/import', importRoutes);
app.use('/api/backups', backupsRoutes);
app.use('/api/fee-reminders', feeRemindersRoutes);
app.use('/api/parent-portal', parentPortalRoutes);
app.use('/api/recycle-bin', recycleBinRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    success: false, 
    error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.path} not found` }
  });
});

// Error handler
app.use(errorHandler);

// ========================================
// START SERVER
// ========================================

app.listen(PORT, () => {
  console.log('');
  console.log('╔════════════════════════════════════════════════════╗');
  console.log('║         EDU MANAGER - Backend Server               ║');
  console.log('╠════════════════════════════════════════════════════╣');
  console.log(`║  🚀 Server running on http://localhost:${PORT}        ║`);
  console.log('║  📊 API Endpoints:                                 ║');
  console.log('║     POST /api/auth/login                           ║');
  console.log('║     GET  /api/students                             ║');
  console.log('║     GET  /api/classes                              ║');
  console.log('║     POST /api/attendance                           ║');
  console.log('║     POST /api/receipts                             ║');
  console.log('║     GET  /api/templates                            ║');
  console.log('║     GET  /api/reports/financial                    ║');
  console.log('╚════════════════════════════════════════════════════╝');
  console.log('');
});

export default app;
