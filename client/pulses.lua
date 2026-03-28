local QBCore = exports['qb-core']:GetCoreObject()
local NUIActionCooldowns = {}

local function isNuiRateLimited(action, durationMs)
    local now = GetGameTimer()
    local lastTick = NUIActionCooldowns[action] or 0

    if (now - lastTick) < durationMs then
        return true
    end

    NUIActionCooldowns[action] = now
    return false
end

-- Functions

local function escape_str(s)
	return s
end

local function GeneratePulseId()
    local pulseId = "PULSE-"..math.random(11111111, 99999999)
    return pulseId
end

-- NUI Callback

RegisterNUICallback('GetPulses', function(_, cb)
    QBCore.Functions.TriggerCallback('qb-phone:server:GetServerPulses', function(serverPulses)
        PhoneData.Pulses = serverPulses
        local hasVPN = QBCore.Functions.HasItem(Config.VPNItem)
        cb({
            PulseData = PhoneData.Pulses,
            hasVPN = hasVPN,
        })
    end)
end)

RegisterNUICallback('PostNewPulse', function(data, cb)
    if isNuiRateLimited('post-pulse', 1200) then
        cb({ success = false, message = 'Please wait before posting again.' })
        return
    end

    local URL

    if data.url ~= "" and string.match(data.url, '[a-z]*://[^ >,;]*') then
        URL = data.url
    else
        URL = ""
    end

    local PulseMessage = {
        firstName = PhoneData.PlayerData.charinfo.firstname,
        lastName = PhoneData.PlayerData.charinfo.lastname,
        citizenid = PhoneData.PlayerData.citizenid,
        message = escape_str(data.Message):gsub("[%<>\"()\'$]",""),
        time = data.Date,
        pulseId = GeneratePulseId(),
        type = data.type,
        url = URL,
        showAnonymous = data.anonymous
    }

    TriggerServerEvent('qb-phone:server:UpdatePulses', PulseMessage)
    cb({ success = true })
end)

RegisterNUICallback('DeletePulse',function(data)
    TriggerServerEvent('qb-phone:server:DeletePulse', data.id)
end)

RegisterNUICallback('FlagPulse',function(data, cb)
    QBCore.Functions.Notify(data.name..' was reported for saying '..data.message, "error")
    cb('ok')
end)

RegisterNUICallback('GetPulseComments', function(data, cb)
    QBCore.Functions.TriggerCallback('qb-phone:server:GetPulseComments', function(comments)
        cb(comments)
    end, data.pulseId)
end)

RegisterNUICallback('GetPulseNotifications', function(data, cb)
    QBCore.Functions.TriggerCallback('qb-phone:server:GetPulseNotifications', function(notifications)
        cb(notifications)
    end)
end)

RegisterNUICallback('GetPulseCommentCounts', function(data, cb)
    QBCore.Functions.TriggerCallback('qb-phone:server:GetPulseCommentCounts', function(counts)
        cb(counts)
    end, data.pulseIds)
end)

RegisterNUICallback('PostPulseComment', function(data, cb)
    if isNuiRateLimited('post-pulse-comment', 500) then
        cb({success = false, message = 'You are commenting too quickly.'})
        return
    end

    TriggerServerEvent('qb-phone:server:PostPulseComment', data.pulseId, data.comment)
    cb({success = true})
end)

RegisterNUICallback('ToggleLikePulse', function(data, cb)
    TriggerServerEvent('qb-phone:server:TogglePulseLike', data.pulseId)
    cb('ok')
end)

RegisterNUICallback('EditPulse', function(data, cb)
    TriggerServerEvent('qb-phone:server:EditPulse', data.pulseId, data.message, data.url)
    cb('ok')
end)

RegisterNUICallback('UpdateProfile', function(data, cb)
    TriggerServerEvent('qb-phone:server:UpdateProfile', data.profilePicture, data.bio, data.banner)
    cb('ok')
end)

-- Events

RegisterNetEvent('qb-phone:client:UpdatePulses', function(src, Pulses, delete)
    if not PhoneData or not FullyLoaded then return end
    PhoneData.Pulses = Pulses
    local MyPlayerId = PlayerData.source or -1


    if delete and src == MyPlayerId then
        SendNUIMessage({
            action = "PhoneNotification",
            PhoneNotify = {
                title = "Pulses",
                text = "Pulse deleted!",
                icon = "fas fa-wave-pulse",
                color = "#1DA1F2",
                timeout = 1000,
            },
        })
    end

    local hasVPN = QBCore.Functions.HasItem(Config.VPNItem)

    SendNUIMessage({
        action = "UpdatePulses",
        Pulses = PhoneData.Pulses,
        hasVPN = hasVPN,
    })

    if delete then return end

    local NewPulseData = Pulses[#Pulses]
    if not NewPulseData then return end
    local newFirst, newLast = NewPulseData.firstName:gsub("[%<>\"()\'$]",""), NewPulseData.lastName:gsub("[%<>\"()\' $]","")


    if not delete and src == MyPlayerId then return end

    if not delete then
        SendNUIMessage({
            action = "PhoneNotification",
            PhoneNotify = {
                title = "@"..newFirst.." "..newLast,
                text = NewPulseData.message:gsub("[%<>\"()\'$]",""),
                icon = "fas fa-wave-pulse",
                color = "#1DA1F2",
            },
        })
    end
end)