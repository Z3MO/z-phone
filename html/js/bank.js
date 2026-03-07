const bankState = {
    currentTab: "accounts",
    invoices: new Map(),
    contacts: new Map(),
    initialized: false,
};

const bankElements = {
    accountNumber: () => document.getElementById("iban-account"),
    balance: () => document.querySelector(".bank-app-account-balance"),
    loaded: () => document.querySelector(".bank-app-loaded"),
    loading: () => document.querySelector(".bank-app-loading"),
    accounts: () => document.querySelector(".bank-app-accounts"),
    invoices: () => document.querySelector(".bank-app-invoices"),
    invoicesList: () => document.querySelector(".bank-app-invoices-list"),
    contactsPanel: () => document.querySelector(".bank-app-my-contacts"),
    contactsList: () => document.querySelector(".bank-app-my-contacts-list"),
    contactsSearch: () => document.getElementById("bank-app-my-contact-search"),
    transferPanel: () => document.querySelector(".bank-app-transfer"),
    transferIban: () => document.getElementById("bank-transfer-iban"),
    transferAmount: () => document.getElementById("bank-transfer-amount"),
    headerButtons: () => document.querySelectorAll(".bank-app-header-button"),
};

// Keep the bank view transitions lightweight so the panel still feels responsive in NUI.

const clearTransition = (element, duration) => {
    window.setTimeout(() => {
        if (element) {
            element.style.transition = "";
        }
    }, duration);
};

const setBankPanelVisibility = (element, shouldShow, display = "block") => {
    if (!element) return;
    element.style.display = shouldShow ? display : "none";
};

const slideBankPanelIn = (element, startLeft, duration = 250) => {
    if (!element) return;

    setBankPanelVisibility(element, true);
    element.style.transition = "none";
    element.style.left = startLeft;

    requestAnimationFrame(() => {
        element.style.transition = `left ${duration}ms ease`;
        element.style.left = "0vh";
    });

    clearTransition(element, duration);
};

const slideBankPanelOut = (element, exitLeft, duration = 250, resetLeft = "30vh") => {
    if (!element) return;

    element.style.transition = `left ${duration}ms ease`;
    element.style.left = exitLeft;

    window.setTimeout(() => {
        element.style.display = "none";
        element.style.left = resetLeft;
        element.style.transition = "";
    }, duration);
};

const slideBankOverlay = (element, shouldShow, duration = 400) => {
    if (!element) return;

    element.style.transition = `top ${duration}ms ease`;

    if (shouldShow) {
        element.style.display = "block";
        requestAnimationFrame(() => {
            element.style.top = "0%";
        });
    } else {
        element.style.top = "-100%";
        window.setTimeout(() => {
            element.style.display = "none";
            element.style.transition = "";
        }, duration);
    }
};

const resetBankOverlay = (element) => {
    if (!element) return;

    element.style.display = "none";
    element.style.top = "-100%";
    element.style.transition = "";
};

const setBankHeaderSelection = (activeTab) => {
    bankElements.headerButtons().forEach((button) => {
        button.classList.toggle(
            "bank-app-header-button-selected",
            button.dataset.headertype === activeTab
        );
    });
};

QB.Phone.Functions.SetBankBalance = (balance) => {
    const balanceElement = bankElements.balance();
    if (!balanceElement) return;

    const normalizedBalance = Number(balance) || 0;
    balanceElement.textContent = `$ ${normalizedBalance.toFixed(0)}`;
    balanceElement.dataset.balance = normalizedBalance.toFixed(0);
};

QB.Phone.Functions.SwitchBankTab = (nextTab, { immediate = false } = {}) => {
    if (!nextTab || bankState.currentTab === nextTab && !immediate) {
        return;
    }

    const accountsPanel = bankElements.accounts();
    const invoicesPanel = bankElements.invoices();
    const currentPanel = bankState.currentTab === "accounts" ? accountsPanel : invoicesPanel;
    const nextPanel = nextTab === "accounts" ? accountsPanel : invoicesPanel;

    if (immediate) {
        setBankPanelVisibility(accountsPanel, nextTab === "accounts");
        setBankPanelVisibility(invoicesPanel, nextTab === "invoices");
        if (accountsPanel) accountsPanel.style.left = nextTab === "accounts" ? "0vh" : "30vh";
        if (invoicesPanel) invoicesPanel.style.left = nextTab === "invoices" ? "0vh" : "30vh";
    } else if (nextTab === "invoices") {
        slideBankPanelOut(currentPanel, "-30vh");
        slideBankPanelIn(nextPanel, "30vh");
    } else {
        slideBankPanelOut(currentPanel, "30vh");
        slideBankPanelIn(nextPanel, "-30vh");
    }

    bankState.currentTab = nextTab;
    setBankHeaderSelection(nextTab);
};

