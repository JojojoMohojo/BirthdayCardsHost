'use strict';

// ── Players ───────────────────────────────────────────────────────────────────
// Edit this list before the night. No limit on names — chips wrap onto multiple rows.

const PLAYERS = ['Joe', 'Liam', 'Monty', 'Hannah', 'Tom', 'Player 7', 'Player 8', 'Player 9', 'Player 10', 'Player 11', 'Player 12', 'Player 13', 'Player 14', 'Player 15'];

// ── Card suits (assigned per card number for corner pips) ─────────────────────

const SUITS = ['♠', '♥', '♣', '♦'];
function suitForCard(num) {
    if (typeof num !== 'number') return '★';
    return SUITS[(num - 1) % SUITS.length];
}

// ── Timer types ───────────────────────────────────────────────────────────────
// SHORT  → 15s countdown shown inline on the card, disappears when done
// LONG   → background timer shown in the tray, stays until dismissed
// NONE   → no timer

const TIMER = { NONE: 'none', SHORT: 'short', LONG: 'long' };

// ── Helpers ───────────────────────────────────────────────────────────────────

function randomIndex(arr) {
    return Math.floor(Math.random() * arr.length);
}

function randomOrdinal(min, max) {
    const suffixes = { 1: '1st', 2: '2nd', 3: '3rd' };
    const n = Math.floor(Math.random() * (max - min + 1)) + min;
    return suffixes[n] || n + 'th';
}

function formatTime(seconds) {
    if (seconds >= 60) {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return s === 0 ? `${m}m` : `${m}m ${s}s`;
    }
    return `${seconds}s`;
}

// ── Storage ───────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'birthdayDeckState';
const HISTORY_KEY = 'birthdayHistory';

function saveState(deck) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(deck)); } catch (e) {}
}

function loadState() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) return JSON.parse(raw);
    } catch (e) {}
    return null;
}

function clearState() {
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
}

function saveHistory(history) {
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(history)); } catch (e) {}
}

function loadHistory() {
    try {
        const raw = localStorage.getItem(HISTORY_KEY);
        if (raw) return JSON.parse(raw);
    } catch (e) {}
    return [];
}

function clearHistory() {
    try { localStorage.removeItem(HISTORY_KEY); } catch (e) {}
}

// ── Card Definitions ──────────────────────────────────────────────────────────

