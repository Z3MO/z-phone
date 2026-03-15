QB = {}
QB.Phone = {}
QB.Screen = {}
QB.Phone.Functions = {}
QB.Phone.Animations = {}
QB.Phone.Notifications = {}
QB.Phone.Notifications.Custom = {}

// Samsung One UI Easing Functions
QB.Phone.Animations.SamsungEasing = {
    // Smooth entrance with slight overshoot
    entrance: function(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    },
    // Smooth exit with gentle deceleration
    exit: function(t) {
        return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
    },
    // Bounce effect for premium feel
    bounce: function(t) {
        if (t < 1 / 2.75) {
            return 7.5625 * t * t;
        } else if (t < 2 / 2.75) {
            return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
        } else if (t < 2.5 / 2.75) {
            return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
        } else {
            return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
        }
    }
};

QB.Phone.ContactColors = {
    0: "#9b59b6",
    1: "#3498db",
    2: "#e67e22",
    3: "#e74c3c",
    4: "#1abc9c",
    5: "#9c88ff",
}

QB.Phone.Data = {
    currentApplication: null,
    PlayerData: {},
    Applications: {},
    IsOpen: false,
    CallActive: false,
    MetaData: {},
    PlayerJob: {},
    AnonymousCall: false,
    currentPage: 0,
    totalPages: 0,
}

QB.Phone.Data.MaxSlots = 16;

OpenedChatData = {
    number: null,
}

var CanOpenApp = true;
var up = false
var isClickBlocked = false; // Flag to prevent clicks after dragging


function IsAppJobBlocked(joblist, myjob) {
    var retval = false;
    if (joblist.length > 0) {
        $.each(joblist, function(i, job){
            if (job == myjob && QB.Phone.Data.PlayerData.job.onduty) {
                retval = true;
            }
        });
    }
    return retval;
}

function buildApplicationIcon(app) {
    var iconName = String((app && app.icon) || '');
    var customStyle = app && app.style ? `style="${app.style}"` : '';

    if (iconName.startsWith('fa')) {
        return `<i class="ApplicationIcon ${iconName}" ${customStyle}></i>`;
    }

    var hasExtension = iconName.includes('.');
    var baseName = hasExtension ? iconName.replace(/\.[^/.]+$/, '') : iconName;
    var primaryPath = hasExtension ? `./img/apps/${iconName}` : `./img/apps/${iconName}.png`;
    var fallbackPath = hasExtension
        ? (iconName.endsWith('.png') ? `./img/apps/${baseName}.svg` : `./img/apps/${baseName}.png`)
        : `./img/apps/${iconName}.svg`;

    return `<img class="ApplicationIcon" src="${primaryPath}" data-fallback-src="${fallbackPath}" onerror="if(this.dataset.fallbackSrc&&this.src!==this.dataset.fallbackSrc){this.src=this.dataset.fallbackSrc;}else{this.onerror=null;this.style.opacity='0.35';}" ${customStyle}>`;
}

QB.Phone.Functions.SetupApplications = function(data) {
    QB.Phone.Data.Applications = data.applications;

    // Clear existing applications
    $(".phone-page-container").html("");
    $(".page-indicators").html("");
    
    // Clear dock apps
    for (let i = 1; i <= 4; i++) {
        var dockSlot = $(".phone-footer-applications").find('[data-appslot="'+i+'"]');
        $(dockSlot).html("");
        $(dockSlot).css({"background-color":"transparent"});
        $(dockSlot).prop('title', "");
        $(dockSlot).removeData('app');
        $(dockSlot).removeData('placement');
    }

    // Separate dock apps (slots 1-4) from page apps (slots 5+)
    var dockApps = [];
    var pageApps = [];
    
    $.each(data.applications, function(i, app){
        var blockedapp = IsAppJobBlocked(app.blockedjobs, QB.Phone.Data.PlayerJob.name);
        
        if ((!app.job || app.job === QB.Phone.Data.PlayerJob.name) && !blockedapp) {
            if (app.slot <= 4) {
                dockApps.push(app);
            } else {
                pageApps.push(app);
            }
        }
    });

    // Sort apps by slot to ensure consistent order
    dockApps.sort((a, b) => a.slot - b.slot);
    pageApps.sort((a, b) => a.slot - b.slot);

    // Setup dock apps (for non-home pages)
    $.each(dockApps, function(i, app){
        var applicationSlot = $(".phone-footer-applications").find('[data-appslot="'+app.slot+'"]');
        var icon = buildApplicationIcon(app);
        $(applicationSlot).html(icon + '<div class="app-unread-alerts">0</div>');
        $(applicationSlot).data('app', app.app);
        $(applicationSlot).attr('data-app', app.app); // Also set attribute for consistency
    });

    // Create first page with widgets and only 4 main apps
    var firstPageElement = QB.Phone.Functions.CreateHomePage(pageApps.slice(0, 4), dockApps);
    $(".phone-page-container").append(firstPageElement);

    // Create additional pages with 12 apps each (4x3 grid)
    // Include remaining pageApps AND dockApps in subsequent pages
    var appsPerPage = 12;
    var remainingPageApps = pageApps.slice(4); // Start from app 5 onwards
    var allRemainingApps = [...remainingPageApps, ...dockApps]; // Combine remaining page apps with dock apps
    var additionalPages = Math.ceil(allRemainingApps.length / appsPerPage);
    
    for (let page = 0; page < additionalPages; page++) {
        var pageElement = $('<div class="phone-page"></div>');
        
        for (let i = 0; i < appsPerPage; i++) {
            var appIndex = page * appsPerPage + i;
            if (appIndex < allRemainingApps.length) {
                var app = allRemainingApps[appIndex];
                var iconElement = buildApplicationIcon(app);
                    
                var appElement = $(`
                    <div class="phone-application" data-appslot="${app.slot}" data-app="${app.app}">
                        ${iconElement}
                        <p class="application-description">${app.tooltipText}</p>
                        <div class="app-unread-alerts">0</div>
                    </div>
                `);
                
                pageElement.append(appElement);
            } else {
                // Add empty slot to maintain grid
                pageElement.append('<div class="phone-application empty-slot"></div>');
            }
        }
        
        $(".phone-page-container").append(pageElement);
    }

    // Setup page indicators (only show if there are multiple pages)
    var totalPages = 1 + additionalPages;
    if (totalPages > 1) {
        for (let i = 0; i < totalPages; i++) {
            var dotClass = i === 0 ? 'page-dot active' : 'page-dot';
            $(".page-indicators").append(`<div class="${dotClass}" data-page="${i}"></div>`);
        }
        $(".page-indicators").show();
    } else {
        $(".page-indicators").hide();
    }

    // Initialize page navigation
    QB.Phone.Data.currentPage = 0;
    QB.Phone.Data.totalPages = totalPages;

    // Initialize dock visibility for home page
    QB.Phone.Functions.NavigateToPage(0);

    // Update widgets with real-time data
    QB.Phone.Functions.UpdateWidgets();

    $('[data-toggle="tooltip"]').tooltip();
}

