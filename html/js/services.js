const SERVICES_SELECTORS = {
    filters: ".services-filters",
    servicesList: ".services-list-container.services-list",
    onlineCount: "#services-online-count",
    categoryCount: "#services-category-count",
    highlightTag: "#services-highlight-tag",
    filterScrollButton: "[data-services-scroll]",
    activeFilter: ".services-filter.is-active"
};

const PHONE_SELECTORS = {
    appContainer: ".phone-application-container",
    newCallBox: ".phone-new-box-body",
    outgoingCaller: ".phone-call-outgoing-caller",
    phoneApp: ".phone-app",
    currentCallContainer: ".phone-currentcall-container",
    incomingAnswer: "#incoming-answer"
};

const MESSAGE_SELECTORS = {
    openedChat: ".message-openedchat",
    chats: ".message-chats",
    openedChatMessages: ".message-openedchat-messages",
    composer: "#message-openedchat-message"
};

let CurrentServicesFilter = "all";
let CurrentServicesData = [];
const NEW_CALL_BOX_FADE_DURATION_MS = 350;
// Move most of the visible filter rail each click while leaving enough overlap for orientation.
const FILTER_SCROLL_STEP_RATIO = 0.75;
const MIN_FILTER_SCROLL_STEP_PX = 96;
// Allow a 1px tolerance so button states stay stable with sub-pixel scroll rounding.
const FILTER_SCROLL_THRESHOLD_PX = 1;
const FILTER_NAV_UPDATE_DELAY_MS = 50;
let ServicesFilterNavUpdateTimer = null;
let ServicesFilterPrevButton = null;
let ServicesFilterNextButton = null;

function getElement(selector) {
    return document.querySelector(selector);
}

function setElementText(selector, value) {
    const element = getElement(selector);
    if (element) {
        element.textContent = String(value);
    }
}

function setElementDisplay(selector, value) {
    const element = getElement(selector);
    if (element) {
        element.style.display = value;
    }
}

function hideElements(selectors) {
    document.querySelectorAll(selectors).forEach((element) => {
        element.style.display = "none";
    });
}

function waitForDuration(duration) {
    return new Promise((resolve) => {
        window.setTimeout(resolve, duration);
    });
}

async function postServiceRequest(endpoint, payload = {}) {
    const hasParentResourceName = typeof GetParentResourceName === "function";
    const resourceName = hasParentResourceName
        ? GetParentResourceName()
        : "z-phone";

    if (!hasParentResourceName) {
        console.warn("GetParentResourceName is unavailable; using fallback resource name for Services requests.");
    }

    const response = await fetch(`https://${resourceName}/${endpoint}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json; charset=UTF-8"
        },
        body: JSON.stringify(payload)
    });

    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
        return response.json();
    }

    const text = await response.text();

    try {
        return JSON.parse(text);
    } catch {
        return text;
    }
}

function formatPhoneNumber(phoneNumberString) {
    const cleaned = String(phoneNumberString).replace(/\D/g, "");
    const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);

    if (match) {
        return `(${match[1]}) ${match[2]}-${match[3]}`;
    }

    return phoneNumberString;
}

function sanitizeServiceText(value, fallback = "") {
    const normalized = String(value ?? fallback);
    return normalized.replace(/[<>&"'`]/g, "").trim() || fallback;
}

function sanitizeServiceClassName(value, fallback = "fa-solid fa-briefcase") {
    const normalized = String(value ?? fallback).replace(/[^a-zA-Z0-9\-_\s]/g, " ").trim();
    return normalized || fallback;
}

function sanitizeServiceColor(value, fallback = "#3b82f6") {
    const normalized = String(value ?? fallback).trim();
    return /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(normalized) ? normalized : fallback;
}

function sanitizeServicePhone(value) {
    return String(value ?? "").replace(/\D/g, "").slice(0, 20);
}

