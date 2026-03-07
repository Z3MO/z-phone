/**
 * html/js/debug/emulator.js
 *
 * Browser-based FiveM NUI Emulator for z-phone.
 *
 * Allows you to open z-phone's UI in a standard Chrome/Edge tab without
 * running FiveM, by:
 *  - Providing isEnvBrowser() to detect the environment
 *  - Mocking fetch() calls to https://z-phone/... with fake JSON data
 *  - Injecting a floating control panel to fire simulated game events
 *
 * HOW TO USE
 * ──────────
 * 1. Open html/index.html directly in Chrome/Edge.
 * 2. The emulator overlay appears automatically (bottom-left corner).
 * 3. Click "Open Phone" to trigger the `open` NUI action.
 * 4. Use other buttons to test individual flows.
 *
 * PRODUCTION
 * ──────────
 * This file is only loaded when isEnvBrowser() returns true (no
 * GetParentResourceName function present). In FiveM the script is inert.
 *
 * To strip it from production builds entirely, simply do NOT load this
 * script in fxmanifest.lua (it is intentionally excluded from the files
 * list there and only referenced as a dev-mode <script> in index.html
 * when inside a plain browser – see the loader comment in index.html).
 */

// ─────────────────────────────────────────────────────────────────────────────
// 1. Environment Detection
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns true when running in a normal web browser (not inside FiveM NUI).
 * FiveM injects GetParentResourceName() as a global function; its absence
 * is the reliable indicator that we are running in a browser tab.
 * @returns {boolean}
 */
function isEnvBrowser() {
    return typeof GetParentResourceName !== 'function';
}