QB.Phone.Functions.CreateHomePage = function(apps, dockApps) {
    var now = new Date();
    var timeString = now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    var dateString = now.toLocaleDateString([], {weekday: 'short', month: 'short', day: 'numeric'});
    
    var homePageElement = $(`
        <div class="phone-page home-page">
            <!-- Widgets Section (50%) -->
            <div class="home-widgets-section">
                <!-- Time Widget -->
                <div class="phone-widget widget-time">
                    <div class="widget-header">
                        <i class="fas fa-clock"></i>
                        <span>Local Time</span>
                    </div>
                    <div class="time-display">${timeString}</div>
                    <div class="date-display">${dateString}</div>
                </div>
                
                <!-- Weather Widget -->
                <div class="phone-widget widget-weather">
                    <div class="weather-icon"><i class="fas fa-cloud-sun"></i></div>
                    <div class="weather-info">
                        <div class="weather-temp">22°</div>
                        <div class="weather-desc">Sunny</div>
                    </div>
                </div>
                
                <!-- Stats Widget -->
                <div class="phone-widget widget-stats">
                    <div class="stats-icon"><i class="fas fa-wallet"></i></div>
                    <div class="stats-content">
                        <div class="stats-label">Balance</div>
                        <div class="stats-value">$${QB.Phone.Data.PlayerData.money ? QB.Phone.Data.PlayerData.money.bank || 0 : 0}</div>
                    </div>
                </div>
            </div>
            
            <!-- Apps Section (25%) -->
            <div class="home-apps-section">
                <!-- Main apps will be added here -->
            </div>
            
            <!-- Quick Access Section (25%) -->
            <div class="home-quick-section">
                <!-- Quick access apps will be added here -->
            </div>
        </div>
    `);
    
    // Add main apps to the apps section (first 4 apps)
    for (let i = 0; i < Math.min(4, apps.length); i++) {
        var app = apps[i];
        var iconElement = buildApplicationIcon(app);
            
        var appElement = $(`
            <div class="phone-application" data-appslot="${app.slot}" data-app="${app.app}">
                ${iconElement}
                <p class="application-description">${app.tooltipText}</p>
                <div class="app-unread-alerts">0</div>
            </div>
        `);
        
        homePageElement.find('.home-apps-section').append(appElement);
    }
    
    // Add quick access apps to the quick section (dock apps)
    // Note: Leave this section empty since dock apps appear in the dock area
    // The quick access section will remain empty to maintain the 4-app limit on home page
    
    return homePageElement;
}

QB.Phone.Functions.UpdateWidgets = function() {
    // Update time widget every minute
    setInterval(function() {
        var now = new Date();
        var timeString = now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        var dateString = now.toLocaleDateString([], {weekday: 'short', month: 'short', day: 'numeric'});
        
        $(".widget-time .time-display").text(timeString);
        $(".widget-time .date-display").text(dateString);
    }, 60000);
    
    // Update bank balance if player data is available
    if (QB.Phone.Data.PlayerData.money) {
        $(".widget-stats .stats-value").text(`$${QB.Phone.Data.PlayerData.money.bank || 0}`);
    }
}

QB.Phone.Functions.SetupAppWarnings = function(AppData) {
    $.each(AppData, function(i, app){
        // Check dock apps first (slots 1-4)
        var AppObject = $(".phone-footer-applications").find("[data-appslot='"+app.slot+"']").find('.app-unread-alerts');
        
        // If not found in dock, check page apps
        if (AppObject.length === 0) {
            AppObject = $(".phone-page").find("[data-appslot='"+app.slot+"']").find('.app-unread-alerts');
        }

        if (app.Alerts > 0) {
            $(AppObject).html(app.Alerts);
            $(AppObject).css({"display":"block"});
        } else {
            $(AppObject).css({"display":"none"});
        }
    });
}

QB.Phone.Functions.IsAppHeaderAllowed = function(app) {
    var retval = false;
    $.each(Config.HeaderDisabledApps, function(i, blocked){
        if (app == blocked) {
            retval = true;
        }
    });
    return retval;
}

