local QBCore = exports['qb-core']:GetCoreObject()

--- Global Variables ---
PlayerData = QBCore.Functions.GetPlayerData()

local frontCam = false

FullyLoaded = LocalPlayer.state.isLoggedIn

PhoneData = {
    MetaData = {},
    isOpen = false,
    PlayerData = nil,
    Contacts = {},
    Chats = {},
    CallData = {},
    RecentCalls = {},
    Invoices = {},
    Garage = {},
    Mails = {},
    Proxis = {},
    Documents = {},
    GarageVehicles = {},
    AnimationData = {
        lib = nil,
        anim = nil,
    },
    Images = {},
    SuggestedContacts = {},
    ChatRooms = {},
}

-- Localized Variables --
-- Global sound settings (accessible from all client scripts)
PhoneSettings = {
    uiVolume = 100,   -- 0–100, displayed in UI
    volume   = 0.2,   -- actual InteractSound volume (mapped: uiVolume/100 * 0.4)
    muted    = false,
    vibrate  = false,
}

-- Maps UI percentage (0-100) to game audio volume (0.0-0.4)
local function GetRingVolume()
    if PhoneSettings.muted or PhoneSettings.vibrate then return 0.0 end
    return PhoneSettings.volume
end

-- Maps UI percentage (0-100) to a softer dial tone volume
local function GetDialVolume()
    if PhoneSettings.muted or PhoneSettings.vibrate then return 0.0 end
    return math.max(0.04, PhoneSettings.volume * 0.5)
end

-- Play a GTA frontend sound respecting current mute state
function PlayPhoneNotificationSound(soundName, soundSet)
    if PhoneSettings.muted then return end
    PlaySoundFrontend(-1, soundName, soundSet, true)
end

-- Attempt controller rumble for vibrate mode (works with gamepad; silently no-ops on keyboard)
function DoVibrate(durationMs, intensity)
    CreateThread(function()
        local endTime = GetGameTimer() + (durationMs or 800)
        while GetGameTimer() < endTime do
            pcall(function()
                -- SET_PAD_SHAKE native – works when a gamepad is connected
                Citizen.InvokeNative(0x8912E4C9D78C3FEB, 0, 100, intensity or 80)
            end)
            Wait(100)
        end
    end)
end

-- Sync PhoneSettings from saved MetaData
local function ApplySoundMetaData(PhoneMeta)
    local ss = PhoneMeta and PhoneMeta.soundSettings
    if ss then
        PhoneSettings.uiVolume = tonumber(ss.volume)  or 100
        PhoneSettings.muted    = ss.muted    == true
        PhoneSettings.vibrate  = ss.vibrate  == true
        PhoneSettings.volume   = (PhoneSettings.uiVolume / 100) * 0.4
    end
end


-- Functions

local function IsNumberInContacts(num)
    for _, v in pairs(PhoneData.Contacts) do
        if num == v.number then
            return v.name
        end
    end

    return num
end

local function hasPhone()
    if PlayerData.items then
        for _, v in pairs(PlayerData.items) do
            if v.name == 'phone' then
                return true
            end
        end
    end
end exports('hasPhone', hasPhone)

local function IsPhoneOpen()
    return PhoneData.isOpen
end exports("IsPhoneOpen", IsPhoneOpen)

local function CalculateTimeToDisplay()
	local hour = GetClockHours()
    local minute = GetClockMinutes()

    local obj = {}

	if minute <= 9 then
		minute = "0" .. minute
    end

    obj.hour = hour
    obj.minute = minute

    return obj
end

local function updateTime()
    while PhoneData.isOpen do
        SendNUIMessage({
            action = "UpdateTime",
            InGameTime = CalculateTimeToDisplay(),
        })
        Wait(1500)
    end
end

local PublicPhoneobject = {
    -2103798695,1158960338,
    1281992692,1511539537,
    295857659,-78626473,
    -1559354806
}

exports["qb-target"]:AddTargetModel(PublicPhoneobject, {
    options = {
        {
            type = "client",
            event = "qb-phone:client:publicphoneopen",
            icon = "fas fa-phone-volume",
            label = "Public Phone",
        },
    },
    distance = 1.0
})


