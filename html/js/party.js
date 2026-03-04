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
    $.post(`https://${GetParentResourceName()}/GetGroupsApp`, JSON.stringify({}), function(data){
        AddDIV(data)
    });
}

function LoadJobCenter(){
    $.post(`https://${GetParentResourceName()}/GetJobCentersJobs`, JSON.stringify({}), function(Jobs){
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
    $.post(`https://${GetParentResourceName()}/CasinoPhoneJobCenter`, JSON.stringify({
        event: event,
    }));
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
            $.post(`https://${GetParentResourceName()}/jobcenter_CreateJobGroup`, JSON.stringify({
                name: Name,
                pass: pass,
            }));
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
                // Reset to Groups view on refresh
                $(".jobcenter-list").stop().css({"display": "block", "left": "5%", "opacity": "1"});
                $(".job-list").stop().css({"display": "none"});
                $(".party-plus-icon").stop().css({"display": "flex", "opacity": "1"});
                $(".jobcenter-header").css({"display": "flex"}); // Show footer
                $(".jobcenter-text-header").css({"display": "flex"});
                $(".jobcenter-Groupjob").css({"margin-top": "47%"});
                clearInterval(Interval);
                tens = "00";
                seconds = "00";
                minutes = "00";
                appendTens.innerHTML = tens;
                appendSeconds.innerHTML = seconds;
                appendminutes.innerHTML = minutes;
                $(".jobcenter-groupjob-timer").css({"display": "none"});
            AddDIV(event.data.data)
            break;
            case "addGroupStage":
                AddGroupJobs(event.data.status)
            break;
        }
    })
});

