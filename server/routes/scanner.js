import express from 'express';
import { scanMangaLibrary, scanMangaDirectory, saveMangaToDatabase } from '../utils/scanner.js';
import { db } from '../db/init.js';

const router = express.Router();

/**
 * 扫描指定目录
 * POST /api/scanner/scan
 * Body: { path, mode: 'single' | 'library' }
 */
router.post('/scan', async (req, res) => {
    try {
        const { path, mode = 'library' } = req.body;

        if (!path) {
            return res.status(400).json({ error: '请提供扫描路径' });
        }

        let results = [];
        let savedCount = 0;

        if (mode === 'single') {
            // 扫描单个漫画目录
            const mangaInfo = scanMangaDirectory(path);
            const mangaId = saveMangaToDatabase(mangaInfo);
            results.push({ ...mangaInfo, id: mangaId });
            savedCount = 1;
        } else {
            // 扫描整个漫画库
            const mangaList = scanMangaLibrary(path);

            for (const mangaInfo of mangaList) {
                try {
                    const mangaId = saveMangaToDatabase(mangaInfo);
                    results.push({ ...mangaInfo, id: mangaId });
                    savedCount++;
                } catch (error) {
                    console.error(`保存失败 ${mangaInfo.title}:`, error.message);
                }
            }
        }

        res.json({
            success: true,
            scanned: results.length,
            saved: savedCount,
            results
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * 重新扫描所有漫画（更新数据库）
 * POST /api/scanner/rescan
 */
router.post('/rescan', async (req, res) => {
    try {
        // 获取数据库中所有漫画路径
        const allManga = db.prepare('SELECT id, path FROM manga').all();

        let updated = 0;
        let failed = 0;
        const results = [];

        for (const manga of allManga) {
            try {
                const mangaInfo = scanMangaDirectory(manga.path);
                saveMangaToDatabase(mangaInfo);
                results.push({ id: manga.id, title: mangaInfo.title, status: 'updated' });
                updated++;
            } catch (error) {
                results.push({ id: manga.id, path: manga.path, status: 'failed', error: error.message });
                failed++;
            }
        }

        res.json({
            success: true,
            total: allManga.length,
            updated,
            failed,
            results
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * 获取扫描统计信息
 * GET /api/scanner/stats
 */
router.get('/stats', (req, res) => {
    try {
        const stats = {
            totalManga: db.prepare('SELECT COUNT(*) as count FROM manga').get().count,
            totalChapters: db.prepare('SELECT COUNT(*) as count FROM chapters').get().count,
            totalTags: db.prepare('SELECT COUNT(*) as count FROM tags').get().count,
            favoriteManga: db.prepare('SELECT COUNT(*) as count FROM manga WHERE is_favorite = 1').get().count,
            recentlyAdded: db.prepare(`
        SELECT * FROM manga 
        ORDER BY created_at DESC 
        LIMIT 5
      `).all(),
            recentlyRead: db.prepare(`
        SELECT m.* FROM manga m
        WHERE last_read_at IS NOT NULL
        ORDER BY last_read_at DESC 
        LIMIT 5
      `).all()
        };

        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
