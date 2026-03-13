// Modern Message Application - Vanilla JS Implementation
// No jQuery dependencies, enhanced security, optimized performance

// State management
const MessageState = {
    whatsappSearchActive: false,
    openedChatPicture: null,
    extraButtonsOpen: false,
    emojiPickerOpen: false,
    currentChatNumber: null
};

// Constants
const IMAGE_FILE_EXTENSION_REGEX = /\.(?:jpg|jpeg|gif|png|webp)(?:\?.*)?$/i;
const EMPTY_MESSAGES_TEXT = "No messages yet";
const MAX_MESSAGE_LENGTH = 200;
const MAX_PHONE_LENGTH = 15;

function getNuiResourceName() {
    if (typeof GetParentResourceName === 'function') {
        const resourceName = GetParentResourceName();
        if (resourceName) {
            return resourceName;
        }
    }

    if (typeof window !== 'undefined' && window.location && window.location.hostname) {
        const { hostname } = window.location;
        if (hostname && hostname !== 'localhost' && hostname !== '127.0.0.1') {
            return hostname;
        }
    }

    return null;
}

function createNuiFallbackResponse(data = null) {
    return {
        ok: false,
        status: 0,
        json: async () => data,
        text: async () => (typeof data === 'string' ? data : JSON.stringify(data))
    };
}

function readNuiJson(response) {
    if (!response || typeof response.json !== 'function') {
        return Promise.resolve(null);
    }

    return response.json().catch(error => {
        console.error('Failed to parse NUI response:', error);
        return null;
    });
}

