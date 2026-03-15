Config = Config or {}

-- Configs for Payment and Banking

Config.RenewedBanking = false -- Either put this to true or false if you use Renewed Banking or not

Config.BillingCommissions = { -- This is a percentage (0.10) == 10%
    mechanic = 0.10
}

-- Web hook for camera ( NOT GO PRO )
Config.Webhook = 'https://discord.com/api/webhooks/1477199176595931146/w2QPB1g3Q15row5ZOR1_T_Inx5TRTQidvHiI0Bc1yT9Fn_MG7XfTijDnjj-jrRoNdGkT'

-- Item name for pings app ( Having a VPN sends an anonymous ping, else sends the players name)
Config.VPNItem = 'vpn'

-- The garage the vehicle goes to when you sell a car to a player
Config.SellGarage = 'altastreet'

-- How Long Does The Player Have To Accept The Ping - This Is In Seconds
Config.Timeout = 30

-- How Long Does The Blip Remain On The Map - This Is In Seconds
Config.BlipDuration = 30

-- Blip Settings - Find Info @ https://wiki.gtanet.work/index.php?title=Blips
Config.BlipColor = 4
Config.BlipIcon = 280
Config.BlipScale = 0.75

Config.PulseDuration = 8 -- How many hours to load pulses (12 will load the past 12 hours of pulses)
Config.MailDuration = 72 -- How many hours to load Mails (72 will load the past 72 hours of Mails)


Config.RepeatTimeout = 4000
Config.CallRepeats = 10
Config.AllowWalking = true -- Allow walking and driving with phone out


