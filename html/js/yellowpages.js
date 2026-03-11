const PROXI_POST_LIMIT = 200;
const PROXI_MODAL_DURATION = 350;
const PROXI_FEEDBACK_DURATION = 200;
const PROXI_FEEDBACK_DELAY = 1500;

function getProxiElements() {
    return {
        composer: document.getElementById('proxi-box-textt'),
        imageInput: document.querySelector('.proxi-box-image-input'),
        messageInput: document.querySelector('.proxi-box-textt-input'),
        list: document.querySelector('.proxi-list'),
        searchInput: document.getElementById('proxi-search'),
        feedback: document.querySelector('.phone-action-feedback'),
        feedbackLoading: document.querySelector('.feedback-content.loading'),
        feedbackSuccess: document.querySelector('.feedback-content.success'),
    };
}

function fadeProxiElement(element, show, duration, displayValue, onComplete) {
    if (!element) {
        if (typeof onComplete === 'function') {
            onComplete();
        }
        return;
    }

    element.style.transition = `opacity ${duration}ms ease`;

    if (show) {
        element.style.display = displayValue || 'block';
        element.style.opacity = '0';
        window.requestAnimationFrame(function () {
            element.style.opacity = '1';
        });
        if (typeof onComplete === 'function') {
            window.setTimeout(onComplete, duration);
        }
        return;
    }

    element.style.opacity = '0';
    window.setTimeout(function () {
        element.style.display = 'none';
        if (typeof onComplete === 'function') {
            onComplete();
        }
    }, duration);
}

function ConfirmationFrame() {
    const refs = getProxiElements();

    if (!refs.feedback) {
        return;
    }

    fadeProxiElement(refs.feedback, true, PROXI_FEEDBACK_DURATION, 'flex');

    if (refs.feedbackLoading) {
        refs.feedbackLoading.style.display = 'block';
    }

    if (refs.feedbackSuccess) {
        refs.feedbackSuccess.style.display = 'none';
    }

    window.setTimeout(function () {
        if (refs.feedbackLoading) {
            refs.feedbackLoading.style.display = 'none';
        }

        if (refs.feedbackSuccess) {
            refs.feedbackSuccess.style.display = 'block';
        }

        window.setTimeout(function () {
            fadeProxiElement(refs.feedback, false, PROXI_FEEDBACK_DURATION, 'flex');
        }, PROXI_FEEDBACK_DELAY);
    }, PROXI_FEEDBACK_DELAY);
}

function ClearProxiInput() {
    const refs = getProxiElements();

    if (refs.messageInput) {
        refs.messageInput.value = '';
    }

    if (refs.imageInput) {
        refs.imageInput.value = '';
    }
}

function showProxiComposer() {
    const refs = getProxiElements();
    fadeProxiElement(refs.composer, true, PROXI_MODAL_DURATION, 'flex');
}

function hideProxiComposer() {
    const refs = getProxiElements();
    fadeProxiElement(refs.composer, false, PROXI_MODAL_DURATION, 'flex');
}

function sanitizeProxiMessage(value) {
    return ZPhoneUI.sanitizeText(value).slice(0, PROXI_POST_LIMIT);
}

function formatPhoneNumber(phoneNumberString) {
    var cleaned = ('' + phoneNumberString).replace(/\D/g, '');
    var match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
    if (match) {
        return '(' + match[1] + ') ' + match[2] + '-' + match[3];
    }
    return phoneNumberString;
}

function createProxiEmptyState() {
    const wrapper = document.createElement('div');
    const title = document.createElement('div');
    const description = document.createElement('div');

    wrapper.className = 'proxi-empty-state';
    title.className = 'proxi-empty-state-title';
    description.className = 'proxi-empty-state-text';

    title.textContent = 'No Proxi posts yet';
    description.textContent = 'Create a new post to share your ad or update.';

    wrapper.appendChild(title);
    wrapper.appendChild(description);

    return wrapper;
}

