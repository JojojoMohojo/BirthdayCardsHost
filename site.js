'use strict';

// ── Players ───────────────────────────────────────────────────────────────────

const DEFAULT_PLAYERS = ['Joe', 'Liam', 'Monty', 'Hannah', 'Tom', 'Faith', 'Ellen', 'Matt', 'Brandon', 'Imogen', 'Ashley', 'Cameron', 'Ellie'];

// ── Default rules ─────────────────────────────────────────────────────────────

const DEFAULT_RULES_DRAW = [
    { text: "Tom tells you to draw a card — his word is final",                  pub: 1 },
    { text: "Use any players first name (or shorted version)",                   pub: 1 },
    { text: "Fail to split the G",                                               pub: 2 },
    { text: "Place your drink within a thumb's length of the table",             pub: 2 },
    { text: "Take a piss at the pub (first piss per pub is free)",               pub: 3 },
    { text: "If you are the only one outside the pub at any point",              pub: 4 },
    { text: "Drink with your left hand",                                         pub: 5 },
    { text: "Accidently rhyme",                                                  pub: 6 },
    { text: "Are caught drinking sparkling wine or prosecco (once per drink)",   pub: 7 },
    { text: "Buzzballs",                                                         pub: 7 },
];

const DEFAULT_RULES_OTHERS = [
    { text: "Drink a full glass of milk",           pub: 1 },
    { text: "Manage to split the G",                pub: 2 },
    { text: "Challenge and win a boat race",        pub: 3 },
    { text: "Buy Tom a shot",                       pub: 3 },
    { text: "Eat a dog treat (Once per pub)",       pub: 3 },
    { text: "Buy another player a drink",           pub: 5 },
    { text: "Wear the gamer vest for a whole pub",  pub: 7 },
];

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

const PUB_KEY = 'birthdayPubCount';

function savePubCount(n) {
    try { localStorage.setItem(PUB_KEY, String(n)); } catch (e) {}
}

function loadPubCount() {
    try {
        const raw = localStorage.getItem(PUB_KEY);
        if (raw !== null) return Math.max(1, parseInt(raw, 10));
    } catch (e) {}
    return 1;
}

function clearPubCount() {
    try { localStorage.removeItem(PUB_KEY); } catch (e) {}
}

const RULES_KEY = 'birthdayRules';

function saveRules() {
    try { localStorage.setItem(RULES_KEY, JSON.stringify({ draw: drawRules, others: makeOthersRules })); } catch (e) {}
}

function loadRules() {
    try {
        const raw = localStorage.getItem(RULES_KEY);
        if (raw) {
            const p = JSON.parse(raw);
            return { draw: Array.isArray(p.draw) ? p.draw : [], others: Array.isArray(p.others) ? p.others : [] };
        }
    } catch (e) {}
    return null;
}

const PLAYERS_KEY = 'birthdayPlayers';

function savePlayers() {
    try { localStorage.setItem(PLAYERS_KEY, JSON.stringify(players)); } catch (e) {}
}

function loadPlayers() {
    try {
        const raw = localStorage.getItem(PLAYERS_KEY);
        if (raw) return JSON.parse(raw);
    } catch (e) {}
    return null;
}

const CARDS_KEY = 'birthdayCards';

function saveCards() {
    try {
        const serializable = cards.map(c => {
            if (c.textFn) {
                const { textFn, ...rest } = c;
                if (!rest.text) rest.text = textFn();
                return rest;
            }
            return c;
        });
        localStorage.setItem(CARDS_KEY, JSON.stringify(serializable));
    } catch (e) {}
    reconcileDeck();
}

function reconcileDeck() {
    const cardMap = new Map(cards.map(c => [c.number, c]));
    const drawnNums = new Set(history.map(h => h.cardDef.number));

    // Replace/remove existing deck entries based on current card definitions
    deck = deck.filter(d => cardMap.has(d.number)).map(d => cardMap.get(d.number));

    // Add any newly created cards that haven't been drawn
    const deckNums = new Set(deck.map(d => d.number));
    for (const c of cards) {
        if (!deckNums.has(c.number) && !drawnNums.has(c.number)) deck.push(c);
    }

    saveState(deck);
    updateCounter();
}