$(document).ready(function(){
    window.addEventListener('message', function(event) {
        switch(event.data.action) {
            case "GroupAddDIV":
                if(event.data.showPage && event.data.job != "WAITING"){
                    AddGroupJobs(event.data.stage)
                } else {
                    AddDIV(event.data.data)
                }
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

            AddOption = `
            <div class="jobcenter-div-job-group" data-id="${data[element].id}" data-state="${State}" data-pass="${data[element].GPass}" data-status="${data[element].status}">
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

function AddGroupJobs(data){
    var AddOption;
    $(".jobcenter-Groupjob").html("");
    $(".jobcenter-Groupjob").css({"margin-top": "23%"});
    $(".jobcenter-list").html("");
    $(".jobcenter-list").css({"display": "none"});
    $(".party-plus-icon").css({"display": "none"});
    $(".jobcenter-header").css({"display": "none"}); // Hide footer during active job
    $(".jobcenter-text-header").css({"display": "none"});
    clearInterval(Interval);
    Interval = setInterval(startTimer, 10);
    if(data) {


        for (const [k, v] of Object.entries(data)) {
            let max = 1;
            let count = 0;
            if (v.max) {
                max = v.max
            }
            if (v.count) {
                count = v.count
            }
            if (v.isDone) {
                AddOption =
                `
                <div class="jobcenter-div-active-stagee isDone">
                <p class="jobcenter-job-value"> ${max} / ${max}</p>
                    <i style="margin-bottom:15px; class="jobcenter-div-active-stage${v.id}">${v.name}</i>
                </div>
                `
            } else {
                AddOption =
                `
                <div class="jobcenter-div-active-stagee">
                <p class="jobcenter-job-value"> ${count} / ${max} </p>
                    <i style="margin-bottom:15px;" class="jobcenter-div-active-stage${v.id}">${v.name}</i>
                </div>
                `
            }
            $('.jobcenter-Groupjob').append(AddOption);
        }
    } else {
        $(".jobcenter-list").css({"display": "block"});
        $(".jobcenter-header").css({"display": "flex"});
        $(".party-plus-icon").css({"display": "flex"});
        $(".jobcenter-Groupjob").css({"margin-top": "47%"});
    }
}

// Join Group Action (from inside member view)
$(document).on('click', '#btn-join-group', function(e){
    e.preventDefault();
    JoinPass = $(this).attr('data-pass');
    JoinID = $(this).data('id');
    Status = $(this).data('status');
    ClearPartyInputs();
    if (Status == 'WAITING') {
        $('#jobcenter-box-new-join').fadeIn(350);
    } else {
        $.post(`https://${GetParentResourceName()}/jobcenter_GroupBusy`, JSON.stringify({}));
    }
});

$(document).on('click', '#jobcenter-submit-join-group', function(e){
    e.preventDefault();
    var EnterPass = $(".jobcenter-input-join-password").val();
    if(String(EnterPass) === String(JoinPass)){
        var CSN = QB.Phone.Data.PlayerData.citizenid;
        $.post(`https://${GetParentResourceName()}/jobcenter_JoinTheGroup`, JSON.stringify({
            PCSN: CSN,
            id: parseInt(JoinID),
        }));
        ClearPartyInputs();
        $('#jobcenter-box-new-join').fadeOut(350);
    } else {
        QB.Phone.Notifications.Add("fas fa-exclamation-circle", "System", "Incorrect Password", "#e74c3c", 2500);
    }
});

// Click on Group Card to open details
$(document).on('click', '.jobcenter-div-job-group', function(e){
    e.preventDefault();
    var id = $(this).data('id');
    var state = $(this).data('state');
    var pass = $(this).attr('data-pass');
    var status = $(this).data('status');

    $.post(`https://${GetParentResourceName()}/jobcenter_CheckPlayerNames`, JSON.stringify({
        id: id,
        }), function(Data){
           ClearPartyInputs();
           $('#jobcenter-box-new-player-name').fadeIn(350);
           $("#phone-new-box-main-playername").html("");
            for (const [k, v] of Object.entries(Data)) {
                var AddOption = `<div class="jobcenter-playerlist-name"><div class="jobcenter-div-job-group-image"><i class="fas fa-users"></i></div>${v}`
                $('#phone-new-box-main-playername').append(AddOption);
            }
            
            // Add Action Button based on State
            var ActionBtn = "";
            if (state === "LEADER") {
                ActionBtn = `<div class="jobcenter-group-action-btn" id="btn-delete-group" data-id="${id}" style="background: #ef4444;"><i class="fas fa-trash-alt"></i> Delete Group</div>`;
            } else if (state === "MEMBER") {
                ActionBtn = `<div class="jobcenter-group-action-btn" id="btn-leave-group" data-id="${id}" style="background: #f59e0b;"><i class="fas fa-sign-out-alt"></i> Leave Group</div>`;
            } else {
                ActionBtn = `<div class="jobcenter-group-action-btn" id="btn-join-group" data-id="${id}" data-pass="${pass}" data-status="${status}" style="background: #3b82f6;"><i class="fas fa-sign-in-alt"></i> Join Group</div>`;
            }
            $('#phone-new-box-main-playername').append(ActionBtn);
            $('#phone-new-box-main-playername').append('<p> </p>');
    });
});

// Delete Group Action
$(document).on('click', '#btn-delete-group', function(e){
    e.preventDefault();
    var Delete = $(this).data('id');
    $.post(`https://${GetParentResourceName()}/jobcenter_DeleteGroup`, JSON.stringify({
        delete: Delete,
    }));
    $('#jobcenter-box-new-player-name').fadeOut(350);
});

// Leave Group Action
$(document).on('click', '#btn-leave-group', function(e){
    e.preventDefault();
    var CSN = QB.Phone.Data.PlayerData.citizenid;
    var id = $(this).data('id');
    $.post(`https://${GetParentResourceName()}/jobcenter_leave_grouped`, JSON.stringify({
        id: id,
        csn: CSN,
    }));
    $('#jobcenter-box-new-player-name').fadeOut(350);
});

var minutes = 00;
var seconds = 00;
var tens = 00;
var appendTens = document.getElementById("tens")
var appendSeconds = document.getElementById("seconds")
var appendminutes = document.getElementById("minutes")
var buttonStart = document.getElementById('button-start');
var buttonStop = document.getElementById('button-stop');
var buttonReset = document.getElementById('button-reset');
var Interval ;

function startTimer () {
    tens++;

    if(tens <= 9){
      appendTens.innerHTML = "0" + tens;
    }

    if (tens > 9){
      appendTens.innerHTML = tens;

    }

    if (tens > 99) {
      seconds++;
      appendSeconds.innerHTML = "0" + seconds;
      tens = 0;
      appendTens.innerHTML = "0" + 0;
    }

    if (seconds > 9){
      appendSeconds.innerHTML = seconds;
    }

    if (seconds > 60){
        minutes++;
        appendminutes.innerHTML = "0" + minutes;
        seconds = 0;
        appendSeconds.innerHTML = "0" + 0;
      }
  }