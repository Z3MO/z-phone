local QBCore = exports['qb-core']:GetCoreObject()

QBCore.Functions.CreateCallback('qb-phone:server:GetAvailableTaxiDrivers', function(_, cb)
    local Services = {}
    local serviceJobs = Config.ServiceJobs or {}
    local serviceLookup = {}

    for i = 1, #serviceJobs do
        local service = serviceJobs[i]
        local primaryJob = service.Job

        Services[primaryJob] = {
            Job = service.Job,
            Label = service.Label or service.Job,
            Tag = service.Tag or "Service",
            Description = service.Description or "City support service.",
            Accent = service.Accent or "#3b82f6",
            Icon = service.Icon or "fa-solid fa-briefcase",
            MessageTemplate = service.MessageTemplate or "Hello, I need assistance.",
            Players = {}
        }

        if service.Jobs then
            for j = 1, #service.Jobs do
                serviceLookup[service.Jobs[j]] = primaryJob
            end
        else
            serviceLookup[primaryJob] = primaryJob
        end
    end

    for _, v in pairs(QBCore.Functions.GetPlayers()) do
        local Player = QBCore.Functions.GetPlayer(v)
        if Player then
            local job = Player.PlayerData.job.name
            local serviceKey = serviceLookup[job]
            if serviceKey and Services[serviceKey] and Player.PlayerData.job.onduty then
                table.insert(Services[serviceKey].Players, {
                    Name = Player.PlayerData.charinfo.firstname .. " " .. Player.PlayerData.charinfo.lastname,
                    Phone = Player.PlayerData.charinfo.phone,
                    Job = serviceKey,
                    Tag = Services[serviceKey].Tag,
                    Label = Services[serviceKey].Label,
                })
            end
        end
    end

    local payload = {}
    for i = 1, #serviceJobs do
        local service = serviceJobs[i]
        if Services[service.Job] then
            table.sort(Services[service.Job].Players, function(a, b)
                return (a.Name or "") < (b.Name or "")
            end)
            payload[#payload+1] = Services[service.Job]
        end
    end

    cb(payload)
end)
