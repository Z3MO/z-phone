local QBCore = exports['qb-core']:GetCoreObject()

-- Security: Rate limiting to prevent spam/exploits
local MessageRateLimit = {}
local MAX_MESSAGES_PER_MINUTE = 20
local RATE_LIMIT_WINDOW = 60000 -- 60 seconds

-- Security: Input validation functions
local function ValidatePhoneNumber(phoneNumber)
    if not phoneNumber or type(phoneNumber) ~= "string" then
        return false
    end
    
    -- Remove all non-digits
    local cleaned = phoneNumber:gsub("%D", "")
    
    -- Phone number should be between 6-15 digits
    if #cleaned < 6 or #cleaned > 15 then
        return false
    end
    
    return true
end

local function ValidateMessageContent(messages)
    if not messages or type(messages) ~= "table" then
        return false
    end
    
    -- Check if messages array is too large (prevent memory exploits)
    if #messages > 1000 then
        return false
    end
    
    -- Validate each message group
    for _, messageGroup in pairs(messages) do
        if type(messageGroup) ~= "table" then
            return false
        end
        
        if not messageGroup.messages or type(messageGroup.messages) ~= "table" then
            return false
        end
        
        -- Check individual messages
        if #messageGroup.messages > 500 then
            return false
        end
        
        for _, message in pairs(messageGroup.messages) do
            if type(message) ~= "table" then
                return false
            end
            
            -- Validate message structure
            if message.type == "message" then
                if not message.message or type(message.message) ~= "string" then
                    return false
                end
                
                -- Limit message length (200 chars max as per client)
                if #message.message > 200 then
                    return false
                end
            elseif message.type == "picture" then
                if not message.data or not message.data.url or type(message.data.url) ~= "string" then
                    return false
                end
                
                -- Validate URL format
                if #message.data.url > 500 then
                    return false
                end
            elseif message.type == "location" then
                if not message.data or type(message.data.x) ~= "number" or type(message.data.y) ~= "number" then
                    return false
                end
            else
                return false -- Unknown message type
            end
        end
    end
    
    return true
end

local function CheckRateLimit(src)
    local currentTime = GetGameTimer()
    
    if not MessageRateLimit[src] then
        MessageRateLimit[src] = {
            count = 1,
            firstMessage = currentTime
        }
        return true
    end
    
    local timeDiff = currentTime - MessageRateLimit[src].firstMessage
    
    -- Reset if window expired
    if timeDiff > RATE_LIMIT_WINDOW then
        MessageRateLimit[src] = {
            count = 1,
            firstMessage = currentTime
        }
        return true
    end
    
    -- Check if exceeded limit
    if MessageRateLimit[src].count >= MAX_MESSAGES_PER_MINUTE then
        return false
    end
    
    MessageRateLimit[src].count = MessageRateLimit[src].count + 1
    return true
end

