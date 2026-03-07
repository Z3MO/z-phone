export const query = (selector, root = document) => root.querySelector(selector);
export const queryAll = (selector, root = document) => Array.from(root.querySelectorAll(selector));

export function clearChildren(element) {
    if (!element) {
        return element;
    }

    while (element.firstChild) {
        element.removeChild(element.firstChild);
    }

    return element;
}

export function appendChildren(parent, children = []) {
    if (!parent) {
        return parent;
    }

    children.filter(Boolean).forEach((child) => {
        parent.appendChild(child);
    });

    return parent;
}

export function createElement(tagName, options = {}) {
    const {
        className,
        text,
        html,
        dataset,
        attributes,
        children,
    } = options;

    const element = document.createElement(tagName);

    if (className) {
        element.className = className;
    }

    if (text !== undefined) {
        element.textContent = text;
    }

    if (html !== undefined) {
        element.innerHTML = html;
    }

    if (dataset) {
        Object.entries(dataset).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                element.dataset[key] = String(value);
            }
        });
    }

    if (attributes) {
        Object.entries(attributes).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                element.setAttribute(key, value);
            }
        });
    }

    if (children) {
        appendChildren(element, children);
    }

    return element;
}

export function createFragment(children = []) {
    const fragment = document.createDocumentFragment();
    appendChildren(fragment, children);
    return fragment;
}
