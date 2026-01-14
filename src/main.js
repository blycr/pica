import { createElement } from './utils/dom.js';
import { Sidebar } from './components/Sidebar.js';
import { LibraryPage } from './pages/Library.js';
import { HomePage } from './pages/Home.js';
import { router, matchRoute } from './utils/router.js';
import { theme } from './utils/theme.js';
import './main.css';

// Initialize Theme
theme.init();

// Simple Home Component (Inline for now)
// Removed - now using HomePage from pages/Home.js

function createCard(title, subtitle, detail) {
    return createElement('div', {
        className: 'glass-card p-6 rounded-2xl h-64 flex flex-col justify-end relative overflow-hidden group cursor-pointer'
    }, [
        createElement('div', { className: 'absolute inset-0 bg-gradient-to-t from-black/80 to-transparent z-10' }),
        createElement('h3', { className: 'relative z-20 text-gray-400 text-xs font-bold uppercase tracking-wider mb-1' }, [title]),
        createElement('h2', { className: 'relative z-20 text-2xl font-bold text-white mb-1 group-hover:text-blue-400 transition-colors' }, [subtitle]),
        createElement('p', { className: 'relative z-20 text-gray-300 transform translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300' }, [detail])
    ]);
}

function App() {
    const sidebar = Sidebar();

    // Main Content Container
    const contentArea = createElement('div', {
        // Updated padding for mobile bottom bar (pb-24) and desktop (pb-10)
        className: 'w-full h-full overflow-y-auto pt-20 px-4 md:px-8 pb-24 md:pb-10 custom-scrollbar'
    });

    // Wrapper for Main Content
    const mainWrapper = createElement('main', {
        className: 'flex-1 h-full overflow-hidden relative flex flex-col'
    }, [
        // Header (Global) - Added pointer-events-none to container and auto to children so it doesn't block clicks if transparent
        createElement('header', { className: 'h-16 w-full flex items-center justify-between px-4 md:px-8 absolute top-0 z-40 bg-gradient-to-b from-gray-900/80 to-transparent pointer-events-none' }, [
            createElement('h1', { id: 'page-title', className: 'text-2xl font-bold text-white pointer-events-auto' }, ['Home']),
            createElement('div', { className: 'flex items-center gap-4 pointer-events-auto' }, [
                createElement('div', { className: 'w-10 h-10 rounded-full bg-gray-800 border border-white/10' })
            ])
        ]),
        contentArea
    ]);

    // Router Logic
    const handleRoute = async (path) => {
        // Simple Route Matching Logic
        const { MangaDetailsPage } = await import('./pages/MangaDetails.js');
        const { ReaderPage } = await import('./pages/Reader.js');

        // Reset Layout (Show sidebar by default)
        sidebar.style.display = 'flex';
        mainWrapper.style.display = 'flex';
        if (document.getElementById('reader-overlay')) {
            document.getElementById('reader-overlay').remove();
        }

        const pageTitle = document.getElementById('page-title');
        contentArea.innerHTML = '';
        contentArea.scrollTop = 0;

        let params;

        // Route: Home
        if (path === '/') {
            if (pageTitle) pageTitle.textContent = 'Home';
            contentArea.appendChild(await HomePage());
            return;
        }

        // Route: Library
        if (path === '/library') {
            if (pageTitle) pageTitle.textContent = 'Library';
            contentArea.appendChild(await LibraryPage());
            return;
        }

        // Route: Settings
        if (path === '/settings') {
            const { SettingsPage } = await import('./pages/Settings.js');
            if (pageTitle) pageTitle.textContent = 'Settings';
            contentArea.appendChild(await SettingsPage());
            return;
        }

        // Route: Libraries
        if (path === '/libraries') {
            const { LibrariesPage } = await import('./pages/Libraries.js');
            if (pageTitle) pageTitle.textContent = 'Libraries';
            contentArea.appendChild(await LibrariesPage());
            return;
        }

        // Route: Metadata
        if (path === '/metadata') {
            const { MetadataPage } = await import('./pages/Metadata.js');
            if (pageTitle) pageTitle.textContent = 'Metadata';
            contentArea.appendChild(await MetadataPage());
            return;
        }

        // Route: Manga Details
        if ((params = matchRoute('/manga/:id', path))) {
            if (pageTitle) pageTitle.textContent = 'Manga Details';
            contentArea.appendChild(await MangaDetailsPage(params));
            return;
        }

        // Route: Reader
        if ((params = matchRoute('/read/:mangaId/:chapterId', path))) {
            const readerEl = await ReaderPage(params);
            readerEl.id = 'reader-overlay';
            document.body.appendChild(readerEl);
            return;
        }

        // 404
        contentArea.innerHTML = '<div class="text-white mt-10 ml-4">404 - Page Not Found</div>';
    };

    router.subscribe(handleRoute);

    // Init Route
    handleRoute('/');

    return createElement('div', { className: 'flex w-full h-full' }, [
        sidebar,
        mainWrapper
    ]);
}

// Mount App
const appContainer = document.querySelector('#app');
if (appContainer) {
    appContainer.innerHTML = '';
    appContainer.appendChild(App());
}
