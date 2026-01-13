import { createElement } from '../utils/dom.js';
import { api } from '../api/client.js';
import { router } from '../utils/router.js';

export async function LibrariesPage() {
    const container = createElement('div', { className: 'w-full max-w-7xl mx-auto' });

    // 页面标题和添加按钮
    const header = createElement('div', { className: 'flex items-center justify-between mb-8' }, [
        createElement('div', {}, [
            createElement('h2', { className: 'text-3xl font-bold text-white mb-2' }, ['Libraries']),
            createElement('p', { className: 'text-gray-400' }, ['Manage your manga collections'])
        ]),
        createElement('button', {
            className: 'px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors flex items-center gap-2',
            onclick: () => showAddLibraryDialog()
        }, ['+ Add Library'])
    ]);
    container.appendChild(header);

    // 书库列表容器
    const librariesGrid = createElement('div', {
        className: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
    });
    container.appendChild(librariesGrid);

    // 加载书库列表
    async function loadLibraries() {
        librariesGrid.innerHTML = '<div class="col-span-full text-center py-10 text-gray-500">Loading...</div>';

        try {
            const libraries = await api.libraries.list();

            librariesGrid.innerHTML = '';

            if (libraries.length === 0) {
                librariesGrid.innerHTML = `
                    <div class="col-span-full text-center py-20">
                        <div class="text-gray-500 text-lg mb-2">No libraries found</div>
                        <div class="text-gray-600 text-sm">Click "Add Library" to create your first library</div>
                    </div>
                `;
                return;
            }

            libraries.forEach(library => {
                librariesGrid.appendChild(createLibraryCard(library));
            });
        } catch (error) {
            librariesGrid.innerHTML = `<div class="col-span-full text-center py-20 text-red-500">Error: ${error.message}</div>`;
        }
    }

    // 创建书库卡片
    function createLibraryCard(library) {
        const card = createElement('div', {
            className: 'glass-card p-6 rounded-xl hover:scale-105 transition-transform duration-300'
        });

        // 书库信息
        const info = createElement('div', { className: 'mb-4' }, [
            createElement('div', { className: 'flex items-start justify-between mb-2' }, [
                createElement('h3', { className: 'text-xl font-bold text-white' }, [library.name]),
                createElement('div', {
                    className: `px-2 py-1 rounded text-xs font-bold ${library.is_active ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`
                }, [library.is_active ? 'Active' : 'Inactive'])
            ]),
            createElement('p', { className: 'text-gray-400 text-sm mb-2' }, [library.description || 'No description']),
            createElement('p', { className: 'text-gray-500 text-xs font-mono truncate' }, [library.path])
        ]);
        card.appendChild(info);

        // 统计信息
        const stats = createElement('div', { className: 'grid grid-cols-2 gap-4 mb-4 p-4 bg-gray-800/50 rounded-lg' }, [
            createElement('div', {}, [
                createElement('div', { className: 'text-gray-400 text-xs mb-1' }, ['Manga']),
                createElement('div', { className: 'text-white text-2xl font-bold' }, [String(library.manga_count || 0)])
            ]),
            createElement('div', {}, [
                createElement('div', { className: 'text-gray-400 text-xs mb-1' }, ['Created']),
                createElement('div', { className: 'text-white text-sm' }, [formatDate(library.created_at)])
            ])
        ]);
        card.appendChild(stats);

        // 操作按钮
        const actions = createElement('div', { className: 'flex gap-2' }, [
            createElement('button', {
                className: 'flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors',
                onclick: () => router.navigate(`/library?libraryId=${library.id}`)
            }, ['Browse']),
            createElement('button', {
                className: 'px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors',
                onclick: () => showEditLibraryDialog(library)
            }, ['Edit']),
            createElement('button', {
                className: 'px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm transition-colors',
                onclick: async () => {
                    if (confirm(`Are you sure you want to delete "${library.name}"?`)) {
                        try {
                            await api.libraries.delete(library.id);
                            await loadLibraries();
                        } catch (error) {
                            alert(`Failed to delete: ${error.message}`);
                        }
                    }
                }
            }, ['Delete'])
        ]);
        card.appendChild(actions);

        return card;
    }

    // 显示添加书库对话框
    function showAddLibraryDialog() {
        const name = prompt('Library Name:');
        if (!name) return;

        const path = prompt('Library Path:');
        if (!path) return;

        const description = prompt('Description (optional):') || '';

        api.libraries.create({ name, path, description })
            .then(() => loadLibraries())
            .catch(error => alert(`Failed to create library: ${error.message}`));
    }

    // 显示编辑书库对话框
    function showEditLibraryDialog(library) {
        const name = prompt('Library Name:', library.name);
        if (!name) return;

        const description = prompt('Description:', library.description || '');
        const isActive = confirm('Is this library active?');

        api.libraries.update(library.id, { name, description, is_active: isActive })
            .then(() => loadLibraries())
            .catch(error => alert(`Failed to update library: ${error.message}`));
    }

    // 格式化日期
    function formatDate(dateString) {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString();
    }

    // 初始加载
    await loadLibraries();

    return container;
}
