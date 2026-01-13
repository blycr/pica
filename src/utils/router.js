import { createElement } from '../utils/dom.js';

/**
 * 路由匹配工具
 * @param {string} routePattern - 路由模式，例如 '/manga/:id'
 * @param {string} path - 实际路径，例如 '/manga/123'
 * @returns {object|null} - 如果匹配成功返回参数对象，否则返回 null
 */
export function matchRoute(routePattern, path) {
    const paramNames = [];
    const regexPattern = routePattern.replace(/:([^/]+)/g, (match, paramName) => {
        paramNames.push(paramName);
        return '([^/]+)';
    });

    // 增加 ^ 和 $ 确保全匹配
    const regex = new RegExp(`^${regexPattern}$`);
    const match = path.match(regex);

    if (!match) return null;

    const params = {};
    paramNames.forEach((name, index) => {
        params[name] = decodeURIComponent(match[index + 1]);
    });

    return params;
}

// Simple Router Event Bus
const listeners = [];

export const router = {
    // 存储当前的路由处理函数映射
    routes: [],

    navigate: (path) => {
        // 更新 URL (可选，为了浏览器历史记录)
        window.history.pushState({}, '', path);
        listeners.forEach(cb => cb(path));
    },

    subscribe: (cb) => {
        listeners.push(cb);
        // 初始化时调用一次
        cb(window.location.pathname);
        return () => {
            const index = listeners.indexOf(cb);
            if (index > -1) listeners.splice(index, 1);
        };
    }
};

// 监听浏览器后退/前进
window.addEventListener('popstate', () => {
    listeners.forEach(cb => cb(window.location.pathname));
});
