local QBCore = exports['qb-core']:GetCoreObject()
Proxis = {}
local ProxiID = 0
local ProxiPostCooldowns = {}

local function isRateLimited(cache, key, durationMs)
    local now = GetGameTimer()
    local lastTick = cache[key] or 0

    if (now - lastTick) < durationMs then
        return true
    end

    cache[key] = now
    return false
end

RegisterNetEvent('qb-phone:server:AddProxi', function(msg, url)
    local src = source
    local Player = QBCore.Functions.GetPlayer(src)
    if not Player then return end

    if isRateLimited(ProxiPostCooldowns, src, 1600) then
        return
    end

    local name = ("%s %s"):format(Player.PlayerData.charinfo.firstname, Player.PlayerData.charinfo.lastname)
    if not url then url = "" else url = url:gsub("[%<>\"()\'$]","") end

    ProxiID = ProxiID + 1

    Proxis[#Proxis+1] = {
        message = msg:gsub("[%<>\"()\'$]",""),
        name = name,
        number = Player.PlayerData.charinfo.phone,
        url = url,
        source = src,
        citizenid = Player.PlayerData.citizenid,
        id = ProxiID
    }

    TriggerClientEvent('qb-phone:client:UpdateProxis', -1, Proxis, name, src)
end)

RegisterNetEvent('qb-phone:server:DeleteProxi', function(id)
    local src = source
    local Player = QBCore.Functions.GetPlayer(src)
    if not Player then return end
    for k, v in pairs(Proxis) do
        if ((v.citizenid == Player.PlayerData.citizenid) or (not v.citizenid and v.source == src)) and v.id == tonumber(id) then
            table.remove(Proxis, k)
            break
        end
    end
    TriggerClientEvent('qb-phone:client:UpdateProxis', -1, Proxis)
end)

RegisterNetEvent('qb-phone:server:flagProxi', function(number)
    local src = source
    local Player = QBCore.Functions.GetPlayerByPhone(number)
    local citizenid = Player.PlayerData.citizenid
    local name = Player.PlayerData.charinfo.firstname..' '..Player.PlayerData.charinfo.lastname
    -- Add some type of log here for admins to keep track of flagged posts
    TriggerClientEvent('QBCore:Notify', src, 'Post by '..name.. ' ['..citizenid..'] has been flagged', 'error')
end)