local function LoadPhone()
    QBCore.Functions.TriggerCallback('qb-phone:server:GetPhoneData', function(pData)

        -- Should fix errors with phone not loading correctly --
        while pData == nil do Wait(25) end

        PhoneData.PlayerData = PlayerData
        local PhoneMeta = PhoneData.PlayerData.metadata["phone"]
        PhoneData.MetaData = PhoneMeta

        -- Restore sound settings from saved metadata
        ApplySoundMetaData(PhoneMeta)

        PhoneData.MetaData.profilepicture = PhoneMeta.profilepicture or "default"

        if pData.PlayerContacts and next(pData.PlayerContacts) then
            PhoneData.Contacts = pData.PlayerContacts
        end


        if pData.Invoices and next(pData.Invoices) then
            for _, v in pairs(pData.Invoices) do
                PhoneData.Invoices[#PhoneData.Invoices+1] = {
                    id = v.id,
                    citizenid = QBCore.Functions.GetPlayerData().citizenid,
                    sender = v.from,
                    society = v.receiverAccountIdentifier,
                    sendercitizenid = v.fromIdentifier,
                    amount = v.amount,
                    reason = v.message,
                    status = v.status
                }
            end
        end

        if pData.Documents and next(pData.Documents) then
            PhoneData.Documents = pData.Documents
        end


        if pData.Proxis and next(pData.Proxis) then
            PhoneData.Proxis = pData.Proxis
        end


        -- Heavy datasets are loaded on-demand per app to reduce first-open time.
        PhoneData.Chats = {}
        PhoneData.Mails = {}
        PhoneData.Images = {}
        PhoneData.ChatRooms = {}

        SendNUIMessage({
            action = "LoadPhoneData",
            PhoneData = PhoneData,
            PlayerData = PlayerData,
            PlayerJob = PlayerData,
            PhoneJobs = QBCore.Shared.Jobs,
            applications = Config.PhoneApplications,
            PlayerId = GetPlayerServerId(PlayerId())
        })

    end)
end

local function DisableDisplayControlActions()
    DisableControlAction(0, 1, true) -- disable mouse look
    DisableControlAction(0, 2, true) -- disable mouse look
    DisableControlAction(0, 3, true) -- disable mouse look
    DisableControlAction(0, 4, true) -- disable mouse look
    DisableControlAction(0, 5, true) -- disable mouse look
    DisableControlAction(0, 6, true) -- disable mouse look
    DisableControlAction(0, 263, true) -- disable melee
    DisableControlAction(0, 264, true) -- disable melee
    DisableControlAction(0, 257, true) -- disable melee
    DisableControlAction(0, 140, true) -- disable melee
    DisableControlAction(0, 141, true) -- disable melee
    DisableControlAction(0, 142, true) -- disable melee
    DisableControlAction(0, 143, true) -- disable melee
    DisableControlAction(0, 177, true) -- disable escape
    DisableControlAction(0, 200, true) -- disable escape
    DisableControlAction(0, 202, true) -- disable escape
    DisableControlAction(0, 322, true) -- disable escape
    DisableControlAction(0, 245, true) -- disable chat
    DisablePlayerFiring(PlayerId(), true)   -- Disable player Firing Weapons
end

local function OpenPhone()
    if hasPhone() then
        PhoneData.PlayerData = PlayerData
        SetNuiFocus(true, true)

        local hasVPN = QBCore.Functions.HasItem(Config.VPNItem)

        SendNUIMessage({
            action = "open",
            AppData = Config.PhoneApplications,
            CallData = PhoneData.CallData,
            PlayerData = PhoneData.PlayerData,
            hasVPN = hasVPN,
        })
        PhoneData.isOpen = true
        if Config.AllowWalking then
        SetNuiFocusKeepInput(true)
        CreateThread(function()
            while PhoneData.isOpen do
                SetCurrentPedWeapon(PlayerPedId(), `weapon_unarmed`, true)
                DisableDisplayControlActions()
                Wait(1)
            end
        end)
    end
        if not PhoneData.CallData.InCall then
            DoPhoneAnimation('cellphone_text_in')
        else
            DoPhoneAnimation('cellphone_call_to_text')
        end

        SetTimeout(250, function()
            newPhoneProp()
        end)

        updateTime()
    else
        QBCore.Functions.Notify("You don't have a phone?", "error")
    end
end

local function GenerateCallId(caller, target)
    local CallId = math.ceil(((tonumber(caller) + tonumber(target)) / 100 * 1))
    return CallId
end

local function CancelCall()
    TriggerServerEvent('qb-phone:server:CancelCall', PhoneData.CallData)
    if PhoneData.CallData.CallType == "ongoing" then
        exports['pma-voice']:removePlayerFromCall(PhoneData.CallData.CallId)
    end
    PhoneData.CallData.CallType = nil
    PhoneData.CallData.InCall = false
    PhoneData.CallData.AnsweredCall = false
    PhoneData.CallData.TargetData = {}
    PhoneData.CallData.CallId = nil

    if not PhoneData.isOpen then
        StopAnimTask(PlayerPedId(), PhoneData.AnimationData.lib, PhoneData.AnimationData.anim, 2.5)
        deletePhone()
    end
    PhoneData.AnimationData.lib = nil
    PhoneData.AnimationData.anim = nil

    TriggerServerEvent('qb-phone:server:SetCallState', false)

    SendNUIMessage({
        action = "SetupHomeCall",
        CallData = PhoneData.CallData,
    })

    SendNUIMessage({
        action = "CancelOutgoingCall",
    })

    TriggerEvent('qb-phone:client:CustomNotification',
        "PHONE CALL",
        "Disconnected...",
        "fas fa-phone-square",
        "#e84118",
        5000
    )
end

local function CallCheck()
    if PhoneData.CallData.CallType == "ongoing" then
        if not hasPhone() or PlayerData.metadata['isdead'] or PlayerData.metadata['inlaststand'] or PlayerData.metadata['ishandcuffed'] then
            CancelCall()
        end
    end
