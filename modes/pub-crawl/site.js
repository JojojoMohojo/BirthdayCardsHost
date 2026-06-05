'use strict';

// ── Active pack ───────────────────────────────────────────────────────────────
// TIMER and PACKS are defined in packs.js, loaded before this file.

let ACTIVE_PACK = null;

// ── Card suits ────────────────────────────────────────────────────────────────

const SUITS = ['♠', '♥', '♣', '♦'];
function suitForCard(num) {
    if (typeof num !== 'number') return '★';
    return SUITS[(num - 1) % SUITS.length];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function randomIndex(arr) {
    return Math.floor(Math.random() * arr.length);
}

function formatTime(seconds) {
    if (seconds >= 60) {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return s === 0 ? `${m}m` : `${m}m ${s}s`;
    }
    return `${seconds}s`;
}

// ── Storage (keys are scoped per pack) ───────────────────────────────────────

function storageKey()  { return `pubCrawl_${ACTIVE_PACK.id}_deck`; }
function historyKey()  { return `pubCrawl_${ACTIVE_PACK.id}_history`; }
function pubKey()      { return `pubCrawl_${ACTIVE_PACK.id}_pub`; }
function rulesKey()    { return `pubCrawl_${ACTIVE_PACK.id}_rules`; }
function cardsKey()    { return `pubCrawl_${ACTIVE_PACK.id}_cards`; }

function loadGlobalPlayers() {
    try { return JSON.parse(localStorage.getItem('kampai_players')) || []; } catch (e) { return []; }
}

function saveState(deck) {
    try { localStorage.setItem(storageKey(), JSON.stringify(deck)); } catch (e) {}
}

function loadState() {
    try {
        const raw = localStorage.getItem(storageKey());
        if (raw) return JSON.parse(raw);
    } catch (e) {}
    return null;
}

function clearState() {
    try { localStorage.removeItem(storageKey()); } catch (e) {}
}

function saveHistory(history) {
    try { localStorage.setItem(historyKey(), JSON.stringify(history)); } catch (e) {}
}

function loadHistory() {
    try {
        const raw = localStorage.getItem(historyKey());
        if (raw) return JSON.parse(raw);
    } catch (e) {}
    return [];
}

function clearHistory() {
    try { localStorage.removeItem(historyKey()); } catch (e) {}
}

const PUB_KEY = 'birthdayPubCount';

function savePubCount(n) {
    try { localStorage.setItem(pubKey(), String(n)); } catch (e) {}
}

function loadPubCount() {
    try {
        const raw = localStorage.getItem(pubKey());
        if (raw !== null) return Math.max(1, parseInt(raw, 10));
    } catch (e) {}
    return 1;
}

function clearPubCount() {
    try { localStorage.removeItem(pubKey()); } catch (e) {}
}

function saveRules() {
    try { localStorage.setItem(rulesKey(), JSON.stringify({ draw: drawRules, others: makeOthersRules })); } catch (e) {}
}

function loadRules() {
    try {
        const raw = localStorage.getItem(rulesKey());
        if (raw) {
            const p = JSON.parse(raw);
            return { draw: Array.isArray(p.draw) ? p.draw : [], others: Array.isArray(p.others) ? p.others : [] };
        }
    } catch (e) {}
    return null;
}

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
        localStorage.setItem(cardsKey(), JSON.stringify(serializable));
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
        const raw = localStorage.getItem(cardsKey());
        if (raw) {
            const parsed = JSON.parse(raw);
            return parsed.map(c => {
                if (c.text) return c;
                const orig = ACTIVE_PACK.cards.find(d => d.number === c.number);
                if (!orig) return c;
                return orig.textFn ? { ...c, textFn: orig.textFn } : { ...c, text: orig.text || '' };
            });
        }
    } catch (e) {}
    return null;
}

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
    // Load the active pack — redirect to picker if none selected
    const packId = localStorage.getItem('pubCrawlActivePack');
    ACTIVE_PACK = PACKS.find(p => p.id === packId) || null;
    if (!ACTIVE_PACK) {
        window.location.href = 'index.html';
        return;
    }

    // Apply pack identity to the page
    document.getElementById('game-header-title').textContent = ACTIVE_PACK.headerTitle || ACTIVE_PACK.name;
    document.title = ACTIVE_PACK.headerTitle || ACTIVE_PACK.name;
    renderPermaRules();

    const savedRules = loadRules();
    if (savedRules) {
        drawRules = savedRules.draw;
        makeOthersRules = savedRules.others;
    } else {
        drawRules = ACTIVE_PACK.drawRules.map(r => ({ ...r }));
        makeOthersRules = ACTIVE_PACK.othersDrawRules.map(r => ({ ...r }));
    }
    players = loadGlobalPlayers();
    const savedCards = loadCards();
    cards = savedCards !== null ? savedCards : ACTIVE_PACK.cards.map(c => ({ ...c }));
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

