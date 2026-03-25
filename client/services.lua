local QBCore = exports['qb-core']:GetCoreObject()

local function loadAvailableServices(cb)
    QBCore.Functions.TriggerCallback('qb-phone:server:GetAvailableServices', function(drivers)
        cb(drivers)
    end)
end

RegisterNUICallback('GetAvailableServices', function(_, cb)
    loadAvailableServices(cb)
end)