end

local function CallContact(CallData, AnonymousCall)
    local RepeatCount = 0
    PhoneData.CallData.CallType = "outgoing"
    PhoneData.CallData.InCall = true
    PhoneData.CallData.TargetData = CallData
    PhoneData.CallData.AnsweredCall = false
    PhoneData.CallData.CallId = GenerateCallId(PhoneData.PlayerData.charinfo.phone, CallData.number)

    TriggerServerEvent('qb-phone:server:CallContact', PhoneData.CallData.TargetData, PhoneData.CallData.CallId, AnonymousCall)
    TriggerServerEvent('qb-phone:server:SetCallState', true)

    for _ = 1, Config.CallRepeats + 1, 1 do
        if not PhoneData.CallData.AnsweredCall then
            if RepeatCount + 1 ~= Config.CallRepeats + 1 then
                if PhoneData.CallData.InCall then
                    RepeatCount += 1
                    TriggerServerEvent("InteractSound_SV:PlayOnSource", "dial", GetDialVolume())
                else
                    break
                end
                Wait(Config.RepeatTimeout)
            else
                CancelCall()
                break
            end
        else
            break
        end
    end
end

local function sanitizeText(value, maxLength)
    local sanitized = tostring(value or ''):gsub('[^%w%s%-%._\']', ''):gsub('%s+', ' '):gsub('^%s+', ''):gsub('%s+$', '')
    if maxLength and #sanitized > maxLength then
        sanitized = sanitized:sub(1, maxLength)
    end
    return sanitized
end

local function sanitizePhoneNumber(value)
    local sanitized = tostring(value or ''):gsub('%D', '')
    return sanitized:sub(1, 15)
end

local function sanitizeIban(value)
    local sanitized = tostring(value or ''):gsub('[^%w%-]', '')
    return sanitized:sub(1, 32)
end

local function isDuplicateContact(name, number, ignoreNumber)
    for _, contact in pairs(PhoneData.Contacts) do
        if tostring(contact.number) == tostring(number) and tostring(ignoreNumber) ~= tostring(number) then
            return true
        end

        if tostring(contact.name) == tostring(name) and tostring(contact.number) == tostring(number) then
            return true
        end
    end

    return false
end

local function AnswerCall()
    if (PhoneData.CallData.CallType == "incoming" or PhoneData.CallData.CallType == "outgoing") and PhoneData.CallData.InCall and not PhoneData.CallData.AnsweredCall then
        PhoneData.CallData.CallType = "ongoing"
        PhoneData.CallData.AnsweredCall = true
        PhoneData.CallData.CallTime = 0

        SendNUIMessage({ action = "AnswerCall", CallData = PhoneData.CallData})
        SendNUIMessage({ action = "SetupHomeCall", CallData = PhoneData.CallData})

        TriggerServerEvent('qb-phone:server:SetCallState', true)

        if PhoneData.isOpen then
            DoPhoneAnimation('cellphone_text_to_call')
        else
            DoPhoneAnimation('cellphone_call_listen_base')
        end

        CreateThread(function()
            while PhoneData.CallData.AnsweredCall do
                PhoneData.CallData.CallTime = PhoneData.CallData.CallTime + 1
                Wait(2000)
                SendNUIMessage({
                    action = "UpdateCallTime",
                    Time = PhoneData.CallData.CallTime,
                    Name = PhoneData.CallData.TargetData.name,
                })

                Wait(1000)
            end
        end)

        TriggerServerEvent('qb-phone:server:AnswerCall', PhoneData.CallData)
        exports['pma-voice']:addPlayerToCall(PhoneData.CallData.CallId)
    else
        PhoneData.CallData.InCall = false
        PhoneData.CallData.CallType = nil
        PhoneData.CallData.AnsweredCall = false

        TriggerEvent('qb-phone:client:CustomNotification',
            "Phone",
            "You don't have an incoming call...",
            "fas fa-phone",
            "#e84118",
            4500
        )
    end
end

local function CellFrontCamActivate(activate)
	return Citizen.InvokeNative(0x2491A93618B7D838, activate)
end

-- Command

RegisterCommand('phone', function()
    if not PhoneData.isOpen then
        if not PlayerData.metadata['ishandcuffed'] and not PlayerData.metadata['inlaststand'] and not PlayerData.metadata['isdead'] and not IsPauseMenuActive() then
            OpenPhone()
        else
            QBCore.Functions.Notify("Action not available at the moment..", "error")
        end
    end
end) RegisterKeyMapping('phone', 'Open Phone', 'keyboard', 'M')

RegisterCommand("+answer", function()
    if (PhoneData.CallData.CallType == "incoming" or PhoneData.CallData.CallType == "outgoing" and not PhoneData.CallData.CallType == "ongoing") then
        if not PlayerData.metadata['ishandcuffed'] and not PlayerData.metadata['inlaststand'] and not PlayerData.metadata['isdead'] and not IsPauseMenuActive() and hasPhone() then
            AnswerCall()
        else
            QBCore.Functions.Notify("Action not available at the moment..", "error")
        end
    end
end) RegisterKeyMapping('+answer', 'Answer Phone Call', 'keyboard', 'Y')

