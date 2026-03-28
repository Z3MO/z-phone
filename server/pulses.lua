local QBCore = exports['qb-core']:GetCoreObject()

Pulses = {}
local PulseCooldowns = {
    post = {},
    comment = {},
}

local function isRateLimited(cache, key, durationMs)
    local now = GetGameTimer()
    local lastTick = cache[key] or 0

    if (now - lastTick) < durationMs then
        return true
    end

    cache[key] = now
    return false
end

-- Events

CreateThread(function()
    local pulsesSelected = MySQL.query.await('SELECT p.*, pl.metadata FROM phone_pulses p LEFT JOIN players pl ON p.citizenid = pl.citizenid WHERE p.date > NOW() - INTERVAL ? hour', {Config.PulseDuration})
    
    for i = 1, #pulsesSelected do
        local pulse = pulsesSelected[i]
        if pulse.metadata then
            local meta = json.decode(pulse.metadata)
            pulse.profilePicture = meta.profilepicture or "img/default.png"
        else
            pulse.profilePicture = "img/default.png"
        end
        pulse.metadata = nil
        pulse.likes = {}
        local likes = MySQL.query.await('SELECT citizenid FROM phone_pulse_likes WHERE pulseId = ?', {pulse.pulseId})
        if likes then
            for _, like in pairs(likes) do
                table.insert(pulse.likes, like.citizenid)
            end
        end
    end
    Pulses = pulsesSelected
end)

RegisterNetEvent('qb-phone:server:DeletePulse', function(pulseId)
    local src = source
    local CID = QBCore.Functions.GetPlayer(src).PlayerData.citizenid
    local delete = false
    for i = 1, #Pulses do
        if Pulses[i].pulseId == pulseId and Pulses[i].citizenid == CID then
            table.remove(Pulses, i)
            delete = true
            MySQL.query.await('DELETE FROM phone_pulses WHERE pulseId = ? AND citizenid = ?', {pulseId, CID})
            break
        end
    end
    if not delete then return end
    TriggerClientEvent('qb-phone:client:UpdatePulses', -1, src, Pulses, true)
end)

RegisterNetEvent('qb-phone:server:UpdatePulses', function(PulseData)
    local src = source
    local Player = QBCore.Functions.GetPlayer(src)
    if not Player then return end

    if isRateLimited(PulseCooldowns.post, src, 1800) then
        return
    end

    local HasVPN = Player.Functions.GetItemByName(Config.VPNItem)

    if (PulseData.showAnonymous and HasVPN) then
        PulseData.firstName = "Anonymous"
        PulseData.lastName = ""
    end
    
    CreateThread(function()
        local affectedRows = MySQL.query.await('INSERT INTO phone_pulses (citizenid, firstName, lastName, message, url, pulseid, type) VALUES (?, ?, ?, ?, ?, ?, ?)', {
            PulseData.citizenid,
            PulseData.firstName:gsub("[%<>\"()\'$]",""),
            PulseData.lastName:gsub("[%<>\"()\'$]",""),
            PulseData.message:gsub("[%<>\"()\'$]",""),
            PulseData.url,
            PulseData.pulseId,
            PulseData.type,
        })
        if affectedRows and affectedRows.affectedRows > 0 then
            local result = MySQL.query.await('SELECT p.*, pl.metadata FROM phone_pulses p LEFT JOIN players pl ON p.citizenid = pl.citizenid WHERE p.pulseId = ?', {PulseData.pulseId})
            local pulse = result[1]
            if pulse then
                if pulse.metadata then
                    local meta = json.decode(pulse.metadata)
                    pulse.profilePicture = meta.profilepicture or "img/default.png"
                else
                    pulse.profilePicture = "img/default.png"
                end
                pulse.metadata = nil
                pulse.likes = {}
                table.insert(Pulses, pulse)
                TriggerClientEvent('qb-phone:client:UpdatePulses', -1, src, Pulses, false)
            end
        end
    end)
end)

