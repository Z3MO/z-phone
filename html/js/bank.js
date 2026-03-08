(() => {
    const state = {
        currentTab: 'accounts',
        contacts: [],
        invoices: [],
        balance: 0,
        activities: [],
        openSequence: 0,
    };

    const refs = {
        app: document.querySelector('.bank-app'),
        loading: document.querySelector('.bank-app-loading'),
        loaded: document.querySelector('.bank-app-loaded'),
        accountCard: document.getElementById('bank-account-card'),
        accountNumber: document.getElementById('iban-account'),
        accountOwner: document.getElementById('bank-account-owner'),
        accountBalance: document.getElementById('bank-account-balance'),
        balanceMetric: document.getElementById('bank-balance-metric'),
        invoiceCountMetric: document.getElementById('bank-invoice-count-metric'),
        contactCountMetric: document.getElementById('bank-contact-count-metric'),
        pendingBadge: document.getElementById('bank-pending-total-badge'),
        invoicesSummary: document.getElementById('bank-invoices-summary'),
        activityList: document.getElementById('bank-app-activity-list'),
        invoicesList: document.getElementById('bank-app-invoices-list'),
        tabButtons: Array.from(document.querySelectorAll('.bank-app-header-button')),
        panels: {
            accounts: document.querySelector('.bank-app-accounts'),
            invoices: document.querySelector('.bank-app-invoices'),
        },
        transferOverlay: document.getElementById('bank-app-transfer'),
        transferForm: document.getElementById('bank-transfer-form'),
        transferIban: document.getElementById('bank-transfer-iban'),
        transferAmount: document.getElementById('bank-transfer-amount'),
        transferReference: document.getElementById('bank-transfer-reference'),
        transferSelected: document.getElementById('bank-transfer-selected-contact'),
        transferOpenButton: document.getElementById('transfer-money'),
        transferCloseButton: document.getElementById('cancel-transfer'),
        transferClearButton: document.getElementById('bank-transfer-clear'),
        contactsOpenButton: document.getElementById('bank-open-contacts'),
        contactsInlineButton: document.getElementById('bank-transfer-mycontacts'),
        contactsOverlay: document.getElementById('bank-app-my-contacts'),
        contactsList: document.getElementById('bank-app-my-contacts-list'),
        contactSearch: document.getElementById('bank-app-my-contact-search'),
        contactsCloseButton: document.querySelector('.bank-app-my-contacts-list-back'),
    };

    function getResourceName() {
        return typeof GetParentResourceName === 'function' ? GetParentResourceName() : 'qb-phone';
    }

    async function nuiPost(endpoint, payload = {}) {
        const response = await fetch(`https://${getResourceName()}/${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json; charset=UTF-8',
            },
            body: JSON.stringify(payload),
        });

        const text = await response.text();
        if (!text) {
            return null;
        }

        try {
            return JSON.parse(text);
        } catch {
            return text;
        }
    }

    function notify(icon, title, message, color, duration) {
        if (window.QB && QB.Phone && QB.Phone.Notifications && typeof QB.Phone.Notifications.Add === 'function') {
            QB.Phone.Notifications.Add(icon, title, message, color, duration);
        }
    }

    function formatCurrency(amount) {
        const numericAmount = Number(amount) || 0;
        return `$ ${Math.round(numericAmount).toLocaleString('en-US')}`;
    }

    function sanitizeText(value, fallback = '', maxLength = 80) {
        if (typeof value !== 'string') {
            return fallback;
        }

        const normalized = value.replace(/\s+/g, ' ').trim();
        if (!normalized) {
            return fallback;
        }

        return normalized.slice(0, maxLength);
    }

    function normalizeAmount(value) {
        const numericValue = Math.floor(Number(value) || 0);
        return numericValue > 0 ? numericValue : 0;
    }

    function toCollection(value) {
        if (Array.isArray(value)) {
            return value.filter(Boolean);
        }

        if (value && typeof value === 'object') {
            return Object.values(value).filter(Boolean);
        }

        return [];
    }

    function getInvoiceReason(invoice) {
        return sanitizeText(invoice.reason || invoice.message, 'No payment note attached.', 120);
    }

    function getInvoiceStatus(invoice) {
        return sanitizeText(invoice.status || invoice.type, 'Pending', 24);
    }

    function getContactIban(contact) {
        return sanitizeText(contact?.iban || contact?.bank, '', 32);
    }

    function buildInitials(value) {
        const text = sanitizeText(value, '?', 32);
        const words = text.split(' ').filter(Boolean);
        if (words.length === 1) {
            return words[0].slice(0, 2).toUpperCase();
        }

        return `${words[0][0] || ''}${words[1][0] || ''}`.toUpperCase();
    }

    function createEmptyState(iconClass, title, subtitle) {
        const wrapper = document.createElement('div');
        wrapper.className = 'bank-app-empty-state';

        const icon = document.createElement('i');
        icon.className = iconClass;

        const heading = document.createElement('strong');
        heading.textContent = title;

        const detail = document.createElement('span');
        detail.textContent = subtitle;

        wrapper.append(icon, heading, detail);
        return wrapper;
    }

    function updateBalance(nextBalance) {
        state.balance = normalizeAmount(nextBalance);

        if (refs.accountBalance) {
            refs.accountBalance.textContent = formatCurrency(state.balance);
        }

        if (refs.balanceMetric) {
            refs.balanceMetric.textContent = formatCurrency(state.balance);
        }
    }

    function updateDashboardSummary() {
        const pendingTotal = state.invoices.reduce((total, invoice) => total + normalizeAmount(invoice.amount), 0);

        if (refs.invoiceCountMetric) {
            refs.invoiceCountMetric.textContent = String(state.invoices.length);
        }

        if (refs.contactCountMetric) {
            refs.contactCountMetric.textContent = String(state.contacts.length);
        }

        if (refs.pendingBadge) {
            refs.pendingBadge.textContent = `${formatCurrency(pendingTotal)} pending`;
        }

        if (refs.invoicesSummary) {
            refs.invoicesSummary.textContent = `${state.invoices.length} open`;
        }
    }

    function setSelectedContact(contact) {
        const iban = getContactIban(contact);
        const contactName = sanitizeText(contact?.name, 'Unknown contact', 48);

        if (!iban) {
            if (refs.transferSelected) {
                refs.transferSelected.hidden = true;
                refs.transferSelected.textContent = '';
            }
            return;
        }

        if (refs.transferIban) {
            refs.transferIban.value = iban;
        }

        if (refs.transferSelected) {
            refs.transferSelected.hidden = false;
            refs.transferSelected.textContent = `Paying ${contactName} (${iban})`;
        }
    }

    function renderActivity() {
        if (!refs.activityList) {
            return;
        }

        refs.activityList.textContent = '';

        if (!state.activities.length) {
            refs.activityList.append(
                createEmptyState('fa-regular fa-clock', 'No activity yet', 'Transfers and invoice updates will appear here.')
            );
            return;
        }

        state.activities.slice(0, 8).forEach((activity) => {
            const item = document.createElement('div');
            item.className = 'bank-app-activity-item';

            const icon = document.createElement('span');
            icon.className = 'bank-app-activity-icon';
            const iconGlyph = document.createElement('i');
            iconGlyph.className = activity.icon;
            icon.append(iconGlyph);

            const main = document.createElement('div');
            main.className = 'bank-app-activity-main';

            const title = document.createElement('div');
            title.className = 'bank-app-activity-title';
            title.textContent = activity.title;

            const meta = document.createElement('div');
            meta.className = 'bank-app-activity-meta';
            meta.textContent = activity.meta;

            main.append(title, meta);

            const amount = document.createElement('div');
            amount.className = `bank-app-activity-amount ${activity.amount < 0 ? 'is-negative' : 'is-positive'}`;
            amount.textContent = `${activity.amount < 0 ? '-' : '+'}${formatCurrency(Math.abs(activity.amount))}`;

            item.append(icon, main, amount);
            refs.activityList.append(item);
        });
    }

    function pushActivity(entry) {
        state.activities.unshift({
            icon: entry.icon || 'fa-solid fa-building-columns',
            title: sanitizeText(entry.title, 'Account update', 48),
            meta: sanitizeText(entry.meta, 'Just now', 96),
            amount: Number(entry.amount) || 0,
        });

        state.activities = state.activities.slice(0, 8);
        renderActivity();
    }

    function seedActivities() {
        state.activities = state.invoices.slice(0, 4).map((invoice) => ({
            icon: 'fa-solid fa-file-invoice-dollar',
            title: sanitizeText(invoice.society || invoice.sender, 'Pending invoice', 48),
            meta: `Awaiting payment • ${getInvoiceReason(invoice)}`,
            amount: -normalizeAmount(invoice.amount),
        }));
        renderActivity();
    }

    function renderInvoices() {
        if (!refs.invoicesList) {
            return;
        }

        refs.invoicesList.textContent = '';

        if (!state.invoices.length) {
            refs.invoicesList.append(
                createEmptyState('fa-regular fa-circle-check', 'All clear', 'You have no outstanding invoices right now.')
            );
            updateDashboardSummary();
            return;
        }

        state.invoices.forEach((invoice) => {
            const amount = normalizeAmount(invoice.amount);
            const card = document.createElement('article');
            card.className = 'bank-app-invoice';
            card.dataset.invoiceId = String(invoice.id);

            const top = document.createElement('div');
            top.className = 'bank-app-invoice-top';

            const info = document.createElement('div');

            const title = document.createElement('div');
            title.className = 'bank-app-invoice-title';
            title.textContent = sanitizeText(invoice.society || invoice.sender, 'Invoice', 48);

            const meta = document.createElement('div');
            meta.className = 'bank-app-invoice-meta';
            meta.textContent = `Sender: ${sanitizeText(invoice.sender, 'Unknown sender', 48)}`;

            const reason = document.createElement('div');
            reason.className = 'bank-app-invoice-reason';
            reason.textContent = getInvoiceReason(invoice);

            info.append(title, meta, reason);

            const total = document.createElement('div');
            total.className = 'bank-app-invoice-amount';
            total.textContent = formatCurrency(amount);

            top.append(info, total);

            const footer = document.createElement('div');
            footer.className = 'bank-app-invoice-footer';

            const status = document.createElement('span');
            status.className = 'bank-app-invoice-status';
            status.textContent = getInvoiceStatus(invoice);

            const actions = document.createElement('div');
            actions.className = 'bank-app-invoice-buttons';

            const payButton = document.createElement('button');
            payButton.type = 'button';
            payButton.className = 'bank-app-invoice-action pay-invoice';
            payButton.dataset.action = 'pay';
            payButton.setAttribute('aria-label', 'Pay invoice');
            const payIcon = document.createElement('i');
            payIcon.className = 'fa-solid fa-check';
            payButton.append(payIcon);

            const declineButton = document.createElement('button');
            declineButton.type = 'button';
            declineButton.className = 'bank-app-invoice-action decline-invoice';
            declineButton.dataset.action = 'decline';
            declineButton.setAttribute('aria-label', 'Decline invoice');
            const declineIcon = document.createElement('i');
            declineIcon.className = 'fa-solid fa-xmark';
            declineButton.append(declineIcon);

            actions.append(payButton, declineButton);
            footer.append(status, actions);
            card.append(top, footer);
            refs.invoicesList.append(card);
        });

        updateDashboardSummary();
    }

    function renderContacts() {
        if (!refs.contactsList) {
            return;
        }

        const query = sanitizeText(refs.contactSearch?.value || '', '', 32).toLowerCase();
        const filteredContacts = state.contacts.filter((contact) => {
            const iban = getContactIban(contact).toLowerCase();
            const name = sanitizeText(contact.name, '', 48).toLowerCase();
            return !query || name.includes(query) || iban.includes(query);
        });

        refs.contactsList.textContent = '';

        if (!filteredContacts.length) {
            refs.contactsList.append(
                createEmptyState('fa-regular fa-address-book', 'No contacts found', 'Save contacts with IBAN details to use them here.')
            );
            return;
        }

        filteredContacts.forEach((contact) => {
            const iban = getContactIban(contact);
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'bank-app-my-contact';
            button.dataset.contactIban = iban;

            const initials = document.createElement('span');
            initials.className = 'bank-app-my-contact-firstletter';
            initials.textContent = buildInitials(contact.name);

            const copy = document.createElement('span');
            copy.className = 'bank-app-my-contact-copy';

            const name = document.createElement('span');
            name.className = 'bank-app-my-contact-name';
            name.textContent = sanitizeText(contact.name, 'Unknown contact', 48);

            const ibanText = document.createElement('span');
            ibanText.className = 'bank-app-my-contact-iban';
            ibanText.textContent = iban || 'No bank account saved';

            copy.append(name, ibanText);

            const arrow = document.createElement('i');
            arrow.className = 'fa-solid fa-chevron-right';

            button.append(initials, copy, arrow);

            if (iban) {
                button.dataset.contactPayload = JSON.stringify({
                    name: sanitizeText(contact.name, '', 48),
                    iban,
                });
            } else {
                button.disabled = true;
            }

            refs.contactsList.append(button);
        });
    }

    function setTab(nextTab) {
        state.currentTab = nextTab === 'invoices' ? 'invoices' : 'accounts';
        window.CurrentTab = state.currentTab;

        refs.tabButtons.forEach((button) => {
            button.classList.toggle('bank-app-header-button-selected', button.dataset.headertype === state.currentTab);
        });

        Object.entries(refs.panels).forEach(([tabName, panel]) => {
            if (panel) {
                panel.classList.toggle('bank-app-panel-active', tabName === state.currentTab);
            }
        });
    }

    function openOverlay(overlay) {
        overlay?.classList.add('visible');
    }

    function closeOverlay(overlay) {
        overlay?.classList.remove('visible');
    }

    function resetTransferForm() {
        refs.transferForm?.reset();
        if (refs.transferSelected) {
            refs.transferSelected.hidden = true;
            refs.transferSelected.textContent = '';
        }
    }

    function getBankPlayerData() {
        return (window.QB && QB.Phone && QB.Phone.Data && QB.Phone.Data.PlayerData) || {};
    }

    async function copyAccountNumber() {
        const accountNumber = sanitizeText(refs.accountNumber?.value || '', '', 32);
        if (!accountNumber) {
            return;
        }

        try {
            if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
                await navigator.clipboard.writeText(accountNumber);
            } else if (refs.accountNumber) {
                refs.accountNumber.select();
                document.execCommand('copy');
            }
            notify('fas fa-building-columns', 'Fleeca Digital', 'Account number copied.', '#22c55e', 1800);
        } catch {
            notify('fas fa-building-columns', 'Fleeca Digital', 'Unable to copy account number.', '#ef4444', 1800);
        }
    }

    async function refreshBankData() {
        let contacts = [];
        let invoices = [];

        try {
            contacts = await nuiPost('GetBankContacts');
        } catch {
            notify('fas fa-building-columns', 'Fleeca Digital', 'Unable to load bank contacts.', '#ef4444', 2200);
        }

        try {
            invoices = await nuiPost('GetInvoices');
        } catch {
            notify('fas fa-building-columns', 'Fleeca Digital', 'Unable to load invoices.', '#ef4444', 2200);
        }

        QB.Phone.Functions.LoadContactsWithNumber(contacts);
        QB.Phone.Functions.LoadBankInvoices(invoices);
    }

    async function submitTransfer() {
        const iban = sanitizeText(refs.transferIban?.value || '', '', 32).toUpperCase();
        const amount = normalizeAmount(refs.transferAmount?.value);
        const reference = sanitizeText(refs.transferReference?.value || '', '', 60);

        if (!iban || !/^[A-Z0-9-]+$/.test(iban)) {
            notify('fas fa-building-columns', 'Fleeca Digital', 'Enter a valid recipient account.', '#ef4444', 2200);
            refs.transferIban?.focus();
            return;
        }

        if (!amount) {
            notify('fas fa-building-columns', 'Fleeca Digital', 'Enter a valid transfer amount.', '#ef4444', 2200);
            refs.transferAmount?.focus();
            return;
        }

        const result = await nuiPost('CanTransferMoney', {
            sendTo: iban,
            amountOf: amount,
            reference,
        });

        if (result && result.TransferedMoney) {
            updateBalance(result.NewBalance);
            pushActivity({
                icon: 'fa-solid fa-paper-plane',
                title: 'Transfer sent',
                meta: reference ? `${iban} • ${reference}` : `Recipient ${iban}`,
                amount: -amount,
            });
            notify('fas fa-building-columns', 'Fleeca Digital', result.message || `Transferred ${formatCurrency(amount)}.`, '#22c55e', 2200);
            resetTransferForm();
            closeOverlay(refs.transferOverlay);
        } else {
            notify('fas fa-building-columns', 'Fleeca Digital', result?.message || 'Transfer could not be completed.', '#ef4444', 2500);
        }
    }

    async function handleInvoiceAction(action, invoiceId) {
        const invoice = state.invoices.find((entry) => String(entry.id) === String(invoiceId));
        if (!invoice) {
            return;
        }

        const endpoint = action === 'pay' ? 'PayInvoice' : 'DeclineInvoice';
        const result = await nuiPost(endpoint, { invoiceId: invoice.id });

        if (!result || !result.success) {
            notify('fas fa-building-columns', 'Fleeca Digital', result?.message || 'Invoice action failed.', '#ef4444', 2300);
            return;
        }

        state.invoices = state.invoices.filter((entry) => String(entry.id) !== String(invoice.id));
        renderInvoices();

        if (action === 'pay') {
            updateBalance(result.newBalance);
            pushActivity({
                icon: 'fa-solid fa-file-invoice-dollar',
                title: 'Invoice paid',
                meta: `${sanitizeText(invoice.society || invoice.sender, 'Invoice', 48)} • ${getInvoiceReason(invoice)}`,
                amount: -normalizeAmount(invoice.amount),
            });
        } else {
            pushActivity({
                icon: 'fa-solid fa-ban',
                title: 'Invoice declined',
                meta: `${sanitizeText(invoice.society || invoice.sender, 'Invoice', 48)} • ${getInvoiceReason(invoice)}`,
                amount: 0,
            });
        }

        notify('fas fa-building-columns', 'Fleeca Digital', result.message || 'Invoice updated.', '#22c55e', 2200);
    }

    function attachEvents() {
        refs.tabButtons.forEach((button) => {
            button.addEventListener('click', () => setTab(button.dataset.headertype));
        });

        refs.accountCard?.addEventListener('click', copyAccountNumber);
        refs.accountCard?.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                copyAccountNumber();
            }
        });

        refs.transferOpenButton?.addEventListener('click', () => {
            resetTransferForm();
            openOverlay(refs.transferOverlay);
            refs.transferIban?.focus();
        });

        refs.contactsOpenButton?.addEventListener('click', () => openOverlay(refs.contactsOverlay));
        refs.contactsInlineButton?.addEventListener('click', () => openOverlay(refs.contactsOverlay));
        refs.transferCloseButton?.addEventListener('click', () => closeOverlay(refs.transferOverlay));
        refs.transferClearButton?.addEventListener('click', resetTransferForm);
        refs.contactsCloseButton?.addEventListener('click', () => closeOverlay(refs.contactsOverlay));

        refs.transferOverlay?.addEventListener('click', (event) => {
            if (event.target === refs.transferOverlay) {
                closeOverlay(refs.transferOverlay);
            }
        });

        refs.contactsOverlay?.addEventListener('click', (event) => {
            if (event.target === refs.contactsOverlay) {
                closeOverlay(refs.contactsOverlay);
            }
        });

        refs.transferForm?.addEventListener('submit', async (event) => {
            event.preventDefault();
            await submitTransfer();
        });

        refs.contactSearch?.addEventListener('input', renderContacts);

        refs.contactsList?.addEventListener('click', (event) => {
            const button = event.target instanceof Element ? event.target.closest('.bank-app-my-contact') : null;
            if (!button || button.disabled || !button.dataset.contactPayload) {
                return;
            }

            try {
                setSelectedContact(JSON.parse(button.dataset.contactPayload));
                closeOverlay(refs.contactsOverlay);
            } catch {
                notify('fas fa-building-columns', 'Fleeca Digital', 'Unable to load selected contact.', '#ef4444', 1800);
            }
        });

        refs.invoicesList?.addEventListener('click', async (event) => {
            const actionButton = event.target instanceof Element ? event.target.closest('[data-action]') : null;
            const invoiceCard = event.target instanceof Element ? event.target.closest('.bank-app-invoice') : null;

            if (!actionButton || !invoiceCard) {
                return;
            }

            await handleInvoiceAction(actionButton.dataset.action, invoiceCard.dataset.invoiceId);
        });
    }

    QB.Phone.Functions.LoadBankInvoices = function(invoices) {
        state.invoices = toCollection(invoices);
        renderInvoices();
        updateDashboardSummary();
    };

    QB.Phone.Functions.LoadContactsWithNumber = function(contacts) {
        state.contacts = toCollection(contacts);
        renderContacts();
        updateDashboardSummary();
    };

    QB.Phone.Functions.ResetBankAppView = function() {
        closeOverlay(refs.transferOverlay);
        closeOverlay(refs.contactsOverlay);
        resetTransferForm();
        setTab('accounts');
        refs.contactSearch && (refs.contactSearch.value = '');
        renderContacts();
        refs.loading?.classList.remove('is-hidden');
        refs.loaded?.classList.remove('is-ready');
    };

    QB.Phone.Functions.DoBankOpen = async function() {
        const playerData = getBankPlayerData();
        const charinfo = playerData.charinfo || {};
        const ownerName = `${sanitizeText(charinfo.firstname, 'Unknown', 24)} ${sanitizeText(charinfo.lastname, 'Citizen', 24)}`.trim();

        refs.accountNumber && (refs.accountNumber.value = sanitizeText(charinfo.account, 'Unavailable', 32));
        refs.accountOwner && (refs.accountOwner.textContent = ownerName);

        updateBalance(playerData.money?.bank);
        setTab('accounts');
        refs.loading?.classList.remove('is-hidden');
        refs.loaded?.classList.remove('is-ready');

        const openSequence = ++state.openSequence;

        try {
            await refreshBankData();
            seedActivities();
        } catch {
            notify('fas fa-building-columns', 'Fleeca Digital', 'Unable to load banking data.', '#ef4444', 2400);
        }

        if (openSequence !== state.openSequence) {
            return;
        }

        window.setTimeout(() => {
            if (openSequence !== state.openSequence) {
                return;
            }

            refs.loaded?.classList.add('is-ready');
            refs.loading?.classList.add('is-hidden');
        }, 350);
    };

    attachEvents();
})();