// If we are inside FiveM, this whole file is a no-op.
if (!isEnvBrowser()) {
    // Provide a stub so other scripts can safely call isEnvBrowser()
    // without conditional guards everywhere.
    window.isEnvBrowser = isEnvBrowser;
} else {
    window.isEnvBrowser = isEnvBrowser;

    // ── 2. Stub GetParentResourceName so existing code doesn't throw ───────
    window.GetParentResourceName = function () { return 'z-phone'; };

    // ── 3. Fake data store ─────────────────────────────────────────────────
    var _fakeData = {
        PlayerData: {
            citizenid: 'DEV-001',
            charinfo: { firstname: 'Dev', lastname: 'Player', phone: '555-0100' },
            money:    { bank: 12500, cash: 400 },
            metadata: { phone: { background: 'zphone-1', profilepicture: 'default' } },
            job:      { name: 'police', grade: { level: 3 } },
        },
        Contacts: [
            { name: 'Alice', number: '555-0101', iban: 'US00DEV01' },
            { name: 'Bob',   number: '555-0102', iban: 'US00DEV02' },
        ],
        Chats: {
            '555-0101': { number: '555-0101', name: 'Alice', messages: [
                { message: "Hey! What's up?", type: 'received', time: Date.now() - 3600000 },
                { message: 'Not much, you?',   type: 'sent',     time: Date.now() - 1800000 },
            ]},
        },
        Vehicles: [
            { fullname: 'Sultan Classic', plate: 'DEV-001', state: 'Out', garage: 'Mission Row', fuel: 85, engine: 100, body: 97, paymentsleft: 0 },
            { fullname: 'Elegy RH8',      plate: 'DEV-002', state: 'Garaged', garage: 'Pillbox', fuel: 60, engine: 92, body: 80, paymentsleft: 3 },
        ],
        Mails: [
            { mailid: 1, sender: 'Bank of LS', subject: 'Account Statement', message: 'Your balance is $12,500.', date: new Date().toISOString(), read: false, button: [] },
            { mailid: 2, sender: 'LSPD',        subject: 'Reminder',         message: 'Please report for duty.',  date: new Date(Date.now() - 86400000).toISOString(), read: true, button: [] },
        ],
        Pulses: [],
        Invoices: [],
        Images: [],
        RecentCalls: [],
        SuggestedContacts: [],
        ChatRooms: [],
        Adverts: [],
        PhoneData: {
            MetaData: { background: 'zphone-1', profilepicture: 'default' },
            Contacts: [],
        },
    };

    // ── 4. Mock fetch() ────────────────────────────────────────────────────
    var _originalFetch = window.fetch;
    window.fetch = function (url, opts) {
        // Only intercept z-phone NUI callbacks
        if (typeof url !== 'string' || url.indexOf('z-phone/') === -1) {
            return _originalFetch.apply(this, arguments);
        }

        // Parse the callback name from the URL
        var parts = url.split('/');
        var callback = parts[parts.length - 1];

        var body = {};
        try { body = JSON.parse((opts && opts.body) || '{}'); } catch (e) { console.warn('[Emulator] fetch: JSON parse failed:', e); }

        console.log('[Emulator] NUI callback →', callback, body);

        var responseData = _handleCallback(callback, body);
        return Promise.resolve(new Response(JSON.stringify(responseData), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        }));
    };

    // jQuery $.post uses XMLHttpRequest not fetch, so patch that too
    var _xhrOpen = XMLHttpRequest.prototype.open;
    var _xhrSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.open = function (method, url) {
        this._emulatorUrl = url;
        return _xhrOpen.apply(this, arguments);
    };
    XMLHttpRequest.prototype.send = function (body) {
        if (typeof this._emulatorUrl === 'string' && this._emulatorUrl.indexOf('z-phone/') !== -1) {
            var parts = this._emulatorUrl.split('/');
            var callback = parts[parts.length - 1];
            var data = {};
            try { data = JSON.parse(body || '{}'); } catch (e) { console.warn('[Emulator] XHR: JSON parse failed:', e); }

            console.log('[Emulator] XHR NUI callback →', callback, data);

            var responseData = _handleCallback(callback, data);
            var self = this;
            setTimeout(function () {
                Object.defineProperty(self, 'readyState', { get: function () { return 4; } });
                Object.defineProperty(self, 'status',    { get: function () { return 200; } });
                Object.defineProperty(self, 'responseText', { get: function () { return JSON.stringify(responseData); } });
                if (typeof self.onreadystatechange === 'function') self.onreadystatechange();
                if (typeof self.onload === 'function') self.onload();
            }, 0);
            return;
        }
        return _xhrSend.apply(this, arguments);
    };

    /**
     * Route a NUI callback name → fake response data.
     * @param {string} callback
     * @param {Object} body
     * @returns {*}
     */
    function _handleCallback(callback, body) {
        switch (callback) {
            case 'HasPhone':              return true;
            case 'GetBankContacts':       return _fakeData.Contacts;
            case 'GetInvoices':           return _fakeData.Invoices;
            case 'GetWhatsappChats':      return _fakeData.Chats;
            case 'GetMissedCalls':        return _fakeData.RecentCalls;
            case 'GetSuggestedContacts':  return _fakeData.SuggestedContacts;
            case 'GetMails':              return _fakeData.Mails;
            case 'GetPulses':             return { PulseData: _fakeData.Pulses, hasVPN: false };
            case 'LoadProxis':            return _fakeData.Adverts;
            case 'SetupGarageVehicles':   return _fakeData.Vehicles;
            case 'GetGalleryData':        return _fakeData.Images;
            case 'GetChatRooms':          return _fakeData.ChatRooms;
            case 'GetPhoneData':          return {
                PlayerData: _fakeData.PlayerData,
                PlayerJob:  _fakeData.PlayerData.job,
                PhoneData:  _fakeData.PhoneData,
                PhoneJobs:  [],
            };
            case 'CanTransferMoney':
                return { TransferedMoney: true, NewBalance: (_fakeData.PlayerData.money.bank - (body.amountOf || 0)) };
            case 'ClearGeneralAlerts':    return 'ok';
            case 'Close':                 return 'ok';
            case 'PlaySound':             return 'ok';
            case 'AcceptNotification':    return 'ok';
            case 'DenyNotification':      return 'ok';
            case 'SetBackground':         return 'ok';
            case 'SetupStoreApps':        return [];
            case 'GetAvailableTaxiDrivers': return {};
            case 'GetPlayerHouses':       return [];
            case 'GetPlayerKey':          return [];
            default:
                console.warn('[Emulator] Unhandled NUI callback:', callback);
                return 'ok';
        }
    }

    // ── 5. Inject the debug control panel ─────────────────────────────────
    function _buildDebugPanel() {
        var panel = document.createElement('div');
        panel.id = 'z-phone-debug-panel';
        panel.style.cssText = [
            'position:fixed', 'bottom:16px', 'left:16px', 'z-index:99999',
            'background:rgba(15,15,20,0.92)', 'backdrop-filter:blur(12px)',
            'border:1px solid rgba(255,255,255,0.12)', 'border-radius:12px',
            'padding:12px 14px', 'font-family:monospace', 'font-size:12px',
            'color:#e2e8f0', 'min-width:220px', 'box-shadow:0 8px 32px rgba(0,0,0,0.5)',
        ].join(';');

        panel.innerHTML = [
            '<div style="font-weight:700;font-size:13px;margin-bottom:10px;color:#7dd3fc;">⚙ z-phone dev emulator</div>',
            '<div id="z-dbg-btns" style="display:flex;flex-direction:column;gap:6px;"></div>',
            '<div style="margin-top:10px;font-size:10px;color:#64748b;">Running in browser mode</div>',
        ].join('');

        document.body.appendChild(panel);

        var btnContainer = document.getElementById('z-dbg-btns');

        function addBtn(label, fn) {
            var btn = document.createElement('button');
            btn.textContent = label;
            btn.style.cssText = [
                'background:rgba(255,255,255,0.07)', 'color:#e2e8f0',
                'border:1px solid rgba(255,255,255,0.15)', 'border-radius:6px',
                'padding:5px 10px', 'cursor:pointer', 'text-align:left',
                'font-family:monospace', 'font-size:11px',
                'transition:background 0.15s',
            ].join(';');
            btn.addEventListener('mouseenter', function () { btn.style.background = 'rgba(125,211,252,0.12)'; });
            btn.addEventListener('mouseleave', function () { btn.style.background = 'rgba(255,255,255,0.07)'; });
            btn.addEventListener('click', fn);
            btnContainer.appendChild(btn);
        }

        // ── Trigger "Open Phone" ──────────────────────────────────────────
        addBtn('📱 Open Phone', function () {
            var config = (typeof Config !== 'undefined') ? Config : { PhoneApplications: {} };
            window.postMessage({
                action:     'open',
                AppData:    config.PhoneApplications || {},
                CallData:   {},
                PlayerData: _fakeData.PlayerData,
                hasVPN:     false,
                nui_token:  'DEV_TOKEN',
            }, '*');
            window.postMessage({
                action:    'LoadPhoneData',
                PlayerData: _fakeData.PlayerData,
                PlayerJob:  _fakeData.PlayerData.job,
                PhoneData:  _fakeData.PhoneData,
                PhoneJobs:  [],
            }, '*');
        });

        // ── Trigger "Receive SMS" ─────────────────────────────────────────
        addBtn('💬 Receive SMS', function () {
            var now = Date.now();
            var fakeChat = Object.assign({}, _fakeData.Chats['555-0101']);
            fakeChat.messages = fakeChat.messages.concat([{
                message: 'Test message at ' + new Date(now).toLocaleTimeString(),
                type:    'received',
                time:    now,
            }]);
            window.postMessage({
                action:     'UpdateChat',
                chatNumber: '555-0101',
                chatData:   fakeChat,
                Chats:      _fakeData.Chats,
                nui_token:  'DEV_TOKEN',
            }, '*');
        });

        // ── Trigger "Update Bank Balance" ─────────────────────────────────
        addBtn('💰 Update Bank Balance', function () {
            _fakeData.PlayerData.money.bank -= 100;
            window.postMessage({
                action:     'UpdateBank',
                NewBalance: _fakeData.PlayerData.money.bank,
                nui_token:  'DEV_TOKEN',
            }, '*');
        });

        // ── Trigger "New Mail" ────────────────────────────────────────────
        addBtn('✉️  New Mail', function () {
            var mail = {
                mailid: Date.now(),
                sender: 'Dev Test',
                subject: 'Hello from emulator',
                message: 'This mail was generated by the dev emulator.',
                date:    new Date().toISOString(),
                read:    false,
                button:  [],
            };
            _fakeData.Mails.unshift(mail);
            window.postMessage({ action: 'UpdateMails', Mails: _fakeData.Mails, nui_token: 'DEV_TOKEN' }, '*');
        });

        // ── Trigger "Incoming Call" ───────────────────────────────────────
        addBtn('📞 Incoming Call', function () {
            window.postMessage({
                action:        'IncomingCallAlert',
                CallData:      { name: 'Alice', number: '555-0101', CallId: 'DEV-CALL-' + Date.now() },
                Canceled:      false,
                AnonymousCall: false,
                nui_token:     'DEV_TOKEN',
            }, '*');
        });

        // ── Close Phone ───────────────────────────────────────────────────
        addBtn('✖ Close Phone', function () {
            if (typeof QB !== 'undefined' && QB.Phone && QB.Phone.Functions) {
                QB.Phone.Functions.Close();
            }
        });
    }

    // Wait for DOM to be ready before injecting the panel
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', _buildDebugPanel);
    } else {
        _buildDebugPanel();
    }

    console.log('[z-phone] Browser emulator active. Use the debug panel (bottom-left) to simulate events.');
}