function normalizeServicesPayload(data) {
    if (Array.isArray(data)) {
        return data.map((service) => ({
            Job: sanitizeServiceText(service.Job, "service"),
            Label: sanitizeServiceText(service.Label || service.Job, "Service"),
            Tag: sanitizeServiceText(service.Tag, "Service"),
            Description: sanitizeServiceText(service.Description, "City support service."),
            Accent: sanitizeServiceColor(service.Accent, "#3b82f6"),
            Icon: sanitizeServiceClassName(service.Icon, "fa-solid fa-briefcase"),
            MessageTemplate: sanitizeServiceText(service.MessageTemplate, "Hello, I need assistance."),
            Players: Array.isArray(service.Players)
                ? service.Players.map((player) => ({
                    Name: sanitizeServiceText(player.Name, "On-duty staff"),
                    Phone: sanitizeServicePhone(player.Phone),
                    Job: sanitizeServiceText(player.Job || service.Job, service.Job || "service"),
                    Tag: sanitizeServiceText(player.Tag || service.Tag, service.Tag || "Service"),
                    Label: sanitizeServiceText(player.Label || service.Label, service.Label || "Service")
                })).filter((player) => player.Phone !== "")
                : []
        }));
    }

    return Object.entries(data || {}).map(([job, jobData]) => ({
        Job: sanitizeServiceText(job, "service"),
        Label: sanitizeServiceText((jobData && jobData.Label) || job, "Service"),
        Tag: sanitizeServiceText(jobData && jobData.Tag, "Service"),
        Description: sanitizeServiceText(jobData && jobData.Description, "City support service."),
        Accent: sanitizeServiceColor(jobData && jobData.Accent, "#3b82f6"),
        Icon: sanitizeServiceClassName(jobData && jobData.Icon, "fa-solid fa-briefcase"),
        MessageTemplate: sanitizeServiceText(jobData && jobData.MessageTemplate, "Hello, I need assistance."),
        Players: Array.isArray(jobData && jobData.Players)
            ? jobData.Players.map((player) => ({
                Name: sanitizeServiceText(player.Name, "On-duty staff"),
                Phone: sanitizeServicePhone(player.Phone),
                Job: sanitizeServiceText(job, "service"),
                Tag: sanitizeServiceText(jobData && jobData.Tag, "Service"),
                Label: sanitizeServiceText((jobData && jobData.Label) || job, "Service")
            })).filter((player) => player.Phone !== "")
            : []
    }));
}

function getFilteredServices(services) {
    if (CurrentServicesFilter === "all") {
        return services;
    }

    if (CurrentServicesFilter === "available") {
        return services.filter((service) => service.Players.length > 0);
    }

    return services.filter((service) => service.Job === CurrentServicesFilter);
}

function updateServicesSummary(services) {
    const onlineCount = services.reduce((total, service) => total + service.Players.length, 0);

    setElementText(SERVICES_SELECTORS.onlineCount, onlineCount);
    setElementText(SERVICES_SELECTORS.categoryCount, services.length);
    setElementText(SERVICES_SELECTORS.highlightTag, onlineCount > 0 ? "Ready" : "Standby");
}

function renderServicesFilters(services) {
    const filterContainer = getElement(SERVICES_SELECTORS.filters);
    if (!filterContainer) {
        return;
    }

    filterContainer.innerHTML = "";

    const baseFilters = [
        { key: "all", label: "All services" },
        { key: "available", label: "Available now" }
    ];

    const serviceFilters = services.map((service) => ({
        key: service.Job,
        label: service.Label
    }));

    [...baseFilters, ...serviceFilters].forEach((filter) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = `services-filter${CurrentServicesFilter === filter.key ? " is-active" : ""}`;
        button.dataset.filter = filter.key;
        button.textContent = filter.label;
        filterContainer.appendChild(button);
    });

    updateServicesFilterNavState();
    scrollActiveServicesFilterIntoView();
}

function createServicesEmptyState() {
    const wrapper = document.createElement("div");
    const icon = document.createElement("i");
    const title = document.createElement("div");
    const text = document.createElement("div");

    wrapper.className = "services-empty-state";
    icon.className = "fa-solid fa-headset";
    title.className = "services-empty-title";
    title.textContent = "No service desk matches";
    text.className = "services-empty-text";
    text.textContent = "Try another filter or wait for staff to clock in. Call and message actions appear as soon as a service is on duty.";

    wrapper.appendChild(icon);
    wrapper.appendChild(title);
    wrapper.appendChild(text);
    return wrapper;
}

function createServiceActionButton(type, accentColor, service, player) {
    const actionButton = document.createElement("button");

    actionButton.type = "button";
    actionButton.className = `service-action service-action-${type}`;
    actionButton.dataset.number = player.Phone;
    actionButton.dataset.name = player.Name;
    actionButton.dataset.job = service.Job;
    actionButton.dataset.label = service.Label;
    actionButton.dataset.tag = service.Tag;
    actionButton.dataset.template = service.MessageTemplate || "";
    actionButton.style.background = type === "call" ? accentColor : "#0f766e";
    actionButton.setAttribute("aria-label", `${type === "call" ? "Call" : "Message"} ${player.Name}`);

    const icon = document.createElement("i");
    icon.className = type === "call" ? "fa-solid fa-phone" : "fa-solid fa-comment-dots";
    actionButton.appendChild(icon);
    return actionButton;
}