RegisterNetEvent('qb-phone:server:UpdateMessages', function(ChatMessages, ChatNumber)
    local src = source
    
    -- Security: Validate source
    if not src or src <= 0 then return end
    
    -- Security: Rate limiting
    if not CheckRateLimit(src) then
        print(string.format(
            "[z-phone Security] Player %d exceeded message rate limit",
            src
        ))
        return
    end
    
    -- Security: Validate inputs
    if not ValidatePhoneNumber(ChatNumber) then
        print(string.format(
            "[z-phone Security] Player %d sent invalid phone number: %s",
            src,
            tostring(ChatNumber)
        ))
        return
    end
    
    if not ValidateMessageContent(ChatMessages) then
        print(string.format(
            "[z-phone Security] Player %d sent invalid message content",
            src
        ))
        return
    end
    
    local SenderData = QBCore.Functions.GetPlayer(src)
    if not SenderData then
        print(string.format(
            "[z-phone Security] Player %d not found in QBCore",
            src
        ))
        return
    end
    
    local TargetData = QBCore.Functions.GetPlayerByPhone(ChatNumber)

    if TargetData then
        local Chat = MySQL.query.await('SELECT * FROM phone_messages WHERE citizenid = ? AND number = ?', {
            SenderData.PlayerData.citizenid,
            ChatNumber
        })
        
        if Chat[1] then
            MySQL.update('UPDATE phone_messages SET messages = ? WHERE citizenid = ? AND number = ?',{
                json.encode(ChatMessages),
                TargetData.PlayerData.citizenid,
                SenderData.PlayerData.charinfo.phone
            })
            MySQL.update('UPDATE phone_messages SET messages = ? WHERE citizenid = ? AND number = ?', {
                json.encode(ChatMessages),
                SenderData.PlayerData.citizenid,
                TargetData.PlayerData.charinfo.phone
            })
            TriggerClientEvent('qb-phone:client:UpdateMessages',
                TargetData.PlayerData.source,
                ChatMessages,
                SenderData.PlayerData.charinfo.phone,
                false
            )
        else
            MySQL.insert('INSERT INTO phone_messages (citizenid, number, messages) VALUES (?, ?, ?)', {
                TargetData.PlayerData.citizenid,
                SenderData.PlayerData.charinfo.phone,
                json.encode(ChatMessages)
            })
            MySQL.insert('INSERT INTO phone_messages (citizenid, number, messages) VALUES (?, ?, ?)', {
                SenderData.PlayerData.citizenid,
                TargetData.PlayerData.charinfo.phone,
                json.encode(ChatMessages)
            })
            TriggerClientEvent('qb-phone:client:UpdateMessages',
                TargetData.PlayerData.source,
                ChatMessages,
                SenderData.PlayerData.charinfo.phone,
                true
            )
        end
    else
        -- Player is offline, use parameterized query to prevent SQL injection
        local query = '%' .. MySQL.Sync.escape(ChatNumber) .. '%'
        local Player = MySQL.query.await('SELECT * FROM players WHERE charinfo LIKE ?', {query})
        
        if not Player or not Player[1] then
            print(string.format(
                "[z-phone Security] Target player not found for number: %s",
                ChatNumber
            ))
            return
        end
        
        local Chat = MySQL.query.await('SELECT * FROM phone_messages WHERE citizenid = ? AND number = ?', {
            SenderData.PlayerData.citizenid,
            ChatNumber
        })
        
        if Chat[1] and Player[1] then
            MySQL.update('UPDATE phone_messages SET messages = ? WHERE citizenid = ? AND number = ?', {
                json.encode(ChatMessages),
                Player[1].citizenid,
                SenderData.PlayerData.charinfo.phone
            })
            
            local playerCharinfo = json.decode(Player[1].charinfo)
            if playerCharinfo and playerCharinfo.phone then
                MySQL.update('UPDATE phone_messages SET messages = ? WHERE citizenid = ? AND number = ?', {
                    json.encode(ChatMessages),
                    SenderData.PlayerData.citizenid,
                    playerCharinfo.phone
                })
            end
        elseif Player[1] then
            MySQL.insert('INSERT INTO phone_messages (citizenid, number, messages) VALUES (?, ?, ?)', {
                Player[1].citizenid,
                SenderData.PlayerData.charinfo.phone,
                json.encode(ChatMessages)
            })
            
            local playerCharinfo = json.decode(Player[1].charinfo)
            if playerCharinfo and playerCharinfo.phone then
                MySQL.insert('INSERT INTO phone_messages (citizenid, number, messages) VALUES (?, ?, ?)', {
                    SenderData.PlayerData.citizenid,
                    playerCharinfo.phone,
                    json.encode(ChatMessages)
                })
            end
        end
    end
end)

-- Clean up rate limit data periodically
CreateThread(function()
    while true do
        Wait(300000) -- Every 5 minutes
        MessageRateLimit = {}
    end
end)