Config.PhoneApplications = {
    ["phone"] = {
        app = "phone",
        tooltipText = "Phone",
        icon = "dialer.svg",
        tooltipPos = "top",
        style = "font-size: 3.3vh";
        job = false,
        blockedjobs = {},
        slot = 1,
        Alerts = 0,
    },
    ["whatsapp"] = {
        app = "whatsapp",
        tooltipText = "Messages",
        icon = "messages.svg",
        tooltipPos = "top",
        style = "font-size: 3.3vh";
        job = false,
        blockedjobs = {},
        slot = 2,
        Alerts = 0,
    },
    ["camera"] = {
        app = "camera",
        tooltipText = "Camera",
        icon = "camera.svg",
        job = false,
        blockedjobs = {},
        slot = 3,
        Alerts = 0,
    },
    ["settings"] = {
        app = "settings",
        tooltipText = "Settings",
        icon = "settings.svg",
        job = false,
        blockedjobs = {},
        slot = 4,
        Alerts = 0,
    },
    ["ping"] = {
        app = "ping",
        tooltipText = "Ping",
        icon = "map.svg",
        tooltipPos = "top",
        style = "font-size: 3.3vh";
        job = false,
        blockedjobs = {},
        slot = 5,
        Alerts = 0,
    },
    ["mail"] = {
        app = "mail",
        tooltipText = "Mail",
        icon = "mail.svg",
        style = "font-size: 3vh";
        job = false,
        blockedjobs = {},
        slot = 6,
        Alerts = 0,
    },
    ["proxi"] = {
        app = "proxi",
        tooltipText = "Proxi",
        icon = "yellowpages.svg",
        style = "font-size: 2vh";
        job = false,
        blockedjobs = {},
        slot = 7,
        Alerts = 0,
    },
    ["pulses"] = {
        app = "pulses",
        tooltipText = "Pulses",
        icon = "pulses.svg",
        tooltipPos = "top",
        job = false,
        blockedjobs = {},
        slot = 8,
        Alerts = 0,
    },
    ["party"] = {
        app = "party",
        tooltipText = "Party App",
        icon = "party.svg",
        style = "color: #78bdfd; font-size: 2.7vh";
        job = false,
        blockedjobs = {},
        slot = 9,
        Alerts = 0,
    },
    ["calculator"] = {
        app = "calculator",
        tooltipText = "Calculator",
        icon = "calculator.svg",
        tooltipPos = "bottom",
        style = "font-size: 2.5vh";
        job = false,
        blockedjobs = {},
        slot = 10,
        Alerts = 0,
    },
    ["gallery"] = {
        app = "gallery",
        tooltipText = "Gallery",
        icon = "gallery.svg",
        tooltipPos = "bottom",
        style = "font-size: 2.7vh";
        job = false,
        blockedjobs = {},
        slot = 11,
        Alerts = 0,
    },
    ["garage"] = {
        app = "garage",
        tooltipText = "Garages",
        icon = "garages.svg",
        style = "font-size: 3.3vh";
        job = false,
        blockedjobs = {},
        slot = 12,
        Alerts = 0,
    },
    ["bank"] = {
        app = "bank",
        tooltipText = "Bank",
        icon = "fleeca.svg",
        style = "font-size: 2.7vh";
        job = false,
        blockedjobs = {},
        slot = 13,
        Alerts = 0,
    },
    ["taxi"] = {
        app = "taxi",
        tooltipText = "Services",
        icon = "services.svg",
        tooltipPos = "bottom",
        style = "font-size: 3vh";
        job = false,
        blockedjobs = {},
        slot = 14,
        Alerts = 0,
    },
    --[[["contacts"] = {
        app = "contacts",
        tooltipText = "Contacts",
        icon = "contacts",
        tooltipPos = "top",
        style = "font-size: 3.3vh";
        job = false,
        blockedjobs = {},
        slot = 17,
        Alerts = 0,
    },
    ["documents"] = {
        app = "documents",
        tooltipText = "Documents",
        icon = "notes",
        style = "font-size: 3.3vh";
        job = false,
        blockedjobs = {},
        slot = 18,
        Alerts = 0,
    },
    ["houses"] = {
        app = "houses",
        tooltipText = "Houses",
        icon = "houses",
        style = "font-size: 3vh";
        job = false,
        blockedjobs = {},
        slot = 19,
        Alerts = 0,
    },
    ["crypto"] = {
        app = "crypto",
        tooltipText = "Crypto",
        icon = "crypto",
        style = "font-size: 2.7vh";
        job = false,
        blockedjobs = {},
        slot = 20,
        Alerts = 0,
    },
    ["lsbn"] = {
        app = "lsbn",
        tooltipText = "Wezeal News",
        icon = "weazelnews",
        job = false,
        blockedjobs = {},
        slot = 21,
        Alerts = 0,
    },
    ["group-chats"] = {
        app = "group-chats",
        icon = "darkchat",
        tooltipText = "Dark Web",
        tooltipPos = "top",
        style = "padding-right: .05vh; font-size: 3.3vh";
        job = false,
        blockedjobs = {},
        slot = 22,
        Alerts = 0,
    },]]--
    ["weed-marketplace"] = {
        app = "weed-marketplace",
        icon = "weed.svg",
        tooltipText = "Weed Marketplace",
        tooltipPos = "top",
        style = "padding-right: .05vh; font-size: 3.3vh";
        job = false,
        blockedjobs = {},
        slot = 22,
        Alerts = 0,
    },
}

Config.MaxSlots = 22