QB.Phone.Functions.ResetBankView = () => {
    QB.Phone.Functions.SwitchBankTab("accounts", { immediate: true });
    resetBankOverlay(bankElements.transferPanel());
    resetBankOverlay(bankElements.contactsPanel());
};

const copyBankAccountNumber = async () => {
    const accountInput = bankElements.accountNumber();
    if (!accountInput) return;

    try {
        if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(accountInput.value);
        } else {
            accountInput.select();
            accountInput.setSelectionRange(0, accountInput.value.length);
            document.execCommand("copy");
        }

        QB.Phone.Notifications.Add("fas fa-university", "QBank", "Account number copied!", "#badc58", 1750);
    } catch (error) {
        QB.Phone.Notifications.Add("fas fa-university", "QBank", "Unable to copy the account number.", "#eb4d4b", 1750);
    }
};

const removeInvoiceElement = (invoiceElement) => {
    if (!invoiceElement) return;

    invoiceElement.style.transition = "left 300ms ease";
    invoiceElement.style.left = "30vh";

    window.setTimeout(() => {
        invoiceElement.remove();
    }, 310);
};

const createInvoiceElement = (invoice, index) => {
    const invoiceId = `invoiceid-${index}`;
    const invoiceElement = document.createElement("div");
    invoiceElement.className = "bank-app-invoice";
    invoiceElement.id = invoiceId;

    const title = document.createElement("div");
    title.className = "bank-app-invoice-title";
    title.textContent = invoice.society || "Invoice";

    const sender = document.createElement("span");
    sender.style.fontSize = "1vh";
    sender.style.color = "gray";
    sender.textContent = ` (Sender: ${invoice.sender || "Unknown"})`;
    title.appendChild(sender);

    const amount = document.createElement("div");
    amount.className = "bank-app-invoice-amount";
    amount.textContent = `$ ${Number(invoice.amount) || 0}`;

    const buttons = document.createElement("div");
    buttons.className = "bank-app-invoice-buttons";

    const payButton = document.createElement("i");
    payButton.className = "fas fa-check-circle pay-invoice";
    payButton.setAttribute("aria-label", "Pay invoice");

    const declineButton = document.createElement("i");
    declineButton.className = "fas fa-times-circle decline-invoice";
    declineButton.setAttribute("aria-label", "Decline invoice");

    buttons.append(payButton, declineButton);
    invoiceElement.append(title, amount, buttons);
    bankState.invoices.set(invoiceId, invoice);

    return invoiceElement;
};

QB.Phone.Functions.LoadBankInvoices = (invoices) => {
    const invoicesList = bankElements.invoicesList();
    if (!invoicesList) return;

    invoicesList.replaceChildren();
    bankState.invoices.clear();

    if (!Array.isArray(invoices) || invoices.length === 0) {
        return;
    }

    // Batch invoice rows into one DOM update to avoid repeated reflows.
    const fragment = document.createDocumentFragment();

    invoices.forEach((invoice, index) => {
        fragment.appendChild(createInvoiceElement(invoice, index));
    });

    invoicesList.appendChild(fragment);
};

const createBankContactElement = (contact, index) => {
    const contactId = `bank-contact-${index}`;
    const contactElement = document.createElement("div");
    contactElement.className = "bank-app-my-contact";
    contactElement.dataset.bankcontactid = contactId;

    const firstLetter = document.createElement("div");
    firstLetter.className = "bank-app-my-contact-firstletter";
    firstLetter.textContent = (contact.name || "?").charAt(0).toUpperCase();

    const name = document.createElement("div");
    name.className = "bank-app-my-contact-name";
    name.textContent = contact.name || "Unknown contact";

    contactElement.append(firstLetter, name);
    bankState.contacts.set(contactId, contact);

    return contactElement;
};

const filterBankContacts = () => {
    const searchValue = (bankElements.contactsSearch()?.value || "").trim().toLowerCase();

    bankElements.contactsList()
        ?.querySelectorAll(".bank-app-my-contact")
        .forEach((contactElement) => {
            const isVisible = contactElement.textContent.toLowerCase().includes(searchValue);
            contactElement.style.display = isVisible ? "" : "none";
        });
};

