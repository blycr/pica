import { createElement } from '../utils/dom.js';
import { api } from '../api/client.js';
import { router } from '../utils/router.js';
import { Icons } from '../utils/icons.js';

export async function MangaDetailsPage(params) {
    const { id } = params;

    const container = createElement('div', {
        className: 'w-full max-w-5xl mx-auto pb-20 animate-fade-in'
    });

    try {
        const data = await api.manga.get(id);
        const manga = data;
        // API response: { ...manga, chapters: [], tags: [], lastRead: ... }

        // Back Button
        const backBtn = createElement('button', {
            className: 'flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors',
            onclick: () => router.navigate('/library')
        }, [
            createElement('div', { innerHTML: Icons.ChevronRight, className: 'transform rotate-180 w-5 h-5' }),
            createElement('span', { className: 'font-medium' }, ['Back to Library'])
        ]);
        container.appendChild(backBtn);

        // Header Section
        const header = createElement('div', { className: 'flex flex-col md:flex-row gap-8 mb-12' }, [
            // Cover
            // Cover
            createElement('div', {
                className: 'w-full md:w-64 h-96 rounded-xl overflow-hidden glass-card shadow-2xl flex-shrink-0 relative group'
            }, [
                manga.cover_path ? createElement('img', {
                    src: api.thumbnails.generate(manga.cover_path, 'large'),
                    className: 'absolute inset-0 w-full h-full object-cover',
                    alt: manga.title,
                    onerror: (e) => {
                        e.target.style.display = 'none';
                        e.target.parentElement.querySelector('.fallback-placeholder').style.display = 'block';
                    }
                }) : null,

                // Placeholder / Fallback
                createElement('div', {
                    className: `fallback-placeholder w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600 opacity-80`,
                    style: manga.cover_path ? 'display: none;' : ''
                }),

                createElement('div', {
                    className: 'absolute inset-0 flex items-center justify-center text-white/20 font-bold text-6xl pointer-events-none'
                }, [manga.title[0]])
            ]),

            // Info
            createElement('div', { className: 'flex-1 flex flex-col' }, [
                createElement('h1', { className: 'text-4xl font-bold text-white mb-4 leading-tight' }, [manga.title]),

                // Tags
                createElement('div', { className: 'flex flex-wrap gap-2 mb-6' },
                    (manga.tags || []).map(tag => createElement('span', {
                        className: 'px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30'
                    }, [`#${tag.name}`]))
                ),

                // Stats / Meta
                createElement('div', { className: 'grid grid-cols-3 gap-4 mb-8 max-w-md' }, [
                    createStatItem('Chapters', manga.chapters.length),
                    createStatItem('Status', 'Ongoing'), // Mock
                    createStatItem('Source', manga.path ? 'Local' : 'Web')
                ]),

                // Action Buttons
                createElement('div', { className: 'flex gap-4 mt-auto' }, [
                    createElement('button', {
                        className: 'px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold shadow-lg shadow-blue-600/30 transition-all active:scale-95',
                        onclick: () => {
                            if (manga.chapters.length > 0) {
                                // Start reading first chapter
                                router.navigate(`/read/${manga.id}/${manga.chapters[0].id}`);
                            }
                        }
                    }, ['Start Reading']),

                    createElement('button', {
                        className: 'px-6 py-3 glass hover:bg-white/10 text-white rounded-lg font-bold transition-all'
                    }, ['Favorite'])
                ])
            ])
        ]);
        container.appendChild(header);

        // Chapter List
        const chapterSection = createElement('div', { className: 'glass-panel rounded-2xl p-6' }, [
            createElement('h3', { className: 'text-xl font-bold text-white mb-6' }, ['Chapters']),
            createElement('div', { className: 'space-y-2' },
                manga.chapters.map(chapter => createChapterItem(manga, chapter))
            )
        ]);
        container.appendChild(chapterSection);

    } catch (error) {
        console.error(error);
        container.innerHTML = `<div class="p-10 text-center text-red-500">Error loading details: ${error.message}</div>`;
    }

    return container;
}

function createStatItem(label, value) {
    return createElement('div', { className: 'flex flex-col' }, [
        createElement('span', { className: 'text-gray-400 text-xs uppercase tracking-wider' }, [label]),
        createElement('span', { className: 'text-white font-semibold text-lg' }, [String(value)])
    ]);
}

function createChapterItem(manga, chapter) {
    return createElement('div', {
        className: 'flex items-center justify-between p-4 rounded-xl hover:bg-white/5 cursor-pointer transition-colors group border border-transparent hover:border-white/5',
        onclick: () => {
            router.navigate(`/read/${manga.id}/${chapter.id}`);
        }
    }, [
        createElement('div', { className: 'flex items-center gap-4' }, [
            createElement('div', { className: 'w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-gray-400 font-medium group-hover:bg-blue-600 group-hover:text-white transition-colors' }, [String(chapter.chapter_number)]),
            createElement('span', { className: 'text-gray-200 font-medium group-hover:text-white' }, [chapter.title || `Chapter ${chapter.chapter_number}`])
        ]),
        createElement('span', { className: 'text-gray-500 text-sm' }, ['Read >'])
    ]);
}
