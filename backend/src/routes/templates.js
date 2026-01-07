import { Router } from 'express';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { query, queryOne, execute } from '../database/index.js';
import { verifyToken, adminOnly } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();
router.use(verifyToken);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: join(__dirname, '../../uploads/templates'),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB limit

// GET /api/templates
router.get('/', (req, res, next) => {
  try {
    const { type } = req.query;
    let sql = 'SELECT id, template_name, type, paper_size, orientation, is_default, created_at FROM templates WHERE 1=1';
    const params = [];
    
    if (type) { sql += ' AND type = ?'; params.push(type); }
    sql += ' ORDER BY is_default DESC, created_at DESC';
    
    const templates = query(sql, params);
    res.json({ success: true, data: { templates } });
  } catch (error) { next(error); }
});

// GET /api/templates/:id
router.get('/:id', (req, res, next) => {
  try {
    const template = queryOne('SELECT * FROM templates WHERE id = ?', [req.params.id]);
    if (!template) throw new AppError('Template not found', 404);
    if (template.json_config) {
      try {
        template.json_config = JSON.parse(template.json_config);
      } catch (e) {
        template.json_config = {};
      }
    }
    res.json({ success: true, data: { template } });
  } catch (error) { next(error); }
});

// GET /api/templates/default/:type - Get default template by type
router.get('/default/:type', (req, res, next) => {
  try {
    const template = queryOne('SELECT * FROM templates WHERE type = ? AND is_default = 1', [req.params.type]);
    if (!template) throw new AppError('No default template found', 404);
    template.json_config = JSON.parse(template.json_config);
    res.json({ success: true, data: template });
  } catch (error) { next(error); }
});

// POST /api/templates
router.post('/', adminOnly, (req, res, next) => {
  try {
    const { template_name, type, paper_size, orientation, json_config } = req.body;
    if (!template_name || !type || !paper_size || !orientation || !json_config) throw new AppError('Missing required fields', 400);
    
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const count = queryOne('SELECT COUNT(*) as c FROM templates WHERE id LIKE ?', [`TPL${today}%`]);
    const id = `TPL${today}${String(count.c + 1).padStart(3, '0')}`;
    
    execute(`INSERT INTO templates (id, template_name, type, paper_size, orientation, json_config, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, template_name, type, paper_size, orientation, JSON.stringify(json_config), req.userId]);
    
    res.status(201).json({ success: true, data: queryOne('SELECT * FROM templates WHERE id = ?', [id]) });
  } catch (error) { next(error); }
});

// PUT /api/templates/:id
router.put('/:id', adminOnly, (req, res, next) => {
  try {
    const { id } = req.params;
    const { template_name, paper_size, orientation, json_config } = req.body;
    
    if (!queryOne('SELECT id FROM templates WHERE id = ?', [id])) throw new AppError('Template not found', 404);
    
    execute(`UPDATE templates SET template_name = COALESCE(?, template_name), paper_size = COALESCE(?, paper_size),
      orientation = COALESCE(?, orientation), json_config = COALESCE(?, json_config),
      updated_at = datetime('now', 'localtime') WHERE id = ?`,
      [template_name, paper_size, orientation, json_config ? JSON.stringify(json_config) : null, id]);
    
    res.json({ success: true, data: queryOne('SELECT * FROM templates WHERE id = ?', [id]) });
  } catch (error) { next(error); }
});

// POST /api/templates/:id/set-default
router.post('/:id/set-default', adminOnly, (req, res, next) => {
  try {
    const template = queryOne('SELECT id, type FROM templates WHERE id = ?', [req.params.id]);
    if (!template) throw new AppError('Template not found', 404);
    
    // Unset all defaults for this type
    execute('UPDATE templates SET is_default = 0 WHERE type = ?', [template.type]);
    // Set this one as default
    execute('UPDATE templates SET is_default = 1 WHERE id = ?', [req.params.id]);
    
    res.json({ success: true, message: 'Template set as default' });
  } catch (error) { next(error); }
});

// POST /api/templates/upload-image
router.post('/upload-image', adminOnly, upload.single('image'), (req, res, next) => {
  try {
    if (!req.file) throw new AppError('No file uploaded', 400);
    const url = `/uploads/templates/${req.file.filename}`;
    res.json({ success: true, data: { url, filename: req.file.filename } });
  } catch (error) { next(error); }
});

// DELETE /api/templates/:id
router.delete('/:id', adminOnly, (req, res, next) => {
  try {
    if (!queryOne('SELECT id FROM templates WHERE id = ?', [req.params.id])) throw new AppError('Template not found', 404);
    execute('DELETE FROM templates WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Template deleted' });
  } catch (error) { next(error); }
});

export default router;
