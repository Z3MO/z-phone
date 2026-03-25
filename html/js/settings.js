QB.Phone.Settings = {};
QB.Phone.Settings.Background = "zphone-1";
QB.Phone.Settings.OpenedTab = null;
QB.Phone.Settings.Backgrounds = {
    'zphone-1': {
        label: "Vanilla Wallpaper"
    },
    'zphone-2': {
        label: "Moonshine Wallpaper"
    },
    'zphone-3': {
        label: "Supra Wallpaper"
    },
    'zphone-4': {
        label: "Spiderman Wallpaper"
    },
    'zphone-5': {
        label: "Blue-Sky Wallpaper"
    },
    'zphone-6': {
        label: "Orange Abstract Wallpaper"
    },
    'zphone-7': {
        label: "Red Moon Wallpaper"
    },
    'zphone-8': {
        label: "Cyberpunk Wallpaper"
    },
};

function numberWithCommas(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
 }

function LoadPlayerMoneys(){
    var PlayerPhoneNumber = QB.Phone.Data.PlayerData.charinfo.phone;
    var PlayerBankAcc = QB.Phone.Data.PlayerData.charinfo.account;
    var PlayerBankMoney = QB.Phone.Data.PlayerData.money['bank'];
    var PlayerCashMoney = QB.Phone.Data.PlayerData.money['cash'];
    var PlayerStateID = QB.Phone.Data.PlayerData.citizenid;

    $(".details-phone").html(PlayerPhoneNumber)
    $(".details-bankserial").html(PlayerBankAcc)
    $(".details-bankmoney").html("$"+numberWithCommas(PlayerBankMoney))
    $(".details-cashmoney").html("$"+numberWithCommas(PlayerCashMoney))
    $(".details-stateid").html(PlayerStateID)

    var PlayerLicenses = QB.Phone.Data.PlayerData.metadata.licences;

    $(".details-list").html("");
    var AddOption0 = '<div class="details-text-license">Licenses</div>'
    $('.details-list').append(AddOption0);
    for (const [k, v] of Object.entries(PlayerLicenses)) {
        if (v) {
            var firstLetter = k.substring(0, 1);
            var Fulltext = firstLetter.toUpperCase() + k.replace(firstLetter, '') + " License"

            var AddOption = '<div class="details-license-body-main">' +
                '<div class="details-license-text-class">' + Fulltext + '</div>' +
                '<div class="details-license-icon-class"><i style="color: #00ff9d;" class="fas fa-check-circle"></i></div>' +
                '</div>'
            $('.details-list').append(AddOption);
        } else {
            var firstLetter = k.substring(0, 1);
            var Fulltext = firstLetter.toUpperCase() + k.replace(firstLetter, '') + " License"

            var AddOption = '<div class="details-license-body-main">' +
                '<div class="details-license-text-class">' + Fulltext + '</div>' +
                '<div class="details-license-icon-class"><i style="color: #ff2d55;" class="fas fa-times-circle"></i></div>' +
                '</div>'
            $('.details-list').append(AddOption);
        }
    }
}

var PressedBackground = null;
var PressedBackgroundObject = null;
var OldBackground = null;
var IsChecked = null;