function loadCards() {
    try {
        const raw = localStorage.getItem(CARDS_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            return parsed.map(c => {
                if (c.text) return c;
                const orig = DEFAULT_CARDS.find(d => d.number === c.number);
                if (!orig) return c;
                return orig.textFn ? { ...c, textFn: orig.textFn } : { ...c, text: orig.text || '' };
            });
        }
    } catch (e) {}
    return null;
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
    { number: 34, timer: TIMER.NONE, title: "Butt Text, Sorry!", text: "Tom sat on your phone and somehow managed to send a text on it. Tom is allowed to send one text to anyone on your phone (excluding work and parents). If you refuse, take a shot" },

    //New ones
    { number: 19, timer: TIMER.LONG, timerSeconds: 300, timerLabel: "5 min heaven rule", title: "Tom wishes he was dead, show him the way", text: "For the next 5 minutes any time you point to heaven (Tom's dream) everyone else must point too, the last one has to take 3 slips" },

];

// ── State ─────────────────────────────────────────────────────────────────────

let cards   = [];
let deck    = [];
let lastCard  = null;   // { cardDef, resolvedText, assignee }
let history   = [];     // [{ cardDef, resolvedText, assignee }, ...]  newest first
let activeLongTimers = []; // [{ id, label, remaining, intervalId }, ...]
let shortTimerInterval = null;
let currentPub = 1;
let drawRules = [];
let makeOthersRules = [];
let players = [];

// ── Init ──────────────────────────────────────────────────────────────────────

function init() {
    const savedRules = loadRules();
    if (savedRules) {
        drawRules = savedRules.draw;
        makeOthersRules = savedRules.others;
    } else {
        drawRules = [...DEFAULT_RULES_DRAW];
        makeOthersRules = [...DEFAULT_RULES_OTHERS];
    }
    players = loadPlayers() ?? [...DEFAULT_PLAYERS];
    const savedCards = loadCards();
    cards = savedCards !== null ? savedCards : [...DEFAULT_CARDS];
    renderRulesPanel();
    buildNameChips();
    history = loadHistory();
    const saved = loadState();
    deck = saved !== null ? saved : [...cards];
    // Reconcile deck against current card definitions so edits/adds/deletes
    // and textFn stripping are reflected without needing a manual deck reset.
    reconcileDeck();
    currentPub = loadPubCount();
    updateHistoryBtn();
    applyRuleVisibility();
}

// ── Counter ───────────────────────────────────────────────────────────────────

function updateCounter() {
    document.getElementById('remainingCards').textContent = deck.length;
    document.getElementById('totalCards').textContent     = '/' + cards.length;
}

// ── Pub progression ───────────────────────────────────────────────────────────

function applyRuleVisibility() {
    document.getElementById('pubNumber').textContent = currentPub;
    document.querySelectorAll('#rules-list-1 li').forEach((li, i) => {
        li.classList.toggle('hidden', !drawRules[i] || currentPub < drawRules[i].pub);
    });
    document.querySelectorAll('#rules-list-2 li').forEach((li, i) => {
        li.classList.toggle('hidden', !makeOthersRules[i] || currentPub < makeOthersRules[i].pub);
    });
    const anyOthersVisible = makeOthersRules.some(r => currentPub >= r.pub);
    document.getElementById('rules-subheading-2').classList.toggle('hidden', !anyOthersVisible);
    document.getElementById('rules-list-2').classList.toggle('hidden', !anyOthersVisible);
    const allRules = [...drawRules, ...makeOthersRules];
    const maxPub = allRules.length > 0 ? Math.max(...allRules.map(r => r.pub)) : 1;
    document.getElementById('next-pub').disabled = currentPub >= maxPub;
}

function nextPub() {
    currentPub++;
    savePubCount(currentPub);
    applyRuleVisibility();
}

// ── Rules panel rendering ─────────────────────────────────────────────────────

function renderRulesPanel() {
    const list1 = document.getElementById('rules-list-1');
    const list2 = document.getElementById('rules-list-2');
    list1.innerHTML = '';
    list2.innerHTML = '';
    drawRules.forEach(r => {
        const li = document.createElement('li');
        li.textContent = r.text;
        list1.appendChild(li);
    });
    makeOthersRules.forEach(r => {
        const li = document.createElement('li');
        li.textContent = r.text;
        list2.appendChild(li);
    });
}

// ── Rule manager ──────────────────────────────────────────────────────────────

function openRuleManager() {
    renderRuleManager();
    document.getElementById('rule-manager-overlay').classList.remove('hidden');
}

