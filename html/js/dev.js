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
    const DEV_CALL_CONTACTS = {
        incoming: { name: "Jordan Lee", number: "555003", anonymous: false },
        outgoing: { name: "Alex Johnson", number: "555002", anonymous: false }
    };

    const applicationConfig = {
        phone: { app: "phone", tooltipText: "Phone", icon: "dialer.svg", tooltipPos: "top", style: "font-size: 3.3vh", job: false, blockedjobs: [], slot: 1, Alerts: 0 },
        message: { app: "message", tooltipText: "Messages", icon: "messages.svg", tooltipPos: "top", style: "font-size: 3.3vh", job: false, blockedjobs: [], slot: 2, Alerts: 2 },
        camera: { app: "camera", tooltipText: "Camera", icon: "camera.svg", job: false, blockedjobs: [], slot: 3, Alerts: 0 },
        settings: { app: "settings", tooltipText: "Settings", icon: "settings.svg", job: false, blockedjobs: [], slot: 4, Alerts: 0 },
        ping: { app: "ping", tooltipText: "Ping", icon: "map.svg", tooltipPos: "top", style: "font-size: 3.3vh", job: false, blockedjobs: [], slot: 5, Alerts: 0 },
        mail: { app: "mail", tooltipText: "Mail", icon: "mail.svg", style: "font-size: 3vh", job: false, blockedjobs: [], slot: 6, Alerts: 1 },
        proxi: { app: "proxi", tooltipText: "Proxi", icon: "proxi.svg", style: "font-size: 2vh", job: false, blockedjobs: [], slot: 7, Alerts: 0 },
        pulses: { app: "pulses", tooltipText: "Pulses", icon: "pulses.svg", tooltipPos: "top", job: false, blockedjobs: [], slot: 8, Alerts: 0 },
        party: { app: "party", tooltipText: "Party App", icon: "party.svg", style: "color: #78bdfd; font-size: 2.7vh", job: false, blockedjobs: [], slot: 9, Alerts: 0 },
        calculator: { app: "calculator", tooltipText: "Calculator", icon: "calculator.svg", tooltipPos: "bottom", style: "font-size: 2.5vh", job: false, blockedjobs: [], slot: 10, Alerts: 0 },
        gallery: { app: "gallery", tooltipText: "Gallery", icon: "gallery.svg", tooltipPos: "bottom", style: "font-size: 2.7vh", job: false, blockedjobs: [], slot: 11, Alerts: 0 },
        garage: { app: "garage", tooltipText: "Garages", icon: "garages.svg", style: "font-size: 3.3vh", job: false, blockedjobs: [], slot: 12, Alerts: 0 },
        bank: { app: "bank", tooltipText: "Bank", icon: "fleeca.svg", style: "font-size: 2.7vh", job: false, blockedjobs: [], slot: 13, Alerts: 0 },
        services: { app: "services", tooltipText: "Services", icon: "services.svg", tooltipPos: "bottom", style: "font-size: 3vh", job: false, blockedjobs: [], slot: 14, Alerts: 0 }
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

    function formatDateKeyFor(date) {
        return `${date.getUTCDate()}-${date.getUTCMonth()}-${date.getUTCFullYear()}`;
    }

    function getLatestChatTimestamp(chat) {
        if (!chat || !Array.isArray(chat.messages) || chat.messages.length === 0) {
            return 0;
        }

        const latestGroup = chat.messages[chat.messages.length - 1];
        const latestMessage = latestGroup && Array.isArray(latestGroup.messages) && latestGroup.messages.length > 0
            ? latestGroup.messages[latestGroup.messages.length - 1]
            : null;

        if (!latestMessage) {
            return 0;
        }

        const groupDate = String(latestGroup.date || "").split("-");
        const hoursMinutes = String(latestMessage.time || "00:00").split(":");
        const timestamp = Date.UTC(
            Number(groupDate[2]) || 0,
            Number(groupDate[1]) || 0,
            Number(groupDate[0]) || 1,
            Number(hoursMinutes[0]) || 0,
            Number(hoursMinutes[1]) || 0
        );

        return Number.isNaN(timestamp) ? 0 : timestamp;
    }

    function sortChatsByLatest(chats) {
        return chats.sort((left, right) => getLatestChatTimestamp(right) - getLatestChatTimestamp(left));
    }

    function createGalleryMocks() {
        const entries = [
            "Downtown transfer receipt",
            "Mirror Park brunch",
            "Fleeca account card",
            "Mechanic invoice",
            "Casino valet arrival",
            "Vinewood skyline",
            "Night market meetup",
            "Helipad pickup",
            "Police checkpoint",
            "Sandy trail stop",
            "Paleto roadtrip",
            "Garage trophy car",
            "Impound counter",
            "Beachfront sunset",
            "Dispatch board",
            "Racing paddock",
            "Taxi stand queue",
            "Medical lobby",
            "Banking dashboard",
            "Club flyer wall",
            "Tow yard gate",
            "Coffee run",
            "House viewing",
            "Workshop parts shelf",
            "Lucky Wheel spin",
            "Phone UI concept",
            "Job board poster",
            "Storm drain chase",
            "Harbor shipment",
            "After-hours meetup"
        ];

        return entries.map(function(label, index) {
            return {
                image: `https://placehold.co/720x480/png?text=${encodeURIComponent(`${index + 1}. ${label}`)}`
            };
        });
    }

    function createGarageVehicleMocks() {
        const vehicles = [
            ["Sultan RS", "Alta Garage"],
            ["Baller ST", "Legion Garage"],
            ["Comet S2", "Vespucci Garage"],
            ["Elegy Retro", "Mission Row Garage"],
            ["Buffalo STX", "La Mesa Garage"],
            ["Dominator GTT", "Vinewood Garage"],
            ["Kuruma", "Pillbox Garage"],
            ["Jester RR", "Casino Garage"],
            ["Rebla GTS", "Mirror Park Garage"],
            ["Tailgater S", "Rockford Garage"],
            ["Euros", "Airport Garage"],
            ["T20", "Del Perro Garage"],
            ["Yosemite Rancher", "Harmony Garage"],
            ["V-Str", "Downtown Garage"],
            ["ZR350", "Strawberry Garage"],
            ["Granger 3600LX", "South Side Garage"],
            ["Remus", "Textile City Garage"],
            ["Drafter", "Hawick Garage"],
            ["Sentinel XS", "Richman Garage"],
            ["Futo GTX", "Burton Garage"]
        ];

        const states = ["Stored", "Out", "Impounded"];
        return vehicles.map(function(entry, index) {
            return {
                fullname: entry[0],
                plate: `DEV${String(index + 1).padStart(3, "0")}`,
                state: states[index % states.length],
                garage: entry[1],
                fuel: `${55 + ((index * 7) % 42)}%`,
                engine: 62 + ((index * 9) % 34),
                body: 58 + ((index * 11) % 39),
                paymentsleft: index % 4
            };
        });
    }

    function createPartyJobMocks() {
        return [
            { label: "Towing", event: "qb-phone:jobcenter:tow", image: "https://placehold.co/640x360/png?text=Towing+Dispatch" },
            { label: "Taxi", event: "qb-phone:jobcenter:taxi", image: "https://placehold.co/640x360/png?text=Taxi+Bookings" },
            { label: "PostOp Worker", event: "qb-phone:jobcenter:postop", image: "https://placehold.co/640x360/png?text=PostOp+Route" },
            { label: "Sanitation Worker", event: "qb-phone:jobcenter:sanitation", image: "https://placehold.co/640x360/png?text=City+Sanitation" },
            { label: "Engineer", event: "qb-phone:jobcenter:engineer", image: "https://placehold.co/640x360/png?text=Site+Engineer" }
        ];
    }

    function createPartyGroupMocks(playerData) {
        const playerName = `${playerData.charinfo.firstname} ${playerData.charinfo.lastname}`;
        return [
            {
                id: 1,
                status: "WAITING",
                GName: "Harbor Haulers",
                GPass: "dock247",
                Users: 3,
                leader: playerData.source,
                members: [
                    { name: playerName, CID: playerData.citizenid, Player: playerData.source },
                    { name: "Jordan Lee", CID: "CONTACT-JORDAN", Player: 22 },
                    { name: "Casey Wrench", CID: "CONTACT-CASEY", Player: 31 }
                ],
                stage: [
                    { id: 1, name: "Collect route manifest", count: 1, max: 1, isDone: true },
                    { id: 2, name: "Load company truck", count: 1, max: 2, isDone: false },
                    { id: 3, name: "Deliver to terminal", count: 0, max: 1, isDone: false }
                ]
            },
            {
                id: 2,
                status: "WAITING",
                GName: "Night Shift Riders",
                GPass: "",
                Users: 2,
                leader: 18,
                members: [
                    { name: "Alex Johnson", CID: "CONTACT-ALEX", Player: 18 },
                    { name: "Mia Carter", CID: "CONTACT-MIA", Player: 27 }
                ],
                stage: [
                    { id: 1, name: "Meet at taxi depot", count: 0, max: 1, isDone: false },
                    { id: 2, name: "Complete 3 fares", count: 1, max: 3, isDone: false }
                ]
            },
            {
                id: 3,
                status: "BUSY",
                GName: "Scrapyard Sweepers",
                GPass: "metal",
                Users: 4,
                leader: 44,
                members: [
                    { name: "Officer Rivera", CID: "CONTACT-RIVERA", Player: 44 },
                    { name: "Morgan Keys", CID: "CONTACT-MORGAN", Player: 45 },
                    { name: "Taylor Brooks", CID: "CONTACT-TAYLOR", Player: 46 },
                    { name: "Jamie Fox", CID: "CONTACT-JAMIE", Player: 47 }
                ],
                stage: [
                    { id: 1, name: "Secure entry point", count: 1, max: 1, isDone: true },
                    { id: 2, name: "Process salvage", count: 2, max: 4, isDone: false }
                ]
            }
        ];
    }

    function ensureDevCollections(state) {
        const defaultGallery = createGalleryMocks();
        const defaultGarageVehicles = createGarageVehicleMocks();
        const defaultPartyJobs = createPartyJobMocks();
        const defaultPartyGroups = createPartyGroupMocks(state.playerData);

        state.gallery = Array.isArray(state.gallery) && state.gallery.length >= defaultGallery.length
            ? state.gallery
            : defaultGallery;
        state.garageVehicles = Array.isArray(state.garageVehicles) && state.garageVehicles.length >= defaultGarageVehicles.length
            ? state.garageVehicles
            : defaultGarageVehicles;
        state.partyJobs = Array.isArray(state.partyJobs) && state.partyJobs.length
            ? state.partyJobs
            : defaultPartyJobs;
        state.partyGroups = Array.isArray(state.partyGroups) && state.partyGroups.length
            ? state.partyGroups
            : defaultPartyGroups;
        state.partyCurrentGroupId = typeof state.partyCurrentGroupId === "number"
            ? state.partyCurrentGroupId
            : 1;

        return state;
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
                background: "zphone-1",
                soundSettings: {
                    volume: 100,
                    muted: false,
                    vibrate: false
                },
                banner: "https://placehold.co/1280x360/png?text=Z-Phone+Dev+Banner",
                bio: "Local browser preview mode for frontend iteration."
            }
        };

        return ensureDevCollections({
            playerData,
            playerJob: {
                name: "unemployed",
                onduty: false
            },
            phoneData: {
                MetaData: {
                    background: "zphone-1",
                    profilepicture: "default",
                    soundSettings: {
                        volume: 100,
                        muted: false,
                        vibrate: false
                    }
                },
                Contacts: [
                    { name: "Alex Johnson", number: "555002", iban: "DEV-102938", status: false },
                    { name: "Jordan Lee", number: "555003", iban: "DEV-564738", status: true },
                    { name: "Mechanic Bay", number: "555200", iban: "DEV-000777", status: false },
                    { name: "Dispatch", number: "555800", iban: "DEV-005555", status: false },
                    { name: "Mia Carter", number: "555114", iban: "DEV-444222", status: false },
                    { name: "Sam Wilson", number: "555115", iban: "DEV-667788", status: true },
                    { name: "Hospital", number: "555300", iban: "DEV-999111", status: false },
                    { name: "Pizza Place", number: "555400", iban: "", status: false },
                    { name: "City Hall", number: "555600", iban: "DEV-800900", status: false },
                    { name: "Riley Morgan", number: "555116", iban: "", status: true }
                ]
            },
            recentCalls: [
                { name: "Jordan Lee", number: "555003", time: "14:22", type: "outgoing", anonymous: false },
                { name: "Mechanic Bay", number: "555200", time: "09:14", type: "incoming", anonymous: false },
                { name: "Alex Johnson", number: "555002", time: "08:45", type: "missed", anonymous: false },
                { name: "Mia Carter", number: "555114", time: "07:30", type: "outgoing", anonymous: false },
                { name: "Dispatch", number: "555800", time: "16:10", type: "incoming", anonymous: false },
                { name: "Unknown", number: "555999", time: "15:55", type: "missed", anonymous: true },
                { name: "Jamie Fox", number: "555112", time: "13:05", type: "outgoing", anonymous: false },
                { name: "Taylor Brooks", number: "555113", time: "12:40", type: "incoming", anonymous: false },
                { name: "Hospital", number: "555300", time: "11:20", type: "outgoing", anonymous: false },
                { name: "Pizza Place", number: "555400", time: "10:15", type: "incoming", anonymous: false },
                { name: "Tow Service", number: "555500", time: "09:50", type: "missed", anonymous: false },
                { name: "City Hall", number: "555600", time: "08:30", type: "outgoing", anonymous: false },
                { name: "Unknown", number: "555777", time: "07:15", type: "missed", anonymous: true },
                { name: "Garage", number: "555700", time: "06:45", type: "incoming", anonymous: false },
                { name: "Sam Wilson", number: "555115", time: "05:30", type: "outgoing", anonymous: false }
            ],
            suggestedContacts: [
                { name: ["Jamie", "Fox"], number: "555112", bank: "DEV-111222" },
                { name: ["Taylor", "Brooks"], number: "555113", bank: "DEV-333444" },
                { name: ["Riley", "Morgan"], number: "555116", bank: "" },
                { name: ["Casey", "Reed"], number: "555117", bank: "DEV-555666" }
            ],
            messageChats: [
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
                    Unread: 1,
                    messages: [
                        {
                            date: formatDateKeyFor(yesterday),
                            messages: [
                                { message: "Sent the mock data over email.", time: "17:20", sender: "CONTACT-JORDAN", type: "message", data: {} },
                                { message: "Photo", time: "17:25", sender: "CONTACT-JORDAN", type: "picture", data: { url: PLACEHOLDER_IMAGE } }
                            ]
                        }
                    ]
                },
                {
                    name: "Mia Carter",
                    number: "555114",
                    Unread: 0,
                    messages: [
                        {
                            date: formatDateKeyFor(new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000)),
                            messages: [
                                { message: "Dropped a long message here so the preview card shows truncation nicely in dev mode when you're polishing the conversation list.", time: "21:08", sender: "CONTACT-MIA", type: "message", data: {} },
                                { message: "Photo", time: "21:12", sender: playerData.citizenid, type: "picture", data: { url: "https://placehold.co/720x480/png?text=Message+Preview" } }
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
                { id: 1, sender: "LS Customs", sendercitizenid: "BIZ-1", amount: 1250, society: "Mechanic", type: "request", reason: "Engine repair and parts replacement", status: "Pending" },
                { id: 2, sender: "Pillbox", sendercitizenid: "BIZ-2", amount: 250, society: "Medical", type: "request", reason: "Medical treatment and discharge fee", status: "Pending" }
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
            gallery: createGalleryMocks(),
            garageVehicles: createGarageVehicleMocks(),
            partyJobs: createPartyJobMocks(),
            partyGroups: createPartyGroupMocks(playerData),
            partyCurrentGroupId: 1,
            servicesDirectory: [
                {
                    Job: "police",
                    Label: "Police",
                    Tag: "Emergency",
                    Description: "Report incidents, request backup, or ask for officer support.",
                    Accent: "#2563eb",
                    Icon: "fa-solid fa-shield-halved",
                    MessageTemplate: "Hello officer, I need assistance.",
                    Players: [
                        { Name: "Officer Rivera", Phone: "555110", Job: "police", Tag: "Emergency", Label: "Police" }
                    ]
                },
                {
                    Job: "ambulance",
                    Label: "EMS",
                    Tag: "Medical",
                    Description: "Medical response, patient transport, and welfare checks.",
                    Accent: "#ef4444",
                    Icon: "fa-solid fa-truck-medical",
                    MessageTemplate: "Hi EMS, I need medical assistance.",
                    Players: [
                        { Name: "Medic Harper", Phone: "555120", Job: "ambulance", Tag: "Medical", Label: "EMS" }
                    ]
                },
                {
                    Job: "taxi",
                    Label: "Taxi",
                    Tag: "Transport",
                    Description: "Rides, pickups, and city travel requests.",
                    Accent: "#3b82f6",
                    Icon: "fa-solid fa-taxi",
                    MessageTemplate: "Hi, I need a pickup when you are available.",
                    Players: [
                        { Name: "Dispatch One", Phone: "555800", Job: "taxi", Tag: "Transport", Label: "Taxi" },
                        { Name: "Dispatch Two", Phone: "555801", Job: "taxi", Tag: "Transport", Label: "Taxi" }
                    ]
                },
                {
                    Job: "mechanic",
                    Label: "Mechanic",
                    Tag: "Repair",
                    Description: "Roadside repairs, diagnostics, and vehicle support.",
                    Accent: "#f59e0b",
                    Icon: "fa-solid fa-screwdriver-wrench",
                    MessageTemplate: "Hi, I need help with my vehicle.",
                    Players: [
                        { Name: "Casey Wrench", Phone: "555130", Job: "mechanic", Tag: "Repair", Label: "Mechanic" }
                    ]
                },
                {
                    Job: "tow",
                    Label: "Tow",
                    Tag: "Roadside",
                    Description: "Impounds, recoveries, and towing support.",
                    Accent: "#14b8a6",
                    Icon: "fa-solid fa-truck-pickup",
                    MessageTemplate: "Hi, I need a tow when you are free.",
                    Players: []
                },
                {
                    Job: "realestate",
                    Label: "Real Estate",
                    Tag: "Housing",
                    Description: "Property viewings, rentals, and housing questions.",
                    Accent: "#8b5cf6",
                    Icon: "fa-solid fa-house",
                    MessageTemplate: "Hi, I would like to ask about a property.",
                    Players: [
                        { Name: "Morgan Keys", Phone: "555140", Job: "realestate", Tag: "Housing", Label: "Real Estate" }
                    ]
                }
            ]
        });
    }

    function loadState() {
        try {
            const stored = window.localStorage.getItem(STORAGE_KEY);
            if (!stored) {
                return createDefaultState();
            }

            const defaultState = createDefaultState();
            const parsed = JSON.parse(stored);
            return ensureDevCollections({
                ...defaultState,
                ...parsed,
                playerData: { ...defaultState.playerData, ...(parsed.playerData || {}) },
                playerJob: { ...defaultState.playerJob, ...(parsed.playerJob || {}) },
                phoneData: {
                    ...defaultState.phoneData,
                    ...(parsed.phoneData || {}),
                    MetaData: { ...defaultState.phoneData.MetaData, ...((parsed.phoneData && parsed.phoneData.MetaData) || {}) },
                    Contacts: Array.isArray(parsed.phoneData && parsed.phoneData.Contacts) ? parsed.phoneData.Contacts : defaultState.phoneData.Contacts
                },
                messageChats: Array.isArray(parsed.messageChats) ? parsed.messageChats : defaultState.messageChats,
                servicesDirectory: Array.isArray(parsed.servicesDirectory)
                    ? parsed.servicesDirectory
                    : (parsed.taxiDrivers ? parsed.taxiDrivers : defaultState.servicesDirectory)
            });
        } catch {
            return createDefaultState();
        }
    }

    let mockState = loadState();

    if (mockState.playerData && mockState.playerData.metadata && mockState.playerData.metadata.background === "default") {
        mockState.playerData.metadata.background = "zphone-1";
    }

    if (mockState.phoneData && mockState.phoneData.MetaData && mockState.phoneData.MetaData.background === "default") {
        mockState.phoneData.MetaData.background = "zphone-1";
    }
    let activeMockCall = null;
    let activeMockCallTimer = null;
    let activeOutgoingAnswerTimer = null;

    function saveState() {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(mockState));
    }

    function clearMockCallTimers() {
        if (activeMockCallTimer !== null) {
            window.clearInterval(activeMockCallTimer);
            activeMockCallTimer = null;
        }

        if (activeOutgoingAnswerTimer !== null) {
            window.clearTimeout(activeOutgoingAnswerTimer);
            activeOutgoingAnswerTimer = null;
        }
    }

    function buildMockCallData(contactData, callType, answeredCall) {
        const safeContact = {
            name: String((contactData && contactData.name) || "Unknown Number"),
            number: String((contactData && contactData.number) || "555000"),
            anonymous: !!(contactData && contactData.anonymous)
        };

        return {
            InCall: true,
            CallType: callType,
            AnsweredCall: answeredCall === true,
            CallTime: 0,
            CallId: Number(Date.now()),
            TargetData: safeContact
        };
    }

    function startMockOngoingTimer() {
        if (!activeMockCall || activeMockCall.CallType !== "ongoing") {
            return;
        }

        clearMockCallTimers();
        activeMockCallTimer = window.setInterval(function() {
            if (!activeMockCall || activeMockCall.CallType !== "ongoing") {
                clearMockCallTimers();
                return;
            }

            activeMockCall.CallTime = Number(activeMockCall.CallTime || 0) + 1;
            dispatchPhoneEvent("UpdateCallTime", {
                Time: activeMockCall.CallTime,
                Name: activeMockCall.TargetData.name
            });
        }, 1000);
    }

    function syncMockHomeCall(callData) {
        dispatchPhoneEvent("SetupHomeCall", {
            CallData: callData || {
                InCall: false,
                CallType: null,
                AnsweredCall: false,
                TargetData: {},
                CallTime: 0
            }
        });
    }

    function endMockCall(reason) {
        clearMockCallTimers();
        activeMockCall = null;
        syncMockHomeCall(null);

        if (reason === "incoming") {
            dispatchPhoneEvent("IncomingCallAlert", {
                CallData: DEV_CALL_CONTACTS.incoming,
                Canceled: true,
                AnonymousCall: false
            });
            return true;
        }

        if (reason === "outgoing") {
            dispatchPhoneEvent("CancelOutgoingCall", {});
            return true;
        }

        dispatchPhoneEvent("CancelOngoingCall", {});
        return true;
    }

    function answerMockCall() {
        if (!activeMockCall) {
            return true;
        }

        clearMockCallTimers();
        activeMockCall.CallType = "ongoing";
        activeMockCall.AnsweredCall = true;
        activeMockCall.CallTime = 0;
        syncMockHomeCall(clone(activeMockCall));
        dispatchPhoneEvent("AnswerCall", {
            CallData: clone(activeMockCall)
        });
        startMockOngoingTimer();
        return true;
    }

    function triggerIncomingCallScenario(contactData) {
        clearMockCallTimers();
        activeMockCall = buildMockCallData(contactData || DEV_CALL_CONTACTS.incoming, "incoming", false);
        syncMockHomeCall(clone(activeMockCall));
        dispatchPhoneEvent("IncomingCallAlert", {
            CallData: clone(activeMockCall.TargetData),
            Canceled: false,
            AnonymousCall: !!activeMockCall.TargetData.anonymous
        });
        return true;
    }

    function triggerOutgoingCallScenario(contactData, autoAnswer) {
        clearMockCallTimers();
        activeMockCall = buildMockCallData(contactData || DEV_CALL_CONTACTS.outgoing, "outgoing", false);
        syncMockHomeCall(clone(activeMockCall));

        if (autoAnswer !== false) {
            activeOutgoingAnswerTimer = window.setTimeout(function() {
                answerMockCall();
            }, 1800);
        }

        return true;
    }

    function saveMockSoundSettings(payload) {
        const current = (mockState.phoneData && mockState.phoneData.MetaData && mockState.phoneData.MetaData.soundSettings) || {};
        const soundSettings = {
            volume: payload && payload.volume != null ? Number(payload.volume) : Number(current.volume || 100),
            muted: !!(payload && payload.muted),
            vibrate: !!(payload && payload.vibrate)
        };

        mockState.phoneData.MetaData.soundSettings = soundSettings;
        mockState.playerData.metadata = mockState.playerData.metadata || {};
        mockState.playerData.metadata.soundSettings = clone(soundSettings);
        saveState();
        return true;
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
        return mockState.messageChats.find((chat) => String(chat.number) === String(number));
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
            mockState.messageChats.unshift(chat);
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
            InCall: !!activeMockCall,
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

    function getMockPartyGroup(groupId) {
        return (mockState.partyGroups || []).find(function(group) {
            return Number(group.id) === Number(groupId);
        });
    }

    function getMockPlayerName() {
        return `${mockState.playerData.charinfo.firstname} ${mockState.playerData.charinfo.lastname}`;
    }

    function isPlayerInMockParty(group) {
        return Array.isArray(group && group.members) && group.members.some(function(member) {
            return Number(member.Player) === Number(mockState.playerData.source);
        });
    }

    function syncMockPartyUsers(group) {
        group.Users = Array.isArray(group.members) ? group.members.length : 0;
        return group;
    }

    function refreshMockPartyApp() {
        dispatchPhoneEvent("refreshApp", {
            data: clone(mockState.partyGroups || [])
        });
    }

    function buildMockPartyResponse(group) {
        return {
            members: Array.isArray(group && group.members)
                ? group.members.map(function(member) {
                    return {
                        name: member.name,
                        isLeader: Number(member.Player) === Number(group.leader)
                    };
                })
                : [],
            tasks: Array.isArray(group && group.stage) ? clone(group.stage) : []
        };
    }

    function handleRequest(endpoint, payload) {
        switch (endpoint) {
            case "HasPhone":
            case "Close":
            case "DissalowMoving":
            case "AllowMoving":
            case "ClearGeneralAlerts":
                return true;
            case "ClearAlerts": {
                const chat = getChatByNumber(payload.number);
                if (chat) {
                    chat.Unread = 0;
                    saveState();
                }
                return true;
            }
            case "ClearRecentAlerts":
            case "AcceptNotification":
            case "DenyNotification":
            case "PlaySound":
            case "gps-vehicle-garage":
            case "sellVehicle":
            case "SetHouseLocation":
                return true;
            case "AnswerCall":
                return answerMockCall();
            case "CancelOutgoingCall":
                return endMockCall("outgoing");
            case "DenyIncomingCall":
                return endMockCall("incoming");
            case "CancelOngoingCall":
                return endMockCall("ongoing");
            case "GetMessageChats":
                return clone(sortChatsByLatest([...mockState.messageChats]));
            case "GetMessageChat":
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
                const remainingChats = mockState.messageChats.filter((entry) => String(entry.number) !== chatNumber);
                remainingChats.push(chat);
                mockState.messageChats = sortChatsByLatest(remainingChats);
                saveState();

                dispatchPhoneEvent("UpdateChat", {
                    chatData: clone(chat),
                    chatNumber,
                    Chats: clone(mockState.messageChats)
                });

                return "ok";
            }
            case "GetMissedCalls":
                return clone(mockState.recentCalls);
            case "GetSuggestedContacts":
                return clone(mockState.suggestedContacts);
            case "GetNearbyPhonePlayers":
                return clone([
                    { id: 18, name: "Alex Johnson", distance: 2.1 },
                    { id: 22, name: "Jordan Lee", distance: 3.4 },
                    { id: 31, name: "Casey Wrench", distance: 4.6 }
                ]);
            case "SharePhoneContact":
                return {
                    success: true,
                    message: `Number shared with ID ${payload.targetId}.`
                };
            case "CallContact": {
                const status = mockCallStatus(payload);
                triggerOutgoingCallScenario(payload && payload.ContactData ? payload.ContactData : DEV_CALL_CONTACTS.outgoing, true);
                return {
                    ...status,
                    InCall: false
                };
            }
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
                        NewBalance: mockState.playerData.money.bank,
                        message: "Transfer completed."
                    };
                }
                return {
                    TransferedMoney: false,
                    NewBalance: mockState.playerData.money.bank,
                    message: "Insufficient balance."
                };
            }
            case "PayInvoice": {
                const invoice = mockState.invoices.find((entry) => entry.id === payload.invoiceId);
                const amount = Number(invoice && invoice.amount || 0);
                if (amount > 0 && mockState.playerData.money.bank >= amount) {
                    mockState.playerData.money.bank -= amount;
                    mockState.invoices = mockState.invoices.filter((invoice) => invoice.id !== payload.invoiceId);
                    saveState();
                    return {
                        success: true,
                        newBalance: mockState.playerData.money.bank,
                        message: "Invoice paid."
                    };
                }
                return {
                    success: false,
                    newBalance: mockState.playerData.money.bank,
                    message: "Insufficient balance."
                };
            }
            case "DeclineInvoice":
                mockState.invoices = mockState.invoices.filter((invoice) => invoice.id !== payload.invoiceId);
                saveState();
                return {
                    success: true,
                    message: "Invoice declined."
                };
            case "GetPulses":
                return {
                    PulseData: clone(mockState.pulses),
                    hasVPN: false
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
            case "GetGroupsApp":
                return clone(mockState.partyGroups || []);
            case "GetJobCentersJobs":
                return clone(mockState.partyJobs || []);
            case "jobcenter_CreateJobGroup": {
                const nextId = (mockState.partyGroups || []).reduce(function(maxId, group) {
                    return Math.max(maxId, Number(group.id) || 0);
                }, 0) + 1;
                const newGroup = syncMockPartyUsers({
                    id: nextId,
                    status: "WAITING",
                    GName: (payload.name || "New Crew").trim().slice(0, 15),
                    GPass: payload.pass || "",
                    leader: mockState.playerData.source,
                    members: [
                        {
                            name: getMockPlayerName(),
                            CID: mockState.playerData.citizenid,
                            Player: mockState.playerData.source
                        }
                    ],
                    stage: [
                        { id: 1, name: "Assemble the crew", count: 1, max: 1, isDone: true },
                        { id: 2, name: "Head to the start point", count: 0, max: 1, isDone: false }
                    ]
                });
                mockState.partyGroups = Array.isArray(mockState.partyGroups) ? mockState.partyGroups : [];
                mockState.partyGroups.unshift(newGroup);
                mockState.partyCurrentGroupId = newGroup.id;
                saveState();
                refreshMockPartyApp();
                return true;
            }
            case "jobcenter_CheckPlayerNames":
                return buildMockPartyResponse(getMockPartyGroup(payload.id));
            case "jobcenter_JoinTheGroup": {
                const group = getMockPartyGroup(payload.id);
                if (!group || isPlayerInMockParty(group)) {
                    return true;
                }
                group.members = Array.isArray(group.members) ? group.members : [];
                group.members.push({
                    name: getMockPlayerName(),
                    CID: mockState.playerData.citizenid,
                    Player: mockState.playerData.source
                });
                syncMockPartyUsers(group);
                mockState.partyCurrentGroupId = group.id;
                saveState();
                refreshMockPartyApp();
                return true;
            }
            case "jobcenter_leave_grouped": {
                const group = getMockPartyGroup(payload.id);
                if (!group) {
                    return true;
                }
                group.members = (group.members || []).filter(function(member) {
                    return Number(member.Player) !== Number(mockState.playerData.source);
                });
                syncMockPartyUsers(group);
                if (Number(group.leader) === Number(mockState.playerData.source) || group.Users === 0) {
                    mockState.partyGroups = (mockState.partyGroups || []).filter(function(entry) {
                        return Number(entry.id) !== Number(group.id);
                    });
                }
                mockState.partyCurrentGroupId = 0;
                saveState();
                refreshMockPartyApp();
                return true;
            }
            case "jobcenter_DeleteGroup":
                mockState.partyGroups = (mockState.partyGroups || []).filter(function(group) {
                    return Number(group.id) !== Number(payload.delete);
                });
                mockState.partyCurrentGroupId = 0;
                saveState();
                refreshMockPartyApp();
                return true;
            case "jobcenter_GroupBusy":
                return true;
            case "CasinoPhoneJobCenter":
                return true;
            case "GetAvailableServices":
                return clone(mockState.servicesDirectory || mockState.taxiDrivers || []);
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
            case "UpdatePhoneSoundSettings":
                return saveMockSoundSettings(payload);
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
        clearMockCallTimers();
        activeMockCall = null;
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
        const scenarios = document.createElement("div");
        const resetButton = document.createElement("button");
        const reloadButton = document.createElement("button");
        const incomingButton = document.createElement("button");
        const outgoingButton = document.createElement("button");
        const hangupButton = document.createElement("button");

        badge.id = "zphone-dev-badge";
        badge.style.cssText = "position:fixed;top:16px;right:16px;z-index:99999;background:rgba(15,23,42,.92);color:#fff;padding:12px 14px;border-radius:14px;border:1px solid rgba(96,165,250,.35);box-shadow:0 16px 40px rgba(0,0,0,.28);font-family:system-ui,sans-serif;min-width:220px;backdrop-filter:blur(10px);";

        title.textContent = "Z-Phone Dev Preview";
        title.style.cssText = "font-size:13px;font-weight:700;margin-bottom:8px;";

        actions.style.cssText = "display:flex;gap:8px;";
        scenarios.style.cssText = "display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:8px;";

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

        incomingButton.type = "button";
        incomingButton.textContent = "Incoming";
        incomingButton.style.cssText = "border:0;border-radius:10px;padding:8px 10px;background:#0f766e;color:#fff;font-size:12px;font-weight:600;cursor:pointer;";
        incomingButton.addEventListener("click", function () {
            triggerIncomingCallScenario(DEV_CALL_CONTACTS.incoming);
        });

        outgoingButton.type = "button";
        outgoingButton.textContent = "Outgoing";
        outgoingButton.style.cssText = "border:0;border-radius:10px;padding:8px 10px;background:#7c3aed;color:#fff;font-size:12px;font-weight:600;cursor:pointer;";
        outgoingButton.addEventListener("click", function () {
            triggerOutgoingCallScenario(DEV_CALL_CONTACTS.outgoing, true);
        });

        hangupButton.type = "button";
        hangupButton.textContent = "Hang up";
        hangupButton.style.cssText = "border:0;border-radius:10px;padding:8px 10px;background:#b91c1c;color:#fff;font-size:12px;font-weight:600;cursor:pointer;";
        hangupButton.addEventListener("click", function () {
            const reason = activeMockCall && activeMockCall.CallType === "incoming"
                ? "incoming"
                : (activeMockCall && activeMockCall.CallType === "outgoing" ? "outgoing" : "ongoing");
            endMockCall(reason);
        });

        scenarios.appendChild(incomingButton);
        scenarios.appendChild(outgoingButton);
        scenarios.appendChild(hangupButton);
        actions.appendChild(resetButton);
        actions.appendChild(reloadButton);
        badge.appendChild(title);
        badge.appendChild(scenarios);
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
        incomingCall: function (contact) {
            return triggerIncomingCallScenario(contact || DEV_CALL_CONTACTS.incoming);
        },
        outgoingCall: function (contact) {
            return triggerOutgoingCallScenario(contact || DEV_CALL_CONTACTS.outgoing, true);
        },
        answerCall: function () {
            return answerMockCall();
        },
        hangupCall: function () {
            const reason = activeMockCall && activeMockCall.CallType === "incoming"
                ? "incoming"
                : (activeMockCall && activeMockCall.CallType === "outgoing" ? "outgoing" : "ongoing");
            return endMockCall(reason);
        },
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