const DEFAULT_CARDS = [
    { number: 1,  timer: TIMER.NONE,  title: "It's not 11 o'clock yet!", text: "Tom is still working overtime and can't drink. Everyone down his drink for him so he can focus on work" },
    { number: 2,  timer: TIMER.NONE,  title: "The Classic Attire", text: "He never leaves the house without it. You have to wear Tom's hawaiian shirt. Or take a shot of spirit" },
    { number: 3,  timer: TIMER.NONE,  title: "Hannah's Quiz Time", text: "Hannah asks a question about Tom. If you get it wrong, someone else can answer — then you have to down half your drink" },
    { number: 4,  timer: TIMER.NONE,  title: "Big Man's Choice", text: "You and Tom decide the next drink everyone has to order at the next pub" },
    { number: 5,  timer: TIMER.SHORT, title: "Who's That Pokémon?", textFn: () => `You must pretend to be a Pokémon from the ${randomOrdinal(1, 3)} generation so Tom can guess. If Tom can't guess correctly within 15 seconds, Tom must draw the Pokémon onto your arm` },
    { number: 6,  timer: TIMER.NONE,  title: "Guitar Hero Pro", text: "Tom loves to belt out some tunes on the Wii. Let the group record a new ringtone for you and leave your phone on loudspeaker for the rest of the night — or down your drink and someone else's" },
    { number: 7,  timer: TIMER.NONE,  title: "You Gotta Open That Case Boy", text: "You just opened a CS2 case, but since it's Tom's birthday he deserves a reward. Transfer Tom a skin from your inventory. (If you don't play CS2, buy Tom a drink)" },
    { number: 8,  timer: TIMER.NONE,  title: "Squirtle Squirtle!", text: "You little squirtle. Neck a pint of water in one go or take a shot" },
    { number: 9,  timer: TIMER.NONE,  title: "Chance Time!", text: "You landed on a Chance Time space. Swap everyone's drinks around — you choose who gets what" },
    { number: 10, timer: TIMER.NONE,  title: "In the Doghouse", text: "You've drank too much and are snoring loudly. Hannah is making you sleep on the sofa tonight. You have to finish your drink at a table by yourself" },
    { number: 11, timer: TIMER.NONE,  title: "Back in Action", text: "Just like Tom, your legs are now stronger than ever! Choose someone to carry to the next pub. They cannot have been picked before" },
    { number: 12, timer: TIMER.NONE,  title: "Epic Gamer Moment", text: "You are an epic gamer my guy. You must wear the gamer shirt until someone else draws this card or decides to wear it themselves. If you decline, take a shot of spirit. (You are NOT allowed to say the gamer word)" },
    { number: 13, timer: TIMER.NONE,  title: "Super Smash Bros.", text: "It's a game of categories, but the only category allowed is Super Smash Bros characters. You start. Loser takes 3 drinks" },
    { number: 14, timer: TIMER.NONE,  title: "Drink for the Fallen", text: "Take a drink for each person who has gone home. If no one has left yet, down your drink as a toast in advance" },
    { number: 15, timer: TIMER.NONE,  title: "Strong Bones!", text: "Don't end up like Tom with rickets. Drink a glass of milk, and you must finish it before you can return to your drink" },
    { number: 16, timer: TIMER.NONE,  title: "No. 5 Large", text: "Tom has gotten too drunk. Perk him up with the saviour food, Mr Cod. (Or similar if not possible)" },
    { number: 17, timer: TIMER.NONE,  title: "Liam's Round", text: "Liam is buying your next drink but has forgotten your order. Drink whatever he brings back for you. (Liam does not have to pay for you unless he's feeling nice)" },
    { number: 18, timer: TIMER.NONE,  title: "Tommy Says", text: "The group must only drink with their non-dominant hand for this pub. Anyone caught out takes a drink. (With their non-dominant hand, you mug)" },
    { number: 19, timer: TIMER.LONG,  timerSeconds: 300, timerLabel: "5 min eyes rule", title: "Sleeping with Both Eyes Open", text: "You drank so much last night you slept with your eyes open, now they're all sticky and bloodshot. Anyone who looks you in the eyes for the next 5 minutes must take a drink" },
    { number: 20, timer: TIMER.NONE,  title: "Here's My Spout", text: "Top up Tom's drink with your own, acting like a teapot" },
    { number: 21, timer: TIMER.NONE,  title: "Well That's Written Off...", text: "Tom just hit ANOTHER deer on the road and now his car is totalled. He must buy you a drink as thanks for driving him around" },
    { number: 22, timer: TIMER.NONE,  title: "Rawr xD", text: "No one really understood secondary school emo Tom, but you can feel a little closer to how he felt if you don the wig and sing/shout 'Can you feel my heart'" },
    { number: 23, timer: TIMER.SHORT, title: "Absolute Bullshit", text: "It's time for a Mario Party mini-game! Give your best impression of a Mario Party character and Tom has to guess. If Tom can't guess correctly within 15 seconds, you must both take 3 drinks" },
    { number: 24, timer: TIMER.NONE,  title: "Monttttyyyyyy!", text: "Monty burnt a penis into the roof of Tom's car, now he's drawing one on you. Let Monty draw a penis onto a place of your choosing. (Must be visible)" },
    { number: 25, timer: TIMER.NONE,  title: "Horses Don't Have Hands!", text: "Tom is a horse. Horses don't have hands. Feed Tom the rest of his drink" },
    { number: 26, timer: TIMER.NONE,  title: "Bloody Bastard", text: "You tried to give Tom birthday beats, but you've realised you're Ed Brown! Tom gets to give you 26 birthday beats" },
    { number: 27, timer: TIMER.NONE,  title: "Pokémon Trivia", text: "Ask Tom a question about Pokémon. If he gets it right, you have to buy him his favourite drink. If he gets it wrong, you can buy him any drink" },
    { number: 28, timer: TIMER.NONE,  title: "Back at BCOT", text: "Tom used to love his white chocolate Starbucks at college. Order and drink a white mocha from the bar. If you can't get one, order and drink a black coffee — Tom loves those now" },
    { number: 29, timer: TIMER.NONE,  title: "Pummel Party", text: "You picked up an Arcade Challenge! Challenge someone to a game of pong. Loser buys the winner a drink. (Joe has the app on his phone)" },
    { number: 30, timer: TIMER.NONE,  title: "Short Shorts", text: "Tom wore his tight chino shorts out and has ripped them, revealing his bussy. Poke him in the arse quick!" },
    { number: 31, timer: TIMER.NONE,  title: "Blue Moon!", text: "Tom has finally shown up on Discord! What a treat! Buy yourself a Blue Moon or a Blue Lagoon to drink" },
    { number: 32, timer: TIMER.NONE,  title: "5v5", text: "Challenge the person sat closest opposite you to Rock, Paper, Scissors. Loser downs their drink. Best of 3" },
    { number: 33, timer: TIMER.NONE,  title: "Tom's Favourite Meme", text: "Keep your toddlers on a leash! Go ask for 'The Pitbull of Drinks' at the bar and enjoy it" },
    { number: 34, timer: TIMER.NONE,  title: "Butt Text, Sorry!", text: "Tom sat on your phone and somehow managed to send a text on it. Tom is allowed to send one text to anyone on your phone (excluding work and parents). If you refuse, take a shot" }
];