RegisterCommand("+decline", function()
    if (PhoneData.CallData.CallType == "incoming" or PhoneData.CallData.CallType == "outgoing" or PhoneData.CallData.CallType == "ongoing") then
        if not PlayerData.metadata['ishandcuffed'] and not PlayerData.metadata['inlaststand'] and not PlayerData.metadata['isdead'] and not IsPauseMenuActive() then
            CancelCall()
        else
            QBCore.Functions.Notify("Action not available at the moment..", "error")
        end
    end
end) RegisterKeyMapping('+decline', 'Decline Phone Call', 'keyboard', 'J')

-- NUI Callbacks

RegisterNUICallback('DissalowMoving', function(_, cb)
    if not Config.AllowWalking then
        cb('ok')
        return
    end
    SetNuiFocusKeepInput(false)
    cb('ok')
end)

RegisterNUICallback('AllowMoving', function(_, cb)
    if not Config.AllowWalking then
        cb('ok')
        return
    end
    SetNuiFocusKeepInput(true)
    cb('ok')
end)


RegisterNUICallback('CancelOutgoingCall', function()
    CancelCall()
end)

RegisterNUICallback('DenyIncomingCall', function()
    CancelCall()
end)

RegisterNUICallback('CancelOngoingCall', function()
    CancelCall()
end)

RegisterNUICallback('AnswerCall', function()
    AnswerCall()
end)

RegisterNUICallback('ClearRecentAlerts', function(_, cb)
    Config.PhoneApplications["phone"].Alerts = 0
    SendNUIMessage({ action = "RefreshAppAlerts", AppData = Config.PhoneApplications })
    cb('ok')
end)

RegisterNUICallback('SetBackground', function(data, cb)
    local background = data.background
    PhoneData.MetaData.background = background
    TriggerServerEvent('qb-phone:server:SaveMetaData', PhoneData.MetaData)
    cb('ok')
end)

RegisterNUICallback('GetMissedCalls', function(_, cb)
    cb(PhoneData.RecentCalls)
end)

RegisterNUICallback('GetSuggestedContacts', function(_, cb)
    cb(PhoneData.SuggestedContacts)
end)

RegisterNUICallback('HasPhone', function(_, cb)
    cb(hasPhone())
end)

RegisterNUICallback('Close', function()
    if not PhoneData.CallData.InCall then
        DoPhoneAnimation('cellphone_text_out')
        SetTimeout(400, function()
            StopAnimTask(PlayerPedId(), PhoneData.AnimationData.lib, PhoneData.AnimationData.anim, 2.5)
            deletePhone()
            PhoneData.AnimationData.lib = nil
            PhoneData.AnimationData.anim = nil
        end)
    else
        PhoneData.AnimationData.lib = nil
        PhoneData.AnimationData.anim = nil
        DoPhoneAnimation('cellphone_text_to_call')
    end
    SetTimeout(300, function()
        SetNuiFocus(false, false)
        SetNuiFocusKeepInput(false)
        PhoneData.isOpen = false
    end)
end)

RegisterNUICallback('AddNewContact', function(data, cb)
    local contactName = sanitizeText(data.ContactName, 48)
    local contactNumber = sanitizePhoneNumber(data.ContactNumber)
    local contactIban = sanitizeIban(data.ContactIban)
    local playerPhone = sanitizePhoneNumber(PhoneData.PlayerData and PhoneData.PlayerData.charinfo and PhoneData.PlayerData.charinfo.phone)

    if contactName == '' or #contactNumber < 3 then
        TriggerEvent('qb-phone:client:CustomNotification', 'Phone', 'Enter a valid contact name and number.', 'fas fa-address-book', '#e84118', 2500)
        cb(PhoneData.Contacts)
        return
    end

    if contactNumber == playerPhone then
        TriggerEvent('qb-phone:client:CustomNotification', 'Phone', "You can't save your own number.", 'fas fa-address-book', '#e84118', 2500)
        cb(PhoneData.Contacts)
        return
    end

    if isDuplicateContact(contactName, contactNumber) then
        TriggerEvent('qb-phone:client:CustomNotification', 'Phone', 'That contact already exists.', 'fas fa-address-book', '#e84118', 2500)
        cb(PhoneData.Contacts)
        return
    end

    PhoneData.Contacts[#PhoneData.Contacts+1] = {
        name = contactName,
        number = contactNumber,
        iban = contactIban,
    }
    Wait(100)
    cb(PhoneData.Contacts)
    if PhoneData.Chats[contactNumber] and next(PhoneData.Chats[contactNumber]) then
        PhoneData.Chats[contactNumber].name = contactName
    end
    TriggerServerEvent('qb-phone:server:AddNewContact', contactName, contactNumber, contactIban)
end)

