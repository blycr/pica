import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// 配置文件路径
const ENV_PATH = path.join(__dirname, '../../.env');
const CONFIG_JSON_PATH = path.join(__dirname, '../../data/config.json');

/**
 * 读取 .env 文件内容并解析为对象
 */
function readEnvFile() {
    try {
        if (!fs.existsSync(ENV_PATH)) {
            return {};
        }

        const content = fs.readFileSync(ENV_PATH, 'utf-8');
        const config = {};

        content.split('\n').forEach(line => {
            line = line.trim();
            // 跳过空行和注释
            if (!line || line.startsWith('#')) return;

            const equalIndex = line.indexOf('=');
            if (equalIndex > 0) {
                const key = line.substring(0, equalIndex).trim();
                const value = line.substring(equalIndex + 1).trim();
                config[key] = value;
            }
        });

        return config;
    } catch (error) {
        console.error('读取 .env 文件失败:', error);
        return {};
    }
}

/**
 * 写入配置到 .env 文件
 */
function writeEnvFile(config) {
    try {
        // 读取原始文件以保留注释
        let content = '';
        const existingLines = [];

        if (fs.existsSync(ENV_PATH)) {
            content = fs.readFileSync(ENV_PATH, 'utf-8');
            existingLines.push(...content.split('\n'));
        }

        // 更新配置值
        const updatedLines = [];
        const processedKeys = new Set();

        existingLines.forEach(line => {
            const trimmed = line.trim();

            // 保留注释和空行
            if (!trimmed || trimmed.startsWith('#')) {
                updatedLines.push(line);
                return;
            }

            const equalIndex = trimmed.indexOf('=');
            if (equalIndex > 0) {
                const key = trimmed.substring(0, equalIndex).trim();

                if (config.hasOwnProperty(key)) {
                    updatedLines.push(`${key}=${config[key]}`);
                    processedKeys.add(key);
                } else {
                    updatedLines.push(line);
                }
            } else {
                updatedLines.push(line);
            }
        });

        // 添加新的配置项
        Object.keys(config).forEach(key => {
            if (!processedKeys.has(key)) {
                updatedLines.push(`${key}=${config[key]}`);
            }
        });

        fs.writeFileSync(ENV_PATH, updatedLines.join('\n'), 'utf-8');
        return true;
    } catch (error) {
        console.error('写入 .env 文件失败:', error);
        throw error;
    }
}

/**
 * 读取 JSON 配置文件
 */
function readConfigJson() {
    try {
        if (!fs.existsSync(CONFIG_JSON_PATH)) {
            return {};
        }

        const content = fs.readFileSync(CONFIG_JSON_PATH, 'utf-8');
        return JSON.parse(content);
    } catch (error) {
        console.error('读取 config.json 失败:', error);
        return {};
    }
}

/**
 * 写入 JSON 配置文件
 */
function writeConfigJson(config) {
    try {
        const dataDir = path.dirname(CONFIG_JSON_PATH);
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }

        fs.writeFileSync(CONFIG_JSON_PATH, JSON.stringify(config, null, 2), 'utf-8');
        return true;
    } catch (error) {
        console.error('写入 config.json 失败:', error);
        throw error;
    }
}

/**
 * 获取所有配置
 * GET /api/config
 */
router.get('/', (req, res) => {
    try {
        const envConfig = readEnvFile();
        const jsonConfig = readConfigJson();

        res.json({
            env: envConfig,
            json: jsonConfig,
            merged: {
                ...jsonConfig,
                ...envConfig,
                // 从环境变量中读取当前运行时配置
                PORT: process.env.PORT || envConfig.PORT || '3000',
                HOST: process.env.HOST || envConfig.HOST || '0.0.0.0',
                NODE_ENV: process.env.NODE_ENV || envConfig.NODE_ENV || 'development',
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * 获取单个配置项
 * GET /api/config/:key
 */
router.get('/:key', (req, res) => {
    try {
        const { key } = req.params;
        const envConfig = readEnvFile();
        const jsonConfig = readConfigJson();

        const value = process.env[key] || envConfig[key] || jsonConfig[key];

        if (value === undefined) {
            return res.status(404).json({ error: '配置项不存在' });
        }

        res.json({
            key,
            value,
            source: process.env[key] ? 'runtime' : (envConfig[key] ? 'env' : 'json')
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * 更新 .env 配置
 * PUT /api/config/env
 */
router.put('/env', (req, res) => {
    try {
        const updates = req.body;

        if (!updates || typeof updates !== 'object') {
            return res.status(400).json({ error: '无效的配置数据' });
        }

        // 安全过滤：禁止修改关键系统变量
        const BLOCKED_KEYS = ['NODE_ENV', 'PORT', 'HOST', 'DB_PATH'];
        BLOCKED_KEYS.forEach(key => {
            if (key in updates) {
                delete updates[key];
                console.warn(`[Security] Ignored attempt to update protected config: ${key}`);
            }
        });

        const currentConfig = readEnvFile();
        const newConfig = { ...currentConfig, ...updates };

        writeEnvFile(newConfig);

        res.json({
            success: true,
            message: '.env 配置已更新',
            config: newConfig,
            warning: '配置已保存，但需要重启服务器才能生效'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * 更新 JSON 配置
 * PUT /api/config/json
 */
router.put('/json', (req, res) => {
    try {
        const updates = req.body;

        if (!updates || typeof updates !== 'object') {
            return res.status(400).json({ error: '无效的配置数据' });
        }

        const currentConfig = readConfigJson();
        const newConfig = { ...currentConfig, ...updates };

        writeConfigJson(newConfig);

        res.json({
            success: true,
            message: 'JSON 配置已更新',
            config: newConfig
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * 删除配置项
 * DELETE /api/config/:type/:key
 * type: env 或 json
 */
router.delete('/:type/:key', (req, res) => {
    try {
        const { type, key } = req.params;

        if (type === 'env') {
            const config = readEnvFile();
            delete config[key];
            writeEnvFile(config);

            res.json({
                success: true,
                message: `已从 .env 中删除配置项: ${key}`,
                warning: '需要重启服务器才能生效'
            });
        } else if (type === 'json') {
            const config = readConfigJson();
            delete config[key];
            writeConfigJson(config);

            res.json({
                success: true,
                message: `已从 config.json 中删除配置项: ${key}`
            });
        } else {
            res.status(400).json({ error: '无效的配置类型，只支持 env 或 json' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * 重置配置为默认值
 * POST /api/config/reset
 */
router.post('/reset', (req, res) => {
    try {
        const { type } = req.body;

        if (type === 'env') {
            // 从 .env.example 复制
            const examplePath = path.join(__dirname, '../../.env.example');
            if (fs.existsSync(examplePath)) {
                fs.copyFileSync(examplePath, ENV_PATH);
                res.json({
                    success: true,
                    message: '.env 已重置为默认配置',
                    warning: '需要重启服务器才能生效'
                });
            } else {
                res.status(404).json({ error: '.env.example 文件不存在' });
            }
        } else if (type === 'json') {
            writeConfigJson({});
            res.json({
                success: true,
                message: 'config.json 已重置为空'
            });
        } else {
            res.status(400).json({ error: '请指定要重置的配置类型 (env 或 json)' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