$(document).on('click', '.settings-app-tab', function(e){
    e.preventDefault();
    var PressedTab = $(this).data("settingstab");

    if (PressedTab == "background") {
        $(".settings-"+PressedTab+"-tab").css({"display":"block", "left":"100%", "top":"0"}).animate({"left":"0"}, 300);
        QB.Phone.Settings.OpenedTab = PressedTab;
        
        // Update Background Checkmarks
        $(".background-option-current").remove();
        var currentBackground = QB.Phone.Settings.Background;
        var found = false;
        $.each($(".background-option"), function(i, option){
            if ($(option).data('background') == currentBackground) {
                $(option).append('<div class="background-option-current"><i class="fas fa-check-circle"></i></div>');
                found = true;
            }
        });
        var customBgOption = $("[data-background='custom-background']");
        if (!found) {
             customBgOption.append('<div class="background-option-current"><i class="fas fa-check-circle"></i></div>');
             customBgOption.find('.background-option-icon').html('<img src="'+currentBackground+'" class="phone-backgrounds">');
        } else {
             customBgOption.find('.background-option-icon').html('<i class="fa-solid fa-image" style="font-size: 5vh; color: rgba(255,255,255,0.5); display: flex; align-items: center; justify-content: center; height: 100%;"></i>');
        }
    } else if (PressedTab == "profilepicture") {
        $(".settings-"+PressedTab+"-tab").css({"display":"block", "left":"100%", "top":"0"}).animate({"left":"0"}, 300);
        QB.Phone.Settings.OpenedTab = PressedTab;    

        // Update Profile Picture Checkmarks
        $(".profilepicture-option-current").remove();
        var currentPfp = QB.Phone.Data.MetaData.profilepicture;
        var customPfpOption = $("[data-profilepicture='custom-profilepicture']");
        if (!currentPfp || currentPfp == "default") {
            $("[data-profilepicture='default']").append('<div class="profilepicture-option-current"><i class="fas fa-check-circle"></i></div>');
            customPfpOption.find('.profilepicture-option-icon').html('<i class="fa-solid fa-user-pen" style="font-size: 5vh; color: rgba(255,255,255,0.5);"></i>');
        } else if (currentPfp !== "default") {
            customPfpOption.append('<div class="profilepicture-option-current"><i class="fas fa-check-circle"></i></div>');
            customPfpOption.find('.profilepicture-option-icon').html('<img src="'+currentPfp+'" style="width: 9vh; height: 9vh; border-radius: 50%; object-fit: cover; border: 2px solid rgba(255,255,255,0.1);">');
        }
    } else if (PressedTab == "info") {
        $(".settings-"+PressedTab+"-tab").css({"display":"block", "left":"100%", "top":"0"}).animate({"left":"0"}, 300);
        QB.Phone.Settings.OpenedTab = PressedTab;
    }
});

$(document).on('click', '#accept-background', function(e){
    e.preventDefault();
    var hasCustomBackground = QB.Phone.Functions.IsBackgroundCustom();

    if (hasCustomBackground === false) {
        QB.Phone.Notifications.Add("fas fa-paint-brush", "Settings", QB.Phone.Settings.Backgrounds[QB.Phone.Settings.Background].label+" is set!")
        $(".settings-"+QB.Phone.Settings.OpenedTab+"-tab").animate({"left":"100%"}, 300, function(){
            $(this).css("display", "none");
        });
        $(".phone-background").css({"background-image":"url('./img/backgrounds/"+QB.Phone.Settings.Background+".png')"})
    } else {
        QB.Phone.Notifications.Add("fas fa-paint-brush", "Settings", "Personal background set!")
        $(".settings-"+QB.Phone.Settings.OpenedTab+"-tab").animate({"left":"100%"}, 300, function(){
            $(this).css("display", "none");
        });
        $(".phone-background").css({"background-image":"url('"+QB.Phone.Settings.Background+"')"});
    }

    $.post(`https://${GetParentResourceName()}/SetBackground`, JSON.stringify({
        background: QB.Phone.Settings.Background,
    }))
});

