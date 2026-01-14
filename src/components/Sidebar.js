import { createElement } from '../utils/dom.js';
import { Icons } from '../utils/icons.js';
import { router } from '../utils/router.js';


export function Sidebar() {
    // State to track active button
    let activeName = 'Home';



    const navItems = [
        { name: 'Home', path: '/', icon: Icons.Home },
        { name: 'Library', path: '/library', icon: Icons.Library },
        { name: 'Location', path: '/libraries', icon: Icons.Folder },
        { name: 'Meta', path: '/metadata', icon: Icons.Tag },
        { name: 'Settings', path: '/settings', icon: Icons.Settings }
    ];

    const navElements = navItems.map(item => {
        const btn = createElement('button', {
            className: `
                flex items-center justify-center
                md:w-full md:justify-start md:gap-3 md:px-4 md:py-3 md:rounded-xl 
                flex-col gap-1 p-2 rounded-lg
                transition-all duration-200 group text-gray-400 hover:bg-white/5 hover:text-white
            `,
            onclick: () => {
                // Update UI state
                navElements.forEach(b => {
                    b.className = `
                        flex items-center justify-center
                        md:w-full md:justify-start md:gap-3 md:px-4 md:py-3 md:rounded-xl 
                        flex-col gap-1 p-2 rounded-lg
                        transition-all duration-200 group text-gray-400 hover:bg-white/5 hover:text-white
                    `;
                });
                btn.className = `
                    flex items-center justify-center
                    md:w-full md:justify-start md:gap-3 md:px-4 md:py-3 md:rounded-xl 
                    flex-col gap-1 p-2 rounded-lg
                    transition-all duration-200 group bg-blue-600 shadow-lg shadow-blue-500/30 text-white
                `;

                // Navigate
                router.navigate(item.path);
            }
        });

        // Use innerHTML for icon + text
        btn.innerHTML = `
            <span class="w-6 h-6">${item.icon}</span>
            <span class="text-[10px] md:text-base font-medium tracking-wide">${item.name}</span>
        `;

        // Set initial active state
        if (item.name === activeName) {
            btn.className = `
                flex items-center justify-center
                md:w-full md:justify-start md:gap-3 md:px-4 md:py-3 md:rounded-xl 
                flex-col gap-1 p-2 rounded-lg
                transition-all duration-200 group bg-blue-600 shadow-lg shadow-blue-500/30 text-white
            `;
        }

        return btn;
    });



    return createElement('aside', {
        className: `
            fixed bottom-0 left-0 w-full h-16 z-50 glass-panel border-t border-white/10
            flex flex-row items-center justify-around px-2
            md:relative md:w-64 md:h-full md:flex-col md:p-6 md:border-r md:border-t-0 md:justify-start
        `
    }, [
        // Brand (Desktop Only)
        createElement('div', { className: 'hidden md:flex items-center gap-3 mb-10 px-2' }, [
            createElement('div', { className: 'w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-500 to-cyan-400 flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20' }, ['P']),
            createElement('span', { className: 'text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400' }, ['Pica Manga'])
        ]),

        // Navigation
        createElement('nav', { className: 'flex-1 flex flex-row w-full justify-around md:flex-col md:space-y-2 md:justify-start' }, navElements),

        // Bottom Actions (Desktop Only)
        createElement('div', { className: 'hidden md:block mt-auto pt-6 border-t border-white/5' }, [

        ])
    ]);
}