function createServiceSection(service) {
    const section = document.createElement("section");
    const header = document.createElement("div");
    const main = document.createElement("div");
    const icon = document.createElement("div");
    const copy = document.createElement("div");
    const titleRow = document.createElement("div");
    const title = document.createElement("div");
    const tag = document.createElement("span");
    const status = document.createElement("span");
    const description = document.createElement("div");
    const count = document.createElement("div");
    const countNumber = document.createElement("strong");
    const countLabel = document.createElement("span");
    const people = document.createElement("div");
    const accentColor = service.Accent || "#3b82f6";
    const iconGlyph = document.createElement("i");

    section.className = "service-section";
    header.className = "service-section-header";
    main.className = "service-section-main";
    icon.className = "service-section-icon";
    icon.style.background = `linear-gradient(180deg, ${accentColor}, ${accentColor}cc)`;
    iconGlyph.className = service.Icon || "fa-solid fa-briefcase";
    icon.appendChild(iconGlyph);

    copy.className = "service-section-copy";
    titleRow.className = "service-section-title-row";
    title.className = "service-section-title";
    title.textContent = service.Label;
    tag.className = "service-tag";
    tag.textContent = service.Tag;
    status.className = `service-status${service.Players.length === 0 ? " is-offline" : ""}`;
    status.textContent = service.Players.length === 0 ? "Offline" : "On duty";
    description.className = "service-section-description";
    description.textContent = service.Description;

    titleRow.appendChild(title);
    titleRow.appendChild(tag);
    titleRow.appendChild(status);
    copy.appendChild(titleRow);
    copy.appendChild(description);

    count.className = "service-section-count";
    countNumber.textContent = String(service.Players.length);
    countLabel.textContent = "online";
    count.appendChild(countNumber);
    count.appendChild(countLabel);

    main.appendChild(icon);
    main.appendChild(copy);
    header.appendChild(main);
    header.appendChild(count);
    section.appendChild(header);

    people.className = "service-people";

    if (service.Players.length === 0) {
        const empty = document.createElement("div");
        empty.className = "service-empty";
        empty.textContent = `Nobody from ${service.Label} is on duty right now. Check back later or try another service desk.`;
        people.appendChild(empty);
    } else {
        service.Players.forEach((player) => {
            const person = document.createElement("div");
            const personMain = document.createElement("div");
            const personName = document.createElement("div");
            const personMeta = document.createElement("div");
            const personPhone = document.createElement("span");
            const personTag = document.createElement("span");
            const dutyTag = document.createElement("span");
            const actions = document.createElement("div");

            person.className = "service-person";
            personMain.className = "service-person-main";
            personName.className = "service-person-name";
            personName.textContent = player.Name;

            personMeta.className = "service-person-meta";
            personPhone.className = "service-person-phone";
            personPhone.textContent = formatPhoneNumber(player.Phone);
            personTag.className = "service-person-tag";
            personTag.textContent = player.Tag || service.Tag;
            dutyTag.className = "service-person-tag";
            dutyTag.textContent = "On duty";

            personMeta.appendChild(personPhone);
            personMeta.appendChild(personTag);
            personMeta.appendChild(dutyTag);
            personMain.appendChild(personName);
            personMain.appendChild(personMeta);

            actions.className = "service-person-actions";
            actions.appendChild(createServiceActionButton("message", accentColor, service, player));
            actions.appendChild(createServiceActionButton("call", accentColor, service, player));

            person.appendChild(personMain);
            person.appendChild(actions);
            people.appendChild(person);
        });
    }

    section.appendChild(people);
    return section;
}

function renderServicesDirectory() {
    const listContainer = getElement(SERVICES_SELECTORS.servicesList);
    if (!listContainer) {
        return;
    }

    const filteredServices = getFilteredServices(CurrentServicesData);
    const fragment = document.createDocumentFragment();

    listContainer.innerHTML = "";

    if (filteredServices.length === 0) {
        listContainer.appendChild(createServicesEmptyState());
        return;
    }

    filteredServices.forEach((service) => {
        fragment.appendChild(createServiceSection(service));
    });

    listContainer.appendChild(fragment);
}

function isCurrentServicesFilterAvailable(services) {
    return CurrentServicesFilter === "all"
        || CurrentServicesFilter === "available"
        || services.some((service) => service.Job === CurrentServicesFilter);
}

