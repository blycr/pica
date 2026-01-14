import { createElement } from '../utils/dom.js';
import { api } from '../api/client.js';
import { theme } from '../utils/theme.js';

export async function SettingsPage() {
    const container = createElement('div', { className: 'w-full max-w-4xl mx-auto space-y-6 pb-24 animate-fade-in' });

    // Header
    const header = createElement('div', { className: 'mb-8' }, [
        createElement('h2', { className: 'text-3xl font-bold text-white mb-2' }, ['Settings']),
        createElement('p', { className: 'text-gray-400' }, ['Manage system configuration and preferences'])
    ]);
    container.appendChild(header);

    // 1. Appearance Section (Client-side)
    const appearanceSection = createSection('Appearance', 'Customize the look and feel', true); // Open by default
    container.appendChild(appearanceSection);

    const themeRow = createThemeToggle();
    appearanceSection.querySelector('.content').appendChild(themeRow);


    // Fetch Config Data
    try {
        const configData = await api.config.getAll();
        const envConfig = configData.env || {};
        const jsonConfig = configData.json || {};

        // 2. System Configuration (.env)
        const systemSection = createSection('System Configuration (.env)', 'Server startup settings. Requires restart to apply.', true);
        container.appendChild(systemSection);

        const envForm = createEnvForm(envConfig);
        systemSection.querySelector('.content').appendChild(envForm);

        // 3. Runtime Configuration (config.json)
        const runtimeSection = createSection('Runtime Configuration (JSON)', 'Dynamic settings applied immediately.', false); // Closed by default
        container.appendChild(runtimeSection);

        const jsonForm = createJsonForm(jsonConfig);
        runtimeSection.querySelector('.content').appendChild(jsonForm);

    } catch (error) {
        container.appendChild(createElement('div', { className: 'p-4 bg-red-500/20 text-red-200 rounded-lg' }, [`Error loading settings: ${error.message}`]));
    }

    return container;
}

function createSection(title, description, isOpen = false) {
    const section = createElement('div', { className: 'glass-panel rounded-xl overflow-hidden' });

    // Header (Click to toggle)
    const header = createElement('div', {
        className: 'p-6 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors',
        onclick: () => {
            const content = section.querySelector('.content-wrapper');
            const icon = section.querySelector('.chevron');
            if (content.style.maxHeight) {
                content.style.maxHeight = null;
                icon.style.transform = 'rotate(0deg)';
            } else {
                content.style.maxHeight = content.scrollHeight + 'px';
                icon.style.transform = 'rotate(180deg)';
            }
        }
    }, [
        createElement('div', {}, [
            createElement('h3', { className: 'text-xl font-bold text-white mb-1' }, [title]),
            createElement('p', { className: 'text-gray-400 text-sm' }, [description])
        ]),
        createElement('div', {
            className: `chevron w-6 h-6 text-gray-400 transform transition-transform duration-300 ${isOpen ? 'rotate-180' : 'rotate-0'}`,
            innerHTML: '<svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>'
        })
    ]);
    section.appendChild(header);

    // Content
    const contentWrapper = createElement('div', {
        className: 'content-wrapper transition-all duration-300 ease-in-out overflow-hidden',
        style: isOpen ? 'max-height: 2000px;' : 'max-height: 0px;'
    });

    const content = createElement('div', { className: 'content p-6 border-t border-white/5 space-y-4' });
    contentWrapper.appendChild(content);
    section.appendChild(contentWrapper);

    return section;
}

function createThemeToggle() {
    const row = createElement('div', { className: 'flex items-center justify-between py-2' });
    row.appendChild(createElement('div', {}, [
        createElement('h4', { className: 'text-white font-medium' }, ['Dark Mode']),
        createElement('p', { className: 'text-sm text-gray-400' }, ['Toggle between light and dark themes'])
    ]));

    const toggleBtn = createElement('button', {
        className: `w-12 h-6 rounded-full relative transition-colors duration-200 ${theme.get() === 'dark' ? 'bg-blue-600' : 'bg-gray-600'}`,
        onclick: function () {
            const newTheme = theme.toggle();
            this.className = `w-12 h-6 rounded-full relative transition-colors duration-200 ${newTheme === 'dark' ? 'bg-blue-600' : 'bg-gray-600'}`;
            const dot = this.querySelector('div');
            if (newTheme === 'dark') {
                dot.className = 'absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-200 left-7';
            } else {
                dot.className = 'absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-200 left-1';
            }
        }
    }, [
        createElement('div', {
            className: `absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-200 ${theme.get() === 'dark' ? 'left-7' : 'left-1'}`
        })
    ]);

    row.appendChild(toggleBtn);
    return row;
}

