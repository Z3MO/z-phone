local QBCore = exports['qb-core']:GetCoreObject()

-- Functions

local function findVehFromPlateAndLocate(plate)
    local gameVehicles = QBCore.Functions.GetVehicles()
    for i = 1, #gameVehicles do
        local vehicle = gameVehicles[i]
        if DoesEntityExist(vehicle) then
            if QBCore.Functions.GetPlate(vehicle) == plate then
                local vehCoords = GetEntityCoords(vehicle)
                SetNewWaypoint(vehCoords.x, vehCoords.y)
                return true
            end
        end
    end
end

-- NUI Callback

RegisterNUICallback('SetupGarageVehicles', function(_, cb)
    QBCore.Functions.TriggerCallback('qb-phone:server:GetGarageVehicles', function(vehicles)
        cb(vehicles)
    end)
end)

RegisterNUICallback('gps-vehicle-garage', function(data, cb)
    if type(data) ~= 'table' or type(data.veh) ~= 'table' then
        cb("ok")
        return
    end

    local veh = data.veh
    if veh.state == 'In' then
        if veh.parkingspot then
            SetNewWaypoint(veh.parkingspot.x, veh.parkingspot.y)
            QBCore.Functions.Notify("Your vehicle has been marked", "success")
        end
    elseif veh.state == 'Out' and findVehFromPlateAndLocate(veh.plate) then
        QBCore.Functions.Notify("Your vehicle has been marked", "success")
    else
        QBCore.Functions.Notify("This vehicle cannot be located", "error")
    end
    cb("ok")
end)

RegisterNUICallback('sellVehicle', function(data, cb)
    if type(data) ~= 'table' then
        cb("ok")
        return
    end

    TriggerServerEvent('qb-phone:server:sendVehicleRequest', data)
    cb("ok")
end)

-- Events

RegisterNetEvent('qb-phone:client:sendVehicleRequest', function(data, sellerCitizenId)
    local success = exports['z-phone']:PhoneNotification("VEHICLE SALE", 'Purchase '..data.plate..' for $'..data.price, 'fas fa-map-pin', '#b3e0f2', "NONE", 'fas fa-check-circle', 'fas fa-times-circle')
    if success then
        TriggerServerEvent("qb-phone:server:sellVehicle", data, sellerCitizenId, 'accepted')
    else
        TriggerServerEvent("qb-phone:server:sellVehicle", data, sellerCitizenId, 'denied')
    end
end)

RegisterNetEvent('qb-phone:client:updateGarages', function()
    SendNUIMessage({
        action = "UpdateGarages",
    })
end)
