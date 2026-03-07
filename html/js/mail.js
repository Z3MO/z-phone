/**
 * Mail app – component-pattern implementation.
 *
 * All event listeners are attached inside onMount and removed in onUnmount,
 * preventing listener accumulation across app open/close cycles.
 * An EventBus subscription refreshes the list whenever a new mail arrives
 * while the app is mounted.
 */

// ── Shared helpers ────────────────────────────────────────────────────────────

function adjustColor(color, amount) {
    return '#' + color.replace(/^#/, '').replace(/../g, color => ('0'+Math.min(255, Math.max(0, parseInt(color, 16) + amount)).toString(16)).substr(-2));
}

var _MAIL_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#6366f1'];
function _mailAvatarColor(sender) {
    var idx = (sender.length + sender.charCodeAt(0)) % _MAIL_COLORS.length;
    return _MAIL_COLORS[idx];
}

// ── Data renderer (no listener binding – pure DOM) ───────────────────────────

QB.Phone.Functions.SetupMails = function(Mails) {
    var mailList = document.querySelector('.mail-list');
    mailList.innerHTML = '';

    if (Mails && Mails.length > 0) {
        Mails.sort(function(a, b) { return new Date(b.date) - new Date(a.date); });

        var fragment = document.createDocumentFragment();
        Mails.forEach(function(mail) {
            var date = new Date(mail.date);
            var timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            var today = new Date();
            var isToday = date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
            var displayDate = isToday ? timeString : date.toLocaleDateString([], { month: 'short', day: 'numeric' });

            var messagePreview = mail.message.replace(/<[^>]*>?/gm, '');
            if (messagePreview.length > 80) messagePreview = messagePreview.substring(0, 80) + '...';

            var senderInitial = (mail.sender && mail.sender.length > 0) ? mail.sender.charAt(0).toUpperCase() : '?';
            var avatarColor = _mailAvatarColor(mail.sender);

            var div = document.createElement('div');
            div.className = 'mail-item' + (mail.read ? '' : ' unread');
            div.setAttribute('data-mailid', mail.mailid);
            div.innerHTML =
                '<div class="mail-item-avatar" style="background: linear-gradient(135deg, ' + avatarColor + ', ' + adjustColor(avatarColor, -20) + ')">' + senderInitial + '</div>' +
                '<div class="mail-item-content">' +
                    '<div class="mail-sender">' + mail.sender + '<span class="mail-time">' + displayDate + '</span></div>' +
                    '<div class="mail-subject">' + mail.subject + '</div>' +
                    '<div class="mail-preview">' + messagePreview + '</div>' +
                '</div>';
            $(div).data('mailData', mail);
            fragment.appendChild(div);
        });
        mailList.appendChild(fragment);
    } else {
        mailList.innerHTML =
            '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:50%;color:#a1a1aa;">' +
                '<i class="fa-solid fa-inbox" style="font-size:5vh;margin-bottom:2vh;opacity:0.3;"></i>' +
                '<div style="font-size:2vh;font-weight:600;color:#f9fafb;">No Mail</div>' +
                '<div style="font-size:1.5vh;">Your inbox is empty</div>' +
            '</div>';
    }
};

// ── Component definition ──────────────────────────────────────────────────────

var _mailClickHandler = null;
var _mailSearchHandler = null;
var _mailNewMailHandler = null;
var _mailSearchTimer = null;

QB.Phone.ComponentManager.register('mail', {
    onMount: function () {
        var appEl = document.querySelector('.mail-app');

        // ── Single delegated click handler ────────────────────────────────────
        _mailClickHandler = function (e) {
            var target = e.target;

            // Mail item row → open detail view
            var itemEl = target.closest('.mail-item');
            if (itemEl && !target.closest('.mail-list-action-delete')) {
                e.preventDefault();
                var mailData = $(itemEl).data('mailData');
                if (!mailData) return;

                if (!mailData.read) {
                    itemEl.classList.remove('unread');
                    $.post('https://' + GetParentResourceName() + '/SetMailRead', JSON.stringify({ mailId: mailData.mailid }));
                }

                var senderInitial = (mailData.sender && mailData.sender.length > 0) ? mailData.sender.charAt(0).toUpperCase() : '?';
                var avatarColor = _mailAvatarColor(mailData.sender);

                var detailsContent =
                    '<div class="mail-details-subject">' + mailData.subject + '</div>' +
                    '<div class="mail-details-meta">' +
                        '<div class="mail-details-avatar" style="background: linear-gradient(135deg, ' + avatarColor + ', ' + adjustColor(avatarColor, -20) + ')">' + senderInitial + '</div>' +
                        '<div class="mail-details-info">' +
                            '<div class="mail-details-from">' + mailData.sender + '</div>' +
                            '<div class="mail-details-time">' + new Date(mailData.date).toLocaleString() + '</div>' +
                        '</div>' +
                    '</div>' +
                    '<div class="mail-details-message">' + mailData.message + '</div>';

                var actionsHtml = '<div class="mail-details-actions">';
                if (mailData.button && !(Array.isArray(mailData.button) && mailData.button.length === 0)) {
                    actionsHtml += '<div class="mail-action-button mail-accept-button" data-mailid="' + mailData.mailid + '"><i class="fa-solid fa-check"></i> Accept</div>';
                }
                actionsHtml += '<div class="mail-action-button mail-delete-button" data-mailid="' + mailData.mailid + '"><i class="fa-solid fa-trash"></i> Delete Email</div>';
                actionsHtml += '</div>';

                var detailsEl = document.querySelector('.mail-details-content');
                detailsEl.innerHTML = detailsContent + actionsHtml;
                $(detailsEl).data('mailData', mailData);

                document.querySelector('.mail-home').style.transform = 'translateX(-30%)';
                document.querySelector('.mail-details-view').style.transform = 'translateX(0)';
                return;
            }

            // Delete from list
            var listDeleteEl = target.closest('.mail-list-action-delete');
            if (listDeleteEl) {
                e.preventDefault();
                e.stopPropagation();
                var mailId = listDeleteEl.dataset.mailid;
                var item = listDeleteEl.closest('.mail-item');
                $.post('https://' + GetParentResourceName() + '/RemoveMail', JSON.stringify({ mailId: mailId }));
                $(item).slideUp(200, function () { $(this).remove(); });
                return;
            }

            // Back button
            if (target.closest('#mail-back')) {
                e.preventDefault();
                document.querySelector('.mail-home').style.transform = 'translateX(0)';
                document.querySelector('.mail-details-view').style.transform = 'translateX(100%)';
                return;
            }

            // Accept button in detail view
            var acceptEl = target.closest('.mail-accept-button');
            if (acceptEl) {
                e.preventDefault();
                e.stopPropagation();
                var detContent = document.querySelector('.mail-details-content');
                var mData = $(detContent).data('mailData');
                if (mData && mData.button) {
                    $.post('https://' + GetParentResourceName() + '/AcceptMailButton', JSON.stringify({
                        buttonEvent: mData.button.buttonEvent,
                        buttonData:  mData.button.buttonData,
                        isServer:    mData.button.isServer,
                        mailId:      mData.mailid,
                    }));
                    document.querySelector('#mail-back').click();
                }
                return;
            }

            // Delete button in detail view
            var deleteEl = target.closest('.mail-delete-button');
            if (deleteEl) {
                e.preventDefault();
                e.stopPropagation();
                var mId = deleteEl.dataset.mailid;
                $.post('https://' + GetParentResourceName() + '/RemoveMail', JSON.stringify({ mailId: mId }));
                document.querySelector('#mail-back').click();
                return;
            }
        };

        // ── Search handler (debounced) ────────────────────────────────────────
        _mailSearchHandler = function () {
            clearTimeout(_mailSearchTimer);
            var input = this;
            _mailSearchTimer = setTimeout(function () {
                var value = input.value.toLowerCase();
                document.querySelectorAll('.mail-item').forEach(function (el) {
                    el.style.display = el.textContent.toLowerCase().indexOf(value) > -1 ? '' : 'none';
                });
            }, 150);
        };

        // ── EventBus subscription – refresh when a new mail arrives ───────────
        _mailNewMailHandler = function (data) {
            if (QB.Phone.Data.currentApplication === 'mail' && data.Mails) {
                QB.Phone.Functions.SetupMails(data.Mails);
            }
        };

        appEl.addEventListener('click', _mailClickHandler);
        var searchEl = document.querySelector('#mail-search');
        if (searchEl) searchEl.addEventListener('keyup', _mailSearchHandler);
        QB.Phone.EventBus.on('phone:newMail', _mailNewMailHandler);
    },

    onUnmount: function () {
        var appEl = document.querySelector('.mail-app');
        if (appEl && _mailClickHandler) appEl.removeEventListener('click', _mailClickHandler);
        var searchEl = document.querySelector('#mail-search');
        if (searchEl && _mailSearchHandler) searchEl.removeEventListener('keyup', _mailSearchHandler);
        QB.Phone.EventBus.off('phone:newMail', _mailNewMailHandler);

        clearTimeout(_mailSearchTimer);
        _mailClickHandler  = null;
        _mailSearchHandler = null;
        _mailNewMailHandler = null;
        _mailSearchTimer   = null;
    }
});
