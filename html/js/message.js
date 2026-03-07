var WhatsappSearchActive = false;
var OpenedChatPicture = null;
var ExtraButtonsOpen = false;

$( "input[type=text], textarea, input[type=number]" ).focusin(function(e) {
    e.preventDefault();
    $.post(`https://${GetParentResourceName()}/DissalowMoving`);
});
$(".whatsapp-openedchat").focusin(function(e) {
    e.preventDefault();
    $.post(`https://${GetParentResourceName()}/DissalowMoving`);
});

$( "input[type=text], textarea, input[type=number]" ).focusout(function(e) {
    e.preventDefault();
    $.post(`https://${GetParentResourceName()}/AllowMoving`);
});


var _whatsappSearchTimer = null;
$(document).on("keyup", "#whatsapp-contact-search", function() {
    var input = this;
    clearTimeout(_whatsappSearchTimer);
    _whatsappSearchTimer = setTimeout(function() {
        var value = input.value.toLowerCase();
        $(".whatsapp-chats .whatsapp-chat").filter(function() {
            $(this).toggle($(this).text().toLowerCase().indexOf(value) > -1);
        });
    }, 150);
});

var _whatsappMsgSearchTimer = null;
$(document).on("keyup", "#whatsapp-contact-input-search", function() {
    var input = this;
    clearTimeout(_whatsappMsgSearchTimer);
    _whatsappMsgSearchTimer = setTimeout(function() {
        var value = input.value.toLowerCase();
        $(".whatsapp-openedchat-message").filter(function() {
            $(this).toggle($(this).text().toLowerCase().indexOf(value) > -1);
        });
    }, 150);
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

    $("#whatsapp-contact-search").fadeOut(150);

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
    $("#whatsapp-contact-search").fadeIn(150);
    OpenedChatPicture = null;
});

