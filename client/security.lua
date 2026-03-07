--[[
    client/security.lua

    NUI Security Layer for z-phone
    ────────────────────────────────────────────────────────────────────────────
    Provides two protections for NUI → Lua callbacks:

    1. Session Token Validation
       Each time the phone opens, a fresh random token is generated and sent to
       the NUI via SendNUIMessage.  Every NUI callback that calls
       ValidateNUIToken(data) will reject the request if the token is missing or
       doesn't match, preventing executor-injected fake callbacks.

    2. Rate-Limit Guard (Heartbeat check)
       CheckRateLimit(callbackName) tracks call timestamps per callback name and
       returns false (rejecting the request) if the same callback fires more
       than MAX_CALLS_PER_SECOND times in a single second.  A player cannot
       physically click faster than ~5 Hz, so a threshold of 10 Hz is a clear
       indicator of a script executor.

    USAGE
    ─────
    In every sensitive RegisterNUICallback, add at the top:

        RegisterNUICallback('CanTransferMoney', function(data, cb)
            if not ValidateNUIToken(data)       then return cb({error="unauthorized"}) end
            if not CheckRateLimit('CanTransferMoney') then return cb({error="rate_limited"}) end
            -- ... existing logic ...
        end)
--]]

local _sessionToken   = nil
local _rateLimitStore = {}  -- [callbackName] = { timestamps = {...} }

local MAX_CALLS_PER_SECOND = 10  -- flag if a single callback fires faster than this
local WINDOW_MS            = 1000

-- ── Token helpers ─────────────────────────────────────────────────────────────

--- Generates a cryptographically-adequate random token string.
--- FiveM's Lua 5.4 provides math.random with good seeding per-resource.
local function GenerateToken()
    local chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    local token  = {}
    for _ = 1, 32 do
        local idx = math.random(1, #chars)
        token[#token + 1] = chars:sub(idx, idx)
    end
    return table.concat(token)
end

--- Creates a new session token, stores it locally, and sends it to the NUI.
--- Call this every time the phone is opened.
--- Returns the newly generated token so callers can embed it in other messages.
function RefreshNUIToken()
    _sessionToken = GenerateToken()
    SendNUIMessage({ action = "nui_token", token = _sessionToken })
    return _sessionToken
end

--- Clears the session token so callbacks fired after the phone is closed
--- (from a cached or injected request) are automatically rejected.
function ClearNUIToken()
    _sessionToken = nil
end

-- ── Validation ────────────────────────────────────────────────────────────────

--- Validates the nui_token field in a NUI callback payload.
--- @param  data table  The raw callback data table from RegisterNUICallback
--- @return boolean     true if the token is valid, false to reject
function ValidateNUIToken(data)
    if _sessionToken == nil then return false end
    if type(data) ~= "table" then return false end
    if data.nui_token ~= _sessionToken then
        print(('[z-phone][SECURITY] Token mismatch from NUI callback – possible executor attempt!'))
        -- Notify the server so admins can be alerted
        TriggerServerEvent('qb-phone:server:LogSecurityViolation', 'token_mismatch')
        return false
    end
    return true
end

-- ── Rate Limiter ───────────────────────────────────────────────────────────────

--- Checks whether a callback is being called too fast.
--- @param  name string  A unique identifier for the callback (e.g. 'CanTransferMoney')
--- @return boolean      true if the call is allowed, false if rate-limited
function CheckRateLimit(name)
    local now = GetGameTimer()  -- milliseconds since resource start

    if not _rateLimitStore[name] then
        _rateLimitStore[name] = { timestamps = {} }
    end

    local store = _rateLimitStore[name]
    local cutoff = now - WINDOW_MS

    -- Purge timestamps older than 1 second
    local fresh = {}
    for _, ts in ipairs(store.timestamps) do
        if ts > cutoff then
            fresh[#fresh + 1] = ts
        end
    end
    store.timestamps = fresh

    if #store.timestamps >= MAX_CALLS_PER_SECOND then
        print(('[z-phone][SECURITY] Rate limit exceeded for callback "%s" – possible executor!'):format(name))
        -- Notify the server so admins can be alerted
        TriggerServerEvent('qb-phone:server:LogSecurityViolation', 'rate_limit:' .. name)
        return false
    end

    store.timestamps[#store.timestamps + 1] = now
    return true
end
