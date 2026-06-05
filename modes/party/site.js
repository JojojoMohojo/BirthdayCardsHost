'use strict';

// PARTY_PACKS is defined in party-packs.js, loaded before this file.

const TIMER = { NONE: 'none', SHORT: 'short', LONG: 'long' };

let ACTIVE_PACK = null;

// ── Card symbols ──────────────────────────────────────────────────────────────

const SYMBOLS = ['★', '♥', '✦', '◆'];
function symbolForCard(num) {
    if (typeof num !== 'number') return '★';
    return SYMBOLS[(num - 1) % SYMBOLS.length];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function randomIndex(arr) { return Math.floor(Math.random() * arr.length); }

function formatTime(seconds) {
    if (seconds >= 60) {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return s === 0 ? `${m}m` : `${m}m ${s}s`;
    }
    return `${seconds}s`;
}

// ── Storage (scoped per pack) ─────────────────────────────────────────────────

function storageKey()  { return `party_${ACTIVE_PACK.id}_deck`; }
function historyKey()  { return `party_${ACTIVE_PACK.id}_history`; }
function rulesKey()    { return `party_${ACTIVE_PACK.id}_rules`; }
function cardsKey()    { return `party_${ACTIVE_PACK.id}_cards`; }

function loadGlobalPlayers() {
    try { const r = localStorage.getItem('kampai_players'); if (r) return JSON.parse(r); } catch (e) {}
    return [];
}

function saveState(deck)    { try { localStorage.setItem(storageKey(),  JSON.stringify(deck));    } catch (e) {} }
function loadState()        { try { const r = localStorage.getItem(storageKey());  if (r) return JSON.parse(r); } catch (e) {} return null; }
function clearState()       { try { localStorage.removeItem(storageKey());  } catch (e) {} }
function saveHistory(h)     { try { localStorage.setItem(historyKey(), JSON.stringify(h));       } catch (e) {} }
function loadHistory()      { try { const r = localStorage.getItem(historyKey()); if (r) return JSON.parse(r); } catch (e) {} return []; }
function clearHistory()     { try { localStorage.removeItem(historyKey()); } catch (e) {} }

function loadRules()        { try { const r = localStorage.getItem(rulesKey());  if (r) { const p = JSON.parse(r); if (Array.isArray(p)) return p; } } catch (e) {} return null; }

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
let lastCard  = null;
let history   = [];
let activeLongTimers = [];
let shortTimerInterval = null;
let gameRules = [];
let players = [];

// ── Deck reconciliation ───────────────────────────────────────────────────────

function reconcileDeck() {
    const cardMap = new Map(cards.map(c => [c.number, c]));
    const drawnNums = new Set(history.map(h => h.cardDef.number));
    deck = deck.filter(d => cardMap.has(d.number)).map(d => cardMap.get(d.number));
    const deckNums = new Set(deck.map(d => d.number));
    for (const c of cards) {
        if (!deckNums.has(c.number) && !drawnNums.has(c.number)) deck.push(c);
    }
    saveState(deck);
    updateCounter();
}

// ── Init ──────────────────────────────────────────────────────────────────────

function init() {
    const packId = localStorage.getItem('partyActivePack');
    ACTIVE_PACK = PARTY_PACKS.find(p => p.id === packId) || null;
    if (!ACTIVE_PACK) {
        window.location.href = 'index.html';
        return;
    }

    document.getElementById('game-header-title').textContent = ACTIVE_PACK.name;
    document.title = ACTIVE_PACK.name;

    gameRules = loadRules() ?? (ACTIVE_PACK.rules || []).map(r => r);
    players   = loadGlobalPlayers();
    const savedCards = loadCards();
    cards = savedCards !== null ? savedCards : ACTIVE_PACK.cards.map(c => ({ ...c }));

    renderRulesPanel();
    buildNameChips();
    history = loadHistory();
    const saved = loadState();
    deck = saved !== null ? saved : [...cards];
    reconcileDeck();
    updateHistoryBtn();
}

// ── Counter ───────────────────────────────────────────────────────────────────

function updateCounter() {
    document.getElementById('remainingCards').textContent = deck.length;
    document.getElementById('totalCards').textContent     = '/' + cards.length;
}

// ── Rules panel ───────────────────────────────────────────────────────────────

function renderRulesPanel() {
    const list = document.getElementById('rules-list');
    list.innerHTML = '';
    if (gameRules.length === 0) {
        const empty = document.createElement('li');
        empty.className = 'rules-empty';
        empty.style.listStyle = 'none';
        empty.textContent = 'No rules yet — add some below.';
        list.appendChild(empty);
        return;
    }
    gameRules.forEach(r => {
        const li = document.createElement('li');
        li.textContent = r;
        list.appendChild(li);
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
    const container = document.getElementById('rm-rule-list');
    container.innerHTML = '';
    if (gameRules.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'rm-empty';
        empty.textContent = 'No rules yet.';
        container.appendChild(empty);
        return;
    }
    gameRules.forEach((rule, i) => {
        const el = document.createElement('div');
        el.className = 'rm-rule-item';

        const text = document.createElement('span');
        text.className = 'rm-rule-text';
        text.textContent = rule;

        const btn = document.createElement('button');
        btn.className = 'rm-delete-btn';
        btn.setAttribute('aria-label', 'Remove rule');
        btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
        btn.addEventListener('click', () => {
            gameRules.splice(i, 1);
            saveRules();
            renderRulesPanel();
            renderRuleManager();
        });

        el.appendChild(text);
        el.appendChild(btn);
        container.appendChild(el);
    });
}

function addRule() {
    const input = document.getElementById('rm-input');
    const text = input.value.trim();
    if (!text) return;
    gameRules.push(text);
    input.value = '';
    saveRules();
    renderRulesPanel();
    renderRuleManager();
}

// ── Reset & clear ─────────────────────────────────────────────────────────────

function clearAllData() {
    clearState();
    clearHistory();
    localStorage.removeItem(rulesKey());
    localStorage.removeItem(cardsKey());
    cards   = ACTIVE_PACK.cards.map(c => ({ ...c }));
    deck    = [...cards];
    history = [];
    lastCard  = null;
    gameRules = (ACTIVE_PACK.rules || []).map(r => r);
    activeLongTimers.forEach(t => clearInterval(t.intervalId));
    activeLongTimers = [];
    renderTimerTray();
    renderRulesPanel();
    buildNameChips();
    updateCounter();
    updateHistoryBtn();
    const drawBtn = document.getElementById('draw');
    drawBtn.disabled = false;
    drawBtn.textContent = 'Draw Card';
    drawBtn.dataset.mode = '';
    showRules();
}

function resetAll() {
    clearState();
    clearHistory();
    deck    = [...cards];
    saveState(deck);
    history = [];
    lastCard  = null;
    activeLongTimers.forEach(t => clearInterval(t.intervalId));
    activeLongTimers = [];
    renderTimerTray();
    updateCounter();
    updateHistoryBtn();
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
    const existing = history.find(h => h === target);
    if (!existing) history.unshift(target);
    else existing.assignee = name;
    saveHistory(history);
    updateHistoryBtn();

    const unassignedTimers = activeLongTimers.filter(t => t.cardNumber === target.cardDef.number && !t.assignee);
    if (unassignedTimers.length > 0) {
        unassignedTimers[unassignedTimers.length - 1].assignee = name;
        updateTimerTrayItem(unassignedTimers[unassignedTimers.length - 1], false);
    }

    if (entry) {
        refreshHistoryCardAssignee(entry);
    } else {
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
    const orig = ACTIVE_PACK.cards.find(c => c.number === cardDef.number);
    return orig ? (orig.textFn ? orig.textFn() : (orig.text || '')) : '';
}

function renderCard(entry, animate) {
    const { cardDef, resolvedText, assignee } = entry;

    const pipNum  = typeof cardDef.number === 'number' ? String(cardDef.number) : '?';
    const pipSym  = symbolForCard(cardDef.number);
    ['pip-tl-num', 'pip-br-num'].forEach(id => document.getElementById(id).textContent = pipNum);
    ['pip-tl-suit', 'pip-br-suit'].forEach(id => document.getElementById(id).textContent = pipSym);

    document.getElementById('CardTitle').textContent = cardDef.title;
    document.getElementById('CardText').textContent  = resolvedText;
    document.getElementById('card-ai-badge').classList.toggle('hidden', !cardDef.ai);

    const assigneeEl = document.getElementById('card-assignee');
    if (assignee) {
        assigneeEl.innerHTML = '';
        assigneeEl.textContent = assignee;
        assigneeEl.classList.remove('hidden');
        document.getElementById('name-picker').classList.add('hidden');
    } else {
        assigneeEl.classList.add('hidden');
        const isNew = entry === lastCard && !assignee;
        document.getElementById('name-picker').classList.toggle('hidden', !isNew);
        document.querySelectorAll('.name-chip').forEach(c => c.classList.remove('selected'));
    }

    resetShortTimer();
    const cardTimerEl = document.getElementById('card-timer');
    if (cardDef.timer === TIMER.SHORT) {
        currentShortDuration = cardDef.timerSeconds || 15;
        document.getElementById('card-timer-start').innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><polygon points="5,3 19,12 5,21"/></svg> Start ${formatTime(currentShortDuration)} timer`;
        cardTimerEl.classList.remove('hidden');
        document.getElementById('card-timer-display').classList.add('hidden');
        document.getElementById('card-timer-start').disabled = false;
    } else {
        cardTimerEl.classList.add('hidden');
    }

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
    if (shortTimerInterval) { clearInterval(shortTimerInterval); shortTimerInterval = null; }
    document.getElementById('card-timer-ring').classList.remove('ring--done');
}

function startShortTimer() {
    const startBtn  = document.getElementById('card-timer-start');
    const displayEl = document.getElementById('card-timer-display');
    const countEl   = document.getElementById('card-timer-count');
    const ringEl    = document.getElementById('ring-progress');
    const duration  = currentShortDuration;
    const urgent    = Math.max(5, Math.round(duration * 0.2));

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
        ringEl.style.strokeDashoffset = 100 * (1 - remaining / duration);
        if (remaining <= urgent) { countEl.classList.add('urgent'); ringEl.classList.add('urgent'); }
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
    try { new Audio('party-alarm.mp3').play(); } catch (e) {}
}

function startLongTimer(cardDef, assignee) {
    const id = ++longTimerIdCounter;
    const timer = {
        id,
        cardNumber: cardDef.number,
        label: cardDef.timerLabel || cardDef.title,
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
            updateTimerTrayItem(timer, true);
            const doneEl = document.getElementById('tray-timer-' + timer.id);
            if (doneEl) doneEl.classList.add('tray-timer--done');
            setTimeout(() => {
                activeLongTimers = activeLongTimers.filter(t => t.id !== id);
                renderTimerTray();
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
    if (activeLongTimers.length === 0) { tray.classList.add('hidden'); return; }
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
    if (el) el.innerHTML = timerTrayItemHTML(timer, done);
}

function timerTrayItemHTML(timer, done) {
    const urgent = timer.remaining <= 30 && !done;
    const display = done ? 'Done!' : formatTime(timer.remaining);
    const playerPart = timer.assignee
        ? `<span class="tray-timer-sep">·</span><span class="tray-timer-player">${timer.assignee}</span>`
        : '';
    return `
        <div class="tray-timer-info">
            <span class="tray-timer-name">${timer.label}</span>${playerPart}
        </div>
        <div class="tray-timer-right">
            <div class="tray-timer-count${urgent ? ' urgent' : ''}">${display}</div>
            <button class="tray-timer-dismiss" onclick="dismissLongTimer(${timer.id})" aria-label="Dismiss timer">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
            </button>
        </div>`;
}

// ── History card rendering ────────────────────────────────────────────────────

function renderHistoryCard(entry) {
    const { cardDef, resolvedText } = entry;
    const pipNum = typeof cardDef.number === 'number' ? String(cardDef.number) : '?';
    const pipSym = symbolForCard(cardDef.number);
    ['pip-tl-num', 'pip-br-num'].forEach(id => document.getElementById(id).textContent = pipNum);
    ['pip-tl-suit', 'pip-br-suit'].forEach(id => document.getElementById(id).textContent = pipSym);
    document.getElementById('CardTitle').textContent = cardDef.title;
    document.getElementById('CardText').textContent  = resolvedText;
    document.getElementById('card-ai-badge').classList.toggle('hidden', !cardDef.ai);
    refreshHistoryCardAssignee(entry);
    document.getElementById('card-timer').classList.add('hidden');
    document.getElementById('long-timer-wrap').classList.add('hidden');
    const panel = document.getElementById('card-panel');
    const flipper = document.getElementById('card-flipper');
    panel.classList.remove('hidden');
    flipper.style.transition = 'none';
    flipper.classList.remove('is-flipped');
    void flipper.offsetWidth;
    flipper.style.transition = '';
    flipper.classList.add('is-flipped');
    document.getElementById('rules-panel').classList.add('hidden');
    document.getElementById('rules-toggle').classList.remove('hidden');
    document.getElementById('rules-toggle').textContent = 'Show Rules';
    document.getElementById('back-to-card').classList.toggle('hidden', !lastCard || entry === lastCard);
}

function refreshHistoryCardAssignee(entry) {
    const assigneeEl   = document.getElementById('card-assignee');
    const namePickerEl = document.getElementById('name-picker');
    if (entry.assignee) {
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
    document.getElementById('history-btn').classList.toggle('hidden', history.length === 0);
}

function openHistory() {
    const list = document.getElementById('history-list');
    list.innerHTML = '';
    if (history.length === 0) {
        list.innerHTML = '<div class="history-empty">No cards drawn yet.</div>';
    } else {
        history.forEach(entry => {
            const el = document.createElement('div');
            el.className = 'history-item history-item--tappable';
            el.setAttribute('role', 'button');
            el.setAttribute('tabindex', '0');
            el.innerHTML = `
                <div class="history-num">#${entry.cardDef.number}</div>
                <div class="history-info">
                    <div class="history-card-title">${entry.cardDef.title}</div>
                    <div class="history-card-player">${entry.assignee || 'Unassigned'}</div>
                </div>
                <div class="history-item-arrow">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                </div>`;
            const viewCard = () => {
                document.getElementById('history-overlay').classList.add('hidden');
                entry === lastCard ? renderCard(entry, false) : renderHistoryCard(entry);
            };
            el.addEventListener('click', viewCard);
            el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') viewCard(); });
            list.appendChild(el);
        });
    }
    document.getElementById('history-overlay').classList.remove('hidden');
}

// ── Draw cooldown ─────────────────────────────────────────────────────────────

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


document.getElementById('draw').addEventListener('click', function () {
    if (this.dataset.mode === 'reset') { resetAll(); this.dataset.mode = ''; this.textContent = 'Draw Card'; return; }
    let cardDef; let isDeckEmpty = false;
    if (deck.length === 0) {
        isDeckEmpty = true;
        cardDef = { number: '??', timer: TIMER.NONE, title: 'Out of Cards', text: "The deck is empty. You get a free pass while it's reloaded." };
    } else {
        const idx = randomIndex(deck);
        cardDef = deck[idx];
        deck.splice(idx, 1);
        saveState(deck);
    }
    const resolvedText = resolveCardText(cardDef);
    const entry = { cardDef, resolvedText, assignee: null };
    lastCard = entry;
    if (!isDeckEmpty) { history.unshift(entry); saveHistory(history); updateHistoryBtn(); }
    updateCounter();
    renderCard(entry, true);
    if (isDeckEmpty) { this.textContent = 'Reload Deck'; this.dataset.mode = 'reset'; }
    else { startDrawCooldown(this); }
    try { navigator.vibrate(40); } catch (e) {}
});

document.querySelector('.footer').addEventListener('click', function(e) {
    const btn = e.target.closest('#rules-toggle');
    if (!btn) return;
    buildNameChips();
    showRules();
});

document.getElementById('back-to-card').addEventListener('click', () => { if (lastCard) renderCard(lastCard, false); });
document.getElementById('card-timer-start').addEventListener('click', startShortTimer);
document.getElementById('long-timer-start').addEventListener('click', () => { if (lastCard && lastCard.cardDef.timer === TIMER.LONG) startLongTimer(lastCard.cardDef, lastCard.assignee); });
document.getElementById('history-btn').addEventListener('click', openHistory);
document.getElementById('history-close').addEventListener('click', () => { document.getElementById('history-overlay').classList.add('hidden'); });
document.getElementById('history-overlay').addEventListener('click', function (e) { if (e.target === this) this.classList.add('hidden'); });
document.getElementById('reset').addEventListener('click', () => { document.getElementById('confirm-overlay').classList.remove('hidden'); });
document.getElementById('confirm-yes').addEventListener('click', () => { document.getElementById('confirm-overlay').classList.add('hidden'); resetAll(); });
document.getElementById('confirm-no').addEventListener('click', () => { document.getElementById('confirm-overlay').classList.add('hidden'); });
document.getElementById('confirm-overlay').addEventListener('click', function (e) { if (e.target === this) this.classList.add('hidden'); });
document.getElementById('clear-cookies-btn').addEventListener('click', () => { document.getElementById('cookie-confirm-overlay').classList.remove('hidden'); });
document.getElementById('cookie-confirm-yes').addEventListener('click', () => { document.getElementById('cookie-confirm-overlay').classList.add('hidden'); clearAllData(); });
document.getElementById('cookie-confirm-no').addEventListener('click', () => { document.getElementById('cookie-confirm-overlay').classList.add('hidden'); });
document.getElementById('cookie-confirm-overlay').addEventListener('click', function (e) { if (e.target === this) this.classList.add('hidden'); });

init();