QB.Phone.Functions.LoadContactsWithNumber = (myContacts) => {
    const contactsList = bankElements.contactsList();
    if (!contactsList) return;

    contactsList.replaceChildren();
    bankState.contacts.clear();

    if (!Array.isArray(myContacts) || myContacts.length === 0) {
        return;
    }

    // Contacts are rendered into a fragment first so the scroll list updates once.
    const fragment = document.createDocumentFragment();

    myContacts.forEach((contact, index) => {
        fragment.appendChild(createBankContactElement(contact, index));
    });

    contactsList.appendChild(fragment);
    filterBankContacts();
};

QB.Phone.Functions.LoadBankData = async () => {
    try {
        const [contacts, invoices] = await Promise.all([
            QB.Phone.NUI.post("GetBankContacts"),
            QB.Phone.NUI.post("GetInvoices"),
        ]);

        QB.Phone.Functions.LoadContactsWithNumber(contacts);
        QB.Phone.Functions.LoadBankInvoices(invoices);
    } catch (error) {
        if (!window.invokeNative) {
            console.warn("[z-phone mock] Unable to load bank data.", error);
        }
    }
};

QB.Phone.Functions.DoBankOpen = () => {
    const playerData = QB.Phone.Data.PlayerData || {};
    const accountNumber = playerData.charinfo?.account || "";
    const bankBalance = playerData.money?.bank || 0;
    const accountInput = bankElements.accountNumber();
    const loadedPanel = bankElements.loaded();
    const loadingPanel = bankElements.loading();
    const accountsPanel = bankElements.accounts();
    const invoicesPanel = bankElements.invoices();

    if (accountInput) {
        accountInput.value = accountNumber;
    }

    // Opening the bank app resets the panels before the loading animation runs.
    QB.Phone.Functions.SetBankBalance(bankBalance);
    QB.Phone.Functions.ResetBankView();

    if (loadedPanel) {
        loadedPanel.style.display = "none";
        loadedPanel.style.paddingLeft = "30vh";
    }

    if (accountsPanel) {
        accountsPanel.style.left = "30vh";
    }

    if (invoicesPanel) {
        invoicesPanel.style.display = "none";
        invoicesPanel.style.left = "30vh";
    }

    if (loadingPanel) {
        loadingPanel.style.display = "block";
        loadingPanel.style.left = "0vh";
    }

    window.setTimeout(() => {
        window.setTimeout(() => {
            if (loadedPanel) {
                loadedPanel.style.display = "block";
                loadedPanel.style.transition = "padding-left 300ms ease";
                requestAnimationFrame(() => {
                    loadedPanel.style.paddingLeft = "0";
                });
                clearTransition(loadedPanel, 300);
            }

            slideBankPanelIn(accountsPanel, "30vh", 300);
            slideBankPanelOut(loadingPanel, "-30vh", 300, "0vh");
        }, 1500);
    }, 500);
};

const handleBankTransfer = async () => {
    const ibanInput = bankElements.transferIban();
    const amountInput = bankElements.transferAmount();
    const balanceValue = Number(bankElements.balance()?.dataset.balance || 0);
    const iban = ibanInput?.value.trim() || "";
    const amount = amountInput?.value.trim() || "";

    if (!iban || !amount) {
        QB.Phone.Notifications.Add("fas fa-university", "QBank", "Fill out all fields!", "#badc58", 1750);
        return;
    }

    try {
        const data = await QB.Phone.NUI.post("CanTransferMoney", {
            sendTo: iban,
            amountOf: amount,
        });

        if (data?.TransferedMoney) {
            if (ibanInput) ibanInput.value = "";
            if (amountInput) amountInput.value = "";

            QB.Phone.Functions.SetBankBalance(data.NewBalance);
            QB.Phone.Notifications.Add("fas fa-university", "QBank", `You have transferred $${amount}!`, "#badc58", 1500);
        } else if (balanceValue >= Number(amount)) {
            QB.Phone.Notifications.Add("fas fa-university", "QBank", "Transfer failed.", "#eb4d4b", 1500);
        } else {
            QB.Phone.Notifications.Add("fas fa-university", "QBank", "You don't have enough balance!", "#badc58", 1500);
        }
    } finally {
        slideBankOverlay(bankElements.transferPanel(), false);
    }
};

