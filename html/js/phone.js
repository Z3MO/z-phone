var ContactSearchActive = false;
var CurrentFooterTab = "contacts";
var CallData = {};
var ClearNumberTimer = null;
var SelectedSuggestion = null;
var AmountOfSuggestions = 0;
var keyPadHTML;

var _contactSearchTimer = null;
$(document).on("keyup", "#contact-search", function() {
    var input = this;
    clearTimeout(_contactSearchTimer);
    _contactSearchTimer = setTimeout(function() {
        var value = input.value.toLowerCase();
        $(".phone-contact-list .phone-contact").filter(function() {
            $(this).toggle($(this).text().toLowerCase().indexOf(value) > -1);
        });
    }, 150);
});

$(document).on('click', '.phone-app-footer-button', function(e){
    e.preventDefault();

    var PressedFooterTab = $(this).data('phonefootertab');

    if (PressedFooterTab !== CurrentFooterTab) {
        var PreviousTab = $(this).parent().find('[data-phonefootertab="'+CurrentFooterTab+'"');

        $('.phone-app-footer').find('[data-phonefootertab="'+CurrentFooterTab+'"').removeClass('phone-selected-footer-tab');
        $(this).addClass('phone-selected-footer-tab');

        $(".phone-"+CurrentFooterTab).hide();
        $(".phone-"+PressedFooterTab).show();

        if (PressedFooterTab == "recent") {
            $.post(`https://${GetParentResourceName()}/ClearRecentAlerts`);
        } else if (PressedFooterTab == "suggestedcontacts") {
            $.post(`https://${GetParentResourceName()}/ClearRecentAlerts`);
        }

        CurrentFooterTab = PressedFooterTab;
    }
});

$(document).on("click", "#phone-search-icon", function(e){
    e.preventDefault();

    if (!ContactSearchActive) {
        $("#phone-plus-icon").animate({
            opacity: "0.0",
            "display": "none"
        }, 150, function(){
            $("#contact-search").css({"display":"block"}).animate({
                opacity: "1.0",
            }, 150);
        });
    } else {
        $("#contact-search").animate({
            opacity: "0.0"
        }, 150, function(){
            $("#contact-search").css({"display":"none"});
            $("#phone-plus-icon").animate({
                opacity: "1.0",
                display: "block",
            }, 150);
        });
    }

    ContactSearchActive = !ContactSearchActive;
});

QB.Phone.Functions.SetupRecentCalls = function(recentcalls) {
    var container = $(".phone-recent-calls");
    container.html("");

    recentcalls = recentcalls.reverse();

    var fragment = document.createDocumentFragment();

    $.each(recentcalls, function(i, recentCall){
        var FirstLetter = (recentCall.name).charAt(0);
        var TypeIcon = 'fas fa-phone-slash';
        var IconStyle = "color: #e74c3c;";
        if (recentCall.type === "outgoing") {
            TypeIcon = 'fas fa-phone-volume';
            IconStyle = "color: #2ecc71;";
        }
        if (recentCall.anonymous) {
            FirstLetter = "A";
            recentCall.name = "Anonymous";
        }
        var div = document.createElement('div');
        div.className = "phone-recent-call";
        div.id = "recent-"+i;
        div.innerHTML = '<div class="phone-recent-call-image">'+FirstLetter+'</div> <div class="phone-recent-call-name">'+recentCall.name+'</div> <div class="phone-recent-call-type"><i class="'+TypeIcon+'" style="'+IconStyle+'"></i></div> <div class="phone-recent-call-time">'+recentCall.time+'</div>';
        $(div).data('recentData', recentCall);
        fragment.appendChild(div);
    });

    container[0].appendChild(fragment);
}

