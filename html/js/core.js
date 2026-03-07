/**
 * z-phone core.js
 *
 * Provides three foundational systems that every other script builds on:
 *
 *  1. QB.Phone.EventBus  – Pub/sub event bus for decoupled game event routing
 *  2. QB.Phone.ComponentManager – Lifecycle manager (mount / unmount) for app components
 *  3. QB.Phone.LazyLoader – Lazy-loads app-specific images/SVGs on first open
 *
 * This file MUST be loaded before app.js and all app-specific scripts.
 */

// ─────────────────────────────────────────────────────────────────────────────
// 1. Event Bus
//    Usage:
//      QB.Phone.EventBus.on('phone:newMessage', handler);
//      QB.Phone.EventBus.off('phone:newMessage', handler);
//      QB.Phone.EventBus.emit('phone:newMessage', { number: '555-1234', ... });
// ─────────────────────────────────────────────────────────────────────────────
QB.Phone.EventBus = (function () {
    var _handlers = {};

    return {
        /**
         * Subscribe to a named event.
         * @param {string} event
         * @param {Function} handler
         */
        on: function (event, handler) {
            if (!_handlers[event]) _handlers[event] = [];
            // Prevent duplicate registration of the same function reference
            if (_handlers[event].indexOf(handler) === -1) {
                _handlers[event].push(handler);
            }
        },

        /**
         * Unsubscribe a specific handler from an event.
         * @param {string} event
         * @param {Function} handler
         */
        off: function (event, handler) {
            if (!_handlers[event]) return;
            _handlers[event] = _handlers[event].filter(function (h) {
                return h !== handler;
            });
        },

        /**
         * Emit an event, calling all subscribed handlers.
         * @param {string} event
         * @param {*} data
         */
        emit: function (event, data) {
            if (!_handlers[event]) return;
            // Iterate over a shallow copy so handlers can safely call off() inside themselves
            _handlers[event].slice().forEach(function (h) {
                try { h(data); } catch (e) { console.error('[EventBus] Error in handler for "' + event + '":', e); }
            });
        },

        /**
         * Remove ALL handlers for an event (useful for hard resets).
         * @param {string} event
         */
        clear: function (event) {
            delete _handlers[event];
        }
    };
}());

// ─────────────────────────────────────────────────────────────────────────────
// 2. Component Manager
//    Each app can register a component with optional onMount / onUnmount hooks.
//    onMount  – called the first time the app panel is shown.
//    onUnmount – called every time the app panel is hidden; should remove event
//                listeners and nullify large objects to prevent memory leaks.
//
//    Usage (in e.g. garage.js):
//      QB.Phone.ComponentManager.register('garage', {
//          onMount: function () { /* add delegated listeners, start polls */ },
//          onUnmount: function () { /* remove listeners, clear data */ }
//      });
// ─────────────────────────────────────────────────────────────────────────────
QB.Phone.ComponentManager = (function () {
    var _components = {};
    var _mounted = {};

    return {
        /**
         * Register a component definition for an app.
         * @param {string} appName – must match the data-app attribute value
         * @param {{ onMount?: Function, onUnmount?: Function }} def
         */
        register: function (appName, def) {
            _components[appName] = def;
            _mounted[appName] = false;
        },

        /**
         * Called by QB.Phone.Functions.Open / CloseApplication when an app becomes visible.
         * @param {string} appName
         */
        mount: function (appName) {
            var comp = _components[appName];
            if (!comp) return;
            _mounted[appName] = true;
            if (typeof comp.onMount === 'function') {
                try { comp.onMount(); } catch (e) { console.error('[ComponentManager] onMount error for "' + appName + '":', e); }
            }
        },

        /**
         * Called by QB.Phone.Functions.CloseApplication / Close when an app is hidden.
         * @param {string} appName
         */
        unmount: function (appName) {
            var comp = _components[appName];
            if (!comp || !_mounted[appName]) return;
            _mounted[appName] = false;
            if (typeof comp.onUnmount === 'function') {
                try { comp.onUnmount(); } catch (e) { console.error('[ComponentManager] onUnmount error for "' + appName + '":', e); }
            }
        },

        /**
         * Unmount all currently-mounted components (called on phone close).
         */
        unmountAll: function () {
            Object.keys(_mounted).forEach(function (appName) {
                if (_mounted[appName]) {
                    QB.Phone.ComponentManager.unmount(appName);
                }
            });
        },

        /** Returns true when the named app is currently mounted. */
        isMounted: function (appName) {
            return !!_mounted[appName];
        }
    };
}());

// ─────────────────────────────────────────────────────────────────────────────
// 3. Lazy Loader
//    Images with `data-lazy-src` are NOT loaded until the containing app is
//    opened.  Call QB.Phone.LazyLoader.loadForApp(appName) inside onMount or
//    inside the app-open handler to trigger loading.
//
//    HTML example:
//      <img data-lazy-src="./img/backgrounds/zphone-2.png" src="" class="phone-backgrounds">
//
//    The loader replaces `src` with `data-lazy-src` once – subsequent calls
//    for the same image are no-ops (already resolved).
// ─────────────────────────────────────────────────────────────────────────────
QB.Phone.LazyLoader = (function () {
    /**
     * Load all `[data-lazy-src]` images within a container element.
     * @param {string|Element} container – CSS selector or DOM element
     */
    function loadIn(container) {
        var root = typeof container === 'string'
            ? document.querySelector(container)
            : container;
        if (!root) return;

        root.querySelectorAll('img[data-lazy-src], source[data-lazy-src]').forEach(function (el) {
            var lazySrc = el.getAttribute('data-lazy-src');
            // Only load if we have a lazy src and haven't already resolved it
            if (lazySrc && !el.getAttribute('src')) {
                el.setAttribute('src', lazySrc);
            }
        });
    }

    return {
        /**
         * Resolve lazy images inside the DOM section for the given app.
         * Looks for `.{appName}-app [data-lazy-src]`.
         * @param {string} appName
         */
        loadForApp: function (appName) {
            loadIn('.' + appName + '-app');
        },

        /**
         * Resolve lazy images anywhere inside a given container.
         * @param {string|Element} container
         */
        loadIn: loadIn
    };
}());

// ─────────────────────────────────────────────────────────────────────────────
// 4. Smart Data Sync helper
//    Tracks previous values and only triggers a DOM update when the value
//    actually changes.
//
//    Usage:
//      QB.Phone.DataSync.update('bankBalance', newValue, function(val) {
//          $('.bank-app-account-balance').text('$' + val);
//      });
// ─────────────────────────────────────────────────────────────────────────────
QB.Phone.DataSync = (function () {
    var _cache = {};

    return {
        /**
         * Update a named value; only runs the updater fn if the value changed.
         * @param {string} key    – Unique identifier for this piece of data
         * @param {*}      value  – New value (shallow compared with ===)
         * @param {Function} updaterFn – Called with (value) only when changed
         * @returns {boolean} true if an update was performed
         */
        update: function (key, value, updaterFn) {
            if (_cache[key] === value) return false;
            _cache[key] = value;
            try { updaterFn(value); } catch (e) { console.error('[DataSync] Error updating "' + key + '":', e); }
            return true;
        },

        /**
         * Reset a cached value (forces the next update() call to run its fn).
         * @param {string} key
         */
        invalidate: function (key) {
            delete _cache[key];
        },

        /**
         * Reset all cached values.
         */
        invalidateAll: function () {
            _cache = {};
        }
    };
}());