// Utility: Post to NUI
function postNUI(endpoint, data = {}) {
    const resourceName = getNuiResourceName();

    if (!resourceName) {
        console.warn(`Skipping NUI request for ${endpoint}: resource name unavailable.`);
        return Promise.resolve(createNuiFallbackResponse());
    }

    return fetch(`https://${resourceName}/${endpoint}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    }).catch(error => {
        console.error(`NUI request failed for ${endpoint}:`, error);
        return createNuiFallbackResponse();
    });
}

// Initialize emoji picker when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    initializeMessageApp();
});

function initializeMessageApp() {
    setupInputFocusHandlers();
    setupEmojiPicker();
    setupEventListeners();
}

// Setup focus handlers for all inputs
function setupInputFocusHandlers() {
    const inputSelectors = 'input[type=text], textarea, input[type=number], input[type=tel]';
    
    document.addEventListener('focusin', function(e) {
        if (e.target.matches(inputSelectors) || e.target.closest('.whatsapp-openedchat')) {
            e.preventDefault();
            postNUI('DissalowMoving');
        }
    });
    
    document.addEventListener('focusout', function(e) {
        if (e.target.matches(inputSelectors)) {
            e.preventDefault();
            postNUI('AllowMoving');
        }
    });
}

// Initialize modern emoji picker
function setupEmojiPicker() {
    const messageInput = document.getElementById('whatsapp-openedchat-message');
    if (!messageInput) return;
    
    // Create emoji button
    const emojiBtn = document.createElement('button');
    emojiBtn.type = 'button';
    emojiBtn.className = 'whatsapp-emoji-trigger';
    emojiBtn.innerHTML = '<i class="fa-regular fa-face-smile"></i>';
    emojiBtn.setAttribute('aria-label', 'Add emoji');
    
    // Create emoji picker container
    const emojiPicker = document.createElement('div');
    emojiPicker.className = 'whatsapp-emoji-picker';
    emojiPicker.innerHTML = `
        <div class="emoji-picker-header">
            <input type="text" class="emoji-search" placeholder="Search emoji..." />
        </div>
        <div class="emoji-picker-categories">
            <button data-category="smileys" title="Smileys & Emotion">😊</button>
            <button data-category="people" title="People & Body">👋</button>
            <button data-category="animals" title="Animals & Nature">🐱</button>
            <button data-category="food" title="Food & Drink">🍕</button>
            <button data-category="travel" title="Travel & Places">✈️</button>
            <button data-category="activities" title="Activities">⚽</button>
            <button data-category="objects" title="Objects">💡</button>
            <button data-category="symbols" title="Symbols">❤️</button>
        </div>
        <div class="emoji-picker-grid"></div>
    `;
    
    // Insert before send button
    const sendBtn = document.getElementById('whatsapp-openedchat-send');
    if (sendBtn && messageInput.parentElement) {
        messageInput.parentElement.insertBefore(emojiBtn, sendBtn);
        messageInput.parentElement.insertBefore(emojiPicker, sendBtn);
        
        // Setup emoji picker functionality
        setupEmojiPickerEvents(emojiBtn, emojiPicker, messageInput);
        loadEmojis('smileys', emojiPicker);
    }
}

// Setup emoji picker event handlers
function setupEmojiPickerEvents(button, picker, input) {
    button.addEventListener('click', function(e) {
        e.stopPropagation();
        picker.classList.toggle('active');
        MessageState.emojiPickerOpen = picker.classList.contains('active');
    });
    
    // Close picker when clicking outside
    document.addEventListener('click', function(e) {
        if (!picker.contains(e.target) && e.target !== button) {
            picker.classList.remove('active');
            MessageState.emojiPickerOpen = false;
        }
    });
    
    // Category selection
    picker.querySelectorAll('[data-category]').forEach(btn => {
        btn.addEventListener('click', function() {
            const category = this.dataset.category;
            picker.querySelectorAll('[data-category]').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            loadEmojis(category, picker);
        });
    });
    
    // Emoji search
    const searchInput = picker.querySelector('.emoji-search');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            searchEmojis(this.value.toLowerCase(), picker);
        });
    }
}

// Load emojis for a specific category
function loadEmojis(category, picker) {
    const emojis = {
        smileys: ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '😎', '🤓', '🧐'],
        people: ['👋', '🤚', '🖐', '✋', '🖖', '👌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '💅', '🤳', '💪', '🦾', '🦿', '🦵', '🦶', '👂', '🦻', '👃', '🧠', '🦷', '🦴', '👀', '👁', '👅', '👄', '💋', '👶', '🧒', '👦', '👧', '🧑', '👨', '👩', '🧔', '🧓', '👴', '👵'],
        animals: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐽', '🐸', '🐵', '🙈', '🙉', '🙊', '🐒', '🐔', '🐧', '🐦', '🐤', '🐣', '🐥', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋', '🐌', '🐞', '🐜', '🦗', '🕷', '🦂', '🐢', '🐍', '🦎', '🦖', '🦕', '🐙', '🦑', '🦐', '🦀', '🐡', '🐠', '🐟', '🐬', '🐳', '🐋', '🦈', '🐊', '🐅', '🐆', '🦓', '🦍', '🦧', '🐘', '🦛', '🦏', '🐪', '🐫', '🦒', '🦘', '🐃', '🐂', '🐄', '🐎', '🐖', '🐏', '🐑', '🦙', '🐐', '🦌', '🐕', '🐩', '🦮', '🐈', '🐓', '🦃', '🦚', '🦜', '🦢', '🦩', '🕊', '🐇', '🦝', '🦨', '🦡', '🦦', '🦥', '🐁', '🐀', '🐿', '🦔'],
        food: ['🍎', '🍏', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦', '🥬', '🥒', '🌶', '🌽', '🥕', '🧄', '🧅', '🥔', '🍠', '🥐', '🥯', '🍞', '🥖', '🥨', '🧀', '🥚', '🍳', '🧈', '🥞', '🧇', '🥓', '🥩', '🍗', '🍖', '🦴', '🌭', '🍔', '🍟', '🍕', '🥪', '🥙', '🧆', '🌮', '🌯', '🥗', '🥘', '🥫', '🍝', '🍜', '🍲', '🍛', '🍣', '🍱', '🥟', '🦪', '🍤', '🍙', '🍚', '🍘', '🍥', '🥠', '🥮', '🍢', '🍡', '🍧', '🍨', '🍦', '🥧', '🧁', '🍰', '🎂', '🍮', '🍭', '🍬', '🍫', '🍿', '🍩', '🍪', '🌰', '🥜', '🍯', '🥛', '🍼', '☕', '🍵', '🧃', '🥤', '🍶', '🍺', '🍻', '🥂', '🍷', '🥃', '🍸', '🍹', '🧉', '🍾', '🧊', '🥄', '🍴', '🍽', '🥣', '🥡', '🥢', '🧂'],
        travel: ['🚗', '🚕', '🚙', '🚌', '🚎', '🏎', '🚓', '🚑', '🚒', '🚐', '🚚', '🚛', '🚜', '🦯', '🦽', '🦼', '🛴', '🚲', '🛵', '🏍', '🛺', '🚨', '🚔', '🚍', '🚘', '🚖', '🚡', '🚠', '🚟', '🚃', '🚋', '🚞', '🚝', '🚄', '🚅', '🚈', '🚂', '🚆', '🚇', '🚊', '🚉', '✈️', '🛫', '🛬', '🛩', '💺', '🛰', '🚀', '🛸', '🚁', '🛶', '⛵', '🚤', '🛥', '🛳', '⛴', '🚢', '⚓', '⛽', '🚧', '🚦', '🚥', '🚏', '🗺', '🗿', '🗽', '🗼', '🏰', '🏯', '🏟', '🎡', '🎢', '🎠', '⛲', '⛱', '🏖', '🏝', '🏜', '🌋', '⛰', '🏔', '🗻', '🏕', '⛺', '🏠', '🏡', '🏘', '🏚', '🏗', '🏭', '🏢', '🏬', '🏣', '🏤', '🏥', '🏦', '🏨', '🏪', '🏫', '🏩', '💒', '🏛', '⛪', '🕌', '🕍', '🛕', '🕋', '⛩', '🛤', '🛣', '🗾', '🎑', '🏞', '🌅', '🌄', '🌠', '🎇', '🎆', '🌇', '🌆', '🏙', '🌃', '🌌', '🌉', '🌁'],
        activities: ['⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🪀', '🏓', '🏸', '🏒', '🏑', '🥍', '🏏', '🥅', '⛳', '🪁', '🏹', '🎣', '🤿', '🥊', '🥋', '🎽', '🛹', '🛷', '⛸', '🥌', '🎿', '⛷', '🏂', '🪂', '🏋️', '🤼', '🤸', '🤺', '⛹️', '🤾', '🏌️', '🏇', '🧘', '🏊', '🤽', '🚣', '🧗', '🚵', '🚴', '🏆', '🥇', '🥈', '🥉', '🏅', '🎖', '🏵', '🎗', '🎫', '🎟', '🎪', '🤹', '🎭', '🩰', '🎨', '🎬', '🎤', '🎧', '🎼', '🎹', '🥁', '🎷', '🎺', '🎸', '🪕', '🎻', '🎲', '♟', '🎯', '🎳', '🎮', '🎰', '🧩'],
        objects: ['⌚', '📱', '📲', '💻', '⌨️', '🖥', '🖨', '🖱', '🖲', '🕹', '🗜', '💽', '💾', '💿', '📀', '📼', '📷', '📸', '📹', '🎥', '📽', '🎞', '📞', '☎️', '📟', '📠', '📺', '📻', '🎙', '🎚', '🎛', '🧭', '⏱', '⏲', '⏰', '🕰', '⌛', '⏳', '📡', '🔋', '🔌', '💡', '🔦', '🕯', '🪔', '🧯', '🛢', '💸', '💵', '💴', '💶', '💷', '💰', '💳', '💎', '⚖️', '🧰', '🔧', '🔨', '⚒', '🛠', '⛏', '🔩', '⚙️', '🧱', '⛓', '🧲', '🔫', '💣', '🧨', '🪓', '🔪', '🗡', '⚔️', '🛡', '🚬', '⚰️', '⚱️', '🏺', '🔮', '📿', '🧿', '💈', '⚗️', '🔭', '🔬', '🕳', '🩹', '🩺', '💊', '💉', '🩸', '🧬', '🦠', '🧫', '🧪', '🌡', '🧹', '🧺', '🧻', '🚽', '🚰', '🚿', '🛁', '🛀', '🧼', '🪒', '🧽', '🧴', '🛎', '🔑', '🗝', '🚪', '🪑', '🛋', '🛏', '🧸', '🖼', '🛍', '🎁', '🎈', '🎏', '🎀', '🎊', '🎉', '🎎', '🏮', '🎐', '🧧', '✉️', '📩', '📨', '📧', '💌', '📥', '📤', '📦', '🏷', '📪', '📫', '📬', '📭', '📮', '📯', '📜', '📃', '📄', '📑', '🧾', '📊', '📈', '📉', '🗒', '🗓', '📆', '📅', '🗑', '📇', '🗃', '🗳', '🗄', '📋', '📁', '📂', '🗂', '🗞', '📰', '📓', '📔', '📒', '📕', '📗', '📘', '📙', '📚', '📖', '🔖', '🧷', '🔗', '📎', '🖇', '📐', '📏', '🧮', '📌', '📍', '✂️', '🖊', '🖋', '✒️', '🖌', '🖍', '📝', '✏️', '🔍', '🔎', '🔏', '🔐', '🔒', '🔓'],
        symbols: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️', '✝️', '☪️', '🕉', '☸️', '✡️', '🔯', '🕎', '☯️', '☦️', '🛐', '⛎', '♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓', '🆔', '⚛️', '🉑', '☢️', '☣️', '📴', '📳', '🈶', '🈚', '🈸', '🈺', '🈷️', '✴️', '🆚', '💮', '🉐', '㊙️', '㊗️', '🈴', '🈵', '🈹', '🈲', '🅰️', '🅱️', '🆎', '🆑', '🅾️', '🆘', '❌', '⭕', '🛑', '⛔', '📛', '🚫', '💯', '💢', '♨️', '🚷', '🚯', '🚳', '🚱', '🔞', '📵', '🚭', '❗', '❕', '❓', '❔', '‼️', '⁉️', '🔅', '🔆', '〽️', '⚠️', '🚸', '🔱', '⚜️', '🔰', '♻️', '✅', '🈯', '💹', '❇️', '✳️', '❎', '🌐', '💠', 'Ⓜ️', '🌀', '💤', '🏧', '🚾', '♿', '🅿️', '🈳', '🈂️', '🛂', '🛃', '🛄', '🛅', '🚹', '🚺', '🚼', '🚻', '🚮', '🎦', '📶', '🈁', '🔣', 'ℹ️', '🔤', '🔡', '🔠', '🆖', '🆗', '🆙', '🆒', '🆕', '🆓', '0️⃣', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟', '🔢', '#️⃣', '*️⃣', '⏏️', '▶️', '⏸', '⏯', '⏹', '⏺', '⏭', '⏮', '⏩', '⏪', '⏫', '⏬', '◀️', '🔼', '🔽', '➡️', '⬅️', '⬆️', '⬇️', '↗️', '↘️', '↙️', '↖️', '↕️', '↔️', '↪️', '↩️', '⤴️', '⤵️', '🔀', '🔁', '🔂', '🔄', '🔃', '🎵', '🎶', '➕', '➖', '➗', '✖️', '♾', '💲', '💱', '™️', '©️', '®️', '〰️', '➰', '➿', '🔚', '🔙', '🔛', '🔝', '🔜', '✔️', '☑️', '🔘', '🔴', '🟠', '🟡', '🟢', '🔵', '🟣', '⚫', '⚪', '🟤', '🔺', '🔻', '🔸', '🔹', '🔶', '🔷', '🔳', '🔲', '▪️', '▫️', '◾', '◽', '◼️', '◻️', '🟥', '🟧', '🟨', '🟩', '🟦', '🟪', '⬛', '⬜', '🟫', '🔈', '🔇', '🔉', '🔊', '🔔', '🔕', '📣', '📢', '👁‍🗨', '💬', '💭', '🗯', '♠️', '♣️', '♥️', '♦️', '🃏', '🎴', '🀄', '🕐', '🕑', '🕒', '🕓', '🕔', '🕕', '🕖', '🕗', '🕘', '🕙', '🕚', '🕛', '🕜', '🕝', '🕞', '🕟', '🕠', '🕡', '🕢', '🕣', '🕤', '🕥', '🕦', '🕧']
    };
    
    const grid = picker.querySelector('.emoji-picker-grid');
    if (!grid) return;
    
    grid.innerHTML = '';
    const categoryEmojis = emojis[category] || emojis.smileys;
    
    categoryEmojis.forEach(emoji => {
        const btn = document.createElement('button');
        btn.className = 'emoji-item';
        btn.textContent = emoji;
        btn.type = 'button';
        btn.addEventListener('click', function() {
            insertEmoji(emoji);
            picker.classList.remove('active');
            MessageState.emojiPickerOpen = false;
        });
        grid.appendChild(btn);
    });
}

// Search emojis
function searchEmojis(query, picker) {
    if (!query) {
        loadEmojis('smileys', picker);
        return;
    }
    
    const emojiMap = {
        'smile': '😀😃😄😁😆😅🤣😂🙂🙃😉😊😇',
        'love': '❤️🧡💛💚💙💜🖤🤍🤎💔❣️💕💞💓💗💖💘💝💟',
        'happy': '😀😃😄😁😆😅🤣😂🙂😊😇🥰😍🤩😘',
        'sad': '😢😭😔😞😟😕🙁☹️😣😖😩😫',
        'angry': '😠😡🤬😤😾💢',
        'laugh': '🤣😂😹😆',
        'cry': '😢😭😿',
        'heart': '❤️💙💚💛🧡💜🖤🤍🤎💔❣️💕💞💓💗💖💘💝',
        'fire': '🔥',
        'star': '⭐🌟✨💫',
        'think': '🤔🤨',
        'cool': '😎🕶️',
        'party': '🎉🎊🥳🎈🎁',
        'food': '🍕🍔🍟🌭🥪🌮🌯🍜🍝🍱',
        'drink': '☕🍵🧃🥤🍶🍺🍻🥂🍷🥃🍸🍹',
        'car': '🚗🚕🚙🚌🚎🏎️🚓🚑🚒',
        'phone': '📱📞☎️📟📠',
        'money': '💰💸💵💴💶💷💳💎',
        'thumb': '👍👎',
        'hand': '👋🤚🖐️✋🖖👌🤏✌️🤞🤟🤘🤙👈👉👆👇☝️👍👎✊👊'
    };
    
    const grid = picker.querySelector('.emoji-picker-grid');
    if (!grid) return;
    
    grid.innerHTML = '';
    
    for (let [key, emojis] of Object.entries(emojiMap)) {
        if (key.includes(query)) {
            [...emojis].forEach(emoji => {
                const btn = document.createElement('button');
                btn.className = 'emoji-item';
                btn.textContent = emoji;
                btn.type = 'button';
                btn.addEventListener('click', function() {
                    insertEmoji(emoji);
                    picker.classList.remove('active');
                    MessageState.emojiPickerOpen = false;
                });
                grid.appendChild(btn);
            });
        }
    }
}

// Insert emoji at cursor position
function insertEmoji(emoji) {
    const input = document.getElementById('whatsapp-openedchat-message');
    if (!input) return;
    
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const text = input.value;
    
    input.value = text.substring(0, start) + emoji + text.substring(end);
    input.selectionStart = input.selectionEnd = start + emoji.length;
    input.focus();
}

// Get composer value (replaces jQuery version)
function getWhatsappComposerValue() {
    const input = document.getElementById('whatsapp-openedchat-message');
    return input ? String(input.value || '') : '';
}

// Clear composer (replaces jQuery version)
function clearWhatsappComposer() {
    const input = document.getElementById('whatsapp-openedchat-message');
    if (input) {
        input.value = '';
    }
}

// Handle enter key in composer
function handleWhatsappComposerEnter(event) {
    if (event.key !== "Enter" || event.shiftKey) {
        return;
    }

    event.preventDefault();
    const sendBtn = document.getElementById('whatsapp-openedchat-send');
    if (sendBtn) {
        sendBtn.click();
    }
}

// Format phone number for display
function formatPhoneNumber(phoneNumberString) {
    const cleaned = ('' + phoneNumberString).replace(/\D/g, '');
    const match = cleaned.match(/^(1|)?(\d{3})(\d{3})(\d{4})$/);
    if (match) {
        const intlCode = (match[1] ? '+1 ' : '');
        return [intlCode, '(', match[2], ') ', match[3], '-', match[4]].join('');
    }
    return phoneNumberString;
}

// Enhanced security: Sanitize text (XSS prevention)
function sanitizeText(value) {
    if (typeof DOMPurify !== 'undefined') {
        return DOMPurify.sanitize(String(value ?? ""), {
            ALLOWED_TAGS: [],
            ALLOWED_ATTR: []
        }).trim();
    }
    
    // Fallback if DOMPurify not available
    const div = document.createElement('div');
    div.textContent = String(value ?? "");
    return div.innerHTML.trim();
}

// Enhanced security: Sanitize phone number
function sanitizePhoneNumber(value) {
    return String(value ?? "").replace(/\D/g, "").slice(0, MAX_PHONE_LENGTH);
}

// Enhanced security: Sanitize image URL with strict validation
function sanitizeImageUrl(urlValue) {
    const rawUrl = Array.isArray(urlValue) ? urlValue[0] : urlValue;
    if (typeof rawUrl !== "string") {
        return null;
    }

    const trimmedUrl = rawUrl.trim();
    if (trimmedUrl === "" || !IMAGE_FILE_EXTENSION_REGEX.test(trimmedUrl)) {
        return null;
    }

    try {
        const normalizedUrl = trimmedUrl.startsWith("www.") ? `https://${trimmedUrl}` : trimmedUrl;
        const parsedUrl = new URL(normalizedUrl, window.location.href);

        // Only allow http and https protocols
        if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
            return null;
        }

        // Additional security: Check for suspicious patterns
        const suspiciousPatterns = [
            'javascript:',
            'data:',
            'vbscript:',
            'file:',
            'about:',
            '<script',
            'onerror=',
            'onload='
        ];
        
        const urlStr = parsedUrl.href.toLowerCase();
        if (suspiciousPatterns.some(pattern => urlStr.includes(pattern))) {
            return null;
        }

        return parsedUrl.href;
    } catch (error) {
        console.error('Invalid URL:', error);
        return null;
    }
}

