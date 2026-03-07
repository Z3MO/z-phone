let CurrentServicesFilter = "all";
let CurrentServicesData = [];

function formatPhoneNumber(phoneNumberString) {
    var cleaned = ('' + phoneNumberString).replace(/\D/g, '');
    var match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
    if (match) {
      return '(' + match[1] + ') ' + match[2] + '-' + match[3];
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
            Players: Array.isArray(service.Players) ? service.Players.map((player) => ({
                Name: sanitizeServiceText(player.Name, "On-duty staff"),
                Phone: sanitizeServicePhone(player.Phone),
                Job: sanitizeServiceText(player.Job || service.Job, service.Job || "service"),
                Tag: sanitizeServiceText(player.Tag || service.Tag, service.Tag || "Service"),
                Label: sanitizeServiceText(player.Label || service.Label, service.Label || "Service")
            })).filter((player) => player.Phone !== "") : []
        }));
    }

    const normalized = [];
    $.each(data || {}, function(job, jobData) {
        normalized.push({
            Job: sanitizeServiceText(job, "service"),
            Label: sanitizeServiceText(jobData && jobData.Label || job, "Service"),
            Tag: sanitizeServiceText(jobData && jobData.Tag, "Service"),
            Description: sanitizeServiceText(jobData && jobData.Description, "City support service."),
            Accent: sanitizeServiceColor(jobData && jobData.Accent, "#3b82f6"),
            Icon: sanitizeServiceClassName(jobData && jobData.Icon, "fa-solid fa-briefcase"),
            MessageTemplate: sanitizeServiceText(jobData && jobData.MessageTemplate, "Hello, I need assistance."),
            Players: Array.isArray(jobData && jobData.Players) ? jobData.Players.map((player) => ({
                Name: sanitizeServiceText(player.Name, "On-duty staff"),
                Phone: sanitizeServicePhone(player.Phone),
                Job: sanitizeServiceText(job, "service"),
                Tag: sanitizeServiceText(jobData && jobData.Tag, "Service"),
                Label: sanitizeServiceText(jobData && jobData.Label || job, "Service")
            })).filter((player) => player.Phone !== "") : []
        });
    });
    return normalized;
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
    $("#services-online-count").text(onlineCount);
    $("#services-category-count").text(services.length);
    $("#services-highlight-tag").text(onlineCount > 0 ? "Ready" : "Standby");
}

