import { createAppRegistry } from './app-registry.js';
import { defineZPhoneComponents } from './components.js';
import {
    applyDockLayout,
    buildApplicationsLayout,
    ensureWidgetTimer,
    initializeHomeContainers,
    refreshWidgetValues,
} from './home-page.js';

const registry = createAppRegistry();
let bridgeInstalled = false;

function initializeEmojiArea() {
    const target = document.querySelector('#whatsapp-openedchat-message');
    if (!target || target.dataset.emojiInitialized === 'true') {
        return false;
    }

    if (!(window.jQuery && window.jQuery.fn && typeof window.jQuery.fn.emojioneArea === 'function')) {
        return false;
    }

    window.jQuery(target).emojioneArea({
        inline: true,
        searchPosition: 'bottom',
        shortnames: true,
    });
    target.dataset.emojiInitialized = 'true';
    return true;
}

function installLegacyBridge() {
    if (bridgeInstalled) {
        return true;
    }

    if (!(window.QB && window.QB.Phone && window.QB.Phone.Functions)) {
        return false;
    }

    const originalSetupApplications = window.QB.Phone.Functions.SetupApplications;

    window.QB.Phone.Functions.SetupApplications = function setupApplicationsWithModules(data) {
        try {
            const pageContainer = document.querySelector('.phone-page-container');
            const indicatorContainer = document.querySelector('.page-indicators');
            const dockContainer = document.querySelector('.phone-footer-applications');

            if (!pageContainer || !indicatorContainer || !dockContainer) {
                return originalSetupApplications.call(this, data);
            }

            window.QB.Phone.Data.Applications = data.applications;
            initializeHomeContainers(pageContainer, indicatorContainer);

            const layout = buildApplicationsLayout({
                applications: data.applications,
                playerData: window.QB.Phone.Data.PlayerData || {},
                playerJob: window.QB.Phone.Data.PlayerJob || {},
                isAppJobBlocked: window.IsAppJobBlocked,
            });

            pageContainer.appendChild(layout.pagesFragment);
            indicatorContainer.appendChild(layout.indicatorsFragment);
            indicatorContainer.style.display = layout.totalPages > 1 ? 'block' : 'none';

            applyDockLayout(dockContainer, layout.dockApps);

            window.QB.Phone.Data.currentPage = 0;
            window.QB.Phone.Data.totalPages = layout.totalPages;
            window.QB.Phone.Functions.NavigateToPage(0);
            refreshWidgetValues(document, window.QB.Phone.Data.PlayerData || {});
            ensureWidgetTimer(() => window.QB.Phone.Data.PlayerData || {});

            if (window.jQuery && window.jQuery.fn && typeof window.jQuery.fn.tooltip === 'function') {
                window.jQuery('[data-toggle="tooltip"]').tooltip();
            }
        } catch (error) {
            console.warn('[ZPhone] Falling back to legacy application setup.', error);
            return originalSetupApplications.call(this, data);
        }

        return true;
    };

    window.QB.Phone.Functions.UpdateWidgets = function updateWidgetsWithModules() {
        refreshWidgetValues(document, window.QB.Phone.Data.PlayerData || {});
        ensureWidgetTimer(() => window.QB.Phone.Data.PlayerData || {});
    };

    bridgeInstalled = true;
    return true;
}

function interceptRegisteredApps(event) {
    const appElement = event.target.closest('.phone-application[data-app]');
    if (!appElement || !registry.has(appElement.dataset.app)) {
        return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();
    registry.open(appElement.dataset.app, {
        element: appElement,
        QB: window.QB,
        ZPhone: window.ZPhone,
    });
}

const api = {
    version: 'modules-1',
    registry,
    registerApp(name, definition) {
        return registry.register(name, definition);
    },
    openApp(name, context) {
        return registry.open(name, context);
    },
    installLegacyBridge,
    initializeEmojiArea,
    refreshWidgets() {
        refreshWidgetValues(document, window.QB && window.QB.Phone ? window.QB.Phone.Data.PlayerData || {} : {});
        ensureWidgetTimer(() => window.QB && window.QB.Phone ? window.QB.Phone.Data.PlayerData || {} : {});
    },
};

function boot() {
    defineZPhoneComponents();
    installLegacyBridge();
    api.refreshWidgets();
    initializeEmojiArea();
}

window.ZPhone = Object.assign(window.ZPhone || {}, api);
window.QB = window.QB || {};
window.QB.Phone = window.QB.Phone || {};
window.QB.Phone.Modules = window.ZPhone;

document.addEventListener('click', interceptRegisteredApps, true);

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
    boot();
}
