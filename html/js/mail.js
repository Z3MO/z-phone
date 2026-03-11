const MailAppState = {
    currentMailId: null,
    mails: new Map(),
};

const MAIL_AVATAR_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#6366f1'];
const MAIL_PREVIEW_LIMIT = 80;

function sanitizeMailText(value, fallback = '') {
    const safeValue = ZPhoneUI.sanitizeText(value);
    return safeValue || fallback;
}

function getMailListElement() {
    return document.querySelector('.mail-list');
}

function getMailDetailsElement() {
    return document.querySelector('.mail-details-content');
}

function getMailAvatarConfig(sender) {
    const safeSender = sanitizeMailText(sender, 'Unknown sender');
    const initial = safeSender.charAt(0).toUpperCase() || '?';
    const colorSeed = safeSender.length > 0 ? safeSender.charCodeAt(0) : 0;
    const colorIndex = (safeSender.length + colorSeed) % MAIL_AVATAR_COLORS.length;
    const baseColor = MAIL_AVATAR_COLORS[colorIndex];

    return {
        color: baseColor,
        initial,
        sender: safeSender,
    };
}

function adjustColor(color, amount) {
    return `#${color.replace(/^#/, '').replace(/../g, function (channel) {
        return (`0${Math.min(255, Math.max(0, Number.parseInt(channel, 16) + amount)).toString(16)}`).slice(-2);
    })}`;
}

function formatMailPreview(message) {
    const safeMessage = sanitizeMailText(message);
    return safeMessage.length > MAIL_PREVIEW_LIMIT ? `${safeMessage.slice(0, MAIL_PREVIEW_LIMIT)}...` : safeMessage;
}

function setMailPanelState(showDetails) {
    const home = document.querySelector('.mail-home');
    const details = document.querySelector('.mail-details-view');

    if (home) {
        home.style.transform = showDetails ? 'translateX(-30%)' : 'translateX(0)';
    }

    if (details) {
        details.style.transform = showDetails ? 'translateX(0)' : 'translateX(100%)';
    }
}

function createMailEmptyState() {
    const wrapper = document.createElement('div');
    const icon = document.createElement('i');
    const title = document.createElement('div');
    const description = document.createElement('div');

    wrapper.className = 'mail-empty-state';

    icon.className = 'fa-solid fa-inbox mail-empty-state-icon';

    title.textContent = 'No Mail';
    title.className = 'mail-empty-state-title';

    description.textContent = 'Your inbox is empty';
    description.className = 'mail-empty-state-text';

    wrapper.appendChild(icon);
    wrapper.appendChild(title);
    wrapper.appendChild(description);

    return wrapper;
}

function createMailItem(mail) {
    const avatarConfig = getMailAvatarConfig(mail.sender);
    const item = document.createElement('div');
    const avatar = document.createElement('div');
    const content = document.createElement('div');
    const senderRow = document.createElement('div');
    const sender = document.createElement('span');
    const time = document.createElement('span');
    const subject = document.createElement('div');
    const preview = document.createElement('div');
    const date = new Date(mail.date);
    const today = new Date();
    const isToday = date.getDate() === today.getDate()
        && date.getMonth() === today.getMonth()
        && date.getFullYear() === today.getFullYear();

    item.className = `mail-item${mail.read ? '' : ' unread'}`;
    item.dataset.mailid = String(mail.mailid);

    avatar.className = 'mail-item-avatar';
    avatar.style.background = `linear-gradient(135deg, ${avatarConfig.color}, ${adjustColor(avatarConfig.color, -20)})`;
    avatar.textContent = avatarConfig.initial;

    content.className = 'mail-item-content';
    senderRow.className = 'mail-sender';
    sender.textContent = avatarConfig.sender;

    time.className = 'mail-time';
    time.textContent = isToday
        ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : date.toLocaleDateString([], { month: 'short', day: 'numeric' });

    subject.className = 'mail-subject';
    subject.textContent = sanitizeMailText(mail.subject, 'No subject');

    preview.className = 'mail-preview';
    preview.textContent = formatMailPreview(mail.message) || 'No preview available';

    senderRow.appendChild(sender);
    senderRow.appendChild(time);
    content.appendChild(senderRow);
    content.appendChild(subject);
    content.appendChild(preview);
    item.appendChild(avatar);
    item.appendChild(content);

    return item;
}

