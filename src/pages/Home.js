import { createElement } from '../utils/dom.js';
import { api } from '../api/client.js';
import { router } from '../utils/router.js';
import { MangaCard } from '../components/MangaCard.js';

export async function HomePage() {
    const container = createElement('div', { className: 'w-full max-w-7xl mx-auto' });

    // 页面标题
    const header = createElement('div', { className: 'mb-8' }, [
        createElement('h2', { className: 'text-3xl font-bold text-white mb-2' }, ['Welcome Back']),
        createElement('p', { className: 'text-gray-400' }, ['Continue your reading journey'])
    ]);
    container.appendChild(header);

    // 继续阅读部分
    const continueReadingSection = createElement('div', { className: 'mb-12' });
    container.appendChild(continueReadingSection);

    // 收藏夹部分
    const favoritesSection = createElement('div', { className: 'mb-12' });
    container.appendChild(favoritesSection);

    // 最近添加部分
    const recentSection = createElement('div', { className: 'mb-12' });
    container.appendChild(recentSection);

    // 加载继续阅读数据
    try {
        const continueReading = await api.history.continueReading(6);

        if (continueReading && continueReading.length > 0) {
            continueReadingSection.appendChild(
                createElement('div', { className: 'mb-6' }, [
                    createElement('div', { className: 'flex items-center justify-between mb-4' }, [
                        createElement('h3', { className: 'text-xl font-bold text-white' }, ['Continue Reading']),
                        createElement('button', {
                            className: 'text-sm text-blue-400 hover:text-blue-300 transition-colors',
                            onclick: () => router.navigate('/history')
                        }, ['View All →'])
                    ])
                ])
            );

            const grid = createElement('div', {
                className: 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4'
            });

            continueReading.forEach(item => {
                const card = createContinueReadingCard(item);
                grid.appendChild(card);
            });

            continueReadingSection.appendChild(grid);
        }
    } catch (error) {
        console.error('Failed to load continue reading:', error);
    }

    // 加载收藏夹数据
    try {
        const favoritesData = await api.history.favorites(12);

        if (favoritesData && favoritesData.data && favoritesData.data.length > 0) {
            favoritesSection.appendChild(
                createElement('div', { className: 'mb-6' }, [
                    createElement('div', { className: 'flex items-center justify-between mb-4' }, [
                        createElement('h3', { className: 'text-xl font-bold text-white' }, ['My Favorites']),
                        createElement('button', {
                            className: 'text-sm text-blue-400 hover:text-blue-300 transition-colors',
                            onclick: () => router.navigate('/favorites')
                        }, ['View All →'])
                    ])
                ])
            );

            const grid = createElement('div', {
                className: 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4'
            });

            favoritesData.data.forEach(manga => {
                grid.appendChild(MangaCard(manga));
            });

            favoritesSection.appendChild(grid);
        }
    } catch (error) {
        console.error('Failed to load favorites:', error);
    }

    // 加载最近添加
    try {
        const recentData = await api.search.advanced({
            sortBy: 'created_at',
            sortOrder: 'desc',
            limit: 12
        });

        if (recentData && recentData.data && recentData.data.length > 0) {
            recentSection.appendChild(
                createElement('div', { className: 'mb-6' }, [
                    createElement('div', { className: 'flex items-center justify-between mb-4' }, [
                        createElement('h3', { className: 'text-xl font-bold text-white' }, ['Recently Added']),
                        createElement('button', {
                            className: 'text-sm text-blue-400 hover:text-blue-300 transition-colors',
                            onclick: () => router.navigate('/library')
                        }, ['Browse Library →'])
                    ])
                ])
            );

            const grid = createElement('div', {
                className: 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4'
            });

            recentData.data.forEach(manga => {
                grid.appendChild(MangaCard(manga));
            });

            recentSection.appendChild(grid);
        }
    } catch (error) {
        console.error('Failed to load recent manga:', error);
    }

    return container;
}

/**
 * 创建继续阅读卡片
 */
function createContinueReadingCard(item) {
    const progressPercent = (item.progress || 0) * 100;

    const card = createElement('div', {
        className: 'glass-card rounded-xl overflow-hidden cursor-pointer group hover:scale-105 transition-transform duration-300',
        onclick: () => {
            // 直接跳转到上次阅读的章节和页面
            if (item.chapter_id) {
                router.navigate(`/read/${item.id}/${item.chapter_id}?page=${item.page_number || 1}`);
            } else {
                router.navigate(`/manga/${item.id}`);
            }
        }
    });

    // 封面图片
    const coverUrl = item.cover_path
        ? `http://localhost:3000/api/image?path=${encodeURIComponent(item.cover_path)}`
        : 'https://via.placeholder.com/300x400?text=No+Cover';

    const cover = createElement('div', {
        className: 'relative aspect-[3/4] bg-gray-800 overflow-hidden'
    });

    const img = createElement('img', {
        src: coverUrl,
        alt: item.title,
        className: 'w-full h-full object-cover group-hover:scale-110 transition-transform duration-300',
        loading: 'lazy'
    });
    cover.appendChild(img);

    // 进度条
    const progressBar = createElement('div', {
        className: 'absolute bottom-0 left-0 right-0 h-1 bg-gray-700'
    }, [
        createElement('div', {
            className: 'h-full bg-blue-500 transition-all',
            style: `width: ${progressPercent}%`
        })
    ]);
    cover.appendChild(progressBar);

    // 继续阅读标签
    const badge = createElement('div', {
        className: 'absolute top-2 right-2 px-2 py-1 bg-blue-600/90 backdrop-blur-sm rounded text-xs font-bold text-white'
    }, ['Continue']);
    cover.appendChild(badge);

    card.appendChild(cover);

    // 信息区域
    const info = createElement('div', { className: 'p-3' }, [
        createElement('h4', {
            className: 'text-white font-medium text-sm mb-1 truncate group-hover:text-blue-400 transition-colors'
        }, [item.title]),
        createElement('p', {
            className: 'text-gray-400 text-xs truncate'
        }, [item.chapter_title || `Chapter ${item.chapter_number || '?'}`])
    ]);
    card.appendChild(info);

    return card;
}