function getServicesFilterContainer() {
    return getElement(SERVICES_SELECTORS.filters);
}

function cacheServicesFilterNavButtons() {
    if (!ServicesFilterPrevButton) {
        ServicesFilterPrevButton = document.querySelector('[data-services-scroll="prev"]');
    }

    if (!ServicesFilterNextButton) {
        ServicesFilterNextButton = document.querySelector('[data-services-scroll="next"]');
    }
}

function getServicesFilterScrollAmount() {
    const filterContainer = getServicesFilterContainer();
    if (!filterContainer) {
        return 0;
    }

    return Math.max(filterContainer.clientWidth * FILTER_SCROLL_STEP_RATIO, MIN_FILTER_SCROLL_STEP_PX);
}

function updateServicesFilterNavState() {
    const filterContainer = getServicesFilterContainer();
    if (!filterContainer) {
        return;
    }

    const maxScrollLeft = Math.max(filterContainer.scrollWidth - filterContainer.clientWidth, 0);
    const canScroll = maxScrollLeft > FILTER_SCROLL_THRESHOLD_PX;
    cacheServicesFilterNavButtons();

    if (ServicesFilterPrevButton) {
        ServicesFilterPrevButton.disabled = !canScroll || filterContainer.scrollLeft <= FILTER_SCROLL_THRESHOLD_PX;
    }

    if (ServicesFilterNextButton) {
        ServicesFilterNextButton.disabled = !canScroll || filterContainer.scrollLeft >= maxScrollLeft - FILTER_SCROLL_THRESHOLD_PX;
    }
}

function scheduleServicesFilterNavStateUpdate() {
    if (ServicesFilterNavUpdateTimer !== null) {
        window.clearTimeout(ServicesFilterNavUpdateTimer);
    }

    ServicesFilterNavUpdateTimer = window.setTimeout(() => {
        ServicesFilterNavUpdateTimer = null;
        updateServicesFilterNavState();
    }, FILTER_NAV_UPDATE_DELAY_MS);
}

function scrollServicesFilters(direction) {
    const filterContainer = getServicesFilterContainer();
    if (!filterContainer) {
        return;
    }

    const isPreviousDirection = direction === "prev";
    const amount = getServicesFilterScrollAmount() * (isPreviousDirection ? -1 : 1);
    filterContainer.scrollBy({
        left: amount,
        behavior: "smooth"
    });
}

function scrollActiveServicesFilterIntoView() {
    const activeFilter = getElement(SERVICES_SELECTORS.activeFilter);
    if (!activeFilter) {
        return;
    }

    activeFilter.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center"
    });
}

function getMessageDraftValue() {
    // html/js/message.js loads before this file and may expose composer helpers globally.
    // If those helpers are unavailable, this falls back to the raw textarea value instead.
    if (typeof getMessageComposerValue === "function") {
        return String(getMessageComposerValue() ?? "").trim();
    }

    const composer = getElement(MESSAGE_SELECTORS.composer);
    return composer ? String(composer.value ?? "").trim() : "";
}

function setMessageDraftValue(value) {
    // html/js/message.js loads before this file and may expose composer helpers globally.
    // If those helpers are unavailable, this writes directly into the textarea.
    if (typeof getMessageComposerInstance === "function") {
        const composerInstance = getMessageComposerInstance();
        if (composerInstance && typeof composerInstance.setText === "function") {
            composerInstance.setText(value);
            return;
        }
    }

    const composer = getElement(MESSAGE_SELECTORS.composer);
    if (composer) {
        composer.value = value;
        composer.dispatchEvent(new Event("input", { bubbles: true }));
        composer.dispatchEvent(new Event("change", { bubbles: true }));
    }
}

function revealMessageThread() {
    const openedChat = getElement(MESSAGE_SELECTORS.openedChat);
    const chats = getElement(MESSAGE_SELECTORS.chats);
    const messages = getElement(MESSAGE_SELECTORS.openedChatMessages);

    if (messages) {
        messages.scrollTo({
            top: messages.scrollHeight,
            behavior: "smooth"
        });
    }

    if (openedChat) {
        openedChat.style.display = "block";
        openedChat.style.transition = "left 150ms cubic-bezier(0.165, 0.84, 0.44, 1)";
        window.requestAnimationFrame(() => {
            openedChat.style.left = "0vh";
        });
    }

    if (chats) {
        chats.style.display = "block";
        chats.style.transition = "left 100ms cubic-bezier(0.165, 0.84, 0.44, 1)";

        window.requestAnimationFrame(() => {
            chats.style.left = "30vh";
        });

        window.setTimeout(() => {
            chats.style.display = "none";
            chats.style.left = "0";
        }, 100);
    }
}

