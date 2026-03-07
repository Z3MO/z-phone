QB.Phone.Functions.SetupMails = function(Mails) {
    var mailList = $(".mail-list");
    mailList.html(""); // Clear the list

    if (Mails && Mails.length > 0) {
        Mails.sort((a, b) => new Date(b.date) - new Date(a.date)); // Sort by most recent

        $.each(Mails, function(i, mail) {
            var date = new Date(mail.date);
            var timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            var today = new Date();
            var isToday = date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
            var displayDate = isToday ? timeString : date.toLocaleDateString([], { month: 'short', day: 'numeric' });

            // Simple sanitation
            var messagePreview = mail.message.replace(/<[^>]*>?/gm, '');
            if (messagePreview.length > 80) {
                messagePreview = messagePreview.substring(0, 80) + '...';
            }

            var senderInitial = (mail.sender && mail.sender.length > 0) ? mail.sender.charAt(0).toUpperCase() : '?';
            
            // Generate a consistent color based on sender name length/char code
            var colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#6366f1'];
            var colorIndex = (mail.sender.length + mail.sender.charCodeAt(0)) % colors.length;
            var avatarColor = colors[colorIndex];

            var element = `
                <div class="mail-item ${mail.read ? '' : 'unread'}" data-mailid="${mail.mailid}">
                    <div class="mail-item-avatar" style="background: linear-gradient(135deg, ${avatarColor}, ${adjustColor(avatarColor, -20)})">${senderInitial}</div>
                    <div class="mail-item-content">
                        <div class="mail-sender">
                            ${mail.sender}
                            <span class="mail-time">${displayDate}</span>
                        </div>
                        <div class="mail-subject">${mail.subject}</div>
                        <div class="mail-preview">${messagePreview}</div>
                    </div>
                </div>`;
            mailList.append(element);
            $(`.mail-item[data-mailid="${mail.mailid}"]`).data('mailData', mail);
        });
    } else {
        mailList.html(`
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 50%; color: #a1a1aa; background-color: transparent; font-family: sans-serif;">
                <i class="fa-solid fa-inbox" style="font-size: 5vh; margin-bottom: 2vh; opacity: 0.3;"></i>
                <div style="font-size: 2vh; font-weight: 600; color: #f9fafb;">No Mail</div>
                <div style="font-size: 1.5vh;">Your inbox is empty</div>
            </div>
        `);
    }
};

// Helper to darken color for gradient
function adjustColor(color, amount) {
    return '#' + color.replace(/^#/, '').replace(/../g, color => ('0'+Math.min(255, Math.max(0, parseInt(color, 16) + amount)).toString(16)).substr(-2));
}

$(document).on('click', '.mail-item', function(e) {
    e.preventDefault();
    var mailData = $(this).data('mailData');

    // Mark as read
    if (!mailData.read) {
        $(this).removeClass('unread');
        QB.Phone.NUI.postLegacy("SetMailRead", { mailId: mailData.mailid });
    }

    // Populate details view
    $('#mail-details-sender').text(mailData.sender);
    
    var senderInitial = (mailData.sender && mailData.sender.length > 0) ? mailData.sender.charAt(0).toUpperCase() : '?';
    var colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#6366f1'];
    var colorIndex = (mailData.sender.length + mailData.sender.charCodeAt(0)) % colors.length;
    var avatarColor = colors[colorIndex];

    var detailsContent = `
        <div class="mail-details-subject">${mailData.subject}</div>
        <div class="mail-details-meta">
            <div class="mail-details-avatar" style="background: linear-gradient(135deg, ${avatarColor}, ${adjustColor(avatarColor, -20)})">${senderInitial}</div>
            <div class="mail-details-info">
                <div class="mail-details-from">${mailData.sender}</div>
                <div class="mail-details-time">${new Date(mailData.date).toLocaleString()}</div>
            </div>
        </div>
        <div class="mail-details-message">${mailData.message}</div>
    `;

    var actionsHtml = '<div class="mail-details-actions">';
    if (mailData.button && JSON.stringify(mailData.button) !== "[]") {
        actionsHtml += `<div class="mail-action-button mail-accept-button" data-mailid="${mailData.mailid}"><i class="fa-solid fa-check"></i> Accept</div>`;
    }
    actionsHtml += `<div class="mail-action-button mail-delete-button" data-mailid="${mailData.mailid}"><i class="fa-solid fa-trash"></i> Delete Email</div>`;
    actionsHtml += '</div>';

    detailsContent += actionsHtml;

    $('.mail-details-content').html(detailsContent);
    $('.mail-details-content').data('mailData', mailData);

    // Animate views
    $('.mail-home').css("transform", "translateX(-30%)");
    $('.mail-details-view').css("transform", "translateX(0)");
});

$(document).on('click', '#mail-back', function(e) {
    e.preventDefault();
    $('.mail-home').css("transform", "translateX(0)");
    $('.mail-details-view').css("transform", "translateX(100%)");
});

$(document).on('click', '.mail-accept-button', function(e) {
    e.preventDefault();
    e.stopPropagation();
    var mailData = $('.mail-details-content').data('mailData');
    if (mailData && mailData.button) {
        QB.Phone.NUI.postLegacy("AcceptMailButton", {
            buttonEvent: mailData.button.buttonEvent,
            buttonData: mailData.button.buttonData,
            isServer: mailData.button.isServer,
            mailId: mailData.mailid,
        });
        // Go back to the list after accepting
        $('#mail-back').click();
    }
});

$(document).on('click', '.mail-list-action-delete', function(e) {
    e.preventDefault();
    e.stopPropagation();
    var mailId = $(this).data('mailid');
    var item = $(this).closest('.mail-item');
    
    QB.Phone.NUI.postLegacy("RemoveMail", {
        mailId: mailId
    });
    
    item.slideUp(200, function() { $(this).remove(); });
});

$(document).on('click', '.mail-delete-button', function(e) {
    e.preventDefault();
    e.stopPropagation();
    var mailId = $(this).data('mailid');
    QB.Phone.NUI.postLegacy("RemoveMail", {
        mailId: mailId
    });
    // Go back to the list after deleting
    $('#mail-back').click();
});

$(document).on("keyup", "#mail-search", function() {
    var value = $(this).val().toLowerCase();
    $(".mail-item").filter(function() {
        $(this).toggle($(this).text().toLowerCase().indexOf(value) > -1);
    });
});