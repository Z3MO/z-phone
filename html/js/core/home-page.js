import { createElement, createFragment, clearChildren, appendChildren } from './dom.js';
import { createAppComponent, createEmptyAppSlot, createWidgetCard, renderDockSlot } from './components.js';

const HOME_PAGE_APP_LIMIT = 4;
const GRID_APPS_PER_PAGE = 12;
const DEFAULT_WIDGET_REFRESH_MILLISECONDS = 60000;
const BALANCE_FORMATTER = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
});
let widgetTimer = null;

function formatClock(now = new Date()) {
    return {
        time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        date: now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }),
    };
}

function formatBalance(playerData = {}) {
    const bankBalance = playerData?.money?.bank ?? 0;
    return BALANCE_FORMATTER.format(bankBalance);
}

function isVisibleApp(app, playerJob, isAppJobBlocked) {
    const blocked = typeof isAppJobBlocked === 'function'
        ? isAppJobBlocked(app.blockedjobs || [], playerJob.name)
        : false;

    return (!app.job || app.job === playerJob.name) && !blocked;
}

function createTimeWidget() {
    const { time, date } = formatClock();

    return createWidgetCard('widget-time z-phone-widget-card', [
        createElement('div', {
            className: 'widget-header',
            html: '<i class="fas fa-clock"></i><span>Local Time</span>',
        }),
        createElement('div', {
            className: 'time-display',
            text: time,
            attributes: { 'data-widget-time': 'true' },
        }),
        createElement('div', {
            className: 'date-display',
            text: date,
            attributes: { 'data-widget-date': 'true' },
        }),
    ]);
}

function createWeatherWidget() {
    return createWidgetCard('widget-weather z-phone-widget-card', [
        createElement('div', {
            className: 'weather-icon',
            html: '<i class="fas fa-cloud-sun"></i>',
        }),
        createElement('div', {
            className: 'weather-info',
            html: '<div class="weather-temp">--</div><div class="weather-desc">Weather unavailable</div>',
        }),
    ]);
}

function createBalanceWidget(playerData) {
    return createWidgetCard('widget-stats z-phone-widget-card', [
        createElement('div', {
            className: 'stats-icon',
            html: '<i class="fas fa-wallet"></i>',
        }),
        createElement('div', {
            className: 'stats-content',
            children: [
                createElement('div', { className: 'stats-label', text: 'Balance' }),
                createElement('div', {
                    className: 'stats-value',
                    text: formatBalance(playerData),
                    attributes: { 'data-widget-balance': 'true' },
                }),
            ],
        }),
    ]);
}

function createHomePage(apps, playerData) {
    const page = createElement('div', { className: 'phone-page home-page z-phone-home-page' });
    const widgetsSection = createElement('div', { className: 'home-widgets-section' });
    const appsSection = createElement('div', { className: 'home-apps-section z-phone-app-grid' });
    const quickSection = createElement('div', { className: 'home-quick-section' });

    appendChildren(widgetsSection, [
        createTimeWidget(),
        createWeatherWidget(),
        createBalanceWidget(playerData),
    ]);

    apps.slice(0, HOME_PAGE_APP_LIMIT).forEach((app) => {
        appsSection.appendChild(createAppComponent(app));
    });

    appendChildren(page, [widgetsSection, appsSection, quickSection]);
    return page;
}

function createGridPage(apps) {
    const page = createElement('div', { className: 'phone-page z-phone-app-page' });

    for (let index = 0; index < GRID_APPS_PER_PAGE; index += 1) {
        const app = apps[index];
        page.appendChild(app ? createAppComponent(app) : createEmptyAppSlot());
    }

    return page;
}

function createIndicators(totalPages) {
    if (totalPages <= 1) {
        return createFragment([]);
    }

    const indicators = [];
    for (let index = 0; index < totalPages; index += 1) {
        indicators.push(createElement('div', {
            className: index === 0 ? 'page-dot active' : 'page-dot',
            dataset: { page: index },
        }));
    }

    return createFragment(indicators);
}

export function buildApplicationsLayout({ applications = [], playerData = {}, playerJob = {}, isAppJobBlocked }) {
    const dockApps = [];
    const pageApps = [];

    applications.forEach((app) => {
        if (isVisibleApp(app, playerJob, isAppJobBlocked)) {
            if (app.slot <= 4) {
                dockApps.push(app);
            } else {
                pageApps.push(app);
            }
        }
    });

    dockApps.sort((left, right) => left.slot - right.slot);
    pageApps.sort((left, right) => left.slot - right.slot);

    const pages = [createHomePage(pageApps, playerData)];
    const remainingApps = pageApps.slice(HOME_PAGE_APP_LIMIT);
    const additionalPages = Math.ceil(remainingApps.length / GRID_APPS_PER_PAGE);

    for (let pageIndex = 0; pageIndex < additionalPages; pageIndex += 1) {
        const pageStart = pageIndex * GRID_APPS_PER_PAGE;
        const pageAppsSlice = remainingApps.slice(pageStart, pageStart + GRID_APPS_PER_PAGE);
        pages.push(createGridPage(pageAppsSlice));
    }

    return {
        dockApps,
        totalPages: pages.length,
        pagesFragment: createFragment(pages),
        indicatorsFragment: createIndicators(pages.length),
    };
}

export function applyDockLayout(container, dockApps = []) {
    if (!container) {
        return;
    }

    for (let slotNumber = 1; slotNumber <= 4; slotNumber += 1) {
        const slot = container.querySelector(`[data-appslot="${slotNumber}"]`);
        const app = dockApps.find((entry) => Number(entry.slot) === slotNumber);
        renderDockSlot(slot, app);
    }
}

export function refreshWidgetValues(root = document, playerData = {}) {
    const { time, date } = formatClock();
    root.querySelectorAll('[data-widget-time="true"]').forEach((element) => {
        element.textContent = time;
    });
    root.querySelectorAll('[data-widget-date="true"]').forEach((element) => {
        element.textContent = date;
    });
    root.querySelectorAll('[data-widget-balance="true"]').forEach((element) => {
        element.textContent = formatBalance(playerData);
    });
}

export function ensureWidgetTimer(getPlayerData = () => (window.QB?.Phone?.Data?.PlayerData ?? {})) {
    if (widgetTimer !== null) {
        return widgetTimer;
    }

    const refreshInterval = window.Config?.Frontend?.widgetRefreshMs ?? DEFAULT_WIDGET_REFRESH_MILLISECONDS;

    widgetTimer = window.setInterval(() => {
        refreshWidgetValues(document, getPlayerData() || {});
    }, refreshInterval);

    return widgetTimer;
}

export function initializeHomeContainers(pageContainer, indicatorContainer) {
    clearChildren(pageContainer);
    clearChildren(indicatorContainer);
    return { pageContainer, indicatorContainer };
}