RegisterNetEvent('qb-phone:client:AddNewSuggestion', function(SuggestionData)
    local incomingNumber = sanitizePhoneNumber(SuggestionData.number)
    if incomingNumber == '' then return end

    for _, suggestion in pairs(PhoneData.SuggestedContacts) do
        if sanitizePhoneNumber(suggestion.number) == incomingNumber then
            return
        end
    end

    for _, contact in pairs(PhoneData.Contacts) do
        if sanitizePhoneNumber(contact.number) == incomingNumber then
            return
        end
    end

    PhoneData.SuggestedContacts[#PhoneData.SuggestedContacts+1] = SuggestionData
    SendNUIMessage({
        action = "PhoneNotification",
        PhoneNotify = {
            title = "Phone",
            text = "You have a new suggested contact!",
            icon = "fa fa-phone-alt",
            color = "#04b543",
            timeout = 1500,
        },
    })
    Config.PhoneApplications["phone"].Alerts = Config.PhoneApplications["phone"].Alerts + 1
end)

RegisterNUICallback('EditContact', function(data, cb)
    local NewName = sanitizeText(data.CurrentContactName, 48)
    local NewNumber = sanitizePhoneNumber(data.CurrentContactNumber)
    local NewIban = sanitizeIban(data.CurrentContactIban)
    local OldName = sanitizeText(data.OldContactName, 48)
    local OldNumber = sanitizePhoneNumber(data.OldContactNumber)
    local OldIban = sanitizeIban(data.OldContactIban)
    local playerPhone = sanitizePhoneNumber(PhoneData.PlayerData and PhoneData.PlayerData.charinfo and PhoneData.PlayerData.charinfo.phone)

    if NewName == '' or #NewNumber < 3 then
        TriggerEvent('qb-phone:client:CustomNotification', 'Phone', 'Enter a valid contact name and number.', 'fas fa-user-pen', '#e84118', 2500)
        cb(PhoneData.Contacts)
        return
    end

    if NewNumber == playerPhone then
        TriggerEvent('qb-phone:client:CustomNotification', 'Phone', "You can't save your own number.", 'fas fa-user-pen', '#e84118', 2500)
        cb(PhoneData.Contacts)
        return
    end

    if isDuplicateContact(NewName, NewNumber, OldNumber) then
        TriggerEvent('qb-phone:client:CustomNotification', 'Phone', 'Another contact already uses that number.', 'fas fa-user-pen', '#e84118', 2500)
        cb(PhoneData.Contacts)
        return
    end

    for _, v in pairs(PhoneData.Contacts) do
        if sanitizeText(v.name, 48) == OldName and sanitizePhoneNumber(v.number) == OldNumber and sanitizeIban(v.iban) == OldIban then
            v.name = NewName
            v.number = NewNumber
            v.iban = NewIban
        end
    end
    if PhoneData.Chats[NewNumber] and next(PhoneData.Chats[NewNumber]) then
        PhoneData.Chats[NewNumber].name = NewName
    end
    Wait(100)
    cb(PhoneData.Contacts)
    TriggerServerEvent('qb-phone:server:EditContact', NewName, NewNumber, NewIban, OldName, OldNumber, OldIban)
end)

RegisterNUICallback('UpdateProfilePicture', function(data, cb)
    local pf = data.profilepicture
    PhoneData.MetaData.profilepicture = pf
    TriggerServerEvent('qb-phone:server:SaveMetaData', PhoneData.MetaData)
    cb('ok')
end)

RegisterNUICallback('FetchSearchResults', function(data, cb)
    QBCore.Functions.TriggerCallback('qb-phone:server:FetchResult', function(result)
        cb(result)
    end, data.input)
end)

RegisterNUICallback('RemoveSuggestion', function(data, cb)
    data = data.data
    if PhoneData.SuggestedContacts ~= nil and next(PhoneData.SuggestedContacts) ~= nil then
        for k, v in pairs(PhoneData.SuggestedContacts) do
            if (data.name[1] == v.name[1] and data.name[2] == v.name[2]) and data.number == v.number and data.bank == v.bank then
                table.remove(PhoneData.SuggestedContacts, k)
            end
        end
    end
    cb("ok")
end)

RegisterNUICallback('DeleteContact', function(data, cb)
    local Name = sanitizeText(data.CurrentContactName, 48)
    local Number = sanitizePhoneNumber(data.CurrentContactNumber)

    for k, v in pairs(PhoneData.Contacts) do
        if sanitizeText(v.name, 48) == Name and sanitizePhoneNumber(v.number) == Number then
            table.remove(PhoneData.Contacts, k)

            TriggerEvent('qb-phone:client:CustomNotification',
                "Phone",
                "Contact deleted!",
                "fa fa-phone-alt",
                "#04b543",
                1500
            )

            break
        end
    end
    Wait(100)
    cb(PhoneData.Contacts)
    if PhoneData.Chats[Number] and next(PhoneData.Chats[Number]) then
        PhoneData.Chats[Number].name = Number
    end
    TriggerServerEvent('qb-phone:server:RemoveContact', Name, Number)
end)

RegisterNUICallback('ClearGeneralAlerts', function(data, cb)
    SetTimeout(400, function()
        Config.PhoneApplications[data.app].Alerts = 0
        SendNUIMessage({
            action = "RefreshAppAlerts",
            AppData = Config.PhoneApplications
        })
        SendNUIMessage({ action = "RefreshAppAlerts", AppData = Config.PhoneApplications })
        cb('ok')
    end)
end)

RegisterNUICallback('CallContact', function(data, cb)
    local safeNumber = sanitizePhoneNumber(data.ContactData and data.ContactData.number)
    local safeName = sanitizeText((data.ContactData and data.ContactData.name) or safeNumber, 48)
    if safeNumber == '' then
        cb({
            CanCall = false,
            IsOnline = false,
            InCall = PhoneData.CallData.InCall,
        })
        return
    end

    data.ContactData.number = safeNumber
    data.ContactData.name = safeName
    local hasVPN = QBCore.Functions.HasItem(Config.VPNItem)
    QBCore.Functions.TriggerCallback('qb-phone:server:GetCallState', function(CanCall, IsOnline)
        local status = {
            CanCall = CanCall,
            IsOnline = IsOnline,
            InCall = PhoneData.CallData.InCall,
        }
        cb(status)
        if CanCall and not status.InCall then
            CallContact(data.ContactData, hasVPN)
        end
    end, data.ContactData)
end)

RegisterNUICallback('GetNearbyPhonePlayers', function(_, cb)
    QBCore.Functions.TriggerCallback('qb-phone:server:GetNearbyPhonePlayers', function(players)
        cb(players or {})
    end)
end)

RegisterNUICallback('SharePhoneContact', function(data, cb)
    local targetId = tonumber(data.targetId)
    if not targetId then
        cb({ success = false, message = 'Invalid player ID.' })
        return
    end

    QBCore.Functions.TriggerCallback('qb-phone:server:SharePhoneContact', function(success, message)
        cb({
            success = success == true,
            message = message or (success and 'Number shared.' or 'Unable to share number.')
        })
    end, targetId)
end)

RegisterNUICallback("TakePhoto", function(_, cb)
    SetNuiFocus(false, false)
    CreateMobilePhone(1)
    CellCamActivate(true, true)
    while true do
        if IsControlJustPressed(1, 27) then
            frontCam = not frontCam
            CellFrontCamActivate(frontCam)
        elseif IsControlJustPressed(1, 177) then
            DestroyMobilePhone()
            CellCamActivate(false, false)
            cb(json.encode({ url = nil }))
            OpenPhone()
            break
        elseif IsControlJustPressed(1, 176) then
            QBCore.Functions.TriggerCallback("qb-phone:server:GetWebhook",function(hook)
                QBCore.Functions.Notify('Touching up photo...', 'primary')
                exports['screenshot-basic']:requestScreenshotUpload(tostring(hook), "files[]", function(uploadData)
                    local image = json.decode(uploadData)
                    DestroyMobilePhone()
                    CellCamActivate(false, false)
                    TriggerServerEvent('qb-phone:server:addImageToGallery', image.attachments[1].proxy_url)
                    Wait(400)
                    TriggerServerEvent('qb-phone:server:getImageFromGallery')
                    cb(json.encode(image.attachments[1].proxy_url))
                    QBCore.Functions.Notify('Photo saved!', "success")
                    OpenPhone()
                end)
            end)
            break
        end
        HideHudComponentThisFrame(7)
        HideHudComponentThisFrame(8)
        HideHudComponentThisFrame(9)
        HideHudComponentThisFrame(6)
        HideHudComponentThisFrame(19)
        HideHudAndRadarThisFrame()
        EnableAllControlActions(0)
        Wait(0)
    end
end)

-- Events

RegisterNetEvent('qb-phone:client:AddRecentCall', function(data, time, type)
    PhoneData.RecentCalls[#PhoneData.RecentCalls+1] = {
        name = IsNumberInContacts(data.number),
        time = time,
        type = type,
        number = data.number,
        anonymous = data.anonymous
    }
    Config.PhoneApplications["phone"].Alerts = Config.PhoneApplications["phone"].Alerts + 1
    SendNUIMessage({
        action = "RefreshAppAlerts",
        AppData = Config.PhoneApplications
    })
end)

RegisterNetEvent('qb-phone:client:CancelCall', function()
    if PhoneData.CallData.CallType == "ongoing" then
        SendNUIMessage({
            action = "CancelOngoingCall"
        })
        exports['pma-voice']:removePlayerFromCall(PhoneData.CallData.CallId)
    end
    PhoneData.CallData.CallType = nil
    PhoneData.CallData.InCall = false
    PhoneData.CallData.AnsweredCall = false
    PhoneData.CallData.TargetData = {}

    if not PhoneData.isOpen then
        StopAnimTask(PlayerPedId(), PhoneData.AnimationData.lib, PhoneData.AnimationData.anim, 2.5)
        deletePhone()
    end
    PhoneData.AnimationData.lib = nil
    PhoneData.AnimationData.anim = nil

    TriggerServerEvent('qb-phone:server:SetCallState', false)

    SendNUIMessage({
        action = "SetupHomeCall",
        CallData = PhoneData.CallData,
    })

    SendNUIMessage({
        action = "CancelOutgoingCall",
    })

    TriggerEvent('qb-phone:client:CustomNotification',
        "PHONE CALL",
        "Disconnected...",
        "fas fa-phone-square",
        "#e84118",
        5000
    )
end)

RegisterNUICallback('phone-silent-button', function(_, cb)
    PhoneSettings.muted = not PhoneSettings.muted
    if PhoneSettings.muted then
        PhoneSettings.vibrate = false
        QBCore.Functions.Notify("Silent Mode On", "success")
        cb(true)
    else
        QBCore.Functions.Notify("Silent Mode Off", "error")
        cb(false)
    end
    -- Persist to metadata
    PhoneData.MetaData.soundSettings = {
        volume  = PhoneSettings.uiVolume,
        muted   = PhoneSettings.muted,
        vibrate = PhoneSettings.vibrate,
    }
    TriggerServerEvent('qb-phone:server:SaveMetaData', PhoneData.MetaData)
end)

-- Called from settings.js whenever sound settings change
RegisterNUICallback('UpdatePhoneSoundSettings', function(data, cb)
    PhoneSettings.uiVolume = tonumber(data.volume) or PhoneSettings.uiVolume
    PhoneSettings.volume   = (PhoneSettings.uiVolume / 100) * 0.4
    PhoneSettings.muted    = data.muted    == true
    PhoneSettings.vibrate  = data.vibrate  == true
    -- Persist to metadata so the settings survive reconnects
    PhoneData.MetaData.soundSettings = {
        volume  = PhoneSettings.uiVolume,
        muted   = PhoneSettings.muted,
        vibrate = PhoneSettings.vibrate,
    }
    TriggerServerEvent('qb-phone:server:SaveMetaData', PhoneData.MetaData)
    cb('ok')
end)

RegisterNUICallback('UpdatePhoneScale', function(data, cb)
    PhoneData.MetaData.scale = tonumber(data.scale) or 100
    TriggerServerEvent('qb-phone:server:SaveMetaData', PhoneData.MetaData)
    cb('ok')
end)

RegisterNetEvent('qb-phone:client:GetCalled', function(CallerNumber, CallId, AnonymousCall)
    local RepeatCount = 0
    local CallData = {
        number = CallerNumber,
        name = IsNumberInContacts(CallerNumber),
        anonymous = AnonymousCall
    }
    if hasPhone() then
        if AnonymousCall then
            CallData.name = "Unknown Number"
        end

        PhoneData.CallData.CallType = "incoming"
        PhoneData.CallData.InCall = true
        PhoneData.CallData.AnsweredCall = false
        PhoneData.CallData.TargetData = CallData
        PhoneData.CallData.CallId = CallId

        TriggerServerEvent('qb-phone:server:SetCallState', true)

        SendNUIMessage({
            action = "SetupHomeCall",
            CallData = PhoneData.CallData,
        })

        for _ = 1, Config.CallRepeats + 1, 1 do
            if not PhoneData.CallData.AnsweredCall then
                if RepeatCount + 1 ~= Config.CallRepeats + 1 then
                    if PhoneData.CallData.InCall then
                        RepeatCount = RepeatCount + 1
                        TriggerServerEvent("InteractSound_SV:PlayOnSource", "ringing", GetRingVolume())
                        -- Vibrate mode: pulse controller and play a quiet buzz
                        if PhoneSettings.vibrate then
                            DoVibrate(Config.RepeatTimeout - 300, 85)
                            PlaySoundFrontend(-1, "CHECKPOINT_NORMAL", "HUD_MINI_GAME_SOUNDSET", true)
                        end

                        if not PhoneData.isOpen then
                            SendNUIMessage({
                                action = "IncomingCallAlert",
                                CallData = PhoneData.CallData.TargetData,
                                Canceled = false,
                                AnonymousCall = AnonymousCall,
                            })
                        end
                    else
                        SendNUIMessage({
                            action = "IncomingCallAlert",
                            CallData = PhoneData.CallData.TargetData,
                            Canceled = true,
                            AnonymousCall = AnonymousCall,
                        })
                        TriggerServerEvent('qb-phone:server:AddRecentCall', "missed", CallData)
                        break
                    end
                    Wait(Config.RepeatTimeout)
                else
                    SendNUIMessage({
                        action = "IncomingCallAlert",
                        CallData = PhoneData.CallData.TargetData,
                        Canceled = true,
                        AnonymousCall = AnonymousCall,
                    })
                    TriggerServerEvent('qb-phone:server:AddRecentCall', "missed", CallData)
                    break
                end
            else
                TriggerServerEvent('qb-phone:server:AddRecentCall', "missed", CallData)
                break
            end
        end
    else
        SendNUIMessage({
            action = "IncomingCallAlert",
            CallData = PhoneData.CallData.TargetData,
            Canceled = true,
            AnonymousCall = AnonymousCall,
        })
        TriggerServerEvent('qb-phone:server:AddRecentCall', "missed", CallData)
    end
end)

RegisterNetEvent('qb-phone:client:AnswerCall', function()
    if (PhoneData.CallData.CallType == "incoming" or PhoneData.CallData.CallType == "outgoing") and PhoneData.CallData.InCall and not PhoneData.CallData.AnsweredCall then
        PhoneData.CallData.CallType = "ongoing"
        PhoneData.CallData.AnsweredCall = true
        PhoneData.CallData.CallTime = 0

        SendNUIMessage({ action = "AnswerCall", CallData = PhoneData.CallData})
        SendNUIMessage({ action = "SetupHomeCall", CallData = PhoneData.CallData})

        TriggerServerEvent('qb-phone:server:SetCallState', true)

        if PhoneData.isOpen then
            DoPhoneAnimation('cellphone_text_to_call')
        else
            DoPhoneAnimation('cellphone_call_listen_base')
        end

        CreateThread(function()
            while PhoneData.CallData.AnsweredCall do
                PhoneData.CallData.CallTime = PhoneData.CallData.CallTime + 1
                SendNUIMessage({
                    action = "UpdateCallTime",
                    Time = PhoneData.CallData.CallTime,
                    Name = PhoneData.CallData.TargetData.name,
                })

                Wait(1000)
            end
        end)
        exports['pma-voice']:addPlayerToCall(PhoneData.CallData.CallId)
    else
        PhoneData.CallData.InCall = false
        PhoneData.CallData.CallType = nil
        PhoneData.CallData.AnsweredCall = false

        TriggerEvent('qb-phone:client:CustomNotification',
            "Phone",
            "You don't have an incoming call...",
            "fas fa-phone",
            "#e84118",
            2500
        )
    end
end)

-- Handler Events

RegisterNetEvent('QBCore:Client:OnPlayerLoaded', function()
    PlayerData = QBCore.Functions.GetPlayerData()
    FullyLoaded = true
    Wait(250)
    LoadPhone()
end)

RegisterNetEvent('QBCore:Client:OnPlayerUnload', function()
    FullyLoaded = false
    PlayerData = {}
    PhoneData = {
        MetaData = {},
        isOpen = false,
        PlayerData = nil,
        Contacts = {},
        Chats = {},
        CallData = {},
        RecentCalls = {},
        Invoices = {},
        Garage = {},
        Mails = {},
        Proxis = {},
        Documents = {},
        GarageVehicles = {},
        AnimationData = {
            lib = nil,
            anim = nil,
        },
        Images = {},
        SuggestedContacts = {},
        ChatRooms = {},
    }
end)

RegisterNetEvent("QBCore:Player:SetPlayerData", function(val)
    PlayerData = val
    Wait(250)
    CallCheck()
end)

RegisterNetEvent('QBCore:Client:OnJobUpdate', function(JobInfo)
    PlayerData.job = JobInfo
    SendNUIMessage({
        action = "UpdateApplications",
        JobData = JobInfo,
        applications = Config.PhoneApplications
    })
end)

RegisterNetEvent('qb-phone:client:clearAppAlerts', function()
    Config.PhoneApplications["phone"].Alerts = 0
    SendNUIMessage({ action = "RefreshAppAlerts", AppData = Config.PhoneApplications })
end)

AddEventHandler('onResourceStart', function(resource)
    if resource == GetCurrentResourceName() then
        PlayerData = QBCore.Functions.GetPlayerData()
        Wait(500)
        LoadPhone()
    end
end)

-- Public Phone Shit

RegisterNetEvent('qb-phone:client:publicphoneopen',function()
    local input = lib.inputDialog("", {
        {
            type = 'number',
            label = 'Phone Number',
            icon = 'fas fa-phone-volume'
        }
    }, {
        allowCancel = false
    })
    if not input or not next(input) then return end

    local calldata = {
        number = input[1],
        name = input[1]
    }

    CallContact(calldata, true)
end)      

RegisterNetEvent('qb-phone:client:GiveContactDetails', function()
    local player, distance = QBCore.Functions.GetClosestPlayer()
    if player ~= -1 and distance < 5.0 then
        local PlayerId = GetPlayerServerId(player)
        TriggerServerEvent('qb-phone:server:GiveContactDetails', PlayerId)
    else
        QBCore.Functions.Notify("No one nearby!", "error")
    end
end)

RegisterNetEvent('qb-phone:client:updateContactInfo', function(contactInfo)
    PhoneData.Contacts[#PhoneData.Contacts+1] = {
        name = contactInfo.name,
        number = contactInfo.number,
        iban = 0
    }
    SendNUIMessage({
        action = "RefreshContacts",
        Contacts = PhoneData.Contacts
    })
end)

RegisterNetEvent('qb-phone:RefreshPhone', function()
    LoadPhone()
    SetTimeout(250, function()
        SendNUIMessage({
            action = "RefreshAlerts",
            AppData = Config.PhoneApplications,
        })
    end)
end)