function getMessagePreview(messageData) {
    if (!messageData) {
        return EMPTY_MESSAGES_TEXT;
    }

    if (messageData.type === "picture") {
        return "Photo";
    }

    if (messageData.type === "location") {
        return "Shared location";
    }

    const safeMessage = sanitizeText(messageData.message);
    if (safeMessage === "") {
        return EMPTY_MESSAGES_TEXT;
    }

    return safeMessage.length > 38 ? `${safeMessage.slice(0, 38)}…` : safeMessage;
}

// Set opened chat header - Vanilla JS
function setOpenedChatHeader(name, number) {
    const nameEl = document.querySelector(".whatsapp-openedchat-name");
    const numberEl = document.querySelector(".whatsapp-openedchat-number");
    if (nameEl) nameEl.textContent = name || "";
    if (numberEl) numberEl.textContent = number || "";
}

function createWhatsappEmptyState() {
    const emptyState = document.createElement("div");
    const icon = document.createElement("i");
    const title = document.createElement("div");
    const description = document.createElement("div");

    emptyState.className = "whatsapp-empty-state";
    icon.className = "fa-regular fa-comments";
    title.className = "whatsapp-empty-state-title";
    title.textContent = "No conversations yet";
    description.className = "whatsapp-empty-state-text";
    description.textContent = "Start a new message to see your chats here.";

    emptyState.appendChild(icon);
    emptyState.appendChild(title);
    emptyState.appendChild(description);
    return emptyState;
}

