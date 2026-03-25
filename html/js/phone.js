var CurrentFooterTab = "contacts";
var CallData = {};
var ClearNumberTimer = null;
var SelectedSuggestion = null;
var AmountOfSuggestions = 0;
var keyPadHTML;
var PhoneContactsCache = [];
var SuggestedContactsCache = [];
var NearbySharePlayers = [];
var NearbyShareLoading = false;
var ContactSearchDebounce = null;
var NearbySearchDebounce = null;
var CurrentEditContactData = {};
var OpenedContact = null;
var RecentCallsCache = [];
var CallRequestInFlight = false;
var MAX_DIAL_DIGITS = 10;
var PhoneTabAnimating = false;
var PhoneTabOrder = ['suggestedcontacts', 'keypad', 'recent', 'contacts'];
var PhoneTabTransitionTimer = null;
var ContactContextMenuTarget = null;

var RecentCallStates = {
    missed: {
        icon: 'fas fa-phone-slash',
        accent: '#ff7b72',
        label: 'Missed'
    },
    outgoing: {
        icon: 'fas fa-phone-volume',
        accent: '#4ade80',
        label: 'Outgoing'
    },
    incoming: {
        icon: 'fas fa-phone',
        accent: '#6cb8ff',
        label: 'Incoming'
    }
};

function togglePhonePrimaryHeader() {
    $('.phone-app-header').toggle(CurrentFooterTab === 'contacts');
}

function sanitizePhoneText(value, fallback, maxLength) {
    var sanitized = DOMPurify.sanitize(String(value ?? ''), {
        ALLOWED_TAGS: [],
        ALLOWED_ATTR: []
    }).replace(/\s+/g, ' ').trim();

    if (typeof maxLength === 'number' && maxLength > 0) {
        sanitized = sanitized.slice(0, maxLength);
    }

    return sanitized || (fallback || '');
}

function sanitizePhoneNumber(value) {
    return String(value ?? '').replace(/\D/g, '').slice(0, 15);
}

function sanitizePhoneIban(value) {
    return sanitizePhoneText(value, '', 32).replace(/[^a-zA-Z0-9-]/g, '').slice(0, 32);
}

function formatPhoneDisplay(value) {
    var digits = sanitizePhoneNumber(value);

    if (!digits.length) {
        return '';
    }

    if (digits.length <= 3) {
        return digits;
    }

    if (digits.length <= 6) {
        return digits.replace(/(\d{3})(\d+)/, '$1 $2');
    }

    if (digits.length <= 10) {
        return digits.replace(/(\d{3})(\d{3})(\d+)/, '$1 $2 $3');
    }

    return digits.replace(/(\d{3})(\d{3})(\d{4})(\d+)/, '$1 $2 $3 $4').trim();
}