-- Exported helper for other resources to post a pulse (used by external scripts).
local function AddNewPulse(PulseData)
    local pulseID = PulseData and PulseData.pulseId or "PULSE-"..math.random(11111111, 99999999)

    CreateThread(function()
        local affectedRows = MySQL.query.await('INSERT INTO phone_pulses (citizenid, firstName, lastName, message, url, pulseid, type) VALUES (?, ?, ?, ?, ?, ?, ?)', {
            PulseData.citizenid,
            PulseData.firstName:gsub("[%<>\"()\'$]",""),
            PulseData.lastName:gsub("[%<>\"()\'$]",""),
            PulseData.message:gsub("[%<>\"()\'$]",""),
            PulseData.url,
            pulseID,
            PulseData.type or "pulse",
        })
        if affectedRows and affectedRows.affectedRows > 0 then
            local result = MySQL.query.await('SELECT p.*, pl.metadata FROM phone_pulses p LEFT JOIN players pl ON p.citizenid = pl.citizenid WHERE p.pulseId = ?', {pulseID})
            local pulse = result[1]
            if pulse then
                if pulse.metadata then
                    local meta = json.decode(pulse.metadata)
                    pulse.profilePicture = meta.profilepicture or "img/default.png"
                else
                    pulse.profilePicture = "img/default.png"
                end
                pulse.metadata = nil
                pulse.likes = {}
                table.insert(Pulses, pulse)
                TriggerClientEvent('qb-phone:client:UpdatePulses', -1, 0, Pulses, false)
            end
        end
    end)
end exports("AddNewPulse", AddNewPulse)

QBCore.Functions.CreateCallback('qb-phone:server:GetServerPulses', function(source, cb)
    cb(Pulses)
end)

QBCore.Functions.CreateCallback('qb-phone:server:GetPulseComments', function(source, cb, pulseId)
    local comments = MySQL.query.await('SELECT c.*, p.metadata FROM phone_pulse_comments c LEFT JOIN players p ON c.citizenid = p.citizenid WHERE c.pulseId = ? ORDER BY c.date ASC', {pulseId})
    for i = 1, #comments do
        if comments[i].metadata then
            local meta = json.decode(comments[i].metadata)
            comments[i].profilePicture = meta.profilepicture or "img/default.png"
        else
            comments[i].profilePicture = "img/default.png"
        end
        comments[i].metadata = nil
    end
    cb(comments)
end)

QBCore.Functions.CreateCallback('qb-phone:server:GetPulseNotifications', function(source, cb)
    local Player = QBCore.Functions.GetPlayer(source)
    if not Player then cb({}) return end
    local notifications = MySQL.query.await('SELECT * FROM phone_pulse_notifications WHERE citizenid = ? ORDER BY date DESC LIMIT 50', {Player.PlayerData.citizenid})
    cb(notifications or {})
end)