// ── State ─────────────────────────────────────────────────────────────────────

let deck    = [];
let lastCard  = null;   // { cardDef, resolvedText, assignee }
let history   = [];     // [{ cardDef, resolvedText, assignee }, ...]  newest first
let activeLongTimers = []; // [{ id, label, remaining, intervalId }, ...]
let shortTimerInterval = null;

// ── Init ──────────────────────────────────────────────────────────────────────

function init() {
    buildNameChips();
    const saved = loadState();
    deck    = saved !== null ? saved : [...DEFAULT_CARDS];
    history = loadHistory();
    updateCounter();
    updateHistoryBtn();
}

// ── Counter ───────────────────────────────────────────────────────────────────

function updateCounter() {
    document.getElementById('remainingCards').textContent = deck.length;
    document.getElementById('totalCards').textContent     = '/' + DEFAULT_CARDS.length;
}

// ── Reset ─────────────────────────────────────────────────────────────────────

function resetAll() {
    clearState();
    clearHistory();
    deck    = [...DEFAULT_CARDS];
    history = [];
    lastCard  = null;
    activeLongTimers.forEach(t => clearInterval(t.intervalId));
    activeLongTimers = [];
    renderTimerTray();
    updateCounter();
    updateHistoryBtn();
    // Restore draw button in case it was in reset mode
    const drawBtn = document.getElementById('draw');
    drawBtn.disabled = false;
    drawBtn.textContent = 'Draw Card';
    drawBtn.dataset.mode = '';
    showRules();
}

// ── Name picker ───────────────────────────────────────────────────────────────

function buildNameChips() {
    const container = document.getElementById('name-picker-btns');
    container.innerHTML = '';
    PLAYERS.forEach(name => {
        const btn = document.createElement('button');
        btn.className = 'name-chip';
        btn.textContent = name;
        btn.addEventListener('click', () => selectPlayer(name));
        container.appendChild(btn);
    });
}

function selectPlayer(name) {
    if (!lastCard) return;
    lastCard.assignee = name;

    // Update history entry for this card
    const existing = history.find(h => h === lastCard);
    if (!existing) history.unshift(lastCard);
    else existing.assignee = name;
    saveHistory(history);
    updateHistoryBtn();

    // Update UI
    document.querySelectorAll('.name-chip').forEach(c =>
        c.classList.toggle('selected', c.textContent === name)
    );
    document.getElementById('name-picker').classList.add('hidden');
    const assignee = document.getElementById('card-assignee');
    assignee.textContent = name;
    assignee.classList.remove('hidden');
}