QB.Phone.Functions.LoadMetaData = function(MetaData) {
    if (MetaData.background !== null && MetaData.background !== undefined && MetaData.background !== "default") {
        QB.Phone.Settings.Background = MetaData.background;
    } else {
        QB.Phone.Settings.Background = "zphone-1";
    }

    var hasCustomBackground = QB.Phone.Functions.IsBackgroundCustom();

    if (!hasCustomBackground) {
        $(".phone-background").css({"background-image":"url('./img/backgrounds/"+QB.Phone.Settings.Background+".png')"})
    } else {
        $(".phone-background").css({"background-image":"url('"+QB.Phone.Settings.Background+"')"});
    }

    if (!MetaData.profilepicture || MetaData.profilepicture == "default") {
        $("[data-settingstab='profilepicture']").find('.settings-tab-icon').html('<div style="width: 100%; height: 100%; border-radius: 50%; background: linear-gradient(135deg, #3a7bd5, #3a6073); display: flex; align-items: center; justify-content: center; color: white;"><i class="fa-solid fa-user" style="font-size: 1.5vh;"></i></div>');
        $(".settings-profile-img").hide();
        $(".settings-profile-avatar-placeholder").css("display", "flex");
    } else {
        $("[data-settingstab='profilepicture']").find('.settings-tab-icon').html('<img src="'+MetaData.profilepicture+'">');
        $(".settings-profile-img").attr("src", MetaData.profilepicture).show();
        $(".settings-profile-avatar-placeholder").hide();
    }

    // Restore saved Sound & Vibration settings from phone metadata
    if (MetaData.soundSettings) {
        var ss = MetaData.soundSettings;
        QB.Phone.Settings.Volume  = (ss.volume  != null) ? Number(ss.volume)  : 100;
        QB.Phone.Settings.Muted   = !!ss.muted;
        QB.Phone.Settings.Vibrate = !!ss.vibrate;
        // Apply to UI without flashing the volume HUD
        updateVolumeUI(true);
        $('#toggle-mute').prop('checked',    QB.Phone.Settings.Muted);
        $('#toggle-vibrate').prop('checked', QB.Phone.Settings.Vibrate);
    }

    // Restore saved Scale settings from phone metadata
    if (MetaData.scale !== undefined && MetaData.scale !== null) {
        QB.Phone.Settings.Scale = Number(MetaData.scale);
    } else {
        QB.Phone.Settings.Scale = 100;
    }
    updateDisplayScaleUI(true);
}

$(document).on('click', '#cancel-background', function(e){
    e.preventDefault();
    $(".settings-"+QB.Phone.Settings.OpenedTab+"-tab").animate({"left":"100%"}, 300, function(){
        $(this).css("display", "none");
    });
});

$(document).on('click', '#cancel-info', function(e){
    e.preventDefault();
    $(".settings-"+QB.Phone.Settings.OpenedTab+"-tab").animate({"left":"100%"}, 300, function(){
        $(this).css("display", "none");
    });
});

QB.Phone.Functions.IsBackgroundCustom = function() {
    var retval = true;
    $.each(QB.Phone.Settings.Backgrounds, function(i, background){
        if (QB.Phone.Settings.Background == i) {
            retval = false;
        }
    });
    return retval
}

$(document).on('click', '.background-option', function(e){
    e.preventDefault();
    PressedBackground = $(this).data('background');
    PressedBackgroundObject = this;
    OldBackground = $(this).parent().find('.background-option-current');
    IsChecked = $(this).find('.background-option-current');

    if (PressedBackground == "custom-background") {
        $(".background-custom").css("display", "flex").hide().fadeIn(250);
    } else if (IsChecked.length === 0) {
        QB.Phone.Settings.Background = PressedBackground;
        $(OldBackground).fadeOut(50, function(){
            $(OldBackground).remove();
        });
        $(PressedBackgroundObject).append('<div class="background-option-current"><i class="fas fa-check-circle"></i></div>');
    }
});

$(document).on('click', '#accept-custom-background', function(e){
    e.preventDefault();

    var newVal = $(".custom-background-input").val();
    QB.Phone.Settings.Background = newVal;
    $(OldBackground).fadeOut(50, function(){
        $(OldBackground).remove();
    });
    $(PressedBackgroundObject).append('<div class="background-option-current"><i class="fas fa-check-circle"></i></div>');
    $(PressedBackgroundObject).find('.background-option-icon').html('<img src="'+newVal+'" class="phone-backgrounds">');
    $(".background-custom").fadeOut(250);
});

$(document).on('click', '#cancel-custom-background', function(e){
    e.preventDefault();

    $(".background-custom").fadeOut(250);
});

// Preview Image Handlers
$('#background-preview-image').on('load', function() {
    $(this).show();
    $('.custom-background-preview').css('display', 'flex');
}).on('error', function() {
    $(this).hide();
    $('.custom-background-preview').hide();
});