$(document).on('click', '.phone-application', function(e){
    e.preventDefault();
    if (isClickBlocked) return; // Prevent click if we just dragged

    var PressedApplication = $(this).data('app');
    var AppObject = $("."+PressedApplication+"-app");

    if (AppObject.length !== 0) {
        if (CanOpenApp) {
            if (QB.Phone.Data.currentApplication == null) {
                QB.Phone.Functions.ToggleApp(PressedApplication, "block");
                QB.Phone.Animations.TopSlideDown('.phone-application-container', 300, 0);

                if (QB.Phone.Functions.IsAppHeaderAllowed(PressedApplication)) {
                    QB.Phone.Functions.HeaderTextColor('transparent', 300);
                }

                QB.Phone.Data.currentApplication = PressedApplication;

                if (PressedApplication == "pulses") {
                    CurrentPulsesView = "feed";
                    CurrentPulsesTab = "recent";
                    if (QB.Phone.Data.IsOpen) {
                        $.post(`https://${GetParentResourceName()}/GetPulses`, JSON.stringify({}), function(Pulses){
                            QB.Phone.Notifications.LoadPulses(Pulses.PulseData, Pulses.hasVPN);
                        });
                    }
                } else if (PressedApplication == "settings") {
                    // Update Settings Profile Card
                    var charInfo = QB.Phone.Data.PlayerData.charinfo;
                    var metaData = QB.Phone.Data.MetaData || {};
                    $(".settings-profile-name").text(charInfo.firstname + " " + charInfo.lastname);
                    $(".settings-profile-number").text(charInfo.phone);
                    
                    if (metaData.profilepicture && metaData.profilepicture !== "default") {
                        $(".settings-profile-img").attr("src", metaData.profilepicture).show();
                        $(".settings-profile-avatar-placeholder").hide();
                    } else {
                        $(".settings-profile-img").hide();
                        $(".settings-profile-avatar-placeholder").css("display", "flex");
                    }
                    
                    LoadPlayerMoneys();
                } else if (PressedApplication == "bank") {
                    QB.Phone.Functions.DoBankOpen();
                } else if (PressedApplication == "whatsapp") {
                    $.post(`https://${GetParentResourceName()}/GetWhatsappChats`, JSON.stringify({}), function(chats){
                        QB.Phone.Functions.LoadWhatsappChats(chats);
                    });
                } else if (PressedApplication == "phone") {
                    $.post(`https://${GetParentResourceName()}/GetMissedCalls`, JSON.stringify({}), function(recent){
                        QB.Phone.Functions.SetupRecentCalls(recent);
                    });
                    $.post(`https://${GetParentResourceName()}/GetSuggestedContacts`, JSON.stringify({}), function(suggested){
                        QB.Phone.Functions.SetupSuggestedContacts(suggested);
                    });//New line add//
                    $.post(`https://${GetParentResourceName()}/ClearGeneralAlerts`, JSON.stringify({
                        app: "phone"
                    }));
                } else if (PressedApplication == "mail") {
                    $.post(`https://${GetParentResourceName()}/GetMails`, JSON.stringify({}), function(mails){
                        QB.Phone.Functions.SetupMails(mails);
                    });
                    $.post(`https://${GetParentResourceName()}/ClearGeneralAlerts`, JSON.stringify({
                        app: "mail"
                    }));
                } else if (PressedApplication == "proxi") {
                    $.post(`https://${GetParentResourceName()}/LoadProxis`, JSON.stringify({}), function(Proxis){
                        QB.Phone.Functions.RefreshProxis(Proxis);
                    })
                } else if (PressedApplication == "garage") {
                    $.post(`https://${GetParentResourceName()}/SetupGarageVehicles`, JSON.stringify({}), function(Vehicles){
                        SetupGarageVehicles(Vehicles);
                    })
                } else if (PressedApplication == "houses") {
                    $.post(`https://${GetParentResourceName()}/GetPlayerHouses`, JSON.stringify({}), function(Houses){
                        SetupPlayerHouses(Houses);
                    });
                    $.post(`https://${GetParentResourceName()}/GetPlayerKey`, JSON.stringify({}), function(Keys){
                        $(".house-app-mykeys-container").html("");
                        if (Keys.length > 0) {
                            $.each(Keys, function(i, key){
                                var elem = '<div class="mykeys-key" id="keyid-'+i+'"><span class="mykeys-key-label">' + key.HouseData.adress + '</span> <span class="mykeys-key-sub">Click to set GPS</span> </div>';
                                $(".house-app-mykeys-container").append(elem);
                                $("#keyid-"+i).data('KeyData', key);
                            });
                        }
                    });
                } else if (PressedApplication == "taxi") {
                    $.post(`https://${GetParentResourceName()}/GetAvailableTaxiDrivers`, JSON.stringify({}), function(data){
                        SetupTaxiDrivers(data);
                    });
                } else if (PressedApplication == "store") {
                    $.post(`https://${GetParentResourceName()}/SetupStoreApps`, JSON.stringify({}), function(data){
                        SetupAppstore(data);
                    });
                }

                else if (PressedApplication == "gallery") {
                    $.post(`https://${GetParentResourceName()}/GetGalleryData`, JSON.stringify({}), function(data){
                        setUpGalleryData(data);
                    });
                }
                else if (PressedApplication == "camera") {
                    $.post(`https://${GetParentResourceName()}/TakePhoto`, JSON.stringify({}),function(url){
                        setUpCameraApp(url)
                    })
                    QB.Phone.Functions.Close();
                }
                else if (PressedApplication == "jobcenter" || PressedApplication == "party") {
                    LoadJobCenterApp();
                }
                else if (PressedApplication == "crypto") {
                    LoadCryptoCoins();
                } else if (PressedApplication == "documents") {
                    LoadGetNotes();
                }
                else if (PressedApplication == "lsbn") {
                    LoadLSBNEvent();
                } else if (PressedApplication == "contacts") {
                    $("#phone-contact-search").show();
                    $.post(`https://${GetParentResourceName()}/ClearGeneralAlerts`, JSON.stringify({
                        app: "contacts"
                    }));
                } else if(PressedApplication == "group-chats") {
                    $.post(`https://${GetParentResourceName()}/GetChatRooms`, JSON.stringify({}), function(ChatRooms){
                        QB.Phone.Functions.LoadChatRooms(ChatRooms)
                    })
                }
            }
        }
    } else {
        if (PressedApplication != null){
            QB.Phone.Notifications.Add("fas fa-exclamation-circle", "System", QB.Phone.Data.Applications[PressedApplication].tooltipText+" is not available!")
        }
    }
});

$(document).on('click', '#phone-side-button-power', function(e){
    e.preventDefault();
    QB.Phone.Functions.Close();
});

$(document).on('click', '.mykeys-key', function(e){
    e.preventDefault();

    var KeyData = $(this).data('KeyData');

    $.post(`https://${GetParentResourceName()}/SetHouseLocation`, JSON.stringify({
        HouseData: KeyData
    }))
});

$(document).on('click', '.phone-take-camera-button', function(event){
    event.preventDefault();
    $.post(`https://${GetParentResourceName()}/TakePhoto`, JSON.stringify({}),function(url){
        // setUpCameraApp(url)
    })
    QB.Phone.Functions.Close();
});

$(document).on('click', '.phone-silent-button', function(event){
    event.preventDefault();
    $.post(`https://${GetParentResourceName()}/phone-silent-button`, JSON.stringify({}),function(Data){
        if(Data){
            $(".silent-mode-two").css({"display":"block"});
            $(".silent-mode-one").css({"display":"none"});
        }else{
            $(".silent-mode-two").css({"display":"none"});
            $(".silent-mode-one").css({"display":"block"});
        }
    })
});

$(document).on('click', '.phone-tab-button', function(event){
    event.preventDefault();

    if (QB.Phone.Data.currentApplication === null) {
        QB.Phone.Functions.Close();
    }
});

QB.Phone.Functions.Open = function(data) {
    QB.Phone.Animations.BottomSlideUp('.container', 800, 0);
    QB.Phone.Animations.BottomSlideUp('.container', 500, 0);
    QB.Phone.Data.IsOpen = true;
}

QB.Phone.Functions.ToggleApp = function(app, show) {
    $("."+app+"-app").css({"display":show});
}

QB.Phone.Functions.Close = function() {
    if (QB.Phone.Data.currentApplication == "whatsapp") {
        setTimeout(function(){
            QB.Phone.Animations.TopSlideUp('.phone-application-container', 300, -100, function() {
                $(".whatsapp-app").css({"display":"none"});
            });

            if (OpenedChatData.number !== null) {
                setTimeout(function(){
                    $(".whatsapp-chats").css({"display":"block"});
                    $(".whatsapp-chats").animate({
                        left: 0+"vh"
                    }, 1);
                    $(".whatsapp-openedchat").animate({
                        left: -30+"vh"
                    }, 1, function(){
                        $(".whatsapp-openedchat").css({"display":"none"});
                    });
                    OpenedChatData.number = null;
                }, 450);
            }
            OpenedChatPicture = null;
            QB.Phone.Data.currentApplication = null;
        }, 500)
    }
    $('.publicphonebase').css('display', 'none')
    QB.Phone.Animations.BottomSlideDown('.container', 800, -100);
    QB.Phone.Animations.BottomSlideDown('.container', 500, -100);
    $.post(`https://${GetParentResourceName()}/Close`);
    QB.Phone.Data.IsOpen = false;
}

