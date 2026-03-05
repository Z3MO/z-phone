-- Functions

local function GetKeyByNumber(Number)
    if PhoneData.Chats then
        for k, v in pairs(PhoneData.Chats) do
            if v.number == Number then
                return k
            end
        end
    end
end

-- NUI Callback

RegisterNUICallback('PostProxi', function(data, cb)
    local url

    if data.url and string.match(data.url, '[a-z]*://[^ >,;]*') then
        url = data.url
    end

    TriggerServerEvent('qb-phone:server:AddProxi', data.message, url)
    cb("ok")
end)


RegisterNUICallback('FlagProxi', function(data, cb)
    TriggerServerEvent('qb-phone:server:flagProxi', data.number)
    cb("ok")
end)

RegisterNUICallback("DeleteProxi", function(data, cb)
    TriggerServerEvent("qb-phone:server:DeleteProxi", data.id)
    cb("ok")
end)

RegisterNUICallback('LoadProxis', function(_, cb)
    cb(PhoneData.Proxis)
end)

RegisterNUICallback('ClearAlerts', function(data, cb)
    local chat = data.number
    local ChatKey = GetKeyByNumber(chat)

    if PhoneData.Chats[ChatKey].Unread then
        local newAlerts = (Config.PhoneApplications['whatsapp'].Alerts - PhoneData.Chats[ChatKey].Unread)
        Config.PhoneApplications['whatsapp'].Alerts = newAlerts

        PhoneData.Chats[ChatKey].Unread = 0

        SendNUIMessage({
            action = "RefreshWhatsappAlerts",
            Chats = PhoneData.Chats,
        })
        SendNUIMessage({ action = "RefreshAppAlerts", AppData = Config.PhoneApplications })
    end

    cb("ok")
end)

-- Events

RegisterNetEvent('qb-phone:client:UpdateProxis', function(Proxis, LastProxi, src)
    if not FullyLoaded or not Proxis then return end
    PhoneData.Proxis = Proxis

    SendNUIMessage({
        action = "RefreshProxis",
        Proxis = PhoneData.Proxis
    })

    if not LastProxi or not src then return end
    if GetPlayerServerId(PlayerId()) == src then return end

    TriggerEvent('qb-phone:client:CustomNotification',
        "Proxi",
        "New Proxi Posted: "..LastProxi,
        "fas fa-ad",
        "#ff8f1a",
        4500
    )
end)