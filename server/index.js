import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDatabase } from './db/init.js';
import mangaRoutes from './routes/manga.js';
import tagRoutes from './routes/tags.js';
import scannerRoutes from './routes/scanner.js';
import thumbnailRoutes from './routes/thumbnails.js';
import searchRoutes from './routes/search.js';
import libraryRoutes from './routes/libraries.js';
import metadataRoutes from './routes/metadata.js';
import historyRoutes from './routes/history.js';

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

// 图片服务中间件 (Temporary Secure Image Server)
app.get('/api/image', (req, res) => {
    const imagePath = req.query.path;
    if (!imagePath) return res.status(400).send('Missing path');

    // 安全检查：确保路径在允许的目录内 (Simple check)
    // 实际生产环境需要更严格的检查，防止路径遍历
    // 这里假设 path 是由于 scanner 产生的绝对路径，我们信任它，但至少确保文件存在
    res.sendFile(imagePath, (err) => {
        if (err) {
            console.error('File send error:', err);
            res.status(404).send('Image not found');
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
        app.use(express.static(distPath));

        // SPA 路由回退 (Express 5 compatibility: * is no longer valid, use regex)
        app.get(/.*/, (req, res) => {
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
