import { createElement } from '../utils/dom.js';
import { api } from '../api/client.js';
import { router } from '../utils/router.js';


export function MangaCard(manga) {
    // 随机渐变背景，作为缺省封面
    const gradients = [
        'from-purple-500 to-pink-500',
        'from-blue-500 to-teal-400',
        'from-red-500 to-orange-500',
        'from-emerald-500 to-cyan-500'
    ];
    const randomGradient = gradients[Math.floor(Math.random() * gradients.length)];

    // Cover Image Logic
    let coverElement;
    if (manga.cover_path) {
        const thumbUrl = api.thumbnails.generate(manga.cover_path, 'medium');
        coverElement = createElement('img', {
            src: thumbUrl,
            className: 'absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110',
            loading: 'lazy',
            alt: manga.title,
            onerror: (e) => {
                // Return to gradient if load fails
                e.target.style.display = 'none';
                e.target.parentElement.querySelector('.fallback-gradient').style.display = 'block';
            }
        });
    }

    // Fallback Gradient (always created but maybe hidden)
    const fallbackGradient = createElement('div', {
        className: `fallback-gradient absolute inset-0 bg-gradient-to-br ${randomGradient} opacity-60 group-hover:opacity-80 transition-opacity duration-300`,
        style: manga.cover_path ? 'display: none;' : '' // Hide if we have a cover initially
    });

    return createElement('div', {
        className: 'glass-card relative rounded-xl h-72 overflow-hidden group cursor-pointer flex flex-col justify-end p-4',
        onclick: () => {
            router.navigate(`/manga/${manga.id}`);
        }
    }, [
        coverElement || null, // Image if exists
        fallbackGradient,     // Gradient fallback
        createElement('div', { className: 'absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent opacity-90' }), // Gradient overlay

        // Content
        createElement('div', { className: 'relative z-10' }, [
            createElement('h3', {
                className: 'text-lg font-bold text-white leading-tight mb-1 line-clamp-2 group-hover:text-blue-300 transition-colors'
            }, [manga.title]),

            createElement('div', { className: 'flex items-center gap-2 text-xs text-gray-400' }, [
                createElement('span', { className: 'bg-white/10 px-2 py-0.5 rounded' }, [manga.path ? 'Local' : 'Web']),
                // 假装有一些 tags，如果 DB 没返回 tags 字段
                ...(manga.tags || []).map(tag => createElement('span', {}, [`#${tag.name}`]))
            ])
        ])
    ]);
}