function createProxiCard(proxi) {
    const safeMessage = sanitizeProxiMessage(proxi.message) || 'No message provided.';
    const safePhone = ZPhoneUI.sanitizeText(proxi.number);
    const safeImageUrl = ZPhoneUI.sanitizeImageUrl(proxi.url);
    const playerPhone = String(QB.Phone && QB.Phone.Data && QB.Phone.Data.PlayerData
        && QB.Phone.Data.PlayerData.charinfo && QB.Phone.Data.PlayerData.charinfo.phone || '');
    const card = document.createElement('div');
    const message = document.createElement('div');
    const contactInfo = document.createElement('div');
    const phoneIcon = document.createElement('i');
    const isOwnPost = safePhone === playerPhone;

    card.className = 'proxi';
    card.dataset.number = safePhone;

    message.className = 'proxi-message';
    message.textContent = safeMessage;

    contactInfo.className = 'proxi-contact-info';
    phoneIcon.className = 'fa-solid fa-square-phone';
    contactInfo.appendChild(phoneIcon);
    contactInfo.appendChild(document.createTextNode(` ${formatPhoneNumber(safePhone)}`));

    card.appendChild(message);
    card.appendChild(contactInfo);

    if (safeImageUrl) {
        const attachedToggle = document.createElement('div');
        const toggleText = document.createElement('p');
        const toggleHint = document.createElement('u');
        const image = document.createElement('img');
        const overlay = document.createElement('div');
        const eye = document.createElement('div');
        const eyeIcon = document.createElement('i');
        const imageText = document.createElement('div');
        const helperText = document.createElement('div');
        const helperLineBreak = document.createElement('p');

        attachedToggle.className = 'proxi-image-attached';
        attachedToggle.textContent = 'Images Attached: 1';
        toggleText.appendChild(toggleHint);
        toggleHint.textContent = 'Hide (click image to copy URL)';
        attachedToggle.appendChild(toggleText);

        image.className = 'image proxi-preview-image';
        image.src = safeImageUrl;
        image.alt = 'Attached Proxi image';

        overlay.className = 'proxi-block';
        eye.className = 'proxi-eye';
        eyeIcon.className = 'fas fa-eye';
        imageText.className = 'proxi-image-text';
        helperText.className = 'proxi-image-text-other';

        eye.appendChild(eyeIcon);
        imageText.textContent = 'Click to View';
        helperText.textContent = 'Only reveal images from those you';
        helperLineBreak.textContent = 'know are not dick heads';
        helperText.appendChild(helperLineBreak);

        overlay.appendChild(eye);
        overlay.appendChild(imageText);
        overlay.appendChild(helperText);

        card.appendChild(attachedToggle);
        card.appendChild(image);
        card.appendChild(overlay);
    }

    if (isOwnPost) {
        const trash = document.createElement('div');
        const trashIcon = document.createElement('i');

        trash.className = 'proxi-trash';
        trash.setAttribute('data-proxi-id', String(proxi.id));
        trashIcon.className = 'fas fa-trash';
        trash.appendChild(trashIcon);
        card.appendChild(trash);
    }

    return card;
}

function filterProxis(query) {
    const normalizedQuery = String(query || '').trim().toLowerCase();

    document.querySelectorAll('.proxi').forEach(function (item) {
        item.style.display = item.textContent.toLowerCase().includes(normalizedQuery) ? '' : 'none';
    });
}

function openProxiImage(container) {
    const image = container.querySelector('.proxi-preview-image');
    const overlay = container.querySelector('.proxi-block');

    if (image) {
        image.style.display = 'block';
    }

    if (overlay) {
        overlay.style.display = 'none';
    }
}

function closeProxiImage(container) {
    const image = container.querySelector('.proxi-preview-image');
    const overlay = container.querySelector('.proxi-block');

    if (image) {
        image.style.display = 'none';
    }

    if (overlay) {
        overlay.style.display = 'block';
    }
}

function copyProxiImageUrl(image) {
    if (!image || !image.src || !navigator.clipboard || typeof navigator.clipboard.writeText !== 'function') {
        return;
    }

    navigator.clipboard.writeText(image.src).then(function () {
        if (QB.Phone && QB.Phone.Notifications && QB.Phone.Notifications.Add) {
            QB.Phone.Notifications.Add('fas fa-ad', 'Proxi', 'Image URL copied to clipboard', '#ff8f1a', 2000);
        }
    }).catch(function () {
        if (QB.Phone && QB.Phone.Notifications && QB.Phone.Notifications.Add) {
            QB.Phone.Notifications.Add('fas fa-ad', 'Proxi', 'Unable to copy the image URL right now.', '#ff8f1a', 2000);
        }
    });
}

QB.Phone.Functions.RefreshProxis = function (proxis) {
    const refs = getProxiElements();
    const entries = Array.isArray(proxis) ? [...proxis].reverse() : [];

    if (!refs.list) {
        return;
    }

    refs.list.textContent = '';

    if (entries.length === 0) {
        refs.list.appendChild(createProxiEmptyState());
        return;
    }

    const fragment = document.createDocumentFragment();

    entries.forEach(function (proxi) {
        fragment.appendChild(createProxiCard(proxi));
    });

    refs.list.appendChild(fragment);

    if (refs.searchInput) {
        filterProxis(refs.searchInput.value);
    }
};

document.addEventListener('input', function (event) {
    if (event.target && event.target.id === 'proxi-search') {
        filterProxis(event.target.value);
    }
});

