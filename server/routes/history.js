import express from 'express';
import { db } from '../db/init.js';
import path from 'path';

const router = express.Router();

/**
 * 获取继续阅读列表
 * GET /api/history/continue-reading
 */
router.get('/continue-reading', (req, res) => {
    try {
        const { limit = 10 } = req.query;

        // 获取最近阅读的漫画，按最后阅读时间排序
        const continueReading = db.prepare(`
            SELECT 
                m.*,
                h.chapter_id,
                h.page_number,
                h.progress,
                h.read_at,
                c.title as chapter_title,
                c.chapter_number
            FROM manga m
            INNER JOIN (
                SELECT manga_id, chapter_id, page_number, progress, read_at,
                       ROW_NUMBER() OVER (PARTITION BY manga_id ORDER BY read_at DESC) as rn
                FROM reading_history
            ) h ON m.id = h.manga_id AND h.rn = 1
            LEFT JOIN chapters c ON h.chapter_id = c.id
            WHERE m.last_read_at IS NOT NULL
            ORDER BY m.last_read_at DESC
            LIMIT ?
        `).all(parseInt(limit)).map(m => ({
            ...m,
            cover_path: m.cover_path ? path.relative(process.cwd(), m.cover_path) : null
        }));

        res.json(continueReading);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * 获取阅读历史记录
 * GET /api/history
 */
router.get('/', (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;

        const history = db.prepare(`
            SELECT 
                h.*,
                m.title as manga_title,
                m.cover_path,
                c.title as chapter_title,
                c.chapter_number
            FROM reading_history h
            INNER JOIN manga m ON h.manga_id = m.id
            LEFT JOIN chapters c ON h.chapter_id = c.id
            ORDER BY h.read_at DESC
            LIMIT ? OFFSET ?
        `).all(parseInt(limit), offset).map(h => ({
            ...h,
            cover_path: h.cover_path ? path.relative(process.cwd(), h.cover_path) : null
        }));

        const { total } = db.prepare('SELECT COUNT(*) as total FROM reading_history').get();

        res.json({
            data: history,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * 获取收藏夹列表
 * GET /api/history/favorites
 */
router.get('/favorites', (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;

        const favorites = db.prepare(`
            SELECT * FROM manga 
            WHERE is_favorite = 1 
            ORDER BY updated_at DESC
            LIMIT ? OFFSET ?
        `).all(parseInt(limit), offset).map(m => ({
            ...m,
            cover_path: m.cover_path ? path.relative(process.cwd(), m.cover_path) : null
        }));

        const { total } = db.prepare('SELECT COUNT(*) as total FROM manga WHERE is_favorite = 1').get();

        res.json({
            data: favorites,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * 清除阅读历史
 * DELETE /api/history/clear
 */
router.delete('/clear', (req, res) => {
    try {
        const { olderThan } = req.query; // 可选：只清除多少天前的记录

        let query = 'DELETE FROM reading_history';
        const params = [];

        if (olderThan) {
            query += ' WHERE read_at < datetime("now", ?)';
            params.push(`-${parseInt(olderThan)} days`);
        }

        const result = db.prepare(query).run(...params);

        res.json({
            success: true,
            deleted: result.changes
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * 删除单条阅读历史
 * DELETE /api/history/:id
 */
router.delete('/:id', (req, res) => {
    try {
        const { id } = req.params;

        const result = db.prepare('DELETE FROM reading_history WHERE id = ?').run(id);

        if (result.changes === 0) {
            return res.status(404).json({ error: '历史记录不存在' });
        }

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
