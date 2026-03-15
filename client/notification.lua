local Result = nil
local test = false

-- NUI Callbacks

RegisterNUICallback('AcceptNotification', function(data, cb)
    Result = true
    Wait(100)
    test = false
    cb('ok')
end)

RegisterNUICallback('DenyNotification', function(data, cb)
    Result = false
    Wait(100)
    test = false
    cb('ok')
end)

RegisterNUICallback('PlaySound', function(data, cb)
    -- Respect mute / vibrate modes set in Sound & Vibration settings
    if not (PhoneSettings and (PhoneSettings.muted or PhoneSettings.vibrate)) then
        PlaySound(-1, data.sound, data.table, 0, 0, 1)
    end
    cb('ok')
end)

-- Events

RegisterNetEvent("qb-phone:client:CustomNotification", function(title, text, icon, color, timeout) -- Send a PhoneNotification to the phone from anywhere
    SendNUIMessage({
        action = "PhoneNotification",
        PhoneNotify = {
            title = title,
            text = text,
            icon = icon,
            color = color,
            timeout = timeout,
        },
    })
end)

-- ex. local success = exports['z-phone']:PhoneNotification("PING", info.Name..' Incoming Ping', 'fas fa-map-pin', '#b3e0f2', "NONE", 'fas fa-check-circle', 'fas fa-times-circle')

RegisterNetEvent("qb-phone:client:CustomNotification2", function(title, text, icon, color, timeout, accept, deny) -- Send a PhoneNotification to the phone from anywhere
    SendNUIMessage({
        action = "PhoneNotificationCustom",
        PhoneNotify = {
            title = title,
            text = text,
            icon = icon,
            color = color,
            timeout = timeout,
            accept = accept,
            deny = deny,
        },
    })
end)

-- Functions

local function PhoneNotification(title, text, icon, color, timeout, accept, deny)
    Result = nil
    test = true
    SendNUIMessage({
        action = "PhoneNotificationCustom",
        PhoneNotify = {
            title = title,
            text = text,
            icon = icon,
            color = color,
            timeout = timeout,
            accept = accept,
            deny = deny,
        },
    })
    while test do
        Wait(5)
    end
    Wait(100)
    return Result
end exports("PhoneNotification", PhoneNotification)

RegisterCommand('notify2', function()
    exports['z-phone']:PhoneNotification("PING", ' Incoming Ping', 'fas fa-map-pin', '#b3e0f2', 10000, 'fas fa-check-circle', 'fas fa-times-circle')
end)

RegisterCommand('notify', function()
    TriggerEvent('qb-phone:client:CustomNotification', "PING", ' Incoming Ping', 'fas fa-map-pin', '#b3e0f2', 1000)
end)
