local QBCore = exports['qb-core']:GetCoreObject()

-- Functions

local function IsNumberInContacts(num)
    for _, v in pairs(PhoneData.Contacts) do
        if num == v.number then
            return v.name
        end
    end
end

local function GetKeyByDate(Number, Date)
    if PhoneData.Chats[Number] and PhoneData.Chats[Number].messages then
        for key, chat in pairs(PhoneData.Chats[Number].messages) do
            if chat.date == Date then
                return key
            end
        end
    end
end

local function HydrateChats(rawChats)
    local hydrated = {}

    for _, v in pairs(rawChats or {}) do
        hydrated[v.number] = {
            name = IsNumberInContacts(v.number) or v.number,
            number = v.number,
            messages = type(v.messages) == "string" and json.decode(v.messages) or (v.messages or {})
        }
    end

    return hydrated
end

-- NUI Callback

RegisterNUICallback('GetMessageChat', function(data, cb)
    if PhoneData.Chats[data.phone] then
        cb(PhoneData.Chats[data.phone])
    else
        cb(false)
    end
end)

RegisterNUICallback('GetMessageChats', function(_, cb)
    QBCore.Functions.TriggerCallback('qb-phone:server:GetPlayerChats', function(chats)
        PhoneData.Chats = HydrateChats(chats)
        cb(PhoneData.Chats)
    end)
end)

RegisterNUICallback('SendMessage', function(data, cb)
    local ChatMessage = data.ChatMessage
    local ChatDate = data.ChatDate
    local ChatNumber = data.ChatNumber
    local ChatTime = data.ChatTime
    local ChatType = data.ChatType
    local ChatKey = GetKeyByDate(ChatNumber, ChatDate)

    if PhoneData.Chats[ChatNumber] then
        if not PhoneData.Chats[ChatNumber].messages then
            PhoneData.Chats[ChatNumber].messages = {}
        end
    else
        PhoneData.Chats[ChatNumber] = {
            name = IsNumberInContacts(ChatNumber),
            number = ChatNumber,
            messages = {},
        }
    end

    if not ChatKey or (ChatKey and not PhoneData.Chats[ChatNumber].messages[ChatKey]) then
        local temp = #PhoneData.Chats[ChatNumber].messages+1
        PhoneData.Chats[ChatNumber].messages[temp] = {
            date = ChatDate,
            messages = {},
        }

        ChatKey = temp
    end

    if ChatMessage then
        PhoneData.Chats[ChatNumber].messages[ChatKey].messages[#PhoneData.Chats[ChatNumber].messages[ChatKey].messages+1] = {
            message = ChatMessage,
            time = ChatTime,
            sender = PhoneData.PlayerData.citizenid,
            type = ChatType,
            data = {},
        }
    else
        PhoneData.Chats[ChatNumber].messages[ChatKey].messages[#PhoneData.Chats[ChatNumber].messages[ChatKey].messages+1] = {
            message = "Photo",
            time = ChatTime,
            sender = PhoneData.PlayerData.citizenid,
            type = ChatType,
            data = {
                url = data.url
            },
        }
    end

    TriggerServerEvent('qb-phone:server:UpdateMessages', PhoneData.Chats[ChatNumber].messages, ChatNumber)
    SendNUIMessage({
        action = "UpdateChat",
        chatData = PhoneData.Chats[ChatNumber],
        chatNumber = ChatNumber,
    })


    cb("ok")
end)

-- Events

RegisterNetEvent('qb-phone:client:UpdateMessages', function(ChatMessages, SenderNumber, New)
    if not ChatMessages or not SenderNumber then return end

    local NumberKey = type(SenderNumber) ~= "string" and tostring(SenderNumber) or SenderNumber
    local name = IsNumberInContacts(SenderNumber) or SenderNumber

    if SenderNumber == PhoneData.PlayerData.charinfo.phone then return end

    if New or not PhoneData.Chats[NumberKey] then
        PhoneData.Chats[NumberKey] = {
            name = name,
            number = SenderNumber,
            messages = ChatMessages
        }
    else
        PhoneData.Chats[NumberKey].messages = ChatMessages
    end

    SendNUIMessage({
        action = "PhoneNotification",
        PhoneNotify = {
            title = "Messages",
            text = "New Message From: "..name,
            icon = "fas fa-comment",
            color = "#25D366",
            timeout = math.random(4000, 7500),
        },
    })

    -- Play notification sound or vibrate based on current phone sound settings
    if PhoneSettings then
        if PhoneSettings.vibrate then
            -- Vibrate mode: short controller rumble + a single quiet tick
            DoVibrate(350, 60)
            PlaySoundFrontend(-1, "CHECKPOINT_NORMAL", "HUD_MINI_GAME_SOUNDSET", true)
        elseif not PhoneSettings.muted then
            -- Normal mode: play the message notification tone
            PlayPhoneNotificationSound("Message_Tone", "Phone_SoundSet_Default")
        end
        -- Muted: no sound, no vibration
    end

    if PhoneData.isOpen then
        SendNUIMessage({
            action = "UpdateChat",
            chatData = PhoneData.Chats[NumberKey],
            chatNumber = NumberKey,
        })
    else
        Config.PhoneApplications['message'].Alerts = Config.PhoneApplications['message'].Alerts + 1
    end

    if not PhoneData.Chats[NumberKey].Unread then PhoneData.Chats[NumberKey].Unread = 1 else PhoneData.Chats[NumberKey].Unread += 1 end
end)