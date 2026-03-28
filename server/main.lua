local QBCore = exports['qb-core']:GetCoreObject()
local Calls = {}
local ContactShareCooldowns = {}
local CallRequestCooldowns = {}
local CONTACT_SHARE_COOLDOWN_MS = 1500
local CALL_REQUEST_COOLDOWN_MS = 1200

-- Functions
local function escape_sqli(source)
    local replacements = {
        ['"'] = '\\"',
        ["'"] = "\\'"
    }
    return source:gsub("['\"]", replacements)
end

local function SplitStringToArray(string)
    local retval = {}
    for i in string.gmatch(string, "%S+") do
        retval[#retval+1] = i
    end
    return retval
end

local function trim(value)
    return (tostring(value or ''):gsub('^%s+', ''):gsub('%s+$', ''))
end

local function sanitizeText(value, maxLength)
    local sanitized = trim(tostring(value or ''):gsub('[^%w%s%-%._\']', ''):gsub('%s+', ' '))
    if maxLength and #sanitized > maxLength then
        sanitized = sanitized:sub(1, maxLength)
    end
    return sanitized
end

local function sanitizePhoneNumber(value)
    return tostring(value or ''):gsub('%D', ''):sub(1, 15)
end

local function sanitizeIban(value)
    return tostring(value or ''):gsub('[^%w%-]', ''):sub(1, 32)
end

local function isOnCooldown(cache, key, durationMs)
    local now = GetGameTimer()
    local lastTick = cache[key] or 0

    if (now - lastTick) < durationMs then
        return true
    end

    cache[key] = now
    return false
end

local function hasStoredContactConflict(citizenId, number, ignoreName, ignoreNumber)
    local storedContacts = exports.oxmysql:executeSync('SELECT name, number FROM player_contacts WHERE citizenid = ?', {citizenId})

    for _, contact in pairs(storedContacts or {}) do
        local contactName = sanitizeText(contact.name, 48)
        local contactNumber = sanitizePhoneNumber(contact.number)
        local isIgnoredRow = ignoreName ~= nil and ignoreNumber ~= nil and contactName == ignoreName and contactNumber == ignoreNumber

        if not isIgnoredRow and contactNumber == number then
            return true
        end
    end

    return false
end

local function getPlayerCoords(playerId)
    local ped = GetPlayerPed(playerId)
    if not ped or ped == 0 then return nil end
    return GetEntityCoords(ped)
end

local function getDistanceBetweenPlayers(sourceId, targetId)
    local sourceCoords = getPlayerCoords(sourceId)
    local targetCoords = getPlayerCoords(targetId)
    if not sourceCoords or not targetCoords then return nil end
    return #(sourceCoords - targetCoords)
end

local function buildSuggestionData(player)
    return {
        name = {
            [1] = sanitizeText(player.PlayerData.charinfo.firstname, 24),
            [2] = sanitizeText(player.PlayerData.charinfo.lastname, 24)
        },
        number = sanitizePhoneNumber(player.PlayerData.charinfo.phone),
        bank = sanitizeIban(player.PlayerData.charinfo.account)
    }
end

local function normalizeImageUrl(url)
    if type(url) ~= 'string' then return nil end
    url = url:match('^%s*(.-)%s*$')
    if not url or #url < 8 or #url > 1000 then return nil end
    if not url:match('^https?://') then return nil end
    return url
end

local function buildScreenshotUploadUrl(webhook)
    local cleanWebhook = tostring(webhook or ''):match('^%s*(.-)%s*$')
    if cleanWebhook == '' then
        return ''
    end

    local isDiscord = cleanWebhook:find('discord.com/api/webhooks', 1, true)
        or cleanWebhook:find('discordapp.com/api/webhooks', 1, true)

    if isDiscord and not cleanWebhook:find('wait=', 1, true) then
        if cleanWebhook:find('?', 1, true) then
            return cleanWebhook .. '&wait=true'
        end
        return cleanWebhook .. '?wait=true'
    end

    return cleanWebhook
end

local function extractUploadedImageUrl(uploadData)
    if type(uploadData) ~= 'string' or uploadData == '' then
        return nil
    end

    local directUrl = normalizeImageUrl(uploadData)
    if directUrl then return directUrl end

    local ok, decoded = pcall(json.decode, uploadData)
    if not ok or type(decoded) ~= 'table' then
        return nil
    end

    if decoded.attachments and decoded.attachments[1] then
        local attachment = decoded.attachments[1]
        local attachmentUrl = normalizeImageUrl(attachment.proxy_url or attachment.url)
        if attachmentUrl then return attachmentUrl end
    end

    return normalizeImageUrl(decoded.url)
end

local function sendContactSuggestion(sourceId, targetId, radius)
    local src = tonumber(sourceId)
    local target = tonumber(targetId)
    local maxRadius = radius or 5.0

    if not src or not target or src == target then
        return false, 'Invalid target player.'
    end

    local player = QBCore.Functions.GetPlayer(src)
    local targetPlayer = QBCore.Functions.GetPlayer(target)
    if not player or not targetPlayer then
        return false, 'Player is no longer available.'
    end

    local distance = getDistanceBetweenPlayers(src, target)
    if not distance or distance > maxRadius then
        return false, 'Player must be within 5m.'
    end

    TriggerClientEvent('qb-phone:client:AddNewSuggestion', target, buildSuggestionData(player))
    return true, ('Your number was sent to ID %s.'):format(target)
end

-- Callbacks

QBCore.Functions.CreateCallback('qb-phone:server:GetCallState', function(source, cb, ContactData)
    local number = sanitizePhoneNumber(ContactData and ContactData.number)
    local Target = QBCore.Functions.GetPlayerByPhone(number)
    local Player = QBCore.Functions.GetPlayer(source)

    if not Player or number == '' then return cb(false, false) end
    if not Target then return cb(false, false) end

    if Target.PlayerData.citizenid == Player.PlayerData.citizenid then return cb(false, false) end

    if Calls[Target.PlayerData.citizenid] then
        if Calls[Target.PlayerData.citizenid].inCall then
            cb(false, true)
        else
            cb(true, true)
        end
    else
        cb(true, true)
    end
end)

QBCore.Functions.CreateCallback('qb-phone:server:GetPhoneData', function(source, cb)
    local src = source
    local Player = QBCore.Functions.GetPlayer(src)
    if not Player or not src then return end
    local CID = Player.PlayerData.citizenid

    local PhoneData = {
        PlayerContacts = {},
        Chats = {},
        Hashtags = {},
        Invoices = {},
        Garage = {},
        Mails = {},
        Documents = {},
        Proxis = Proxis,
        Images = {},
        ChatRooms = {},
    }

    local result = exports.oxmysql:executeSync('SELECT * FROM player_contacts WHERE citizenid = ? ORDER BY name ASC', {CID})
    if result[1] then
        PhoneData.PlayerContacts = result
    end

    local Invoices = exports.oxmysql:executeSync('SELECT * FROM pefcl_invoices WHERE toIdentifier = ?', {CID})
    if Invoices[1] then
        PhoneData.Invoices = Invoices
    end

    local Note = exports.oxmysql:executeSync('SELECT * FROM phone_note WHERE citizenid = ?', {CID})
    if Note[1] then
        PhoneData.Documents = Note
    end

    cb(PhoneData)
end)

QBCore.Functions.CreateCallback('qb-phone:server:GetPlayerChats', function(source, cb)
    local src = source
    local Player = QBCore.Functions.GetPlayer(src)
    if not Player then
        cb({})
        return
    end

    local CID = Player.PlayerData.citizenid
    local messages = exports.oxmysql:executeSync('SELECT * FROM phone_messages WHERE citizenid = ?', {CID})
    cb(messages or {})
end)

QBCore.Functions.CreateCallback('qb-phone:server:GetPlayerMails', function(source, cb)
    local src = source
    local Player = QBCore.Functions.GetPlayer(src)
    if not Player then
        cb({})
        return
    end

    local CID = Player.PlayerData.citizenid
    local mails = exports.oxmysql:executeSync('SELECT * FROM player_mails WHERE citizenid = ? ORDER BY `date` ASC', {CID}) or {}

    for _, mail in pairs(mails) do
        if type(mail.button) == 'string' and mail.button ~= '' then
            mail.button = json.decode(mail.button)
        end
    end

    cb(mails)
end)

QBCore.Functions.CreateCallback('qb-phone:server:GetChatRoomList', function(source, cb)
    local chat_rooms = MySQL.query.await("SELECT id, room_code, room_name, room_owner_id, room_owner_name, room_members, is_pinned, IF(room_pin = '' or room_pin IS NULL, false, true) AS protected FROM phone_chatrooms") or {}
    cb(chat_rooms)
end)


-- Can't even wrap my head around this lol diffently needs a good old rewrite
QBCore.Functions.CreateCallback('qb-phone:server:FetchResult', function(_, cb, input)
    local search = trim(input)
    local searchData = {}
    local ApaData = {}
    if search == '' then
        cb(nil)
        return
    end

    local searchParameters = SplitStringToArray(search)
    local query = 'SELECT * FROM `players` WHERE `citizenid` = ?'
    local parameters = { search }

    if #searchParameters > 0 then
        query = query .. ' OR ('
        for i = 1, #searchParameters do
            if i > 1 then
                query = query .. ' AND '
            end

            query = query .. '`charinfo` LIKE ?'
            parameters[#parameters + 1] = ('%%' .. searchParameters[i] .. '%%')
        end
        query = query .. ')'
    end

    local ApartmentData = exports.oxmysql:executeSync('SELECT * FROM apartments', {})
    for k, v in pairs(ApartmentData) do
        ApaData[v.citizenid] = ApartmentData[k]
    end
    local result = exports.oxmysql:executeSync(query, parameters)
    if result[1] then
        for _, v in pairs(result) do
            local charinfo = json.decode(v.charinfo)
            local metadata = json.decode(v.metadata)
            local appiepappie = {}
            if ApaData[v.citizenid] and next(ApaData[v.citizenid]) then
                appiepappie = ApaData[v.citizenid]
            end
            searchData[#searchData+1] = {
                citizenid = v.citizenid,
                firstname = charinfo.firstname,
                lastname = charinfo.lastname,
                birthdate = charinfo.birthdate,
                phone = charinfo.phone,
                nationality = charinfo.nationality,
                gender = charinfo.gender,
                warrant = false,
                driverlicense = metadata["licences"]["driver"],
                appartmentdata = appiepappie
            }
        end
        cb(searchData)
    else
        cb(nil)
    end
end)

QBCore.Functions.CreateCallback('qb-phone:server:CaptureAndUploadPhoto', function(source, cb)
    local src = source
    local Player = QBCore.Functions.GetPlayer(src)
    if not Player then
        cb({ success = false, message = 'Player not found.' })
        return
    end

    local webhook = buildScreenshotUploadUrl(Config.Webhook)
    if webhook == '' then
        cb({ success = false, message = 'Camera webhook is not configured.' })
        return
    end

    exports['screenshot-basic']:requestClientScreenshot(src, {
        encoding = 'jpg',
        quality = 0.92,
        uploadURL = webhook,
        uploadField = 'files[]',
    }, function(err, uploadData)
        if err then
            cb({ success = false, message = 'Screenshot capture failed.' })
            return
        end

        if not uploadData then
            cb({ success = false, message = 'No response from upload server.' })
            return
        end

        local imageUrl = extractUploadedImageUrl(uploadData)
        if not imageUrl then
            cb({ success = false, message = 'Upload succeeded but no image URL was returned.' })
            return
        end

        exports.oxmysql:insert(
            'INSERT INTO phone_gallery (`citizenid`, `image`) VALUES (?, ?)',
            { Player.PlayerData.citizenid, imageUrl }
        )

        cb({ success = true, url = imageUrl })
    end)
end)

QBCore.Functions.CreateCallback('qb-phone:server:GetNearbyPhonePlayers', function(source, cb)
    local nearbyPlayers = {}
    local currentPlayer = QBCore.Functions.GetPlayer(source)
    if not currentPlayer then
        cb(nearbyPlayers)
        return
    end

    for _, playerId in ipairs(QBCore.Functions.GetPlayers()) do
        local targetId = tonumber(playerId)
        if targetId and targetId ~= source then
            local targetPlayer = QBCore.Functions.GetPlayer(targetId)
            local distance = targetPlayer and getDistanceBetweenPlayers(source, targetId)
            if targetPlayer and distance and distance <= 5.0 then
                nearbyPlayers[#nearbyPlayers + 1] = {
                    id = targetId,
                    name = ('%s %s'):format(
                        sanitizeText(targetPlayer.PlayerData.charinfo.firstname, 24),
                        sanitizeText(targetPlayer.PlayerData.charinfo.lastname, 24)
                    ),
                    distance = math.floor(distance * 10 + 0.5) / 10
                }
            end
        end
    end

    table.sort(nearbyPlayers, function(a, b)
        if a.distance == b.distance then
            return a.id < b.id
        end

        return a.distance < b.distance
    end)

    cb(nearbyPlayers)
end)

QBCore.Functions.CreateCallback('qb-phone:server:SharePhoneContact', function(source, cb, targetId)
    if isOnCooldown(ContactShareCooldowns, source, CONTACT_SHARE_COOLDOWN_MS) then
        cb(false, 'Wait a moment before sharing again.')
        return
    end

    local success, message = sendContactSuggestion(source, targetId, 5.0)
    cb(success, message)
end)

-- Events
RegisterNetEvent('qb-phone:server:SetCallState', function(bool)
    local src = source
    local Ply = QBCore.Functions.GetPlayer(src)

    if not Ply then return end

    if not Calls[Ply.PlayerData.citizenid] then Calls[Ply.PlayerData.citizenid] = {} end
    Calls[Ply.PlayerData.citizenid].inCall = bool
end)

RegisterNetEvent('qb-phone:server:CallContact', function(TargetData, CallId, AnonymousCall)
    local src = source
    local Ply = QBCore.Functions.GetPlayer(src)
    local number = sanitizePhoneNumber(TargetData and TargetData.number)
    local Target = QBCore.Functions.GetPlayerByPhone(number)
    if not Target or not Ply or number == '' then return end
    if Ply.PlayerData.citizenid == Target.PlayerData.citizenid then return end
    if isOnCooldown(CallRequestCooldowns, src, CALL_REQUEST_COOLDOWN_MS) then return end
    if Calls[Ply.PlayerData.citizenid] and Calls[Ply.PlayerData.citizenid].inCall then return end
    if Calls[Target.PlayerData.citizenid] and Calls[Target.PlayerData.citizenid].inCall then return end

    TriggerClientEvent('qb-phone:client:GetCalled', Target.PlayerData.source, Ply.PlayerData.charinfo.phone, CallId, AnonymousCall)
end)

RegisterNetEvent('qb-phone:server:EditContact', function(newName, newNumber, NewIban, oldName, oldNumber)
    local src = source
    local Player = QBCore.Functions.GetPlayer(src)

    if not Player then return end

    newName = sanitizeText(newName, 48)
    newNumber = sanitizePhoneNumber(newNumber)
    NewIban = sanitizeIban(NewIban)
    oldName = sanitizeText(oldName, 48)
    oldNumber = sanitizePhoneNumber(oldNumber)

    if newName == '' or #newNumber < 3 or oldName == '' or #oldNumber < 3 then
        return
    end

    if newNumber == sanitizePhoneNumber(Player.PlayerData.charinfo.phone) then
        return TriggerClientEvent('qb-phone:client:CustomNotification', src, 'Phone', "You can't save your own number.", 'fas fa-user-pen', '#e84118', 2500)
    end

    if hasStoredContactConflict(Player.PlayerData.citizenid, newNumber, oldName, oldNumber) then
        return TriggerClientEvent('qb-phone:client:CustomNotification', src, 'Phone', 'Another contact already uses that number.', 'fas fa-user-pen', '#e84118', 2500)
    end

    exports.oxmysql:execute('UPDATE player_contacts SET name = ?, number = ?, iban = ? WHERE citizenid = ? AND name = ? AND number = ?',
        {newName, newNumber, NewIban, Player.PlayerData.citizenid, oldName, oldNumber})
end)

RegisterNetEvent('qb-phone:server:RemoveContact', function(Name, Number)
    local src = source
    local Player = QBCore.Functions.GetPlayer(src)

    if not Player then return end

    Name = sanitizeText(Name, 48)
    Number = sanitizePhoneNumber(Number)
    if Name == '' or #Number < 3 then return end

    exports.oxmysql:execute('DELETE FROM player_contacts WHERE name = ? AND number = ? AND citizenid = ?',
        {Name, Number, Player.PlayerData.citizenid})
end)

RegisterNetEvent('qb-phone:server:AddNewContact', function(name, number, iban)
    local src = source
    local Player = QBCore.Functions.GetPlayer(src)
    iban = sanitizeIban(iban or 0)
    name = sanitizeText(name, 48)
    number = sanitizePhoneNumber(number)

    if not Player then return end
    if name == '' or #number < 3 then return end
    if number == sanitizePhoneNumber(Player.PlayerData.charinfo.phone) then
        return TriggerClientEvent('qb-phone:client:CustomNotification', src, 'Phone', "You can't save your own number.", 'fas fa-address-book', '#e84118', 2500)
    end
    if hasStoredContactConflict(Player.PlayerData.citizenid, number) then
        return TriggerClientEvent('qb-phone:client:CustomNotification', src, 'Phone', 'That contact already exists.', 'fas fa-address-book', '#e84118', 2500)
    end

    exports.oxmysql:insert('INSERT INTO player_contacts (citizenid, name, number, iban) VALUES (?, ?, ?, ?)', {Player.PlayerData.citizenid, tostring(name), number, iban})
end)

RegisterNetEvent('qb-phone:server:AddRecentCall', function(type, data)
    local src = source
    local Ply = QBCore.Functions.GetPlayer(src)
    local Hour = os.date("%H")
    local Minute = os.date("%M")
    local label = Hour .. ":" .. Minute

    TriggerClientEvent('qb-phone:client:AddRecentCall', src, data, label, type)

    local Target = QBCore.Functions.GetPlayerByPhone(data.number)
    if not Target then return end

    TriggerClientEvent('qb-phone:client:AddRecentCall', Target.PlayerData.source, {
        name = Ply.PlayerData.charinfo.firstname .. " " .. Ply.PlayerData.charinfo.lastname,
        number = Ply.PlayerData.charinfo.phone,
        anonymous = data.anonymous
    }, label, "outgoing")
end)

RegisterNetEvent('qb-phone:server:GiveContactDetails', function(PlayerId)
    if isOnCooldown(ContactShareCooldowns, source, CONTACT_SHARE_COOLDOWN_MS) then
        return
    end

    local success = sendContactSuggestion(source, PlayerId, 5.0)
    if not success then
        return
    end
end)

RegisterNetEvent('qb-phone:server:CancelCall', function(ContactData)
    if not ContactData or not ContactData.TargetData or not ContactData.TargetData.number then return end
    local Ply = QBCore.Functions.GetPlayerByPhone(tostring(ContactData.TargetData.number))
    if not Ply then return end
    TriggerClientEvent('qb-phone:client:CancelCall', Ply.PlayerData.source)
end)

RegisterNetEvent('qb-phone:server:AnswerCall', function(CallData)
    if not CallData or not CallData.TargetData or not CallData.TargetData.number then return end
    local Ply = QBCore.Functions.GetPlayerByPhone(CallData.TargetData.number)
    if not Ply then return end

    TriggerClientEvent('qb-phone:client:AnswerCall', Ply.PlayerData.source)
end)

RegisterNetEvent('qb-phone:server:SaveMetaData', function(MData)
    local src = source
    local Player = QBCore.Functions.GetPlayer(src)
    if not Player then return end

    Player.Functions.SetMetaData("phone", MData)
end)