function createChatThreadEmptyState() {
    const emptyState = document.createElement("div");
    const title = document.createElement("div");
    const description = document.createElement("div");

    emptyState.className = "whatsapp-thread-empty-state";

    title.className = "whatsapp-thread-empty-title";
    title.textContent = "No messages yet";

    description.className = "whatsapp-thread-empty-text";
    description.textContent = "Send a message below to start this conversation.";

    emptyState.appendChild(title);
    emptyState.appendChild(description);
    return emptyState;
}

function getAvatarLabel(name, number) {
    const safeName = sanitizeText(name);
    const words = safeName.split(/\s+/).filter(Boolean);

    if (words.length >= 2) {
        return `${words[0][0]}${words[1][0]}`.toUpperCase();
    }

    if (words.length === 1 && words[0].length > 0) {
        return words[0].slice(0, 2).toUpperCase();
    }

    return String(number ?? "").slice(-2) || "DM";
}

function getAvatarGradient(label) {
    const palette = [
        ["#1D4ED8", "#2563EB"],
        ["#0F766E", "#0369A1"],
        ["#1E40AF", "#3B82F6"],
        ["#3730A3", "#1D4ED8"],
        ["#0F172A", "#1D4ED8"],
        ["#312E81", "#1E3A8A"]
    ];
    const seed = Array.from(label).reduce((total, char) => total + char.charCodeAt(0), 0);
    return palette[seed % palette.length];
}

