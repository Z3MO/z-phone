// Functions
var CurrentPulsesTab = "recent";
var CurrentPulsesView = "feed"; // New: 'feed' or 'profile'
var CurrentProfileViewData = null; // Stores data for the profile being viewed

function ClearInputNew() {
    $(".pulse-box-text-input").val("");
    $('.pulse-box-image-input').val("");
    $('#anonymous-pulse').prop('checked', false);
    $('#pulse-box-text').removeAttr('data-editing-pulseid'); // Clear editing state
}

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

function createSkeletonPulseElement() {
    return `
        <div class="skeleton-pulse">
            <div class="skeleton-header">
                <div class="skeleton skeleton-avatar"></div>
                <div style="flex: 1;">
                    <div class="skeleton" style="height: 1.5vh; width: 40%; margin-bottom: 0.5vh;"></div>
                    <div class="skeleton" style="height: 1.2vh; width: 30%;"></div>
                </div>
            </div>
            <div class="skeleton" style="height: 1.2vh; width: 95%; margin-bottom: 0.8vh;"></div>
            <div class="skeleton" style="height: 1.2vh; width: 80%;"></div>
        </div>
    `;
}

function createPulseElement(Pulse, commentCount) {
    var PulseMessage = Pulse.message
    var TimeAgo = moment(Pulse.date).fromNow();
    var PulseHandle = Pulse.firstName + ' ' + Pulse.lastName
    commentCount = commentCount || 0;

    var isLiked = Pulse.likes && Pulse.likes.includes(QB.Phone.Data.PlayerData.citizenid);
    var likeCount = Pulse.likes ? Pulse.likes.length : 0;
    var likeIcon = isLiked ? 'fa-solid fa-heart' : 'fa-regular fa-heart';
    var likeColor = isLiked ? '#e0245e' : '#8899a6';

    // Sanitize PulseMessage for use in data attributes to prevent breaking HTML
    var EscapedPulseMessage = PulseMessage.replace(/"/g, '&quot;').replace(/'/g, '&#39;');

    var PulseElement = `
        <div class="pulses-pulse" id="pulse-${Pulse.pulseId}" data-pulseid="${Pulse.pulseId}" data-citizenid="${Pulse.citizenid}" data-pulsehandler="@${PulseHandle.replace(" ", "_")}" data-type="${Pulse.type}" data-pulsemessage="${EscapedPulseMessage}" data-pulseurl="${Pulse.url || ''}">
            <div class="pulse-header" style="display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 0.5vh;">
                <div style="display: flex; align-items: center;">
                    <img class="pulse-avatar" src="${Pulse.profilePicture || 'img/default.png'}" onerror="this.src='img/default.png'" data-citizenid="${Pulse.citizenid}" data-firstname="${Pulse.firstName}" data-lastname="${Pulse.lastName}" data-profilepicture="${Pulse.profilePicture || 'img/default.png'}" style="width: 4vh; height: 4vh; background: #2A3B4D; border-radius: 12px; margin-right: 1vh; object-fit: cover; cursor: pointer;">
                    <div class="pulse-info">
                        <div class="pulse-author">${PulseHandle}</div>
                        <div class="pulse-handle">@${PulseHandle.replace(" ", "_")}</div>
                    </div>
                </div>
                <div class="pulse-time">${TimeAgo}</div>
            </div>
            
            <div class="pulse-message">${PulseMessage}</div>
            ${Pulse.url ? `<img class="image" src="${Pulse.url}" style="display: block; width: 100%; border-radius: 12px; margin-bottom: 1vh; border: 1px solid #2A3B4D;" onerror="this.style.display='none';">` : ''}
            
            <div class="pulse-actions">
                <div class="pulse-action-btn pulse-like" style="color: ${likeColor};">
                    <i class="${likeIcon}"></i>
                    <span>${likeCount > 0 ? likeCount : ''}</span>
                </div>
                <div class="pulse-action-btn pulse-comment">
                    <i class="fa-solid fa-comment"></i>
                    <span class="pulse-comment-count">${commentCount > 0 ? commentCount : ''}</span>
                </div>
                <div class="pulse-action-btn pulse-retweet" data-pulsemessage="${EscapedPulseMessage}" data-imagemessage="${Pulse.url || ''}"><i class="fa-solid fa-retweet"></i></div>
                <div class="pulse-action-btn pulse-reply"><i class="fa-solid fa-reply"></i></div>
            </div>
            <div class="pulse-comments-section">
                <div class="pulse-comments-header">Comments</div>
                <div class="pulse-comments-list"></div>
                <div class="pulse-comment-input-container">
                    <input type="text" class="pulse-comment-input" placeholder="Pulse your reply">
                    <button class="pulse-comment-submit">Reply</button>
                </div>
            </div>
        </div>
    `;
    return PulseElement;
}

function createNotificationElement(notification) {
    var timeAgo = moment(notification.date).fromNow();
    var icon = '';
    var text = '';
    var commentPreview = '';

    if (notification.type === 'like') {
        icon = 'fa-solid fa-heart notification-icon-like';
        text = `<strong>${notification.sender_name}</strong> liked your pulse.`;
    } else if (notification.type === 'comment') {
        icon = 'fa-solid fa-comment notification-icon-comment';
        text = `<strong>${notification.sender_name}</strong> commented on your pulse.`;
        var sanitizedComment = notification.text.replace(/<[^>]*>?/gm, '');

        // Truncate for preview
        if (sanitizedComment.length > 80) {
            sanitizedComment = sanitizedComment.substring(0, 80) + '...';
        }
        commentPreview = `<div class="notification-comment-text">"${sanitizedComment}"</div>`;
    }

    return `
        <div class="notification-item" data-pulseid="${notification.pulseId}">
            <div class="notification-icon-container">
                <i class="${icon}"></i>
            </div>
            <div class="notification-content">
                <div class="notification-text">${text}</div>
                ${commentPreview}
                <div class="notification-time">${timeAgo}</div>
            </div>
        </div>
    `;
}

function renderPulses(Pulses, counts, isTabSwitch = false, isUpdate = false) {
    const homeTab = $(".pulses-home-tab");
    $('.footer-icon').removeClass('active');
    $('.footer-icon-pulses').addClass('active');

        const populateList = (target) => {
        target.html(''); // Clear list

        // Sort pulses based on the current tab
        if (CurrentPulsesTab === 'trending') {
            Pulses.sort((a, b) => {
                var likesA = (a.likes) ? a.likes.length : 0;
                var likesB = (b.likes) ? b.likes.length : 0;
                return likesB - likesA;
            });
        } else { // 'recent' tab
            Pulses.reverse();
        }

        if (Pulses && Pulses.length > 0) {
            $.each(Pulses, function(i, Pulse){
                var commentCount = counts && counts[Pulse.pulseId] ? counts[Pulse.pulseId] : 0;
                var PulseElement = createPulseElement(Pulse, commentCount);
                target.append(PulseElement);
            });
        } else {
            target.html('<div style="text-align: center; color: #8899a6; margin-top: 5vh; font-size: 1.4vh;">No pulses to display.</div>');
        }
    };

    if (isTabSwitch || isUpdate) {
        const listContainer = $(".pulses-list");
        // We are just updating the list, which is already showing skeletons
        // Fade out skeletons, then fade in new content
        listContainer.css('animation', 'fadeOut 0.2s ease-in forwards');
        setTimeout(() => {
            populateList(listContainer);
            listContainer.css('animation', 'fadeIn 0.3s ease-out forwards');
        }, 200);
    } else {
        // Full page render (initial load or switching from profile)
        homeTab.css('animation', 'fadeOut 0.2s ease-in forwards');
        setTimeout(() => {
            homeTab.html("");
            if (CurrentPulsesView === 'feed') {
                var headerHtml = `
                    <div class="pulses-feed-header">
                        <div class="pulses-header-empty"></div>
                        <div class="pulses-header-logo-container">
                            <i class="fa-solid fa-wave-pulse pulses-header-logo"></i>
                        </div>
                        <div class="pulses-header-empty"></div>
                    </div>
                `;
                var tabsHtml = `
                    <div class="pulses-tabs-container">
                        <div class="pulses-tab ${CurrentPulsesTab == 'recent' ? 'active' : ''}" data-tab="recent">Feed</div>
                        <div class="pulses-tab ${CurrentPulsesTab == 'trending' ? 'active' : ''}" data-tab="trending">Trending</div>
                        <div class="pulses-tab ${CurrentPulsesTab == 'notifications' ? 'active' : ''}" data-tab="notifications">Notifications</div>
                    </div>
                `;
                var pulsesListContainer = `<div class="pulses-list"></div>`;
                homeTab.append(headerHtml).append(tabsHtml).append(pulsesListContainer);

                // Show skeleton loader while content is prepared
                const listContainer = homeTab.find('.pulses-list');
                listContainer.html('');
                for (let i = 0; i < 5; i++) {
                    listContainer.append(createSkeletonPulseElement());
                }

                // Add a minimum delay to ensure skeleton is visible for a good UX
                var minDelay = new Promise(resolve => setTimeout(resolve, 500));
                minDelay.then(() => {
                    listContainer.css('animation', 'fadeOut 0.2s ease-in forwards');
                    setTimeout(() => {
                        populateList(listContainer);
                        listContainer.css('animation', 'fadeIn 0.3s ease-out forwards');
                    }, 200);
                });
            }
            homeTab.css('animation', 'fadeIn 0.3s ease-out forwards');
        }, 200);
    }
}

function renderNotifications(notifications) {
    const listContainer = $(".pulses-list");
    listContainer.css('animation', 'fadeOut 0.2s ease-in forwards'); // Fade out skeletons

    setTimeout(() => {
        listContainer.html(''); // Clear skeletons

        if (notifications && notifications.length > 0) {
            notifications.forEach(function(notification) {
                var notificationElement = createNotificationElement(notification);
                listContainer.append(notificationElement);
            });
        } else {
            listContainer.html('<div style="text-align: center; color: #8899a6; margin-top: 5vh; font-size: 1.4vh;">You have no new notifications.</div>');
        }

        listContainer.css('animation', 'fadeIn 0.3s ease-out forwards'); // Fade in notifications
    }, 200);
}


function renderProfile(Pulses) {
    const homeTab = $(".pulses-home-tab");
    $('.footer-icon').removeClass('active');
    $('.footer-icon-profile').addClass('active');

    homeTab.css('animation', 'fadeOut 0.2s ease-in forwards');

    setTimeout(() => {
        homeTab.html(""); // Clear the whole tab

        if (!QB.Phone.Data.PlayerData || !QB.Phone.Data.PlayerData.charinfo) {
            // Data not ready, show a loading message or just return
            homeTab.html('<div style="text-align: center; color: #8899a6; margin-top: 20px;">Loading profile...</div>');
            homeTab.css('animation', 'fadeIn 0.3s ease-out forwards');
            return;
        }

        // Build and append the static part of the profile
        const myCid = QB.Phone.Data.PlayerData.citizenid;
        
        // Determine if we are viewing our own profile or someone else's
        const isMe = !CurrentProfileViewData || CurrentProfileViewData.citizenid === myCid;
        const targetCid = isMe ? myCid : CurrentProfileViewData.citizenid;
        
        // If it's me, use my metadata. If it's someone else, use defaults (since we don't have their metadata)
        const pfp = isMe ? ((QB.Phone.Data.PlayerData.metadata && QB.Phone.Data.PlayerData.metadata.profilepicture) || 'img/default.png') : (CurrentProfileViewData.profilePicture || 'img/default.png');
        const banner = isMe ? ((QB.Phone.Data.PlayerData.metadata && QB.Phone.Data.PlayerData.metadata.banner) || 'https://i.imgur.com/6b1BD2d.png') : 'https://i.imgur.com/6b1BD2d.png';
        const bio = isMe ? ((QB.Phone.Data.PlayerData.metadata && QB.Phone.Data.PlayerData.metadata.bio) || 'No bio set.') : '';
        
        const fullName = isMe ? (QB.Phone.Data.PlayerData.charinfo.firstname + ' ' + QB.Phone.Data.PlayerData.charinfo.lastname) : (CurrentProfileViewData.firstName + ' ' + CurrentProfileViewData.lastName);
        const handle = '@' + fullName.replace(" ", "_");
        
        // Only show edit button if it's my profile
        const editButtonHtml = isMe ? '<button class="edit-profile-button">Edit Profile</button>' : '';

        var profileHtml = `
            <div class="pulses-profile-container">
                <div class="pulses-profile-header">
                    <img class="pulses-profile-banner" src="${banner}" onerror="this.src='https://i.imgur.com/6b1BD2d.png';">
                    <img class="pulses-profile-picture" src="${pfp}" onerror="this.src='img/default.png';">
                    ${editButtonHtml}
                </div>
                <div class="pulses-profile-info">
                    <div class="pulses-profile-name">${fullName}</div>
                    <div class="pulses-profile-handle">${handle}</div>
                    <div class="pulses-profile-bio">${bio}</div>
                </div>
                <div class="pulses-profile-tabs">
                    <div class="pulses-profile-tab active">Pulses</div>
                </div>
                <div class="pulses-profile-pulses"></div>
            </div>
        `;
        homeTab.html(profileHtml); // Use .html() to replace content
        homeTab.css('animation', 'fadeIn 0.3s ease-out forwards'); // Fade in the static content

        // Now handle the dynamic pulses list
        const profilePulsesContainer = $(".pulses-profile-pulses");
        const myPulses = Pulses.filter(t => t.citizenid === targetCid).reverse();

        if (myPulses.length > 0) {
            // Show skeletons immediately
            profilePulsesContainer.html('');
            for (let i = 0; i < Math.min(myPulses.length, 3); i++) {
                profilePulsesContainer.append(createSkeletonPulseElement());
            }

            // Fetch comment counts
            var pulseIds = myPulses.map(function(Pulse){ return Pulse.pulseId; });
            var fetchData = new Promise((resolve, reject) => {
                QB.Phone.NUI.postLegacy("GetPulseCommentCounts", { pulseIds: pulseIds })
                    .then(resolve)
                    .catch(reject);
            });
            var minDelay = new Promise(resolve => setTimeout(resolve, 500));

            Promise.all([fetchData, minDelay]).then(function (results) {
                var counts = results[0];
                profilePulsesContainer.css('animation', 'fadeOut 0.2s ease-in forwards');
                setTimeout(() => {
                    profilePulsesContainer.html('');
                    $.each(myPulses, function (i, Pulse) {
                        var commentCount = counts && counts[Pulse.pulseId] ? counts[Pulse.pulseId] : 0;
                        var PulseElement = createPulseElement(Pulse, commentCount);
                        profilePulsesContainer.append(PulseElement);
                    });
                    profilePulsesContainer.css('animation', 'fadeIn 0.3s ease-out forwards');
                }, 200);
            }).catch(function (e) {
                profilePulsesContainer.html('<div style="text-align: center; color: #8899a6; margin-top: 20px;">Could not load pulses.</div>');
            });
        } else {
            // If no pulses, just show the message after a short delay
            setTimeout(() => {
                profilePulsesContainer.html('<div style="text-align: center; color: #8899a6; margin-top: 20px;">You haven\'t pulsed yet.</div>');
            }, 500);
        }
    }, 200);
}

QB.Phone.Notifications.LoadPulses = function(Pulses, hasVPN=false, isTabSwitch = false, isUpdate = false) {
    if (CurrentPulsesView === 'feed') {
        if (Pulses && Pulses.length > 0) {
            var pulseIds = Pulses.map(function(Pulse){ return Pulse.pulseId; });
            QB.Phone.NUI.postLegacy("GetPulseCommentCounts", { pulseIds: pulseIds }, function(counts) {
                renderPulses(Pulses, counts, isTabSwitch, isUpdate);
            }).catch(function() {
                renderPulses(Pulses, {}, isTabSwitch, isUpdate);
            });
        } else {
            renderPulses([], {}, isTabSwitch, isUpdate);
        }
    } else if (CurrentPulsesView === 'profile') {
        renderProfile(Pulses);
    }

    // This part is for the anonymous pulse indicator, which is not directly part of the footer/profile
    if (hasVPN) {
        $(".pulse-anonymous").css("display", "block");
    } else {
        $(".pulse-anonymous").css("display", "none");
    }

    if (Pulses !== null && Pulses !== undefined && Pulses.length > 0) {
    }
};

// New: Footer navigation click handlers
$(document).on('click', '.footer-icon-pulses', function(e){
    e.preventDefault();
    CurrentPulsesView = "feed";
    CurrentPulsesTab = "recent"; // Reset to recent when going to feed
    QB.Phone.NUI.postLegacy("GetPulses", {}, function(Pulses) {
        QB.Phone.Notifications.LoadPulses(Pulses.PulseData, Pulses.hasVPN);
    });
});

$(document).on('click', '.footer-icon-profile', function(e){
    e.preventDefault();
    CurrentPulsesView = "profile";
    CurrentProfileViewData = null; // Reset to my profile
    QB.Phone.NUI.postLegacy("GetPulses", {}, function(Pulses) {
        QB.Phone.Notifications.LoadPulses(Pulses.PulseData, Pulses.hasVPN);
    });
});

$(document).on('click', '.pulses-tab', function(e){
    e.preventDefault();
    var newTab = $(this).data('tab');

    if (CurrentPulsesTab === newTab) return;

    CurrentPulsesTab = newTab;

    // Update active class and show skeleton loader
    $('.pulses-tab').removeClass('active');
    $(this).addClass('active');

    const list = $(".pulses-list");
    list.css('animation', 'fadeOut 0.2s ease-in forwards');
    
    setTimeout(() => {
        list.html(''); // Clear current content
        for (let i = 0; i < 5; i++) { // Show 5 skeleton items
            list.append(createSkeletonPulseElement();
        }
        list.css('animation', 'fadeIn 0.3s ease-out forwards');

        // Fetch data and render
        var minDelay = new Promise(resolve => setTimeout(resolve, 500)); // 500ms minimum display time

        if (newTab === 'notifications') {
            var fetchData = new Promise((resolve, reject) => {
                QB.Phone.NUI.postLegacy("GetPulseNotifications", {})
                    .then(resolve)
                    .catch(reject);
            });
            Promise.all([fetchData, minDelay]).then(function(results) {
                renderNotifications(results[0]);
            });
        } else {
            var fetchData = QB.Phone.NUI.postLegacy("GetPulses", {});
            Promise.all([fetchData, minDelay]).then(function(results) {
                QB.Phone.Notifications.LoadPulses(results[0].PulseData, results[0].hasVPN, true);
            });
        }
    }, 200);
});

$(document).on('click', '.edit-profile-button', function(e) {
    e.preventDefault();
    
    const pfp = (QB.Phone.Data.PlayerData.metadata && QB.Phone.Data.PlayerData.metadata.profilepicture) || '';
    const banner = (QB.Phone.Data.PlayerData.metadata && QB.Phone.Data.PlayerData.metadata.banner) || '';
    const bio = (QB.Phone.Data.PlayerData.metadata && QB.Phone.Data.PlayerData.metadata.bio) || '';

    var modalHtml = `
        <div class="edit-profile-modal" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 10001; display: flex; align-items: center; justify-content: center;">
            <div class="edit-profile-modal-content" style="background: #15202B; padding: 2vh; border-radius: 12px; width: 90%; display: flex; flex-direction: column; gap: 1vh;">
                <h3 style="color: white; text-align: center; margin-bottom: 1vh;">Edit Profile</h3>
                <input type="text" id="edit-profile-pfp" class="edit-profile-input" placeholder="Profile Picture URL" value="${pfp}">
                <input type="text" id="edit-profile-banner" class="edit-profile-input" placeholder="Banner URL" value="${banner}">
                <textarea id="edit-profile-bio" class="edit-profile-textarea" placeholder="Your bio...">${bio}</textarea>
                <div style="display: flex; gap: 1vh; margin-top: 1vh;">
                    <button id="cancel-edit-profile" style="flex: 1;">Cancel</button>
                    <button id="save-profile-button" style="flex: 1;">Save</button>
                </div>
            </div>
        </div>
    `;
    $('.pulses-app').append(modalHtml);
});

$(document).on('click', '#save-profile-button', function(e) {
    e.preventDefault();
    const pfp = $('#edit-profile-pfp').val();
    const banner = $('#edit-profile-banner').val();
    const bio = $('#edit-profile-bio').val();

    // Update local data immediately
    if (QB.Phone.Data.PlayerData.metadata) {
        QB.Phone.Data.PlayerData.metadata.profilepicture = pfp;
        QB.Phone.Data.PlayerData.metadata.banner = banner;
        QB.Phone.Data.PlayerData.metadata.bio = bio;
    }

    QB.Phone.NUI.postLegacy("UpdateProfile", {
        profilePicture: pfp,
        banner: banner,
        bio: bio
    });

    $('.edit-profile-modal').remove();

    // Refresh the profile view
    if (CurrentPulsesView === "profile") {
        $('.footer-icon-profile').click();
    }
    QB.Phone.Notifications.Add("fa-solid fa-wave-pulse", "Pulses", "Profile updated!", "#1DA1F2", 3000);
});

$(document).on('click', '.edit-profile-modal, #cancel-edit-profile', function(e) {
    if (e.target === this || e.target.id === 'cancel-edit-profile') {
        e.preventDefault();
        $('.edit-profile-modal').remove();
    }
});

$(document).on('click', '.footer-icon-new-pulse', function(e){
    e.preventDefault();
    ClearInputNew()
    $('#pulse-box-text').css({display: 'flex', opacity: 0}).animate({opacity: 1}, 350);
});

$(document).on('click', '.pulse-like', function(e){
    e.preventDefault();
    var pulseId = $(this).closest('.pulses-pulse').data('pulseid');
    QB.Phone.NUI.postLegacy("ToggleLikePulse", {
        pulseId: pulseId
    });
});

$(document).on('click', '#pulse-sendmessage-chat', function(e){ // Submit Button For Pulses Message
    e.preventDefault();

    var PulseMessage = $(".pulse-box-text-input").val();
    var editingPulseId = $('#pulse-box-text').attr('data-editing-pulseid'); // Get editing ID
    var imageURL = $('.pulse-box-image-input').val();
    let anonymousPulse = document.getElementById('anonymous-pulse').checked;
    if (PulseMessage != "" || imageURL !== "") {
        var CurrentDate = new Date();
        setTimeout(function(){
            ConfirmationFrame()
        }, 150);

        if (editingPulseId) {
            // This is an edit operation
            // You would typically call a new NUI callback and server event here
            QB.Phone.NUI.postLegacy("EditPulse", {
                pulseId: editingPulseId,
                message: PulseMessage,
                url: imageURL,
            }, function() {
                ClearInputNew();
                $('#pulse-box-text').animate({opacity: 0}, 350, function(){ $(this).css("display", "none"); });
                QB.Phone.Notifications.Add("fa-solid fa-wave-pulse", "Pulses", "Pulse updated!", "#1DA1F2");
            });
        } else {
            QB.Phone.NUI.postLegacy("PostNewPulse", {
                Message: PulseMessage,
                Date: CurrentDate,
                url: imageURL,
                type: 'pulse',
                anonymous: anonymousPulse,
            }, function() { ClearInputNew(); $('#pulse-box-text').animate({opacity: 0}, 350, function(){ $(this).css("display", "none"); }); });
        }
    } else {
        QB.Phone.Notifications.Add("fa-solid fa-wave-pulse", "Pulses", "Fill a message!", "#1DA1F2");
    };
    $('.pulse-box-image-input').val("");
});
// Clicks
$(document).on('click', '#image-container', function(e){
    e.preventDefault();
    QB.Screen.popUp(source)
});

$(document).on('click', '.pulse-reply', function(e){
    e.preventDefault();
    var PulseHandle = $(this).closest('.pulses-pulse').data('pulsehandler');

    ClearInputNew()
    $('#pulse-box-text').css({display: 'flex', opacity: 0}).animate({opacity: 1}, 350);
    $(".pulse-box-text-input").val(PulseHandle+ " ");
});

$(document).on('click', '.pulse-retweet', function(e){
    e.preventDefault();
    var PulseHandle = $(this).closest('.pulses-pulse').data('pulsehandler');
    var isRepulse =  $(this).closest('.pulses-pulse').data('type');
    var PulseMessage = $(this).data('pulsemessage');
    var imageURL = $(this).data('imagemessage');
    var CompleteRepulse = "RT " + PulseHandle + " " + PulseMessage

    if (isRepulse !== 'repulse'){
        var CurrentDate = new Date();
        if (imageURL == null){
            imageURL = ""
        }
        setTimeout(function(){
            ConfirmationFrame()
        }, 150);
        QB.Phone.NUI.postLegacy("PostNewPulse", {
            Message: CompleteRepulse,
            Date: CurrentDate,
            url: imageURL,
            type: 'repulse'
        })
    } else {
        QB.Phone.Notifications.Add("fa-solid fa-wave-pulse", "Pulses", "Cannot re-pulse a re-pulse!", "#1DA1F2");
    }
});

$(document).on('contextmenu', '.pulses-pulse', function(e){
    var pulseCid = $(this).attr('data-citizenid');
    var myCid = QB.Phone.Data.PlayerData.citizenid;

    if (pulseCid && myCid && String(pulseCid) === String(myCid)) {
        e.preventDefault();
        var pulseElement = $(this);
        var pulseId = pulseElement.data('pulseid');
        var PulseMessage = pulseElement.data('pulsemessage'); // Retrieve the message for editing from the main pulse element
        var PulseUrl = pulseElement.data('pulseurl'); // Retrieve the URL for editing
        // Sanitize PulseMessage for use in data attributes to prevent breaking HTML
        var EscapedPulseMessage = PulseMessage.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
        $('.pulses-context-menu').remove();
        var menu = $(`
            <div class="pulses-context-menu" style="position: fixed; top: ${e.pageY}px; left: ${e.pageX}px; background: #1E2732; border: 1px solid #38444D; border-radius: 8px; padding: 5px; z-index: 10000; box-shadow: 0 2px 10px rgba(0,0,0,0.5); min-width: 150px;">
                <div class="context-menu-item edit-option" data-pulseid="${pulseId}" data-pulsemessage="${EscapedPulseMessage}" data-pulseurl="${PulseUrl}" style="color: #1DA1F2; padding: 8px 12px; cursor: pointer; font-size: 1.2vh; font-weight: 600; border-radius: 5px; display: flex; align-items: center; transition: background 0.2s;">
                    <i class="fa-solid fa-pen-to-square" style="margin-right: 10px;"></i> Edit Pulse
                </div>
                <div class="context-menu-item delete-option" data-pulseid="${pulseId}" style="color: #f56565; padding: 8px 12px; cursor: pointer; font-size: 1.2vh; font-weight: 600; border-radius: 5px; display: flex; align-items: center; transition: background 0.2s;">
                    <i class="fa-solid fa-trash" style="margin-right: 10px;"></i> Delete Pulse
                </div>
            </div>
        `);
        $('body').append(menu);
    }
});

$(document).on('click', '.edit-option', function(e) {
    e.preventDefault();
    var pulseId = $(this).data('pulseid');
    var pulseMessage = $(this).data('pulsemessage');
    var pulseUrl = $(this).data('pulseurl');

    ClearInputNew(); // Clear any existing input
    $('#pulse-box-text').css({display: 'flex', opacity: 0}).animate({opacity: 1}, 350); // Show the pulse composition box
    $(".pulse-box-text-input").val(pulseMessage); // Pre-fill with current message
    $('.pulse-box-image-input').val(pulseUrl); // Pre-fill with current image URL
    $('#pulse-box-text').attr('data-editing-pulseid', pulseId); // Mark as editing mode

    $('.pulses-context-menu').remove(); // Close the context menu
});


$(document).on('click', '.delete-option', function(e) {
    e.preventDefault();
    var pulseId = $(this).data('pulseid');
    QB.Phone.NUI.postLegacy("DeletePulse", {id: pulseId});
    $('.pulses-context-menu').remove();
});

$(document).on('mousedown', function(e) {
    if (!$(e.target).closest('.pulses-context-menu').length) {
        $('.pulses-context-menu').remove();
    }
});

// Comment functionality
$(document).on('click', '.pulse-comment', function(e){
    e.preventDefault();
    var pulseId = $(this).closest('.pulses-pulse').data('pulseid');
    var commentsSection = $(this).closest('.pulses-pulse').find('.pulse-comments-section');
    
    if (commentsSection.is(':visible')) {
        commentsSection.slideUp(200);
    } else {
        // Load comments for this pulse
        QB.Phone.NUI.postLegacy("GetPulseComments", {
            pulseId: pulseId
        }, function(comments) {
            LoadPulseComments(pulseId, comments);
            commentsSection.slideDown(200);
        });
    }
});

$(document).on('click', '.pulse-comment-submit', function(e){
    e.preventDefault();
    var pulseContainer = $(this).closest('.pulses-pulse');
    var pulseId = pulseContainer.data('pulseid');
    var commentInput = $(this).siblings('.pulse-comment-input');
    var commentText = commentInput.val().trim();
    
    if (commentText !== "") {
        QB.Phone.NUI.postLegacy("PostPulseComment", {
            pulseId: pulseId,
            comment: commentText
        }, function(response) {
            if (response.success) {
                commentInput.val('');
                // The global UpdatePulses event will handle refreshing the feed.
            }
        });
    }
});

// Click handler for comment avatar to view profile
$(document).on('click', '.pulse-comment-avatar', function(e) {
    e.preventDefault();
    var citizenid = $(this).data('citizenid');
    var firstName = $(this).data('firstname');
    var lastName = $(this).data('lastname');
    var profilePicture = $(this).data('profilepicture');

    CurrentPulsesView = "profile";
    CurrentProfileViewData = { citizenid: citizenid, firstName: firstName, lastName: lastName, profilePicture: profilePicture };
    
    QB.Phone.NUI.postLegacy("GetPulses", {}, function(Pulses) {
        QB.Phone.Notifications.LoadPulses(Pulses.PulseData, Pulses.hasVPN);
    });
});

// Add click handler for main pulse avatar to view profile
$(document).on('click', '.pulse-avatar', function(e) {
    e.preventDefault();
    var citizenid = $(this).data('citizenid');
    var firstName = $(this).data('firstname');
    var lastName = $(this).data('lastname');
    var profilePicture = $(this).data('profilepicture');

    CurrentPulsesView = "profile";
    CurrentProfileViewData = { citizenid: citizenid, firstName: firstName, lastName: lastName, profilePicture: profilePicture };
    
    QB.Phone.NUI.postLegacy("GetPulses", {}, function(Pulses) {
        QB.Phone.Notifications.LoadPulses(Pulses.PulseData, Pulses.hasVPN);
    });
});

function LoadPulseComments(pulseId, comments) {
    var commentsContainer = $('#pulse-' + pulseId).find('.pulse-comments-list');
    commentsContainer.html('');
    
    if (comments && comments.length > 0) {
        comments.forEach(function(comment) {
            var timeAgo = moment(comment.date).fromNow();
            var commentHtml = `
                <div class="pulse-comment-item">
                    <img class="pulse-comment-avatar" src="${comment.profilePicture || 'img/default.png'}" onerror="this.src='img/default.png'" data-citizenid="${comment.citizenid}" data-firstname="${comment.firstName}" data-lastname="${comment.lastName}" data-profilepicture="${comment.profilePicture || 'img/default.png'}">
                    <div class="pulse-comment-content">
                        <div class="pulse-comment-top">
                            <div class="pulse-comment-author">${comment.firstName} ${comment.lastName}</div>
                            <div class="pulse-comment-time">${timeAgo}</div>
                        </div>
                        <div class="pulse-comment-text">${comment.comment}</div>
                    </div>
                </div>
            `;
            commentsContainer.append(commentHtml);
        });
    } else {
        commentsContainer.html('<div class="pulse-no-comments">No comments yet. Be the first to comment!</div>');
    }
}