$(document).on('input', '.custom-background-input', function(e){
    var val = $(this).val();
    if (val && val.length > 0) {
        $('#background-preview-image').attr('src', val);
    } else {
        $('.custom-background-preview').hide();
    }
});

// Profile Picture

var PressedProfilePicture = null;
var PressedProfilePictureObject = null;
var OldProfilePicture = null;
var ProfilePictureIsChecked = null;

$(document).on('click', '#accept-profilepicture', function(e){
    e.preventDefault();
    var ProfilePicture = QB.Phone.Data.MetaData.profilepicture;
    if (ProfilePicture === "default") {
        QB.Phone.Notifications.Add("fas fa-paint-brush", "Settings", "Standard avatar set!")
        $(".settings-"+QB.Phone.Settings.OpenedTab+"-tab").animate({"left":"100%"}, 300, function(){
            $(this).css("display", "none");
        });
        $("[data-settingstab='profilepicture']").find('.settings-tab-icon').html('<div style="width: 100%; height: 100%; border-radius: 50%; background: linear-gradient(135deg, #3a7bd5, #3a6073); display: flex; align-items: center; justify-content: center; color: white;"><i class="fa-solid fa-user" style="font-size: 1.5vh;"></i></div>');
        $(".settings-profile-img").hide();
        $(".settings-profile-avatar-placeholder").css("display", "flex");
    } else {
        QB.Phone.Notifications.Add("fas fa-paint-brush", "Settings", "Personal avatar set!")
        $(".settings-"+QB.Phone.Settings.OpenedTab+"-tab").animate({"left":"100%"}, 300, function(){
            $(this).css("display", "none");
        });
        $("[data-settingstab='profilepicture']").find('.settings-tab-icon').html('<img src="'+ProfilePicture+'">');
        $(".settings-profile-img").attr("src", ProfilePicture).show();
        $(".settings-profile-avatar-placeholder").hide();
    }

    $.post(`https://${GetParentResourceName()}/UpdateProfilePicture`, JSON.stringify({
        profilepicture: ProfilePicture,
    }));
});

$(document).on('click', '#accept-custom-profilepicture', function(e){
    e.preventDefault();
    var newVal = $(".custom-profilepicture-input").val();
    QB.Phone.Data.MetaData.profilepicture = newVal;
    $(OldProfilePicture).fadeOut(50, function(){
        $(OldProfilePicture).remove();
    });
    $(PressedProfilePictureObject).append('<div class="profilepicture-option-current"><i class="fas fa-check-circle"></i></div>');
    $(PressedProfilePictureObject).find('.profilepicture-option-icon').html('<img src="'+newVal+'" style="width: 9vh; height: 9vh; border-radius: 50%; object-fit: cover; border: 2px solid rgba(255,255,255,0.1);">');
    $(".profilepicture-custom").fadeOut(250);
});

$(document).on('click', '.profilepicture-option', function(e){
    e.preventDefault();
    PressedProfilePicture = $(this).data('profilepicture');
    PressedProfilePictureObject = this;
    OldProfilePicture = $(this).parent().find('.profilepicture-option-current');
    ProfilePictureIsChecked = $(this).find('.profilepicture-option-current');

    if (PressedProfilePicture == "custom-profilepicture") {
        $(".profilepicture-custom").css("display", "flex").hide().fadeIn(250);
    } else if (ProfilePictureIsChecked.length === 0) {
        QB.Phone.Data.MetaData.profilepicture = PressedProfilePicture
        $(OldProfilePicture).fadeOut(50, function(){
            $(OldProfilePicture).remove();
        });
        $(PressedProfilePictureObject).append('<div class="profilepicture-option-current"><i class="fas fa-check-circle"></i></div>');
    }
});

$(document).on('click', '#cancel-profilepicture', function(e){
    e.preventDefault();
    $(".settings-"+QB.Phone.Settings.OpenedTab+"-tab").animate({"left":"100%"}, 300, function(){
        $(this).css("display", "none");
    });
});


$(document).on('click', '#cancel-custom-profilepicture', function(e){
    e.preventDefault();
    $(".profilepicture-custom").fadeOut(250);
});