function applyAvatarStyles(element, name, number) {
    if (!element) {
        return;
    }

    const label = getAvatarLabel(name, number);
    const [startColor, endColor] = getAvatarGradient(label);

    element.textContent = label;
    element.style.backgroundImage = `linear-gradient(135deg, ${startColor}, ${endColor})`;
    element.setAttribute("aria-label", sanitizeText(name) || formatPhoneNumber(number));
}

function createChatElement(chat, index) {
    const chatElement = document.createElement("div");
    const pictureElement = document.createElement("div");
    const nameElement = document.createElement("div");
    const nameParagraph = document.createElement("p");
    const metaElement = document.createElement("div");
    const lastMessageElement = document.createElement("div");
    const lastMessageParagraph = document.createElement("p");
    const lastMessageTimeElement = document.createElement("div");
    const lastMessageTimeParagraph = document.createElement("p");
    const unreadElement = document.createElement("div");
    const lastMessage = QB.Phone.Functions.GetLastMessage(chat.messages);
    const chatLabel = sanitizeText(chat.name);
    const displayName = chatLabel !== "" && chatLabel !== String(chat.number) ? chatLabel : formatPhoneNumber(chat.number);

    chatElement.className = "whatsapp-chat";
    chatElement.id = `whatsapp-chat-${index}`;

    pictureElement.className = "whatsapp-chat-picture";
    applyAvatarStyles(pictureElement, displayName, chat.number);

    nameElement.className = "whatsapp-chat-name";
    nameParagraph.textContent = displayName;
    nameElement.appendChild(nameParagraph);

    metaElement.className = "whatsapp-chat-meta";
    metaElement.textContent = formatPhoneNumber(chat.number);

    lastMessageElement.className = "whatsapp-chat-lastmessage";
    lastMessageParagraph.textContent = getMessagePreview(lastMessage);
    lastMessageElement.appendChild(lastMessageParagraph);

    lastMessageTimeElement.className = "whatsapp-chat-lastmessagetime";
    lastMessageTimeParagraph.textContent = lastMessage.time;
    lastMessageTimeElement.appendChild(lastMessageTimeParagraph);

    unreadElement.className = `whatsapp-chat-unreadmessages unread-chat-id-${index}`;
    if (chat.Unread > 0 && chat.Unread !== undefined && chat.Unread !== null) {
        unreadElement.textContent = chat.Unread;
        unreadElement.style.display = "block";
    } else {
        unreadElement.style.display = "none";
    }

    chatElement.appendChild(pictureElement);
    chatElement.appendChild(nameElement);
    chatElement.appendChild(metaElement);
    chatElement.appendChild(lastMessageElement);
    chatElement.appendChild(lastMessageTimeElement);
    chatElement.appendChild(unreadElement);

    // Store chat data using data attribute (vanilla JS alternative to jQuery.data)
    chatElement.dataset.chatdata = JSON.stringify(chat);
    return chatElement;
}

function createMessageElement(message, sender) {
    const wrapper = document.createDocumentFragment();
    const clearFix = document.createElement("div");
    let messageElement;
    let timeElement;

    if (message.type === "message") {
        messageElement = document.createElement("div");
        messageElement.className = `whatsapp-openedchat-message whatsapp-openedchat-message-${sender}`;
        messageElement.textContent = sanitizeText(message.message);

        timeElement = document.createElement("div");
        timeElement.className = "whatsapp-openedchat-message-time";
        timeElement.textContent = message.time || "";
        messageElement.appendChild(timeElement);
    } else if (message.type === "location") {
        messageElement = document.createElement("div");
        const label = document.createElement("span");
        const markerIcon = document.createElement("i");

        messageElement.className = `whatsapp-openedchat-message whatsapp-openedchat-message-${sender} whatsapp-shared-location`;
        messageElement.dataset.x = message.data.x;
        messageElement.dataset.y = message.data.y;

        label.style.fontSize = "1.2vh";
        markerIcon.className = "fas fa-map-marker-alt";
        markerIcon.style.fontSize = "1vh";
        label.appendChild(markerIcon);
        label.appendChild(document.createTextNode(" Location"));

        timeElement = document.createElement("div");
        timeElement.className = "whatsapp-openedchat-message-time";
        timeElement.textContent = message.time;

        messageElement.appendChild(label);
        messageElement.appendChild(timeElement);
    } else if (message.type === "picture") {
        const imageUrl = sanitizeImageUrl(message.data && message.data.url);
        if (!imageUrl) {
            return null;
        }

        messageElement = document.createElement("div");
        messageElement.className = `whatsapp-openedchat-message-test whatsapp-openedchat-message-test-${sender}`;
        messageElement.dataset.id = sanitizePhoneNumber(OpenedChatData.number);

        const image = document.createElement("img");
        image.className = "wppimage";
        image.src = imageUrl;
        image.alt = "Shared image";
        image.loading = "lazy";
        image.referrerPolicy = "no-referrer";

        messageElement.appendChild(image);

        timeElement = document.createElement("div");
        timeElement.className = "whatsapp-openedchat-message-time whatsapp-openedchat-message-time-image";
        timeElement.textContent = message.time || "";
        messageElement.appendChild(timeElement);
    }

    if (!messageElement) {
        return null;
    }

    clearFix.className = "clearfix";
    wrapper.appendChild(messageElement);
    wrapper.appendChild(clearFix);
    return wrapper;
}

function getDetectedImageUrl(message) {
    const detectedUrls = detectURLs(message);
    if (!detectedUrls || detectedUrls.length === 0) {
        return null;
    }

    return sanitizeImageUrl(detectedUrls[0]);
}

