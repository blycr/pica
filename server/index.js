import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { initDatabase } from './db/init.js';
import mangaRoutes from './routes/manga.js';
import tagRoutes from './routes/tags.js';
import scannerRoutes from './routes/scanner.js';
import thumbnailRoutes from './routes/thumbnails.js';
import searchRoutes from './routes/search.js';
import libraryRoutes from './routes/libraries.js';
import authRoutes from './routes/auth.js';
import ratingsRoutes from './routes/ratings.js';
import historyRoutes from './routes/history.js';
import configRoutes from './routes/config.js';
import metadataRoutes from './routes/metadata.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 初始化数据库
initDatabase();

// API 路由
app.use('/api/manga', mangaRoutes);
app.use('/api/tags', tagRoutes);
app.use('/api/scanner', scannerRoutes);
app.use('/api/thumbnails', thumbnailRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/libraries', libraryRoutes);
app.use('/api/metadata', metadataRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/config', configRoutes);
app.use('/api/ratings', ratingsRoutes);

// 图片服务中间件 (Temporary Secure Image Server)
app.get('/api/image', (req, res) => {
    const imagePath = req.query.path;
    if (!imagePath) return res.status(400).send('Missing path');

    // 解析绝对路径
    const resolvedPath = path.resolve(imagePath);

    // 获取允许的根目录列表
    const allowedRoots = (process.env.MANGA_LIBRARY_PATH || '')
        .split(',')
        .map(p => path.resolve(p.trim()))
        .filter(p => p);

    // 检查请求的路径是否在允许的目录内
    const isAllowed = allowedRoots.some(root => resolvedPath.startsWith(root));

    if (!isAllowed) {
        // 生产环境不应返回详细错误
        console.warn(`[Security] Blocked unauthorized access attempt: ${resolvedPath}`);
        return res.status(403).send('Access denied');
    }

    // 检查文件是否存在
    if (!fs.existsSync(resolvedPath)) {
        return res.status(404).send('Image not found');
    }

    res.sendFile(resolvedPath, (err) => {
        if (err) {
            if (!res.headersSent) {
                res.status(500).send('Error sending file');
            }
            console.error('File send error:', err);
        }
    });
});

// 健康检查
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 错误处理中间件
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
        error: '服务器内部错误',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});


// Only start the server if we are not in test mode
if (process.env.NODE_ENV !== 'test') {
    // 生产环境托管静态文件
    if (process.env.NODE_ENV === 'production') {
        const distPath = path.join(__dirname, '../dist');
        console.log('Serving static files from:', distPath);
        app.use(express.static(distPath));

        // SPA 路由回退 - 匹配所有未处理的 GET 请求
        // 使用正则字面量匹配所有路径
        app.get(/.*/, (req, res) => {
            console.log('SPA fallback triggered for:', req.url);
            res.sendFile(path.join(distPath, 'index.html'));
        });
    }

    const HOST = process.env.HOST || '0.0.0.0';
    app.listen(PORT, HOST, () => {
        console.log(`🚀 Pica Manga Server 运行在 http://${HOST}:${PORT}`);
        if (process.env.NODE_ENV === 'production') {
            console.log(`✨ 生产模式: 前端已集成托管`);
        } else {
            console.log(`📚 API 文档: http://${HOST}:${PORT}/api/health`);
        }
    });
}

export default app;