-- Get comment counts for a list of pulse IDs
QBCore.Functions.CreateCallback('qb-phone:server:GetPulseCommentCounts', function(source, cb, pulseIds)
    if not pulseIds or #pulseIds == 0 then cb({}) return end
    local placeholders = table.concat((function() local t = {}; for i=1,#pulseIds do t[i] = '?' end; return t end)(), ',')
    local sql = 'SELECT pulseId, COUNT(*) as count FROM phone_pulse_comments WHERE pulseId IN ('..placeholders..') GROUP BY pulseId'
    local result = MySQL.query.await(sql, pulseIds)
    local counts = {}
    for _, row in ipairs(result) do
        counts[row.pulseId] = row.count
    end
    cb(counts)
end)

RegisterNetEvent('qb-phone:server:PostPulseComment', function(pulseId, comment)
    local src = source
    local Player = QBCore.Functions.GetPlayer(src)
    
    if not Player then return end

    if isRateLimited(PulseCooldowns.comment, src, 700) then
        return
    end
    
    local sanitizedComment = tostring(comment or ''):gsub("[%<>\"()\'$]","")

    MySQL.Async.execute('INSERT INTO phone_pulse_comments (pulseId, citizenid, firstName, lastName, comment, date) VALUES (?, ?, ?, ?, ?, ?)', {
        pulseId,
        Player.PlayerData.citizenid,
        Player.PlayerData.charinfo.firstname,
        Player.PlayerData.charinfo.lastname,
        sanitizedComment,
        os.date('%Y-%m-%d %H:%M:%S')
    })

    -- Add notification for the pulse owner
    local pulseOwner = MySQL.query.await('SELECT citizenid FROM phone_pulses WHERE pulseId = ?', {pulseId})
    if pulseOwner and pulseOwner[1] and pulseOwner[1].citizenid ~= Player.PlayerData.citizenid then
        local ownerCid = pulseOwner[1].citizenid
        MySQL.Async.execute('INSERT INTO phone_pulse_notifications (citizenid, sender_cid, sender_name, pulseId, type, text) VALUES (?, ?, ?, ?, ?, ?)', {
            ownerCid,
            Player.PlayerData.citizenid,
            Player.PlayerData.charinfo.firstname .. ' ' .. Player.PlayerData.charinfo.lastname,
            pulseId,
            'comment',
            sanitizedComment
        })

        local ownerPlayer = QBCore.Functions.GetPlayerByCitizenId(ownerCid)
        if ownerPlayer then
            TriggerClientEvent('qb-phone:client:CustomNotification', ownerPlayer.PlayerData.source,
                'Pulses',
                (Player.PlayerData.charinfo.firstname .. ' ' .. Player.PlayerData.charinfo.lastname) .. ' commented on your pulse.',
                'fas fa-comment',
                '#1DA1F2',
                3500
            )
        end
    end

    -- Broadcast the updated pulses to all clients to refresh comment counts
    TriggerClientEvent('qb-phone:client:UpdatePulses', -1, 0, Pulses, false)
end)

RegisterNetEvent('qb-phone:server:EditPulse', function(pulseId, message, url)
    local src = source
    local Player = QBCore.Functions.GetPlayer(src)
    if not Player then return end
    local cid = Player.PlayerData.citizenid

    -- Update the pulse in the database
    MySQL.query.await('UPDATE phone_pulses SET message = ?, url = ? WHERE pulseId = ? AND citizenid = ?', {
        message:gsub("[%<>\"()\'$]",""),
        url,
        pulseId,
        cid
    })

    -- Update the pulse in the in-memory table
    for i = 1, #Pulses do
        if Pulses[i].pulseId == pulseId and Pulses[i].citizenid == cid then
            Pulses[i].message = message:gsub("[%<>\"()\'$]","")
            Pulses[i].url = url
            break
        end
    end

    -- Broadcast the updated pulses to all clients
    TriggerClientEvent('qb-phone:client:UpdatePulses', -1, 0, Pulses, false)
end)

RegisterNetEvent('qb-phone:server:TogglePulseLike', function(pulseId)
    local src = source
    local Player = QBCore.Functions.GetPlayer(src)
    if not Player then return end
    local cid = Player.PlayerData.citizenid

    local check = MySQL.query.await('SELECT * FROM phone_pulse_likes WHERE pulseId = ? AND citizenid = ?', {pulseId, cid})
    if check[1] then
        MySQL.query.await('DELETE FROM phone_pulse_likes WHERE pulseId = ? AND citizenid = ?', {pulseId, cid})
    else
        MySQL.query.await('INSERT INTO phone_pulse_likes (pulseId, citizenid) VALUES (?, ?)', {pulseId, cid})
        -- Add notification for the pulse owner
        local pulseOwner = MySQL.query.await('SELECT citizenid FROM phone_pulses WHERE pulseId = ?', {pulseId})
        if pulseOwner and pulseOwner[1] and pulseOwner[1].citizenid ~= cid then
            MySQL.Async.execute('INSERT INTO phone_pulse_notifications (citizenid, sender_cid, sender_name, pulseId, type) VALUES (?, ?, ?, ?, ?)', {
                pulseOwner[1].citizenid,
                cid,
                Player.PlayerData.charinfo.firstname .. ' ' .. Player.PlayerData.charinfo.lastname,
                pulseId,
                'like'
            })
        end
    end

    for i = 1, #Pulses do
        if Pulses[i].pulseId == pulseId then
            if not Pulses[i].likes then Pulses[i].likes = {} end
            local found = false
            for k, v in pairs(Pulses[i].likes) do
                if v == cid then
                    table.remove(Pulses[i].likes, k)
                    found = true
                    break
                end
            end
            if not found then
                table.insert(Pulses[i].likes, cid)
            end
            break
        end
    end
    
    TriggerClientEvent('qb-phone:client:UpdatePulses', -1, 0, Pulses, false)
end)

RegisterNetEvent('qb-phone:server:UpdateProfile', function(profilePicture, bio, banner)
    local src = source
    local Player = QBCore.Functions.GetPlayer(src)
    if not Player then return end
    local cid = Player.PlayerData.citizenid
    
    -- Update the live player data. This also saves to the `players` table and notifies the client.
    Player.Functions.SetMetaData("profilepicture", profilePicture)
    Player.Functions.SetMetaData("bio", bio)
    Player.Functions.SetMetaData("banner", banner)
end)