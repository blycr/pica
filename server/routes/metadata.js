import express from 'express';
import { db } from '../db/init.js';

const router = express.Router();

/**
 * 从标题中提取可能的搜索关键词
 * 移除常见的括号内容、年份等
 */
function extractSearchKeyword(title) {
    // 移除括号及其内容
    let keyword = title.replace(/[\[\(【（].*?[\]\)】）]/g, '');
    // 移除年份
    keyword = keyword.replace(/\b(19|20)\d{2}\b/g, '');
    // 移除多余空格
    keyword = keyword.trim();
    return keyword;
}

/**
 * 搜索漫画元数据（模拟外部API）
 * 实际使用时可以集成 MyAnimeList, AniList, Bangumi 等API
 * GET /api/metadata/search?title=xxx
 */
router.get('/search', async (req, res) => {
    try {
        const { title } = req.query;

        if (!title) {
            return res.status(400).json({ error: '标题不能为空' });
        }

        const keyword = extractSearchKeyword(title);

        // 这里是模拟数据，实际应该调用外部API
        // 例如: https://api.myanimelist.net/v2/manga?q=${keyword}
        // 或: https://api.anilist.co/

        const mockResults = [
            {
                source: 'local',
                title: keyword,
                alternativeTitles: [],
                description: '暂无描述',
                author: '未知',
                artist: '未知',
                genres: [],
                tags: [],
                status: 'unknown',
                year: null,
                coverUrl: null,
                externalId: null,
                score: 0.8
            }
        ];

        res.json({
            query: title,
            keyword,
            results: mockResults,
            message: '元数据匹配功能正在开发中，当前返回模拟数据'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * 为漫画应用元数据
 * POST /api/metadata/apply/:mangaId
 * Body: { metadata }
 */
router.post('/apply/:mangaId', (req, res) => {
    try {
        const { mangaId } = req.params;
        const { metadata } = req.body;

        if (!metadata) {
            return res.status(400).json({ error: '元数据不能为空' });
        }

        // 检查漫画是否存在
        const manga = db.prepare('SELECT * FROM manga WHERE id = ?').get(mangaId);
        if (!manga) {
            return res.status(404).json({ error: '漫画不存在' });
        }

        // 将元数据存储到settings表中
        const metadataKey = `manga_metadata_${mangaId}`;
        db.prepare(`
      INSERT OR REPLACE INTO settings (key, value, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
    `).run(metadataKey, JSON.stringify(metadata));

        // 如果元数据包含标签，自动添加标签
        if (metadata.tags && Array.isArray(metadata.tags)) {
            for (const tagName of metadata.tags) {
                // 创建标签（如果不存在）
                const existingTag = db.prepare('SELECT id FROM tags WHERE name = ?').get(tagName);
                let tagId;

                if (existingTag) {
                    tagId = existingTag.id;
                } else {
                    const result = db.prepare('INSERT INTO tags (name) VALUES (?)').run(tagName);
                    tagId = result.lastInsertRowid;
                }

                // 关联标签到漫画
                db.prepare(`
          INSERT OR IGNORE INTO manga_tags (manga_id, tag_id)
          VALUES (?, ?)
        `).run(mangaId, tagId);
            }
        }

        res.json({
            success: true,
            message: '元数据已应用',
            metadata
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * 获取漫画的元数据
 * GET /api/metadata/:mangaId
 */
router.get('/:mangaId', (req, res) => {
    try {
        const { mangaId } = req.params;

        const metadataKey = `manga_metadata_${mangaId}`;
        const result = db.prepare('SELECT value FROM settings WHERE key = ?').get(metadataKey);

        if (!result) {
            return res.status(404).json({ error: '未找到元数据' });
        }

        const metadata = JSON.parse(result.value);
        res.json(metadata);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * 批量自动匹配元数据
 * POST /api/metadata/batch-match
 * Body: { mangaIds: [1, 2, 3] }
 */
router.post('/batch-match', async (req, res) => {
    try {
        const { mangaIds } = req.body;

        if (!mangaIds || !Array.isArray(mangaIds)) {
            return res.status(400).json({ error: '漫画ID列表格式错误' });
        }

        const results = [];

        for (const mangaId of mangaIds) {
            const manga = db.prepare('SELECT * FROM manga WHERE id = ?').get(mangaId);

            if (!manga) {
                results.push({
                    mangaId,
                    success: false,
                    error: '漫画不存在'
                });
                continue;
            }

            // 这里应该调用外部API进行匹配
            // 当前返回模拟数据
            const keyword = extractSearchKeyword(manga.title);

            results.push({
                mangaId,
                title: manga.title,
                keyword,
                success: true,
                matched: false,
                message: '元数据匹配功能开发中'
            });
        }

        res.json({
            total: mangaIds.length,
            results
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * 删除漫画的元数据
 * DELETE /api/metadata/:mangaId
 */
router.delete('/:mangaId', (req, res) => {
    try {
        const { mangaId } = req.params;

        const metadataKey = `manga_metadata_${mangaId}`;
        db.prepare('DELETE FROM settings WHERE key = ?').run(metadataKey);

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
