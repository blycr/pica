import { createElement } from '../utils/dom.js';
import { api } from '../api/client.js';
import { router } from '../utils/router.js';
import { Icons } from '../utils/icons.js';

export async function ReaderPage(params) {
    const { mangaId, chapterId } = params;

    // Main Container (Full screen)
    const container = createElement('div', {
        className: 'fixed inset-0 z-[100] bg-black flex flex-col h-screen w-screen focus:outline-none',
        tabIndex: 0
    });

    // Toolbar (Top)
    const toolbar = createElement('div', {
        className: 'h-16 bg-gradient-to-b from-black/80 to-transparent absolute top-0 w-full z-20 flex items-center px-6 justify-between opacity-0 hover:opacity-100 transition-opacity duration-300'
    }, [
        createElement('button', {
            className: 'text-white/80 hover:text-white flex items-center gap-2',
            onclick: () => router.navigate(`/manga/${mangaId}`)
        }, [
            createElement('div', { innerHTML: Icons.ChevronRight, className: 'transform rotate-180 w-6 h-6' }),
            createElement('span', { className: 'font-bold' }, ['Back'])
        ]),

        createElement('span', { className: 'text-gray-400 text-sm' }, ['Reader Mode'])
    ]);
    container.appendChild(toolbar);

    // Scrollable Image Area
    const scrollArea = createElement('div', {
        className: 'flex-1 overflow-y-auto w-full h-full bg-gray-900 scroll-smooth custom-scrollbar flex flex-col items-center py-10 gap-2'
    });

    // Loading State
    const loading = createElement('div', { className: 'text-white/50 animate-pulse mt-20' }, ['Loading pages...']);
    scrollArea.appendChild(loading);
    container.appendChild(scrollArea);

    // Fetch Pages & Logic
    try {
        // Fetch Manga details to get chapter list for navigation
        const mangaData = await api.manga.get(mangaId);

        // Sort chapters (redundant if API does it, but safe)
        const chapters = mangaData.chapters || [];
        const currentIndex = chapters.findIndex(c => c.id == chapterId);

        const prevChapter = currentIndex > 0 ? chapters[currentIndex - 1] : null;
        const nextChapter = currentIndex < chapters.length - 1 ? chapters[currentIndex + 1] : null;

        // Fetch pages for current chapter
        const pagesData = await fetchPages(mangaId, chapterId);

        // Clear Loading
        scrollArea.innerHTML = '';

        if (pagesData.pages.length === 0) {
            scrollArea.appendChild(createElement('div', { className: 'text-white text-xl mt-20' }, ['No pages found in this chapter.']));
        } else {
            // Render Images
            pagesData.pages.forEach(page => {
                const imgPath = encodeURIComponent(page.path);
                const imgUrl = `http://localhost:3000/api/image?path=${imgPath}`;

                const imgWrapper = createElement('div', { className: 'w-full max-w-4xl flex justify-center' }, [
                    createElement('img', {
                        src: imgUrl,
                        className: 'max-w-full h-auto shadow-2xl bg-gray-800 min-h-[500px] object-contain',
                        loading: 'lazy', // Native lazy load
                        alt: `Page ${page.page}`
                    })
                ]);
                scrollArea.appendChild(imgWrapper);
            });

            // Navigation Buttons (Bottom)
            const navContainer = createElement('div', { className: 'w-full max-w-4xl flex justify-between px-4 py-8 gap-4 mt-8' });

            // Prev Button
            if (prevChapter) {
                navContainer.appendChild(createElement('button', {
                    className: 'px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg flex items-center gap-2 transition-colors border border-white/10',
                    onclick: () => router.navigate(`/read/${mangaId}/${prevChapter.id}`)
                }, ['← Previous Chapter']));
            } else {
                navContainer.appendChild(createElement('div')); // Spacer
            }

            // Next Button
            if (nextChapter) {
                navContainer.appendChild(createElement('button', {
                    className: 'px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg flex items-center gap-2 transition-colors shadow-lg shadow-blue-500/20',
                    onclick: () => router.navigate(`/read/${mangaId}/${nextChapter.id}`)
                }, ['Next Chapter →']));

                // Preload next chapter data
                fetchPages(mangaId, nextChapter.id).catch(() => { });
            }

            scrollArea.appendChild(navContainer);
        }

        // --- Interaction Logic ---

        // 1. Keyboard Events
        container.onkeydown = (e) => {
            if (e.key === 'ArrowLeft' && prevChapter) {
                router.navigate(`/read/${mangaId}/${prevChapter.id}`);
            }
            if (e.key === 'ArrowRight' && nextChapter) {
                router.navigate(`/read/${mangaId}/${nextChapter.id}`);
            }
        };

        // 2. Mobile Gestures
        let touchStartX = 0;
        let touchStartY = 0;

        container.ontouchstart = (e) => {
            touchStartX = e.changedTouches[0].screenX;
            touchStartY = e.changedTouches[0].screenY;
        };

        container.ontouchend = (e) => {
            const touchEndX = e.changedTouches[0].screenX;
            const touchEndY = e.changedTouches[0].screenY;

            const diffX = touchEndX - touchStartX;
            const diffY = touchEndY - touchStartY;

            // Horizontal Swipe for Back Navigation (Swipe Right from Left Edge)
            // Condition: Start near left edge (< 40px), move right (> 100px), minimal vertical movement
            if (touchStartX < 40 && diffX > 100 && Math.abs(diffY) < 50) {
                router.navigate(`/manga/${mangaId}`);
            }
        };

        // 3. Double Tap to Zoom (Image Delegation)
        scrollArea.addEventListener('click', (e) => {
            // Find closest image wrapper or image
            const img = e.target.closest('img');
            if (!img) return;

            const currentTime = new Date().getTime();
            const tapLength = currentTime - (img.lastTap || 0);

            if (tapLength < 300 && tapLength > 0) {
                // Double Tap Detected
                e.preventDefault();

                if (img.style.transform === 'scale(2)') {
                    img.style.transform = 'scale(1)';
                    img.style.cursor = 'zoom-in';
                    img.style.transformOrigin = 'center center';
                } else {
                    img.style.transform = 'scale(2)';
                    img.style.cursor = 'zoom-out';
                    img.style.transition = 'transform 0.3s ease';
                }
            }
            img.lastTap = currentTime;
        });

        // Auto Focus
        setTimeout(() => container.focus(), 50);

    } catch (e) {
        scrollArea.innerHTML = '';
        scrollArea.appendChild(createElement('div', { className: 'text-red-500 mt-20' }, [e.message]));
        console.error(e);
    }

    return container;
}

// Helper to fetch pages
async function fetchPages(mangaId, chapterId) {
    // This calls GET /api/manga/:id/chapters/:chapterId/pages
    const res = await fetch(`http://localhost:3000/api/manga/${mangaId}/chapters/${chapterId}/pages`);
    if (!res.ok) throw new Error('Failed to load pages');
    return await res.json();
}