QB.Phone.Functions.GetLastMessage = function(messages) {
    var LastMessageData = {
        time: "00:00",
        message: "nothing"
    }

    $.each(messages[messages.length - 1], function(i, msg){
        var msgData = msg[msg.length - 1];
        LastMessageData.time = msgData.time
        LastMessageData.message = DOMPurify.sanitize(msgData.message , {
            ALLOWED_TAGS: [],
            ALLOWED_ATTR: []
        });
        //if(LastMessageData.message == '') 'Hmm, I shouldn\'t be able to do this...'
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
    var container = document.querySelector('.whatsapp-chats');
    container.innerHTML = "";
    var fragment = document.createDocumentFragment();
    $.each(chats, function(i, chat){
        var profilepicture = "./img/default.png";
        var LastMessage = QB.Phone.Functions.GetLastMessage(chat.messages);
        var nameDisplay = (chat.name != undefined && chat.name != chat.number)
            ? chat.name
            : formatPhoneNumber(chat.number);

        var div = document.createElement('div');
        div.className = 'whatsapp-chat';
        div.id = 'whatsapp-chat-'+i;
        div.innerHTML = '<div class="whatsapp-chat-picture" style="background-image: url('+profilepicture+');"></div>'
            + '<div class="whatsapp-chat-name"><p>'+nameDisplay+'</p></div>'
            + '<div class="whatsapp-chat-lastmessage"><p>'+LastMessage.message+'</p></div>'
            + '<div class="whatsapp-chat-lastmessagetime"><p>'+LastMessage.time+'</p></div>'
            + '<div class="whatsapp-chat-unreadmessages unread-chat-id-'+i+'">1</div>';
        $(div).data('chatdata', chat);

        if (chat.Unread > 0 && chat.Unread !== undefined && chat.Unread !== null) {
            div.querySelector('.unread-chat-id-'+i).textContent = chat.Unread;
            div.querySelector('.unread-chat-id-'+i).style.display = 'block';
        } else {
            div.querySelector('.unread-chat-id-'+i).style.display = 'none';
        }

        fragment.appendChild(div);
    });
    container.appendChild(fragment);
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
    var Message = $(".whatsapp-input-message").val();
    var Number = $(".whatsapp-input-number").val();
    var regExp = /[a-zA-Z]/g;
    if ((Message &&Number ) != "" && !regExp.test(Number)){
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

$(document).on('click', '#whatsapp-openedchat-send', function(e){
    var Message = $("#whatsapp-openedchat-message").val();
    var urlDetect = detectURLs(Message)

    if (urlDetect != null){
        if (/(jpg|jpeg|gif|png)$/i.test(urlDetect)) {
            var NewMessage = Message.replace(/(?:https?|ftp):\/\/[\n\S]+/g, '');
        }else{
            var NewMessage = $("#whatsapp-openedchat-message").val();
        }
    } else {
        var NewMessage = $("#whatsapp-openedchat-message").val();
    }

    if ((NewMessage !== null && NewMessage !== undefined && NewMessage !== "") || (urlDetect != null && /(jpg|jpeg|gif|png)$/i.test(urlDetect))) {
        ConfirmationFrame();
    }

    if (NewMessage !== null && NewMessage !== undefined && NewMessage !== "") {
        $.post(`https://${GetParentResourceName()}/SendMessage`, JSON.stringify({
            ChatNumber: OpenedChatData.number,
            ChatDate: GetCurrentDateKey(),
            ChatMessage: NewMessage,
            ChatTime: FormatMessageTime(),
            ChatType: "message",
        }));
    }

    if (urlDetect != null){
        if (/(jpg|jpeg|gif|png)$/i.test(urlDetect)) {
            $.post(`https://${GetParentResourceName()}/SendMessage`, JSON.stringify({
                ChatNumber: OpenedChatData.number,
                ChatDate: GetCurrentDateKey(),
                ChatMessage: null,
                ChatTime: FormatMessageTime(),
                ChatType: "picture",
                url : urlDetect
            }));
        }
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
        OpenedChatData.number = cData.number;

        ShitterPicture = "./img/default.png";
        $(".whatsapp-openedchat-picture").css({"background-image":"url("+ShitterPicture+")"});

        if (cData.name != undefined && cData.name != cData.number) {
            $(".whatsapp-openedchat-number").html("<p>"+cData.name+"</p>");
        } else {
            $(".whatsapp-openedchat-name").html("<p>"+formatPhoneNumber(cData.number)+"</p>");
        }

        var messagesContainer = document.querySelector('.whatsapp-openedchat-messages');
        messagesContainer.innerHTML = "";
        var outerFragment = document.createDocumentFragment();

        $.each(cData.messages, function(i, chat){
            var ChatDate = FormatChatDate(chat.date);
            var groupDiv = document.createElement('div');
            groupDiv.className = 'whatsapp-openedchat-messages-'+i+' unique-chat';
            var dateDiv = document.createElement('div');
            dateDiv.className = 'whatsapp-openedchat-date';
            dateDiv.textContent = ChatDate;
            groupDiv.appendChild(dateDiv);

            var innerFragment = document.createDocumentFragment();
            $.each(cData.messages[i].messages, function(index, message){
                message.message = DOMPurify.sanitize(message.message , {
                    ALLOWED_TAGS: [],
                    ALLOWED_ATTR: []
                });
                var Sender = (message.sender !== QB.Phone.Data.PlayerData.citizenid) ? "other" : "me";
                var msgHTML;
                if (message.type === "message") {
                    msgHTML = '<div class="whatsapp-openedchat-message whatsapp-openedchat-message-'+Sender+'">'+message.message+'</div><div class="clearfix"></div>';
                } else if (message.type === "location") {
                    msgHTML = '<div class="whatsapp-openedchat-message whatsapp-openedchat-message-'+Sender+' whatsapp-shared-location" data-x="'+message.data.x+'" data-y="'+message.data.y+'"><span style="font-size: 1.2vh;"><i class="fas fa-map-marker-alt" style="font-size: 1vh;"></i> Location</span><div class="whatsapp-openedchat-message-time">'+message.time+'</div></div><div class="clearfix"></div>';
                } else if (message.type === "picture") {
                    msgHTML = '<div class="whatsapp-openedchat-message-test whatsapp-openedchat-message-test-'+Sender+'" data-id="'+OpenedChatData.number+'"><img class="wppimage" src="'+message.data.url+'" style="border-radius:0; width: 80%; position:relative; z-index: 1; right:-2.8vh;height: auto;"></div><div class="clearfix"></div>';
                }
                var temp = document.createElement('div');
                temp.innerHTML = msgHTML;
                while (temp.firstChild) {
                    innerFragment.appendChild(temp.firstChild);
                }
            });

            groupDiv.appendChild(innerFragment);
            outerFragment.appendChild(groupDiv);
        });

        messagesContainer.appendChild(outerFragment);
        $('.whatsapp-openedchat-messages').animate({scrollTop: 9999}, 1);
    } else {
        OpenedChatData.number = NewChatData.number;

        ShitterPicture = "./img/default.png";
        $(".whatsapp-openedchat-picture").css({"background-image":"url("+ShitterPicture+")"});

        if (isNaN(NewChatData.name) == true) {
            $(".whatsapp-openedchat-name").html("<p>"+NewChatData.name+"</p>");
        } else {
            $(".whatsapp-openedchat-name").html("<p>"+formatPhoneNumber(NewChatData.name)+"</p>");
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