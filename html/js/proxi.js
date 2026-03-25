// Proxi JS

let ProxiSearchDebounce = null;
$(document).ready(function(){
        $("#proxi-search").on("input", function() {
                var inputElement = $(this);
                clearTimeout(ProxiSearchDebounce);
                ProxiSearchDebounce = setTimeout(function() {
                        var value = inputElement.val().toLowerCase();
                        $(".proxi").filter(function() {
                            $(this).toggle($(this).text().toLowerCase().indexOf(value) > -1);
                        });
                }, 120);
    });
});

// Functions

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

function ClearProxiInput() {
    $(".proxi-box-textt-input").val("");
    $('.proxi-box-image-input').val("");
}

function formatPhoneNumber(phoneNumberString) {
    var cleaned = ('' + phoneNumberString).replace(/\D/g, '');
    var match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
    if (match) {
      return '(' + match[1] + ') ' + match[2] + '-' + match[3];
    }
    return phoneNumberString;
}

QB.Phone.Functions.RefreshProxis = function(Proxis) {
    $(".proxi-list").html("");
    Proxis = Proxis.reverse();
    if (Proxis.length > 0 || Proxis.length == undefined) {
        $.each(Proxis, function(_, proxi){
            if (proxi.url) {
                if (proxi.number === QB.Phone.Data.PlayerData.charinfo.phone){
                    var element = '<div class="proxi" data-number="'+ proxi.number +'">'+
                    '<div class="proxi-message">' + proxi.message + '</div>'+
                    '<div class="proxi-contact-info">' + ' <i class="fa-solid fa-square-phone"></i> ' + '    ' + formatPhoneNumber(proxi.number) + '</div>'+
                    '<div class="proxi-image-attached">Images Attached: 1<p><u>Hide (click image to copy URL)</u></p></div>'+
                    '<div class="proxi-trash" data-proxiid="'+proxi.id+'"><i class="fas fa-trash"></i></div>'+
                    '<img class="image" src= ' + proxi.url + ' style = "display: none; position: relative; width: 13vw; height: 12vh; bottom: 4.0vh; margin: 0 auto; border-radius: 1vh;">' +
                        '<div class="proxi-block">' +
                            '<div class="proxi-eye"><i class="fas fa-eye"></i></div>'+
                            '<div class="proxi-image-text">Click to View</div>'+
                            '<div class="proxi-image-text-other">Only revel images from those you<p>know are not dick heads</p></div>'+
                        '</div>'+
                    '</div>';
                }else{
                    var element = '<div class="proxi" data-number="'+ proxi.number +'">'+
                    '<div class="proxi-message">' + proxi.message + '</div>'+
                    '<div class="proxi-contact-info">' + ' <i class="fa-solid fa-square-phone"></i> ' + '    ' + formatPhoneNumber(proxi.number) + '</div>'+
                    '<div class="proxi-image-attached">Images Attached: 1<p><u>Hide (click image to copy URL)</u></p></div>'+
                    '<img class="image" src= ' + proxi.url + ' style = "display: none; position: relative; width: 13vw; height: 12vh; bottom: 4.0vh; margin: 0 auto; border-radius: 1vh;">' +
                        '<div class="proxi-block">' +
                            '<div class="proxi-eye"><i class="fas fa-eye"></i></div>'+
                            '<div class="proxi-image-text">Click to View</div>'+
                            '<div class="proxi-image-text-other">Only revel images from those you<p>know are not dick heads</p></div>'+
                        '</div>'+
                    '</div>';
                }
            } else {
                if (proxi.number === QB.Phone.Data.PlayerData.charinfo.phone){
                    var element = '<div class="proxi" data-number="'+ proxi.number +'">'+
                        '<div class="proxi-message">' + proxi.message + '</div>'+
                        '<div class="proxi-contact-info">' + ' <i class="fa-solid fa-square-phone"></i> ' + '    ' + formatPhoneNumber(proxi.number) + '</div>'+
                        '<div class="proxi-trash" data-proxiid="'+proxi.id+'"><i class="fas fa-trash"></i></div>'+
                    '</div>';
                }else{
                    var element = '<div class="proxi" data-number="'+ proxi.number +'">'+
                    '<div class="proxi-message">' + proxi.message + '</div>'+
                    '<div class="proxi-contact-info">' + ' <i class="fa-solid fa-square-phone"></i> ' + '    ' + formatPhoneNumber(proxi.number) + '</div>'+
                '</div>';
                }
            }

            $(".proxi-list").append(element);
        });
    }
}

// Clicks

$(document).on('click', '.create-proxi', function(e){
    e.preventDefault();

    ClearProxiInput();
    $('#proxi-box-textt').css({display: 'flex', opacity: 0}).animate({opacity: 1}, 350);
});

$(document).on('click', '#proxi-sendmessage-chat', function(e){
    e.preventDefault();

    var Proxi = $(".proxi-box-textt-input").val();
    let picture = $('.proxi-box-image-input').val();

    if (Proxi !== "" || picture != "") {
        setTimeout(function(){
            ConfirmationFrame()
        }, 150);
        $.post(`https://${GetParentResourceName()}/PostProxi`, JSON.stringify({
            message: Proxi,
            url: picture
        }));
        ClearProxiInput();
        $('#proxi-box-textt').animate({opacity: 0}, 350, function(){ $(this).css("display", "none"); });
    } else {
        QB.Phone.Notifications.Add("fas fa-ad", "Proxi", "You can\'t post an empty proxi!", "#ff8f1a", 2000);
    }
});

$(document).on('click', '#proxi-cancel', function(e){
    e.preventDefault();
    $('#proxi-box-textt').animate({opacity: 0}, 300, function(){ $(this).css("display", "none"); });
});

$(document).on('click','.proxi-contact-info',function(e){
    e.preventDefault();
    var Number = $(this).parent().data('number');
    if (Number != undefined){
        var InputNum = Number;

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
                                $('#proxi-box-textt').animate({opacity: 0}, 350, function(){ $(this).css("display", "none"); });
                                ClearProxiInput();
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
    }
})

$(document).on('click', '.proxi-eye', function(e){
    e.preventDefault();

    $(this).parent().parent().find(".image").css({"display":"block"});
    $(this).parent().parent().find(".proxi-block").css({"display":"none"});
});

$(document).on('click', '.proxi-image-attached', function(e){
    e.preventDefault();

    $(this).parent().parent().find(".image").css({"display":"none"});
    $(this).parent().parent().find(".proxi-block").css({"display":"block"});
});

$(document).on('click','.proxi-trash',function(e){
    e.preventDefault();
    var proxiId = $(this).attr('data-proxiid');
    setTimeout(function(){
        ConfirmationFrame()
        QB.Phone.Notifications.Add("fas fa-ad", "Proxi", "The proxi was deleted", "#ff8f1a", 2000);
    }, 150);
    $.post(`https://${GetParentResourceName()}/DeleteProxi`, JSON.stringify({
        id: proxiId
    }));
})