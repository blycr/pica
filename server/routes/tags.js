import express from 'express';
import { db } from '../db/init.js';

const router = express.Router();

/**
 * 获取所有标签
 * GET /api/tags
 */
router.get('/', (req, res) => {
    try {
        const tags = db.prepare(`
      SELECT t.*, COUNT(mt.manga_id) as manga_count
      FROM tags t
      LEFT JOIN manga_tags mt ON t.id = mt.tag_id
      GROUP BY t.id
      ORDER BY t.name ASC
    `).all();

        res.json(tags);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * 创建新标签
 * POST /api/tags
 * Body: { name, color }
 */
router.post('/', (req, res) => {
    try {
        const { name, color = '#6366f1' } = req.body;

        if (!name || name.trim() === '') {
            return res.status(400).json({ error: '标签名称不能为空' });
        }

        const result = db.prepare(`
      INSERT INTO tags (name, color) VALUES (?, ?)
    `).run(name.trim(), color);

        const tag = db.prepare('SELECT * FROM tags WHERE id = ?').get(result.lastInsertRowid);

        res.status(201).json(tag);
    } catch (error) {
        if (error.message.includes('UNIQUE')) {
            return res.status(400).json({ error: '标签已存在' });
        }
        res.status(500).json({ error: error.message });
    }
});

/**
 * 更新标签
 * PUT /api/tags/:id
 * Body: { name, color }
 */
router.put('/:id', (req, res) => {
    try {
        const { id } = req.params;
        const { name, color } = req.body;

        const updates = [];
        const params = [];

        if (name !== undefined) {
            updates.push('name = ?');
            params.push(name.trim());
        }
        if (color !== undefined) {
            updates.push('color = ?');
            params.push(color);
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: '没有要更新的字段' });
        }

        params.push(id);
        const result = db.prepare(`
      UPDATE tags SET ${updates.join(', ')} WHERE id = ?
    `).run(...params);

        if (result.changes === 0) {
            return res.status(404).json({ error: '标签不存在' });
        }

        const tag = db.prepare('SELECT * FROM tags WHERE id = ?').get(id);
        res.json(tag);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * 删除标签
 * DELETE /api/tags/:id
 */
router.delete('/:id', (req, res) => {
    try {
        const { id } = req.params;

        const result = db.prepare('DELETE FROM tags WHERE id = ?').run(id);

        if (result.changes === 0) {
            return res.status(404).json({ error: '标签不存在' });
        }

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * 为漫画添加标签
 * POST /api/tags/:tagId/manga/:mangaId
 */
router.post('/:tagId/manga/:mangaId', (req, res) => {
    try {
        const { tagId, mangaId } = req.params;

        // 检查标签和漫画是否存在
        const tag = db.prepare('SELECT * FROM tags WHERE id = ?').get(tagId);
        const manga = db.prepare('SELECT * FROM manga WHERE id = ?').get(mangaId);

        if (!tag) {
            return res.status(404).json({ error: '标签不存在' });
        }
        if (!manga) {
            return res.status(404).json({ error: '漫画不存在' });
        }

        db.prepare(`
      INSERT OR IGNORE INTO manga_tags (manga_id, tag_id) VALUES (?, ?)
    `).run(mangaId, tagId);

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * 移除漫画的标签
 * DELETE /api/tags/:tagId/manga/:mangaId
 */
router.delete('/:tagId/manga/:mangaId', (req, res) => {
    try {
        const { tagId, mangaId } = req.params;

        const result = db.prepare(`
      DELETE FROM manga_tags WHERE manga_id = ? AND tag_id = ?
    `).run(mangaId, tagId);

        res.json({ success: true, removed: result.changes > 0 });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * 获取漫画的所有标签
 * GET /api/tags/manga/:mangaId
 */
router.get('/manga/:mangaId', (req, res) => {
    try {
        const { mangaId } = req.params;

        const tags = db.prepare(`
      SELECT t.* FROM tags t
      INNER JOIN manga_tags mt ON t.id = mt.tag_id
      WHERE mt.manga_id = ?
      ORDER BY t.name ASC
    `).all(mangaId);

        res.json(tags);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