QB.Phone.Functions.CloseApplication = function() {
    if (QB.Phone.Data.currentApplication === null) return;

    CanOpenApp = false;
    
    var AppToClose = QB.Phone.Data.currentApplication;

    QB.Phone.Animations.TopSlideUp('.phone-application-container', 300, -100, function() {
        QB.Phone.Functions.ToggleApp(AppToClose, "none");
    });
    
    setTimeout(function(){
        CanOpenApp = true;
    }, 450);
    
    QB.Phone.Functions.HeaderTextColor("white", 300);

    if (QB.Phone.Data.currentApplication == "whatsapp") {
        if (OpenedChatData.number !== null) {
            setTimeout(function(){
                $(".whatsapp-chats").css({"display":"block"});
                $(".whatsapp-chats").animate({
                    left: 0+"vh"
                }, 1);
                $(".whatsapp-openedchat").animate({
                    left: -30+"vh"
                }, 1, function(){
                    $(".whatsapp-openedchat").css({"display":"none"});
                });
                OpenedChatPicture = null;
                OpenedChatData.number = null;
            }, 450);
        }
    } else if (QB.Phone.Data.currentApplication == "bank") {
        if (QB.Phone.Functions.ResetBankAppView) {
            QB.Phone.Functions.ResetBankAppView();
        }
    }

    QB.Phone.Data.currentApplication = null;
}

QB.Phone.Functions.HeaderTextColor = function(newColor, Timeout) {
    $(".phone-header").animate({color: newColor}, Timeout);
}

QB.Phone.Animations.BottomSlideUp = function(Object, Timeout, Percentage) {
    var $el = $(Object);
    // Clear any pending hide timer from a previous close action
    if ($el.data('slideTimeout')) {
        clearTimeout($el.data('slideTimeout'));
        $el.removeData('slideTimeout');
    }

    $el.css({
        'display': 'block',
        'bottom': Percentage + "%",
        'transform': 'translateY(100%)',
        'opacity': '0',
        'filter': 'none',
        'transition': 'none' // Disable transition to set initial state
    });
    
    // Force reflow to apply initial state
    $el[0].offsetHeight;

    // Start the smooth CSS transition
    $el.css({
        'transition': `transform ${Timeout}ms cubic-bezier(0.165, 0.84, 0.44, 1), opacity ${Timeout}ms cubic-bezier(0.165, 0.84, 0.44, 1)`,
        'transform': 'translateY(0%)',
        'opacity': '1'
    });
}

QB.Phone.Animations.BottomSlideDown = function(Object, Timeout, Percentage) {
    var $el = $(Object);
    
    $el.css({
        'transition': `transform ${Timeout}ms cubic-bezier(0.895, 0.03, 0.685, 0.22), opacity ${Timeout}ms cubic-bezier(0.895, 0.03, 0.685, 0.22)`,
        'transform': 'translateY(100%)',
        'opacity': '0'
    });

    // Wait for animation to finish before hiding
    var timeoutId = setTimeout(function(){
        $el.css({'display':'none'});
    }, Timeout);
    
    $el.data('slideTimeout', timeoutId);
}

QB.Phone.Animations.TopSlideDown = function(Object, Timeout, Percentage) {
    if (Object === '.phone-application-container') {
        // App Open Animation (Slide up from bottom)
        var $el = $(Object);
        $el.css({
            'display': 'block',
            'top': '0',
            'transform': 'translateY(100%) scale(0.9)',
            'opacity': '0',
            'filter': 'none',
            'transition': 'none'
        });
        
        $el[0].offsetHeight; // Reflow
        
        $el.css({
            'transition': `all ${Timeout}ms cubic-bezier(0.165, 0.84, 0.44, 1)`,
            'transform': 'translateY(0) scale(1)',
            'opacity': '1'
        });
    } else {
        // Notification Animation (Slide down from top)
        var $el = $(Object);
        $el.css({
            'display': 'block',
            'top': '-15%',
            'transform': 'none',
            'opacity': '0',
            'transition': 'none'
        });
        
        $el[0].offsetHeight;
        
        $el.css({
            'transition': `all ${Timeout}ms cubic-bezier(0.165, 0.84, 0.44, 1)`,
            'top': Percentage + "%",
            'opacity': '1'
        });
    }
}

QB.Phone.Animations.TopSlideUp = function(Object, Timeout, Percentage, cb) {
    if (Object === '.phone-application-container') {
        // App Close Animation (Scale down)
        var $el = $(Object);
        $el.css({
            'transition': `all ${Timeout}ms cubic-bezier(0.165, 0.84, 0.44, 1)`,
            'transform': 'scale(0.8)',
            'opacity': '0',
            'border-radius': '30px'
        });
        
        setTimeout(function() {
            $el.css({'display': 'none', 'border-radius': '0px'});
            if (cb) cb();
        }, Timeout);
    } else {
        // Notification Close (Slide up)
        var $el = $(Object);
        $el.css({
            'transition': `all ${Timeout}ms cubic-bezier(0.165, 0.84, 0.44, 1)`,
            'top': Percentage + "%",
            'opacity': '0'
        });
        
        setTimeout(function() {
            $el.css('display', 'none');
            if (cb) cb();
        }, Timeout);
    }
}

// Samsung One UI specific animations for app transitions
QB.Phone.Animations.SamsungAppOpen = function(Object, Timeout) {
    // Enhanced opening animation with perspective and rotation
    $(Object).css({
        'display': 'block',
        'transform': 'scale(0.85) translateY(-30px) rotateX(8deg)',
        'opacity': '0.6',
        'filter': 'blur(2px)',
        'transform-origin': 'center bottom'
    });
    
    // Force reflow
    $(Object)[0].offsetHeight;
    
    $(Object).animate({
        opacity: 1
    }, {
        duration: Timeout,
        easing: 'swing',
        step: function(now, fx) {
            var progress = now; // Progress from 0.6 to 1
            var normalizedProgress = (progress - 0.6) / 0.4; // Normalize to 0-1
            
            // Apply Samsung entrance easing
            var easedProgress = QB.Phone.Animations.SamsungEasing.entrance(normalizedProgress);
            
            var scale = 0.85 + (easedProgress * 0.15); // Scale from 0.85 to 1.0
            var translateY = -30 + (easedProgress * 30); // Translate from -30px to 0
            var rotateX = 8 - (easedProgress * 8); // Rotate from 8deg to 0deg
            var blur = 2 - (easedProgress * 2); // Blur from 2px to 0px
            
            // Add bounce effect in the final 30%
            if (normalizedProgress > 0.7) {
                var bounceProgress = (normalizedProgress - 0.7) / 0.3;
                var bounceEffect = QB.Phone.Animations.SamsungEasing.bounce(bounceProgress);
                scale = 0.98 + (bounceEffect * 0.02);
                translateY = translateY + (bounceEffect * -2);
            }
            
            $(this).css({
                'transform': `scale(${scale}) translateY(${translateY}px) rotateX(${rotateX}deg)`,
                'filter': `blur(${blur}px)`
            });
        },
        complete: function() {
            $(this).css({
                'transform': 'scale(1) translateY(0) rotateX(0deg)',
                'opacity': '1',
                'filter': 'blur(0px)'
            });
        }
    });
}