const handlePayInvoice = async (invoiceElement) => {
    if (!invoiceElement) return;

    const invoiceData = bankState.invoices.get(invoiceElement.id);
    const bankBalance = Number(bankElements.balance()?.dataset.balance || 0);

    if (!invoiceData) return;

    if (bankBalance < Number(invoiceData.amount)) {
        QB.Phone.Notifications.Add("fas fa-university", "QBank", "You don't have enough balance!", "#badc58", 1500);
        return;
    }

    const canPay = await QB.Phone.NUI.post("PayInvoice", {
        sender: invoiceData.sender,
        amount: invoiceData.amount,
        society: invoiceData.society,
        invoiceId: invoiceData.id,
        senderCitizenId: invoiceData.sendercitizenid,
    });

    if (!canPay) {
        QB.Phone.Notifications.Add("fas fa-university", "QBank", "You don't have enough balance!", "#badc58", 1500);
        return;
    }

    removeInvoiceElement(invoiceElement);
    bankState.invoices.delete(invoiceElement.id);
    QB.Phone.Notifications.Add("fas fa-university", "QBank", `You have paid $${invoiceData.amount}!`, "#badc58", 1500);
    QB.Phone.Functions.SetBankBalance(bankBalance - Number(invoiceData.amount));
};

const handleDeclineInvoice = async (invoiceElement) => {
    if (!invoiceElement) return;

    const invoiceData = bankState.invoices.get(invoiceElement.id);
    if (!invoiceData) return;

    await QB.Phone.NUI.post("DeclineInvoice", {
        sender: invoiceData.sender,
        amount: invoiceData.amount,
        society: invoiceData.society,
        invoiceId: invoiceData.id,
    });

    removeInvoiceElement(invoiceElement);
    bankState.invoices.delete(invoiceElement.id);
};

const handleBankContactSelection = (contactElement) => {
    const contactId = contactElement?.dataset.bankcontactid;
    const contactData = bankState.contacts.get(contactId);

    if (!contactData) return;

    if (contactData.iban) {
        const ibanInput = bankElements.transferIban();
        if (ibanInput) {
            ibanInput.value = contactData.iban;
        }
    } else {
        QB.Phone.Notifications.Add("fas fa-university", "QBank", "There is no bank account attached to this number!", "#badc58", 2500);
    }

    slideBankOverlay(bankElements.contactsPanel(), false);
};

const handleBankClick = async (event) => {
    const accountCard = event.target.closest(".bank-app-account");
    if (accountCard) {
        await copyBankAccountNumber();
        return;
    }

    const headerButton = event.target.closest(".bank-app-header-button");
    if (headerButton) {
        event.preventDefault();
        QB.Phone.Functions.SwitchBankTab(headerButton.dataset.headertype);
        return;
    }

    if (event.target.closest(".bank-app-account-actions")) {
        slideBankOverlay(bankElements.transferPanel(), true);
        return;
    }

    if (event.target.closest("#cancel-transfer")) {
        event.preventDefault();
        slideBankOverlay(bankElements.transferPanel(), false);
        return;
    }

    if (event.target.closest("#accept-transfer")) {
        event.preventDefault();
        await handleBankTransfer();
        return;
    }

    const payButton = event.target.closest(".pay-invoice");
    if (payButton) {
        event.preventDefault();
        await handlePayInvoice(payButton.closest(".bank-app-invoice"));
        return;
    }

    const declineButton = event.target.closest(".decline-invoice");
    if (declineButton) {
        event.preventDefault();
        await handleDeclineInvoice(declineButton.closest(".bank-app-invoice"));
        return;
    }

    if (event.target.closest(".bank-app-my-contacts-list-back")) {
        event.preventDefault();
        slideBankOverlay(bankElements.contactsPanel(), false);
        return;
    }

    if (event.target.closest(".bank-transfer-mycontacts-icon")) {
        event.preventDefault();
        slideBankOverlay(bankElements.contactsPanel(), true);
        return;
    }

    const contactElement = event.target.closest(".bank-app-my-contact");
    if (contactElement) {
        event.preventDefault();
        handleBankContactSelection(contactElement);
    }
};

const initializeBankApp = () => {
    if (bankState.initialized) return;

    document.addEventListener("click", (event) => {
        void handleBankClick(event);
    });

    bankElements.contactsSearch()?.addEventListener("input", filterBankContacts);
    bankState.initialized = true;
};

initializeBankApp();