// Profile Picture Preview Handlers
$('#profilepicture-preview-image').on('load', function() {
    $(this).show();
    $('.custom-profilepicture-preview').css('display', 'flex');
}).on('error', function() {
    $(this).hide();
    $('.custom-profilepicture-preview').hide();
});

$(document).on('input', '.custom-profilepicture-input', function(e){
    var val = $(this).val();
    if (val && val.length > 0) {
        $('#profilepicture-preview-image').attr('src', val);
    } else {
        $('.custom-profilepicture-preview').hide();
    }
});

// ─── Sound & Vibration ───────────────────────────────────────────────────────

QB.Phone.Settings.Volume   = 100; // 0–100
QB.Phone.Settings.Muted    = false;
QB.Phone.Settings.Vibrate  = false;

var volumeHudTimer = null;

// suppressHud: pass true to skip showing the HUD (used on initial load)
function updateVolumeUI(suppressHud) {
    var vol   = QB.Phone.Settings.Volume;
    var muted = QB.Phone.Settings.Muted;

    // In-settings bar
    $('#sound-vol-bar-fill').css('width', vol + '%');
    $('#sound-vol-value').text(muted ? 'Muted' : vol + '%');

    // Status bar icons
    if (muted) {
        $('#phone-mute-icon').show();
        $('#phone-vibrate-icon').hide();
    } else if (QB.Phone.Settings.Vibrate) {
        $('#phone-mute-icon').hide();
        $('#phone-vibrate-icon').show();
    } else {
        $('#phone-mute-icon').hide();
        $('#phone-vibrate-icon').hide();
    }

    // HUD (skip on silent load)
    var hudIcon = muted ? 'fa-volume-xmark' : (vol === 0 ? 'fa-volume-off' : (vol < 50 ? 'fa-volume-low' : 'fa-volume-high'));
    $('#volume-hud-icon').attr('class', 'fa-solid ' + hudIcon);
    $('#volume-hud-fill').css('width', muted ? '0%' : vol + '%');
    $('#volume-hud-label').text(muted ? 'Muted' : vol + '%');

    if (!suppressHud) showVolumeHud();

    // Sync current sound settings to the Lua client side
    $.post(`https://${GetParentResourceName()}/UpdatePhoneSoundSettings`, JSON.stringify({
        volume:  QB.Phone.Settings.Volume,
        muted:   QB.Phone.Settings.Muted,
        vibrate: QB.Phone.Settings.Vibrate,
    }));
}

function showVolumeHud() {
    $('#volume-hud').stop(true, true).fadeIn(150);
    clearTimeout(volumeHudTimer);
    volumeHudTimer = setTimeout(function() {
        $('#volume-hud').fadeOut(400);
    }, 1800);
}

// Settings tab navigation: Sound
$(document).on('click', '.settings-app-tab[data-settingstab="sound"]', function(e){
    e.preventDefault();
    QB.Phone.Settings.OpenedTab = 'sound';
    // Sync current state into the UI
    $('#sound-vol-bar-fill').css('width', QB.Phone.Settings.Volume + '%');
    $('#sound-vol-value').text(QB.Phone.Settings.Muted ? 'Muted' : QB.Phone.Settings.Volume + '%');
    $('#toggle-mute').prop('checked', QB.Phone.Settings.Muted);
    $('#toggle-vibrate').prop('checked', QB.Phone.Settings.Vibrate);
    $(".settings-sound-tab").css({"display":"block", "left":"100%", "top":"0"}).animate({"left":"0"}, 300);
});

$(document).on('click', '#cancel-sound', function(e){
    e.preventDefault();
    $(".settings-sound-tab").animate({"left":"100%"}, 300, function(){
        $(this).css("display", "none");
    });
});

// In-settings volume buttons
$(document).on('click', '#sound-vol-up', function(e){
    e.preventDefault();
    if (QB.Phone.Settings.Muted) return;
    QB.Phone.Settings.Volume = Math.min(100, QB.Phone.Settings.Volume + 10);
    updateVolumeUI();
});

