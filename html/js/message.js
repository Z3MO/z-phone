var WhatsappSearchActive = false;
var OpenedChatPicture = null;
var ExtraButtonsOpen = false;
const MESSAGE_IMAGE_REGEX = /\.(?:jpg|jpeg|gif|png)(?:\?.*)?$/i;

$( "input[type=text], textarea, input[type=number], input[type=tel]" ).focusin(function(e) {
    e.preventDefault();
    $.post(`https://${GetParentResourceName()}/DissalowMoving`);
});
$(".whatsapp-openedchat").focusin(function(e) {
    e.preventDefault();
    $.post(`https://${GetParentResourceName()}/DissalowMoving`);
});

$( "input[type=text], textarea, input[type=number], input[type=tel]" ).focusout(function(e) {
    e.preventDefault();
    $.post(`https://${GetParentResourceName()}/AllowMoving`);
});

$(document).ready(function(){
    if ($.fn.emojioneArea && !$('#whatsapp-openedchat-message').data('emojioneArea')) {
        $('#whatsapp-openedchat-message').emojioneArea({
            inline: true,
            searchPosition: "bottom",
            shortnames: true
        });
    }
});

function formatPhoneNumber(phoneNumberString) {
    var cleaned = ('' + phoneNumberString).replace(/\D/g, '');
    var match = cleaned.match(/^(1|)?(\d{3})(\d{3})(\d{4})$/);
    if (match) {
      var intlCode = (match[1] ? '+1 ' : '');
      return [intlCode, '(', match[2], ') ', match[3], '-', match[4]].join('');
    }
    return phoneNumberString;
}

function sanitizeText(value) {
    return DOMPurify.sanitize(String(value ?? ""), {
        ALLOWED_TAGS: [],
        ALLOWED_ATTR: []
    }).trim();
}

function sanitizeNumericValue(value) {
    return String(value ?? "").replace(/\D/g, "").slice(0, 15);
}

function sanitizeImageUrl(urlValue) {
    const rawUrl = Array.isArray(urlValue) ? urlValue[0] : urlValue;
    if (typeof rawUrl !== "string") {
        return null;
    }

    const trimmedUrl = rawUrl.trim();
    if (trimmedUrl === "" || !MESSAGE_IMAGE_REGEX.test(trimmedUrl)) {
        return null;
    }

    try {
        const normalizedUrl = trimmedUrl.startsWith("www.") ? `https://${trimmedUrl}` : trimmedUrl;
        const parsedUrl = new URL(normalizedUrl, window.location.href);

        if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
            return null;
        }

        return parsedUrl.href;
    } catch (error) {
        return null;
    }
}

function getMessagePreview(messageData) {
    if (!messageData) {
        return "No messages yet";
    }

    if (messageData.type === "picture") {
        return "Photo";
    }

    if (messageData.type === "location") {
        return "Shared location";
    }

    const safeMessage = sanitizeText(messageData.message);
    if (safeMessage === "") {
        return "No messages yet";
    }

    return safeMessage.length > 38 ? `${safeMessage.slice(0, 38)}…` : safeMessage;
}

function setOpenedChatHeader(name, number) {
    $(".whatsapp-openedchat-name").text(name || "");
    $(".whatsapp-openedchat-number").text(number || "");
}

function createWhatsappEmptyState() {
    const emptyState = document.createElement("div");
    emptyState.className = "whatsapp-empty-state";
    emptyState.innerHTML = '<i class="fa-regular fa-comments"></i><div class="whatsapp-empty-state-title">No conversations yet</div><div class="whatsapp-empty-state-text">Start a new message to see your chats here.</div>';
    return emptyState;
}

