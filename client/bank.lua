local QBCore = exports['qb-core']:GetCoreObject()
local NUIActionCooldowns = {}

local function isNuiRateLimited(action, durationMs)
    local now = GetGameTimer()
    local lastTick = NUIActionCooldowns[action] or 0

    if (now - lastTick) < durationMs then
        return true
    end

    NUIActionCooldowns[action] = now
    return false
end

local function normalizeTransferAmount(value)
    local amount = math.floor(tonumber(value) or 0)
    if amount < 1 then
        return nil
    end

    return amount
end

local function normalizeBankAccount(value)
    if type(value) ~= 'string' then
        return nil
    end

    local account = value:upper():gsub('%s+', ''):gsub('[^%w%-]', '')
    if account == '' or #account > 32 then
        return nil
    end

    return account
end

local function normalizeReference(value)
    if type(value) ~= 'string' then
        return ''
    end

    local reference = value:gsub('[%c\r\n]', ' '):gsub('%s+', ' '):gsub('^%s+', ''):gsub('%s+$', '')
    return reference:sub(1, 60)
end

local function GetInvoiceFromID(id)
    for k, v in pairs(PhoneData.Invoices) do
        if v.id == id then
            return k
        end
    end
end

-- NUI Callback

RegisterNUICallback('GetBankContacts', function(_, cb)
    cb(PhoneData.Contacts)
end)

RegisterNUICallback('CanTransferMoney', function(data, cb)
    if isNuiRateLimited('bank-transfer', 900) then
        cb({
            TransferedMoney = false,
            NewBalance = PlayerData.money['bank'],
            message = 'Please wait a moment before sending again.'
        })
        return
    end

    local amount = normalizeTransferAmount(data and data.amountOf)
    local iban = normalizeBankAccount(data and data.sendTo)
    local reference = normalizeReference(data and data.reference)

    if not amount or not iban then
        cb({
            TransferedMoney = false,
            NewBalance = PlayerData.money['bank'],
            message = 'Invalid transfer details.'
        })
        return
    end

    if PlayerData.money['bank'] < amount then
        cb({
            TransferedMoney = false,
            NewBalance = PlayerData.money['bank'],
            message = 'You do not have enough bank balance.'
        })
        return
    end

    QBCore.Functions.TriggerCallback('qb-phone:server:CanTransferMoney', function(success, newBalance, message)
        cb({
            TransferedMoney = success or false,
            NewBalance = newBalance or PlayerData.money['bank'],
            message = message
        })
    end, amount, iban, reference)
end)

RegisterNUICallback('GetInvoices', function(_, cb)
    cb(PhoneData.Invoices)
end)

RegisterNUICallback('PayInvoice', function(data, cb)
    if isNuiRateLimited('pay-invoice', 900) then
        cb({ success = false, message = 'Please wait a moment before trying again.' })
        return
    end

    local invoiceId = tonumber(data and data.invoiceId)
    if not invoiceId then
        cb({ success = false, message = 'Invalid invoice.' })
        return
    end

    QBCore.Functions.TriggerCallback('qb-phone:server:PayMyInvoice', function(result)
        cb(result or { success = false, message = 'Unable to pay invoice.' })
    end, invoiceId)
end)

RegisterNUICallback('DeclineInvoice', function(data, cb)
    local invoiceId = tonumber(data and data.invoiceId)
    if not invoiceId then
        cb({ success = false, message = 'Invalid invoice.' })
        return
    end

    QBCore.Functions.TriggerCallback('qb-phone:server:DeclineMyInvoice', function(result)
        cb(result or { success = false, message = 'Unable to decline invoice.' })
    end, invoiceId)
end)

-- Events
RegisterNetEvent('qb-phone:client:RemoveBankMoney', function(amount)
    if amount > 0 then
        SendNUIMessage({
            action = "PhoneNotification",
            PhoneNotify = {
                title = "Bank",
                text = "$"..amount.." removed from your balance!",
                icon = "fas fa-university",
                color = "#ff002f",
                timeout = 3500,
            },
        })
    end
end)

RegisterNetEvent('qb-phone:client:AddBankMoney', function(amount)
    if amount > 0 then
        SendNUIMessage({
            action = "PhoneNotification",
            PhoneNotify = {
                title = "Bank",
                text = "$"..amount.." Added to your balance!",
                icon = "fas fa-university",
                color = "#ff002f",
                timeout = 3500,
            },
        })
    end
end)

RegisterNetEvent("qb-phone-new:client:BankNotify", function(text)
    SendNUIMessage({
        action = "PhoneNotification",
        NotifyData = {
            title = "Bank",
            content = text,
            icon = "fas fa-university",
            timeout = 3500,
            color = "#ff002f",
        },
    })
end)

RegisterNetEvent('qb-phone:client:AcceptorDenyInvoice', function(id, name, job, senderCID, amount, resource)
    PhoneData.Invoices[#PhoneData.Invoices+1] = {
        id = id,
        citizenid = QBCore.Functions.GetPlayerData().citizenid,
        sender = name,
        society = job,
        sendercitizenid = senderCID,
        amount = amount
    }

    local success = exports['z-phone']:PhoneNotification("Invoice", 'Invoice of $'..amount.." Sent from "..name, 'fas fa-file-invoice-dollar', '#b3e0f2', "NONE", 'fas fa-check-circle', 'fas fa-times-circle')
    if success then
        local table = GetInvoiceFromID(id)
        if table then
            TriggerServerEvent('qb-phone:server:PayMyInvoice', id)
        end
    else
        local table = GetInvoiceFromID(id)
        if table then
            TriggerServerEvent('qb-phone:server:DeclineMyInvoice', id)
        end
    end
end)

RegisterNetEvent('qb-phone:client:RemoveInvoiceFromTable', function(id)
    local table = GetInvoiceFromID(id)
    if table then
        PhoneData.Invoices[table] = nil

        SendNUIMessage({
            action = "refreshInvoice",
            invoices = PhoneData.Invoices,
        })
    end
end)
