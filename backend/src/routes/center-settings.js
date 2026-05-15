import { Router } from 'express';
import { execute, queryOne } from '../database/index.js';
import { verifyToken, adminOnly } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

router.use(verifyToken);

function ensureSettings() {
  execute("INSERT OR IGNORE INTO center_settings (id, center_name) VALUES (1, 'Trung Tâm Dạy Thêm')");
  return queryOne('SELECT * FROM center_settings WHERE id = 1');
}

router.get('/', (req, res, next) => {
  try {
    res.json({ success: true, data: ensureSettings() });
  } catch (error) {
    next(error);
  }
});

router.put('/', adminOnly, (req, res, next) => {
  try {
    const current = ensureSettings();
    const body = req.body || {};
    const centerName = body.center_name ?? current.center_name;
    if (!String(centerName).trim()) {
      throw new AppError('center_name is required', 400, 'VALIDATION_ERROR');
    }

    execute(
      `
        UPDATE center_settings SET
          center_name = ?,
          center_address = ?,
          center_phone = ?,
          center_email = ?,
          center_logo = ?,
          updated_at = datetime('now', 'localtime')
        WHERE id = 1
      `,
      [
        String(centerName).trim(),
        body.center_address === undefined ? current.center_address : body.center_address,
        body.center_phone === undefined ? current.center_phone : body.center_phone,
        body.center_email === undefined ? current.center_email : body.center_email,
        body.center_logo === undefined ? current.center_logo : body.center_logo,
      ]
    );

    execute(
      'INSERT INTO activity_logs (user_id, action, entity_type, entity_id) VALUES (?, ?, ?, ?)',
      [req.userId, 'UPDATE_CENTER_SETTINGS', 'center_settings', '1']
    );

    res.json({ success: true, data: ensureSettings() });
  } catch (error) {
    next(error);
  }
});

export default router;
