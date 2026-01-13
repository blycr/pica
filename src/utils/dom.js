/**
 * 创建 DOM 元素的辅助函数
 * @param {string} tag - HTML 标签名
 * @param {object} attributes - 属性对象 (className, id, etc.)
 * @param {string|HTMLElement|Array} children - 子元素
 * @returns {HTMLElement}
 */
export function createElement(tag, attributes = {}, children = []) {
    const element = document.createElement(tag);

    // 设置属性
    Object.entries(attributes).forEach(([key, value]) => {
        if (key === 'className') {
            element.className = value;
        } else if (key === 'dataset') {
            Object.entries(value).forEach(([dataKey, dataValue]) => {
                element.dataset[dataKey] = dataValue;
            });
        } else if (key.startsWith('on') && typeof value === 'function') {
            const eventName = key.toLowerCase().substring(2);
            element.addEventListener(eventName, value);
        } else {
            element.setAttribute(key, value);
        }
    });

    //虽然可以用 innerHTML，但为了安全和灵活性，更推荐 appendChild
    if (children) {
        if (!Array.isArray(children)) {
            children = [children];
        }

        children.forEach(child => {
            if (child instanceof Node) {
                element.appendChild(child);
            } else if (child !== null && child !== undefined) {
                element.appendChild(document.createTextNode(String(child)));
            }
        });
    }

    return element;
}

/**
 * 简单的 icon 渲染 (使用 feather icons 或类似 SVG)
 * 这里暂时返回简单的 SVG 字符串占位
 */
export function createIcon(name, classes = "w-5 h-5") {
    // 实际项目中可以引入 lucide-vue 或直接使用 SVG string
    // 这里暂时不做完整图标库
    const span = document.createElement('span');
    span.className = `icon-${name} ${classes}`;
    return span;
}