function skipPlayer() {
    document.getElementById('name-picker').classList.add('hidden');
}

// ── Card rendering ────────────────────────────────────────────────────────────

function resolveCardText(cardDef) {
    return cardDef.textFn ? cardDef.textFn() : cardDef.text;
}

function renderCard(entry, animate) {
    const { cardDef, resolvedText, assignee } = entry;

    // Pip corners
    const pipNum  = typeof cardDef.number === 'number' ? String(cardDef.number) : '?';
    const pipSuit = suitForCard(cardDef.number);
    ['pip-tl-num', 'pip-br-num'].forEach(id => document.getElementById(id).textContent = pipNum);
    ['pip-tl-suit', 'pip-br-suit'].forEach(id => document.getElementById(id).textContent = pipSuit);

    document.getElementById('CardTitle').textContent  = cardDef.title;
    document.getElementById('CardText').textContent   = resolvedText;

    // Assignee
    const assigneeEl = document.getElementById('card-assignee');
    if (assignee) {
        assigneeEl.textContent = assignee;
        assigneeEl.classList.remove('hidden');
        document.getElementById('name-picker').classList.add('hidden');
    } else {
        assigneeEl.classList.add('hidden');
        // Show name picker only when this is the live current card (not back-nav)
        const isNew = entry === lastCard && !assignee;
        document.getElementById('name-picker').classList.toggle('hidden', !isNew);
        document.querySelectorAll('.name-chip').forEach(c => c.classList.remove('selected'));
    }

    // Short timer
    resetShortTimer();
    const cardTimerEl = document.getElementById('card-timer');
    if (cardDef.timer === TIMER.SHORT) {
        cardTimerEl.classList.remove('hidden');
        document.getElementById('card-timer-display').classList.add('hidden');
        document.getElementById('card-timer-start').disabled = false;
    } else {
        cardTimerEl.classList.add('hidden');
    }

    // Long timer button
    const longWrap = document.getElementById('long-timer-wrap');
    const longBtn  = document.getElementById('long-timer-start');
    if (cardDef.timer === TIMER.LONG) {
        longWrap.classList.remove('hidden');
        document.getElementById('long-timer-label').textContent =
            `Start ${formatTime(cardDef.timerSeconds)} timer`;
        const alreadyRunning = activeLongTimers.some(t => t.cardNumber === cardDef.number);
        longBtn.disabled = alreadyRunning;
        longBtn.textContent = ''; // reset
        const icon = document.createElementNS ? null : null;
        longBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><polygon points="5,3 19,12 5,21"/></svg> <span>${alreadyRunning ? 'Timer running' : 'Start ' + formatTime(cardDef.timerSeconds) + ' timer'}</span>`;
    } else {
        longWrap.classList.add('hidden');
    }

    // Panel visibility + animation
    const panel = document.getElementById('card-panel');
    if (animate) {
        panel.classList.add('hidden');
        void panel.offsetWidth;
    }
    panel.classList.remove('hidden');

    document.getElementById('rules-panel').classList.add('hidden');
    document.getElementById('rules-toggle').classList.remove('hidden');
    document.getElementById('back-to-card').classList.add('hidden');
}

// ── Short timer ───────────────────────────────────────────────────────────────

const SHORT_DURATION = 15;

function resetShortTimer() {
    if (shortTimerInterval) {
        clearInterval(shortTimerInterval);
        shortTimerInterval = null;
    }
}

function startShortTimer() {
    const startBtn    = document.getElementById('card-timer-start');
    const displayEl   = document.getElementById('card-timer-display');
    const countEl     = document.getElementById('card-timer-count');
    const ringEl      = document.getElementById('ring-progress');
    const circumference = 100;

    startBtn.disabled = true;
    displayEl.classList.remove('hidden');

    let remaining = SHORT_DURATION;
    countEl.textContent = remaining;
    ringEl.style.strokeDashoffset = 0;
    countEl.classList.remove('urgent');
    ringEl.classList.remove('urgent');

    shortTimerInterval = setInterval(() => {
        remaining--;
        countEl.textContent = remaining;
        const offset = circumference * (1 - remaining / SHORT_DURATION);
        ringEl.style.strokeDashoffset = offset;

        if (remaining <= 5) {
            countEl.classList.add('urgent');
            ringEl.classList.add('urgent');
        }

        if (remaining <= 0) {
            clearInterval(shortTimerInterval);
            shortTimerInterval = null;
            countEl.textContent = '✓';
            try { navigator.vibrate([80, 60, 80]); } catch (e) {}
        }
    }, 1000);
}

// ── Long timers ───────────────────────────────────────────────────────────────

let longTimerIdCounter = 0;

function startLongTimer(cardDef) {
    const id = ++longTimerIdCounter;
    const timer = {
        id,
        cardNumber: cardDef.number,
        label: cardDef.timerLabel || cardDef.title,
        cardTitle: cardDef.title,
        remaining: cardDef.timerSeconds,
        intervalId: null
    };

    timer.intervalId = setInterval(() => {
        timer.remaining--;
        if (timer.remaining <= 0) {
            clearInterval(timer.intervalId);
            try { navigator.vibrate([100, 80, 100, 80, 100]); } catch (e) {}
            // Mark done but keep visible for 5s then remove
            updateTimerTrayItem(timer, true);
            setTimeout(() => {
                activeLongTimers = activeLongTimers.filter(t => t.id !== id);
                renderTimerTray();
            }, 5000);
            return;
        }
        updateTimerTrayItem(timer, false);
    }, 1000);

    activeLongTimers.push(timer);
    renderTimerTray();

    // Disable the start button on the current card if it matches
    if (lastCard && lastCard.cardDef.number === cardDef.number) {
        const btn = document.getElementById('long-timer-start');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><polygon points="5,3 19,12 5,21"/></svg> <span>Timer running</span>`;
        }
    }
}

