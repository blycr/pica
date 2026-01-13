const API_BASE_URL = 'http://localhost:3000/api';

/**
 * 基础 API 请求封装
 * @param {string} endpoint - API 端点 (例如 '/manga')
 * @param {object} options - fetch 选项
 */
export async function fetchApi(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;

    try {
        const response = await fetch(url, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `API Error: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error(`API Request failed for ${url}:`, error);
        throw error;
    }
}

// 具体的 API 方法集合
export const api = {
    manga: {
        list: () => fetchApi('/manga'),
        get: (id) => fetchApi(`/manga/${id}`),
    },
    scanner: {
        status: () => fetchApi('/scanner/status'),
        scan: (data) => fetchApi('/scanner/scan', {
            method: 'POST',
            body: JSON.stringify(data)
        }),
    },
    tags: {
        list: () => fetchApi('/tags'),
    },
    health: () => fetchApi('/health'),
    search: {
        advanced: (data) => fetchApi('/search/advanced', {
            method: 'POST',
            body: JSON.stringify(data)
        }),
        autocomplete: (query) => fetchApi(`/search/autocomplete?q=${encodeURIComponent(query)}`),
        suggestions: () => fetchApi('/search/suggestions'),
    },
    thumbnails: {
        generate: (path, size = 'medium') => `${API_BASE_URL}/thumbnails/generate?path=${encodeURIComponent(path)}&size=${size}`,
        stats: () => fetchApi('/thumbnails/stats'),
    },
    history: {
        continueReading: (limit = 10) => fetchApi(`/history/continue-reading?limit=${limit}`),
        list: (page = 1, limit = 20) => fetchApi(`/history?page=${page}&limit=${limit}`),
        favorites: (limit = 20) => fetchApi(`/history/favorites?limit=${limit}`),
        clear: (olderThan) => fetchApi(`/history/clear${olderThan ? `?olderThan=${olderThan}` : ''}`, { method: 'DELETE' }),
        delete: (id) => fetchApi(`/history/${id}`, { method: 'DELETE' }),
    },
    libraries: {
        list: () => fetchApi('/libraries'),
        get: (id) => fetchApi(`/libraries/${id}`),
        create: (data) => fetchApi('/libraries', {
            method: 'POST',
            body: JSON.stringify(data)
        }),
        update: (id, data) => fetchApi(`/libraries/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        }),
        delete: (id) => fetchApi(`/libraries/${id}`, { method: 'DELETE' }),
        stats: (id) => fetchApi(`/libraries/${id}/stats`),
    },
    metadata: {
        search: (title) => fetchApi(`/metadata/search?title=${encodeURIComponent(title)}`),
        apply: (mangaId, metadata) => fetchApi(`/metadata/apply/${mangaId}`, {
            method: 'POST',
            body: JSON.stringify({ metadata })
        }),
        get: (mangaId) => fetchApi(`/metadata/${mangaId}`),
        batchMatch: (mangaIds) => fetchApi('/metadata/batch-match', {
            method: 'POST',
            body: JSON.stringify({ mangaIds })
        }),
        delete: (mangaId) => fetchApi(`/metadata/${mangaId}`, { method: 'DELETE' }),
    }
};
