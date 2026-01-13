import express from 'express';
import { db } from '../db/init.js';

const router = express.Router();

/**
 * 获取所有书库
 * GET /api/libraries
 */
router.get('/', (req, res) => {
    try {
        const libraries = db.prepare(`
      SELECT 
        l.*,
        COUNT(DISTINCT m.id) as manga_count
      FROM libraries l
      LEFT JOIN manga m ON l.id = m.library_id
      GROUP BY l.id
      ORDER BY l.created_at DESC
    `).all();

        res.json(libraries);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * 获取单个书库详情
 * GET /api/libraries/:id
 */
router.get('/:id', (req, res) => {
    try {
        const { id } = req.params;

        const library = db.prepare(`
      SELECT 
        l.*,
        COUNT(DISTINCT m.id) as manga_count,
        SUM(m.total_chapters) as total_chapters,
        SUM(m.total_pages) as total_pages
      FROM libraries l
      LEFT JOIN manga m ON l.id = m.library_id
      WHERE l.id = ?
      GROUP BY l.id
    `).get(id);

        if (!library) {
            return res.status(404).json({ error: '书库不存在' });
        }

        res.json(library);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * 创建新书库
 * POST /api/libraries
 * Body: { name, path, description }
 */
router.post('/', (req, res) => {
    try {
        const { name, path, description = '' } = req.body;

        if (!name || !path) {
            return res.status(400).json({ error: '书库名称和路径不能为空' });
        }

        const result = db.prepare(`
      INSERT INTO libraries (name, path, description)
      VALUES (?, ?, ?)
    `).run(name, path, description);

        const library = db.prepare('SELECT * FROM libraries WHERE id = ?').get(result.lastInsertRowid);

        res.status(201).json(library);
    } catch (error) {
        if (error.message.includes('UNIQUE constraint failed')) {
            return res.status(400).json({ error: '该路径已存在' });
        }
        res.status(500).json({ error: error.message });
    }
});

/**
 * 更新书库信息
 * PUT /api/libraries/:id
 * Body: { name, path, description, is_active }
 */
router.put('/:id', (req, res) => {
    try {
        const { id } = req.params;
        const { name, path, description, is_active } = req.body;

        const updates = [];
        const params = [];

        if (name !== undefined) {
            updates.push('name = ?');
            params.push(name);
        }
        if (path !== undefined) {
            updates.push('path = ?');
            params.push(path);
        }
        if (description !== undefined) {
            updates.push('description = ?');
            params.push(description);
        }
        if (is_active !== undefined) {
            updates.push('is_active = ?');
            params.push(is_active ? 1 : 0);
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: '没有要更新的字段' });
        }

        updates.push('updated_at = CURRENT_TIMESTAMP');
        params.push(id);

        db.prepare(`
      UPDATE libraries
      SET ${updates.join(', ')}
      WHERE id = ?
    `).run(...params);

        const library = db.prepare('SELECT * FROM libraries WHERE id = ?').get(id);
        res.json(library);
    } catch (error) {
        if (error.message.includes('UNIQUE constraint failed')) {
            return res.status(400).json({ error: '该路径已存在' });
        }
        res.status(500).json({ error: error.message });
    }
});

/**
 * 删除书库
 * DELETE /api/libraries/:id
 */
router.delete('/:id', (req, res) => {
    try {
        const { id } = req.params;

        // 检查是否有关联的漫画
        const mangaCount = db.prepare('SELECT COUNT(*) as count FROM manga WHERE library_id = ?').get(id);

        if (mangaCount.count > 0) {
            return res.status(400).json({
                error: '该书库下还有漫画，请先删除或移动漫画',
                manga_count: mangaCount.count
            });
        }

        db.prepare('DELETE FROM libraries WHERE id = ?').run(id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * 获取书库的统计信息
 * GET /api/libraries/:id/stats
 */
router.get('/:id/stats', (req, res) => {
    try {
        const { id } = req.params;

        const stats = db.prepare(`
      SELECT 
        COUNT(DISTINCT m.id) as total_manga,
        COUNT(DISTINCT c.id) as total_chapters,
        SUM(m.total_pages) as total_pages,
        COUNT(DISTINCT CASE WHEN m.is_favorite = 1 THEN m.id END) as favorite_count,
        COUNT(DISTINCT t.id) as total_tags
      FROM libraries l
      LEFT JOIN manga m ON l.id = m.library_id
      LEFT JOIN chapters c ON m.id = c.manga_id
      LEFT JOIN manga_tags mt ON m.id = mt.manga_id
      LEFT JOIN tags t ON mt.tag_id = t.id
      WHERE l.id = ?
    `).get(id);

        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