function dismissLongTimer(id) {
    const t = activeLongTimers.find(t => t.id === id);
    if (t) clearInterval(t.intervalId);
    activeLongTimers = activeLongTimers.filter(t => t.id !== id);
    renderTimerTray();
}

function renderTimerTray() {
    const tray = document.getElementById('timer-tray');
    const list = document.getElementById('timer-tray-list');

    if (activeLongTimers.length === 0) {
        tray.classList.add('hidden');
        return;
    }

    tray.classList.remove('hidden');
    list.innerHTML = '';
    activeLongTimers.forEach(t => {
        const el = document.createElement('div');
        el.className = 'tray-timer';
        el.id = 'tray-timer-' + t.id;
        el.innerHTML = timerTrayItemHTML(t, false);
        list.appendChild(el);
    });
}

function updateTimerTrayItem(timer, done) {
    const el = document.getElementById('tray-timer-' + timer.id);
    if (!el) return;
    el.innerHTML = timerTrayItemHTML(timer, done);
}

function timerTrayItemHTML(timer, done) {
    const urgent = timer.remaining <= 30 && !done;
    const display = done ? 'Done!' : formatTime(timer.remaining);
    return `
        <div class="tray-timer-info">
            <div class="tray-timer-name">${timer.label}</div>
            <div class="tray-timer-sub">${timer.cardTitle}</div>
        </div>
        <div class="tray-timer-right">
            <div class="tray-timer-count${urgent ? ' urgent' : ''}">${display}</div>
            <button class="tray-timer-dismiss" onclick="dismissLongTimer(${timer.id})" aria-label="Dismiss timer">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
            </button>
        </div>
    `;
}

// ── View management ───────────────────────────────────────────────────────────

function showRules() {
    document.getElementById('rules-panel').classList.remove('hidden');
    document.getElementById('card-panel').classList.add('hidden');
    document.getElementById('rules-toggle').classList.add('hidden');
    document.getElementById('back-to-card').classList.toggle('hidden', !lastCard);
}

// ── History ───────────────────────────────────────────────────────────────────

function updateHistoryBtn() {
    const btn = document.getElementById('history-btn');
    btn.classList.toggle('hidden', history.length === 0);
}

