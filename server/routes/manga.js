import express from 'express';
import { db } from '../db/init.js';
import fs from 'fs';
import path from 'path';

const router = express.Router();

/**
 * 获取所有漫画列表
 * GET /api/manga
 * Query: page, limit, search, tag, favorite
 */
router.get('/', (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            search = '',
            tag = '',
            favorite = ''
        } = req.query;

        const offset = (page - 1) * limit;
        let query = 'SELECT * FROM manga WHERE 1=1';
        const params = [];

        // 搜索过滤
        if (search) {
            query += ' AND title LIKE ?';
            params.push(`%${search}%`);
        }

        // 收藏过滤
        if (favorite === 'true') {
            query += ' AND is_favorite = 1';
        }

        // 标签过滤
        if (tag) {
            query += ` AND id IN (
        SELECT manga_id FROM manga_tags 
        WHERE tag_id = (SELECT id FROM tags WHERE name = ?)
      )`;
            params.push(tag);
        }

        // 排序和分页
        query += ' ORDER BY updated_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), offset);

        const stmt = db.prepare(query);
        const manga = stmt.all(...params);

        // 获取总数
        let countQuery = 'SELECT COUNT(*) as total FROM manga WHERE 1=1';
        const countParams = [];

        if (search) {
            countQuery += ' AND title LIKE ?';
            countParams.push(`%${search}%`);
        }
        if (favorite === 'true') {
            countQuery += ' AND is_favorite = 1';
        }
        if (tag) {
            countQuery += ` AND id IN (
        SELECT manga_id FROM manga_tags 
        WHERE tag_id = (SELECT id FROM tags WHERE name = ?)
      )`;
            countParams.push(tag);
        }

        const countStmt = db.prepare(countQuery);
        const { total } = countStmt.get(...countParams);

        res.json({
            data: manga,
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
 * 获取单个漫画详情
 * GET /api/manga/:id
 */
router.get('/:id', (req, res) => {
    try {
        const { id } = req.params;

        const manga = db.prepare('SELECT * FROM manga WHERE id = ?').get(id);
        if (!manga) {
            return res.status(404).json({ error: '漫画不存在' });
        }

        // 获取章节列表
        const chapters = db.prepare(`
      SELECT * FROM chapters 
      WHERE manga_id = ? 
      ORDER BY chapter_number ASC
    `).all(id);

        // 获取标签
        const tags = db.prepare(`
      SELECT t.* FROM tags t
      INNER JOIN manga_tags mt ON t.id = mt.tag_id
      WHERE mt.manga_id = ?
    `).all(id);

        // 获取阅读历史
        const history = db.prepare(`
      SELECT * FROM reading_history 
      WHERE manga_id = ? 
      ORDER BY read_at DESC 
      LIMIT 1
    `).get(id);

        res.json({
            ...manga,
            chapters,
            tags,
            lastRead: history || null
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * 获取章节的图片列表
 * GET /api/manga/:id/chapters/:chapterId/pages
 */
router.get('/:id/chapters/:chapterId/pages', (req, res) => {
    try {
        const { id, chapterId } = req.params;

        const chapter = db.prepare(`
      SELECT * FROM chapters 
      WHERE id = ? AND manga_id = ?
    `).get(chapterId, id);

        if (!chapter) {
            return res.status(404).json({ error: '章节不存在' });
        }

        // 读取章节目录中的图片文件
        const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
        const files = fs.readdirSync(chapter.path);
        const images = files
            .filter(file => {
                const ext = path.extname(file).toLowerCase();
                return IMAGE_EXTENSIONS.includes(ext);
            })
            .sort()
            .map((file, index) => ({
                page: index + 1,
                filename: file,
                path: path.join(chapter.path, file)
            }));

        res.json({
            chapter,
            pages: images,
            totalPages: images.length
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * 切换收藏状态
 * POST /api/manga/:id/favorite
 */
router.post('/:id/favorite', (req, res) => {
    try {
        const { id } = req.params;

        const manga = db.prepare('SELECT is_favorite FROM manga WHERE id = ?').get(id);
        if (!manga) {
            return res.status(404).json({ error: '漫画不存在' });
        }

        const newStatus = manga.is_favorite ? 0 : 1;
        db.prepare('UPDATE manga SET is_favorite = ? WHERE id = ?').run(newStatus, id);

        res.json({ success: true, is_favorite: newStatus });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * 更新阅读进度
 * POST /api/manga/:id/progress
 */
router.post('/:id/progress', (req, res) => {
    try {
        const { id } = req.params;
        const { chapterId, pageNumber, progress } = req.body;

        db.prepare(`
      INSERT INTO reading_history (manga_id, chapter_id, page_number, progress)
      VALUES (?, ?, ?, ?)
    `).run(id, chapterId, pageNumber, progress);

        db.prepare(`
      UPDATE manga SET last_read_at = CURRENT_TIMESTAMP WHERE id = ?
    `).run(id);

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * 删除漫画
 * DELETE /api/manga/:id
 */
router.delete('/:id', (req, res) => {
    try {
        const { id } = req.params;

        const result = db.prepare('DELETE FROM manga WHERE id = ?').run(id);

        if (result.changes === 0) {
            return res.status(404).json({ error: '漫画不存在' });
        }

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
