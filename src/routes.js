// ============================================
// Factor 13: API First — REST endpoints
// POST /items       → report a lost or found item
// GET  /items       → list all items (user's own)
// GET  /items/:id   → get single item
// ============================================

const express = require('express');
const multer = require('multer');
const db = require('./db');
const { uploadPhoto } = require('./storage');
const authMiddleware = require('./authMiddleware');
const logger = require('./logger');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// -----------------------------------------
// POST /items — Report a lost or found item
// -----------------------------------------
router.post('/', authMiddleware, upload.single('photo'), async (req, res) => {
  try {
    const { type, title, description, category, location, date } = req.body;
    const userId = req.user.userId;

    // Validate
    if (!type || !title || !category || !location) {
      return res.status(400).json({ error: 'type, title, category, and location are required' });
    }

    if (!['lost', 'found'].includes(type)) {
      return res.status(400).json({ error: 'type must be "lost" or "found"' });
    }

    // Upload photo if provided (Factor 4: Object Storage)
    let photoUrl = null;
    if (req.file) {
      photoUrl = await uploadPhoto(req.file);
    }

    // Save to database
    const result = await db.query(
      `INSERT INTO items (type, title, description, category, location, date, photo_url, status, user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'unmatched', $8)
       RETURNING *`,
      [type, title, description || null, category, location, date || new Date(), photoUrl, userId]
    );

    const item = result.rows[0];

    logger.info({ itemId: item.id, type, category, userId }, 'Item created');

    // NOTE: Event publishing (lost_item_created / found_item_created)
    // will be added by the teammate handling the Event Bridge connection

    res.status(201).json({
      message: 'Item reported successfully',
      item
    });
  } catch (err) {
    logger.error({ err }, 'Create item failed');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// -----------------------------------------
// GET /items — List user's own items
// -----------------------------------------
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { type, status } = req.query;

    let query = 'SELECT * FROM items WHERE user_id = $1';
    const params = [userId];
    let paramIndex = 2;

    if (type) {
      query += ` AND type = $${paramIndex}`;
      params.push(type);
      paramIndex++;
    }

    if (status) {
      query += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    query += ' ORDER BY created_at DESC';

    const result = await db.query(query, params);

    res.status(200).json({ items: result.rows });
  } catch (err) {
    logger.error({ err }, 'List items failed');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// -----------------------------------------
// GET /items/:id — Get single item
// -----------------------------------------
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query('SELECT * FROM items WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    res.status(200).json({ item: result.rows[0] });
  } catch (err) {
    logger.error({ err }, 'Get item failed');
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
