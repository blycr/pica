import express from 'express';
import { db } from '../db/init.js';

const router = express.Router();

/**
 * 高级搜索
 * POST /api/search/advanced
 * Body: {
 *   keyword: string,
 *   tags: [string],
 *   favorite: boolean,
 *   sortBy: 'title' | 'updated_at' | 'created_at' | 'last_read_at',
 *   sortOrder: 'asc' | 'desc',
 *   page: number,
 *   limit: number
 * }
 */
router.post('/advanced', (req, res) => {
    try {
        let {
            keyword = '',
            tags = [],
            favorite = null,
            sortBy = 'updated_at',
            sortOrder = 'desc',
            page = 1,
            limit = 20
        } = req.body;

        // 对标签进行去重
        tags = [...new Set(tags)];

        const offset = (page - 1) * limit;
        let query = 'SELECT DISTINCT m.* FROM manga m';
        const params = [];

        // 如果有标签筛选，需要 JOIN manga_tags
        if (tags.length > 0) {
            query += ' INNER JOIN manga_tags mt ON m.id = mt.manga_id';
            query += ' INNER JOIN tags t ON mt.tag_id = t.id';
        }

        query += ' WHERE 1=1';

        // 关键词搜索
        if (keyword) {
            query += ' AND m.title LIKE ?';
            params.push(`%${keyword}%`);
        }

        // 标签筛选
        if (tags.length > 0) {
            const tagPlaceholders = tags.map(() => '?').join(',');
            query += ` AND t.name IN (${tagPlaceholders})`;
            params.push(...tags);
        }

        // 收藏筛选
        if (favorite !== null) {
            query += ' AND m.is_favorite = ?';
            params.push(favorite ? 1 : 0);
        }

        // 排序
        const validSortFields = ['title', 'updated_at', 'created_at', 'last_read_at', 'total_chapters', 'total_pages'];
        const validSortOrders = ['asc', 'desc'];

        const sortField = validSortFields.includes(sortBy) ? sortBy : 'updated_at';
        const order = validSortOrders.includes(sortOrder.toLowerCase()) ? sortOrder.toUpperCase() : 'DESC';

        query += ` ORDER BY m.${sortField} ${order}`;

        // 分页
        query += ' LIMIT ? OFFSET ?';
        params.push(parseInt(limit), offset);

        const stmt = db.prepare(query);
        const manga = stmt.all(...params);

        // 获取总数
        let countQuery = 'SELECT COUNT(DISTINCT m.id) as total FROM manga m';
        const countParams = [];

        if (tags.length > 0) {
            countQuery += ' INNER JOIN manga_tags mt ON m.id = mt.manga_id';
            countQuery += ' INNER JOIN tags t ON mt.tag_id = t.id';
        }

        countQuery += ' WHERE 1=1';

        if (keyword) {
            countQuery += ' AND m.title LIKE ?';
            countParams.push(`%${keyword}%`);
        }

        if (tags.length > 0) {
            const tagPlaceholders = tags.map(() => '?').join(',');
            countQuery += ` AND t.name IN (${tagPlaceholders})`;
            countParams.push(...tags);
        }

        if (favorite !== null) {
            countQuery += ' AND m.is_favorite = ?';
            countParams.push(favorite ? 1 : 0);
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
            },
            filters: {
                keyword,
                tags,
                favorite,
                sortBy: sortField,
                sortOrder: order
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * 快速搜索（自动补全）
 * GET /api/search/autocomplete
 * Query: q (查询关键词), type (manga|tag|all)
 */
router.get('/autocomplete', (req, res) => {
    try {
        const { q = '', type = 'all' } = req.query;

        if (!q || q.length < 2) {
            return res.json({ manga: [], tags: [] });
        }

        const results = { manga: [], tags: [] };

        // 搜索漫画
        if (type === 'manga' || type === 'all') {
            results.manga = db.prepare(`
                SELECT 
                    id, 
                    title, 
                    cover_path,
                    last_read_at,
                    is_favorite,
                    CASE 
                        WHEN title LIKE ? THEN 1
                        WHEN title LIKE ? THEN 2
                        ELSE 3
                    END as priority
                FROM manga
                WHERE title LIKE ?
                ORDER BY priority ASC, is_favorite DESC, last_read_at DESC, title ASC
                LIMIT 8
            `).all(`${q}%`, `% ${q}%`, `%${q}%`);
        }

        // 搜索标签
        if (type === 'tag' || type === 'all') {
            results.tags = db.prepare(`
                SELECT 
                    t.id, 
                    t.name, 
                    t.color,
                    COUNT(mt.manga_id) as manga_count
                FROM tags t
                LEFT JOIN manga_tags mt ON t.id = mt.tag_id
                WHERE t.name LIKE ?
                GROUP BY t.id
                ORDER BY manga_count DESC, t.name ASC
                LIMIT 5
            `).all(`%${q}%`);
        }

        res.json(results);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * 获取搜索建议（热门标签、最近阅读等）
 * GET /api/search/suggestions
 */
router.get('/suggestions', (req, res) => {
    try {
        // 获取热门标签（按漫画数量排序）
        const popularTags = db.prepare(`
            SELECT t.name, t.color, COUNT(mt.manga_id) as count
            FROM tags t
            LEFT JOIN manga_tags mt ON t.id = mt.tag_id
            GROUP BY t.id
            ORDER BY count DESC
            LIMIT 10
        `).all();

        // 获取最近阅读的漫画
        const recentlyRead = db.prepare(`
            SELECT id, title, cover_path, last_read_at
            FROM manga
            WHERE last_read_at IS NOT NULL
            ORDER BY last_read_at DESC
            LIMIT 5
        `).all();

        // 获取最近添加的漫画
        const recentlyAdded = db.prepare(`
            SELECT id, title, cover_path, created_at
            FROM manga
            ORDER BY created_at DESC
            LIMIT 5
        `).all();

        res.json({
            popularTags,
            recentlyRead,
            recentlyAdded
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
