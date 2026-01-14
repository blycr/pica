export const theme = {
    // 初始化主题
    init() {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'light' || (!savedTheme && window.matchMedia('(prefers-color-scheme: light)').matches)) {
            document.documentElement.classList.remove('dark');
            return 'light';
        } else {
            document.documentElement.classList.add('dark');
            return 'dark';
        }
    },

    // 切换主题
    toggle() {
        if (document.documentElement.classList.contains('dark')) {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
            return 'light';
        } else {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
            return 'dark';
        }
    },

    // 获取当前主题
    get() {
        return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    }
};
