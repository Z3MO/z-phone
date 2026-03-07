local QBCore = exports['qb-core']:GetCoreObject()

RegisterNUICallback('GetGalleryData', function(_, cb)
    QBCore.Functions.TriggerCallback('qb-phone:server:fetchImages', function(images)
        PhoneData.Images = images or {}
        cb(images or {})
    end)
end)

RegisterNUICallback('DeleteImage', function(data, cb)
    TriggerServerEvent('qb-phone:server:RemoveImageFromGallery', data)
    cb(true)
end)