$(document).on('click', '.phone-recent-call', function(e){
    e.preventDefault();

    var RecendId = $(this).attr('id');
    var RecentData = $("#"+RecendId).data('recentData');

    cData = {
        number: RecentData.number,
        name: RecentData.name
    }

    $.post(`https://${GetParentResourceName()}/CallContact`, JSON.stringify({
        ContactData: cData,
        Anonymous: QB.Phone.Data.AnonymousCall,
    }), function(status){
        if (cData.number !== QB.Phone.Data.PlayerData.charinfo.phone) {
            if (status.IsOnline) {
                if (status.CanCall) {
                    if (!status.InCall) {
                        if (QB.Phone.Data.AnonymousCall) {
                            QB.Phone.Notifications.Add("fas fa-phone", "Phone", "You started a anonymous call!");
                        }
                        var El = QB.Phone.Elements;
                        El.callOutgoing.css({"display":"block"});
                        El.callIncoming.css({"display":"none"});
                        El.callOngoing.css({"display":"none"});
                        El.callOutgoingCaller.html(cData.name);
                        QB.Phone.Functions.HeaderTextColor("white", 400);
                        QB.Phone.Animations.TopSlideUp('.phone-application-container', 400, -160);
                        setTimeout(function(){
                            $(".phone-app").css({"display":"none"});
                            QB.Phone.Animations.TopSlideDown('.phone-application-container', 400, 0);
                            QB.Phone.Functions.ToggleApp("phone-call", "block");
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
});

$(document).on('click', ".phone-keypad-key-call", function(e){
    e.preventDefault();

    var InputNum = keyPadHTML;

    cData = {
        number: InputNum,
        name: InputNum,
    }

    $.post(`https://${GetParentResourceName()}/CallContact`, JSON.stringify({
        ContactData: cData,
        Anonymous: QB.Phone.Data.AnonymousCall,
    }), function(status){
        if (cData.number !== QB.Phone.Data.PlayerData.charinfo.phone) {
            if (status.IsOnline) {
                if (status.CanCall) {
                    if (!status.InCall) {
                        var El = QB.Phone.Elements;
                        El.callOutgoing.css({"display":"block"});
                        El.callIncoming.css({"display":"none"});
                        El.callOngoing.css({"display":"none"});
                        El.callOutgoingCaller.html(cData.name);
                        QB.Phone.Functions.HeaderTextColor("white", 400);
                        QB.Phone.Animations.TopSlideUp('.phone-application-container', 400, -160);
                        setTimeout(function(){
                            $(".phone-app").css({"display":"none"});
                            QB.Phone.Animations.TopSlideDown('.phone-application-container', 400, 0);
                            QB.Phone.Functions.ToggleApp("phone-call", "block");
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
});

QB.Phone.Functions.LoadContacts = function(myContacts) {
    var ContactsObject = $(".phone-contact-list");
    var container = ContactsObject[0];
    container.innerHTML = "";
    var TotalContacts = 0;

    $(".phone-contacts").hide();
    $(".phone-recent").hide();
    $(".phone-keypad").hide();

    $(".phone-"+CurrentFooterTab).show();

    if (myContacts !== null) {
        var fragment = document.createDocumentFragment();
        $.each(myContacts, function(i, contact){
            contact.name = DOMPurify.sanitize(contact.name , {
                ALLOWED_TAGS: [],
                ALLOWED_ATTR: []
            });
            if (contact.name === '') contact.name = 'Unknown Contact';
            var div = document.createElement('div');
            div.className = "phone-contact";
            div.setAttribute('data-contactid', i);
            var bgColor = contact.status ? '#fc4e03' : 'dodgerblue';
            div.innerHTML = '<div class="phone-contact-firstletter" style="background-color: '+bgColor+';">'+((contact.name).charAt(0)).toUpperCase()+'</div><div class="phone-contact-name">'+contact.name+'</div><div class="phone-contact-actions"><i class="fas fa-sort-down"></i></div><div class="phone-contact-action-buttons"> <i class="fas fa-phone-volume" id="phone-start-call"></i> <i class="fa-solid fa-message" id="new-chat-phone"></i> <i class="fas fa-user-edit" id="edit-contact"></i> </div>';
            $(div).data('contactData', contact);
            fragment.appendChild(div);
            TotalContacts++;
        });
        container.appendChild(fragment);
        $("#total-contacts").text(TotalContacts + " contacts");
    } else {
        $("#total-contacts").text("0 contacten #SAD");
    }
};

$(document).on('click', '#new-chat-phone', function(e){
    var ContactId = $(this).parent().parent().data('contactid');
    var ContactData = $("[data-contactid='"+ContactId+"']").data('contactData');

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

var CurrentEditContactData = {}

$(document).on('click', '#edit-contact, #edit-contact-save, #edit-contact-delete, #edit-contact-cancel', function(e){
    e.preventDefault();
    var id = this.id;

    if (id === 'edit-contact') {
        var ContactId = $(this).parent().parent().data('contactid');
        var ContactData = $("[data-contactid='"+ContactId+"']").data('contactData');

        CurrentEditContactData.name = DOMPurify.sanitize(ContactData.name , {
            ALLOWED_TAGS: [],
            ALLOWED_ATTR: []
        });
        if (CurrentEditContactData.name === '') CurrentEditContactData.name = 'Hmm, I shouldn\'t be able to do this...'
        CurrentEditContactData.number = ContactData.number

        $(".phone-edit-contact-header").text(ContactData.name+" Edit")
        $(".phone-edit-contact-name").val(ContactData.name);
        $(".phone-edit-contact-number").val(ContactData.number);
        if (ContactData.iban != null && ContactData.iban != undefined) {
            $(".phone-edit-contact-iban").val(ContactData.iban);
            CurrentEditContactData.iban = ContactData.iban
        } else {
            $(".phone-edit-contact-iban").val("");
            CurrentEditContactData.iban = "";
        }

        QB.Phone.Animations.TopSlideDown(".phone-edit-contact", 200, 0);

    } else if (id === 'edit-contact-save') {
        var ContactName = DOMPurify.sanitize($(".phone-edit-contact-name").val() , {
            ALLOWED_TAGS: [],
            ALLOWED_ATTR: []
        });
        if (ContactName === '') ContactName = 'Hmm, I shouldn\'t be able to do this...'
        var ContactNumber = $(".phone-edit-contact-number").val();
        var ContactIban = $(".phone-edit-contact-iban").val();

        if (ContactName !== "" && ContactNumber !== "") {
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
            }, 250);
        } else {
            QB.Phone.Notifications.Add("fas fa-exclamation-circle", "Edit Contact", "Fill out all fields!");
        }

    } else if (id === 'edit-contact-delete') {
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

    } else if (id === 'edit-contact-cancel') {
        QB.Phone.Animations.TopSlideUp(".phone-edit-contact", 250, -100);
        setTimeout(function(){
            $(".phone-edit-contact-number").val("");
            $(".phone-edit-contact-name").val("");
        }, 250);
    }
});

$(document).on('click', '.phone-keypad-key', function(e){
    e.preventDefault();
    var PressedButton = $(this).data('keypadvalue');
    var $keypadInput = QB.Phone.Elements.keypadInput;
    if (!isNaN(PressedButton)) {
        keyPadHTML = $keypadInput.text();
        $keypadInput.text(keyPadHTML + PressedButton);
        keyPadHTML = $keypadInput.text();
    } else if (PressedButton == "#") {
        keyPadHTML = $keypadInput.text();
        $keypadInput.text(keyPadHTML + PressedButton);
        keyPadHTML = $keypadInput.text();
    } else if (PressedButton == "*") {
        if (ClearNumberTimer == null) {
            $keypadInput.text("Cleared");
            ClearNumberTimer = setTimeout(function(){
                $keypadInput.text("");
                keyPadHTML = $keypadInput.text();
                ClearNumberTimer = null;
            }, 750);
        }
    }
})

var OpenedContact = null;

$(document).on('click', '.phone-contact-actions', function(e){
    e.preventDefault();

    var FocussedContact = $(this).parent();
    var ContactId = $(FocussedContact).data('contactid');

    if (OpenedContact === null) {
        $(FocussedContact).animate({
            "height":"12vh"
        }, 150, function(){
            $(FocussedContact).find('.phone-contact-action-buttons').fadeIn(100);
        });
        OpenedContact = ContactId;
    } else if (OpenedContact == ContactId) {
        $(FocussedContact).find('.phone-contact-action-buttons').fadeOut(100, function(){
            $(FocussedContact).animate({
                "height":"4.5vh"
            }, 150);
        });
        OpenedContact = null;
    } else if (OpenedContact != ContactId) {
        var PreviousContact = $(".phone-contact-list").find('[data-contactid="'+OpenedContact+'"]');
        $(PreviousContact).find('.phone-contact-action-buttons').fadeOut(100, function(){
            $(PreviousContact).animate({
                "height":"4.5vh"
            }, 150);
            OpenedContact = ContactId;
        });
        $(FocussedContact).animate({
            "height":"12vh"
        }, 150, function(){
            $(FocussedContact).find('.phone-contact-action-buttons').fadeIn(100);
        });
    }
});


$(document).on('click', '#phone-plus-icon', function(e){
    e.preventDefault();

    QB.Phone.Animations.TopSlideDown(".phone-add-contact", 200, 0);
});

$(document).on('click', '#add-contact-save, #add-contact-cancel', function(e){
    e.preventDefault();
    var id = this.id;

    if (id === 'add-contact-save') {
        var ContactName = DOMPurify.sanitize($(".phone-add-contact-name").val() , {
            ALLOWED_TAGS: [],
            ALLOWED_ATTR: []
        });
        if (ContactName === '') ContactName = 'Hmm, I shouldn\'t be able to do this...'
        var ContactNumber = $(".phone-add-contact-number").val();
        var ContactIban = $(".phone-add-contact-iban").val();

        if (ContactName !== "" && ContactNumber !== "") {
            $.post(`https://${GetParentResourceName()}/AddNewContact`, JSON.stringify({
                ContactName: ContactName,
                ContactNumber: ContactNumber,
                ContactIban: ContactIban,
            }), function(PhoneContacts){
                QB.Phone.Functions.LoadContacts(PhoneContacts);
            });
            QB.Phone.Animations.TopSlideUp(".phone-add-contact", 250, -100);
            setTimeout(function(){
                $(".phone-add-contact-number").val("");
                $(".phone-add-contact-name").val("");
            }, 250);

            if (SelectedSuggestion !== null) {
                $.post(`https://${GetParentResourceName()}/RemoveSuggestion`, JSON.stringify({
                    data: $(SelectedSuggestion).data('SuggestionData')
                }));
                $(SelectedSuggestion).remove();
                SelectedSuggestion = null;
                var amount = parseInt(AmountOfSuggestions);
                if ((amount - 1) === 0) {
                    amount = 0;
                }
                $(".amount-of-suggested-contacts").html(amount + " contacts");
            }
        } else {
            QB.Phone.Notifications.Add("fas fa-exclamation-circle", "Add Contact", "Fill out all fields!");
        }
    } else if (id === 'add-contact-cancel') {
        QB.Phone.Animations.TopSlideUp(".phone-add-contact", 250, -100);
        setTimeout(function(){
            $(".phone-add-contact-number").val("");
            $(".phone-add-contact-name").val("");
        }, 250);
    }
});

$(document).on('click', '#phone-start-call', function(e){
    e.preventDefault();

    var ContactId = $(this).parent().parent().data('contactid');
    var ContactData = $("[data-contactid='"+ContactId+"']").data('contactData');

    SetupCall(ContactData);
});

SetupCall = function(cData) {
    var retval = false;
    $.post(`https://${GetParentResourceName()}/CallContact`, JSON.stringify({
        ContactData: cData,
        Anonymous: QB.Phone.Data.AnonymousCall,
    }), function(status){
        if (cData.number !== QB.Phone.Data.PlayerData.charinfo.phone) {
            if (status.IsOnline) {
                if (status.CanCall) {
                    if (!status.InCall) {
                        var El = QB.Phone.Elements;
                        El.callOutgoing.css({"display":"block"});
                        El.callIncoming.css({"display":"none"});
                        El.callOngoing.css({"display":"none"});
                        El.callOutgoingCaller.html(cData.name);
                        QB.Phone.Functions.HeaderTextColor("white", 400);
                        QB.Phone.Animations.TopSlideUp('.phone-application-container', 250, -100);
                        QB.Phone.Animations.TopSlideUp('.'+QB.Phone.Data.currentApplication+"-app", 400, -100);
                        setTimeout(function(){
                            QB.Phone.Functions.ToggleApp(QB.Phone.Data.currentApplication, "none");
                            QB.Phone.Animations.TopSlideDown('.phone-application-container', 400, 0);
                            QB.Phone.Functions.ToggleApp("phone-call", "block");
                        }, 450);

                        CallData.name = cData.name;
                        CallData.number = cData.number;

                        QB.Phone.Data.currentApplication = "phone-call";
                    } else {
                        QB.Phone.Notifications.Add("fas fa-phone", "Phone", "You're already in a call!");
                    }
                } else {
                    QB.Phone.Notifications.Add("fas fa-phone", "Phone", "This person is in a call!");
                }
            } else {
                QB.Phone.Notifications.Add("fas fa-phone", "Phone", "This person is not available!");
            }
        } else {
            QB.Phone.Notifications.Add("fas fa-phone", "Phone", "You can't call your own number!");
        }
    });
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

$(document).on('click', '#outgoing-cancel, #incoming-deny, #ongoing-cancel, #incoming-answer', function(e){
    e.preventDefault();
    var id = this.id;
    if (id === 'outgoing-cancel') {
        $.post(`https://${GetParentResourceName()}/CancelOutgoingCall`);
    } else if (id === 'incoming-deny') {
        $.post(`https://${GetParentResourceName()}/DenyIncomingCall`);
    } else if (id === 'ongoing-cancel') {
        $.post(`https://${GetParentResourceName()}/CancelOngoingCall`);
    } else if (id === 'incoming-answer') {
        $.post(`https://${GetParentResourceName()}/AnswerCall`);
    }
});

IncomingCallAlert = function(CallData, Canceled, AnonymousCall) {
    var El = QB.Phone.Elements;
    if (!Canceled) {
        if (!QB.Phone.Data.CallActive) {
            QB.Phone.Animations.TopSlideUp('.phone-application-container', 400, -100);
            QB.Phone.Animations.TopSlideUp('.'+QB.Phone.Data.currentApplication+"-app", 400, -100);
            El.callIncomingCaller.html(CallData.name);
            setTimeout(function(){
                El.callOutgoing.css({"display":"none"});
                El.callIncoming.css({"display":"block"});
                El.callOngoing.css({"display":"none"});
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
            El.callOutgoing.css({"display":"none"});
            El.callIncoming.css({"display":"none"});
            El.callOngoing.css({"display":"none"});
        }, 400);
        QB.Phone.Functions.HeaderTextColor("white", 300);
        QB.Phone.Data.CallActive = false;
        QB.Phone.Data.currentApplication = null;
    }
}

QB.Phone.Functions.SetupCurrentCall = function(cData) {
    var El = QB.Phone.Elements;
    if (cData.InCall) {
        CallData = cData;
        El.currentCallContainer.css({"display":"block"});

        if (!QB.Phone.Data.IsOpen == true) {
            QB.Phone.Animations.BottomSlideUp('.container', 250, -50);
        }

        if (cData.CallType == "incoming") {
            El.currentCallTitle.html("Incoming call");
        } else if (cData.CallType == "outgoing") {
            El.currentCallTitle.html("Outgoing call");
        } else if (cData.CallType == "ongoing") {
            El.currentCallTitle.html("In call ("+cData.CallTime+")");
        }

        El.currentCallContact.html(cData.TargetData.name);
    } else {
        El.currentCallContainer.css({"display":"none"});
    }
}

$(document).on('click', '.phone-currentcall-container', function(e){
    e.preventDefault();

    var El = QB.Phone.Elements;
    if (CallData.CallType == "incoming") {
        El.callIncoming.css({"display":"block"});
        El.callOutgoing.css({"display":"none"});
        El.callOngoing.css({"display":"none"});
    } else if (CallData.CallType == "outgoing") {
        El.callIncoming.css({"display":"none"});
        El.callOutgoing.css({"display":"block"});
        El.callOngoing.css({"display":"none"});
    } else if (CallData.CallType == "ongoing") {
        El.callIncoming.css({"display":"none"});
        El.callOutgoing.css({"display":"none"});
        El.callOngoing.css({"display":"block"});
    }
    El.callOngoingCaller.html(CallData.name);

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

QB.Phone.Functions.AnswerCall = function(CallData) {
    var El = QB.Phone.Elements;
    El.callIncoming.css({"display":"none"});
    El.callOutgoing.css({"display":"none"});
    El.callOngoing.css({"display":"block"});
    El.callOngoingCaller.html(CallData.TargetData.name);

    QB.Phone.Functions.Close();
}

QB.Phone.Functions.SetupSuggestedContacts = function(Suggested) {
    var container = $(".suggested-contacts")[0];
    container.innerHTML = "";
    AmountOfSuggestions = Suggested.length;
    if (AmountOfSuggestions > 0) {
        $(".amount-of-suggested-contacts").html(AmountOfSuggestions + " contacts");
        Suggested = Suggested.reverse();
        var fragment = document.createDocumentFragment();
        $.each(Suggested, function(index, suggest){
            var div = document.createElement('div');
            div.className = "suggested-contact";
            div.id = "suggest-"+index;
            div.innerHTML = '<i class="fas fa-exclamation-circle"></i> <span class="suggested-name">'+suggest.name[0]+' '+suggest.name[1]+' &middot; <span class="suggested-number">'+suggest.number+'</span></span>';
            $(div).data('SuggestionData', suggest);
            fragment.appendChild(div);
        });
        container.appendChild(fragment);
    } else {
        $(".amount-of-suggested-contacts").html("0 contacts");
    }
}

$(document).on('click', '.suggested-contact', function(e){
    e.preventDefault();

    var SuggestionData = $(this).data('SuggestionData');
    SelectedSuggestion = this;

    QB.Phone.Animations.TopSlideDown(".phone-add-contact", 200, 0);

    $(".phone-add-contact-name").val(SuggestionData.name[0] + " " + SuggestionData.name[1]);
    $(".phone-add-contact-number").val(SuggestionData.number);
    $(".phone-add-contact-iban").val(SuggestionData.bank);
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