function createEnvForm(envConfig) {
    const form = createElement('form', {
        className: 'space-y-4',
        onsubmit: async (e) => {
            e.preventDefault();
            const submitBtn = form.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.disabled = true;
            submitBtn.textContent = 'Saving...';

            try {
                const formData = new FormData(e.target);
                const updates = Object.fromEntries(formData.entries());
                const res = await api.config.updateEnv(updates);

                if (res.success) {
                    alert(`${res.message}\n${res.warning || ''}`);
                }
            } catch (err) {
                alert('Failed to save configuration: ' + err.message);
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
        }
    });

    // Define fields with validation rules
    const fields = [
        { key: 'PORT', label: 'Server Port', type: 'number', placeholder: '3000', required: true },
        { key: 'HOST', label: 'Host Address', type: 'text', placeholder: '0.0.0.0', required: true },
        { key: 'DATA_DIR', label: 'Data Directory', type: 'text', placeholder: './data' },
        { key: 'MANGA_LIBRARY_PATH', label: 'Library Path', type: 'text', placeholder: 'Separate multiples with comma' },
        { key: 'PIN_ENABLED', label: 'Enable PIN Auth', type: 'text', placeholder: 'true/false' }, // Could be checkbox, simplified as text for env
        { key: 'PIN_CODE', label: 'PIN Code', type: 'password', placeholder: '4-8 digits' },
        { key: 'PIN_SESSION_HOURS', label: 'Session Duration (Hours)', type: 'number', placeholder: '24' }
    ];

    fields.forEach(field => {
        const wrapper = createElement('div', { className: 'space-y-1' });
        wrapper.appendChild(createElement('label', { className: 'block text-sm font-medium text-gray-400' }, [field.label]));

        // Handle current value
        let val = envConfig[field.key];
        if (field.key === 'PIN_ENABLED') val = String(val); // Convert bool to string for display if needed

        wrapper.appendChild(createElement('input', {
            name: field.key,
            value: val || '',
            type: field.type,
            placeholder: field.placeholder,
            required: field.required || false,
            className: 'w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 transition-colors'
        }));
        form.appendChild(wrapper);
    });

    form.appendChild(createElement('div', { className: 'pt-4 border-t border-white/5' }, [
        createElement('button', {
            type: 'submit',
            className: 'px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors shadow-lg shadow-blue-500/30'
        }, ['Save & Restart'])
    ]));

    return form;
}

function createJsonForm(jsonConfig) {
    const form = createElement('form', {
        className: 'space-y-4',
        onsubmit: async (e) => {
            e.preventDefault();
            try {
                const formData = new FormData(e.target);
                const updates = Object.fromEntries(formData.entries());
                const res = await api.config.updateJson(updates);
                if (res.success) {
                    alert('Runtime settings updated successfully!');
                }
            } catch (err) {
                alert(err.message);
            }
        }
    });

    const fields = [
        { key: 'language', label: 'Language', type: 'text', placeholder: 'en-US, zh-CN' },
    ];

    fields.forEach(field => {
        const wrapper = createElement('div', { className: 'space-y-1' });
        wrapper.appendChild(createElement('label', { className: 'block text-sm font-medium text-gray-400' }, [field.label]));
        wrapper.appendChild(createElement('input', {
            name: field.key,
            value: jsonConfig[field.key] || '',
            type: field.type,
            placeholder: field.placeholder,
            className: 'w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 transition-colors'
        }));
        form.appendChild(wrapper);
    });

    form.appendChild(createElement('div', { className: 'pt-4 border-t border-white/5' }, [
        createElement('button', {
            type: 'submit',
            className: 'px-6 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg font-medium transition-colors shadow-lg shadow-green-500/30'
        }, ['Save Settings'])
    ]));

    return form;
}
