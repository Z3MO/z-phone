local QBCore = exports['qb-core']:GetCoreObject()
local bannedCharacters = {'%','$',';'}

-- Events

RegisterNetEvent('qb-phone:server:InvoiceHandler')

-- EVENT HANDLER(S) --

-- Has player paid something this --
--[[AddEventHandler('qb-phone:server:InvoiceHandler', function(paid, amount, source, resource)

    if paid and resource == GetCurrentResourceName() then
        if amount >= config.minPayment then
            if Config.RenewedBanking then
                local cid = Player.PlayerData.citizenid
                local name = ("%s %s"):format(Player.PlayerData.charinfo.firstname, Player.PlayerData.charinfo.lastname)
                exports['Renewed-Banking']:handleTransaction(cid, "Phone Invoice", amount, "Paid off phone invoice of $"..amount, name, name, "withdraw")
            end
            -- Do shit
        end
    end
end)]]

QBCore.Functions.CreateCallback('qb-phone:server:CanTransferMoney', function(source, cb, amount, iban)
    -- strip bad characters from bank transfers
    local newAmount = tostring(amount)
    local newiban = tostring(iban)
    for _, v in pairs(bannedCharacters) do
        newAmount = string.gsub(newAmount, '%' .. v, '')
        newiban = string.gsub(newiban, '%' .. v, '')
    end
    iban = newiban
    amount = tonumber(newAmount)

    local Player = QBCore.Functions.GetPlayer(source)
    if (Player.PlayerData.money.bank - amount) >= 0 then
        local query = '%"account":"' .. iban .. '"%'
        local result = MySQL.query.await('SELECT * FROM players WHERE charinfo LIKE ?', {query})
        if result[1] ~= nil then
            local Reciever = QBCore.Functions.GetPlayerByCitizenId(result[1].citizenid)
            Player.Functions.RemoveMoney('bank', amount, "Money sent to account (#"..iban..")")
            if Reciever ~= nil then
                Reciever.Functions.AddMoney('bank', amount, "Money received from account (#"..Player.PlayerData.charinfo.account..")")
            else
                local RecieverMoney = json.decode(result[1].money)
                RecieverMoney.bank = (RecieverMoney.bank + amount)
                MySQL.update('UPDATE players SET money = ? WHERE citizenid = ?', {json.encode(RecieverMoney), result[1].citizenid})
            end
            cb(true)
        else
            cb(false)
        end
    end
end)

RegisterNetEvent('qb-phone:server:PayMyInvoice', function(society, amount, invoiceId, sendercitizenid, resource)
    local src = source
    local Player = QBCore.Functions.GetPlayer(src)
    local SenderPly = QBCore.Functions.GetPlayerByCitizenId(sendercitizenid)
    if Player.PlayerData.money.bank >= amount then
        Player.Functions.RemoveMoney('bank', amount, "paid-invoice")
        if SenderPly and Config.BillingCommissions and Config.BillingCommissions[society] then
            local commission = math.ceil(amount * Config.BillingCommissions[society])
            SenderPly.Functions.AddMoney('bank', commission)
        end

        if SenderPly then
            TriggerClientEvent('qb-phone:client:CustomNotification', SenderPly.PlayerData.source,
                "Invoice Paid off by " .. SenderPly.PlayerData.charinfo.firstname .. ".",
                "Recent Invoice of $" .. amount .. " has been paid.",
                "fas fa-file-invoice-dollar",
                "#1DA1F2",
                7500
            )
        end

        TriggerClientEvent('qb-phone:client:RemoveInvoiceFromTable', src, invoiceId)
        -- TriggerEvent("qb-phone:server:InvoiceHandler", true, amount, src, resource)

        exports.oxmysql:execute('DELETE FROM pefcl_invoices WHERE id = ?', {invoiceId})
    end
end)

