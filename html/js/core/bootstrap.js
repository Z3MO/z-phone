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
let clickInterceptorBound = false;
let legacyAppRegistryInitialized = false;

function isModularCoreEnabled() {
    return window.Config?.Frontend?.modularCoreEnabled !== false;
}

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

function getAppDisplayName(appName) {
    return window.QB?.Phone?.Data?.Applications?.[appName]?.tooltipText || appName;
}

function getLegacyAppElement(appName) {
    return document.querySelector(`.${appName}-app`);
}

function canOpenLegacyApp(appName) {
    const appElement = getLegacyAppElement(appName);
    if (!appElement) {
        if (appName) {
            window.QB?.Phone?.Notifications?.Add(
                'fas fa-exclamation-circle',
                'System',
                `${getAppDisplayName(appName)} is not available!`,
            );
        }
        return false;
    }

    if (!isLegacyAppOpenAllowed() || window.QB?.Phone?.Data?.currentApplication !== null) {
        return false;
    }

    return true;
}

function isLegacyAppOpenAllowed() {
    return window.CanOpenApp !== false;
}

function openLegacyApp(appName, onOpen, { closeAfterOpen = false } = {}) {
    if (!canOpenLegacyApp(appName)) {
        return false;
    }

    window.QB.Phone.Functions.ToggleApp(appName, 'block');
    window.QB.Phone.Animations.TopSlideDown('.phone-application-container', 300, 0);

    if (window.QB.Phone.Functions.IsAppHeaderAllowed(appName)) {
        window.QB.Phone.Functions.HeaderTextColor('transparent', 300);
    }

    window.QB.Phone.Data.currentApplication = appName;

    if (typeof onOpen === 'function') {
        onOpen();
    }

    if (closeAfterOpen) {
        window.QB.Phone.Functions.Close();
    }

    return true;
}

function registerLegacyApp(appName, definition) {
    return registry.register(appName, {
        ...definition,
        handler(context) {
            return openLegacyApp(appName, () => {
                if (typeof definition?.handler === 'function') {
                    definition.handler(context);
                }
            }, definition?.options || {});
        },
    });
}

