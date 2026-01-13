import express from 'express';
import { db } from '../db/init.js';
import {
    generateThumbnail,
    generateThumbnailsBatch,
    cleanThumbnailCache,
    getThumbnailCacheStats
} from '../utils/thumbnail.js';

const router = express.Router();

/**
 * 获取单个图片的缩略图
 * GET /api/thumbnails/generate
 * Query: path, size (small/medium/large)
 */
router.get('/generate', async (req, res) => {
    try {
        const { path, size = 'medium' } = req.query;

        if (!path) {
            return res.status(400).json({ error: '请提供图片路径' });
        }


        const thumbnailPath = await generateThumbnail(path, size);

        if (!thumbnailPath) {
            return res.status(422).send('Unable to generate thumbnail: Invalid image format');
        }

        res.sendFile(thumbnailPath);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * 批量生成漫画封面缩略图
 * POST /api/thumbnails/batch
 * Body: { mangaIds: [1, 2, 3], size: 'medium' }
 */
router.post('/batch', async (req, res) => {
    try {
        const { mangaIds = [], size = 'medium' } = req.body;

        if (!Array.isArray(mangaIds) || mangaIds.length === 0) {
            return res.status(400).json({ error: '请提供漫画ID数组' });
        }

        // 获取漫画封面路径
        const placeholders = mangaIds.map(() => '?').join(',');
        const manga = db.prepare(`
            SELECT id, title, cover_path 
            FROM manga 
            WHERE id IN (${placeholders})
        `).all(...mangaIds);

        const coverPaths = manga
            .filter(m => m.cover_path)
            .map(m => m.cover_path);

        // 批量生成缩略图
        const results = await generateThumbnailsBatch(coverPaths, size);

        res.json({
            success: true,
            total: coverPaths.length,
            results
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * 为所有漫画生成缩略图
 * POST /api/thumbnails/generate-all
 * Body: { size: 'medium' }
 */
router.post('/generate-all', async (req, res) => {
    try {
        const { size = 'medium' } = req.body;

        // 获取所有漫画的封面路径
        const manga = db.prepare('SELECT id, title, cover_path FROM manga').all();
        const coverPaths = manga
            .filter(m => m.cover_path)
            .map(m => m.cover_path);

        // 批量生成缩略图
        const results = await generateThumbnailsBatch(coverPaths, size);

        const successCount = results.filter(r => r.status === 'success').length;
        const failedCount = results.filter(r => r.status === 'failed').length;

        res.json({
            success: true,
            total: coverPaths.length,
            generated: successCount,
            failed: failedCount,
            results
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * 清理缩略图缓存
 * DELETE /api/thumbnails/cache
 * Query: maxAge (天数，默认30天)
 */
router.delete('/cache', (req, res) => {
    try {
        const { maxAge = 30 } = req.query;
        const maxAgeMs = parseInt(maxAge) * 24 * 60 * 60 * 1000;

        const cleaned = cleanThumbnailCache(maxAgeMs);

        res.json({
            success: true,
            cleaned,
            message: `已清理 ${cleaned} 个过期缩略图`
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * 获取缩略图缓存统计信息
 * GET /api/thumbnails/stats
 */
router.get('/stats', (req, res) => {
    try {
        const stats = getThumbnailCacheStats();
        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