RegisterNetEvent('qb-phone:server:DeclineMyInvoice', function(amount, invoiceId, sendercitizenid, resource)
    local Ply = QBCore.Functions.GetPlayer(source)
    local SenderPly = QBCore.Functions.GetPlayerByCitizenId(sendercitizenid)
    if not Ply then return end

    exports.oxmysql:execute('DELETE FROM pefcl_invoices WHERE id = ?', {invoiceId})
    if SenderPly then
        TriggerClientEvent('qb-phone:client:CustomNotification', SenderPly.PlayerData.source,
            "Invoice Declined by " .. SenderPly.PlayerData.charinfo.firstname .. ".",
            "Recent invoice of $" .. amount .. " has been declined.",
            "fas fa-file-invoice-dollar",
            "#1DA1F2",
            7500
        )
    end

    TriggerClientEvent('qb-phone:client:RemoveInvoiceFromTable', source, invoiceId)
    -- TriggerEvent("qb-phone:server:InvoiceHandler", false, amount, source, resource)
end)


RegisterNetEvent('qb-phone:server:CreateInvoice', function(billed, biller, amount)
    local billedID = tonumber(billed)
    local cash = tonumber(amount)
    local billedCID = QBCore.Functions.GetPlayer(billedID)
    local billerInfo = QBCore.Functions.GetPlayer(biller)

    local resource = GetInvokingResource()

    if not billedID or not cash or not billedCID or not billerInfo then return end
    
    exports.pefcl:createInvoice(billedCID.PlayerData.source, { 
        to = billedCID.PlayerData.charinfo.firstname, 
        toIdentifier = billedCID.PlayerData.citizenid, 
        from = billerInfo.PlayerData.charinfo.firstname,
        fromIdentifier = billerInfo.PlayerData.citizenid,
        amount = cash, 
        message = 'You have been charged for '..cash..'', 
        receiverAccountIdentifier = billerInfo.PlayerData.job.name, 
    })

    -- MySQL.Async.insert('INSERT INTO pefcl_invoices (citizenid, amount, society, sender, sendercitizenid) VALUES (?, ?, ?, ?, ?)',{
    --     billedCID.PlayerData.citizenid,
    --     cash,
    --     billerInfo.PlayerData.job.name,
    --     billerInfo.PlayerData.charinfo.firstname,
    --     billerInfo.PlayerData.citizenid
    -- }, function(id)
    --     if id then
    --         TriggerClientEvent('qb-phone:client:AcceptorDenyInvoice', billedCID.PlayerData.source, id, billerInfo.PlayerData.charinfo.firstname, billerInfo.PlayerData.job.name, billerInfo.PlayerData.citizenid, cash, resource)
    --     end
    -- end)
end)

QBCore.Functions.CreateCallback('qb-phone:server:GetInvoices', function(source, cb)
    local invoices = exports.pefcl:getInvoices(source)
    cb(invoices)
end)

QBCore.Commands.Add('bill', 'Bill A Player', {{name = 'id', help = 'Player ID'}, {name = 'amount', help = 'Fine Amount'}}, false, function(source, args)
    local biller = QBCore.Functions.GetPlayer(source)
    local billed = QBCore.Functions.GetPlayer(tonumber(args[1]))
    local amount = tonumber(args[2])
    if biller.PlayerData.job.name == "police" or biller.PlayerData.job.name == 'ambulance' or biller.PlayerData.job.name == 'mechanic' then
        if billed ~= nil then
            -- if biller.PlayerData.citizenid ~= billed.PlayerData.citizenid then
                if amount and amount > 0 then
                    exports.pefcl:createInvoice(billed.PlayerData.source, {
                        to = billed.PlayerData.charinfo.firstname,
                        toIdentifier = billed.PlayerData.citizenid,
                        from = biller.PlayerData.charinfo.firstname,
                        fromIdentifier = biller.PlayerData.citizenid,
                        amount = amount,
                        message = 'You have been charged for '..amount..'',
                        receiverAccountIdentifier = biller.PlayerData.job.name,
                    })
                    TriggerClientEvent('qb-phone:RefreshPhone', billed.PlayerData.source)
                    TriggerClientEvent('QBCore:Notify', source, 'Invoice Successfully Sent', 'success')
                    TriggerClientEvent('QBCore:Notify', billed.PlayerData.source, 'New Invoice Received')
                else
                    TriggerClientEvent('QBCore:Notify', source, 'Must Be A Valid Amount Above 0', 'error')
                end
            -- else
            --     TriggerClientEvent('QBCore:Notify', source, 'You Cannot Bill Yourself', 'error')
            -- end
        else
            TriggerClientEvent('QBCore:Notify', source, 'Player Not Online', 'error')
        end
    else
        TriggerClientEvent('QBCore:Notify', source, 'No Access', 'error')
    end
end)