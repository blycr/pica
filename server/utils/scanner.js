import fs from 'fs';
import path from 'path';
import { db } from '../db/init.js';

/**
 * 支持的图片格式
 */
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];

/**
 * 判断是否为图片文件
 */
function isImageFile(filename) {
    const ext = path.extname(filename).toLowerCase();
    return IMAGE_EXTENSIONS.includes(ext);
}

/**
 * 扫描单个漫画目录
 * @param {string} mangaPath - 漫画目录路径
 * @returns {Object} 漫画信息
 */
export function scanMangaDirectory(mangaPath) {
    if (!fs.existsSync(mangaPath)) {
        throw new Error(`目录不存在: ${mangaPath}`);
    }

    const stats = fs.statSync(mangaPath);
    if (!stats.isDirectory()) {
        throw new Error(`不是有效的目录: ${mangaPath}`);
    }

    const mangaTitle = path.basename(mangaPath);
    const entries = fs.readdirSync(mangaPath, { withFileTypes: true });

    // 查找封面图片（通常是 cover.jpg 或目录中第一张图片）
    let coverPath = null;
    const coverFile = entries.find(e =>
        e.isFile() &&
        (e.name.toLowerCase().includes('cover') || e.name.toLowerCase().includes('封面')) &&
        isImageFile(e.name)
    );

    if (coverFile) {
        coverPath = path.join(mangaPath, coverFile.name);
    }

    // 扫描章节目录
    const chapters = [];
    const chapterDirs = entries
        .filter(e => e.isDirectory())
        .sort((a, b) => {
            // 尝试提取章节号进行排序
            const numA = extractChapterNumber(a.name);
            const numB = extractChapterNumber(b.name);
            return numA - numB;
        });

    for (let i = 0; i < chapterDirs.length; i++) {
        const chapterDir = chapterDirs[i];
        const chapterPath = path.join(mangaPath, chapterDir.name);
        const chapterFiles = fs.readdirSync(chapterPath);
        const imageFiles = chapterFiles.filter(isImageFile);

        chapters.push({
            chapterNumber: i + 1,
            title: chapterDir.name,
            path: chapterPath,
            pageCount: imageFiles.length
        });

        // 如果还没有封面，使用第一章的第一张图片
        if (!coverPath && imageFiles.length > 0) {
            coverPath = path.join(chapterPath, imageFiles[0]);
        }
    }

    // 如果没有章节目录，检查是否直接包含图片（单卷漫画）
    if (chapters.length === 0) {
        const imageFiles = entries
            .filter(e => e.isFile() && isImageFile(e.name))
            .map(e => e.name)
            .sort();

        if (imageFiles.length > 0) {
            chapters.push({
                chapterNumber: 1,
                title: '单行本',
                path: mangaPath,
                pageCount: imageFiles.length
            });

            if (!coverPath) {
                coverPath = path.join(mangaPath, imageFiles[0]);
            }
        }
    }

    const totalPages = chapters.reduce((sum, ch) => sum + ch.pageCount, 0);

    return {
        title: mangaTitle,
        path: mangaPath,
        coverPath,
        totalChapters: chapters.length,
        totalPages,
        chapters
    };
}

/**
 * 从文件名中提取章节号
 */
function extractChapterNumber(filename) {
    // 优先匹配像是 "第12话", "Chapter 12", "Ch.12" 这样的模式
    const chapterMatch = filename.match(/(?:第|Ch\.?|Chapter\s*|v\.|vol\.?|volume\s*)(\d+(\.\d+)?)/i);
    if (chapterMatch) {
        return parseFloat(chapterMatch[1]);
    }
    // 否则匹配第一个数字
    const match = filename.match(/(\d+(\.\d+)?)/);
    return match ? parseFloat(match[1]) : 0;
}

/**
 * 批量扫描多个漫画目录
 * @param {string} rootPath - 根目录路径
 * @returns {Array} 漫画列表
 */
export function scanMangaLibrary(rootPath) {
    if (!fs.existsSync(rootPath)) {
        throw new Error(`根目录不存在: ${rootPath}`);
    }

    const entries = fs.readdirSync(rootPath, { withFileTypes: true });
    const mangaList = [];

    for (const entry of entries) {
        if (entry.isDirectory()) {
            try {
                const mangaPath = path.join(rootPath, entry.name);
                const mangaInfo = scanMangaDirectory(mangaPath);
                mangaList.push(mangaInfo);
            } catch (error) {
                console.error(`扫描失败 ${entry.name}:`, error.message);
            }
        }
    }

    return mangaList;
}

/**
 * 保存扫描结果到数据库
 * @param {Object} mangaInfo - 漫画信息
 * @returns {number} 插入的漫画 ID
 */
export function saveMangaToDatabase(mangaInfo) {
    const insertManga = db.prepare(`
    INSERT OR REPLACE INTO manga (title, path, cover_path, total_chapters, total_pages, updated_at)
    VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `);

    const result = insertManga.run(
        mangaInfo.title,
        mangaInfo.path,
        mangaInfo.coverPath,
        mangaInfo.totalChapters,
        mangaInfo.totalPages
    );

    const mangaId = result.lastInsertRowid;

    // 保存章节信息
    const insertChapter = db.prepare(`
    INSERT OR REPLACE INTO chapters (manga_id, chapter_number, title, path, page_count)
    VALUES (?, ?, ?, ?, ?)
  `);

    for (const chapter of mangaInfo.chapters) {
        insertChapter.run(
            mangaId,
            chapter.chapterNumber,
            chapter.title,
            chapter.path,
            chapter.pageCount
        );
    }

    return mangaId;
}