function applyRuleVisibility(animate) {
    document.getElementById('pubNumber').textContent = currentPub;
    document.querySelectorAll('#rules-list-1 li').forEach((li, i) => {
        const wasHidden = li.classList.contains('hidden');
        const shouldShow = drawRules[i] && currentPub >= drawRules[i].pub;
        li.classList.toggle('hidden', !shouldShow);
        if (animate && wasHidden && shouldShow) {
            li.classList.remove('rule-new');
            void li.offsetWidth;
            li.classList.add('rule-new');
        }
    });
    document.querySelectorAll('#rules-list-2 li').forEach((li, i) => {
        const wasHidden = li.classList.contains('hidden');
        const shouldShow = makeOthersRules[i] && currentPub >= makeOthersRules[i].pub;
        li.classList.toggle('hidden', !shouldShow);
        if (animate && wasHidden && shouldShow) {
            li.classList.remove('rule-new');
            void li.offsetWidth;
            li.classList.add('rule-new');
        }
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
    applyRuleVisibility(true);
}

// ── Rules panel rendering ─────────────────────────────────────────────────────

function renderPermaRules() {
    const container = document.getElementById('perma-rules-list');
    if (!container) return;
    container.innerHTML = '';
    const rules = ACTIVE_PACK.permanentRules || [];
    container.classList.toggle('hidden', rules.length === 0);
    rules.forEach(rule => {
        const div = document.createElement('div');
        div.className = 'perma-rule';
        div.textContent = rule;
        container.appendChild(div);
    });
}

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
    localStorage.removeItem(rulesKey());
    localStorage.removeItem(cardsKey());
    cards   = ACTIVE_PACK.cards.map(c => ({ ...c }));
    deck    = [...cards];
    history = [];
    lastCard  = null;
    currentPub = 1;
    drawRules = ACTIVE_PACK.drawRules.map(r => ({ ...r }));
    makeOthersRules = ACTIVE_PACK.othersDrawRules.map(r => ({ ...r }));
    activeLongTimers.forEach(t => clearInterval(t.intervalId));
    activeLongTimers = [];
    renderTimerTray();
    renderPermaRules();
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

function buildNameChips(entry) {
    const container = document.getElementById('name-picker-btns');
    container.innerHTML = '';
    players.forEach(name => {
        const btn = document.createElement('button');
        btn.className = 'name-chip';
        btn.textContent = name;
        if (entry && entry.assignee === name) btn.classList.add('selected');
        btn.addEventListener('click', () => selectPlayer(name, entry || null));
        container.appendChild(btn);
    });
}

function selectPlayer(name, entry) {
    const target = entry || lastCard;
    if (!target) return;
    target.assignee = name;

    // Ensure in history
    const existing = history.find(h => h === target);
    if (!existing) history.unshift(target);
    else existing.assignee = name;
    saveHistory(history);
    updateHistoryBtn();

    // Also update the most recent running long timer that belongs to this card (if unassigned)
    const unassignedTimers = activeLongTimers.filter(t => t.cardNumber === target.cardDef.number && !t.assignee);
    if (unassignedTimers.length > 0) {
        const latest = unassignedTimers[unassignedTimers.length - 1];
        latest.assignee = name;
        updateTimerTrayItem(latest, false);
    }

    if (entry) {
        // History card — use the dedicated refresh so the × button appears
        refreshHistoryCardAssignee(entry);
    } else {
        // Live card — standard hide/show
        document.querySelectorAll('.name-chip').forEach(c =>
            c.classList.toggle('selected', c.textContent === name)
        );
        document.getElementById('name-picker').classList.add('hidden');
        const assigneeEl = document.getElementById('card-assignee');
        assigneeEl.innerHTML = '';
        assigneeEl.textContent = name;
        assigneeEl.classList.remove('hidden');
    }
}

// ── Card rendering ────────────────────────────────────────────────────────────

function resolveCardText(cardDef) {
    if (cardDef.textFn) return cardDef.textFn();
    if (cardDef.text) return cardDef.text;
    // Recover text from pack defaults for cards whose text was stripped (e.g. old saves)
    const orig = ACTIVE_PACK.cards.find(c => c.number === cardDef.number);
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
    document.getElementById('card-ai-badge').classList.toggle('hidden', !cardDef.ai);

    // Assignee
    const assigneeEl = document.getElementById('card-assignee');
    if (assignee) {
        assigneeEl.innerHTML = '';
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
        currentShortDuration = cardDef.timerSeconds || 15;
        document.getElementById('card-timer-start').textContent = '';
        document.getElementById('card-timer-start').innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><polygon points="5,3 19,12 5,21"/></svg> Start ${formatTime(currentShortDuration)} timer`;
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
        const alreadyRunning = activeLongTimers.some(t => t.cardNumber === cardDef.number);
        longBtn.disabled = alreadyRunning;
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
    const rt = document.getElementById('rules-toggle');
    rt.classList.remove('hidden');
    rt.textContent = 'Show Rules';
    document.getElementById('back-to-card').classList.add('hidden');
}

// ── Short timer ───────────────────────────────────────────────────────────────

let currentShortDuration = 15;

function resetShortTimer() {
    if (shortTimerInterval) {
        clearInterval(shortTimerInterval);
        shortTimerInterval = null;
    }
    document.getElementById('card-timer-ring').classList.remove('ring--done');
}

function startShortTimer() {
    const startBtn    = document.getElementById('card-timer-start');
    const displayEl   = document.getElementById('card-timer-display');
    const countEl     = document.getElementById('card-timer-count');
    const ringEl      = document.getElementById('ring-progress');
    const circumference = 100;
    const duration = currentShortDuration;
    const urgentThreshold = Math.max(5, Math.round(duration * 0.2));

    startBtn.disabled = true;
    displayEl.classList.remove('hidden');

    let remaining = duration;
    countEl.textContent = remaining;
    ringEl.style.strokeDashoffset = 0;
    countEl.classList.remove('urgent');
    ringEl.classList.remove('urgent');

    shortTimerInterval = setInterval(() => {
        remaining--;
        countEl.textContent = remaining;
        const offset = circumference * (1 - remaining / duration);
        ringEl.style.strokeDashoffset = offset;

        if (remaining <= urgentThreshold) {
            countEl.classList.add('urgent');
            ringEl.classList.add('urgent');
        }

        if (remaining <= 0) {
            clearInterval(shortTimerInterval);
            shortTimerInterval = null;
            countEl.textContent = '✓';
            try { navigator.vibrate([80, 60, 80]); } catch (e) {}
            playTimerAlarm();
            document.getElementById('card-timer-ring').classList.add('ring--done');
        }
    }, 1000);
}

// ── Long timers ───────────────────────────────────────────────────────────────

let longTimerIdCounter = 0;

function playTimerAlarm() {
    try {
        const audio = new Audio('Football Commentator Screams _Hes Done It_ - Sound Effect.mp3');
        audio.play();
    } catch (e) {}
}

function startLongTimer(cardDef, assignee) {
    const id = ++longTimerIdCounter;
    const timer = {
        id,
        cardNumber: cardDef.number,
        label: cardDef.timerLabel || cardDef.title,
        cardTitle: cardDef.title,
        assignee: assignee || null,
        remaining: cardDef.timerSeconds,
        intervalId: null
    };

    timer.intervalId = setInterval(() => {
        timer.remaining--;
        if (timer.remaining <= 0) {
            clearInterval(timer.intervalId);
            try { navigator.vibrate([100, 80, 100, 80, 100]); } catch (e) {}
            playTimerAlarm();
            // Mark done but keep visible for 5s then remove
            updateTimerTrayItem(timer, true);
            const doneEl = document.getElementById('tray-timer-' + timer.id);
            if (doneEl) doneEl.classList.add('tray-timer--done');
            setTimeout(() => {
                activeLongTimers = activeLongTimers.filter(t => t.id !== id);
                renderTimerTray();
                // Re-enable the start button if the current card matches
                if (lastCard && lastCard.cardDef.number === cardDef.number) {
                    const btn = document.getElementById('long-timer-start');
                    if (btn && !activeLongTimers.some(t => t.cardNumber === cardDef.number)) {
                        btn.disabled = false;
                        btn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><polygon points="5,3 19,12 5,21"/></svg> <span>Start ${formatTime(cardDef.timerSeconds)} timer</span>`;
                    }
                }
            }, 5000);
            return;
        }
        updateTimerTrayItem(timer, false);
    }, 1000);

    activeLongTimers.push(timer);
    renderTimerTray();

    // Lock the start button on the current card if it matches
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
    const playerPart = timer.assignee
        ? `<span class="tray-timer-sep">·</span><span class="tray-timer-player">${timer.assignee}</span>`
        : '';
    return `
        <div class="tray-timer-info">
            <span class="tray-timer-name">${timer.label}</span>
            ${playerPart}
        </div>
        <div class="tray-timer-right">
            <div class="tray-timer-count${urgent ? ' urgent' : ''}">${display}</div>
            <button class="tray-timer-dismiss" onclick="dismissLongTimer(${timer.id})" aria-label="Dismiss timer">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
            </button>
        </div>
    `;
}

