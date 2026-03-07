var JoinPass = null;
var JoinID = null;
var Status = null;

function ClearPartyInputs() {
    $(".jobcenter-input-group-name").val("");
    $(".jobcenter-input-password").val("");
    $(".jobcenter-input-password2").val("");
    $(".jobcenter-input-join-password").val("");
}

function LoadJobCenterApp(){
    QB.Phone.NUI.postLegacy("GetGroupsApp", {}, function(data) {
        AddDIV(data)
    });
}

function LoadJobCenter(){
    QB.Phone.NUI.postLegacy("GetJobCentersJobs", {}, function(Jobs) {
        $(".job-list").html("");
        for (const [k, v] of Object.entries(Jobs)) {
            let bgStyle = "";
            let hasImage = "";
            if (v.image) {
                bgStyle = `style="--job-bg-image: url('${v.image}');"`;
                hasImage = " has-image";
            }
            var AddOption = '<div class="job-class-body-job'+hasImage+'" '+bgStyle+'><span>'+v.label+'</span><div class="job-showitems-other"><i data-event="'+v.event+'" id="job-icon-class" class="fas fa-map-marked-alt"></i></div></div>'
            $('.job-list').append(AddOption);
        }
    });
};

// Tab Navigation: Jobs
$(document).on('click', '#party-tab-jobs', function(e){
    e.preventDefault();
    if ($(this).hasClass('active')) return;
    $('.party-footer-tab').removeClass('active');
    $(this).addClass('active');
    
    ClearPartyInputs();
    LoadJobCenter();
    
    $(".party-plus-icon").fadeOut(300);
    
    $(".jobcenter-list").stop().animate({
        left: "-100%",
        opacity: 0
    }, 300, function(){
        $(this).css("display", "none");
    });

    $(".job-list").stop().css({
        "display": "block",
        "left": "100%",
        "opacity": 0
    }).animate({
        left: "5%",
        opacity: 1
    }, 300);
});

// Tab Navigation: Groups
$(document).on('click', '#party-tab-groups', function(e){
    e.preventDefault();
    if ($(this).hasClass('active')) return;
    $('.party-footer-tab').removeClass('active');
    $(this).addClass('active');

    ClearPartyInputs();
    LoadJobCenterApp();
    
    $(".party-plus-icon").fadeIn(300);
    
    $(".job-list").stop().animate({
        left: "100%",
        opacity: 0
    }, 300, function(){
        $(this).css("display", "none");
    });

    $(".jobcenter-list").stop().css({
        "display": "block",
        "left": "-100%",
        "opacity": 0
    }).animate({
        left: "5%",
        opacity: 1
    }, 300);
});

// Job Icon Click
$(document).on('click', '#job-icon-class', function(e){
    e.preventDefault();
    var event = $(this).data('event')
    QB.Phone.NUI.postLegacy("CasinoPhoneJobCenter", {
        event: event,
    });
});

// Create Group Action
$(document).on('click', '#party-plus-action', function(e){
    e.preventDefault();
    ClearPartyInputs();
    $('#jobcenter-box-new-dashboard').fadeIn(350);
});

$(document).on('click', '#jobcenter-submit-create-group', function(e){
    e.preventDefault();
    var Name = $(".jobcenter-input-group-name").val();
    var pass = $(".jobcenter-input-password").val();
    var pass2 = $(".jobcenter-input-password2").val();
    if (Name != "" && pass != "" && pass2 != ""){
        if(pass == pass2){
            QB.Phone.NUI.postLegacy("jobcenter_CreateJobGroup", {
                name: Name,
                pass: pass,
            });
            $('#jobcenter-box-new-dashboard').fadeOut(350);
        }else{
            QB.Phone.Notifications.Add("fas fa-exclamation-circle", "System", "The password entered is incorrect")
        }
    }else{
        QB.Phone.Notifications.Add("fas fa-exclamation-circle", "System", "Fields are incorrect")
    }
});

