import express from 'express';
import { db } from '../db/init.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const router = express.Router();

// Helper to get setting value
function getSetting(key, defaultValue = null) {
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
    return row ? row.value : defaultValue;
}

function setSetting(key, value) {
    const exists = db.prepare('SELECT 1 FROM settings WHERE key = ?').get(key);
    if (exists) {
        db.prepare('UPDATE settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?').run(value, key);
    } else {
        db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run(key, value);
    }
}

/**
 * 检查认证状态
 * GET /api/auth/status
 * Header: Authorization: Bearer <token> (optional)
 */
router.get('/status', (req, res) => {
    try {
        const enabled = getSetting('pin_enabled', 'false') === 'true';
        let authenticated = false;
        const authHeader = req.headers['authorization'];
        if (enabled && authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.slice(7);
            const session = db.prepare('SELECT expires_at FROM auth_sessions WHERE token = ?').get(token);
            if (session && new Date(session.expires_at) > new Date()) {
                authenticated = true;
            }
        }
        res.json({ pin_enabled: enabled, authenticated });
    } catch (e) {
        console.error('auth/status error', e);
        res.status(500).json({ error: e.message });
    }
});

/**
 * 验证 PIN 并创建会话
 * POST /api/auth/verify
 * Body: { pin: "1234" }
 */
router.post('/verify', (req, res) => {
    try {
        const enabled = getSetting('pin_enabled', 'false') === 'true';
        if (!enabled) {
            return res.status(400).json({ error: 'PIN 认证未启用' });
        }
        const { pin } = req.body;
        if (!pin) return res.status(400).json({ error: '缺少 pin 参数' });
        // 检查锁定
        const lockUntil = getSetting('pin_lock_until');
        if (lockUntil && new Date(lockUntil) > new Date()) {
            return res.status(429).json({ error: '尝试次数过多，请稍后再试' });
        }
        const hash = getSetting('pin_code_hash');
        if (!hash) return res.status(500).json({ error: '未设置 PIN' });
        const match = bcrypt.compareSync(pin, hash);
        if (!match) {
            // 记录失败次数
            let attempts = parseInt(getSetting('pin_failed_attempts', '0')) + 1;
            setSetting('pin_failed_attempts', attempts.toString());
            if (attempts >= 5) {
                const lockTime = new Date(Date.now() + 15 * 60 * 1000); // 15 分钟
                setSetting('pin_lock_until', lockTime.toISOString());
                setSetting('pin_failed_attempts', '0');
                return res.status(429).json({ error: '尝试次数过多，已锁定 15 分钟' });
            }
            return res.status(401).json({ error: 'PIN 错误' });
        }
        // 成功，重置失败计数
        setSetting('pin_failed_attempts', '0');
        setSetting('pin_lock_until', null);
        // 生成 token
        const token = crypto.randomBytes(32).toString('hex');
        const hours = parseInt(getSetting('pin_session_hours', '24'));
        const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
        db.prepare('INSERT INTO auth_sessions (token, expires_at) VALUES (?, ?)').run(token, expiresAt);
        res.json({ success: true, token, expires_at: expiresAt });
    } catch (e) {
        console.error('auth/verify error', e);
        res.status(500).json({ error: e.message });
    }
});

/**
 * 登出，删除会话
 * POST /api/auth/logout
 */
router.post('/logout', (req, res) => {
    try {
        const authHeader = req.headers['authorization'];
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(400).json({ error: '缺少 token' });
        }
        const token = authHeader.slice(7);
        db.prepare('DELETE FROM auth_sessions WHERE token = ?').run(token);
        res.json({ success: true });
    } catch (e) {
        console.error('auth/logout error', e);
        res.status(500).json({ error: e.message });
    }
});

/**
 * 修改 PIN（需要先验证旧 PIN）
 * PUT /api/auth/pin
 * Body: { oldPin: "1234", newPin: "5678" }
 */
router.put('/pin', (req, res) => {
    try {
        const enabled = getSetting('pin_enabled', 'false') === 'true';
        if (!enabled) return res.status(400).json({ error: 'PIN 认证未启用' });
        const { oldPin, newPin } = req.body;
        if (!oldPin || !newPin) return res.status(400).json({ error: '缺少 oldPin 或 newPin' });
        const hash = getSetting('pin_code_hash');
        if (!hash) return res.status(500).json({ error: '未设置 PIN' });
        if (!bcrypt.compareSync(oldPin, hash)) {
            return res.status(401).json({ error: '旧 PIN 错误' });
        }
        if (!/^[0-9]{4,8}$/.test(newPin)) {
            return res.status(400).json({ error: '新 PIN 必须为 4-8 位数字' });
        }
        const newHash = bcrypt.hashSync(newPin, 10);
        setSetting('pin_code_hash', newHash);
        res.json({ success: true, message: 'PIN 已更新' });
    } catch (e) {
        console.error('auth/pin error', e);
        res.status(500).json({ error: e.message });
    }
});

/**
 * 更新 PIN 相关设置（启用/禁用、会话时长）
 * PUT /api/auth/settings
 * Body: { enabled: true/false, sessionHours: number }
 */
router.put('/settings', (req, res) => {
    try {
        const { enabled, sessionHours } = req.body;
        if (enabled !== undefined) {
            setSetting('pin_enabled', enabled ? 'true' : 'false');
        }
        if (sessionHours !== undefined) {
            const hours = parseInt(sessionHours);
            if (isNaN(hours) || hours <= 0) {
                return res.status(400).json({ error: 'sessionHours 必须为正整数' });
            }
            setSetting('pin_session_hours', hours.toString());
        }
        res.json({ success: true });
    } catch (e) {
        console.error('auth/settings error', e);
        res.status(500).json({ error: e.message });
    }
});

export default router;