QB.Phone.Animations.SamsungAppClose = function(Object, Timeout, callback) {
    // Enhanced closing animation with perspective and rotation
    $(Object).animate({
        opacity: 0.6
    }, {
        duration: Timeout,
        easing: 'swing',
        step: function(now, fx) {
            var progress = 1 - now; // Progress from 0 to 0.4 (reverse)
            var normalizedProgress = progress / 0.4; // Normalize to 0-1
            
            // Apply Samsung exit easing
            var easedProgress = QB.Phone.Animations.SamsungEasing.exit(normalizedProgress);
            
            var scale = 1 - (easedProgress * 0.15); // Scale from 1.0 to 0.85
            var translateY = easedProgress * -30; // Translate from 0 to -30px
            var rotateX = easedProgress * 8; // Rotate from 0deg to 8deg
            var blur = easedProgress * 2; // Blur from 0px to 2px
            
            $(this).css({
                'transform': `scale(${scale}) translateY(${translateY}px) rotateX(${rotateX}deg)`,
                'filter': `blur(${blur}px)`
            });
        },
        complete: function() {
            $(this).css({
                'display': 'none',
                'transform': 'scale(1) translateY(0) rotateX(0deg)',
                'opacity': '1',
                'filter': 'blur(0px)'
            });
            if (callback && typeof callback === 'function') {
                callback();
            }
        }
    });
}

QB.Phone.Notifications.Custom.Add = function(icon, title, text, color, timeout, accept, deny) {
    $.post(`https://${GetParentResourceName()}/HasPhone`, JSON.stringify({}), function(HasPhone){
        if (HasPhone) {
            if (timeout == null && timeout == undefined) {
                timeout = 1500;
            }
            if (color != null || color != undefined) {
                $(".notification-icon-new").css({"color":color});
                $(".notification-title-new").css({"color":"#FFFFFF"});

                $(".notification-accept").css({"color":"#a6f1a6"});
                $(".notification-deny").css({"color":"#F28C28"});

            } else if (color == "default" || color == null || color == undefined) {
                $(".notification-icon-new").css({"color":"#FFFFFF"});
                $(".notification-title-new").css({"color":"#FFFFFF"});

                if (accept != "NONE"){ // ACCEPT COLOR
                    $(".notification-accept").css({"color":"#a6f1a6"});
                }
                if (deny != "NONE"){ // DENY COLOR
                    $(".notification-deny").css({"color":"#F28C28"});
                }

            }
            if (!QB.Phone.Data.IsOpen == true) {
                QB.Phone.Animations.BottomSlideUp('.container', 250, -50);
            }

            QB.Phone.Animations.TopSlideDown(".phone-notification-container-new", 400, 7);

            $(".notification-icon-new").html('<i class="'+icon+'"></i>');
            $(".notification-title-new").html(title);
            $(".notification-text-new").html(text);

            if (accept != "NONE"){ // ACCEPT SYMBOL
                $(".notification-accept").html('<i class="'+accept+'"></i>');
            }
            if (deny != "NONE"){ // DENY SYMBOL
                $(".notification-deny").html('<i class="'+deny+'"></i>');
            }

            if (timeout != "NONE"){
                if (QB.Phone.Notifications.Timeout !== undefined || QB.Phone.Notifications.Timeout !== null) {
                    clearTimeout(QB.Phone.Notifications.Timeout);
                }
                QB.Phone.Notifications.Timeout = setTimeout(function(){
                    QB.Phone.Animations.TopSlideUp(".phone-notification-container-new", 400, -10);
                    QB.Phone.Notifications.Timeout = setTimeout(function(){
                        if (!QB.Phone.Data.IsOpen == true) {
                        QB.Phone.Animations.BottomSlideUp('.container', 250, -70);
                        }
                    }, 500)
                    QB.Phone.Notifications.Timeout = null;
                }, timeout);
            }
        }
    });
}

QB.Phone.Notifications.Add = function(icon, title, text, color, timeout) {
    $.post(`https://${GetParentResourceName()}/HasPhone`, JSON.stringify({}), function(HasPhone){
        if (HasPhone) {
            if (timeout == null && timeout == undefined) {
                timeout = 1500;
            }
            if (QB.Phone.Notifications.Timeout == undefined || QB.Phone.Notifications.Timeout == null) {
                if (color != null || color != undefined) {
                    $(".notification-icon").css({"color":color});
                    $(".notification-title").css({"color":color});
                } else if (color == "default" || color == null || color == undefined) {
                    $(".notification-icon").css({"color":"#e74c3c"});
                    $(".notification-title").css({"color":"#e74c3c"});
                }
                if (!QB.Phone.Data.IsOpen == true) {
                    QB.Phone.Animations.BottomSlideUp('.container', 250, -50);
                }
                    QB.Phone.Animations.TopSlideDown(".phone-notification-container", 400, 7);
                if (icon !== "politie") {
                    if (icon.includes('.')) {
                        $(".notification-icon").html('<img src="./img/apps/'+icon+'" style="width: 2.5vh; height: 2.5vh;">');
                    } else {
                        $(".notification-icon").html('<i class="'+icon+'"></i>');
                    }
                } else {
                    $(".notification-icon").html('<img src="./img/politie.png" class="police-icon-notify">');
                }
                $(".notification-title").html(title);
                $(".notification-text").html(text);
                if (QB.Phone.Notifications.Timeout !== undefined || QB.Phone.Notifications.Timeout !== null) {
                    clearTimeout(QB.Phone.Notifications.Timeout);
                }
                QB.Phone.Notifications.Timeout = setTimeout(function(){
                    QB.Phone.Animations.TopSlideUp(".phone-notification-container", 400, -10);

                    QB.Phone.Notifications.Timeout = setTimeout(function(){
                    if (!QB.Phone.Data.IsOpen == true) {
                    QB.Phone.Animations.BottomSlideDown('.container', 250, -70);
                    }
                }, 500)
                    QB.Phone.Notifications.Timeout = null;
                }, timeout);
            } else {
                if (color != null || color != undefined) {
                    $(".notification-icon").css({"color":color});
                    $(".notification-title").css({"color":color});
                } else {
                    $(".notification-icon").css({"color":"#e74c3c"});
                    $(".notification-title").css({"color":"#e74c3c"});
                }
                if (!QB.Phone.Data.IsOpen) {
                    QB.Phone.Animations.BottomSlideUp('.container', 250, -45);
                }
                if (icon.includes('.')) {
                    $(".notification-icon").html('<img src="./img/apps/'+icon+'" style="width: 2.5vh; height: 2.5vh;">');
                } else {
                    $(".notification-icon").html('<i class="'+icon+'"></i>');
                }
                $(".notification-title").html(title);
                $(".notification-text").html(text);
                if (QB.Phone.Notifications.Timeout !== undefined || QB.Phone.Notifications.Timeout !== null) {
                    clearTimeout(QB.Phone.Notifications.Timeout);
                }
                QB.Phone.Notifications.Timeout = setTimeout(function(){
                    QB.Phone.Animations.TopSlideUp(".phone-notification-container", 400, -10);
                    QB.Phone.Notifications.Timeout = setTimeout(function(){
                        if (!QB.Phone.Data.IsOpen == true) {
                        QB.Phone.Animations.BottomSlideUp('.container', 250, -70);
                        }
                    }, 500)
                    QB.Phone.Notifications.Timeout = null;
                }, timeout);
            }
        }
    });
}

