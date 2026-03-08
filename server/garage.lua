local QBCore = exports['qb-core']:GetCoreObject()

local function sanitizePlate(plate)
    if type(plate) ~= 'string' then return nil end
    plate = plate:match('^%s*(.-)%s*$')
    if not plate or plate == '' or #plate > 12 then return nil end
    return plate
end

local function sanitizeSalePayload(data)
    if type(data) ~= 'table' then return nil end

    local buyerId = tonumber(data.id)
    local price = tonumber(data.price)
    local plate = sanitizePlate(data.plate)

    if not buyerId or buyerId < 1 then return nil end
    if not price or price < 1 then return nil end
    if not plate then return nil end

    return {
        id = math.floor(buyerId),
        price = math.floor(price),
        plate = plate,
    }
end

local function getOwnedVehicle(citizenid, plate)
    local result = exports.oxmysql:executeSync(
        'SELECT plate, citizenid, garage, state FROM player_vehicles WHERE citizenid = ? AND plate = ? LIMIT 1',
        { citizenid, plate }
    )

    return result and result[1] or nil
end

RegisterNetEvent('qb-phone:server:sendVehicleRequest', function(data)
    local src = source
    local Player = QBCore.Functions.GetPlayer(src)
    if not Player then return end

    local payload = sanitizeSalePayload(data)
    if not payload then return end

    local Buyer = QBCore.Functions.GetPlayer(payload.id)

    if not Buyer then
        return TriggerClientEvent("QBCore:Notify", src, 'State ID does not exist!', "error")
    end

    if Player.PlayerData.citizenid == Buyer.PlayerData.citizenid then
        return TriggerClientEvent("QBCore:Notify", src, 'You cannot sell a vehicle to yourself!', "error")
    end

    if not getOwnedVehicle(Player.PlayerData.citizenid, payload.plate) then
        return TriggerClientEvent("QBCore:Notify", src, 'Vehicle not found in your garage.', "error")
    end

    TriggerClientEvent('qb-phone:client:sendVehicleRequest', payload.id, payload, Player.PlayerData.citizenid)
end)

RegisterNetEvent('qb-phone:server:sellVehicle', function(data, sellerCitizenId, responseType)
    local src = source
    local Player = QBCore.Functions.GetPlayer(src)
    if not Player then return end

    local payload = sanitizeSalePayload(data)
    if not payload then return end

    if responseType ~= 'accepted' and responseType ~= 'denied' then return end
    if type(sellerCitizenId) ~= 'string' or sellerCitizenId == '' then return end

    local SellerData = QBCore.Functions.GetPlayerByCitizenId(sellerCitizenId)
    if not SellerData then
        return TriggerClientEvent('qb-phone:client:CustomNotification', src, "VEHICLE SALE", "Seller is no longer available.", "fas fa-chart-line", "#D3B300", 5500)
    end

    if not getOwnedVehicle(SellerData.PlayerData.citizenid, payload.plate) then
        return TriggerClientEvent('qb-phone:client:CustomNotification', src, "VEHICLE SALE", "Vehicle is no longer available.", "fas fa-chart-line", "#D3B300", 5500)
    end

    if responseType == 'accepted' then
        if Player.PlayerData.money['bank'] and Player.PlayerData.money['bank'] >= payload.price then
            Player.Functions.RemoveMoney('bank', payload.price, "vehicle sale")
            SellerData.Functions.AddMoney('bank', payload.price)
            TriggerClientEvent('qb-phone:client:CustomNotification', src, "VEHICLE SALE", "You purchased the vehicle for $"..payload.price, "fas fa-chart-line", "#D3B300", 5500)
            TriggerClientEvent('qb-phone:client:CustomNotification', SellerData.PlayerData.source, "VEHICLE SALE", "Your vehicle was successfully purchased!", "fas fa-chart-line", "#D3B300", 5500)
            MySQL.update('UPDATE player_vehicles SET citizenid = ?, garage = ?, state = ? WHERE citizenid = ? AND plate = ?',{Player.PlayerData.citizenid, Config.SellGarage, 1, SellerData.PlayerData.citizenid, payload.plate})
            -- Update Garages
            TriggerClientEvent('qb-phone:client:updateGarages', src)
            TriggerClientEvent('qb-phone:client:updateGarages', SellerData.PlayerData.source)
        else
            TriggerClientEvent('qb-phone:client:CustomNotification', src, "VEHICLE SALE", "Insufficient Funds", "fas fa-chart-line", "#D3B300", 5500)
            TriggerClientEvent('qb-phone:client:CustomNotification', SellerData.PlayerData.source, "VEHICLE SALE", "Your vehicle was not purchased!", "fas fa-chart-line", "#D3B300", 5500)
        end
    elseif responseType == 'denied' then
        TriggerClientEvent('qb-phone:client:CustomNotification', src, "VEHICLE SALE", "Request denied", "fas fa-chart-line", "#D3B300", 5500)
        TriggerClientEvent('qb-phone:client:CustomNotification', SellerData.PlayerData.source, "VEHICLE SALE", "Your sale request was denied!", "fas fa-chart-line", "#D3B300", 5500)
    end
end)

local function round(num, numDecimalPlaces)
    return tonumber(string.format("%." .. (numDecimalPlaces or 0) .. "f", num))
end

QBCore.Functions.CreateCallback('qb-phone:server:GetGarageVehicles', function(source, cb)
    local Player = QBCore.Functions.GetPlayer(source)
    if not Player then
        cb({})
        return
    end

    local Vehicles = {}
    local vehdata
    local result = exports.oxmysql:executeSync('SELECT * FROM player_vehicles WHERE citizenid = ?', {Player.PlayerData.citizenid})
    if result and result[1] then
        for _, v in pairs(result) do
            local VehicleData = QBCore.Shared.Vehicles[v.vehicle]
            if VehicleData then
            local VehicleGarage = "None"
            local enginePercent = round(v.engine / 10, 0)
            local bodyPercent = round(v.body / 10, 0)
            if v.garage then
                if Garages[v.garage] then
                    VehicleGarage = Garages[v.garage]["label"]
                else
                    VehicleGarage = v.garage
                end
            end

            local VehicleState = "In"
            if v.state == 0 then
                VehicleState = "Out"
            elseif v.state == 2 then
                VehicleState = "Impounded"
            end

            if VehicleData["brand"] then
                vehdata = {
                    fullname = VehicleData["brand"] .. " " .. VehicleData["name"],
                    brand = VehicleData["brand"],
                    model = VehicleData["name"],
                    plate = v.plate,
                    garage = VehicleGarage,
                    state = VehicleState,
                    fuel = v.fuel,
                    engine = enginePercent,
                    body = bodyPercent,
                    paymentsleft = v.paymentsleft
                }
            else
                vehdata = {
                    fullname = VehicleData["name"],
                    brand = VehicleData["name"],
                    model = VehicleData["name"],
                    plate = v.plate,
                    garage = VehicleGarage,
                    state = VehicleState,
                    fuel = v.fuel,
                    engine = enginePercent,
                    body = bodyPercent,
                    paymentsleft = v.paymentsleft
                }
            end
            Vehicles[#Vehicles+1] = vehdata
            end
        end
        cb(Vehicles)
    else
        cb({})
    end
end)
