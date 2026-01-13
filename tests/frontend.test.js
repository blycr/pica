/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import { createElement } from '../src/utils/dom.js';
import { matchRoute } from '../src/utils/router.js';

describe('DOM Utils', () => {
    it('createElement should create an element with class and id', () => {
        const el = createElement('div', { className: 'test-class', id: 'test-id' });
        expect(el.tagName).toBe('DIV');
        expect(el.className).toBe('test-class');
        expect(el.id).toBe('test-id');
    });

    it('createElement should append children', () => {
        const child = createElement('span', {}, 'Hello');
        const parent = createElement('div', {}, [child, 'World']);

        expect(parent.children.length).toBe(1);
        expect(parent.textContent).toBe('HelloWorld');
    });

    it('createElement should handle event listeners', () => {
        const clickHandler = vi.fn();
        const el = createElement('button', { onClick: clickHandler });

        el.click();
        expect(clickHandler).toHaveBeenCalled();
    });
});

describe('Router Utils', () => {
    it('matchRoute should match simple paths', () => {
        const result = matchRoute('/manga/:id', '/manga/123');
        expect(result).not.toBeNull();
        expect(result).toEqual({ id: '123' });
    });

    it('matchRoute should not match incorrect paths', () => {
        const result = matchRoute('/manga/:id', '/library/123');
        expect(result).toBeNull();
    });

    it('matchRoute should handle multiple params', () => {
        const result = matchRoute('/lib/:libId/book/:bookId', '/lib/1/book/2');
        expect(result).toEqual({ libId: '1', bookId: '2' });
    });
});
