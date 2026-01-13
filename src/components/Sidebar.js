import { createElement } from '../utils/dom.js';
import { Icons } from '../utils/icons.js';
import { router } from '../utils/router.js';

export function Sidebar() {
    // State to track active button
    let activeName = 'Home';

    const navItems = [
        { name: 'Home', path: '/', icon: Icons.Home },
        { name: 'Library', path: '/library', icon: Icons.Library },
        { name: 'Libraries', path: '/libraries', icon: Icons.Folder },
        { name: 'Metadata', path: '/metadata', icon: Icons.Tag },
        { name: 'Settings', path: '/settings', icon: Icons.Settings }
    ];

    const navElements = navItems.map(item => {
        const btn = createElement('button', {
            className: `w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group text-gray-400 hover:bg-white/5 hover:text-white`,
            onclick: () => {
                // Update UI state
                navElements.forEach(b => {
                    b.className = 'w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group text-gray-400 hover:bg-white/5 hover:text-white';
                });
                btn.className = 'w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group bg-blue-600 shadow-lg shadow-blue-500/30 text-white';

                // Navigate
                router.navigate(item.path);
            }
        });

        // Use innerHTML for icon + text
        btn.innerHTML = `${item.icon}<span class="font-medium tracking-wide">${item.name}</span>`;

        // Set initial active state
        if (item.name === activeName) {
            btn.className = 'w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group bg-blue-600 shadow-lg shadow-blue-500/30 text-white';
        }

        return btn;
    });

    return createElement('aside', {
        className: 'w-64 h-full glass-panel flex flex-col p-6 z-50 flex-shrink-0'
    }, [
        // Brand
        createElement('div', { className: 'flex items-center gap-3 mb-10 px-2' }, [
            createElement('div', { className: 'w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-500 to-cyan-400 flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20' }, ['P']),
            createElement('span', { className: 'text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400' }, ['Pica Manga'])
        ]),

        // Navigation
        createElement('nav', { className: 'flex-1 space-y-2' }, navElements),

        // Bottom Actions
        createElement('div', { className: 'mt-auto pt-6 border-t border-white/5' }, [
            createElement('button', {
                className: 'w-full flex items-center gap-3 px-4 py-3 text-gray-400 hover:text-white transition-colors'
            }, [
                createElement('div', { innerHTML: Icons.Moon, className: 'w-5 h-5' }),
                createElement('span', { className: 'text-sm font-medium' }, ['Dark Mode'])
            ])
        ])
    ]);
}