function createChatElement(chat, index) {
    const chatElement = document.createElement("div");
    const pictureElement = document.createElement("div");
    const nameElement = document.createElement("div");
    const nameParagraph = document.createElement("p");
    const lastMessageElement = document.createElement("div");
    const lastMessageParagraph = document.createElement("p");
    const lastMessageTimeElement = document.createElement("div");
    const lastMessageTimeParagraph = document.createElement("p");
    const unreadElement = document.createElement("div");
    const profilePicture = "./img/default.png";
    const lastMessage = QB.Phone.Functions.GetLastMessage(chat.messages);
    const chatLabel = sanitizeText(chat.name);
    const displayName = chatLabel !== "" && chatLabel !== String(chat.number) ? chatLabel : formatPhoneNumber(chat.number);

    chatElement.className = "whatsapp-chat";
    chatElement.id = `whatsapp-chat-${index}`;

    pictureElement.className = "whatsapp-chat-picture";
    pictureElement.style.backgroundImage = `url(${profilePicture})`;

    nameElement.className = "whatsapp-chat-name";
    nameParagraph.textContent = displayName;
    nameElement.appendChild(nameParagraph);

    lastMessageElement.className = "whatsapp-chat-lastmessage";
    lastMessageParagraph.textContent = lastMessage.message;
    lastMessageElement.appendChild(lastMessageParagraph);

    lastMessageTimeElement.className = "whatsapp-chat-lastmessagetime";
    lastMessageTimeParagraph.textContent = lastMessage.time;
    lastMessageTimeElement.appendChild(lastMessageTimeParagraph);

    unreadElement.className = `whatsapp-chat-unreadmessages unread-chat-id-${index}`;
    if (chat.Unread > 0 && chat.Unread !== undefined && chat.Unread !== null) {
        unreadElement.textContent = chat.Unread;
        unreadElement.style.display = "block";
    } else {
        unreadElement.style.display = "none";
    }

    chatElement.appendChild(pictureElement);
    chatElement.appendChild(nameElement);
    chatElement.appendChild(lastMessageElement);
    chatElement.appendChild(lastMessageTimeElement);
    chatElement.appendChild(unreadElement);

    $(chatElement).data('chatdata', chat);
    return chatElement;
}

function createMessageElement(message, sender) {
    const wrapper = document.createDocumentFragment();
    const clearFix = document.createElement("div");
    let messageElement;

    if (message.type === "message") {
        messageElement = document.createElement("div");
        messageElement.className = `whatsapp-openedchat-message whatsapp-openedchat-message-${sender}`;
        messageElement.textContent = sanitizeText(message.message);
    } else if (message.type === "location") {
        messageElement = document.createElement("div");
        const icon = document.createElement("span");
        const timeElement = document.createElement("div");

        messageElement.className = `whatsapp-openedchat-message whatsapp-openedchat-message-${sender} whatsapp-shared-location`;
        messageElement.dataset.x = message.data.x;
        messageElement.dataset.y = message.data.y;

        icon.innerHTML = '<i class="fas fa-map-marker-alt" style="font-size: 1vh;"></i> Location';
        icon.style.fontSize = "1.2vh";

        timeElement.className = "whatsapp-openedchat-message-time";
        timeElement.textContent = message.time;

        messageElement.appendChild(icon);
        messageElement.appendChild(timeElement);
    } else if (message.type === "picture") {
        const imageUrl = sanitizeImageUrl(message.data && message.data.url);
        if (!imageUrl) {
            return null;
        }

        messageElement = document.createElement("div");
        messageElement.className = `whatsapp-openedchat-message-test whatsapp-openedchat-message-test-${sender}`;
        messageElement.dataset.id = OpenedChatData.number;

        const image = document.createElement("img");
        image.className = "wppimage";
        image.src = imageUrl;
        image.alt = "Shared image";
        image.loading = "lazy";
        image.referrerPolicy = "no-referrer";
        image.style.borderRadius = "0";
        image.style.width = "80%";
        image.style.position = "relative";
        image.style.zIndex = "1";
        image.style.right = "-2.8vh";
        image.style.height = "auto";

        messageElement.appendChild(image);
    }

    if (!messageElement) {
        return null;
    }

    clearFix.className = "clearfix";
    wrapper.appendChild(messageElement);
    wrapper.appendChild(clearFix);
    return wrapper;
}

function getDetectedImageUrl(message) {
    const detectedUrls = detectURLs(message);
    if (!detectedUrls || detectedUrls.length === 0) {
        return null;
    }

    return sanitizeImageUrl(detectedUrls[0]);
}