function formatDialerInputDisplay(value) {
    var dialValue = String(value ?? '').replace(/[^0-9#]/g, '');

    if (!dialValue.length) {
        return '';
    }

    if (dialValue.includes('#')) {
        return dialValue;
    }

    return formatPhoneDisplay(dialValue);
}

function getContactByNumber(number) {
    var safeNumber = sanitizePhoneNumber(number);
    return PhoneContactsCache.find(function(contact) {
        return sanitizePhoneNumber(contact.number) === safeNumber;
    }) || null;
}

function createAvatarLabel(name, number, anonymous) {
    if (anonymous) {
        return 'A';
    }

    var safeName = sanitizePhoneText(name, '', 48);
    if (safeName.length) {
        return safeName.charAt(0).toUpperCase();
    }

    var safeNumber = sanitizePhoneNumber(number);
    return safeNumber ? safeNumber.charAt(0) : '#';
}

function closeOpenedContactCard() {
    if (OpenedContact === null) {
        return;
    }

    var previousContact = $(OpenedContact);
    previousContact.find('.phone-contact-action-buttons').stop(true, true).fadeOut(100, function() {
        previousContact.stop(true, true).animate({
            height: '8.8vh'
        }, 120);
    });

    OpenedContact = null;
}

function updateDialerPreview() {
    var safeNumber = String(keyPadHTML ?? '');
    var matchingContact = getContactByNumber(safeNumber);
    var previewName = $('.phone-keypad-preview-name');
    var previewMeta = $('.phone-keypad-preview-meta');

    if (!safeNumber.length) {
        previewName.text('No contact selected');
        previewMeta.text('Enter a number or pick someone from history.');
        return;
    }

    if (matchingContact) {
        previewName.text(sanitizePhoneText(matchingContact.name, 'Saved Contact', 48));
        previewMeta.text('Saved contact · ' + formatPhoneDisplay(safeNumber));
        return;
    }

    previewName.text(formatDialerInputDisplay(safeNumber));
    previewMeta.text('Unsaved number · Ready to call');
}

function setCallVisualState(state, contactData) {
    var safeName = sanitizePhoneText(contactData && contactData.name, formatPhoneDisplay(contactData && contactData.number), 48);
    var safeNumber = formatPhoneDisplay(contactData && contactData.number);
    var avatarLabel = createAvatarLabel(safeName, safeNumber, contactData && contactData.anonymous);

    $('.phone-call-incoming, .phone-call-outgoing, .phone-call-ongoing').hide();
    $('.phone-call-' + state).show();

    $('.phone-call-' + state + '-caller').text(safeName || safeNumber || 'Unknown Number');
    $('.phone-call-' + state + '-picture').text(avatarLabel);

    if (state === 'incoming') {
        $('.phone-call-incoming-title').text(safeNumber ? 'Incoming call · ' + safeNumber : 'Incoming Call');
    } else if (state === 'outgoing') {
        $('.phone-call-outgoing-title').text(safeNumber ? 'Calling · ' + safeNumber : 'Calling...');
    } else if (state === 'ongoing') {
        $('.phone-call-ongoing-title').text(safeNumber ? 'Connected · ' + safeNumber : 'Ongoing');
    }
}

function openPhoneCallScreen(contactData) {
    var currentApp = QB.Phone.Data.currentApplication || 'phone';

    setCallVisualState('outgoing', contactData);
    QB.Phone.Functions.HeaderTextColor('white', 400);
    QB.Phone.Animations.TopSlideUp('.phone-application-container', 250, -100);

    if (currentApp !== 'phone-call') {
        QB.Phone.Animations.TopSlideUp('.' + currentApp + '-app', 400, -100);
    }

    setTimeout(function() {
        if (currentApp !== 'phone-call') {
            QB.Phone.Functions.ToggleApp(currentApp, 'none');
        }
        QB.Phone.Animations.TopSlideDown('.phone-application-container', 400, 0);
        QB.Phone.Functions.ToggleApp('phone-call', 'block');
    }, 450);

    CallData.name = sanitizePhoneText(contactData.name, formatPhoneDisplay(contactData.number), 48);
    CallData.number = sanitizePhoneNumber(contactData.number);
    QB.Phone.Data.currentApplication = 'phone-call';
}

function resetPhoneCallScreen() {
    $('.phone-call-incoming, .phone-call-outgoing, .phone-call-ongoing').hide();
    $('.phone-call-app').hide();
    $('.phone-currentcall-container').hide();
    QB.Phone.Functions.ToggleApp('phone-call', 'none');
    QB.Phone.Functions.HeaderTextColor('white', 250);
    QB.Phone.Data.CallActive = false;

    if (QB.Phone.Data.currentApplication === 'phone-call') {
        QB.Phone.Data.currentApplication = null;
    }
}

function requestPhoneCall(contactData) {
    var safeNumber = sanitizePhoneNumber(contactData && contactData.number);
    var safeName = sanitizePhoneText(contactData && contactData.name, formatPhoneDisplay(safeNumber), 48);
    var safeContact = {
        number: safeNumber,
        name: safeName || formatPhoneDisplay(safeNumber)
    };

    if (!safeNumber.length) {
        QB.Phone.Notifications.Add('fas fa-phone', 'Phone', 'Enter a valid number first!');
        return;
    }

    if (CallRequestInFlight) {
        return;
    }

    CallRequestInFlight = true;

    $.post(`https://${GetParentResourceName()}/CallContact`, JSON.stringify({
        ContactData: safeContact,
        Anonymous: QB.Phone.Data.AnonymousCall,
    }), function(status) {
        status = status || {};

        if (safeContact.number !== QB.Phone.Data.PlayerData.charinfo.phone) {
            if (status.IsOnline) {
                if (status.CanCall) {
                    if (!status.InCall) {
                        if (QB.Phone.Data.AnonymousCall) {
                            QB.Phone.Notifications.Add('fas fa-phone', 'Phone', 'Anonymous call started.');
                        }

                        openPhoneCallScreen(safeContact);
                    } else {
                        QB.Phone.Notifications.Add('fas fa-phone', 'Phone', "You're already in a call!");
                    }
                } else {
                    QB.Phone.Notifications.Add('fas fa-phone', 'Phone', status.Message || 'This person is busy right now.');
                }
            } else {
                QB.Phone.Notifications.Add('fas fa-phone', 'Phone', status.Message || 'This person is not available.');
            }
        } else {
            QB.Phone.Notifications.Add('fas fa-phone', 'Phone', "You can't call your own number!");
        }
    }).fail(function() {
        QB.Phone.Notifications.Add('fas fa-phone', 'Phone', 'Call request failed. Try again.');
    }).always(function() {
        CallRequestInFlight = false;
    });
}

function buildContactColor(name, highlighted) {
    if (highlighted) {
        return '#fc4e03';
    }

    var safeName = sanitizePhoneText(name, 'C', 48);
    var colorIndex = safeName.charCodeAt(0) % Object.keys(QB.Phone.ContactColors).length;
    return QB.Phone.ContactColors[colorIndex] || '#3498db';
}

function getPhoneTabDirection(fromTab, toTab) {
    var fromIndex = PhoneTabOrder.indexOf(fromTab);
    var toIndex = PhoneTabOrder.indexOf(toTab);

    if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) {
        return 1;
    }

    return toIndex > fromIndex ? 1 : -1;
}

function animatePhoneFooterTabSwitch($oldTab, $newTab, direction) {
    var leaveClass = direction > 0 ? 'phone-tab-leave-left' : 'phone-tab-leave-right';
    var enterClass = direction > 0 ? 'phone-tab-enter-right' : 'phone-tab-enter-left';
    var allClasses = 'phone-tab-enter-left phone-tab-enter-right phone-tab-leave-left phone-tab-leave-right';

    if (PhoneTabTransitionTimer !== null) {
        clearTimeout(PhoneTabTransitionTimer);
        PhoneTabTransitionTimer = null;
    }

    $oldTab
        .stop(true, true)
        .removeClass(allClasses)
        .css({ display: 'block', zIndex: 1, pointerEvents: 'none' })
        .addClass(leaveClass);

    $newTab
        .stop(true, true)
        .removeClass(allClasses)
        .css({ display: 'block', zIndex: 2, pointerEvents: 'none' })
        .addClass(enterClass);

    PhoneTabTransitionTimer = setTimeout(function() {
        $oldTab
            .hide()
            .removeClass(leaveClass)
            .css({ zIndex: '', pointerEvents: '', transform: '', opacity: '' });

        $newTab
            .removeClass(enterClass)
            .css({ zIndex: '', pointerEvents: '', transform: '', opacity: '' });

        PhoneTabTransitionTimer = null;
        PhoneTabAnimating = false;
    }, 290);
}

function setPhoneFooterTab(tabName) {
    if (!tabName || tabName === CurrentFooterTab || PhoneTabAnimating) {
        return;
    }

    PhoneTabAnimating = true;
    closeContactContextMenu();
    closeOpenedContactCard();

    $('.phone-app-footer').find('[data-phonefootertab="' + CurrentFooterTab + '"]').removeClass('phone-selected-footer-tab');
    $('.phone-app-footer').find('[data-phonefootertab="' + tabName + '"]').addClass('phone-selected-footer-tab');

    var $oldTab = $('.phone-' + CurrentFooterTab);
    var $newTab = $('.phone-' + tabName);
    var tabDirection = getPhoneTabDirection(CurrentFooterTab, tabName);

    animatePhoneFooterTabSwitch($oldTab, $newTab, tabDirection);

    if (tabName === 'recent' || tabName === 'suggestedcontacts') {
        $.post(`https://${GetParentResourceName()}/ClearRecentAlerts`);
    }

    CurrentFooterTab = tabName;
    togglePhonePrimaryHeader();
}

function createContactEmptyState(message) {
    return $('<div class="phone-contact-empty"></div>').text(message);
}

function renderContacts() {
    var ContactsObject = $('.phone-contact-list');
    var query = sanitizePhoneText($('#contact-search').val(), '', 48).toLowerCase();
    var filteredContacts = PhoneContactsCache.slice().sort(function(firstContact, secondContact) {
        return sanitizePhoneText(firstContact.name, '', 48).localeCompare(sanitizePhoneText(secondContact.name, '', 48));
    }).filter(function(contact) {
        var name = sanitizePhoneText(contact.name, '', 48).toLowerCase();
        var number = sanitizePhoneNumber(contact.number).toLowerCase();
        return !query || name.includes(query) || number.includes(query);
    });

    OpenedContact = null;
    ContactsObject.empty();

    if (!filteredContacts.length) {
        ContactsObject.append(createContactEmptyState(query ? 'No contacts match that search.' : 'No saved contacts yet.'));
        $('#total-contacts').text(PhoneContactsCache.length + ' contacts');
        return;
    }

    var fragment = document.createDocumentFragment();
    filteredContacts.forEach(function(contact) {
        var safeName = sanitizePhoneText(contact.name, 'Unknown Contact', 48);
        var safeNumber = sanitizePhoneNumber(contact.number);
        var element = document.createElement('div');
        element.className = 'phone-contact';
        element.setAttribute('data-contact-number', safeNumber);

        var main = document.createElement('div');
        main.className = 'phone-contact-main';

        var avatar = document.createElement('div');
        avatar.className = 'phone-contact-avatar';
        avatar.style.backgroundColor = buildContactColor(safeName, contact.status);
        avatar.textContent = safeName.charAt(0).toUpperCase();

        var details = document.createElement('div');
        details.className = 'phone-contact-details';

        var nameEl = document.createElement('div');
        nameEl.className = 'phone-contact-name';
        nameEl.textContent = safeName;

        var subtitle = document.createElement('div');
        subtitle.className = 'phone-contact-subtitle';
        subtitle.textContent = safeNumber ? formatPhoneDisplay(safeNumber) : 'No number available';

        details.appendChild(nameEl);
        details.appendChild(subtitle);

        main.appendChild(avatar);
        main.appendChild(details);

        element.appendChild(main);

        $(element).data('contactData', {
            name: safeName,
            number: safeNumber,
            iban: sanitizePhoneIban(contact.iban || ''),
            status: !!contact.status
        });

        fragment.appendChild(element);
    });

    ContactsObject.append(fragment);
    $('#total-contacts').text(PhoneContactsCache.length + ' contacts');
}

function renderSuggestedContacts() {
    var container = $('.suggested-contacts');
    container.empty();
    AmountOfSuggestions = SuggestedContactsCache.length;
    $('.amount-of-suggested-contacts').text(AmountOfSuggestions + ' contacts');

    if (!SuggestedContactsCache.length) {
        container.append(createContactEmptyState('No suggested contacts right now.'));
        return;
    }

    var fragment = document.createDocumentFragment();
    SuggestedContactsCache.forEach(function(suggest, index) {
        var firstName = sanitizePhoneText(suggest.name && suggest.name[0], 'Unknown', 24);
        var lastName = sanitizePhoneText(suggest.name && suggest.name[1], '', 24);
        var fullName = firstName + (lastName ? ' ' + lastName : '');
        var number = sanitizePhoneNumber(suggest.number);
        var bank = sanitizePhoneIban(suggest.bank || '');
        var element = document.createElement('div');
        element.className = 'suggested-contact';
        element.id = 'suggest-' + index;
        var initial = firstName.charAt(0).toUpperCase();

        element.innerHTML = '' +
            '<div class="suggested-contact-avatar"></div>' +
            '<div class="suggested-contact-info">' +
                '<div class="suggested-name"></div>' +
                '<div class="suggested-details">' +
                    '<span class="suggested-number"></span>' +
                    '<span class="suggested-meta"></span>' +
                '</div>' +
            '</div>' +
            '<div class="suggested-contact-add"><i class="fa-solid fa-user-plus"></i></div>';

        element.querySelector('.suggested-contact-avatar').textContent = initial;
        element.querySelector('.suggested-contact-avatar').style.backgroundColor = buildContactColor(fullName, false);
        element.querySelector('.suggested-name').textContent = fullName;
        element.querySelector('.suggested-number').textContent = formatPhoneDisplay(number);
        element.querySelector('.suggested-meta').textContent = bank ? 'Bank ' + bank : 'New Suggestion';
        $(element).data('SuggestionData', {
            name: [firstName, lastName],
            number: number,
            bank: bank
        });
        fragment.appendChild(element);
    });

    container.append(fragment);
}

function renderNearbySharePlayers() {
    var list = $('.phone-nearby-share-list');
    var query = sanitizePhoneText($('#phone-nearby-share-search').val(), '', 32).toLowerCase();
    list.empty();

    if (NearbyShareLoading) {
        list.append(createContactEmptyState('Looking for nearby players...'));
        return;
    }

    var filteredPlayers = NearbySharePlayers.filter(function(player) {
        var idText = String(player.id ?? '');
        var name = sanitizePhoneText(player.name, 'Unknown Player', 48).toLowerCase();
        return !query || idText.includes(query) || name.includes(query);
    });

    if (!filteredPlayers.length) {
        list.append($('<div class="phone-nearby-share-empty"></div>').text(query ? 'No players match that search.' : 'No nearby players found within 5m.'));
        return;
    }

    var fragment = document.createDocumentFragment();
    filteredPlayers.forEach(function(player) {
        var name = sanitizePhoneText(player.name, 'Unknown Player', 48);
        var idText = String(player.id ?? '');
        var distance = Number(player.distance ?? 0).toFixed(1);
        var button = document.createElement('button');
        button.type = 'button';
        button.className = 'phone-nearby-share-player';
        button.dataset.playerId = idText;
        button.innerHTML = '' +
            '<span class="phone-nearby-share-player-main">' +
                '<span class="phone-nearby-share-player-name"></span>' +
                '<span class="phone-nearby-share-player-meta"></span>' +
            '</span>' +
            '<span class="phone-nearby-share-player-send"><i class="fa-solid fa-paper-plane"></i> Send</span>';

        button.querySelector('.phone-nearby-share-player-name').textContent = name;
        button.querySelector('.phone-nearby-share-player-meta').textContent = 'Player ID ' + idText + ' · ' + distance + 'm away';
        fragment.appendChild(button);
    });

    list.append(fragment);
}

function openNearbyShareModal() {
    $('.phone-nearby-share-modal').fadeIn(150).attr('aria-hidden', 'false');
    $('.phone-nearby-share-status').text('Your number will be sent as a suggested contact.');
    $('#phone-nearby-share-search').val('');
    NearbyShareLoading = true;
    renderNearbySharePlayers();

    $.post(`https://${GetParentResourceName()}/GetNearbyPhonePlayers`, JSON.stringify({}), function(players) {
        NearbySharePlayers = Array.isArray(players) ? players : [];
        NearbyShareLoading = false;
        renderNearbySharePlayers();
    }).fail(function() {
        NearbySharePlayers = [];
        NearbyShareLoading = false;
        $('.phone-nearby-share-status').text('Unable to load nearby players right now.');
        renderNearbySharePlayers();
    });
}

function closeNearbyShareModal() {
    $('.phone-nearby-share-modal').fadeOut(120, function() {
        $(this).attr('aria-hidden', 'true');
        togglePhonePrimaryHeader();
    });
}

function getContactFromElement(element) {
    return $(element).closest('.phone-contact').data('contactData');
}

function ensureContactContextMenu() {
    var existingMenu = $('.phone-contact-context-menu');
    if (existingMenu.length) {
        return existingMenu;
    }

    var menu = $(
        '<div class="phone-contact-context-menu" aria-hidden="true">' +
            '<button type="button" class="phone-contact-context-item" data-action="call"><i class="fas fa-phone-volume"></i><span>Call</span></button>' +
            '<button type="button" class="phone-contact-context-item" data-action="message"><i class="fa-solid fa-message"></i><span>Message</span></button>' +
            '<button type="button" class="phone-contact-context-item" data-action="edit"><i class="fas fa-user-edit"></i><span>Edit</span></button>' +
        '</div>'
    );

    $('.phone-app').append(menu);
    return menu;
}

function closeContactContextMenu() {
    ContactContextMenuTarget = null;
    $('.phone-contact-context-menu').removeClass('is-open').attr('aria-hidden', 'true');
}

function openContactContextMenu($contact) {
    if (!$contact || !$contact.length) {
        return;
    }

    var menu = ensureContactContextMenu();
    var app = $('.phone-app');
    var appElement = app.get(0);
    var contactElement = $contact.get(0);

    if (!appElement || !contactElement) {
        return;
    }

    var appRect = appElement.getBoundingClientRect();
    var contactRect = contactElement.getBoundingClientRect();

    menu.removeClass('is-open').css({ left: 0, top: 0 }).attr('aria-hidden', 'false');

    var menuWidth = menu.outerWidth();
    var menuHeight = menu.outerHeight();
    var spacing = 8;

    var left = contactRect.right - appRect.left - menuWidth - spacing;
    var top = contactRect.top - appRect.top + (contactRect.height - menuHeight) / 2;

    var maxLeft = appRect.width - menuWidth - spacing;
    var maxTop = appRect.height - menuHeight - spacing;

    left = Math.max(spacing, Math.min(left, maxLeft));
    top = Math.max(spacing, Math.min(top, maxTop));

    ContactContextMenuTarget = $contact;
    menu.css({ left: left + 'px', top: top + 'px' });

    requestAnimationFrame(function() {
        menu.addClass('is-open');
    });
}

function openMessageChatWithContact(contactData) {
    if (!contactData) {
        return;
    }

    if (contactData.number !== QB.Phone.Data.PlayerData.charinfo.phone) {
        $.post(`https://${GetParentResourceName()}/GetMessageChats`, JSON.stringify({}), function(chats){
            QB.Phone.Functions.LoadMessageChats(chats);
        });

        $('.phone-application-container').animate({
            top: -160+"%"
        });
        QB.Phone.Functions.HeaderTextColor("white", 400);
        setTimeout(function(){
            $('.phone-application-container').animate({
                top: 0+"%"
            });

            QB.Phone.Functions.ToggleApp("phone", "none");
            QB.Phone.Functions.ToggleApp("message", "block");
            QB.Phone.Data.currentApplication = "message";

            $.post(`https://${GetParentResourceName()}/GetMessageChat`, JSON.stringify({phone: contactData.number}), function(chat){
                QB.Phone.Functions.SetupChatMessages(chat, {
                    name: contactData.name,
                    number: contactData.number
                });
            });

            $('.message-openedchat-messages').animate({scrollTop: 9999}, 150);
            $(".message-openedchat").css({"display":"block"});
            $(".message-openedchat").css({left: 0+"vh"});
            $(".message-chats").animate({left: 30+"vh"},100, function(){
                $(".message-chats").css({"display":"none"});
            });
        }, 400)
    } else {
        QB.Phone.Notifications.Add("fa fa-phone-alt", "Phone", "You can't message yourself..", "default", 3500);
    }
}

function openEditContactForm(contactData) {
    if (!contactData) {
        return;
    }

    CurrentEditContactData.name = sanitizePhoneText(contactData.name, 'Unknown Contact', 48);
    CurrentEditContactData.number = sanitizePhoneNumber(contactData.number);

    $(".phone-edit-contact-header p").text(CurrentEditContactData.name + " Edit")
    $(".phone-edit-contact-name").val(CurrentEditContactData.name);
    $(".phone-edit-contact-number").val(CurrentEditContactData.number);
    if (contactData.iban != null && contactData.iban != undefined) {
        $(".phone-edit-contact-iban").val(contactData.iban);
        CurrentEditContactData.iban = sanitizePhoneIban(contactData.iban)
    } else {
        $(".phone-edit-contact-iban").val("");
        CurrentEditContactData.iban = "";
    }

    var editModal = $('.phone-edit-contact');
    editModal.stop(true, true).removeClass('phone-edit-contact-closing').fadeIn(150, function() {
        editModal.attr('aria-hidden', 'false').addClass('phone-edit-contact-visible');
    });
}

function closeEditContactForm(resetValues) {
    var editModal = $('.phone-edit-contact');

    editModal.removeClass('phone-edit-contact-visible').addClass('phone-edit-contact-closing').attr('aria-hidden', 'true');

    setTimeout(function() {
        editModal.stop(true, true).fadeOut(120, function() {
            editModal.removeClass('phone-edit-contact-closing');
        });

        if (resetValues) {
            $('.phone-edit-contact-number').val('');
            $('.phone-edit-contact-name').val('');
        }
    }, 150);
}

function setKeypadValue(nextValue) {
    keyPadHTML = String(nextValue ?? '');
    $('#phone-keypad-input').removeClass('phone-keypad-input-clearing');
    $('#phone-keypad-input').text(formatDialerInputDisplay(keyPadHTML));
    updateDialerPreview();
}

function validateContactForm(name, number) {
    return name.length > 0 && number.length >= 3;
}

function removeSelectedSuggestion() {
    if (!SelectedSuggestion) {
        return;
    }

    var suggestionData = $(SelectedSuggestion).data('SuggestionData');
    $.post(`https://${GetParentResourceName()}/RemoveSuggestion`, JSON.stringify({
        data: suggestionData
    }));

    SuggestedContactsCache = SuggestedContactsCache.filter(function(entry) {
        return sanitizePhoneNumber(entry.number) !== sanitizePhoneNumber(suggestionData.number);
    });

    SelectedSuggestion = null;
    renderSuggestedContacts();
}

$(document).on('click', '.phone-app-footer-button', function(e){
    e.preventDefault();

    setPhoneFooterTab($(this).data('phonefootertab'));
});

$(document).on("click", "#phone-search-icon", function(e){
    e.preventDefault();
    $("#contact-search").trigger("focus");
});

$(document).on('input', '#contact-search', function() {
    clearTimeout(ContactSearchDebounce);
    ContactSearchDebounce = setTimeout(renderContacts, 80);
});

$(document).on('input', '.phone-add-contact-name, .phone-edit-contact-name', function() {
    this.value = sanitizePhoneText(this.value, '', 48);
});

$(document).on('input', '.phone-add-contact-number, .phone-edit-contact-number', function() {
    this.value = sanitizePhoneNumber(this.value);
});

$(document).on('input', '.phone-add-contact-iban, .phone-edit-contact-iban', function() {
    this.value = sanitizePhoneIban(this.value);
});

$(document).on('input', '#phone-nearby-share-search', function() {
    clearTimeout(NearbySearchDebounce);
    NearbySearchDebounce = setTimeout(renderNearbySharePlayers, 70);
});

QB.Phone.Functions.SetupRecentCalls = function(recentcalls) {
    var callsContainer = $('.phone-recent-calls');
    var safeCalls = Array.isArray(recentcalls) ? recentcalls.slice().reverse() : [];
    var fragment = document.createDocumentFragment();

    RecentCallsCache = safeCalls.map(function(recentCall) {
        return {
            name: sanitizePhoneText(recentCall && recentCall.name, 'Unknown', 48),
            number: sanitizePhoneNumber(recentCall && recentCall.number),
            anonymous: !!(recentCall && recentCall.anonymous),
            time: sanitizePhoneText(recentCall && recentCall.time, '--:--', 10),
            type: sanitizePhoneText(recentCall && recentCall.type, 'missed', 16).toLowerCase()
        };
    });

    callsContainer.empty();
    $('#total-recent-calls').text(RecentCallsCache.length + ' recent calls');

    if (!RecentCallsCache.length) {
        callsContainer.append(createContactEmptyState('No recent calls yet.'));
        return;
    }

    RecentCallsCache.forEach(function(recentCall, index) {
        var displayName = recentCall.anonymous ? 'Anonymous' : recentCall.name;
        var accentData = RecentCallStates[recentCall.type] || RecentCallStates.incoming;
        var element = document.createElement('div');
        var icon = document.createElement('i');
        var image = document.createElement('div');
        var info = document.createElement('div');
        var name = document.createElement('div');
        var meta = document.createElement('div');
        var time = document.createElement('div');
        var badge = document.createElement('span');

        element.className = 'phone-recent-call';
        element.id = 'recent-' + index;
        image.className = 'phone-recent-call-image';
        image.textContent = createAvatarLabel(displayName, recentCall.number, recentCall.anonymous);
        image.style.background = 'linear-gradient(135deg, ' + accentData.accent + ', rgba(34, 111, 206, 0.92))';

        info.className = 'phone-recent-call-info';

        name.className = 'phone-recent-call-name';
        name.textContent = displayName;

        meta.className = 'phone-recent-call-type';
        icon.className = accentData.icon;
        icon.style.color = accentData.accent;
        badge.className = 'phone-recent-call-badge';
        badge.textContent = accentData.label + ' · ' + formatPhoneDisplay(recentCall.number);
        meta.appendChild(icon);
        meta.appendChild(badge);

        info.appendChild(name);
        info.appendChild(meta);

        time.className = 'phone-recent-call-time';
        time.textContent = recentCall.time;

        element.appendChild(image);
        element.appendChild(info);
        element.appendChild(time);
        $(element).data('recentData', recentCall);
        fragment.appendChild(element);
    });

    callsContainer.append(fragment);
}

$(document).on('click', '.phone-recent-call', function(e){
    e.preventDefault();

    var RecendId = $(this).attr('id');
    var RecentData = $("#"+RecendId).data('recentData');

    var cData = {
        number: sanitizePhoneNumber(RecentData.number),
        name: sanitizePhoneText(RecentData.name, sanitizePhoneNumber(RecentData.number), 48)
    };

    requestPhoneCall(cData);
});

$(document).on('click', ".phone-keypad-key-call", function(e){
    e.preventDefault();

    var InputNum = String(keyPadHTML ?? '');

    if (!InputNum.length) {
        QB.Phone.Notifications.Add("fas fa-phone", "Phone", "Enter a number first!");
        return;
    }

    var cData = {
        number: InputNum,
        name: InputNum,
    };

    requestPhoneCall(cData);
});

QB.Phone.Functions.LoadContacts = function(myContacts) {
    PhoneContactsCache = Array.isArray(myContacts) ? myContacts.map(function(contact) {
        return {
            name: sanitizePhoneText(contact && contact.name, 'Unknown Contact', 48),
            number: sanitizePhoneNumber(contact && contact.number),
            iban: sanitizePhoneIban(contact && contact.iban),
            status: !!(contact && contact.status)
        };
    }).filter(function(contact) {
        return contact.number.length > 0;
    }) : [];

    $(".phone-contacts").hide();
    $(".phone-recent").hide();
    $(".phone-keypad").hide();
    $(".phone-suggestedcontacts").hide();

    $(".phone-"+CurrentFooterTab).show();
    togglePhonePrimaryHeader();
    closeContactContextMenu();
    renderContacts();
};

$(document).on('click', '#new-chat-phone', function(e){
    var ContactData = getContactFromElement(this);

    if (!ContactData) {
        return;
    }

    openMessageChatWithContact(ContactData);
});

$(document).on('click', '#edit-contact', function(e){
    e.preventDefault();
    var ContactData = getContactFromElement(this);

    if (!ContactData) {
        return;
    }

    openEditContactForm(ContactData);
});

$(document).on('click', '#edit-contact-save', function(e){
    e.preventDefault();

    var ContactName = sanitizePhoneText($(".phone-edit-contact-name").val(), '', 48);
    var ContactNumber = sanitizePhoneNumber($(".phone-edit-contact-number").val());
    var ContactIban = sanitizePhoneIban($(".phone-edit-contact-iban").val());

    if (validateContactForm(ContactName, ContactNumber)) {
        $.post(`https://${GetParentResourceName()}/EditContact`, JSON.stringify({
            CurrentContactName: ContactName,
            CurrentContactNumber: ContactNumber,
            CurrentContactIban: ContactIban,
            OldContactName: CurrentEditContactData.name,
            OldContactNumber: CurrentEditContactData.number,
            OldContactIban: CurrentEditContactData.iban,
        }), function(PhoneContacts){
            QB.Phone.Functions.LoadContacts(PhoneContacts);
        });
        closeEditContactForm(true);
    } else {
        QB.Phone.Notifications.Add("fas fa-exclamation-circle", "Edit Contact", "Fill out all fields!");
    }
});

$(document).on('click', '#edit-contact-delete', function(e){
    e.preventDefault();

    var ContactName = $(".phone-edit-contact-name").val();
    var ContactNumber = $(".phone-edit-contact-number").val();
    var ContactIban = $(".phone-edit-contact-iban").val();

    $.post(`https://${GetParentResourceName()}/DeleteContact`, JSON.stringify({
        CurrentContactName: ContactName,
        CurrentContactNumber: ContactNumber,
        CurrentContactIban: ContactIban,
    }), function(PhoneContacts){
        QB.Phone.Functions.LoadContacts(PhoneContacts);
    });
    closeEditContactForm(true);
});

$(document).on('click', '#edit-contact-cancel', function(e){
    e.preventDefault();

    closeEditContactForm(true);
});

$(document).on('click', '.phone-edit-contact', function(e){
    if ($(e.target).is('.phone-edit-contact')) {
        closeEditContactForm(true);
    }
});

$(document).on('click', '.phone-keypad-key', function(e){
    e.preventDefault();
    var PressedButton = $(this).data('keypadvalue');
    if (!isNaN(PressedButton)) {
        if (sanitizePhoneNumber(keyPadHTML).length >= MAX_DIAL_DIGITS) {
            QB.Phone.Notifications.Add('fas fa-phone', 'Phone', 'Only 10 digits are allowed.');
            return;
        }
        setKeypadValue((keyPadHTML || '') + String(PressedButton));
    } else if (PressedButton == "#") {
        setKeypadValue((keyPadHTML || '') + '#');
    } else if (PressedButton == "*") {
        if (ClearNumberTimer == null) {
            $("#phone-keypad-input").addClass('phone-keypad-input-clearing').text('Clearing...');
            ClearNumberTimer = setTimeout(function(){
                setKeypadValue('');
                ClearNumberTimer = null;
            }, 750);
        }
    }
});

$(document).on('click', '#phone-keypad-backspace', function(e) {
    e.preventDefault();
    if (ClearNumberTimer !== null) {
        clearTimeout(ClearNumberTimer);
        ClearNumberTimer = null;
    }

    if ((keyPadHTML || '').length > 0) {
        setKeypadValue((keyPadHTML || '').slice(0, -1));
    }
});

// Left click should not open the context menu.
$(document).on('click', '.phone-contact', function(e){
    if ($(e.target).closest('.phone-contact-context-menu').length) {
        return;
    }

    e.preventDefault();
});

// Open contact actions with right-click/context menu only.
$(document).on('contextmenu', '.phone-contact', function(e){
    if ($(e.target).closest('.phone-contact-context-menu').length) {
        return;
    }

    e.preventDefault();
    openContactContextMenu($(this));
});

$(document).on('click', '.phone-contact-context-item', function(e) {
    e.preventDefault();
    e.stopPropagation();

    var action = $(this).data('action');
    var target = ContactContextMenuTarget;
    var contactData = target && target.length ? target.data('contactData') : null;

    closeContactContextMenu();

    if (!contactData) {
        return;
    }

    if (action === 'call') {
        SetupCall(contactData);
    } else if (action === 'message') {
        openMessageChatWithContact(contactData);
    } else if (action === 'edit') {
        openEditContactForm(contactData);
    }
});

$(document).on('click', function(e) {
    if (!$(e.target).closest('.phone-contact, .phone-contact-context-menu').length) {
        closeContactContextMenu();
    }
});

function openAddContactForm() {
    var addModal = $('.phone-add-contact');
    addModal.stop(true, true).removeClass('phone-add-contact-closing').fadeIn(150, function() {
        addModal.attr('aria-hidden', 'false').addClass('phone-add-contact-visible');
    });
}

function closeAddContactForm(resetValues) {
    var addModal = $('.phone-add-contact');

    addModal.removeClass('phone-add-contact-visible').addClass('phone-add-contact-closing').attr('aria-hidden', 'true');

    setTimeout(function() {
        addModal.stop(true, true).fadeOut(120, function() {
            addModal.removeClass('phone-add-contact-closing');
        });

        if (resetValues) {
            $('.phone-add-contact-number').val('');
            $('.phone-add-contact-name').val('');
            $('.phone-add-contact-iban').val('');
        }
    }, 150);
}


$(document).on('click', '#phone-plus-icon', function(e){
    e.preventDefault();

    openAddContactForm();
});

$(document).on('click', '#add-contact-save', function(e){
    e.preventDefault();

    var ContactName = sanitizePhoneText($(".phone-add-contact-name").val(), '', 48);
    var ContactNumber = sanitizePhoneNumber($(".phone-add-contact-number").val());
    var ContactIban = sanitizePhoneIban($(".phone-add-contact-iban").val());

    if (ContactNumber === sanitizePhoneNumber(QB.Phone.Data.PlayerData.charinfo.phone)) {
        QB.Phone.Notifications.Add('fas fa-exclamation-circle', 'Add Contact', "You can't save your own number.");
        return;
    }

    if (validateContactForm(ContactName, ContactNumber)) {
        $.post(`https://${GetParentResourceName()}/AddNewContact`, JSON.stringify({
            ContactName: ContactName,
            ContactNumber: ContactNumber,
            ContactIban: ContactIban,
        }), function(PhoneContacts){
            QB.Phone.Functions.LoadContacts(PhoneContacts);

            closeAddContactForm(true);
            removeSelectedSuggestion();
        });
    } else {
        QB.Phone.Notifications.Add("fas fa-exclamation-circle", "Add Contact", "Enter contact name and number.");
    }
});

$(document).on('click', '#add-contact-cancel', function(e){
    e.preventDefault();

    closeAddContactForm(true);
});

$(document).on('click', '#add-contact-close', function(e){
    e.preventDefault();

    closeAddContactForm(true);
});

$(document).on('click', '.phone-add-contact', function(e){
    if ($(e.target).is('.phone-add-contact')) {
        closeAddContactForm(true);
    }
});

$(document).on('click', '#phone-start-call', function(e){
    e.preventDefault();

    var ContactData = getContactFromElement(this);

    if (!ContactData) {
        return;
    }

    SetupCall(ContactData);
});

SetupCall = function(cData) {
    requestPhoneCall(cData);
}

CancelOutgoingCall = function() {
    QB.Phone.Animations.TopSlideUp('.phone-application-container', 320, -120);
    setTimeout(function() {
        resetPhoneCallScreen();
    }, 320);
}

$(document).on('click', '#outgoing-cancel', function(e){
    e.preventDefault();

    $.post(`https://${GetParentResourceName()}/CancelOutgoingCall`);
});

$(document).on('click', '#incoming-deny', function(e){
    e.preventDefault();

    $.post(`https://${GetParentResourceName()}/DenyIncomingCall`);
});

$(document).on('click', '#ongoing-cancel', function(e){
    e.preventDefault();

    $.post(`https://${GetParentResourceName()}/CancelOngoingCall`);
});

IncomingCallAlert = function(CallData, Canceled, AnonymousCall) {
    if (!Canceled) {
        if (!QB.Phone.Data.CallActive) {
            var previousApp = QB.Phone.Data.currentApplication;

            QB.Phone.Animations.TopSlideUp('.phone-application-container', 400, -100);
            if (previousApp && previousApp !== 'phone-call') {
                QB.Phone.Animations.TopSlideUp('.' + previousApp + '-app', 400, -100);
            }

            setCallVisualState('incoming', {
                name: sanitizePhoneText(CallData.name, 'Unknown Number', 48),
                number: sanitizePhoneNumber(CallData.number),
                anonymous: AnonymousCall
            });

            setTimeout(function(){
                $(".phone-app").css({"display":"none"});
                QB.Phone.Functions.HeaderTextColor("white", 400);
                if (previousApp && previousApp !== 'phone-call') {
                    $('.' + previousApp + '-app').css({"display":"none"});
                }
                $(".phone-call-app").css({"display":"block"});
                QB.Phone.Functions.ToggleApp('phone-call', 'block');
                setTimeout(function(){
                    QB.Phone.Animations.TopSlideDown('.phone-application-container', 400, 0);
                }, 400);
            }, 400);

            QB.Phone.Data.currentApplication = "phone-call";
            QB.Phone.Data.CallActive = true;
        }
    } else {
        QB.Phone.Animations.TopSlideUp('.phone-application-container', 320, -120);
        setTimeout(function(){
            resetPhoneCallScreen();
        }, 320);
    }
}

QB.Phone.Functions.SetupCurrentCall = function(cData) {
    if (cData.InCall) {
        CallData = cData;
        $(".phone-currentcall-container").css({"display":"flex"});

        if (!QB.Phone.Data.IsOpen && $('.container').css('display') === 'none') {
            QB.Phone.Animations.BottomSlideUp('.container', 250, -50);
        }

        if (cData.CallType == "incoming") {
            $(".phone-currentcall-title").text("Incoming call");
        } else if (cData.CallType == "outgoing") {
                $(".phone-currentcall-title").text("Outgoing call");
        } else if (cData.CallType == "ongoing") {
                $(".phone-currentcall-title").text("In call ("+cData.CallTime+")");
        }

            $(".phone-currentcall-contact").text(sanitizePhoneText(cData.TargetData.name, 'Unknown', 48));
    } else {
        $(".phone-currentcall-container").css({"display":"none"});
    }
}

$(document).on('click', '.phone-currentcall-container', function(e){
    e.preventDefault();

    var callAppIsOpen = QB.Phone.Data.currentApplication === 'phone-call' &&
                        $('.phone-application-container').css('display') !== 'none';

    if (callAppIsOpen) {
        // Toggle OFF: call screen is open, hide it
        QB.Phone.Animations.TopSlideUp('.phone-application-container', 300, -100);
        setTimeout(function(){
            $('.phone-call-app').css({ display: 'none' });
            QB.Phone.Functions.ToggleApp('phone-call', 'none');
            QB.Phone.Data.currentApplication = null;
        }, 300);
    } else {
        // Toggle ON: open the call screen
        var previousApp = QB.Phone.Data.currentApplication;

        if (CallData.CallType == "incoming") {
            setCallVisualState('incoming', CallData);
        } else if (CallData.CallType == "outgoing") {
            setCallVisualState('outgoing', CallData);
        } else if (CallData.CallType == "ongoing") {
            setCallVisualState('ongoing', CallData);
        }

        QB.Phone.Functions.HeaderTextColor("white", 400);
        QB.Phone.Animations.TopSlideUp('.phone-application-container', 250, -100);
        if (previousApp && previousApp !== 'phone-call') {
            QB.Phone.Animations.TopSlideUp('.' + previousApp + '-app', 400, -100);
        }

        setTimeout(function(){
            if (previousApp && previousApp !== 'phone-call') {
                QB.Phone.Functions.ToggleApp(previousApp, 'none');
            }
            QB.Phone.Animations.TopSlideDown('.phone-application-container', 400, 0);
            $('.phone-call-app').css({ display: 'block' });
            QB.Phone.Functions.ToggleApp('phone-call', 'block');
        }, 450);

        QB.Phone.Data.currentApplication = "phone-call";
    }
});

$(document).on('click', '#incoming-answer', function(e){
    e.preventDefault();

    $.post(`https://${GetParentResourceName()}/AnswerCall`);
});

QB.Phone.Functions.AnswerCall = function(CallData) {
    setCallVisualState('ongoing', {
        name: sanitizePhoneText(CallData.TargetData.name, 'Unknown', 48),
        number: sanitizePhoneNumber(CallData.TargetData.number)
    });

    QB.Phone.Functions.Close();
}

QB.Phone.Functions.SetupSuggestedContacts = function(Suggested) {
    SuggestedContactsCache = Array.isArray(Suggested) ? Suggested.slice().reverse() : [];
    renderSuggestedContacts();
}

$(document).on('click', '.suggested-contact-add', function(e){
    e.preventDefault();
    e.stopPropagation();

    var parentContact = $(this).closest('.suggested-contact');
    var SuggestionData = parentContact.data('SuggestionData');
    SelectedSuggestion = parentContact.get(0);

    openAddContactForm();

    $(".phone-add-contact-name").val(sanitizePhoneText(SuggestionData.name[0] + " " + SuggestionData.name[1], '', 48));
    $(".phone-add-contact-number").val(sanitizePhoneNumber(SuggestionData.number));
    $(".phone-add-contact-iban").val(sanitizePhoneIban(SuggestionData.bank));
});

$(document).on('click', '.phone-share-trigger', function(e) {
    e.preventDefault();
    if (CurrentFooterTab !== 'contacts') {
        return;
    }
    openNearbyShareModal();
});

$(document).on('click', '.phone-nearby-share-close', function(e) {
    e.preventDefault();
    closeNearbyShareModal();
});

$(document).on('click', '.phone-nearby-share-modal', function(e) {
    if ($(e.target).is('.phone-nearby-share-modal')) {
        closeNearbyShareModal();
    }
});

$(document).on('click', '.phone-nearby-share-player', function(e) {
    e.preventDefault();
    var targetId = Number($(this).data('playerId'));

    if (!targetId) {
        return;
    }

    $('.phone-nearby-share-status').text('Sending your number...');
    $.post(`https://${GetParentResourceName()}/SharePhoneContact`, JSON.stringify({
        targetId: targetId
    }), function(response) {
        if (response && response.success) {
            $('.phone-nearby-share-status').text(response.message || 'Number shared successfully.');
            QB.Phone.Notifications.Add('fas fa-address-card', 'Phone', response.message || 'Number shared successfully.');
            setTimeout(closeNearbyShareModal, 350);
        } else {
            var message = response && response.message ? response.message : 'Unable to share your number.';
            $('.phone-nearby-share-status').text(message);
            QB.Phone.Notifications.Add('fas fa-exclamation-circle', 'Phone', message);
        }
    }).fail(function() {
        $('.phone-nearby-share-status').text('Unable to share your number right now.');
        QB.Phone.Notifications.Add('fas fa-exclamation-circle', 'Phone', 'Unable to share your number right now.');
    });
});


$(document).on('click', '#box-new-cancel', function(e){
    e.preventDefault();
    ClearInputNew()
    $('.phone-menu-body').fadeOut(350);
    //$('.phone-new-box-body').fadeOut(350);
});

function ClearInputNew(){
    $(".phone-new-input-class").val("");
}