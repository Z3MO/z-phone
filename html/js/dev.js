(function () {
    const shouldEnableDevMode = typeof window.GetParentResourceName !== "function" && (
        window.location.search.includes("dev=1") ||
        window.location.protocol === "file:" ||
        window.location.hostname === "127.0.0.1" ||
        window.location.hostname === "localhost"
    );

    if (!shouldEnableDevMode) {
        return;
    }

    const STORAGE_KEY = "z-phone-dev-state-v1";
    const DEV_RESOURCE_NAME = "z-phone-dev";
    const PLACEHOLDER_IMAGE = "https://placehold.co/720x480/png?text=Z-Phone+Dev";

    const applicationConfig = {
        phone: { app: "phone", tooltipText: "Phone", icon: "dialer.svg", tooltipPos: "top", style: "font-size: 3.3vh", job: false, blockedjobs: [], slot: 1, Alerts: 0 },
        whatsapp: { app: "whatsapp", tooltipText: "Messages", icon: "messages.svg", tooltipPos: "top", style: "font-size: 3.3vh", job: false, blockedjobs: [], slot: 2, Alerts: 2 },
        camera: { app: "camera", tooltipText: "Camera", icon: "camera.svg", job: false, blockedjobs: [], slot: 3, Alerts: 0 },
        settings: { app: "settings", tooltipText: "Settings", icon: "settings.svg", job: false, blockedjobs: [], slot: 4, Alerts: 0 },
        ping: { app: "ping", tooltipText: "Ping", icon: "ping", tooltipPos: "top", style: "font-size: 3.3vh", job: false, blockedjobs: [], slot: 5, Alerts: 0 },
        mail: { app: "mail", tooltipText: "Mail", icon: "mail.svg", style: "font-size: 3vh", job: false, blockedjobs: [], slot: 6, Alerts: 1 },
        proxi: { app: "proxi", tooltipText: "Proxi", icon: "yellowpages.svg", style: "font-size: 2vh", job: false, blockedjobs: [], slot: 7, Alerts: 0 },
        pulses: { app: "pulses", tooltipText: "Pulses", icon: "pulses.svg", tooltipPos: "top", job: false, blockedjobs: [], slot: 8, Alerts: 0 },
        party: { app: "party", tooltipText: "Party App", icon: "party.svg", style: "color: #78bdfd; font-size: 2.7vh", job: false, blockedjobs: [], slot: 9, Alerts: 0 },
        calculator: { app: "calculator", tooltipText: "Calculator", icon: "calculator.svg", tooltipPos: "bottom", style: "font-size: 2.5vh", job: false, blockedjobs: [], slot: 10, Alerts: 0 },
        gallery: { app: "gallery", tooltipText: "Gallery", icon: "gallery.svg", tooltipPos: "bottom", style: "font-size: 2.7vh", job: false, blockedjobs: [], slot: 11, Alerts: 0 },
        garage: { app: "garage", tooltipText: "Garages", icon: "garages.svg", style: "font-size: 3.3vh", job: false, blockedjobs: [], slot: 12, Alerts: 0 },
        bank: { app: "bank", tooltipText: "Bank", icon: "fleeca.svg", style: "font-size: 2.7vh", job: false, blockedjobs: [], slot: 13, Alerts: 0 },
        taxi: { app: "taxi", tooltipText: "Services", icon: "services", tooltipPos: "bottom", style: "font-size: 3vh", job: false, blockedjobs: [], slot: 14, Alerts: 0 }
    };

    function clone(data) {
        return JSON.parse(JSON.stringify(data));
    }

    function parsePayload(data) {
        if (data === undefined || data === null || data === "") {
            return {};
        }

        if (typeof data === "string") {
            try {
                return JSON.parse(data);
            } catch {
                return {};
            }
        }

        return data;
    }

    function getNow() {
        return new Date();
    }

    function formatMessageTime() {
        return getNow().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false
        });
    }

    function formatDateKey() {
        const now = getNow();
        return `${now.getUTCDate()}-${now.getUTCMonth()}-${now.getUTCFullYear()}`;
    }

    function createDefaultState() {
        const now = getNow();
        const earlier = new Date(now.getTime() - 36 * 60 * 1000);
        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        const playerData = {
            citizenid: "DEV-CID-0001",
            source: 1,
            charinfo: {
                firstname: "Dev",
                lastname: "Tester",
                phone: "555001",
                account: "DEV-938421"
            },
            job: {
                name: "unemployed",
                onduty: false
            },
            money: {
                cash: 850,
                bank: 48250
            },
            metadata: {
                profilepicture: "default",
                background: "default",
                banner: "https://placehold.co/1280x360/png?text=Z-Phone+Dev+Banner",
                bio: "Local browser preview mode for frontend iteration."
            }
        };

        return {
            playerData,
            playerJob: {
                name: "unemployed",
                onduty: false
            },
            phoneData: {
                MetaData: {
                    background: "default",
                    profilepicture: "default"
                },
                Contacts: [
                    { name: "Alex Johnson", number: "555002", iban: "DEV-102938", status: false },
                    { name: "Jordan Lee", number: "555003", iban: "DEV-564738", status: true },
                    { name: "Mechanic Bay", number: "555200", iban: "DEV-000777", status: false }
                ]
            },
            recentCalls: [
                { name: "Jordan Lee", number: "555003", time: "14:22", type: "outgoing", anonymous: false },
                { name: "Mechanic Bay", number: "555200", time: "09:14", type: "incoming", anonymous: false }
            ],
            suggestedContacts: [
                { name: ["Jamie", "Fox"], number: "555112", bank: "DEV-111222" },
                { name: ["Taylor", "Brooks"], number: "555113", bank: "DEV-333444" }
            ],
            whatsappChats: [
                {
                    name: "Alex Johnson",
                    number: "555002",
                    Unread: 2,
                    messages: [
                        {
                            date: formatDateKey(),
                            messages: [
                                { message: "Can you review the UI changes?", time: "13:40", sender: "CONTACT-ALEX", type: "message", data: {} },
                                { message: "Yep, I am checking them now.", time: "13:45", sender: playerData.citizenid, type: "message", data: {} },
                                { message: "Meet at Mission Row after that.", time: "14:10", sender: "CONTACT-ALEX", type: "location", data: { x: 442.1, y: -981.9 } }
                            ]
                        }
                    ]
                },
                {
                    name: "Jordan Lee",
                    number: "555003",
                    Unread: 0,
                    messages: [
                        {
                            date: `${yesterday.getUTCDate()}-${yesterday.getUTCMonth()}-${yesterday.getUTCFullYear()}`,
                            messages: [
                                { message: "Sent the mock data over email.", time: "17:20", sender: "CONTACT-JORDAN", type: "message", data: {} },
                                { message: "Photo", time: "17:25", sender: "CONTACT-JORDAN", type: "picture", data: { url: PLACEHOLDER_IMAGE } }
                            ]
                        }
                    ]
                }
            ],
            mails: [
                {
                    mailid: 1,
                    sender: "City Services",
                    subject: "Welcome to browser dev mode",
                    message: "This inbox is powered by local mock data so you can test layout and interactions without reconnecting to FiveM.",
                    read: false,
                    date: now.toISOString(),
                    button: []
                },
                {
                    mailid: 2,
                    sender: "Alex Johnson",
                    subject: "Checklist",
                    message: "Verify the home screen, messages flow, and bank overlays before pushing the next UI change.",
                    read: true,
                    date: earlier.toISOString(),
                    button: []
                }
            ],
            invoices: [
                { id: 1, sender: "LS Customs", sendercitizenid: "BIZ-1", amount: 1250, society: "Mechanic", type: "request" },
                { id: 2, sender: "Pillbox", sendercitizenid: "BIZ-2", amount: 250, society: "Medical", type: "request" }
            ],
            pulses: [
                {
                    pulseId: 101,
                    citizenid: playerData.citizenid,
                    firstName: "Dev",
                    lastName: "Tester",
                    message: "Using local preview data to speed up frontend iteration.",
                    date: now.toISOString(),
                    url: "",
                    likes: ["CONTACT-ALEX"],
                    profilePicture: "img/default.png",
                    type: "pulse",
                    comments: [
                        { sender_name: "Alex Johnson", text: "This is way faster.", date: earlier.toISOString() }
                    ]
                },
                {
                    pulseId: 102,
                    citizenid: "CONTACT-JORDAN",
                    firstName: "Jordan",
                    lastName: "Lee",
                    message: "Preview mode should make UI QA much easier.",
                    date: earlier.toISOString(),
                    url: PLACEHOLDER_IMAGE,
                    likes: [],
                    profilePicture: "img/default.png",
                    type: "pulse",
                    comments: []
                }
            ],
            pulseNotifications: [
                { type: "like", sender_name: "Alex Johnson", pulseId: 101, date: now.toISOString() },
                { type: "comment", sender_name: "Jordan Lee", pulseId: 101, text: "Looks clean!", date: earlier.toISOString() }
            ],
            proxis: [
                { id: 1, number: "555001", message: "Frontend dev for hire. Need quick UI polish?", url: null },
                { id: 2, number: "555003", message: "Selling spare rims, message me.", url: PLACEHOLDER_IMAGE }
            ],
            gallery: [
                { image: "https://placehold.co/720x480/png?text=Garage+Snapshot" },
                { image: "https://placehold.co/720x480/png?text=UI+Reference" }
            ],
            garageVehicles: [
                { fullname: "Sultan RS", plate: "DEV001", state: "Stored", garage: "Alta Garage", fuel: "84%", engine: 92, body: 88, paymentsleft: 0 },
                { fullname: "Baller ST", plate: "DEV002", state: "Out", garage: "Legion Garage", fuel: "57%", engine: 76, body: 80, paymentsleft: 2 }
            ],
            taxiDrivers: {
                taxi: {
                    Players: [
                        { Name: "Dispatch One", Phone: "555800" },
                        { Name: "Dispatch Two", Phone: "555801" }
                    ]
                }
            }
        };
    }

    function loadState() {
        try {
            const stored = window.localStorage.getItem(STORAGE_KEY);
            if (!stored) {
                return createDefaultState();
            }

            const parsed = JSON.parse(stored);
            return Object.assign(createDefaultState(), parsed);
        } catch {
            return createDefaultState();
        }
    }

    let mockState = loadState();

    function saveState() {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(mockState));
    }

    function cloneApplications() {
        return clone(applicationConfig);
    }

    function getPhoneLoadPayload() {
        return {
            PlayerData: clone(mockState.playerData),
            PlayerJob: clone(mockState.playerJob),
            PhoneData: clone(mockState.phoneData),
            PhoneJobs: {},
            applications: cloneApplications()
        };
    }

    function dispatchPhoneEvent(action, payload) {
        window.dispatchEvent(new window.MessageEvent("message", {
            data: Object.assign({ action }, payload || {})
        }));
    }

    function getChatByNumber(number) {
        return mockState.whatsappChats.find((chat) => String(chat.number) === String(number));
    }

    function getContactName(number) {
        const contact = mockState.phoneData.Contacts.find((entry) => String(entry.number) === String(number));
        return contact ? contact.name : String(number);
    }

    function ensureChat(number) {
        let chat = getChatByNumber(number);
        if (!chat) {
            chat = {
                name: getContactName(number),
                number: String(number),
                Unread: 0,
                messages: []
            };
            mockState.whatsappChats.unshift(chat);
        }
        return chat;
    }

    function ensureChatBucket(chat, dateKey) {
        let bucket = chat.messages.find((entry) => entry.date === dateKey);
        if (!bucket) {
            bucket = {
                date: dateKey,
                messages: []
            };
            chat.messages.push(bucket);
        }
        return bucket;
    }

    function getEndpoint(url) {
        try {
            return new URL(url, window.location.href).pathname.replace(/^\/+/, "");
        } catch {
            return String(url || "").split("/").pop();
        }
    }

    function mockCallStatus(payload) {
        const targetNumber = payload && payload.ContactData ? String(payload.ContactData.number) : "";
        return {
            IsOnline: true,
            CanCall: true,
            InCall: false,
            TargetNumber: targetNumber
        };
    }

    function updateProfileData(payload) {
        mockState.playerData.metadata = mockState.playerData.metadata || {};
        if (payload.profilePicture !== undefined) {
            mockState.playerData.metadata.profilepicture = payload.profilePicture || "default";
            mockState.phoneData.MetaData.profilepicture = payload.profilePicture || "default";
        }
        if (payload.banner !== undefined) {
            mockState.playerData.metadata.banner = payload.banner || "";
        }
        if (payload.bio !== undefined) {
            mockState.playerData.metadata.bio = payload.bio || "";
        }
        saveState();
        return true;
    }

    function handleRequest(endpoint, payload) {
        switch (endpoint) {
            case "HasPhone":
            case "Close":
            case "DissalowMoving":
            case "AllowMoving":
            case "ClearGeneralAlerts":
            case "ClearAlerts":
            case "ClearRecentAlerts":
            case "AcceptNotification":
            case "DenyNotification":
            case "PlaySound":
            case "gps-vehicle-garage":
            case "sellVehicle":
            case "SetHouseLocation":
            case "AnswerCall":
            case "CancelOutgoingCall":
            case "DenyIncomingCall":
            case "CancelOngoingCall":
                return true;
            case "GetWhatsappChats":
                return clone(mockState.whatsappChats);
            case "GetWhatsappChat":
                return clone(getChatByNumber(payload.phone) || false);
            case "SendMessage": {
                const chatNumber = String(payload.ChatNumber || "");
                const chat = ensureChat(chatNumber);
                const bucket = ensureChatBucket(chat, payload.ChatDate || formatDateKey());
                const messageType = payload.ChatType || "message";
                const newMessage = payload.ChatMessage ? payload.ChatMessage : "Photo";
                const messageData = messageType === "picture" ? { url: payload.url || PLACEHOLDER_IMAGE } : {};

                bucket.messages.push({
                    message: newMessage,
                    time: payload.ChatTime || formatMessageTime(),
                    sender: mockState.playerData.citizenid,
                    type: messageType,
                    data: messageData
                });

                chat.name = getContactName(chatNumber);
                chat.Unread = 0;
                saveState();

                dispatchPhoneEvent("UpdateChat", {
                    chatData: clone(chat),
                    chatNumber,
                    Chats: clone(mockState.whatsappChats)
                });

                return "ok";
            }
            case "GetMissedCalls":
                return clone(mockState.recentCalls);
            case "GetSuggestedContacts":
                return clone(mockState.suggestedContacts);
            case "CallContact":
                return mockCallStatus(payload);
            case "AddNewContact": {
                mockState.phoneData.Contacts.push({
                    name: payload.ContactName,
                    number: payload.ContactNumber,
                    iban: payload.ContactIban || "",
                    status: false
                });
                saveState();
                return clone(mockState.phoneData.Contacts);
            }
            case "EditContact": {
                const contact = mockState.phoneData.Contacts.find((entry) => String(entry.number) === String(payload.OldContactNumber));
                if (contact) {
                    contact.name = payload.CurrentContactName;
                    contact.number = payload.CurrentContactNumber;
                    contact.iban = payload.CurrentContactIban || "";
                }
                saveState();
                return clone(mockState.phoneData.Contacts);
            }
            case "DeleteContact":
                mockState.phoneData.Contacts = mockState.phoneData.Contacts.filter((entry) => String(entry.number) !== String(payload.CurrentContactNumber));
                saveState();
                return clone(mockState.phoneData.Contacts);
            case "RemoveSuggestion":
                mockState.suggestedContacts = mockState.suggestedContacts.filter((entry) => String(entry.number) !== String(payload.number));
                saveState();
                return true;
            case "GetMails":
                return clone(mockState.mails);
            case "SetMailRead": {
                const mail = mockState.mails.find((entry) => entry.mailid === payload.mailId);
                if (mail) {
                    mail.read = true;
                    saveState();
                }
                return true;
            }
            case "AcceptMailButton":
                return true;
            case "RemoveMail":
                mockState.mails = mockState.mails.filter((entry) => entry.mailid !== payload.mailId);
                saveState();
                return true;
            case "GetBankContacts":
                return clone(mockState.phoneData.Contacts);
            case "GetInvoices":
                return clone(mockState.invoices);
            case "CanTransferMoney": {
                const amount = Number(payload.amountOf || 0);
                if (amount > 0 && mockState.playerData.money.bank >= amount) {
                    mockState.playerData.money.bank -= amount;
                    saveState();
                    return {
                        TransferedMoney: true,
                        NewBalance: mockState.playerData.money.bank
                    };
                }
                return {
                    TransferedMoney: false,
                    NewBalance: mockState.playerData.money.bank
                };
            }
            case "PayInvoice": {
                const amount = Number(payload.amount || 0);
                if (amount > 0 && mockState.playerData.money.bank >= amount) {
                    mockState.playerData.money.bank -= amount;
                    mockState.invoices = mockState.invoices.filter((invoice) => invoice.id !== payload.invoiceId);
                    saveState();
                    return true;
                }
                return false;
            }
            case "DeclineInvoice":
                mockState.invoices = mockState.invoices.filter((invoice) => invoice.id !== payload.invoiceId);
                saveState();
                return true;
            case "GetPulses":
                return {
                    PulseData: clone(mockState.pulses),
                    hasVPN: true
                };
            case "GetPulseCommentCounts": {
                const counts = {};
                (payload.pulseIds || []).forEach((pulseId) => {
                    const pulse = mockState.pulses.find((entry) => entry.pulseId === pulseId);
                    counts[pulseId] = pulse && pulse.comments ? pulse.comments.length : 0;
                });
                return counts;
            }
            case "GetPulseNotifications":
                return clone(mockState.pulseNotifications);
            case "ToggleLikePulse": {
                const pulse = mockState.pulses.find((entry) => entry.pulseId === payload.id);
                if (pulse) {
                    pulse.likes = Array.isArray(pulse.likes) ? pulse.likes : [];
                    const existingIndex = pulse.likes.indexOf(mockState.playerData.citizenid);
                    if (existingIndex >= 0) {
                        pulse.likes.splice(existingIndex, 1);
                    } else {
                        pulse.likes.push(mockState.playerData.citizenid);
                    }
                    saveState();
                }
                return true;
            }
            case "EditPulse": {
                const pulse = mockState.pulses.find((entry) => entry.pulseId === payload.id);
                if (pulse) {
                    pulse.message = payload.Message || pulse.message;
                    pulse.url = payload.url || pulse.url;
                    saveState();
                }
                return true;
            }
            case "PostNewPulse": {
                const nextId = mockState.pulses.reduce((max, pulse) => Math.max(max, pulse.pulseId), 100) + 1;
                mockState.pulses.unshift({
                    pulseId: nextId,
                    citizenid: mockState.playerData.citizenid,
                    firstName: mockState.playerData.charinfo.firstname,
                    lastName: mockState.playerData.charinfo.lastname,
                    message: payload.Message || "",
                    date: new Date(payload.Date || getNow()).toISOString(),
                    url: payload.url || "",
                    likes: [],
                    profilePicture: mockState.playerData.metadata.profilepicture || "img/default.png",
                    type: payload.type || "pulse",
                    comments: []
                });
                saveState();
                return true;
            }
            case "DeletePulse":
                mockState.pulses = mockState.pulses.filter((entry) => entry.pulseId !== payload.id);
                saveState();
                return true;
            case "GetPulseComments": {
                const pulse = mockState.pulses.find((entry) => entry.pulseId === payload.pulseId);
                return clone(pulse && pulse.comments ? pulse.comments : []);
            }
            case "PostPulseComment": {
                const pulse = mockState.pulses.find((entry) => entry.pulseId === payload.pulseId);
                if (pulse) {
                    pulse.comments = Array.isArray(pulse.comments) ? pulse.comments : [];
                    pulse.comments.push({
                        sender_name: `${mockState.playerData.charinfo.firstname} ${mockState.playerData.charinfo.lastname}`,
                        text: payload.comment || "",
                        date: getNow().toISOString()
                    });
                    saveState();
                }
                return true;
            }
            case "LoadProxis":
                return clone(mockState.proxis);
            case "PostProxi": {
                const nextId = mockState.proxis.reduce((max, proxi) => Math.max(max, proxi.id), 0) + 1;
                mockState.proxis.unshift({
                    id: nextId,
                    number: mockState.playerData.charinfo.phone,
                    message: payload.message || "",
                    url: payload.url || null
                });
                saveState();
                return true;
            }
            case "DeleteProxi":
                mockState.proxis = mockState.proxis.filter((entry) => entry.id !== payload.id);
                saveState();
                return true;
            case "SetupGarageVehicles":
                return clone(mockState.garageVehicles);
            case "GetAvailableTaxiDrivers":
                return clone(mockState.taxiDrivers);
            case "GetGalleryData":
                return clone(mockState.gallery);
            case "DeleteImage":
                mockState.gallery = mockState.gallery.filter((entry) => entry.image !== payload.image);
                saveState();
                return true;
            case "TakePhoto":
                return PLACEHOLDER_IMAGE;
            case "UpdateProfile":
                return updateProfileData(payload);
            case "SetBackground":
                mockState.phoneData.MetaData.background = payload.background;
                mockState.playerData.metadata.background = payload.background;
                saveState();
                return true;
            case "UpdateProfilePicture":
                mockState.phoneData.MetaData.profilepicture = payload.profilepicture || "default";
                mockState.playerData.metadata.profilepicture = payload.profilepicture || "default";
                saveState();
                return true;
            default:
                return true;
        }
    }

    function installJQueryPostStub() {
        if (!window.jQuery || window.jQuery.post.__zPhoneDevPatched) {
            return;
        }

        const $ = window.jQuery;

        $.post = function (url, data, success) {
            if (typeof data === "function") {
                success = data;
                data = undefined;
            }

            const endpoint = getEndpoint(url);
            const payload = parsePayload(data);
            const deferred = $.Deferred();

            window.setTimeout(function () {
                try {
                    const response = handleRequest(endpoint, payload);
                    if (typeof success === "function") {
                        success(response);
                    }
                    deferred.resolve(response);
                } catch (error) {
                    deferred.reject(error);
                }
            }, 20);

            return deferred.promise();
        };

        $.post.__zPhoneDevPatched = true;
    }

    function installFetchStub() {
        if (window.fetch.__zPhoneDevPatched) {
            return;
        }

        const originalFetch = window.fetch.bind(window);

        window.fetch = function (resource, options) {
            const resourceUrl = typeof resource === "string" ? resource : resource.url;
            const endpoint = getEndpoint(resourceUrl);
            let isMockNuiRequest = false;

            try {
                const parsedUrl = new URL(resourceUrl, window.location.href);
                isMockNuiRequest = parsedUrl.protocol === "https:" && parsedUrl.hostname === DEV_RESOURCE_NAME;
            } catch {
                isMockNuiRequest = false;
            }

            if (!isMockNuiRequest) {
                return originalFetch(resource, options);
            }

            const payload = parsePayload(options && options.body);
            const responseBody = handleRequest(endpoint, payload);

            return Promise.resolve(new Response(
                typeof responseBody === "string" ? responseBody : JSON.stringify(responseBody),
                {
                    status: 200,
                    headers: {
                        "Content-Type": typeof responseBody === "string" ? "text/plain" : "application/json"
                    }
                }
            ));
        };

        window.fetch.__zPhoneDevPatched = true;
    }

    function syncTime() {
        const now = getNow();
        dispatchPhoneEvent("UpdateTime", {
            InGameTime: {
                hour: String(now.getHours()).padStart(2, "0"),
                minute: String(now.getMinutes()).padStart(2, "0")
            }
        });
    }

    function bootPhonePreview() {
        const applications = cloneApplications();
        dispatchPhoneEvent("open", {
            AppData: applications,
            CallData: {
                InCall: false,
                CallType: null,
                AnsweredCall: false,
                TargetData: {}
            },
            PlayerData: clone(mockState.playerData)
        });
        dispatchPhoneEvent("LoadPhoneData", getPhoneLoadPayload());
        syncTime();

        window.setTimeout(function () {
            if (window.QB && QB.Phone && QB.Phone.Notifications && typeof QB.Phone.Notifications.Add === "function") {
                QB.Phone.Notifications.Add("fas fa-code", "Dev Mode", "Loaded local mock phone data.", "#60a5fa", 2500);
            }
        }, 300);
    }

    function createDevBadge() {
        if (document.getElementById("zphone-dev-badge")) {
            return;
        }

        const badge = document.createElement("div");
        const title = document.createElement("div");
        const actions = document.createElement("div");
        const resetButton = document.createElement("button");
        const reloadButton = document.createElement("button");

        badge.id = "zphone-dev-badge";
        badge.style.cssText = "position:fixed;top:16px;right:16px;z-index:99999;background:rgba(15,23,42,.92);color:#fff;padding:12px 14px;border-radius:14px;border:1px solid rgba(96,165,250,.35);box-shadow:0 16px 40px rgba(0,0,0,.28);font-family:system-ui,sans-serif;min-width:180px;backdrop-filter:blur(10px);";

        title.textContent = "Z-Phone Dev Preview";
        title.style.cssText = "font-size:13px;font-weight:700;margin-bottom:8px;";

        actions.style.cssText = "display:flex;gap:8px;";

        resetButton.type = "button";
        resetButton.textContent = "Reset data";
        resetButton.style.cssText = "flex:1;border:0;border-radius:10px;padding:8px 10px;background:#2563eb;color:#fff;font-size:12px;font-weight:600;cursor:pointer;";
        resetButton.addEventListener("click", function () {
            window.localStorage.removeItem(STORAGE_KEY);
            window.location.reload();
        });

        reloadButton.type = "button";
        reloadButton.textContent = "Reload";
        reloadButton.style.cssText = "flex:1;border:0;border-radius:10px;padding:8px 10px;background:#1f2937;color:#fff;font-size:12px;font-weight:600;cursor:pointer;";
        reloadButton.addEventListener("click", function () {
            bootPhonePreview();
        });

        actions.appendChild(resetButton);
        actions.appendChild(reloadButton);
        badge.appendChild(title);
        badge.appendChild(actions);
        document.body.appendChild(badge);

        document.body.style.backgroundColor = "#0f172a";
    }

    window.GetParentResourceName = function () {
        return DEV_RESOURCE_NAME;
    };

    window.ZPhoneDev = {
        enabled: true,
        boot: bootPhonePreview,
        reset: function () {
            window.localStorage.removeItem(STORAGE_KEY);
            window.location.reload();
        },
        getState: function () {
            return clone(mockState);
        }
    };

    window.addEventListener("load", function () {
        installJQueryPostStub();
        installFetchStub();
        createDevBadge();
        window.setTimeout(bootPhonePreview, 120);
        window.setInterval(syncTime, 60000);
    });
})();