$(document).on('click', '#whatsapp-newconvo-icon', function(e){
    e.preventDefault();
    ClearInputNew()
    $('#whatsapp-box-new-add-new').fadeIn(350);
});

$(document).on('click', '.whatsapp-chat', function(e){
    e.preventDefault();

    var ChatId = $(this).attr('id');
    var ChatData = $("#"+ChatId).data('chatdata');

    QB.Phone.Functions.SetupChatMessages(ChatData);

    $.post(`https://${GetParentResourceName()}/ClearAlerts`, JSON.stringify({
        number: ChatData.number
    }));

    $(".whatsapp-openedchat").css({"display":"block"});
    $(".whatsapp-openedchat").animate({
        left: 0+"vh"
    },200);

    $(".whatsapp-chats").animate({
        left: 30+"vh"
    },200, function(){
        $(".whatsapp-chats").css({"display":"none"});
    });

    $('.whatsapp-openedchat-messages').animate({scrollTop: 9999}, 150);

    ShitterPicture = "./img/default.png";
    $(".whatsapp-openedchat-picture").css({"background-image":"url("+ShitterPicture+")"});
});

$(document).on('click', '#whatsapp-openedchat-back', function(e){
    e.preventDefault();
    $.post(`https://${GetParentResourceName()}/GetWhatsappChats`, JSON.stringify({}), function(chats){
        QB.Phone.Functions.LoadWhatsappChats(chats);
    });
    OpenedChatData.number = null;
    $(".whatsapp-chats").css({"display":"block"});
    $(".whatsapp-chats").animate({
        left: 0+"vh"
    }, 200);
    $(".whatsapp-openedchat").animate({
        left: -30+"vh"
    }, 200, function(){
        $(".whatsapp-openedchat").css({"display":"none"});
    });
    OpenedChatPicture = null;
});

QB.Phone.Functions.GetLastMessage = function(messages) {
    var LastMessageData = {
        time: "00:00",
        message: "No messages yet"
    }

    $.each(messages[messages.length - 1], function(i, msg){
        var msgData = msg[msg.length - 1];
        LastMessageData.time = msgData.time
        LastMessageData.message = getMessagePreview(msgData);
    });

    return LastMessageData
}

GetCurrentDateKey = function() {
    var CurrentDate = new Date();
    var CurrentMonth = CurrentDate.getUTCMonth();
    var CurrentDOM = CurrentDate.getUTCDate();
    var CurrentYear = CurrentDate.getUTCFullYear();
    var CurDate = ""+CurrentDOM+"-"+CurrentMonth+"-"+CurrentYear+"";

    return CurDate;
}

QB.Phone.Functions.LoadWhatsappChats = function(chats) {
    const chatContainer = document.querySelector(".whatsapp-chats");
    const fragment = document.createDocumentFragment();

    chatContainer.innerHTML = "";

    if (!Array.isArray(chats) || chats.length === 0) {
        chatContainer.appendChild(createWhatsappEmptyState());
        return;
    }

    $.each(chats, function(i, chat){
        fragment.appendChild(createChatElement(chat, i));
    });

    chatContainer.appendChild(fragment);
}

QB.Phone.Functions.ReloadWhatsappAlerts = function(chats) {
    $.each(chats, function(i, chat){
        if (chat.Unread > 0 && chat.Unread !== undefined && chat.Unread !== null) {
            $(".unread-chat-id-"+i).html(chat.Unread);
            $(".unread-chat-id-"+i).css({"display":"block"});
        } else {
            $(".unread-chat-id-"+i).css({"display":"none"});
        }
    });
}

const monthNames = ["January", "February", "March", "April", "May", "June", "JulY", "August", "September", "October", "November", "December"];