function renderHistoryCard(entry) {
    const { cardDef, resolvedText } = entry;

    const pipNum  = typeof cardDef.number === 'number' ? String(cardDef.number) : '?';
    const pipSuit = suitForCard(cardDef.number);
    ['pip-tl-num', 'pip-br-num'].forEach(id => document.getElementById(id).textContent = pipNum);
    ['pip-tl-suit', 'pip-br-suit'].forEach(id => document.getElementById(id).textContent = pipSuit);

    document.getElementById('CardTitle').textContent = cardDef.title;
    document.getElementById('CardText').textContent  = resolvedText;
    document.getElementById('card-ai-badge').classList.toggle('hidden', !cardDef.ai);

    refreshHistoryCardAssignee(entry);

    // Hide timers — history cards don't re-trigger timers
    document.getElementById('card-timer').classList.add('hidden');
    document.getElementById('long-timer-wrap').classList.add('hidden');

    // Show card, flip it in
    const panel = document.getElementById('card-panel');
    const flipper = document.getElementById('card-flipper');
    panel.classList.remove('hidden');
    flipper.style.transition = 'none';
    flipper.classList.remove('is-flipped');
    void flipper.offsetWidth;
    flipper.style.transition = '';
    flipper.classList.add('is-flipped');

    document.getElementById('rules-panel').classList.add('hidden');

    // Footer: rules-toggle shows as "Show Rules" — handled by footer delegation
    document.getElementById('rules-toggle').classList.remove('hidden');
    document.getElementById('rules-toggle').textContent = 'Show Rules';

    document.getElementById('back-to-card').classList.toggle('hidden', !lastCard || entry === lastCard);
}