// Old jQuery event handlers removed - all replaced in setupEventListeners()

// Removed old jQuery event handlers - all replaced insetupEventListeners() above

QB.Phone.Functions.GetLastMessage = function(messages) {
    const lastMessageData = {
        time: "--:--",
        message: EMPTY_MESSAGES_TEXT
    };

    if (!Array.isArray(messages) || messages.length === 0) {
        return lastMessageData;
    }

    const lastGroup = messages[messages.length - 1];
    const lastGroupMessages = Array.isArray(lastGroup && lastGroup.messages) ? lastGroup.messages : [];
    const latestMessage = lastGroupMessages.length > 0 ? lastGroupMessages[lastGroupMessages.length - 1] : null;

    if (!latestMessage) {
        return lastMessageData;
    }

    lastMessageData.time = latestMessage.time || "--:--";
    lastMessageData.message = getMessagePreview(latestMessage);
    return lastMessageData;
}

GetCurrentDateKey = function() {
    const currentDate = new Date();
    const currentMonth = currentDate.getUTCMonth();
    const currentDOM = currentDate.getUTCDate();
    const currentYear = currentDate.getUTCFullYear();
    return `${currentDOM}-${currentMonth}-${currentYear}`;
}

QB.Phone.Functions.LoadWhatsappChats = function(chats) {
    const chatContainer = document.querySelector(".whatsapp-chats");
    if (!chatContainer) return;
    
    const fragment = document.createDocumentFragment();
    chatContainer.innerHTML = "";

    const chatArray = Array.isArray(chats) ? chats : (chats && typeof chats === 'object' ? Object.values(chats) : []);

    if (chatArray.length === 0) {
        chatContainer.appendChild(createWhatsappEmptyState());
        return;
    }

    chatArray.forEach((chat, i) => {
        fragment.appendChild(createChatElement(chat, i));
    });

    chatContainer.appendChild(fragment);
}

QB.Phone.Functions.ReloadWhatsappAlerts = function(chats) {
    if (!chats) return;
    
    const chatArray = Array.isArray(chats) ? chats : Object.values(chats);
    
    chatArray.forEach((chat, i) => {
        const unreadElement = document.querySelector(`.unread-chat-id-${i}`);
        if (unreadElement) {
            if (chat.Unread > 0 && chat.Unread !== undefined && chat.Unread !== null) {
                unreadElement.textContent = chat.Unread;
                unreadElement.style.display = "block";
            } else {
                unreadElement.style.display = "none";
            }
        }
    });
}

const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

FormatChatDate = function(date) {
    var TestDate = date.split("-");
    var NewDate = new Date((parseInt(TestDate[1]) + 1)+"-"+TestDate[0]+"-"+TestDate[2]);
const testDate = date.split("-");
    const newDate = new Date((parseInt(testDate[1]) + 1) + "-" + testDate[0] + "-" + testDate[2]);

    const currentMonth = monthNames[newDate.getUTCMonth()];
    const currentDOM = newDate.getUTCDate();
    const currentYear = newDate.getUTCFullYear();
    const curDateee = `${currentDOM}-${newDate.getUTCMonth()}-${currentYear}`;
    const chatDate = `${currentDOM} ${currentMonth} ${currentYear}`;
    const currentDate = GetCurrentDateKey();

    return currentDate === curDateee ? "Today" : chatDate;
}