FormatChatDate = function(date) {
    var TestDate = date.split("-");
    var NewDate = new Date((parseInt(TestDate[1]) + 1)+"-"+TestDate[0]+"-"+TestDate[2]);

    var CurrentMonth = monthNames[NewDate.getUTCMonth()];
    var CurrentDOM = NewDate.getUTCDate();
    var CurrentYear = NewDate.getUTCFullYear();
    var CurDateee = CurrentDOM + "-" + NewDate.getUTCMonth() + "-" + CurrentYear;
    var ChatDate = CurrentDOM + " " + CurrentMonth + " " + CurrentYear;
    var CurrentDate = GetCurrentDateKey();

    var ReturnedValue = ChatDate;
    if (CurrentDate == CurDateee) {
        ReturnedValue = "Today";
    }

    return ReturnedValue;
}

FormatMessageTime = function() {
    var NewDate = new Date();
    var NewHour = NewDate.getUTCHours();
    var NewMinute = NewDate.getUTCMinutes();
    var Minutessss = NewMinute;
    var Hourssssss = NewHour;
    if (NewMinute < 10) {
        Minutessss = "0" + NewMinute;
    }
    if (NewHour < 10) {
        Hourssssss = "0" + NewHour;
    }
    var MessageTime = Hourssssss + ":" + Minutessss
    return MessageTime;
}

$(document).on('click', '#whatsapp-save-note-for-doc', function(e){
    e.preventDefault();
    var Message = sanitizeText($(".whatsapp-input-message").val()).slice(0, 200);
    var Number = sanitizeNumericValue($(".whatsapp-input-number").val());
    if (Message !== "" && Number !== ""){
        $.post(`https://${GetParentResourceName()}/SendMessage`, JSON.stringify({
            ChatNumber: Number,
            ChatDate: GetCurrentDateKey(),
            ChatMessage: Message,
            ChatTime: FormatMessageTime(),
            ChatType: "message",
        }));
        ClearInputNew()
        $(".whatsapp-input-message").val("");
        $(".whatsapp-input-number").val("");
        $('#whatsapp-box-new-add-new').fadeOut(350);
        $.post(`https://${GetParentResourceName()}/GetWhatsappChats`, JSON.stringify({}), function(chats){
            QB.Phone.Functions.LoadWhatsappChats(chats);
        });
    } else {
        QB.Phone.Notifications.Add("fas fa-comment", "Messages", "You can't send a empty message!", "#25D366", 1750);
    }
});

function ConfirmationFrame() {
    $(".phone-action-feedback").css({display: 'flex', opacity: 0}).animate({opacity: 1}, 200);
    $(".feedback-content.loading").show();
    $(".feedback-content.success").hide();
    
    setTimeout(function () {
        $(".feedback-content.loading").hide();
        $(".feedback-content.success").fadeIn(200);
        setTimeout(function () {
            $(".phone-action-feedback").animate({opacity: 0}, 200, function(){ $(this).css("display", "none"); });
        }, 1500);
    }, 1500);
}

function detectURLs(message) {
  var urlRegex = /(((https?:\/\/)|(www\.))[^\s]+)/g;
  return message.match(urlRegex)
}

$(document).on('keydown', '#whatsapp-openedchat-message', function(e){
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        $("#whatsapp-openedchat-send").trigger("click");
    }
});

$(document).on('click', '#whatsapp-openedchat-send', function(e){
    var Message = String($("#whatsapp-openedchat-message").val() ?? "");
    var imageUrl = getDetectedImageUrl(Message);
    var NewMessage = sanitizeText(imageUrl ? Message.replace(/(?:https?|ftp):\/\/[\n\S]+/g, '') : Message).slice(0, 200);

    if (OpenedChatData.number === null || OpenedChatData.number === undefined || OpenedChatData.number === "") {
        return;
    }

    if (NewMessage !== "" || imageUrl !== null) {
        ConfirmationFrame();
    }

    if (NewMessage !== "") {
        $.post(`https://${GetParentResourceName()}/SendMessage`, JSON.stringify({
            ChatNumber: OpenedChatData.number,
            ChatDate: GetCurrentDateKey(),
            ChatMessage: NewMessage,
            ChatTime: FormatMessageTime(),
            ChatType: "message",
        }));
    }

    if (imageUrl !== null) {
        $.post(`https://${GetParentResourceName()}/SendMessage`, JSON.stringify({
            ChatNumber: OpenedChatData.number,
            ChatDate: GetCurrentDateKey(),
            ChatMessage: null,
            ChatTime: FormatMessageTime(),
            ChatType: "picture",
            url : imageUrl
        }));
    }

    $(".emojionearea-editor").html("");
    $("#whatsapp-openedchat-message").val("");
});

