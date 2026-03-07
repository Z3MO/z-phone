local QBCore = exports['qb-core']:GetCoreObject()

local MAX_GALLERY_IMAGES = 50

local function normalizeImageUrl(url)
    if type(url) ~= 'string' then return nil end
    url = url:match('^%s*(.-)%s*$')
    if not url or #url < 8 or #url > 1000 then return nil end
    if not url:match('^https?://') then return nil end
    return url
end

local function fetchPlayerImages(citizenid)
    local rows = exports.oxmysql:executeSync(
        'SELECT `image`, `date` FROM phone_gallery WHERE citizenid = ? ORDER BY `date` DESC LIMIT ?',
        { citizenid, MAX_GALLERY_IMAGES }
    )

    if not rows then
        return {}
    end

    for index = #rows, 1, -1 do
        if not normalizeImageUrl(rows[index].image) then
            table.remove(rows, index)
        end
    end

    return rows
end

QBCore.Functions.CreateCallback('qb-phone:server:fetchImages', function(source, cb)
    local Player = QBCore.Functions.GetPlayer(source)
    if not Player then cb({}) return end
    cb(fetchPlayerImages(Player.PlayerData.citizenid))
end)

RegisterNetEvent('qb-phone:server:addImageToGallery', function(image)
    local src = source
    local Player = QBCore.Functions.GetPlayer(src)
    if not Player then return end
    image = normalizeImageUrl(image)
    if not image then return end

    local count = exports.oxmysql:executeSync(
        'SELECT COUNT(*) as total FROM phone_gallery WHERE citizenid = ?',
        { Player.PlayerData.citizenid }
    )
    if count and count[1] and count[1].total >= MAX_GALLERY_IMAGES then
        TriggerClientEvent('qb-phone:notification', src, 'Gallery', 'Gallery full! Max ' .. MAX_GALLERY_IMAGES .. ' photos.', 'fa-solid fa-images', '#ef4444', 3000)
        return
    end

    exports.oxmysql:insert(
        'INSERT INTO phone_gallery (`citizenid`, `image`) VALUES (?, ?)',
        { Player.PlayerData.citizenid, image }
    )
end)

RegisterNetEvent('qb-phone:server:getImageFromGallery', function()
    local src = source
    local Player = QBCore.Functions.GetPlayer(src)
    if not Player then return end
    local images = fetchPlayerImages(Player.PlayerData.citizenid)
    TriggerClientEvent('qb-phone:refreshImages', src, images)
end)

RegisterNetEvent('qb-phone:server:RemoveImageFromGallery', function(data)
    local src = source
    local Player = QBCore.Functions.GetPlayer(src)
    if not Player then return end
    if type(data) ~= 'table' then return end

    local image = normalizeImageUrl(data.image)
    if not image then return end

    exports.oxmysql:execute(
        'DELETE FROM phone_gallery WHERE citizenid = ? AND image = ? LIMIT 1',
        { Player.PlayerData.citizenid, image }
    )
end)