$(document).on('click', ".phone-notification-container", function() {
    QB.Phone.Animations.TopSlideUp(".phone-notification-container", 500, -10);
    QB.Phone.Notifications.Timeout = null

    if (!QB.Phone.Data.IsOpen == true) {
    QB.Phone.Animations.BottomSlideUp('.container', 250, -70);
    }
})


$(document).on('click', ".notification-accept", function() {
    $.post(`https://${GetParentResourceName()}/AcceptNotification`, JSON.stringify({})),
    $.post(`https://${GetParentResourceName()}/PlaySound`, JSON.stringify({sound: "Menu_Accept", table: "Phone_SoundSet_Default"}));
    QB.Phone.Animations.TopSlideUp(".phone-notification-container-new", 500, -10);
    QB.Phone.Notifications.Timeout = null

    if (!QB.Phone.Data.IsOpen == true) {
    QB.Phone.Animations.BottomSlideUp('.container', 250, -70);
    }
})

$(document).on('click', ".notification-deny", function() {
    $.post(`https://${GetParentResourceName()}/DenyNotification`, JSON.stringify({})),
    $.post(`https://${GetParentResourceName()}/PlaySound`, JSON.stringify({sound: "Menu_Back", table: "Phone_SoundSet_Default"}));
    QB.Phone.Notifications.Timeout = null

    QB.Phone.Animations.TopSlideUp(".phone-notification-container-new", 500, -10);

    if (!QB.Phone.Data.IsOpen == true) {
    QB.Phone.Animations.BottomSlideUp('.container', 250, -70);
    }
})

QB.Phone.Functions.LoadPhoneData = function(data) {
    QB.Phone.Data.PlayerData = data.PlayerData;
    QB.Phone.Data.PlayerJob = data.PlayerJob;
    QB.Phone.Data.MetaData = data.PhoneData.MetaData;
    QB.Phone.Data.PhoneJobs = data.PhoneJobs
    QB.Phone.Functions.LoadMetaData(data.PhoneData.MetaData);
    QB.Phone.Functions.LoadContacts(data.PhoneData.Contacts);
    QB.Phone.Functions.SetupApplications(data);
}

QB.Phone.Functions.UpdateTime = function(data) {
    var NewDate = new Date();
    var NewHour = NewDate.getHours();
    var NewMinute = NewDate.getMinutes();
    var Minutessss = NewMinute;
    var Hourssssss = NewHour;
    if (NewHour < 10) {
        Hourssssss = "0" + Hourssssss;
    }
    if (NewMinute < 10) {
        Minutessss = "0" + NewMinute;
    }
    var MessageTime = Hourssssss + ":" + Minutessss

    $("#phone-time").html("<span>" + data.InGameTime.hour + ":" + data.InGameTime.minute + "</span>");
}

var NotificationTimeout = null;

QB.Screen.Notification = function(title, content, icon, timeout, color) {
    $.post(`https://${GetParentResourceName()}/HasPhone`, JSON.stringify({}), function(HasPhone){
        if (HasPhone) {
            if (color != null && color != undefined) {
                $(".screen-notifications-container").css({"background-color":color});
            }
            $(".screen-notification-icon").html('<i class="'+icon+'"></i>');
            $(".screen-notification-title").text(title);
            $(".screen-notification-content").text(content);
            $(".screen-notifications-container").css({'display':'block'}).animate({
                right: 5+"vh",
            }, 200);

            if (NotificationTimeout != null) {
                clearTimeout(NotificationTimeout);
            }

            NotificationTimeout = setTimeout(function(){
                $(".screen-notifications-container").animate({
                    right: -35+"vh",
                }, 200, function(){
                    $(".screen-notifications-container").css({'display':'none'});
                });
                NotificationTimeout = null;
            }, timeout);
        }
    });
}

// ─── Image viewer helpers ───────────────────────────────────────────────────

/** Open the full-screen image viewer with the given image URL. */
QB.Screen.popUp = function(imageUrl) {
    if (up) return; // already open

    $('.image-viewer-frame').html(
        '<button id="image-viewer-close" aria-label="Close image"><i class="fa-solid fa-xmark"></i></button>' +
        '<img class="image-viewer-img" src="' + imageUrl + '" alt="Full-size image">'
    );
    $('#image-viewer').fadeIn(250);
    up = true;
};

/** Close the full-screen image viewer. */
QB.Screen.popDown = function() {
    if (!up) return; // already closed

    $('#image-viewer').fadeOut(200, function() {
        $('.image-viewer-frame').html(
            '<button id="image-viewer-close" aria-label="Close image"><i class="fa-solid fa-xmark"></i></button>'
        );
    });
    up = false;
};

// Close viewer when clicking the × button
$(document).on('click', '#image-viewer-close', function(e) {
    e.stopPropagation(); // don't also fire the backdrop handler
    QB.Screen.popDown();
});

// Close viewer when clicking the dark backdrop (outside the image card)
$(document).on('click', '#image-viewer', function() {
    QB.Screen.popDown();
});

// Escape key: close viewer first; if viewer is not open, close the phone
$(document).on('keydown', function(e) {
    if (e.keyCode !== 27) return;
    if (up) {
        QB.Screen.popDown();
    } else {
        QB.Phone.Functions.Close();
    }
});