document.addEventListener('click', function (event) {
    const createButton = event.target.closest('.create-proxi');
    const sendButton = event.target.closest('#proxi-sendmessage-chat');
    const cancelButton = event.target.closest('#proxi-cancel');
    const contactInfo = event.target.closest('.proxi-contact-info');
    const revealButton = event.target.closest('.proxi-eye');
    const hideButton = event.target.closest('.proxi-image-attached');
    const deleteButton = event.target.closest('.proxi-trash');
    const image = event.target.closest('.proxi-preview-image');

    if (createButton) {
        event.preventDefault();
        ClearProxiInput();
        showProxiComposer();
        return;
    }

    if (sendButton) {
        event.preventDefault();

        const refs = getProxiElements();
        const message = sanitizeProxiMessage(refs.messageInput ? refs.messageInput.value : '');
        const rawImageUrl = refs.imageInput ? refs.imageInput.value : '';
        const safeImageUrl = rawImageUrl ? ZPhoneUI.sanitizeImageUrl(rawImageUrl) : null;

        if (rawImageUrl && !safeImageUrl) {
            QB.Phone.Notifications.Add('fas fa-ad', 'Proxi', 'Add a valid JPG, PNG, GIF, or WEBP image URL.', '#ff8f1a', 2500);
            return;
        }

        if (message !== '' || safeImageUrl) {
            window.setTimeout(function () {
                ConfirmationFrame();
            }, 150);

            ZPhoneUI.postNui('PostProxi', {
                message: message,
                url: safeImageUrl,
            });

            ClearProxiInput();
            hideProxiComposer();
        } else {
            QB.Phone.Notifications.Add('fas fa-ad', 'Proxi', 'You can\'t post an empty proxi!', '#ff8f1a', 2000);
        }
        return;
    }

    if (cancelButton) {
        event.preventDefault();
        hideProxiComposer();
        return;
    }

    if (contactInfo) {
        event.preventDefault();

        const container = contactInfo.closest('.proxi');
        const inputNumber = container ? container.dataset.number : '';

        if (inputNumber === '') {
            return;
        }

        const contactData = {
            number: inputNumber,
            name: inputNumber,
        };

        ZPhoneUI.postNui('CallContact', {
            ContactData: contactData,
            Anonymous: QB.Phone.Data.AnonymousCall,
        }).then(function (status) {
            const playerPhone = String(QB.Phone && QB.Phone.Data && QB.Phone.Data.PlayerData
                && QB.Phone.Data.PlayerData.charinfo && QB.Phone.Data.PlayerData.charinfo.phone || '');
            const outgoingCall = document.querySelector('.phone-call-outgoing');
            const incomingCall = document.querySelector('.phone-call-incoming');
            const ongoingCall = document.querySelector('.phone-call-ongoing');
            const callerLabel = document.querySelector('.phone-call-outgoing-caller');

            if (contactData.number !== playerPhone) {
                if (status.IsOnline) {
                    if (status.CanCall) {
                        if (!status.InCall) {
                            hideProxiComposer();
                            ClearProxiInput();
                            if (outgoingCall) {
                                outgoingCall.style.display = 'block';
                            }
                            if (incomingCall) {
                                incomingCall.style.display = 'none';
                            }
                            if (ongoingCall) {
                                ongoingCall.style.display = 'none';
                            }
                            if (callerLabel) {
                                callerLabel.textContent = contactData.name;
                            }
                            QB.Phone.Functions.HeaderTextColor('white', 400);
                            QB.Phone.Animations.TopSlideUp('.phone-application-container', 250, -100);
                            QB.Phone.Animations.TopSlideUp(`.${QB.Phone.Data.currentApplication}-app`, 400, -100);
                            window.setTimeout(function () {
                                QB.Phone.Functions.ToggleApp(QB.Phone.Data.currentApplication, 'none');
                                QB.Phone.Animations.TopSlideDown('.phone-application-container', 400, 0);
                                QB.Phone.Functions.ToggleApp('phone-call', 'block');
                            }, 450);

                            CallData.name = contactData.name;
                            CallData.number = contactData.number;

                            QB.Phone.Data.currentApplication = 'phone-call';
                        } else {
                            QB.Phone.Notifications.Add('fas fa-phone', 'Phone', 'You\'re already in a call!');
                        }
                    } else {
                        QB.Phone.Notifications.Add('fas fa-phone', 'Phone', 'This person is busy!');
                    }
                } else {
                    QB.Phone.Notifications.Add('fas fa-phone', 'Phone', 'This person is not available!');
                }
            } else {
                QB.Phone.Notifications.Add('fas fa-phone', 'Phone', 'You can\'t call yourself!');
            }
        });
        return;
    }

    if (revealButton) {
        event.preventDefault();
        openProxiImage(revealButton.closest('.proxi'));
        return;
    }

    if (hideButton) {
        event.preventDefault();
        closeProxiImage(hideButton.closest('.proxi'));
        return;
    }

    if (image) {
        event.preventDefault();
        copyProxiImageUrl(image);
        return;
    }

    if (deleteButton) {
        event.preventDefault();

        window.setTimeout(function () {
            ConfirmationFrame();
            QB.Phone.Notifications.Add('fas fa-ad', 'Proxi', 'The proxi was deleted', '#ff8f1a', 2000);
        }, 150);

        ZPhoneUI.postNui('DeleteProxi', {
            id: Number(deleteButton.getAttribute('data-proxi-id')),
        });
    }
});
