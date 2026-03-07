/**
 * html/js/core/component.js
 *
 * Base Component class and shared UI-component library for z-phone.
 *
 * USAGE
 * ─────
 * class MyApp extends QB.Phone.Component {
 *     render() {
 *         return '<div class="my-app-root">…</div>';
 *     }
 *     onMount() {
 *         // attach listeners, subscribe to EventBus
 *     }
 *     onUnmount() {
 *         // remove listeners, nullify data, unsubscribe EventBus
 *     }
 * }
 *
 * const app = new MyApp(document.querySelector('.my-app-container'));
 * app.mount();   // inserts render() HTML then calls onMount()
 * app.unmount(); // calls onUnmount() then removes the root element
 *
 * SHARED UI COMPONENTS
 * ────────────────────
 * QB.Phone.UI.ButtonComponent(label, icon, onClick, options)
 * QB.Phone.UI.HeaderComponent(title, showBackBtn, onBack, options)
 * QB.Phone.UI.InputComponent(placeholder, type, options)
 */

// ─────────────────────────────────────────────────────────────────────────────
// Base Component
// ─────────────────────────────────────────────────────────────────────────────

QB.Phone.Component = (function () {
    /**
     * @param {Element} container – The DOM element this component renders into.
     *                              May be null for headless/static components.
     */
    function Component(container) {
        this._container = container || null;
        this._root = null;
        this._mounted = false;
    }

    /**
     * Override in subclasses to return an HTML string representing this component.
     * @returns {string}
     */
    Component.prototype.render = function () {
        return '';
    };

    /**
     * Called after the component's HTML has been inserted into the DOM.
     * Attach event listeners, start timers, subscribe to EventBus here.
     */
    Component.prototype.onMount = function () {};

    /**
     * Called before the component's HTML is removed from the DOM.
     * Remove event listeners, clear timers, unsubscribe EventBus here.
     */
    Component.prototype.onUnmount = function () {};

    /**
     * Renders the component HTML into _container and calls onMount().
     * Safe to call multiple times – no-op if already mounted.
     */
    Component.prototype.mount = function () {
        if (this._mounted) return;
        if (this._container) {
            this._container.innerHTML = this.render();
            this._root = this._container.firstElementChild;
        }
        this._mounted = true;
        try {
            this.onMount();
        } catch (e) {
            console.error('[Component] onMount error:', e);
            // Roll back to unmounted state so the component isn't stuck half-initialised
            this._mounted = false;
            if (this._container) {
                this._container.innerHTML = '';
                this._root = null;
            }
        }
    };

    /**
     * Calls onUnmount() and removes the rendered HTML from _container.
     * Safe to call multiple times – no-op if already unmounted.
     */
    Component.prototype.unmount = function () {
        if (!this._mounted) return;
        try {
            this.onUnmount();
        } catch (e) {
            console.error('[Component] onUnmount error:', e);
        }
        // Always complete the unmount even if onUnmount threw
        this._mounted = false;
        if (this._container) {
            this._container.innerHTML = '';
            this._root = null;
        }
    };

    /** @returns {boolean} */
    Component.prototype.isMounted = function () {
        return this._mounted;
    };

    /**
     * Simple inheritance helper.
     * Usage: QB.Phone.Component.extend(MyApp, { render, onMount, onUnmount });
     */
    Component.extend = function (SubClass, proto) {
        SubClass.prototype = Object.create(Component.prototype);
        SubClass.prototype.constructor = SubClass;
        if (proto) {
            Object.keys(proto).forEach(function (k) {
                SubClass.prototype[k] = proto[k];
            });
        }
        return SubClass;
    };

    return Component;
}());

// ─────────────────────────────────────────────────────────────────────────────
// Shared UI Component Library
// ─────────────────────────────────────────────────────────────────────────────
QB.Phone.UI = {};

/**
 * Creates a button DOM element styled with the Frosted Glass UI.
 *
 * @param {string}   label   – Button text
 * @param {string}   icon    – FontAwesome class string (e.g. 'fas fa-check'), or ''
 * @param {Function} onClick – Click callback
 * @param {Object}  [options]
 * @param {string}  [options.className] – Extra CSS classes
 * @param {string}  [options.type]      – 'primary' | 'danger' | 'ghost' (default 'primary')
 * @returns {HTMLButtonElement}
 */
QB.Phone.UI.ButtonComponent = function (label, icon, onClick, options) {
    options = options || {};
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'z-btn z-btn--' + (options.type || 'primary') + (options.className ? ' ' + options.className : '');

    var inner = '';
    if (icon) inner += '<i class="' + icon + '"></i> ';
    inner += '<span>' + label + '</span>';
    btn.innerHTML = inner;

    if (typeof onClick === 'function') btn.addEventListener('click', onClick);
    return btn;
};

/**
 * Creates a header bar element for an app panel.
 *
 * @param {string}   title       – Header title text
 * @param {boolean}  showBackBtn – Show a back / close arrow on the left
 * @param {Function} [onBack]    – Callback for back button click
 * @param {Object}  [options]
 * @param {string}  [options.className] – Extra CSS classes
 * @returns {HTMLElement}
 */
QB.Phone.UI.HeaderComponent = function (title, showBackBtn, onBack, options) {
    options = options || {};
    var header = document.createElement('div');
    header.className = 'z-header' + (options.className ? ' ' + options.className : '');

    var html = '';
    if (showBackBtn) {
        html += '<div class="z-header__back"><i class="fas fa-chevron-left"></i></div>';
    }
    html += '<div class="z-header__title">' + title + '</div>';
    header.innerHTML = html;

    if (showBackBtn && typeof onBack === 'function') {
        header.querySelector('.z-header__back').addEventListener('click', onBack);
    }
    return header;
};

/**
 * Creates a styled input element.
 *
 * @param {string}  placeholder
 * @param {string}  [type='text'] – HTML input type
 * @param {Object} [options]
 * @param {string} [options.className] – Extra CSS classes
 * @param {string} [options.id]
 * @param {string} [options.name]
 * @returns {HTMLInputElement}
 */
QB.Phone.UI.InputComponent = function (placeholder, type, options) {
    options = options || {};
    var input = document.createElement('input');
    input.type = type || 'text';
    input.placeholder = placeholder || '';
    input.className = 'z-input' + (options.className ? ' ' + options.className : '');
    if (options.id)   input.id   = options.id;
    if (options.name) input.name = options.name;
    return input;
};