async function openServiceMessageThread(contactData) {
    try {
        const chats = await postServiceRequest("GetMessageChats", {});
        QB.Phone.Functions.LoadMessageChats(chats);

        QB.Phone.Animations.TopSlideUp(PHONE_SELECTORS.appContainer, 400, -160);
        QB.Phone.Functions.HeaderTextColor("white", 400);

        await waitForDuration(400);

        QB.Phone.Animations.TopSlideDown(PHONE_SELECTORS.appContainer, 400, 0);
        QB.Phone.Functions.ToggleApp("services", "none");
        QB.Phone.Functions.ToggleApp("message", "block");
        QB.Phone.Data.currentApplication = "message";

        const chat = await postServiceRequest("GetMessageChat", { phone: contactData.number });
        QB.Phone.Functions.SetupChatMessages(chat, {
            name: contactData.name,
            number: contactData.number
        });

        if (contactData.template && getMessageDraftValue() === "") {
            setMessageDraftValue(contactData.template);
        }

        revealMessageThread();
    } catch (error) {
        console.error(`Failed to open the service message thread for ${contactData.name} (${contactData.number}).`, error);
    }
}

async function startServiceCall(number, name) {
    if (!number) {
        return;
    }

    const cData = {
        number,
        name: name || number
    };

    const newCallBox = getElement(PHONE_SELECTORS.newCallBox);
    if (newCallBox) {
        newCallBox.style.transition = `opacity ${NEW_CALL_BOX_FADE_DURATION_MS}ms ease`;
        newCallBox.style.opacity = "0";

        window.setTimeout(() => {
            newCallBox.style.display = "none";
            newCallBox.style.opacity = "";
            newCallBox.style.transition = "";
        }, NEW_CALL_BOX_FADE_DURATION_MS);
    }

    ClearInputNew();

    if (typeof SetupCall === 'function') {
        SetupCall(cData);
    }
}

SetupServicesDirectory = function(data) {
    CurrentServicesData = normalizeServicesPayload(data).sort((a, b) => {
        if (b.Players.length !== a.Players.length) {
            return b.Players.length - a.Players.length;
        }

        return a.Label.localeCompare(b.Label);
    });

    updateServicesSummary(CurrentServicesData);

    if (!isCurrentServicesFilterAvailable(CurrentServicesData)) {
        CurrentServicesFilter = "all";
    }

    renderServicesFilters(CurrentServicesData);
    renderServicesDirectory();
};

document.addEventListener("click", (event) => {
    const scrollButton = event.target.closest(SERVICES_SELECTORS.filterScrollButton);
    if (scrollButton) {
        event.preventDefault();
        scrollServicesFilters(scrollButton.dataset.servicesScroll);
        return;
    }

    const filterButton = event.target.closest(".services-filter");
    if (filterButton) {
        event.preventDefault();
        CurrentServicesFilter = filterButton.dataset.filter || "all";
        renderServicesFilters(CurrentServicesData);
        renderServicesDirectory();
        return;
    }

    const callButton = event.target.closest(".service-action-call");
    if (callButton) {
        event.preventDefault();
        const number = sanitizeServicePhone(callButton.dataset.number);
        const name = sanitizeServiceText(callButton.dataset.name, number);
        startServiceCall(number, name);
        return;
    }

    const messageButton = event.target.closest(".service-action-message");
    if (messageButton) {
        event.preventDefault();

        const number = sanitizeServicePhone(messageButton.dataset.number);
        const displayName = sanitizeServiceText(messageButton.dataset.name, number);
        const label = sanitizeServiceText(messageButton.dataset.label, "Service");
        const template = sanitizeServiceText(messageButton.dataset.template, "");

        if (!number) {
            return;
        }

        openServiceMessageThread({
            number,
            name: `${label} • ${displayName}`,
            template
        });
    }
});

document.addEventListener("DOMContentLoaded", () => {
    const filterContainer = getServicesFilterContainer();
    if (!filterContainer) {
        return;
    }

    cacheServicesFilterNavButtons();
    filterContainer.addEventListener("scroll", scheduleServicesFilterNavStateUpdate, { passive: true });
    updateServicesFilterNavState();
});

window.addEventListener("resize", scheduleServicesFilterNavStateUpdate);