$(document).on('click', '#whatsapp-openedchat-call', function(e){
    e.preventDefault();
    var InputNum = OpenedChatData.number;

    if (InputNum != ""){
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
                            $('.phone-new-box-body').fadeOut(350);
                            ClearInputNew()
                            $(".phone-call-outgoing").css({"display":"block"});
                            $(".phone-call-incoming").css({"display":"none"});
                            $(".phone-call-ongoing").css({"display":"none"});
                            $(".phone-call-outgoing-caller").html(cData.name);
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
});

QB.Phone.Functions.SetupChatMessages = function(cData, NewChatData) {
    if (cData) {
        const formattedNumber = formatPhoneNumber(cData.number);
        const safeChatName = sanitizeText(cData.name);
        OpenedChatData.number = cData.number;

        ShitterPicture = "./img/default.png";
        $(".whatsapp-openedchat-picture").css({"background-image":"url("+ShitterPicture+")"});

        if (safeChatName !== "" && safeChatName !== String(cData.number)) {
            setOpenedChatHeader(safeChatName, formattedNumber);
        } else {
            setOpenedChatHeader(formattedNumber, "");
        }

        const messageContainer = document.querySelector(".whatsapp-openedchat-messages");
        const messageFragment = document.createDocumentFragment();
        messageContainer.innerHTML = "";

        $.each(cData.messages, function(i, chat){
            var ChatDate = FormatChatDate(chat.date);
            const chatGroup = document.createElement("div");
            const chatDate = document.createElement("div");
            chatGroup.className = `whatsapp-openedchat-messages-${i} unique-chat`;
            chatDate.className = "whatsapp-openedchat-date";
            chatDate.textContent = ChatDate;
            chatGroup.appendChild(chatDate);

            $.each(cData.messages[i].messages, function(index, message){
                var Sender = "me";
                if (message.sender !== QB.Phone.Data.PlayerData.citizenid) { Sender = "other"; }
                const messageElement = createMessageElement(message, Sender);
                if (messageElement) {
                    chatGroup.appendChild(messageElement);
                }
            });

            messageFragment.appendChild(chatGroup);
        });
        messageContainer.appendChild(messageFragment);
        $('.whatsapp-openedchat-messages').animate({scrollTop: 9999}, 1);
    } else {
        OpenedChatData.number = NewChatData.number;
        const safeChatName = sanitizeText(NewChatData.name);
        const formattedNumber = formatPhoneNumber(NewChatData.number || NewChatData.name);

        ShitterPicture = "./img/default.png";
        $(".whatsapp-openedchat-picture").css({"background-image":"url("+ShitterPicture+")"});

        if (isNaN(NewChatData.name) == true) {
            setOpenedChatHeader(safeChatName, formattedNumber);
        } else {
            setOpenedChatHeader(formattedNumber, "");
        }
        $(".whatsapp-openedchat-messages").html("");
        var NewDate = new Date();
        var NewDateMonth = NewDate.getUTCMonth();
        var NewDateDOM = NewDate.getUTCDate();
        var NewDateYear = NewDate.getUTCFullYear();
        var DateString = ""+NewDateDOM+"-"+(NewDateMonth+1)+"-"+NewDateYear;
        var ChatDiv = '<div class="whatsapp-openedchat-messages-'+DateString+' unique-chat"><div class="whatsapp-openedchat-date">TODAY</div></div>';

        $(".whatsapp-openedchat-messages").append(ChatDiv);
    }

    $('.whatsapp-openedchat-messages').animate({scrollTop: 9999}, 1);
}

$(document).on('click', '.wppimage', function(e){
    e.preventDefault();
    let source = $(this).attr('src')
   QB.Screen.popUp(source)
});