function closeRuleManager() {
    document.getElementById('rule-manager-overlay').classList.add('hidden');
}

function renderRuleManager() {
    renderRmSection('rm-draw-list', drawRules, 'draw');
    renderRmSection('rm-others-list', makeOthersRules, 'others');
}

function renderRmSection(containerId, rules, section) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    if (rules.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'rm-empty';
        empty.textContent = 'No rules in this section.';
        container.appendChild(empty);
        return;
    }
    rules.forEach((rule, i) => {
        const el = document.createElement('div');
        el.className = 'rm-rule-item';

        const pubInput = document.createElement('input');
        pubInput.type = 'number';
        pubInput.min = '1';
        pubInput.max = '99';
        pubInput.value = String(rule.pub);
        pubInput.className = 'rm-pub-badge';
        pubInput.setAttribute('aria-label', 'Reveal at pub number');
        pubInput.addEventListener('change', () => updateRulePub(section, i, pubInput.value));

        const text = document.createElement('span');
        text.className = 'rm-rule-text';
        text.textContent = rule.text;

        const btn = document.createElement('button');
        btn.className = 'rm-delete-btn';
        btn.setAttribute('aria-label', 'Remove rule');
        btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
        btn.addEventListener('click', () => removeRule(section, i));

        el.appendChild(pubInput);
        el.appendChild(text);
        el.appendChild(btn);
        container.appendChild(el);
    });
}

function updateRulePub(section, index, value) {
    const pub = Math.max(1, parseInt(value, 10) || 1);
    const rule = section === 'draw' ? drawRules[index] : makeOthersRules[index];
    if (rule) {
        rule.pub = pub;
        saveRules();
        applyRuleVisibility();
    }
}

function addRule() {
    const input = document.getElementById('rm-input');
    const section = document.getElementById('rm-section').value;
    const text = input.value.trim();
    if (!text) return;
    const pub = Math.max(1, parseInt(document.getElementById('rm-pub').value, 10) || 1);
    const rule = { text, pub };
    if (section === 'draw') {
        drawRules.push(rule);
    } else {
        makeOthersRules.push(rule);
    }
    input.value = '';
    saveRules();
    renderRulesPanel();
    applyRuleVisibility();
    renderRuleManager();
}

function removeRule(section, index) {
    if (section === 'draw') {
        drawRules.splice(index, 1);
    } else {
        makeOthersRules.splice(index, 1);
    }
    saveRules();
    renderRulesPanel();
    applyRuleVisibility();
    renderRuleManager();
}

// ── Reset & clear ─────────────────────────────────────────────────────────────

function clearAllData() {
    clearState();
    clearHistory();
    clearPubCount();
    localStorage.removeItem(RULES_KEY);
    localStorage.removeItem(PLAYERS_KEY);
    localStorage.removeItem(CARDS_KEY);
    cards   = [...DEFAULT_CARDS];
    deck    = [...cards];
    history = [];
    lastCard  = null;
    currentPub = 1;
    drawRules = [...DEFAULT_RULES_DRAW];
    makeOthersRules = [...DEFAULT_RULES_OTHERS];
    players = [...DEFAULT_PLAYERS];
    activeLongTimers.forEach(t => clearInterval(t.intervalId));
    activeLongTimers = [];
    renderTimerTray();
    renderRulesPanel();
    buildNameChips();
    updateCounter();
    updateHistoryBtn();
    applyRuleVisibility();
    const drawBtn = document.getElementById('draw');
    drawBtn.disabled = false;
    drawBtn.textContent = 'Draw Card';
    drawBtn.dataset.mode = '';
    showRules();
}