// Refreshes just the assignee/picker area of a history card without re-rendering the whole card
function refreshHistoryCardAssignee(entry) {
    const assigneeEl  = document.getElementById('card-assignee');
    const namePickerEl = document.getElementById('name-picker');

    if (entry.assignee) {
        // Show badge with an × to unassign
        assigneeEl.innerHTML = '';
        const nameSpan = document.createElement('span');
        nameSpan.textContent = entry.assignee;
        const removeBtn = document.createElement('button');
        removeBtn.className = 'assignee-remove-btn';
        removeBtn.setAttribute('aria-label', 'Remove assignee');
        removeBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
        removeBtn.addEventListener('click', () => {
            entry.assignee = null;
            saveHistory(history);
            updateHistoryBtn();
            refreshHistoryCardAssignee(entry);
        });
        assigneeEl.appendChild(nameSpan);
        assigneeEl.appendChild(removeBtn);
        assigneeEl.classList.remove('hidden');
        namePickerEl.classList.add('hidden');
    } else {
        // No assignee — show picker
        assigneeEl.classList.add('hidden');
        buildNameChips(entry);
        namePickerEl.classList.remove('hidden');
    }
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
            el.className = 'history-item history-item--tappable';
            el.setAttribute('role', 'button');
            el.setAttribute('tabindex', '0');
            el.setAttribute('aria-label', `View card: ${entry.cardDef.title}`);
            el.innerHTML = `
                <div class="history-num">#${entry.cardDef.number}</div>
                <div class="history-info">
                    <div class="history-card-title">${entry.cardDef.title}</div>
                    <div class="history-card-player">${entry.assignee || 'Unassigned'}</div>
                </div>
                <div class="history-item-arrow">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                </div>
            `;
            const viewCard = () => {
                document.getElementById('history-overlay').classList.add('hidden');
                // If this is the lastCard just render it, otherwise render read-only
                if (entry === lastCard) {
                    renderCard(entry, false);
                } else {
                    renderHistoryCard(entry);
                }
            };
            el.addEventListener('click', viewCard);
            el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') viewCard(); });
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

    if (Math.random() < 0.01) {
        try { new Audio('Black Eyed Peas - Lets Get Retarded.mp3').play(); } catch (e) {}
    }
});

