import { createElement } from '../utils/dom.js';
import { api } from '../api/client.js';
import { router } from '../utils/router.js';

export async function MetadataPage() {
    const container = createElement('div', { className: 'w-full max-w-7xl mx-auto' });

    // 页面标题
    const header = createElement('div', { className: 'mb-8' }, [
        createElement('h2', { className: 'text-3xl font-bold text-white mb-2' }, ['Metadata Manager']),
        createElement('p', { className: 'text-gray-400' }, ['Search and apply metadata to your manga'])
    ]);
    container.appendChild(header);

    // 搜索区域
    const searchSection = createElement('div', { className: 'glass-card p-6 rounded-xl mb-8' });

    const searchForm = createElement('div', { className: 'flex gap-4' }, [
        createElement('input', {
            type: 'text',
            id: 'metadata-search-input',
            placeholder: 'Enter manga title to search...',
            className: 'flex-1 px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500'
        }),
        createElement('button', {
            className: 'px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors',
            onclick: () => searchMetadata()
        }, ['Search'])
    ]);
    searchSection.appendChild(searchForm);
    container.appendChild(searchSection);

    // 搜索结果区域
    const resultsContainer = createElement('div', {
        id: 'metadata-results',
        className: 'space-y-4'
    });
    container.appendChild(resultsContainer);

    // 搜索元数据
    async function searchMetadata() {
        const input = document.getElementById('metadata-search-input');
        const title = input.value.trim();

        if (!title) {
            alert('Please enter a manga title');
            return;
        }

        resultsContainer.innerHTML = '<div class="text-center py-10 text-gray-500">Searching...</div>';

        try {
            const response = await api.metadata.search(title);
            displayResults(response);
        } catch (error) {
            resultsContainer.innerHTML = `<div class="text-center py-10 text-red-500">Error: ${error.message}</div>`;
        }
    }

    // 显示搜索结果
    function displayResults(response) {
        resultsContainer.innerHTML = '';

        if (!response.results || response.results.length === 0) {
            resultsContainer.innerHTML = `
                <div class="text-center py-20">
                    <div class="text-gray-500 text-lg mb-2">No results found</div>
                    <div class="text-gray-600 text-sm">${response.message || 'Try a different search term'}</div>
                </div>
            `;
            return;
        }

        // 显示提示信息
        if (response.message) {
            const notice = createElement('div', {
                className: 'glass-card p-4 rounded-lg bg-blue-500/10 border border-blue-500/20 mb-4'
            }, [
                createElement('p', { className: 'text-blue-400 text-sm' }, [response.message])
            ]);
            resultsContainer.appendChild(notice);
        }

        // 显示结果列表
        response.results.forEach(result => {
            const card = createMetadataCard(result, response.query);
            resultsContainer.appendChild(card);
        });
    }

    // 创建元数据卡片
    function createMetadataCard(metadata, originalQuery) {
        const card = createElement('div', {
            className: 'glass-card p-6 rounded-xl'
        });

        const content = createElement('div', { className: 'flex gap-6' });

        // 封面图片（如果有）
        if (metadata.coverUrl) {
            const cover = createElement('div', { className: 'flex-shrink-0' }, [
                createElement('img', {
                    src: metadata.coverUrl,
                    alt: metadata.title,
                    className: 'w-32 h-48 object-cover rounded-lg',
                    onerror: (e) => { e.target.style.display = 'none'; }
                })
            ]);
            content.appendChild(cover);
        }

        // 元数据信息
        const info = createElement('div', { className: 'flex-1' }, [
            createElement('div', { className: 'flex items-start justify-between mb-4' }, [
                createElement('div', {}, [
                    createElement('h3', { className: 'text-2xl font-bold text-white mb-1' }, [metadata.title]),
                    metadata.alternativeTitles && metadata.alternativeTitles.length > 0
                        ? createElement('p', { className: 'text-gray-400 text-sm' }, [metadata.alternativeTitles.join(', ')])
                        : null
                ]),
                createElement('div', {
                    className: 'px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs font-bold'
                }, [metadata.source || 'local'])
            ]),

            createElement('div', { className: 'grid grid-cols-2 gap-4 mb-4' }, [
                createElement('div', {}, [
                    createElement('div', { className: 'text-gray-400 text-xs mb-1' }, ['Author']),
                    createElement('div', { className: 'text-white text-sm' }, [metadata.author || 'Unknown'])
                ]),
                createElement('div', {}, [
                    createElement('div', { className: 'text-gray-400 text-xs mb-1' }, ['Status']),
                    createElement('div', { className: 'text-white text-sm' }, [metadata.status || 'Unknown'])
                ]),
                createElement('div', {}, [
                    createElement('div', { className: 'text-gray-400 text-xs mb-1' }, ['Year']),
                    createElement('div', { className: 'text-white text-sm' }, [String(metadata.year || 'N/A')])
                ]),
                createElement('div', {}, [
                    createElement('div', { className: 'text-gray-400 text-xs mb-1' }, ['Match Score']),
                    createElement('div', { className: 'text-white text-sm' }, [`${Math.round((metadata.score || 0) * 100)}%`])
                ])
            ]),

            metadata.description
                ? createElement('p', { className: 'text-gray-300 text-sm mb-4 line-clamp-3' }, [metadata.description])
                : null,

            metadata.genres && metadata.genres.length > 0
                ? createElement('div', { className: 'flex flex-wrap gap-2 mb-4' },
                    metadata.genres.map(genre =>
                        createElement('span', {
                            className: 'px-2 py-1 bg-gray-700 text-gray-300 rounded text-xs'
                        }, [genre])
                    )
                )
                : null,

            createElement('button', {
                className: 'px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors',
                onclick: () => showApplyDialog(metadata, originalQuery)
            }, ['Apply to Manga'])
        ]);

        content.appendChild(info);
        card.appendChild(content);

        return card;
    }

    // 显示应用对话框
    async function showApplyDialog(metadata, originalQuery) {
        // 简单实现：让用户选择要应用的漫画
        const mangaId = prompt(`Enter Manga ID to apply this metadata to:\n(Searching for: ${originalQuery})`);

        if (!mangaId) return;

        try {
            await api.metadata.apply(mangaId, metadata);
            alert('Metadata applied successfully!');
        } catch (error) {
            alert(`Failed to apply metadata: ${error.message}`);
        }
    }

    return container;
}