$(document).ready(function(){
    window.addEventListener('message', function(event) {
        switch(event.data.action) {
            case "open":
                QB.Phone.Functions.Open(event.data);
                QB.Phone.Functions.SetupAppWarnings(event.data.AppData);
                QB.Phone.Functions.SetupCurrentCall(event.data.CallData);
                QB.Phone.Data.IsOpen = true;
                QB.Phone.Data.PlayerData = event.data.PlayerData;
                break;
            case "LoadPhoneData":
                QB.Phone.Functions.LoadPhoneData(event.data);
                break;
            case "UpdateTime":
                QB.Phone.Functions.UpdateTime(event.data);
                break;
            case "Notification":
                QB.Screen.Notification(event.data.NotifyData.title, event.data.NotifyData.content, event.data.NotifyData.icon, event.data.NotifyData.timeout, event.data.NotifyData.color);
                break;
            case "PhoneNotification":
                QB.Phone.Notifications.Add(event.data.PhoneNotify.icon, event.data.PhoneNotify.title, event.data.PhoneNotify.text, event.data.PhoneNotify.color, event.data.PhoneNotify.timeout, event.data.PhoneNotify.accept, event.data.PhoneNotify.deny);
                break;
            case "PhoneNotificationCustom":
                QB.Phone.Notifications.Custom.Add(event.data.PhoneNotify.icon, event.data.PhoneNotify.title, event.data.PhoneNotify.text, event.data.PhoneNotify.color, event.data.PhoneNotify.timeout, event.data.PhoneNotify.accept, event.data.PhoneNotify.deny);
                break;
            case "RefreshAppAlerts":
                QB.Phone.Functions.SetupAppWarnings(event.data.AppData);
                break;
            case "UpdateBank":
                $(".bank-app-account-balance").html("&#36; "+event.data.NewBalance);
                $(".bank-app-account-balance").data('balance', event.data.NewBalance);
                break;
            case "UpdateChat":
                if (QB.Phone.Data.currentApplication == "whatsapp") {
                    if (OpenedChatData.number !== null && OpenedChatData.number == event.data.chatNumber) {
                        QB.Phone.Functions.SetupChatMessages(event.data.chatData);
                    } else {
                        $.post(`https://${GetParentResourceName()}/GetWhatsappChats`, JSON.stringify({}), function(chats){
                            QB.Phone.Functions.LoadWhatsappChats(chats);
                        });
                    }
                }
                break;
            case "RefreshWhatsappAlerts":
                QB.Phone.Functions.ReloadWhatsappAlerts(event.data.Chats);
                break;
            case "CancelOutgoingCall":
                $.post(`https://${GetParentResourceName()}/HasPhone`, JSON.stringify({}), function(HasPhone){
                    if (HasPhone) {
                        CancelOutgoingCall();
                    }
                });
                break;
            case "IncomingCallAlert":
                $.post(`https://${GetParentResourceName()}/HasPhone`, JSON.stringify({}), function(HasPhone){
                    if (HasPhone) {
                        IncomingCallAlert(event.data.CallData, event.data.Canceled, event.data.AnonymousCall);
                    }
                });
                break;
            case "refreshInvoice":
                    QB.Phone.Functions.LoadBankInvoices(event.data.invoices);
                break;
            case "SetupHomeCall":
                QB.Phone.Functions.SetupCurrentCall(event.data.CallData);
                break;
            case "AnswerCall":
                QB.Phone.Functions.AnswerCall(event.data.CallData);
                break;
            case "UpdateCallTime":
                var CallTime = event.data.Time;
                var date = new Date(null);
                date.setSeconds(CallTime);
                var timeString = date.toISOString().substr(11, 8);
                if (!QB.Phone.Data.IsOpen) {
                    QB.Phone.Animations.BottomSlideUp('.container', 250, -50);
                }
                $(".phone-call-ongoing-time").text(timeString);
                $(".phone-currentcall-title").text(event.data.Name || 'In call');
                $(".phone-currentcall-contact").text(timeString);
                break;
            case "CancelOngoingCall":
                QB.Phone.Animations.TopSlideUp('.phone-application-container', 250, -50);
                setTimeout(function(){
                    QB.Phone.Functions.ToggleApp("phone-call", "none");
                    $(".phone-application-container").css({"display":"none"});
                }, 400)
                QB.Phone.Data.CallActive = false;
                QB.Phone.Data.currentApplication = null;
                break;
            case "RefreshContacts":
                QB.Phone.Functions.LoadContacts(event.data.Contacts);
                break;
            case "UpdateMails":
                QB.Phone.Functions.SetupMails(event.data.Mails);
                break;
            case "RefreshProxis":
                if (QB.Phone.Data.currentApplication == "proxi") {
                    QB.Phone.Functions.RefreshProxis(event.data.Proxis);
                }
                break;
            case "UpdatePulses":
                console.log('UpdatePulses received:', JSON.stringify(event.data.Pulses));
                if (QB.Phone.Data.currentApplication == "pulses") {
                    QB.Phone.Notifications.LoadPulses(event.data.Pulses, event.data.hasVPN, false, true);
                }
                break;
            case "UpdateApplications":
                QB.Phone.Data.PlayerJob = event.data.JobData;
                QB.Phone.Functions.SetupApplications(event.data);
                break;
            case "UpdateTransactions":
                RefreshCryptoTransactions(event.data);
                break;
            case "UpdateCrypto":
                if (QB.Phone.Data.currentApplication == "crypto") {
                    QB.Phone.Data.PlayerData = event.data.PlayerData;
                    LoadCryptoCoins()
                }
                break;
            case "UpdateGarages":
                $.post(`https://${GetParentResourceName()}/SetupGarageVehicles`, JSON.stringify({}), function(Vehicles){
                    SetupGarageVehicles(Vehicles);
                })
                break;
            case "RefreshAlerts":
                QB.Phone.Functions.SetupAppWarnings(event.data.AppData);
                break;
            case "RefreshChatRooms":
                let rooms = $.map(event.data.Rooms, (r) => {
                    return r
                })
                QB.Phone.Functions.LoadChatRooms(rooms)
                break;
            case "RefreshGroupChat":
                QB.Phone.Functions.RefreshGroupChat(event.data.messageData)
                break;
        }
    })
});

// Page Navigation Functions
QB.Phone.Functions.NavigateToPage = function(pageIndex) {
    if (pageIndex < 0 || pageIndex >= QB.Phone.Data.totalPages) return;
    
    QB.Phone.Data.currentPage = pageIndex;
    var translateX = -pageIndex * 100;
    
    $(".phone-page-container").css("transform", `translateX(${translateX}%)`);
    
    // Update page indicators
    $(".page-dot").removeClass("active");
    $(`.page-dot[data-page="${pageIndex}"]`).addClass("active");
    
    // Show/hide dock based on page
    if (pageIndex === 0) {
        // Home page - show dock
        $(".phone-footer-applications").addClass("show");
    } else {
        // Other pages - hide dock
        $(".phone-footer-applications").removeClass("show");
    }
}

QB.Phone.Functions.NextPage = function() {
    if (QB.Phone.Data.currentPage < QB.Phone.Data.totalPages - 1) {
        QB.Phone.Functions.NavigateToPage(QB.Phone.Data.currentPage + 1);
    }
}

QB.Phone.Functions.PreviousPage = function() {
    if (QB.Phone.Data.currentPage > 0) {
        QB.Phone.Functions.NavigateToPage(QB.Phone.Data.currentPage - 1);
    }
}

// Page Navigation Event Handlers
$(document).on('click', '.page-dot', function(e) {
    e.preventDefault();
    var pageIndex = parseInt($(this).data('page'));
    QB.Phone.Functions.NavigateToPage(pageIndex);
});

// Touch/Swipe Navigation
var startX = 0;
var currentX = 0;
var isDragging = false;
var swipeThreshold = 30; // Reduced threshold for better responsiveness

$(document).on('touchstart mousedown', '.phone-home-pages', function(e) {
    if (QB.Phone.Data.currentApplication !== null) return;
    
    isDragging = true;
    startX = e.type === 'touchstart' ? e.originalEvent.touches[0].clientX : e.clientX;
    currentX = startX;
    
    // Add transition class for smooth movement
    $(".phone-page-container").addClass("dragging");
});

