import { createElement, appendChildren } from './dom.js';

function buildIconMarkup(app = {}) {
    const iconStyle = app.style ? ` style="${app.style}"` : '';

    if (!app.icon) {
        return '';
    }

    if (app.icon.startsWith('fa')) {
        return `<i class="ApplicationIcon ${app.icon}"${iconStyle}></i>`;
    }

    const source = app.icon.includes('.') ? app.icon : `${app.icon}.png`;
    return `<img class="ApplicationIcon" src="./img/apps/${source}"${iconStyle}>`;
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
        this.innerHTML = `${buildIconMarkup(app)}<p class="application-description">${app.tooltipText || ''}</p><div class="app-unread-alerts">0</div>`;
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

    slot.innerHTML = '';
    slot.style.backgroundColor = 'transparent';
    slot.removeAttribute('title');
    slot.removeAttribute('data-app');

    if (!app) {
        return;
    }

    slot.dataset.app = app.app;
    slot.setAttribute('title', app.tooltipText || app.app || 'App');
    slot.insertAdjacentHTML('beforeend', `${buildIconMarkup(app)}<div class="app-unread-alerts">0</div>`);
}