function registerDefaultLegacyApps() {
    if (legacyAppRegistryInitialized || !window.QB?.Phone?.Functions) {
        return;
    }

    registerLegacyApp('settings', {
        handler() {
            const charInfo = window.QB.Phone.Data.PlayerData.charinfo;
            const metaData = window.QB.Phone.Data.MetaData || {};
            document.querySelector('.settings-profile-name').textContent = `${charInfo.firstname} ${charInfo.lastname}`;
            document.querySelector('.settings-profile-number').textContent = charInfo.phone;

            const profileImage = document.querySelector('.settings-profile-img');
            const avatarPlaceholder = document.querySelector('.settings-profile-avatar-placeholder');
            if (metaData.profilepicture && metaData.profilepicture !== 'default') {
                profileImage?.setAttribute('src', metaData.profilepicture);
                if (profileImage) profileImage.style.display = 'block';
                if (avatarPlaceholder) avatarPlaceholder.style.display = 'none';
            } else {
                if (profileImage) profileImage.style.display = 'none';
                if (avatarPlaceholder) avatarPlaceholder.style.display = 'flex';
            }

            if (typeof window.LoadPlayerMoneys === 'function') {
                window.LoadPlayerMoneys();
            }
        },
    });

    registerLegacyApp('bank', {
        handler() {
            window.QB.Phone.Functions.DoBankOpen();
            window.QB.Phone.Functions.SwitchBankTab('accounts', { immediate: true });
            window.QB.Phone.Functions.LoadBankData().catch(() => {});
        },
    });

    registerLegacyApp('phone', {
        handler() {
            window.QB.Phone.NUI.postLegacy('GetMissedCalls', {}, (recent) => {
                window.QB.Phone.Functions.SetupRecentCalls(recent);
            });
            window.QB.Phone.NUI.postLegacy('GetSuggestedContacts', {}, (suggested) => {
                window.QB.Phone.Functions.SetupSuggestedContacts(suggested);
            });
            window.QB.Phone.NUI.postLegacy('ClearGeneralAlerts', { app: 'phone' });
        },
    });

    registerLegacyApp('mail', {
        handler() {
            window.QB.Phone.NUI.postLegacy('GetMails', {}, (mails) => {
                window.QB.Phone.Functions.SetupMails(mails);
            });
            window.QB.Phone.NUI.postLegacy('ClearGeneralAlerts', { app: 'mail' });
        },
    });

    registerLegacyApp('gallery', {
        handler() {
            window.QB.Phone.NUI.postLegacy('GetGalleryData', {}, (data) => {
                if (typeof window.setupGalleryData === 'function') {
                    window.setupGalleryData(data);
                }
            });
        },
    });

    registerLegacyApp('taxi', {
        handler() {
            window.QB.Phone.NUI.postLegacy('GetAvailableTaxiDrivers', {}, (data) => {
                if (typeof window.SetupTaxiDrivers === 'function') {
                    window.SetupTaxiDrivers(data);
                }
            });
        },
    });

    registerLegacyApp('camera', {
        handler() {
            window.QB.Phone.NUI.postLegacy('TakePhoto', {}, (url) => {
                if (typeof window.setupCameraApp === 'function') {
                    window.setupCameraApp(url);
                }
            });
        },
        options: {
            closeAfterOpen: true,
        },
    });

    legacyAppRegistryInitialized = true;
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
                playerData: window.QB.Phone.Data.PlayerData ?? {},
                playerJob: window.QB.Phone.Data.PlayerJob ?? {},
                isAppJobBlocked: window.IsAppJobBlocked,
            });

            pageContainer.appendChild(layout.pagesFragment);
            indicatorContainer.appendChild(layout.indicatorsFragment);
            indicatorContainer.style.display = layout.totalPages > 1 ? 'block' : 'none';

            applyDockLayout(dockContainer, layout.dockApps);

            window.QB.Phone.Data.currentPage = 0;
            window.QB.Phone.Data.totalPages = layout.totalPages;
            window.QB.Phone.Functions.NavigateToPage(0);
            refreshWidgetValues(document, window.QB.Phone.Data.PlayerData ?? {});
            ensureWidgetTimer(() => window.QB.Phone.Data.PlayerData ?? {});

            if (window.jQuery && window.jQuery.fn && typeof window.jQuery.fn.tooltip === 'function') {
                window.jQuery('[data-toggle="tooltip"]').tooltip();
            }
        } catch (error) {
            console.warn('[ZPhone] Falling back to legacy application setup because the modular layout could not be mounted.', {
                message: error.message,
                pageContainer: Boolean(document.querySelector('.phone-page-container')),
                indicatorContainer: Boolean(document.querySelector('.page-indicators')),
                dockContainer: Boolean(document.querySelector('.phone-footer-applications')),
            }, error);
            return originalSetupApplications.call(this, data);
        }

        return true;
    };

    window.QB.Phone.Functions.UpdateWidgets = function updateWidgetsWithModules() {
        refreshWidgetValues(document, window.QB.Phone.Data.PlayerData ?? {});
        ensureWidgetTimer(() => window.QB.Phone.Data.PlayerData ?? {});
    };

    bridgeInstalled = true;
    return true;
}

function interceptRegisteredApps(event) {
    const appElement = event.target.closest('.phone-application[data-app]');
    if (!appElement || !registry.has(appElement.dataset.app)) {
        return;
    }

    const handled = registry.open(appElement.dataset.app, {
        element: appElement,
        QB: window.QB,
        ZPhone: window.ZPhone,
    });

    if (!handled) {
        return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();
}

const api = {
    version: 'modules-1',
    registry,
    registerApp(name, definition) {
        return registry.register(name, definition);
    },
    registerLegacyApp,
    openApp(name, context) {
        return registry.open(name, context);
    },
    openLegacyApp,
    installLegacyBridge,
    initializeEmojiArea,
    refreshWidgets() {
        refreshWidgetValues(document, window.QB?.Phone?.Data?.PlayerData ?? {});
        ensureWidgetTimer(() => window.QB?.Phone?.Data?.PlayerData ?? {});
    },
};

function boot() {
    if (!isModularCoreEnabled()) {
        return;
    }

    defineZPhoneComponents();
    installLegacyBridge();
    registerDefaultLegacyApps();
    if (window.QB?.Phone?.Data) {
        api.refreshWidgets();
    }
    initializeEmojiArea();

    if (!clickInterceptorBound) {
        document.addEventListener('click', interceptRegisteredApps, true);
        clickInterceptorBound = true;
    }
}

window.ZPhone = Object.assign(window.ZPhone || {}, api);
window.QB = window.QB || {};
window.QB.Phone = window.QB.Phone || {};
window.QB.Phone.Modules = window.ZPhone;

boot();