$(document).ready(function(){
    window.addEventListener('message', function(event) {
        switch(event.data.action) {
            case "refreshApp":
                $(".jobcenter-list").stop().css({"display": "block", "left": "5%", "opacity": "1"});
                $(".job-list").stop().css({"display": "none"});
                $(".party-plus-icon").stop().css({"display": "flex", "opacity": "1"});
                $(".jobcenter-header").css({"display": "flex"});
                $(".jobcenter-text-header").css({"display": "flex"});
                // Ensure member list is hidden on refresh
                if ($('#jobcenter-box-new-player-name').is(':visible')) {
                    $('#jobcenter-box-new-player-name').fadeOut(100);
                }
                AddDIV(event.data.data);
                break;
        }
    })
});

function AddDIV(data){
    var AddOption;
    var CSN = QB.Phone.Data.PlayerData.source;
    $(".jobcenter-list").html("");
    if(data) {
        Object.keys(data).map(function(element,index){
            var State = "NONE";
            if(data[element].leader == CSN) {
                State = "LEADER";
            } else {
                Object.keys(data[element].members).map(function(element2, _){
                    if(data[element].members[element2].Player == CSN) {
                        State = "MEMBER";
                    }
                })
            }

            var GPass = data[element].GPass;
            if (GPass === null || GPass === undefined || GPass === "null" || GPass === "undefined") {
                GPass = "";
            }
            var EscapedPass = String(GPass).replace(/"/g, '&quot;');

            AddOption = `
            <div class="jobcenter-div-job-group" data-id="${data[element].id}" data-state="${State}" data-pass="${EscapedPass}" data-status="${data[element].status}">
                <div class="jobcenter-div-job-group-image"><i class="fas fa-users"></i></div>
                <div class="jobcenter-div-job-group-body-main">
                    ${data[element].GName}
                </div>
                <div class="jobcenter-option-class-body">
                    <i class="fas fa-user"></i> <span>${data[element].Users}</span>
                </div>
            </div>`
            $('.jobcenter-list').append(AddOption);
        })
    } else {
        $(".jobcenter-list").html("");
        var AddOption = '<div class="casino-text-clear">No Group</div>'
        $('.jobcenter-list').append(AddOption);
    }
}

// Join Group Action (from inside member view)
$(document).on('click', '#btn-join-group', function(e){
    e.preventDefault();
    // The global variables JoinPass, JoinID, and Status are now set when the group card is clicked.
    ClearPartyInputs();
    if (Status == 'WAITING') {
        // Also check if a password is required for the group
        if (JoinPass && String(JoinPass) !== "" && String(JoinPass) !== "null" && String(JoinPass) !== "undefined") {
            $('#jobcenter-box-new-player-name').fadeOut(350);
            $('#jobcenter-box-new-join').fadeIn(350);
        } else {
            // No password, join directly
            var CSN = QB.Phone.Data.PlayerData.citizenid;
            QB.Phone.NUI.postLegacy("jobcenter_JoinTheGroup", {
                PCSN: CSN,
                id: parseInt(JoinID),
            });
            $('#jobcenter-box-new-player-name').fadeOut(350);
            QB.Phone.Notifications.Add("fas fa-check-circle", "System", "Joined group successfully!", "#2ecc71", 2500);
        }
    } else {
        QB.Phone.NUI.postLegacy("jobcenter_GroupBusy", {});
    }
});

$(document).on('click', '#jobcenter-submit-join-group', function(e){
    e.preventDefault();
    var EnterPass = $(".jobcenter-input-join-password").val();
    if(String(EnterPass) === String(JoinPass)){
        var CSN = QB.Phone.Data.PlayerData.citizenid;
        QB.Phone.NUI.postLegacy("jobcenter_JoinTheGroup", {
            PCSN: CSN,
            id: parseInt(JoinID),
        });
        ClearPartyInputs();
        $('#jobcenter-box-new-join').fadeOut(350);
    } else {
        QB.Phone.Notifications.Add("fas fa-exclamation-circle", "System", "Incorrect Password", "#e74c3c", 2500);
    }
});

// Click on Group Card to open details
$(document).on('click', '.jobcenter-div-job-group', function(e){
    e.preventDefault();
    var id = $(this).attr('data-id');
    var state = $(this).data('state');
    var pass = $(this).attr('data-pass');
    if (pass === undefined || pass === null) pass = "";
    var status = $(this).attr('data-status');

    // Store group data in global variables to be used by the action buttons inside the modal.
    // This avoids issues with passing data (like passwords with special characters) through data-attributes.
    JoinID = id;
    JoinPass = pass;
    Status = status;

    QB.Phone.NUI.postLegacy("jobcenter_CheckPlayerNames", {
        id: parseInt(id),
        }, function(ResponseData) {
           ClearPartyInputs();
           $('#jobcenter-box-new-player-name').fadeIn(350);
           $("#phone-new-box-main-playername").html("");
           
            // 1. Render Members Section
            var membersSection = $('<div class="jobcenter-members-section"></div>');
            for (const [k, v] of Object.entries(ResponseData.members) {
                var icon = v.isLeader ? "fa-crown" : "fa-user";
                var roleClass = v.isLeader ? "leader" : "member";
                var AddOption = `<div class="jobcenter-playerlist-name"><div class="jobcenter-div-job-group-image ${roleClass}"><i class="fas ${icon}"></i></div><div class="jobcenter-member-name">${v.name}</div></div>`
                membersSection.append(AddOption);
            }
            $('#phone-new-box-main-playername').append(membersSection);
            
            // 2. Render Tasks Section
            if (ResponseData.tasks && Object.keys(ResponseData.tasks).length > 0) {
                var tasksSection = $('<div class="jobcenter-tasks-section"></div>');
                tasksSection.append('<div class="jobcenter-task-list-header">OBJECTIVES</div>');
                var taskListContainer = $('<div class="jobcenter-task-list-container"></div>');
                tasksSection.append(taskListContainer);

                let firstActiveFound = false;
                for (const [k, v] of Object.entries(ResponseData.tasks)) {
                    let max = v.max || 1;
                    let count = v.count || 0;
                    let isDone = v.isDone;
                    let statusClass = isDone ? 'completed' : '';
                    let activeClass = '';

                    if (!isDone && !firstActiveFound) {
                        activeClass = 'active';
                        firstActiveFound = true;
                    }

                    var taskHTML = `
                        <div class="task-timeline-item ${statusClass} ${activeClass}">
                            <div class="task-timeline-connector"></div>
                            <div class="task-timeline-dot"></div>
                            <div class="task-timeline-content">
                                <div class="task-timeline-title">${v.name}</div>
                                <div class="task-timeline-progress">${count}/${max}</div>
                            </div>
                        </div>`;
                    taskListContainer.append(taskHTML);
                }
                $('#phone-new-box-main-playername').append(tasksSection);
            }
            
            // 3. Render Action Button Section
            var actionsSection = $('<div class="jobcenter-actions-section"></div>');
            var ActionBtn = "";
            if (state === "LEADER") {
                ActionBtn = `<div class="jobcenter-group-action-btn" id="btn-delete-group" data-id="${id}" style="background: #ef4444;"><i class="fas fa-trash-alt"></i> Delete Group</div>`;
            } else if (state === "MEMBER") {
                ActionBtn = `<div class="jobcenter-group-action-btn" id="btn-leave-group" data-id="${id}" style="background: #f59e0b;"><i class="fas fa-sign-out-alt"></i> Leave Group</div>`;
            } else {
                // The button no longer needs to hold the data, as it's stored globally on card click.
                ActionBtn = `<div class="jobcenter-group-action-btn" id="btn-join-group" style="background: #3b82f6;"><i class="fas fa-sign-in-alt"></i> Join Group</div>`;
            }
            actionsSection.append(ActionBtn);
            $('#phone-new-box-main-playername').append(actionsSection);
    });
});

// Delete Group Action
$(document).on('click', '#btn-delete-group', function(e){
    e.preventDefault();
    var Delete = $(this).data('id');
    QB.Phone.NUI.postLegacy("jobcenter_DeleteGroup", {
        delete: Delete,
    });
    $('#jobcenter-box-new-player-name').fadeOut(350);
});

// Leave Group Action
$(document).on('click', '#btn-leave-group', function(e){
    e.preventDefault();
    var CSN = QB.Phone.Data.PlayerData.citizenid;
    var id = $(this).data('id');
    QB.Phone.NUI.postLegacy("jobcenter_leave_grouped", {
        id: id,
        csn: CSN,
    });
    $('#jobcenter-box-new-player-name').fadeOut(350);
});