// rules-toggle is re-cloned by renderHistoryCard, so we use a live delegated listener on the footer
document.querySelector('.footer').addEventListener('click', function(e) {
    const btn = e.target.closest('#rules-toggle');
    if (!btn) return;
    buildNameChips();
    showRules();
});

document.getElementById('back-to-card').addEventListener('click', () => {
    if (lastCard) renderCard(lastCard, false);
});

document.getElementById('card-timer-start').addEventListener('click', startShortTimer);

document.getElementById('long-timer-start').addEventListener('click', () => {
    if (lastCard && lastCard.cardDef.timer === TIMER.LONG) {
        startLongTimer(lastCard.cardDef, lastCard.assignee);
    }
});

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
    const metaParts = [];
    if (card.timer !== TIMER.NONE) metaParts.push(`${formatTime(card.timerSeconds || 0)} timer`);
    if (card.ai) metaParts.push('✦ AI');
    if (metaParts.length) meta.textContent = metaParts.join(' · ');

    info.appendChild(titleEl);
    info.appendChild(textEl);
    if (metaParts.length) info.appendChild(meta);

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
        <option value="short">Short timer (inline)</option>
        <option value="long">Long timer (background tray)</option>
    `;
    timerSelect.value = card.timer || TIMER.NONE;

    // Seconds row — shown for both short and long
    const secsRow = document.createElement('div');
    secsRow.className = 'cm-long-opts';
    secsRow.classList.toggle('hidden', card.timer === TIMER.NONE);

    const secsInput = document.createElement('input');
    secsInput.type = 'number';
    secsInput.min = '5';
    secsInput.max = '3600';
    secsInput.value = String(card.timerSeconds || (card.timer === TIMER.SHORT ? 15 : 60));
    secsInput.className = 'rm-pub-input cm-secs-input';
    secsInput.setAttribute('aria-label', 'Timer duration in seconds');

    const secsLabel = document.createElement('span');
    secsLabel.className = 'cm-secs-label';
    secsLabel.textContent = 'seconds';

    // Long timer label — only shown for long
    const timerLabelInput = document.createElement('input');
    timerLabelInput.type = 'text';
    timerLabelInput.value = card.timerLabel || '';
    timerLabelInput.className = 'rm-input cm-timer-label-input';
    timerLabelInput.placeholder = 'Tray label (long timers only)…';
    timerLabelInput.maxLength = 50;
    timerLabelInput.classList.toggle('hidden', card.timer !== TIMER.LONG);

    secsRow.appendChild(secsInput);
    secsRow.appendChild(secsLabel);
    secsRow.appendChild(timerLabelInput);

    const longOpts = secsRow;

    timerSelect.addEventListener('change', () => {
        const val = timerSelect.value;
        secsRow.classList.toggle('hidden', val === 'none');
        timerLabelInput.classList.toggle('hidden', val !== 'long');
    });

    const aiRow = document.createElement('label');
    aiRow.className = 'cm-ai-row';
    const aiCheck = document.createElement('input');
    aiCheck.type = 'checkbox';
    aiCheck.className = 'cm-ai-check';
    aiCheck.checked = !!card.ai;
    const aiLabel = document.createElement('span');
    aiLabel.className = 'cm-secs-label';
    aiLabel.textContent = 'AI generated';
    aiRow.appendChild(aiCheck);
    aiRow.appendChild(aiLabel);

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
            ? { timer: TIMER.SHORT, timerSeconds: Math.max(5, parseInt(secsInput.value, 10) || 15) }
            : timerSelect.value === 'long'
                ? { timer: TIMER.LONG, timerSeconds: Math.max(5, parseInt(secsInput.value, 10) || 60), timerLabel: timerLabelInput.value.trim() || newTitle }
                : { timer: TIMER.NONE };
        cards[index] = { ...rest, title: newTitle, text: newText, ...timerFields, ai: aiCheck.checked };
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
    el.appendChild(aiRow);
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
    const aiCheck = document.getElementById('cm-ai-check');
    const maxNum = cards.length > 0 ? Math.max(...cards.map(c => typeof c.number === 'number' ? c.number : 0)) : 0;
    const newCard = { number: maxNum + 1, title, text, ...buildTimerFields('cm-timer-type', 'cm-timer-secs', 'cm-timer-label', title), ai: aiCheck.checked };
    cards.push(newCard);
    titleInput.value = '';
    textInput.value  = '';
    document.getElementById('cm-timer-type').value = 'none';
    document.getElementById('cm-long-timer-opts').classList.add('hidden');
    document.getElementById('cm-timer-secs').value  = '60';
    document.getElementById('cm-timer-label').value = '';
    aiCheck.checked = false;
    saveCards();
    renderCardManager();
}

function buildTimerFields(typeId, secsId, labelId, fallbackLabel) {
    const type = typeof typeId === 'string' ? document.getElementById(typeId).value : typeId;
    if (type === 'short') {
        const secs = Math.max(5, parseInt(document.getElementById(secsId).value, 10) || 15);
        return { timer: TIMER.SHORT, timerSeconds: secs };
    }
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

document.getElementById('next-pub').addEventListener('click', () => {
    document.getElementById('pub-confirm-overlay').classList.remove('hidden');
});

document.getElementById('pub-confirm-yes').addEventListener('click', () => {
    document.getElementById('pub-confirm-overlay').classList.add('hidden');
    nextPub();
});

document.getElementById('pub-confirm-no').addEventListener('click', () => {
    document.getElementById('pub-confirm-overlay').classList.add('hidden');
});

document.getElementById('pub-confirm-overlay').addEventListener('click', function (e) {
    if (e.target === this) this.classList.add('hidden');
});

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

document.getElementById('card-manager-btn').addEventListener('click', openCardManager);

document.getElementById('card-manager-close').addEventListener('click', closeCardManager);

document.getElementById('card-manager-overlay').addEventListener('click', function (e) {
    if (e.target === this) closeCardManager();
});

document.getElementById('cm-add').addEventListener('click', addCard);

document.getElementById('cm-timer-type').addEventListener('change', function () {
    const isNone = this.value === 'none';
    document.getElementById('cm-long-timer-opts').classList.toggle('hidden', isNone);
    document.getElementById('cm-timer-label').classList.toggle('hidden', this.value !== 'long');
    document.getElementById('cm-timer-secs').value = this.value === 'short' ? '15' : '60';
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
