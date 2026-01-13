import { createElement } from '../utils/dom.js';
import { api } from '../api/client.js';
import { router } from '../utils/router.js';
import { MangaCard } from '../components/MangaCard.js';
import { Icons } from '../utils/icons.js';

export async function LibraryPage() {
    const container = createElement('div', { className: 'w-full max-w-7xl mx-auto' });

    // State
    const state = {
        keyword: '',
        sortField: 'created_at',
        sortOrder: 'desc',
        searchTags: [],
        page: 1,
        limit: 20,
        hasMore: true,
        loading: false,
        allTags: []
    };

    // --- Header Section ---
    const header = createElement('div', { className: 'flex flex-col gap-6 mb-8' });

    // Top Bar showing Title + Basic Actions
    const topBar = createElement('div', { className: 'flex flex-col md:flex-row md:items-center justify-between gap-4' }, [
        createElement('h2', { className: 'text-3xl font-bold text-white' }, ['My Library']),

        createElement('div', { className: 'flex flex-wrap gap-2' }, [
            // Search Input
            createElement('input', {
                type: 'text',
                placeholder: 'Search by title...',
                className: 'px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500 w-64',
                oninput: debounce((e) => {
                    state.keyword = e.target.value;
                    resetAndLoad();
                }, 500)
            }),

            // Filter Toggle Button
            createElement('button', {
                className: 'px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white rounded-lg flex items-center gap-2 transition-colors',
                onclick: () => {
                    const panel = document.getElementById('filter-panel');
                    panel.classList.toggle('hidden');
                    panel.classList.toggle('flex');
                }
            }, [
                createElement('span', {}, ['Filters']),
                createElement('div', { className: 'w-4 h-4', innerHTML: Icons.ChevronDown || 'V' }) // Reuse icon or text
            ]),

            // Scan Button
            createElement('button', {
                className: 'px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors',
                onclick: async () => {
                    const path = prompt('Enter folder path to scan:', './data');
                    if (!path) return;
                    try {
                        alert('Scan started in background...');
                        await api.scanner.scan({ path });
                        setTimeout(resetAndLoad, 1000); // Reload after short delay
                    } catch (e) {
                        alert(`Scan failed: ${e.message}`);
                    }
                }
            }, ['Scan'])
        ])
    ]);
    header.appendChild(topBar);

    // --- Filter Panel (Hidden by default) ---
    const filterPanel = createElement('div', {
        id: 'filter-panel',
        className: 'hidden flex-col bg-gray-800/50 border border-white/10 rounded-xl p-6 backdrop-blur-md animate-fade-in'
    });

    // 1. Sort Options
    const sortSection = createElement('div', { className: 'mb-6' }, [
        createElement('h4', { className: 'text-gray-400 text-xs font-bold uppercase tracking-wider mb-3' }, ['Sort By']),
        createElement('div', { className: 'flex gap-4' }, [
            createSortButton('Recently Added', 'created_at', state),
            createSortButton('Recently Updated', 'updated_at', state),
            createSortButton('Title (A-Z)', 'title', state)
        ])
    ]);
    filterPanel.appendChild(sortSection);

    // 2. Tags Section
    const tagsContainer = createElement('div', { className: 'flex flex-wrap gap-2' });
    const tagsSection = createElement('div', {}, [
        createElement('h4', { className: 'text-gray-400 text-xs font-bold uppercase tracking-wider mb-3' }, ['Filter by Tags']),
        tagsContainer
    ]);
    filterPanel.appendChild(tagsSection);

    header.appendChild(filterPanel);
    container.appendChild(header);


    // --- Grid Container ---
    const grid = createElement('div', {
        className: 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6'
    });
    container.appendChild(grid);

    // --- Loading Indicator / Infinite Scroll Trigger ---
    const loadMoreTrigger = createElement('div', { className: 'w-full py-10 flex justify-center' });
    container.appendChild(loadMoreTrigger);


    // --- Functions ---

    function createSortButton(label, field, state) {
        const btn = createElement('button', {
            className: `px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${state.sortField === field ? 'bg-blue-600 border-blue-600 text-white' : 'bg-transparent border-gray-600 text-gray-400 hover:text-white'}`,
            onclick: () => {
                // Toggle active state visualization manually or re-render?
                // For simplicity, we just update state and reload. Visualization updates on reload logic if we re-render panel, 
                // but here we are static. Let's simple-reload.
                state.sortField = field;

                // Update sibling buttons classes (DOM manipulation for simplicity)
                const parent = btn.parentElement;
                Array.from(parent.children).forEach(child => {
                    child.className = `px-4 py-2 rounded-lg text-sm font-medium transition-colors border bg-transparent border-gray-600 text-gray-400 hover:text-white`;
                });
                btn.className = 'px-4 py-2 rounded-lg text-sm font-medium transition-colors border bg-blue-600 border-blue-600 text-white';

                resetAndLoad();
            }
        }, [label]);
        return btn;
    }

    function renderTags() {
        tagsContainer.innerHTML = '';
        state.allTags.forEach(tag => {
            const isActive = state.searchTags.includes(tag.name);
            const tagBtn = createElement('button', {
                className: `px-3 py-1 rounded-full text-xs font-medium transition-colors border ${isActive ? 'bg-blue-500/20 border-blue-500 text-blue-300' : 'bg-gray-700 border-transparent text-gray-300 hover:bg-gray-600'}`,
                onclick: () => {
                    if (isActive) {
                        state.searchTags = state.searchTags.filter(t => t !== tag.name);
                    } else {
                        state.searchTags.push(tag.name);
                    }
                    renderTags(); // Re-render to update UI
                    resetAndLoad();
                }
            }, [`#${tag.name} (${tag.manga_count || 0})`]);
            tagsContainer.appendChild(tagBtn);
        });

        if (state.allTags.length === 0) {
            tagsContainer.innerHTML = '<span class="text-gray-500 text-sm">No tags found.</span>';
        }
    }

    async function loadManga(append = false) {
        if (state.loading) return;
        state.loading = true;

        if (!append) {
            grid.innerHTML = '';
            loadMoreTrigger.innerHTML = '<div class="text-blue-500 animate-pulse">Loading...</div>';
        } else {
            loadMoreTrigger.innerHTML = '<div class="text-gray-500 animate-pulse text-sm">Loading more...</div>';
        }

        try {
            const payload = {
                keyword: state.keyword,
                tags: state.searchTags,
                sortBy: state.sortField,
                sortOrder: state.sortOrder,
                page: state.page,
                limit: state.limit
            };

            const response = await api.search.advanced(payload);
            const mangaList = response.data || [];

            if (mangaList.length < state.limit) {
                state.hasMore = false;
                loadMoreTrigger.innerHTML = '<div class="text-gray-600 text-sm italic">You reached the end.</div>';
            } else {
                state.hasMore = true;
                // Keep the target empty/invisible so observer can trigger
                loadMoreTrigger.innerHTML = '';
            }

            if (mangaList.length === 0 && !append) {
                grid.innerHTML = `
                    <div class="col-span-full text-center py-20">
                        <div class="text-gray-500 text-lg mb-2">No manga found</div>
                        <div class="text-gray-600 text-sm">Try adjusting your filters.</div>
                    </div>`;
            } else {
                mangaList.forEach(manga => {
                    grid.appendChild(MangaCard(manga));
                });
            }

        } catch (error) {
            console.error(error);
            if (!append) grid.innerHTML = `<div class="col-span-full text-center py-20 text-red-500">Error: ${error.message}</div>`;
        } finally {
            state.loading = false;
        }
    }

    function resetAndLoad() {
        state.page = 1;
        state.hasMore = true;
        loadManga(false);
    }

    // --- Init ---

    // 1. Fetch Tags
    try {
        const tags = await api.tags.list();
        state.allTags = tags;
        renderTags();
    } catch (e) {
        console.warn('Failed to fetch tags', e);
    }

    // 2. Initial Load
    await loadManga();

    // 3. Setup Observer for Infinite Scroll
    const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && state.hasMore && !state.loading) {
            state.page++;
            loadManga(true);
        }
    }, { rootMargin: '200px' });

    observer.observe(loadMoreTrigger);

    return container;
}

// Utility: Debounce
function debounce(func, wait) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}