function resetAll() {
    clearState();
    clearHistory();
    clearPubCount();
    deck    = [...cards];
    saveState(deck);
    history = [];
    lastCard  = null;
    currentPub = 1;
    activeLongTimers.forEach(t => clearInterval(t.intervalId));
    activeLongTimers = [];
    renderTimerTray();
    updateCounter();
    updateHistoryBtn();
    applyRuleVisibility();
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
    players.forEach(name => {
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
    if (cardDef.textFn) return cardDef.textFn();
    if (cardDef.text) return cardDef.text;
    // Recover text from DEFAULT_CARDS for cards whose text was stripped (e.g. old saves)
    const orig = DEFAULT_CARDS.find(c => c.number === cardDef.number);
    return orig ? (orig.textFn ? orig.textFn() : (orig.text || '')) : '';
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

    // Panel visibility + flip animation
    const panel = document.getElementById('card-panel');
    const flipper = document.getElementById('card-flipper');
    panel.classList.remove('hidden');
    if (animate) {
        flipper.style.transition = 'none';
        flipper.classList.remove('is-flipped');
        void flipper.offsetWidth;
        flipper.style.transition = '';
        flipper.classList.add('is-flipped');
    } else {
        flipper.classList.add('is-flipped');
    }

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

// ── Player manager ────────────────────────────────────────────────────────────

function openPlayerManager() {
    renderPlayerManager();
    document.getElementById('player-manager-overlay').classList.remove('hidden');
}

function closePlayerManager() {
    document.getElementById('player-manager-overlay').classList.add('hidden');
}

function renderPlayerManager() {
    const container = document.getElementById('pm-player-list');
    container.innerHTML = '';
    if (players.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'rm-empty';
        empty.textContent = 'No players added.';
        container.appendChild(empty);
        return;
    }
    players.forEach((name, i) => {
        const count = history.filter(h => h.assignee === name).length;
        const el = document.createElement('div');
        el.className = 'pm-player-item';

        const nameSpan = document.createElement('span');
        nameSpan.className = 'pm-player-name';
        nameSpan.textContent = name;

        const countBadge = document.createElement('span');
        countBadge.className = 'pm-card-count';
        countBadge.textContent = count === 1 ? '1 card' : `${count} cards`;

        const editBtn = document.createElement('button');
        editBtn.className = 'rm-delete-btn';
        editBtn.setAttribute('aria-label', 'Rename player');
        editBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>';
        editBtn.addEventListener('click', () => startRenamePlayer(i, el, nameSpan));

        const delBtn = document.createElement('button');
        delBtn.className = 'rm-delete-btn';
        delBtn.setAttribute('aria-label', 'Remove player');
        delBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
        delBtn.addEventListener('click', () => removePlayer(i));

        el.appendChild(nameSpan);
        el.appendChild(countBadge);
        el.appendChild(editBtn);
        el.appendChild(delBtn);
        container.appendChild(el);
    });
}

function startRenamePlayer(index, el, nameSpan) {
    const oldName = players[index];
    const input = document.createElement('input');
    input.type = 'text';
    input.value = oldName;
    input.className = 'pm-rename-input';
    el.replaceChild(input, nameSpan);
    input.focus();
    input.select();

    let committed = false;
    const commit = () => {
        if (committed) return;
        committed = true;
        const newName = input.value.trim();
        if (newName && newName !== oldName) {
            history.forEach(h => { if (h.assignee === oldName) h.assignee = newName; });
            saveHistory(history);
            players[index] = newName;
            savePlayers();
            buildNameChips();
        }
        renderPlayerManager();
    };

    input.addEventListener('blur', commit);
    input.addEventListener('keydown', e => {
        if (e.key === 'Enter') input.blur();
        if (e.key === 'Escape') { committed = true; renderPlayerManager(); }
    });
}

function addPlayer() {
    const input = document.getElementById('pm-input');
    const name = input.value.trim();
    if (!name || players.includes(name)) return;
    players.push(name);
    input.value = '';
    savePlayers();
    buildNameChips();
    renderPlayerManager();
}

function removePlayer(index) {
    players.splice(index, 1);
    savePlayers();
    buildNameChips();
    renderPlayerManager();
}

// ── Card manager ──────────────────────────────────────────────────────────────

function openCardManager() {
    renderCardManager();
    document.getElementById('card-manager-overlay').classList.remove('hidden');
}

function closeCardManager() {
    document.getElementById('card-manager-overlay').classList.add('hidden');
}

function renderCardManager() {
    const container = document.getElementById('cm-card-list');
    container.innerHTML = '';
    if (cards.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'rm-empty';
        empty.textContent = 'No cards defined.';
        container.appendChild(empty);
        return;
    }
    cards.forEach((card, i) => {
        const el = document.createElement('div');
        el.className = 'cm-card-item';
        renderCardItemView(el, card, i);
        container.appendChild(el);
    });
}

function renderCardItemView(el, card, i) {
    el.innerHTML = '';
    el.classList.remove('cm-card-item--editing');

    const numBadge = document.createElement('span');
    numBadge.className = 'cm-card-num';
    numBadge.textContent = card.number;

    const info = document.createElement('div');
    info.className = 'cm-card-info';

    const titleEl = document.createElement('div');
    titleEl.className = 'cm-card-title';
    titleEl.textContent = card.title;

    const textEl = document.createElement('div');
    textEl.className = 'cm-card-text';
    textEl.textContent = card.textFn ? '(dynamic text)' : (card.text || '');

    const meta = document.createElement('div');
    meta.className = 'cm-card-meta';
    if (card.timer === TIMER.SHORT) {
        meta.textContent = '15s timer';
    } else if (card.timer === TIMER.LONG) {
        meta.textContent = `${formatTime(card.timerSeconds || 0)} timer`;
    }

    info.appendChild(titleEl);
    info.appendChild(textEl);
    if (card.timer !== TIMER.NONE) info.appendChild(meta);

    const editBtn = document.createElement('button');
    editBtn.className = 'rm-delete-btn';
    editBtn.setAttribute('aria-label', 'Edit card');
    editBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>';
    editBtn.addEventListener('click', () => startEditCard(i, el));

    const delBtn = document.createElement('button');
    delBtn.className = 'rm-delete-btn';
    delBtn.setAttribute('aria-label', 'Remove card');
    delBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
    delBtn.addEventListener('click', () => removeCard(i));

    el.appendChild(numBadge);
    el.appendChild(info);
    el.appendChild(editBtn);
    el.appendChild(delBtn);
}

function startEditCard(index, el) {
    const card = cards[index];
    el.innerHTML = '';
    el.classList.add('cm-card-item--editing');

    const titleInput = document.createElement('input');
    titleInput.type = 'text';
    titleInput.value = card.title;
    titleInput.className = 'rm-input';
    titleInput.maxLength = 100;
    titleInput.placeholder = 'Card title…';

    const textArea = document.createElement('textarea');
    textArea.value = card.textFn ? card.textFn() : (card.text || '');
    textArea.className = 'rm-textarea';
    textArea.rows = 3;
    textArea.maxLength = 500;
    textArea.placeholder = 'Card text…';

    // Timer select
    const timerSelect = document.createElement('select');
    timerSelect.className = 'rm-select';
    timerSelect.innerHTML = `
        <option value="none">No timer</option>
        <option value="short">15-second timer</option>
        <option value="long">Long timer</option>
    `;
    timerSelect.value = card.timer || TIMER.NONE;

    // Long timer options row
    const longOpts = document.createElement('div');
    longOpts.className = 'cm-long-opts';
    longOpts.classList.toggle('hidden', card.timer !== TIMER.LONG);

    const secsInput = document.createElement('input');
    secsInput.type = 'number';
    secsInput.min = '5';
    secsInput.max = '3600';
    secsInput.value = String(card.timerSeconds || 60);
    secsInput.className = 'rm-pub-input cm-secs-input';
    secsInput.setAttribute('aria-label', 'Timer duration in seconds');

    const secsLabel = document.createElement('span');
    secsLabel.className = 'cm-secs-label';
    secsLabel.textContent = 'seconds';

    const timerLabelInput = document.createElement('input');
    timerLabelInput.type = 'text';
    timerLabelInput.value = card.timerLabel || '';
    timerLabelInput.className = 'rm-input';
    timerLabelInput.placeholder = 'Tray label…';
    timerLabelInput.maxLength = 50;

    longOpts.appendChild(secsInput);
    longOpts.appendChild(secsLabel);
    longOpts.appendChild(timerLabelInput);

    timerSelect.addEventListener('change', () => {
        longOpts.classList.toggle('hidden', timerSelect.value !== 'long');
    });

    const actions = document.createElement('div');
    actions.className = 'cm-edit-actions';

    const saveBtn = document.createElement('button');
    saveBtn.className = 'rm-add-btn';
    saveBtn.textContent = 'Save';
    saveBtn.addEventListener('click', () => {
        const newTitle = titleInput.value.trim();
        const newText  = textArea.value.trim();
        if (!newTitle) return;
        const { textFn, timerSeconds, timerLabel, ...rest } = card;
        const timerFields = timerSelect.value === 'short'
            ? { timer: TIMER.SHORT }
            : timerSelect.value === 'long'
                ? { timer: TIMER.LONG, timerSeconds: Math.max(5, parseInt(secsInput.value, 10) || 60), timerLabel: timerLabelInput.value.trim() || newTitle }
                : { timer: TIMER.NONE };
        cards[index] = { ...rest, title: newTitle, text: newText, ...timerFields };
        saveCards();
        renderCardManager();
    });

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'cm-cancel-btn';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.addEventListener('click', () => renderCardItemView(el, card, index));

    actions.appendChild(cancelBtn);
    actions.appendChild(saveBtn);

    el.appendChild(titleInput);
    el.appendChild(textArea);
    el.appendChild(timerSelect);
    el.appendChild(longOpts);
    el.appendChild(actions);

    titleInput.focus();
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function addCard() {
    const titleInput = document.getElementById('cm-title-input');
    const textInput  = document.getElementById('cm-text-input');
    const title = titleInput.value.trim();
    const text  = textInput.value.trim();
    if (!title || !text) return;
    const maxNum = cards.length > 0 ? Math.max(...cards.map(c => typeof c.number === 'number' ? c.number : 0)) : 0;
    const newCard = { number: maxNum + 1, title, text, ...buildTimerFields('cm-timer-type', 'cm-timer-secs', 'cm-timer-label', title) };
    cards.push(newCard);
    titleInput.value = '';
    textInput.value  = '';
    document.getElementById('cm-timer-type').value = 'none';
    document.getElementById('cm-long-timer-opts').classList.add('hidden');
    document.getElementById('cm-timer-secs').value  = '60';
    document.getElementById('cm-timer-label').value = '';
    saveCards();
    renderCardManager();
}

function buildTimerFields(typeId, secsId, labelId, fallbackLabel) {
    const type = typeof typeId === 'string' ? document.getElementById(typeId).value : typeId;
    if (type === 'short') return { timer: TIMER.SHORT };
    if (type === 'long') {
        const secs  = Math.max(5, parseInt(document.getElementById(secsId).value, 10) || 60);
        const label = document.getElementById(labelId).value.trim() || fallbackLabel;
        return { timer: TIMER.LONG, timerSeconds: secs, timerLabel: label };
    }
    return { timer: TIMER.NONE };
}

function removeCard(index) {
    cards.splice(index, 1);
    saveCards();
    renderCardManager();
}

// ── Event listeners ───────────────────────────────────────────────────────────

document.getElementById('next-pub').addEventListener('click', nextPub);

document.getElementById('clear-cookies-btn').addEventListener('click', () => {
    document.getElementById('cookie-confirm-overlay').classList.remove('hidden');
});

document.getElementById('cookie-confirm-yes').addEventListener('click', () => {
    document.getElementById('cookie-confirm-overlay').classList.add('hidden');
    clearAllData();
});

document.getElementById('cookie-confirm-no').addEventListener('click', () => {
    document.getElementById('cookie-confirm-overlay').classList.add('hidden');
});

document.getElementById('cookie-confirm-overlay').addEventListener('click', function (e) {
    if (e.target === this) this.classList.add('hidden');
});

document.getElementById('player-manager-btn').addEventListener('click', openPlayerManager);

document.getElementById('player-manager-close').addEventListener('click', closePlayerManager);

document.getElementById('player-manager-overlay').addEventListener('click', function (e) {
    if (e.target === this) closePlayerManager();
});

document.getElementById('pm-add').addEventListener('click', addPlayer);

document.getElementById('pm-input').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') addPlayer();
});

document.getElementById('card-manager-btn').addEventListener('click', openCardManager);

document.getElementById('card-manager-close').addEventListener('click', closeCardManager);

document.getElementById('card-manager-overlay').addEventListener('click', function (e) {
    if (e.target === this) closeCardManager();
});

document.getElementById('cm-add').addEventListener('click', addCard);

document.getElementById('cm-timer-type').addEventListener('change', function () {
    document.getElementById('cm-long-timer-opts').classList.toggle('hidden', this.value !== 'long');
});

document.getElementById('rule-manager-btn').addEventListener('click', openRuleManager);

document.getElementById('rule-manager-close').addEventListener('click', closeRuleManager);

document.getElementById('rule-manager-overlay').addEventListener('click', function (e) {
    if (e.target === this) closeRuleManager();
});

document.getElementById('rm-add').addEventListener('click', addRule);

document.getElementById('rm-input').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') addRule();
});

// ── Boot ──────────────────────────────────────────────────────────────────────

init();