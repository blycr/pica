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
            data: manga.map(m => ({
                ...m,
                cover_path: m.cover_path ? path.relative(process.cwd(), m.cover_path) : null
            })),
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
    `).all(id).map(c => ({
            ...c,
            path: path.relative(process.cwd(), c.path)
        }));

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

        // 统一封面路径为相对路径
        if (manga.cover_path) {
            manga.cover_path = path.relative(process.cwd(), manga.cover_path);
        }

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
router.get('/:id/chapters/:chapterId/pages', async (req, res) => {
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
        const files = await fs.promises.readdir(chapter.path);
        const images = files
            .filter(file => {
                const ext = path.extname(file).toLowerCase();
                return IMAGE_EXTENSIONS.includes(ext);
            })
            .sort()
            .map((file, index) => ({
                page: index + 1,
                filename: file,
                path: path.relative(process.cwd(), path.join(chapter.path, file))
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

        const manga = db.prepare('SELECT id, title, is_favorite FROM manga WHERE id = ?').get(id);
        if (!manga) {
            return res.status(404).json({ error: '漫画不存在' });
        }

        const newStatus = manga.is_favorite ? 0 : 1;

        // 使用事务确保数据一致性
        const transaction = db.transaction(() => {
            db.prepare('UPDATE manga SET is_favorite = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
                .run(newStatus, id);
        });

        transaction();

        res.json({
            success: true,
            is_favorite: newStatus,
            message: newStatus ? '已添加到收藏' : '已取消收藏',
            manga: {
                id: manga.id,
                title: manga.title
            }
        });
    } catch (error) {
        console.error('切换收藏状态失败:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * 更新阅读进度
 * POST /api/manga/:id/progress
 * 使用 UPSERT 逻辑，确保每个漫画的每个章节只保留最新的阅读进度
 */
router.post('/:id/progress', (req, res) => {
    try {
        const { id } = req.params;
        const { chapterId, pageNumber, progress } = req.body;

        // 验证输入参数
        if (!chapterId || pageNumber === undefined || progress === undefined) {
            return res.status(400).json({
                error: '缺少必要参数',
                required: ['chapterId', 'pageNumber', 'progress']
            });
        }

        // 验证漫画和章节是否存在
        const manga = db.prepare('SELECT id FROM manga WHERE id = ?').get(id);
        if (!manga) {
            return res.status(404).json({ error: '漫画不存在' });
        }

        const chapter = db.prepare('SELECT id FROM chapters WHERE id = ? AND manga_id = ?').get(chapterId, id);
        if (!chapter) {
            return res.status(404).json({ error: '章节不存在或不属于该漫画' });
        }

        // 使用事务确保数据一致性
        const transaction = db.transaction(() => {
            // 删除该漫画该章节的旧记录，只保留最新的
            db.prepare(`
                DELETE FROM reading_history 
                WHERE manga_id = ? AND chapter_id = ?
            `).run(id, chapterId);

            // 插入新的阅读进度
            db.prepare(`
                INSERT INTO reading_history (manga_id, chapter_id, page_number, progress, read_at)
                VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
            `).run(id, chapterId, pageNumber, progress);

            // 更新漫画的最后阅读时间
            db.prepare(`
                UPDATE manga SET last_read_at = CURRENT_TIMESTAMP WHERE id = ?
            `).run(id);
        });

        transaction();

        res.json({
            success: true,
            message: '阅读进度已保存',
            data: {
                manga_id: parseInt(id),
                chapter_id: parseInt(chapterId),
                page_number: parseInt(pageNumber),
                progress: parseFloat(progress)
            }
        });
    } catch (error) {
        console.error('保存阅读进度失败:', error);
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
