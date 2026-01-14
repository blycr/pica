import express from 'express';
import { db } from '../db/init.js';

const router = express.Router();

/**
 * 获取漫画的评分信息
 * GET /api/ratings/manga/:mangaId
 */
router.get('/manga/:mangaId', (req, res) => {
    try {
        const { mangaId } = req.params;

        // 获取漫画的平均评分和评分数量
        const manga = db.prepare(`
            SELECT rating, rating_count 
            FROM manga 
            WHERE id = ?
        `).get(mangaId);

        if (!manga) {
            return res.status(404).json({ error: '漫画不存在' });
        }

        // 获取所有评分记录
        const ratings = db.prepare(`
            SELECT id, rating, comment, created_at, updated_at
            FROM ratings
            WHERE manga_id = ?
            ORDER BY created_at DESC
        `).all(mangaId);

        res.json({
            manga_id: parseInt(mangaId),
            average_rating: manga.rating || 0,
            rating_count: manga.rating_count || 0,
            ratings: ratings
        });
    } catch (error) {
        console.error('获取评分信息失败:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * 添加或更新评分
 * POST /api/ratings/manga/:mangaId
 */
router.post('/manga/:mangaId', (req, res) => {
    try {
        const { mangaId } = req.params;
        const { rating, comment } = req.body;

        // 验证输入
        if (rating === undefined || rating === null) {
            return res.status(400).json({ error: '评分不能为空' });
        }

        const ratingValue = parseFloat(rating);
        if (isNaN(ratingValue) || ratingValue < 0 || ratingValue > 10) {
            return res.status(400).json({ error: '评分必须在 0-10 之间' });
        }

        // 验证漫画是否存在
        const manga = db.prepare('SELECT id FROM manga WHERE id = ?').get(mangaId);
        if (!manga) {
            return res.status(404).json({ error: '漫画不存在' });
        }

        // 使用事务确保数据一致性
        const transaction = db.transaction(() => {
            // 插入新评分
            const result = db.prepare(`
                INSERT INTO ratings (manga_id, rating, comment)
                VALUES (?, ?, ?)
            `).run(mangaId, ratingValue, comment || null);

            // 重新计算平均评分
            const stats = db.prepare(`
                SELECT 
                    AVG(rating) as avg_rating,
                    COUNT(*) as count
                FROM ratings
                WHERE manga_id = ?
            `).get(mangaId);

            // 更新漫画表中的评分信息
            db.prepare(`
                UPDATE manga 
                SET rating = ?, rating_count = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `).run(stats.avg_rating, stats.count, mangaId);

            return { id: result.lastInsertRowid, stats };
        });

        const { id, stats } = transaction();

        res.json({
            success: true,
            message: '评分已添加',
            rating: {
                id: id,
                manga_id: parseInt(mangaId),
                rating: ratingValue,
                comment: comment || null
            },
            manga_stats: {
                average_rating: stats.avg_rating,
                rating_count: stats.count
            }
        });
    } catch (error) {
        console.error('添加评分失败:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * 更新评分
 * PUT /api/ratings/:ratingId
 */
router.put('/:ratingId', (req, res) => {
    try {
        const { ratingId } = req.params;
        const { rating, comment } = req.body;

        // 验证评分是否存在
        const existingRating = db.prepare('SELECT manga_id FROM ratings WHERE id = ?').get(ratingId);
        if (!existingRating) {
            return res.status(404).json({ error: '评分记录不存在' });
        }

        const mangaId = existingRating.manga_id;

        // 验证输入
        if (rating !== undefined && rating !== null) {
            const ratingValue = parseFloat(rating);
            if (isNaN(ratingValue) || ratingValue < 0 || ratingValue > 10) {
                return res.status(400).json({ error: '评分必须在 0-10 之间' });
            }
        }

        // 使用事务更新
        const transaction = db.transaction(() => {
            // 更新评分记录
            const updates = [];
            const params = [];

            if (rating !== undefined && rating !== null) {
                updates.push('rating = ?');
                params.push(parseFloat(rating));
            }
            if (comment !== undefined) {
                updates.push('comment = ?');
                params.push(comment);
            }
            updates.push('updated_at = CURRENT_TIMESTAMP');

            if (updates.length > 1) { // 至少有一个字段要更新（除了 updated_at）
                params.push(ratingId);
                db.prepare(`
                    UPDATE ratings 
                    SET ${updates.join(', ')}
                    WHERE id = ?
                `).run(...params);
            }

            // 重新计算平均评分
            const stats = db.prepare(`
                SELECT 
                    AVG(rating) as avg_rating,
                    COUNT(*) as count
                FROM ratings
                WHERE manga_id = ?
            `).get(mangaId);

            // 更新漫画表中的评分信息
            db.prepare(`
                UPDATE manga 
                SET rating = ?, rating_count = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `).run(stats.avg_rating, stats.count, mangaId);

            return stats;
        });

        const stats = transaction();

        res.json({
            success: true,
            message: '评分已更新',
            manga_stats: {
                average_rating: stats.avg_rating,
                rating_count: stats.count
            }
        });
    } catch (error) {
        console.error('更新评分失败:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * 删除评分
 * DELETE /api/ratings/:ratingId
 */
router.delete('/:ratingId', (req, res) => {
    try {
        const { ratingId } = req.params;

        // 验证评分是否存在
        const existingRating = db.prepare('SELECT manga_id FROM ratings WHERE id = ?').get(ratingId);
        if (!existingRating) {
            return res.status(404).json({ error: '评分记录不存在' });
        }

        const mangaId = existingRating.manga_id;

        // 使用事务删除
        const transaction = db.transaction(() => {
            // 删除评分记录
            db.prepare('DELETE FROM ratings WHERE id = ?').run(ratingId);

            // 重新计算平均评分
            const stats = db.prepare(`
                SELECT 
                    AVG(rating) as avg_rating,
                    COUNT(*) as count
                FROM ratings
                WHERE manga_id = ?
            `).get(mangaId);

            // 确保没有评分时数据归零
            if (stats.count === 0) {
                stats.avg_rating = 0;
            } else {
                stats.avg_rating = stats.avg_rating || 0;
            }

            // 更新漫画表中的评分信息
            db.prepare(`
                UPDATE manga 
                SET rating = ?, rating_count = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `).run(stats.avg_rating, stats.count, mangaId);

            return stats;
        });

        const stats = transaction();

        res.json({
            success: true,
            message: '评分已删除',
            manga_stats: {
                average_rating: stats.avg_rating,
                rating_count: stats.count
            }
        });
    } catch (error) {
        console.error('删除评分失败:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * 获取评分统计
 * GET /api/ratings/stats
 */
router.get('/stats', (req, res) => {
    try {
        const stats = db.prepare(`
            SELECT 
                COUNT(DISTINCT manga_id) as rated_manga_count,
                COUNT(*) as total_ratings,
                AVG(rating) as overall_average,
                MAX(rating) as highest_rating,
                MIN(rating) as lowest_rating
            FROM ratings
        `).get();

        // 获取评分最高的漫画
        const topRated = db.prepare(`
            SELECT m.id, m.title, m.cover_path, m.rating, m.rating_count
            FROM manga m
            WHERE m.rating_count > 0
            ORDER BY m.rating DESC, m.rating_count DESC
            LIMIT 10
        `).all();

        res.json({
            stats: {
                rated_manga_count: stats.rated_manga_count || 0,
                total_ratings: stats.total_ratings || 0,
                overall_average: stats.overall_average || 0,
                highest_rating: stats.highest_rating || 0,
                lowest_rating: stats.lowest_rating || 0
            },
            top_rated: topRated
        });
    } catch (error) {
        console.error('获取评分统计失败:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
