import { createElement, appendChildren, clearChildren } from './dom.js';

function applySafeInlineStyle(element, styleText) {
    if (!styleText || typeof styleText !== 'string') {
        return;
    }

    const allowedProperties = new Set([
        'color',
        'background',
        'background-color',
        'font-size',
        'filter',
        'transform',
        'opacity',
    ]);

    styleText.split(';').forEach((declaration) => {
        const [property, rawValue] = declaration.split(':');
        if (!property || !rawValue) {
            return;
        }

        const normalizedProperty = property.trim().toLowerCase();
        const normalizedValue = rawValue.trim();

        if (!allowedProperties.has(normalizedProperty)) {
            return;
        }

        if (/url\s*\(|expression\s*\(|javascript:|@import|-moz-binding|behavior\s*:/i.test(normalizedValue)) {
            return;
        }

        element.style.setProperty(normalizedProperty, normalizedValue);
    });
}

function sanitizeIconClasses(icon = '') {
    return icon
        .split(/\s+/)
        .filter((token) => /^[a-z0-9_-]+$/i.test(token))
        .join(' ');
}

function sanitizeAssetName(icon = '') {
    if (icon.includes('..') || icon.includes('/') || icon.includes('\\')) {
        return '';
    }

    const basename = icon.split(/[\\/]/).pop() || '';
    return basename.replace(/[^a-z0-9._-]/gi, '');
}

function createIconElement(app = {}) {
    if (!app.icon) {
        return null;
    }

    if (app.icon.startsWith('fa')) {
        const iconElement = createElement('i', {
            className: `ApplicationIcon ${sanitizeIconClasses(app.icon)}`.trim(),
        });
        applySafeInlineStyle(iconElement, app.style);
        return iconElement;
    }

    const source = sanitizeAssetName(app.icon.includes('.') ? app.icon : `${app.icon}.png`);
    const iconElement = createElement('img', {
        className: 'ApplicationIcon',
        attributes: {
            src: `./img/apps/${source}`,
            alt: app.tooltipText || app.app || 'App icon',
        },
    });
    applySafeInlineStyle(iconElement, app.style);
    return iconElement;
}

class ZPhoneApp extends HTMLElement {
    set appData(value) {
        this._appData = value;
        this.render();
    }

    get appData() {
        return this._appData;
    }

    connectedCallback() {
        this.render();
    }

    render() {
        const app = this._appData;
        if (!app) {
            return;
        }

        this.classList.add('phone-application', 'z-phone-app');
        this.dataset.appslot = app.slot;
        this.dataset.app = app.app;
        this.setAttribute('title', app.tooltipText || app.app || 'App');

        clearChildren(this);
        appendChildren(this, [
            createIconElement(app),
            createElement('p', {
                className: 'application-description',
                text: app.tooltipText || '',
            }),
            createElement('div', {
                className: 'app-unread-alerts',
                text: '0',
            }),
        ]);
    }
}

class ZPhoneCard extends HTMLElement {
    connectedCallback() {
        this.classList.add('z-phone-card');
    }
}

export function defineZPhoneComponents() {
    if (!customElements.get('z-phone-app')) {
        customElements.define('z-phone-app', ZPhoneApp);
    }

    if (!customElements.get('z-phone-card')) {
        customElements.define('z-phone-card', ZPhoneCard);
    }
}

export function createAppComponent(app) {
    const element = document.createElement('z-phone-app');
    element.appData = app;
    return element;
}

export function createEmptyAppSlot() {
    return createElement('div', { className: 'phone-application empty-slot' });
}

export function createWidgetCard(className, children = []) {
    const card = document.createElement('z-phone-card');
    card.className = `phone-widget ${className}`;
    appendChildren(card, children);
    return card;
}

export function renderDockSlot(slot, app) {
    if (!slot) {
        return;
    }

    clearChildren(slot);
    slot.style.backgroundColor = 'transparent';
    slot.removeAttribute('title');
    slot.removeAttribute('data-app');

    if (!app) {
        return;
    }

    slot.dataset.app = app.app;
    slot.setAttribute('title', app.tooltipText || app.app || 'App');
    appendChildren(slot, [
        createIconElement(app),
        createElement('div', {
            className: 'app-unread-alerts',
            text: '0',
        }),
    ]);
}