$(document).on('click', '#sound-vol-down', function(e){
    e.preventDefault();
    if (QB.Phone.Settings.Muted) return;
    QB.Phone.Settings.Volume = Math.max(0, QB.Phone.Settings.Volume - 10);
    updateVolumeUI();
});

// Mute toggle
$(document).on('change', '#toggle-mute', function(){
    QB.Phone.Settings.Muted = $(this).is(':checked');
    if (QB.Phone.Settings.Muted && QB.Phone.Settings.Vibrate) {
        QB.Phone.Settings.Vibrate = false;
        $('#toggle-vibrate').prop('checked', false);
    }
    updateVolumeUI();
    $('#sound-vol-value').text(QB.Phone.Settings.Muted ? 'Muted' : QB.Phone.Settings.Volume + '%');
});

// Vibrate toggle
$(document).on('change', '#toggle-vibrate', function(){
    QB.Phone.Settings.Vibrate = $(this).is(':checked');
    if (QB.Phone.Settings.Vibrate && QB.Phone.Settings.Muted) {
        QB.Phone.Settings.Muted = false;
        $('#toggle-mute').prop('checked', false);
    }
    updateVolumeUI();
});

// ─── Display & Scale ───────────────────────────────────────────────────────

QB.Phone.Settings.Scale = 100; // Default 100%

function updateDisplayScaleUI(isInitialLoad) {
    var scale = QB.Phone.Settings.Scale;
    // Calculate percentage fill based on a range from 70% to 130%
    var percentage = ((scale - 70) / (130 - 70)) * 100;
    
    $('#display-scale-fill').css('width', percentage + '%');
    $('#display-scale-value').text(scale + '%');
    
    // Apply CSS zoom to dynamically resize the entire phone interface safely
    $('.container').css('zoom', scale / 100);

    if (!isInitialLoad) {
        $.post(`https://${GetParentResourceName()}/UpdatePhoneScale`, JSON.stringify({
            scale: scale
        }));
    }
}

$(document).on('click', '.settings-app-tab[data-settingstab="display"]', function(e){
    e.preventDefault();
    QB.Phone.Settings.OpenedTab = 'display';
    updateDisplayScaleUI(true); // Sync UI before showing
    $(".settings-display-tab").css({"display":"block", "left":"100%", "top":"0"}).animate({"left":"0"}, 300);
});

$(document).on('click', '#cancel-display', function(e){
    e.preventDefault();
    $(".settings-display-tab").animate({"left":"100%"}, 300, function(){
        $(this).css("display", "none");
    });
});

$(document).on('click', '#display-scale-up', function(e){
    e.preventDefault();
    QB.Phone.Settings.Scale = Math.min(130, QB.Phone.Settings.Scale + 5);
    updateDisplayScaleUI(false);
});

$(document).on('click', '#display-scale-down', function(e){
    e.preventDefault();
    QB.Phone.Settings.Scale = Math.max(70, QB.Phone.Settings.Scale - 5);
    updateDisplayScaleUI(false);
});

$(document).on('click', '#display-scale-reset', function(e){
    e.preventDefault();
    QB.Phone.Settings.Scale = 100;
    updateDisplayScaleUI(false);
});

// Physical volume buttons on the left side of the phone frame
$(document).on('click', '#phone-volume-up', function(e){
    e.preventDefault();
    if (QB.Phone.Settings.Muted) {
        QB.Phone.Settings.Muted = false;
        $('#toggle-mute').prop('checked', false);
    }
    QB.Phone.Settings.Volume = Math.min(100, QB.Phone.Settings.Volume + 10);
    updateVolumeUI();
});

$(document).on('click', '#phone-volume-down', function(e){
    e.preventDefault();
    if (QB.Phone.Settings.Muted) {
        QB.Phone.Settings.Volume = Math.max(0, QB.Phone.Settings.Volume - 10);
        updateVolumeUI();
        return;
    }
    QB.Phone.Settings.Volume = Math.max(0, QB.Phone.Settings.Volume - 10);
    if (QB.Phone.Settings.Volume === 0) {
        QB.Phone.Settings.Muted = true;
        $('#toggle-mute').prop('checked', true);
    }
    updateVolumeUI();
});