function renderServicesFilters(services) {
    const filterContainer = document.querySelector(".services-filters");
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
    const listContainer = document.querySelector(".taxis-list");
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

function openServiceMessageThread(contactData) {
    $.post(`https://${GetParentResourceName()}/GetWhatsappChats`, JSON.stringify({}), function(chats){
        QB.Phone.Functions.LoadWhatsappChats(chats);
    });

    $('.phone-application-container').animate({
        top: -160+"%"
    });
    QB.Phone.Functions.HeaderTextColor("white", 400);

    setTimeout(function(){
        $('.phone-application-container').animate({
            top: 0+"%"
        });

        QB.Phone.Functions.ToggleApp("taxi", "none");
        QB.Phone.Functions.ToggleApp("whatsapp", "block");
        QB.Phone.Data.currentApplication = "whatsapp";

        $.post(`https://${GetParentResourceName()}/GetWhatsappChat`, JSON.stringify({phone: contactData.number}), function(chat){
            QB.Phone.Functions.SetupChatMessages(chat, {
                name: contactData.name,
                number: contactData.number
            });

            const composerInstance = $('#whatsapp-openedchat-message').data('emojioneArea');
            const currentDraft = composerInstance && typeof composerInstance.getText === "function"
                ? String(composerInstance.getText() ?? "").trim()
                : String($("#whatsapp-openedchat-message").val() ?? "").trim();

            if (contactData.template && currentDraft === "") {
                if (composerInstance && typeof composerInstance.setText === "function") {
                    composerInstance.setText(contactData.template);
                } else {
                    $("#whatsapp-openedchat-message").val(contactData.template);
                }
            }
        });

        $('.whatsapp-openedchat-messages').animate({scrollTop: 9999}, 150);
        $(".whatsapp-openedchat").css({"display":"block"});
        $(".whatsapp-openedchat").css({left: 0+"vh"});
        $(".whatsapp-chats").css({"display":"block"}).animate({left: 30+"vh"},100, function(){
            $(".whatsapp-chats").css({"display":"none"});
        });
    }, 400);
}

function startServiceCall(number, name) {
    if (!number) {
        return;
    }

    const cData = {
        number: number,
        name: name || number,
    };

    $.post(`https://${GetParentResourceName()}/CallContact`, JSON.stringify({
        ContactData: cData,
        Anonymous: QB.Phone.Data.AnonymousCall,
    }), function(status){
        if (cData.number !== QB.Phone.Data.PlayerData.charinfo.phone) {
            if (status.IsOnline) {
                if (status.CanCall) {
                    if (!status.InCall) {
                        $('.phone-new-box-body').fadeOut(350);
                        ClearInputNew();
                        $(".phone-call-outgoing").css({"display":"none"});
                        $(".phone-call-incoming").css({"display":"none"});
                        $(".phone-call-ongoing").css({"display":"none"});
                        $(".phone-call-outgoing-caller").text(cData.name);
                        QB.Phone.Functions.HeaderTextColor("white", 400);
                        QB.Phone.Animations.TopSlideUp('.phone-application-container', 400, -160);
                        setTimeout(function(){
                            $(".phone-app").css({"display":"none"});
                            QB.Phone.Animations.TopSlideDown('.phone-application-container', 400, -160);
                            QB.Phone.Functions.ToggleApp("phone-call", "block");
                            $(".phone-currentcall-container").css({"display":"block"});
                            $("#incoming-answer").css({"display":"none"});
                        }, 450);

                        CallData.name = cData.name;
                        CallData.number = cData.number;
                        QB.Phone.Data.currentApplication = "phone-call";
                    } else {
                        QB.Phone.Notifications.Add("fas fa-phone", "Phone", "You're already in a call!");
                    }
                } else {
                    QB.Phone.Notifications.Add("fas fa-phone", "Phone", "This person is busy!");
                }
            } else {
                QB.Phone.Notifications.Add("fas fa-phone", "Phone", "This person is not available!");
            }
        } else {
            QB.Phone.Notifications.Add("fas fa-phone", "Phone", "You can't call yourself!");
        }
    });
}

SetupTaxiDrivers = function(data) {
    CurrentServicesData = normalizeServicesPayload(data).sort((a, b) => {
        if (b.Players.length !== a.Players.length) {
            return b.Players.length - a.Players.length;
        }
        return a.Label.localeCompare(b.Label);
    });

    updateServicesSummary(CurrentServicesData);

    const filterStillExists = CurrentServicesFilter === "all" || CurrentServicesFilter === "available" || CurrentServicesData.some((service) => service.Job === CurrentServicesFilter);
    if (!filterStillExists) {
        CurrentServicesFilter = "all";
    }

    renderServicesFilters(CurrentServicesData);
    renderServicesDirectory();
}

$(document).on('click', '.services-filter', function(e){
    e.preventDefault();
    CurrentServicesFilter = $(this).data('filter') || "all";
    renderServicesFilters(CurrentServicesData);
    renderServicesDirectory();
});

$(document).on('click', '.service-action-call', function(e){
    e.preventDefault();
    const number = sanitizeServicePhone($(this).data('number'));
    const name = sanitizeServiceText($(this).data('name'), number);
    startServiceCall(number, name);
});

$(document).on('click', '.service-action-message', function(e){
    e.preventDefault();
    const number = sanitizeServicePhone($(this).data('number'));
    const displayName = sanitizeServiceText($(this).data('name'), number);
    const label = sanitizeServiceText($(this).data('label'), "Service");
    const template = sanitizeServiceText($(this).data('template'), "");

    if (!number) {
        return;
    }

    openServiceMessageThread({
        number: number,
        name: `${label} • ${displayName}`,
        template: template
    });
});