$(document).on('touchmove mousemove', '.phone-home-pages', function(e) {
    if (!isDragging || QB.Phone.Data.currentApplication !== null) return;
    
    e.preventDefault();
    currentX = e.type === 'touchmove' ? e.originalEvent.touches[0].clientX : e.clientX;
    var deltaX = currentX - startX;
    var currentTranslate = -QB.Phone.Data.currentPage * 100;
    var newTranslate = currentTranslate + (deltaX / $(this).width()) * 100;
    
    // Prevent dragging left on home page (page 0)
    if (QB.Phone.Data.currentPage === 0 && deltaX > 0) {
        newTranslate = Math.min(newTranslate, 0); // Don't allow positive translate on home page
    }
    
    // Prevent dragging right on last page
    if (QB.Phone.Data.currentPage === QB.Phone.Data.totalPages - 1 && deltaX < 0) {
        var maxTranslate = -(QB.Phone.Data.totalPages - 1) * 100;
        newTranslate = Math.max(newTranslate, maxTranslate); // Don't allow going past last page
    }
    
    $(".phone-page-container").css("transform", `translateX(${newTranslate}%)`);
});

$(document).on('touchend mouseup', '.phone-home-pages', function(e) {
    if (!isDragging || QB.Phone.Data.currentApplication !== null) return;
    
    isDragging = false;
    var deltaX = currentX - startX;
    
    // Remove dragging class and restore smooth transitions
    $(".phone-page-container").removeClass("dragging");
    
    // If we moved more than a few pixels, consider it a drag and block the subsequent click
    if (Math.abs(deltaX) > 5) {
        isClickBlocked = true;
        setTimeout(function(){ isClickBlocked = false; }, 100);
    }

    if (Math.abs(deltaX) > swipeThreshold) {
        if (deltaX > 0) {
            // Swiping right (going to previous page)
            // Only allow if not on home page
            if (QB.Phone.Data.currentPage > 0) {
                QB.Phone.Functions.PreviousPage();
            } else {
                // On home page, snap back with visual feedback
                QB.Phone.Functions.NavigateToPage(QB.Phone.Data.currentPage);
                QB.Phone.Notifications.Add("fas fa-info-circle", "Navigation", "You're already on the home page!", "default", 1000);
            }
        } else {
            // Swiping left (going to next page)
            // Only allow if not on last page
            if (QB.Phone.Data.currentPage < QB.Phone.Data.totalPages - 1) {
                QB.Phone.Functions.NextPage();
            } else {
                // On last page, snap back with visual feedback
                QB.Phone.Functions.NavigateToPage(QB.Phone.Data.currentPage);
                QB.Phone.Notifications.Add("fas fa-info-circle", "Navigation", "No more pages available!", "default", 1000);
            }
        }
    } else {
        // Small movement, snap back to current page
        QB.Phone.Functions.NavigateToPage(QB.Phone.Data.currentPage);
    }
});

// Prevent default mouse events on the entire document when dragging
$(document).on('mouseleave mouseup', function() {
    isDragging = false;
});

// Keyboard navigation for testing (Arrow keys)
$(document).on('keydown', function(e) {
    if (QB.Phone.Data.IsOpen && QB.Phone.Data.currentApplication === null) {
        if (e.key === 'ArrowLeft') {
            e.preventDefault();
            // Only allow left arrow if not on home page
            if (QB.Phone.Data.currentPage > 0) {
                QB.Phone.Functions.PreviousPage();
            }
        } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            // Only allow right arrow if not on last page
            if (QB.Phone.Data.currentPage < QB.Phone.Data.totalPages - 1) {
                QB.Phone.Functions.NextPage();
            }
        }
    }
});

// Widget click handlers
$(document).on('click', '.widget-quick', function(e) {
    e.preventDefault();
    // Quick call functionality - you can customize this
    QB.Phone.Notifications.Add("fas fa-phone", "Quick Call", "Opening phone app...", "default", 1500);
    setTimeout(function() {
        $('.phone-application[data-app="phone"]').click();
    }, 500);
});

$(document).on('click', '.widget-stats', function(e) {
    e.preventDefault();
    // Open bank app
    QB.Phone.Notifications.Add("fas fa-university", "Bank", "Opening bank app...", "default", 1500);
    setTimeout(function() {
        $('.phone-application[data-app="bank"]').click();
    }, 500);
});

$(document).on('click', '.widget-weather', function(e) {
    e.preventDefault();
    QB.Phone.Notifications.Add("fas fa-cloud-sun", "Weather", "Weather information updated!", "default", 2000);
});

$(document).on('click', '.widget-recent', function(e) {
    e.preventDefault();
    // Open messages or notifications
    QB.Phone.Notifications.Add("fas fa-bell", "Recent Activity", "Opening recent notifications...", "default", 1500);
});

$(document).on('click', '.widget-battery', function(e) {
    e.preventDefault();
    // Open settings app
    QB.Phone.Notifications.Add("fas fa-battery-three-quarters", "Battery", "Opening settings...", "default", 1500);
    setTimeout(function() {
        $('.phone-application[data-app="settings"]').click();
    }, 500);
});

// App Closing Gesture (Swipe Up from Bottom)
var appSwipeStartY = 0;
var isAppSwiping = false;

$(document).on('mousedown touchstart', '.phone-application-container', function(e) {
    if (QB.Phone.Data.currentApplication === null) return;
    
    var container = $(this);
    var height = container.height();
    var pageY = e.type === 'touchstart' ? e.originalEvent.touches[0].pageY : e.pageY;
    var containerOffset = container.offset().top;
    var relativeY = pageY - containerOffset;
    
    // Only trigger if starting from the bottom 60px
    if (relativeY > (height - 60)) {
        isAppSwiping = true;
        appSwipeStartY = pageY;
        
        // Prepare container for manual manipulation
        $('.phone-application-container').css({
            'transition': 'none',
            'transform-origin': 'center bottom'
        });
    }
});

$(document).on('mousemove touchmove', function(e) {
    if (!isAppSwiping || QB.Phone.Data.currentApplication === null) return;
    
    var currentY = e.type === 'touchmove' ? e.originalEvent.touches[0].clientY : e.clientY;
    var deltaY = currentY - appSwipeStartY;
    
    // Only handle upward movement (negative deltaY)
    if (deltaY < 0) {
        // Calculate scale: 1 -> 0.8 as we drag up
        var progress = Math.min(Math.abs(deltaY) / 200, 1);
        var scale = 1 - (progress * 0.2);
        var translateY = deltaY;
        
        $('.phone-application-container').css({
            'transform': `translateY(${translateY}px) scale(${scale})`,
            'border-radius': `${progress * 20}px`
        });
    }
});

$(document).on('mouseup touchend', function(e) {
    if (!isAppSwiping || QB.Phone.Data.currentApplication === null) return;
    
    isAppSwiping = false;
    var currentY = e.type === 'touchend' ? e.originalEvent.changedTouches[0].clientY : e.clientY;
    var deltaY = currentY - appSwipeStartY;
    
    if (deltaY < -50) { // Threshold to close
        QB.Phone.Functions.CloseApplication();
    } else {
        // Reset
        $('.phone-application-container').css({
            'transition': 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
            'transform': 'translateY(0) scale(1)',
            'border-radius': '0px'
        });
    }
});