function renderMailDetails(mailData) {
    const details = getMailDetailsElement();
    const headerSender = document.getElementById('mail-details-sender');

    if (!details || !mailData) {
        return;
    }

    const avatarConfig = getMailAvatarConfig(mailData.sender);
    const wrapper = document.createDocumentFragment();
    const subject = document.createElement('div');
    const meta = document.createElement('div');
    const avatar = document.createElement('div');
    const info = document.createElement('div');
    const from = document.createElement('div');
    const time = document.createElement('div');
    const message = document.createElement('div');
    const actions = document.createElement('div');

    MailAppState.currentMailId = String(mailData.mailid);
    details.textContent = '';
    if (headerSender) {
        headerSender.textContent = avatarConfig.sender;
    }

    subject.className = 'mail-details-subject';
    subject.textContent = sanitizeMailText(mailData.subject, 'No subject');

    meta.className = 'mail-details-meta';

    avatar.className = 'mail-details-avatar';
    avatar.style.background = `linear-gradient(135deg, ${avatarConfig.color}, ${adjustColor(avatarConfig.color, -20)})`;
    avatar.textContent = avatarConfig.initial;

    info.className = 'mail-details-info';

    from.className = 'mail-details-from';
    from.textContent = avatarConfig.sender;

    time.className = 'mail-details-time';
    time.textContent = new Date(mailData.date).toLocaleString();

    message.className = 'mail-details-message';
    message.textContent = sanitizeMailText(mailData.message, 'No message content.');

    actions.className = 'mail-details-actions';

    info.appendChild(from);
    info.appendChild(time);
    meta.appendChild(avatar);
    meta.appendChild(info);
    wrapper.appendChild(subject);
    wrapper.appendChild(meta);
    wrapper.appendChild(message);

    if (mailData.button && !Array.isArray(mailData.button) && mailData.button.buttonEvent) {
        const acceptButton = document.createElement('button');
        const icon = document.createElement('i');

        acceptButton.type = 'button';
        acceptButton.className = 'mail-action-button mail-accept-button';
        acceptButton.dataset.mailid = String(mailData.mailid);
        icon.className = 'fa-solid fa-check';
        acceptButton.appendChild(icon);
        acceptButton.appendChild(document.createTextNode(' Accept'));
        actions.appendChild(acceptButton);
    }

    const deleteButton = document.createElement('button');
    const deleteIcon = document.createElement('i');

    deleteButton.type = 'button';
    deleteButton.className = 'mail-action-button mail-delete-button';
    deleteButton.dataset.mailid = String(mailData.mailid);
    deleteIcon.className = 'fa-solid fa-trash';
    deleteButton.appendChild(deleteIcon);
    deleteButton.appendChild(document.createTextNode(' Delete Email'));
    actions.appendChild(deleteButton);

    wrapper.appendChild(actions);
    details.appendChild(wrapper);
}

function filterMailList(query) {
    const normalizedQuery = String(query || '').trim().toLowerCase();

    document.querySelectorAll('.mail-item').forEach(function (item) {
        item.style.display = item.textContent.toLowerCase().includes(normalizedQuery) ? '' : 'none';
    });
}

function removeMailLocally(mailId) {
    MailAppState.mails.delete(String(mailId));
    QB.Phone.Functions.SetupMails(Array.from(MailAppState.mails.values()));
}

QB.Phone.Functions.SetupMails = function (mails) {
    const mailList = getMailListElement();
    const searchInput = document.getElementById('mail-search');
    const sortedMails = Array.isArray(mails)
        ? [...mails].sort(function (left, right) {
            return new Date(right.date) - new Date(left.date);
        })
        : [];

    if (!mailList) {
        return;
    }

    MailAppState.mails.clear();
    mailList.textContent = '';

    if (sortedMails.length === 0) {
        mailList.appendChild(createMailEmptyState());
        setMailPanelState(false);
        return;
    }

    const fragment = document.createDocumentFragment();

    sortedMails.forEach(function (mail) {
        MailAppState.mails.set(String(mail.mailid), mail);
        fragment.appendChild(createMailItem(mail));
    });

    mailList.appendChild(fragment);

    if (searchInput) {
        filterMailList(searchInput.value);
    }
};

document.addEventListener('click', function (event) {
    const backButton = event.target.closest('#mail-back');
    const mailItem = event.target.closest('.mail-item');
    const acceptButton = event.target.closest('.mail-accept-button');
    const deleteButton = event.target.closest('.mail-delete-button');

    if (backButton) {
        event.preventDefault();
        MailAppState.currentMailId = null;
        setMailPanelState(false);
        return;
    }

    if (acceptButton) {
        event.preventDefault();
        event.stopPropagation();

        const mailData = MailAppState.mails.get(String(acceptButton.dataset.mailid));
        if (mailData && mailData.button) {
            ZPhoneUI.postNui('AcceptMailButton', {
                buttonEvent: mailData.button.buttonEvent,
                buttonData: mailData.button.buttonData,
                isServer: mailData.button.isServer,
                mailId: mailData.mailid,
            });
            MailAppState.currentMailId = null;
            setMailPanelState(false);
        }
        return;
    }

    if (deleteButton) {
        event.preventDefault();
        event.stopPropagation();

        const mailId = String(deleteButton.dataset.mailid);
        ZPhoneUI.postNui('RemoveMail', {
            mailId: Number(mailId),
        });
        removeMailLocally(mailId);
        MailAppState.currentMailId = null;
        setMailPanelState(false);
        return;
    }

    if (mailItem) {
        event.preventDefault();

        const mailData = MailAppState.mails.get(String(mailItem.dataset.mailid));
        if (!mailData) {
            return;
        }

        if (!mailData.read) {
            mailData.read = true;
            mailItem.classList.remove('unread');
            ZPhoneUI.postNui('SetMailRead', {
                mailId: mailData.mailid,
            });
        }

        renderMailDetails(mailData);
        setMailPanelState(true);
    }
});

document.addEventListener('input', function (event) {
    if (event.target && event.target.id === 'mail-search') {
        filterMailList(event.target.value);
    }
});