FormatMessageTime = function() {
    const newDate = new Date();
    const hours = String(newDate.getUTCHours()).padStart(2, '0');
    const minutes = String(newDate.getUTCMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
}

// Removed old jQuery event handlers - all replaced in setupEventListeners()
// Keep this for reference

// Detect URLs in message
function detectURLs(message) {
    const urlRegex = /(((https?:\/\/)|(www\.))[^\s]+)/g;
    return message.match(urlRegex);
}

// Setup all event listeners - Vanilla JS
function setupEventListeners() {
    // New conversation button
    document.addEventListener('click', function(e) {
        if (e.target.matches('#whatsapp-newconvo-icon') || e.target.closest('#whatsapp-newconvo-icon')) {
            e.preventDefault();
            ClearInputNew();
            const newBox = document.getElementById('whatsapp-box-new-add-new');
            if (newBox) {
                newBox.style.display = 'block';
                newBox.style.opacity = '0';
                setTimeout(() => newBox.style.opacity = '1', 10);
            }
        }
    });
    
    // Chat click handler
    document.addEventListener('click', function(e) {
        const chatElement = e.target.closest('.whatsapp-chat');
        if (chatElement) {
            e.preventDefault();
            
            try {
                const chatData = JSON.parse(chatElement.dataset.chatdata);
                QB.Phone.Functions.SetupChatMessages(chatData);
                
                postNUI('ClearAlerts', { number: chatData.number });
                
                // Show opened chat with animation
                const openedChat = document.querySelector('.whatsapp-openedchat');
                const chatsList = document.querySelector('.whatsapp-chats');
                
                if (openedChat && chatsList) {
                    openedChat.style.display = 'block';
                    smoothSlideLeft(openedChat, 0, 200);
                    smoothSlideLeft(chatsList, 30, 200, () => {
                        chatsList.style.display = 'none';
                    });
                }
                
                // Scroll to bottom
                const messagesContainer = document.querySelector('.whatsapp-openedchat-messages');
                if (messagesContainer) {
                    setTimeout(() => {
                        messagesContainer.scrollTop = messagesContainer.scrollHeight;
                    }, 150);
                }
            } catch (error) {
                console.error('Error opening chat:', error);
            }
        }
    });
    
    // Back button handler
    document.addEventListener('click', function(e) {
        if (e.target.matches('#whatsapp-openedchat-back') || e.target.closest('#whatsapp-openedchat-back')) {
            e.preventDefault();
            
            postNUI('GetWhatsappChats', {})
                .then(readNuiJson)
                .then(chats => {
                    if (chats) {
                        QB.Phone.Functions.LoadWhatsappChats(chats);
                    }
                })
                .catch(err => console.error('Error loading chats:', err));
            
            MessageState.currentChatNumber = null;
            if (typeof OpenedChatData !== 'undefined') {
                OpenedChatData.number = null;
            }
            
            const openedChat = document.querySelector('.whatsapp-openedchat');
            const chatsList = document.querySelector('.whatsapp-chats');
            
            if (openedChat && chatsList) {
                chatsList.style.display = 'block';
                smoothSlideLeft(chatsList, 0, 200);
                smoothSlideLeft(openedChat, -30, 200, () => {
                    openedChat.style.display = 'none';
                });
            }
            
            MessageState.openedChatPicture = null;
        }
    });
    
    // Message input keydown handler
    document.addEventListener('keydown', function(e) {
        if (e.target.matches('#whatsapp-openedchat-message')) {
            handleWhatsappComposerEnter(e);
        }
    });
    
    // Send message button
    document.addEventListener('click', function(e) {
        if (e.target.matches('#whatsapp-openedchat-send') || e.target.closest('#whatsapp-openedchat-send')) {
            e.preventDefault();
            
            const message = getWhatsappComposerValue();
            const imageUrl = getDetectedImageUrl(message);
            const newMessage = sanitizeText(imageUrl ? message.replace(/(?:https?|ftp):\/\/[\n\S]+/g, '') : message).slice(0, MAX_MESSAGE_LENGTH);
            
            if (!OpenedChatData.number) {
                return;
            }
            
            if (newMessage !== "" || imageUrl !== null) {
                showConfirmationFrame();
            }
            
            if (newMessage !== "") {
                postNUI('SendMessage', {
                    ChatNumber: OpenedChatData.number,
                    ChatDate: GetCurrentDateKey(),
                    ChatMessage: newMessage,
                    ChatTime: FormatMessageTime(),
                    ChatType: "message"
                });
            }
            
            if (imageUrl !== null) {
                postNUI('SendMessage', {
                    ChatNumber: OpenedChatData.number,
                    ChatDate: GetCurrentDateKey(),
                    ChatMessage: null,
                    ChatTime: FormatMessageTime(),
                    ChatType: "picture",
                    url: imageUrl
                });
            }
            
            clearWhatsappComposer();
        }
    });
    
    // Save new message button
    document.addEventListener('click', function(e) {
        if (e.target.matches('#whatsapp-save-note-for-doc') || e.target.closest('#whatsapp-save-note-for-doc')) {
            e.preventDefault();
            
            const messageInput = document.querySelector(".whatsapp-input-message");
            const numberInput = document.querySelector(".whatsapp-input-number");
            
            if (!messageInput || !numberInput) return;
            
            const message = sanitizeText(messageInput.value).slice(0, MAX_MESSAGE_LENGTH);
            const number = sanitizePhoneNumber(numberInput.value);
            
            if (message !== "" && number !== "") {
                postNUI('SendMessage', {
                    ChatNumber: number,
                    ChatDate: GetCurrentDateKey(),
                    ChatMessage: message,
                    ChatTime: FormatMessageTime(),
                    ChatType: "message"
                });
                
                ClearInputNew();
                messageInput.value = "";
                numberInput.value = "";
                
                const newBox = document.getElementById('whatsapp-box-new-add-new');
                if (newBox) {
                    newBox.style.opacity = '0';
                    setTimeout(() => newBox.style.display = 'none', 350);
                }
                
                postNUI('GetWhatsappChats', {})
                    .then(readNuiJson)
                    .then(chats => {
                        if (chats) {
                            QB.Phone.Functions.LoadWhatsappChats(chats);
                        }
                    })
                    .catch(err => console.error('Error loading chats:', err));
            } else {
                if (typeof QB !== 'undefined' && QB.Phone && QB.Phone.Notifications) {
                    QB.Phone.Notifications.Add("fas fa-comment", "Messages", "You can't send an empty message!", "#25D366", 1750);
                }
            }
        }
    });
    
    // Call button handler
    document.addEventListener('click', function(e) {
        if (e.target.matches('#whatsapp-openedchat-call') || e.target.closest('#whatsapp-openedchat-call')) {
            e.preventDefault();
            
            const inputNum = OpenedChatData.number;
            if (!inputNum) return;
            
            const cData = {
                number: inputNum,
                name: inputNum
            };
            
            postNUI('CallContact', {
                ContactData: cData,
                Anonymous: QB.Phone.Data.AnonymousCall
            })
            .then(readNuiJson)
            .then(status => {
                if (!status) {
                    return;
                }

                if (cData.number !== QB.Phone.Data.PlayerData.charinfo.phone) {
                    if (status.IsOnline) {
                        if (status.CanCall) {
                            if (!status.InCall) {
                                const phoneNewBox = document.querySelector('.phone-new-box-body');
                                if (phoneNewBox) phoneNewBox.style.display = 'none';
                                
                                ClearInputNew();
                                
                                const outgoing = document.querySelector('.phone-call-outgoing');
                                const incoming = document.querySelector('.phone-call-incoming');
                                const ongoing = document.querySelector('.phone-call-ongoing');
                                const caller = document.querySelector('.phone-call-outgoing-caller');
                                
                                if (outgoing) outgoing.style.display = 'block';
                                if (incoming) incoming.style.display = 'none';
                                if (ongoing) ongoing.style.display = 'none';
                                if (caller) caller.textContent = cData.name;
                                
                                QB.Phone.Functions.HeaderTextColor("white", 400);
                                QB.Phone.Animations.TopSlideUp('.phone-application-container', 250, -100);
                                QB.Phone.Animations.TopSlideUp('.' + QB.Phone.Data.currentApplication + "-app", 400, -100);
                                
                                setTimeout(function() {
                                    QB.Phone.Functions.ToggleApp(QB.Phone.Data.currentApplication, "none");
                                    QB.Phone.Animations.TopSlideDown('.phone-application-container', 400, 0);
                                    QB.Phone.Functions.ToggleApp("phone-call", "block");
                                }, 450);
                                
                                if (typeof CallData !== 'undefined') {
                                    CallData.name = cData.name;
                                    CallData.number = cData.number;
                                }
                                
                                QB.Phone.Data.currentApplication = "phone-call";
                            } else {
                                QB.Phone.Notifications.Add("fas fa-phone", "Phone", "You're already in a call!");
                            }
                        } else {
                            QB.Phone.Notifications.Add("fas fa-phone", "Phone", "This person is busy!");
                        }
                    } else {
                        QB.Phone.Notifications.Add("fas fa-phone", "Phone", "This person is not available!");
                    }
                } else {
                    QB.Phone.Notifications.Add("fas fa-phone", "Phone", "You can't call yourself!");
                }
            })
            .catch(err => console.error('Error calling contact:', err));
        }
    });
    
    // Image click handler
    document.addEventListener('click', function(e) {
        if (e.target.matches('.wppimage')) {
            e.preventDefault();
            const source = e.target.getAttribute('src');
            if (source && typeof QB !== 'undefined' && QB.Screen) {
                QB.Screen.popUp(source);
            }
        }
    });
}

// Smooth slide animation helper
function smoothSlideLeft(element, targetVh, duration, callback) {
    if (!element) return;
    
    element.style.transition = `left ${duration}ms ease-in-out`;
    element.style.left = `${targetVh}vh`;
    
    if (callback) {
        setTimeout(callback, duration);
    }
}

// Show confirmation feedback
function showConfirmationFrame() {
    const feedback = document.querySelector('.phone-action-feedback');
    if (!feedback) return;
    
    const loading = feedback.querySelector('.feedback-content.loading');
    const success = feedback.querySelector('.feedback-content.success');
    
    feedback.style.display = 'flex';
    feedback.style.opacity = '0';
    
    if (loading) loading.style.display = 'block';
    if (success) success.style.display = 'none';
    
    setTimeout(() => feedback.style.opacity = '1', 10);
    
    setTimeout(function() {
        if (loading) loading.style.display = 'none';
        if (success) {
            success.style.display = 'block';
            success.style.opacity = '0';
            setTimeout(() => success.style.opacity = '1', 10);
        }
        
        setTimeout(function() {
            feedback.style.opacity = '0';
            setTimeout(() => feedback.style.display = 'none', 200);
        }, 1500);
    }, 1500);
}

QB.Phone.Functions.SetupChatMessages = function(cData, NewChatData) {
    if (cData) {
        const formattedNumber = formatPhoneNumber(cData.number);
        const safeChatName = sanitizeText(cData.name);
        
        if (typeof OpenedChatData !== 'undefined') {
            OpenedChatData.number = cData.number;
        }
        MessageState.currentChatNumber = cData.number;

        const openedChatPicture = document.querySelector(".whatsapp-openedchat-picture");
        applyAvatarStyles(openedChatPicture, safeChatName || formattedNumber, cData.number);

        if (safeChatName !== "" && safeChatName !== String(cData.number)) {
            setOpenedChatHeader(safeChatName, formattedNumber);
        } else {
            setOpenedChatHeader(formattedNumber, "");
        }

        const messageContainer = document.querySelector(".whatsapp-openedchat-messages");
        if (!messageContainer) return;
        
        const messageFragment = document.createDocumentFragment();
        messageContainer.innerHTML = "";

        if (!Array.isArray(cData.messages) || cData.messages.length === 0) {
            messageFragment.appendChild(createChatThreadEmptyState());
        } else {
            cData.messages.forEach((chat, i) => {
                const chatDate = FormatChatDate(chat.date);
                const chatGroup = document.createElement("div");
                const chatDateEl = document.createElement("div");
                
                chatGroup.className = `whatsapp-openedchat-messages-${i} unique-chat`;
                chatDateEl.className = "whatsapp-openedchat-date";
                chatDateEl.textContent = chatDate;
                chatGroup.appendChild(chatDateEl);

                if (Array.isArray(chat.messages)) {
                    chat.messages.forEach((message) => {
                        let sender = "me";
                        if (message.sender !== QB.Phone.Data.PlayerData.citizenid) {
                            sender = "other";
                        }
                        const messageElement = createMessageElement(message, sender);
                        if (messageElement) {
                            chatGroup.appendChild(messageElement);
                        }
                    });
                }

                messageFragment.appendChild(chatGroup);
            });
        }
        
        messageContainer.appendChild(messageFragment);
        
        // Scroll to bottom
        setTimeout(() => {
            messageContainer.scrollTop = messageContainer.scrollHeight;
        }, 10);
    } else if (NewChatData) {
        if (typeof OpenedChatData !== 'undefined') {
            OpenedChatData.number = NewChatData.number;
        }
        MessageState.currentChatNumber = NewChatData.number;
        
        const safeChatName = sanitizeText(NewChatData.name);
        const formattedNumber = NewChatData.number ? formatPhoneNumber(NewChatData.number) : "";

        const openedChatPicture = document.querySelector(".whatsapp-openedchat-picture");
        applyAvatarStyles(openedChatPicture, safeChatName || formattedNumber, NewChatData.number);

        if (isNaN(NewChatData.name)) {
            setOpenedChatHeader(safeChatName, formattedNumber);
        } else {
            setOpenedChatHeader(formattedNumber || sanitizeText(NewChatData.name), "");
        }
        
        const messageContainer = document.querySelector(".whatsapp-openedchat-messages");
        if (messageContainer) {
            messageContainer.innerHTML = "";
            const dateString = GetCurrentDateKey();
            const emptyState = document.createElement('div');
            emptyState.className = `whatsapp-openedchat-messages-${dateString} unique-chat`;
            emptyState.innerHTML = `
                <div class="whatsapp-openedchat-date">TODAY</div>
                <div class="whatsapp-thread-empty-state">
                    <div class="whatsapp-thread-empty-title">No messages yet</div>
                    <div class="whatsapp-thread-empty-text">Send a message below to start this conversation.</div>
                </div>
            `;
            messageContainer.appendChild(emptyState);
        }
    }

    // Scroll to bottom
    const messageContainer = document.querySelector('.whatsapp-openedchat-messages');
    if (messageContainer) {
        setTimeout(() => {
            messageContainer.scrollTop = messageContainer.scrollHeight;
        }, 10);
    }
}

// Image popup handler (vanilla JS event delegation)
// Handles clicks on images within messages to show full-size popup
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('wppimage')) {
        e.preventDefault();
        const source = e.target.getAttribute('src');
        QB.Screen.popUp(source);
    }
});