Config.JobCenter = {
    [1] = {
        vpn = false,
        label = "Towing",
        event = "qb-phone:jobcenter:tow",
        image = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSNQx-ryswSjCzxcwIw6Je2FEU2oTsZ5qSfjQ&s", -- Add your image URL here
    },
    [2] = {
        vpn = false,
        label = "Taxi",
        event = "qb-phone:jobcenter:taxi",
        image = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRqh2Xn413Ja2H-PEP9Cbnb4SspWSjnBRtf-w&s",
    },
    [3] = {
        vpn = false,
        label = "PostOp Worker",
        event = "qb-phone:jobcenter:postop",
        image = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTW0lWfmQ6HqAf3RqabLYhtgy5kV3Q7CcFHJQ&s",
    },
    [4] = {
        vpn = false,
        label = "Sanitaion Worker",
        event = "qb-phone:jobcenter:sanitation",
        image = "https://www.gta-multiplayer.cz/images/news/full-3277.jpg",
    },
    [5] = {
        vpn = false,
        label = "Convingtion Engineer",
        event = "qb-phone:jobcenter:engineer",
        image = "https://pbs.twimg.com/media/Ey8x5bSWUAgqI5C.jpg",
    },
    [6] = {
        vpn = true,
        label = "House Robbery",
        event = "sn-houserobbery:client:houserobbery",
        image = "",
    },
    [7] = {
        vpn = true,
        label = "Oxy Run",
        event = "sn-oxyrun:client:oxyrun",
        image = "",
    },
}

Config.ServiceJobs = {
    {
        Job = "taxi",
        Label = "Taxi",
        Tag = "Transport",
        Description = "Rides, pickups, and general city travel.",
        Accent = "#3b82f6",
        Icon = "fa-solid fa-taxi",
        MessageTemplate = "Hi, I need a pickup when you are available.",
    },
    {
        Job = "police",
        Jobs = { "police", "policejob" },
        Label = "Police",
        Tag = "Emergency",
        Description = "Report incidents, request backup, or ask for assistance.",
        Accent = "#2563eb",
        Icon = "fa-solid fa-shield-halved",
        MessageTemplate = "Hello officer, I need assistance.",
    },
    {
        Job = "ambulance",
        Jobs = { "ambulance", "ems" },
        Label = "EMS",
        Tag = "Medical",
        Description = "Medical response, transport, and urgent welfare checks.",
        Accent = "#ef4444",
        Icon = "fa-solid fa-truck-medical",
        MessageTemplate = "Hi EMS, I need medical assistance.",
    },
    {
        Job = "mechanic",
        Label = "Mechanic",
        Tag = "Repair",
        Description = "Roadside repairs, diagnostics, and vehicle recovery help.",
        Accent = "#f59e0b",
        Icon = "fa-solid fa-screwdriver-wrench",
        MessageTemplate = "Hi, I need help with my vehicle.",
    },
    {
        Job = "tow",
        Label = "Tow",
        Tag = "Roadside",
        Description = "Impounds, recoveries, and towing support.",
        Accent = "#14b8a6",
        Icon = "fa-solid fa-truck-pickup",
        MessageTemplate = "Hi, I need a tow when you are free.",
    },
    {
        Job = "realestate",
        Label = "Real Estate",
        Tag = "Housing",
        Description = "Property viewings, rentals, and housing questions.",
        Accent = "#8b5cf6",
        Icon = "fa-solid fa-house",
        MessageTemplate = "Hi, I would like to ask about a property.",
    },
}

Config.CryptoCoins = {
    {
        label = 'Shungite', -- label name
        abbrev = 'SHUNG', -- abbreviation
        icon = 'fa-solid fa-square-caret-up', -- icon
        metadata = 'shung', -- meta data name
        value = 50, -- price of coin
        purchase = true, -- TRUE ( crypto is purchaseable in the phone) FALSE ( crypto is not purchaseable and only exchangeable )
        sell = true -- TRUE ( crypto is sellable in the phone) FALSE ( crypto is not sellable )
    },
    {
        label = 'Guinea',
        abbrev = 'GNE',
        icon = 'fa-solid fa-horse-head',
        metadata = 'gne',
        value = 100,
        purchase = true,
        sell = false
    },
    {
        label = 'X Coin',
        abbrev = 'XNXX',
        icon = 'fa-solid fa-xmark',
        metadata = 'xcoin',
        value = 75,
        purchase = false,
        sell = true
    },
    {
        label = 'LME',
        abbrev = 'LME',
        icon = 'fa-solid fa-lemon',
        metadata = 'lme',
        value = 150,
        purchase = false,
        sell = false
    },
}
