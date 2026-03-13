var ContactSearchActive = false;
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

function sanitizeDialTarget(value) {
    return String(value ?? '').replace(/[^0-9*#]/g, '').slice(0, 20);
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
    var safeNumber = sanitizeDialTarget(keyPadHTML);
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

    previewName.text(formatPhoneDisplay(safeNumber));
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

function setPhoneFooterTab(tabName) {
    if (!tabName || tabName === CurrentFooterTab) {
        return;
    }

    closeOpenedContactCard();

    $('.phone-app-footer').find('[data-phonefootertab="' + CurrentFooterTab + '"]').removeClass('phone-selected-footer-tab');
    $('.phone-app-footer').find('[data-phonefootertab="' + tabName + '"]').addClass('phone-selected-footer-tab');

    var $oldTab = $('.phone-' + CurrentFooterTab);
    var $newTab = $('.phone-' + tabName);

    $oldTab.stop(true, true).fadeOut(150);
    $newTab.stop(true, true).delay(150).fadeIn(200);

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
        element.innerHTML = '' +
            '<div class="phone-contact-firstletter" style="background-color:' + buildContactColor(safeName, contact.status) + ';">' + safeName.charAt(0).toUpperCase() + '</div>' +
            '<div class="phone-contact-name"></div>' +
            '<div class="phone-contact-subtitle"></div>' +
            '<div class="phone-contact-actions"><i class="fas fa-sort-down"></i></div>' +
            '<div class="phone-contact-action-buttons">' +
                '<i class="fas fa-phone-volume" id="phone-start-call"></i>' +
                '<i class="fa-solid fa-message" id="new-chat-phone"></i>' +
                '<i class="fas fa-user-edit" id="edit-contact"></i>' +
            '</div>';

        element.querySelector('.phone-contact-name').textContent = safeName;
        element.querySelector('.phone-contact-subtitle').textContent = safeNumber ? formatPhoneDisplay(safeNumber) : 'No number available';
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
        var number = sanitizePhoneNumber(suggest.number);
        var bank = sanitizePhoneIban(suggest.bank || '');
        var element = document.createElement('div');
        element.className = 'suggested-contact';
        element.id = 'suggest-' + index;
        element.innerHTML = '' +
            '<i class="fas fa-exclamation-circle"></i>' +
            '<div class="suggested-contact-info">' +
                '<span class="suggested-name"></span>' +
                '<span class="suggested-meta"></span>' +
            '</div>';

        element.querySelector('.suggested-name').textContent = firstName + (lastName ? ' ' + lastName : '') + ' · ' + formatPhoneDisplay(number);
        element.querySelector('.suggested-meta').textContent = bank ? 'Bank ' + bank : 'Tap to save this contact';
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

function setKeypadValue(nextValue) {
    keyPadHTML = sanitizeDialTarget(nextValue);
    $('#phone-keypad-input').removeClass('phone-keypad-input-clearing');
    $('#phone-keypad-input').text(formatPhoneDisplay(keyPadHTML));
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

    var InputNum = sanitizeDialTarget(keyPadHTML);

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
    renderContacts();
};

$(document).on('click', '#new-chat-phone', function(e){
    var ContactData = getContactFromElement(this);

    if (!ContactData) {
        return;
    }

    if (ContactData.number !== QB.Phone.Data.PlayerData.charinfo.phone) {
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

            QB.Phone.Functions.ToggleApp("phone", "none");
            QB.Phone.Functions.ToggleApp("whatsapp", "block");
            QB.Phone.Data.currentApplication = "whatsapp";

            $.post(`https://${GetParentResourceName()}/GetWhatsappChat`, JSON.stringify({phone: ContactData.number}), function(chat){
                QB.Phone.Functions.SetupChatMessages(chat, {
                    name: ContactData.name,
                    number: ContactData.number
                });
            });

            $('.whatsapp-openedchat-messages').animate({scrollTop: 9999}, 150);
            $(".whatsapp-openedchat").css({"display":"block"});
            $(".whatsapp-openedchat").css({left: 0+"vh"});
            $(".whatsapp-chats").animate({left: 30+"vh"},100, function(){
                $(".whatsapp-chats").css({"display":"none"});
            });
        }, 400)
    } else {
        QB.Phone.Notifications.Add("fa fa-phone-alt", "Phone", "You can't whatsapp yourself..", "default", 3500);
    }
});

$(document).on('click', '#edit-contact', function(e){
    e.preventDefault();
    var ContactData = getContactFromElement(this);

    if (!ContactData) {
        return;
    }

    CurrentEditContactData.name = sanitizePhoneText(ContactData.name, 'Unknown Contact', 48);
    CurrentEditContactData.number = sanitizePhoneNumber(ContactData.number);

    $(".phone-edit-contact-header").text(CurrentEditContactData.name + " Edit")
    $(".phone-edit-contact-name").val(CurrentEditContactData.name);
    $(".phone-edit-contact-number").val(CurrentEditContactData.number);
    if (ContactData.iban != null && ContactData.iban != undefined) {
        $(".phone-edit-contact-iban").val(ContactData.iban);
        CurrentEditContactData.iban = sanitizePhoneIban(ContactData.iban)
    } else {
        $(".phone-edit-contact-iban").val("");
        CurrentEditContactData.iban = "";
    }

    QB.Phone.Animations.TopSlideDown(".phone-edit-contact", 200, 0);
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
        QB.Phone.Animations.TopSlideUp(".phone-edit-contact", 250, -100);
        setTimeout(function(){
            $(".phone-edit-contact-number").val("");
            $(".phone-edit-contact-name").val("");
        }, 250)
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
    QB.Phone.Animations.TopSlideUp(".phone-edit-contact", 250, -100);
    setTimeout(function(){
        $(".phone-edit-contact-number").val("");
        $(".phone-edit-contact-name").val("");
    }, 250);
});

$(document).on('click', '#edit-contact-cancel', function(e){
    e.preventDefault();

    QB.Phone.Animations.TopSlideUp(".phone-edit-contact", 250, -100);
    setTimeout(function(){
        $(".phone-edit-contact-number").val("");
        $(".phone-edit-contact-name").val("");
    }, 250)
});

$(document).on('click', '.phone-keypad-key', function(e){
    e.preventDefault();
    var PressedButton = $(this).data('keypadvalue');
    if (!isNaN(PressedButton)) {
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

$(document).on('click', '.phone-contact-actions', function(e){
    e.preventDefault();

    var FocussedContact = $(this).parent();
    var ContactId = FocussedContact.get(0);

    if (OpenedContact === null) {
        $(FocussedContact).animate({
            "height":"14vh"
        }, 150, function(){
            $(FocussedContact).find('.phone-contact-action-buttons').fadeIn(100);
        });
        OpenedContact = ContactId;
    } else if (OpenedContact == ContactId) {
        $(FocussedContact).find('.phone-contact-action-buttons').fadeOut(100, function(){
            $(FocussedContact).animate({
                "height":"8.8vh"
            }, 150);
        });
        OpenedContact = null;
    } else if (OpenedContact != ContactId) {
        var PreviousContact = $(OpenedContact);
        $(PreviousContact).find('.phone-contact-action-buttons').fadeOut(100, function(){
            $(PreviousContact).animate({
                "height":"8.8vh"
            }, 150);
            OpenedContact = ContactId;
        });
        $(FocussedContact).animate({
            "height":"14vh"
        }, 150, function(){
            $(FocussedContact).find('.phone-contact-action-buttons').fadeIn(100);
        });
    }
});


$(document).on('click', '#phone-plus-icon', function(e){
    e.preventDefault();

    QB.Phone.Animations.TopSlideDown(".phone-add-contact", 200, 0);
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

            QB.Phone.Animations.TopSlideUp(".phone-add-contact", 250, -100);
            setTimeout(function(){
                $(".phone-add-contact-number").val("");
                $(".phone-add-contact-name").val("");
                $(".phone-add-contact-iban").val("");
            }, 250);
            removeSelectedSuggestion();
        });
    } else {
        QB.Phone.Notifications.Add("fas fa-exclamation-circle", "Add Contact", "Enter contact name and number.");
    }
});

$(document).on('click', '#add-contact-cancel', function(e){
    e.preventDefault();

    QB.Phone.Animations.TopSlideUp(".phone-add-contact", 250, -100);
    setTimeout(function(){
        $(".phone-add-contact-number").val("");
        $(".phone-add-contact-name").val("");
    }, 250)
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
    if (QB.Phone.Data.currentApplication == "phone-call") {
        QB.Phone.Animations.TopSlideUp('.phone-application-container', 400, -160);
        QB.Phone.Animations.TopSlideUp('.'+QB.Phone.Data.currentApplication+"-app", 400, -160);
        setTimeout(function(){
            QB.Phone.Functions.ToggleApp(QB.Phone.Data.currentApplication, "none");
        }, 400)
        QB.Phone.Functions.HeaderTextColor("white", 300);

        QB.Phone.Data.CallActive = false;
        QB.Phone.Data.currentApplication = null;
    }
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
            QB.Phone.Animations.TopSlideUp('.phone-application-container', 400, -100);
            QB.Phone.Animations.TopSlideUp('.'+QB.Phone.Data.currentApplication+"-app", 400, -100);
            setCallVisualState('incoming', {
                name: sanitizePhoneText(CallData.name, 'Unknown Number', 48),
                number: sanitizePhoneNumber(CallData.number),
                anonymous: AnonymousCall
            });
            setTimeout(function(){
                $(".phone-app").css({"display":"none"});
                QB.Phone.Functions.HeaderTextColor("white", 400);
                $("."+QB.Phone.Data.currentApplication+"-app").css({"display":"none"});
                $(".phone-call-app").css({"display":"block"});
                setTimeout(function(){
                    QB.Phone.Animations.TopSlideDown('.phone-application-container', 400, 0);
                }, 400);
            }, 400);

            QB.Phone.Data.currentApplication = "phone-call";
            QB.Phone.Data.CallActive = true;
        }
    } else {
        QB.Phone.Animations.TopSlideUp('.phone-application-container', 400, -100);
        QB.Phone.Animations.TopSlideUp('.'+QB.Phone.Data.currentApplication+"-app", 400, -100);
        setTimeout(function(){
            $("."+QB.Phone.Data.currentApplication+"-app").css({"display":"none"});
            $(".phone-call-outgoing").css({"display":"none"});
            $(".phone-call-incoming").css({"display":"none"});
            $(".phone-call-ongoing").css({"display":"none"});
        }, 400)
        QB.Phone.Functions.HeaderTextColor("white", 300);
        QB.Phone.Data.CallActive = false;
        QB.Phone.Data.currentApplication = null;
    }
}

QB.Phone.Functions.SetupCurrentCall = function(cData) {
    if (cData.InCall) {
        CallData = cData;
        $(".phone-currentcall-container").css({"display":"block"});

        if (!QB.Phone.Data.IsOpen == true) {
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

    if (CallData.CallType == "incoming") {
        setCallVisualState('incoming', CallData);
    } else if (CallData.CallType == "outgoing") {
        setCallVisualState('outgoing', CallData);
    } else if (CallData.CallType == "ongoing") {
        setCallVisualState('ongoing', CallData);
    }

    QB.Phone.Functions.HeaderTextColor("white", 400);
    QB.Phone.Animations.TopSlideUp('.phone-application-container', 250, -100);
    QB.Phone.Animations.TopSlideUp('.'+QB.Phone.Data.currentApplication+"-app", 400, -100);
    setTimeout(function(){
        QB.Phone.Functions.ToggleApp(QB.Phone.Data.currentApplication, "none");
        QB.Phone.Animations.TopSlideDown('.phone-application-container', 400, 0);
        QB.Phone.Functions.ToggleApp("phone-call", "block");
    }, 450);

    QB.Phone.Data.currentApplication = "phone-call";
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

$(document).on('click', '.suggested-contact', function(e){
    e.preventDefault();

    var SuggestionData = $(this).data('SuggestionData');
    SelectedSuggestion = this;

    QB.Phone.Animations.TopSlideDown(".phone-add-contact", 200, 0);

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