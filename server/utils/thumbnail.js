import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 缩略图存储目录
const THUMBNAIL_DIR = path.join(__dirname, '../../data/thumbnails');

// 确保缩略图目录存在
if (!fs.existsSync(THUMBNAIL_DIR)) {
    fs.mkdirSync(THUMBNAIL_DIR, { recursive: true });
}

/**
 * 缩略图尺寸配置
 */
export const THUMBNAIL_SIZES = {
    small: { width: 150, height: 200 },
    medium: { width: 300, height: 400 },
    large: { width: 600, height: 800 }
};

/**
 * 生成文件的哈希值作为缓存键
 */
function generateCacheKey(filePath, size) {
    const hash = crypto.createHash('md5').update(filePath).digest('hex');
    return `${hash}_${size}.webp`;
}

/**
 * 生成单个图片的缩略图
 * @param {string} imagePath - 原始图片路径
 * @param {string} size - 缩略图尺寸 (small/medium/large)
 * @returns {string} 缩略图路径
 */
export async function generateThumbnail(imagePath, size = 'medium') {
    if (!fs.existsSync(imagePath)) {
        throw new Error(`图片不存在: ${imagePath}`);
    }

    const sizeConfig = THUMBNAIL_SIZES[size];
    if (!sizeConfig) {
        throw new Error(`无效的缩略图尺寸: ${size}`);
    }

    // 生成缓存文件名
    const cacheKey = generateCacheKey(imagePath, size);
    const thumbnailPath = path.join(THUMBNAIL_DIR, cacheKey);

    // 如果缩略图已存在，直接返回
    if (fs.existsSync(thumbnailPath)) {
        return thumbnailPath;
    }

    try {
        // 生成缩略图
        await sharp(imagePath)
            .resize(sizeConfig.width, sizeConfig.height, {
                fit: 'cover',
                position: 'center'
            })
            .webp({ quality: 80 })
            .toFile(thumbnailPath);

        return thumbnailPath;
    } catch (error) {
        // Ignroe unsupported format error for demo files
        if (error.message.includes('unsupported image format') || error.message.includes('Input file contains')) {
            console.warn(`⚠️ 无法生成缩略图 (图片格式不正确): ${path.basename(imagePath)}`);
            return null;
        }

        console.error(`生成缩略图失败 ${imagePath}:`, error.message);
        throw error;
    }
}

/**
 * 批量生成缩略图
 * @param {Array<string>} imagePaths - 图片路径数组
 * @param {string} size - 缩略图尺寸
 * @returns {Array<Object>} 结果数组
 */
export async function generateThumbnailsBatch(imagePaths, size = 'medium') {
    const results = [];

    for (const imagePath of imagePaths) {
        try {
            const thumbnailPath = await generateThumbnail(imagePath, size);
            results.push({
                original: imagePath,
                thumbnail: thumbnailPath,
                status: 'success'
            });
        } catch (error) {
            results.push({
                original: imagePath,
                thumbnail: null,
                status: 'failed',
                error: error.message
            });
        }
    }

    return results;
}

/**
 * 清理缩略图缓存
 * @param {number} maxAge - 最大缓存时间（毫秒）
 */
export function cleanThumbnailCache(maxAge = 30 * 24 * 60 * 60 * 1000) {
    const files = fs.readdirSync(THUMBNAIL_DIR);
    const now = Date.now();
    let cleaned = 0;

    for (const file of files) {
        const filePath = path.join(THUMBNAIL_DIR, file);
        const stats = fs.statSync(filePath);
        const age = now - stats.mtimeMs;

        if (age > maxAge) {
            fs.unlinkSync(filePath);
            cleaned++;
        }
    }

    return cleaned;
}

/**
 * 获取缩略图缓存统计信息
 */
export function getThumbnailCacheStats() {
    const files = fs.readdirSync(THUMBNAIL_DIR);
    let totalSize = 0;

    for (const file of files) {
        const filePath = path.join(THUMBNAIL_DIR, file);
        const stats = fs.statSync(filePath);
        totalSize += stats.size;
    }

    return {
        count: files.length,
        totalSize,
        totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2)
    };
}