function openHistory() {
    const list = document.getElementById('history-list');
    list.innerHTML = '';
    if (history.length === 0) {
        list.innerHTML = '<div class="history-empty">No cards drawn yet.</div>';
    } else {
        history.forEach((entry, i) => {
            const el = document.createElement('div');
            el.className = 'history-item';
            el.innerHTML = `
                <div class="history-num">#${entry.cardDef.number}</div>
                <div class="history-info">
                    <div class="history-card-title">${entry.cardDef.title}</div>
                    <div class="history-card-player">${entry.assignee || 'Unassigned'}</div>
                </div>
            `;
            list.appendChild(el);
        });
    }
    document.getElementById('history-overlay').classList.remove('hidden');
}

// ── Draw button countdown ─────────────────────────────────────────────────────

function startDrawCooldown(btn) {
    const COOLDOWN = 5;
    let remaining = COOLDOWN;
    btn.disabled = true;
    btn.textContent = `Draw Card (${remaining}s)`;
    const iv = setInterval(() => {
        remaining--;
        if (remaining <= 0) {
            clearInterval(iv);
            btn.disabled = false;
            btn.textContent = 'Draw Card';
        } else {
            btn.textContent = `Draw Card (${remaining}s)`;
        }
    }, 1000);
}

// ── Event listeners ───────────────────────────────────────────────────────────

document.getElementById('draw').addEventListener('click', function () {
    // Guard: ignore if this is acting as a reset button mid-click
    if (this.dataset.mode === 'reset') {
        resetAll();
        this.dataset.mode = '';
        this.textContent = 'Draw Card';
        return;
    }

    let cardDef;
    let isDeckEmpty = false;
    if (deck.length === 0) {
        isDeckEmpty = true;
        cardDef = { number: '??', timer: TIMER.NONE, title: 'Out of Cards', text: "The deck is empty. You get a free pass while it's reloaded." };
    } else {
        const idx = randomIndex(deck);
        cardDef = deck[idx];
        deck.splice(idx, 1);
        saveState(deck);
    }

    // Resolve text immediately and synchronously before storing
    const resolvedText = resolveCardText(cardDef);
    const entry = { cardDef, resolvedText, assignee: null };
    lastCard = entry;

    if (!isDeckEmpty) {
        history.unshift(entry);
        saveHistory(history);
        updateHistoryBtn();
    }

    updateCounter();
    renderCard(entry, true);

    if (isDeckEmpty) {
        // Swap draw button to instant reset
        this.textContent = 'Reload Deck';
        this.dataset.mode = 'reset';
    } else {
        startDrawCooldown(this);
    }

    try { navigator.vibrate(40); } catch (e) {}
});

document.getElementById('rules-toggle').addEventListener('click', showRules);

document.getElementById('back-to-card').addEventListener('click', () => {
    if (lastCard) renderCard(lastCard, false);
});

document.getElementById('card-timer-start').addEventListener('click', startShortTimer);

document.getElementById('long-timer-start').addEventListener('click', () => {
    if (lastCard && lastCard.cardDef.timer === TIMER.LONG) {
        startLongTimer(lastCard.cardDef);
    }
});

document.getElementById('name-skip').addEventListener('click', skipPlayer);

document.getElementById('history-btn').addEventListener('click', openHistory);

document.getElementById('history-close').addEventListener('click', () => {
    document.getElementById('history-overlay').classList.add('hidden');
});

document.getElementById('history-overlay').addEventListener('click', function (e) {
    if (e.target === this) this.classList.add('hidden');
});

document.getElementById('reset').addEventListener('click', () => {
    document.getElementById('confirm-overlay').classList.remove('hidden');
});

document.getElementById('confirm-yes').addEventListener('click', () => {
    document.getElementById('confirm-overlay').classList.add('hidden');
    resetAll();
});

document.getElementById('confirm-no').addEventListener('click', () => {
    document.getElementById('confirm-overlay').classList.add('hidden');
});

document.getElementById('confirm-overlay').addEventListener('click', function (e) {
    if (e.target === this) this.classList.add('hidden');
});

// ── Boot ──────────────────────────────────────────────────────────────────────

init();