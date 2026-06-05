'use strict';
// TIMER and PACKS are defined in ../../packs/packs.js (loaded before this file)

let pmPack = null;
let pmCards = [];
let pmDrawRules = [];
let pmOthersRules = [];
let pmTab = 'cards';

function pmFmt(s) {
    if (s >= 60) { const m = Math.floor(s / 60), r = s % 60; return r ? `${m}m ${r}s` : `${m}m`; }
    return `${s}s`;
}

// ── Storage ───────────────────────────────────────────────────────────────────

function pmCardsKey() { return `pubCrawl_${pmPack.id}_cards`; }
function pmRulesKey() { return `pubCrawl_${pmPack.id}_rules`; }

function pmLoadCards() {
    try {
        const raw = localStorage.getItem(pmCardsKey());
        if (raw) return JSON.parse(raw);
    } catch (e) {}
    return pmPack.cards.map(c => ({ ...c }));
}

function pmSaveCards() {
    localStorage.setItem(pmCardsKey(), JSON.stringify(pmCards));
}

function pmLoadRules() {
    try {
        const raw = localStorage.getItem(pmRulesKey());
        if (raw) {
            const p = JSON.parse(raw);
            if (p && p.draw) return { draw: p.draw, others: p.others || [] };
        }
    } catch (e) {}
    return {
        draw: pmPack.drawRules.map(r => ({ ...r })),
        others: pmPack.othersDrawRules.map(r => ({ ...r }))
    };
}

function pmSaveRules() {
    localStorage.setItem(pmRulesKey(), JSON.stringify({ draw: pmDrawRules, others: pmOthersRules }));
}

// ── Open / Close ──────────────────────────────────────────────────────────────

function openPackManager(packId) {
    pmPack = PACKS.find(p => p.id === packId);
    if (!pmPack) return;
    pmCards = pmLoadCards();
    const r = pmLoadRules();
    pmDrawRules = r.draw;
    pmOthersRules = r.others;
    document.getElementById('pm-title').textContent = pmPack.name;
    switchPMTab('cards');
    document.getElementById('pm-overlay').classList.remove('hidden');
}

function closePackManager() {
    document.getElementById('pm-overlay').classList.add('hidden');
}

function switchPMTab(tab) {
    pmTab = tab;
    document.querySelectorAll('.pm-tab').forEach(t =>
        t.classList.toggle('pm-tab--active', t.dataset.tab === tab)
    );
    tab === 'cards' ? renderPMCards() : renderPMRules();
}

// ── Cards tab ─────────────────────────────────────────────────────────────────

function renderPMCards() {
    const body = document.getElementById('pm-body');
    body.innerHTML = '';

    const list = document.createElement('div');
    list.className = 'pm-list';

    if (pmCards.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'pm-empty';
        empty.textContent = 'No cards yet.';
        list.appendChild(empty);
    } else {
        pmCards.forEach((card, i) => {
            const el = document.createElement('div');
            el.className = 'pm-item';
            renderPMCardView(el, card, i);
            list.appendChild(el);
        });
    }

    body.appendChild(list);
    body.appendChild(buildPMAddCardForm());
}

function renderPMCardView(el, card, i) {
    el.innerHTML = '';
    el.classList.remove('pm-item--editing');

    const num = document.createElement('span');
    num.className = 'pm-num';
    num.textContent = card.number;

    const info = document.createElement('div');
    info.className = 'pm-info';
    const title = document.createElement('div'); title.className = 'pm-item-title'; title.textContent = card.title;
    const text  = document.createElement('div'); text.className  = 'pm-item-text';  text.textContent = card.text || '';
    info.appendChild(title);
    info.appendChild(text);

    const metaParts = [];
    if (card.timer !== TIMER.NONE) metaParts.push(`${pmFmt(card.timerSeconds || 0)} timer`);
    if (card.ai) metaParts.push('✦ AI');
    if (metaParts.length) {
        const meta = document.createElement('div');
        meta.className = 'pm-item-meta';
        meta.textContent = metaParts.join(' · ');
        info.appendChild(meta);
    }

    const editBtn = document.createElement('button');
    editBtn.className = 'pm-icon-btn';
    editBtn.setAttribute('aria-label', 'Edit card');
    editBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>';
    editBtn.addEventListener('click', () => startPMEditCard(i, el));

    const delBtn = document.createElement('button');
    delBtn.className = 'pm-icon-btn pm-icon-btn--del';
    delBtn.setAttribute('aria-label', 'Remove card');
    delBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
    delBtn.addEventListener('click', () => { pmCards.splice(i, 1); pmSaveCards(); renderPMCards(); });

    el.appendChild(num);
    el.appendChild(info);
    el.appendChild(editBtn);
    el.appendChild(delBtn);
}

function startPMEditCard(index, el) {
    const card = pmCards[index];
    el.innerHTML = '';
    el.classList.add('pm-item--editing');

    const titleIn = document.createElement('input');
    titleIn.type = 'text'; titleIn.value = card.title; titleIn.className = 'pm-input'; titleIn.placeholder = 'Card title…'; titleIn.maxLength = 100;

    const textArea = document.createElement('textarea');
    textArea.value = card.text || ''; textArea.className = 'pm-textarea'; textArea.rows = 3; textArea.maxLength = 500; textArea.placeholder = 'Card text…';

    const timerSel = buildTimerSelect(card.timer || TIMER.NONE);
    const { opts: timerOpts, secsIn, labelIn } = buildTimerOpts(card.timerSeconds, card.timerLabel, card.timer);
    timerSel.addEventListener('change', () => {
        timerOpts.classList.toggle('hidden', timerSel.value === 'none');
        labelIn.classList.toggle('hidden', timerSel.value !== 'long');
    });

    const aiRow = document.createElement('label'); aiRow.className = 'pm-ai-row';
    const aiChk = document.createElement('input'); aiChk.type = 'checkbox'; aiChk.className = 'pm-ai-check'; aiChk.checked = !!card.ai;
    const aiLbl = document.createElement('span'); aiLbl.className = 'pm-small-label'; aiLbl.textContent = 'AI generated';
    aiRow.appendChild(aiChk); aiRow.appendChild(aiLbl);

    const actions = document.createElement('div'); actions.className = 'pm-edit-actions';

    const saveBtn = document.createElement('button'); saveBtn.className = 'pm-add-btn'; saveBtn.textContent = 'Save';
    saveBtn.addEventListener('click', () => {
        const t = titleIn.value.trim(); if (!t) return;
        pmCards[index] = {
            number: card.number, title: t, text: textArea.value.trim(),
            ...resolveTimerFields(timerSel.value, secsIn, labelIn, t),
            ai: aiChk.checked
        };
        pmSaveCards(); renderPMCards();
    });

    const cancelBtn = document.createElement('button'); cancelBtn.className = 'pm-cancel-btn'; cancelBtn.textContent = 'Cancel';
    cancelBtn.addEventListener('click', () => renderPMCardView(el, card, index));

    actions.appendChild(cancelBtn); actions.appendChild(saveBtn);
    el.appendChild(titleIn); el.appendChild(textArea); el.appendChild(timerSel); el.appendChild(timerOpts); el.appendChild(aiRow); el.appendChild(actions);
    titleIn.focus();
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function buildPMAddCardForm() {
    const form = document.createElement('div'); form.className = 'pm-add-form';
    const lbl = document.createElement('div'); lbl.className = 'pm-section-label'; lbl.style.marginTop = '0'; lbl.textContent = 'Add new card';
    const titleIn = document.createElement('input'); titleIn.type = 'text'; titleIn.className = 'pm-input'; titleIn.placeholder = 'Card title…'; titleIn.maxLength = 100;
    const textArea = document.createElement('textarea'); textArea.className = 'pm-textarea'; textArea.rows = 3; textArea.maxLength = 500; textArea.placeholder = 'Card text…';
    const timerSel = buildTimerSelect('none');
    const { opts: timerOpts, secsIn, labelIn } = buildTimerOpts(15, '', 'none');
    timerSel.addEventListener('change', () => {
        timerOpts.classList.toggle('hidden', timerSel.value === 'none');
        labelIn.classList.toggle('hidden', timerSel.value !== 'long');
        secsIn.value = timerSel.value === 'short' ? '15' : '60';
    });
    const aiRow = document.createElement('label'); aiRow.className = 'pm-ai-row';
    const aiChk = document.createElement('input'); aiChk.type = 'checkbox'; aiChk.className = 'pm-ai-check';
    const aiLbl = document.createElement('span'); aiLbl.className = 'pm-small-label'; aiLbl.textContent = 'AI generated';
    aiRow.appendChild(aiChk); aiRow.appendChild(aiLbl);
    const btnRow = document.createElement('div'); btnRow.style.cssText = 'display:flex;justify-content:flex-end';
    const addBtn = document.createElement('button'); addBtn.className = 'pm-add-btn'; addBtn.textContent = 'Add Card';
    addBtn.addEventListener('click', () => {
        const title = titleIn.value.trim(), text = textArea.value.trim();
        if (!title || !text) return;
        const maxNum = pmCards.length > 0 ? Math.max(...pmCards.map(c => typeof c.number === 'number' ? c.number : 0)) : 0;
        pmCards.push({ number: maxNum + 1, title, text, ...resolveTimerFields(timerSel.value, secsIn, labelIn, title), ai: aiChk.checked });
        pmSaveCards(); renderPMCards();
    });
    btnRow.appendChild(addBtn);
    form.appendChild(lbl); form.appendChild(titleIn); form.appendChild(textArea); form.appendChild(timerSel); form.appendChild(timerOpts); form.appendChild(aiRow); form.appendChild(btnRow);
    return form;
}

// ── Rules tab (pub crawl: draw + others, with pub numbers) ────────────────────

function renderPMRules() {
    const body = document.getElementById('pm-body');
    body.innerHTML = '';

    const drawLbl = document.createElement('div'); drawLbl.className = 'pm-section-label'; drawLbl.textContent = 'Draw a card if you:';
    body.appendChild(drawLbl);
    body.appendChild(buildRuleList(pmDrawRules, 'draw'));

    const othersLbl = document.createElement('div'); othersLbl.className = 'pm-section-label'; othersLbl.textContent = 'Make someone else draw if you:';
    body.appendChild(othersLbl);
    body.appendChild(buildRuleList(pmOthersRules, 'others'));

    body.appendChild(buildPMAddRuleForm());
}

function buildRuleList(rules, section) {
    const list = document.createElement('div'); list.className = 'pm-list';
    if (rules.length === 0) {
        const e = document.createElement('div'); e.className = 'pm-empty'; e.textContent = 'No rules yet.';
        list.appendChild(e);
        return list;
    }
    rules.forEach((rule, i) => {
        const el = document.createElement('div'); el.className = 'pm-item';
        const pubIn = document.createElement('input');
        pubIn.type = 'number'; pubIn.min = '1'; pubIn.max = '99'; pubIn.value = String(rule.pub);
        pubIn.className = 'pm-pub-badge'; pubIn.setAttribute('aria-label', 'Pub number');
        pubIn.addEventListener('change', () => { rule.pub = Math.max(1, parseInt(pubIn.value, 10) || 1); pmSaveRules(); });
        const text = document.createElement('span'); text.className = 'pm-rule-text'; text.textContent = rule.text;
        const delBtn = document.createElement('button'); delBtn.className = 'pm-icon-btn pm-icon-btn--del'; delBtn.setAttribute('aria-label', 'Remove');
        delBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
        delBtn.addEventListener('click', () => {
            (section === 'draw' ? pmDrawRules : pmOthersRules).splice(i, 1);
            pmSaveRules(); renderPMRules();
        });
        el.appendChild(pubIn); el.appendChild(text); el.appendChild(delBtn);
        list.appendChild(el);
    });
    return list;
}

function buildPMAddRuleForm() {
    const form = document.createElement('div'); form.className = 'pm-add-form';
    const sectionSel = document.createElement('select'); sectionSel.className = 'pm-select';
    sectionSel.innerHTML = `<option value="draw">Draw a card if you…</option><option value="others">Make someone else draw if you…</option>`;
    const row = document.createElement('div'); row.className = 'pm-row';
    const pubIn = document.createElement('input'); pubIn.type = 'number'; pubIn.min = '1'; pubIn.max = '99'; pubIn.value = '1'; pubIn.className = 'pm-num-input'; pubIn.setAttribute('aria-label', 'Reveal at pub');
    const textIn = document.createElement('input'); textIn.type = 'text'; textIn.className = 'pm-input'; textIn.placeholder = 'Rule text…'; textIn.maxLength = 200;
    const addBtn = document.createElement('button'); addBtn.className = 'pm-add-btn'; addBtn.textContent = 'Add';
    addBtn.addEventListener('click', () => {
        const text = textIn.value.trim(); if (!text) return;
        const pub = Math.max(1, parseInt(pubIn.value, 10) || 1);
        (sectionSel.value === 'draw' ? pmDrawRules : pmOthersRules).push({ text, pub });
        textIn.value = ''; pmSaveRules(); renderPMRules();
    });
    textIn.addEventListener('keydown', e => { if (e.key === 'Enter') addBtn.click(); });
    row.appendChild(pubIn); row.appendChild(textIn); row.appendChild(addBtn);
    form.appendChild(sectionSel); form.appendChild(row);
    return form;
}

// ── Timer helpers ─────────────────────────────────────────────────────────────

function buildTimerSelect(currentVal) {
    const sel = document.createElement('select'); sel.className = 'pm-select';
    sel.innerHTML = `<option value="none">No timer</option><option value="short">Short timer (inline)</option><option value="long">Long timer (background)</option>`;
    sel.value = currentVal;
    return sel;
}

function buildTimerOpts(timerSecs, timerLabel, currentTimer) {
    const opts = document.createElement('div'); opts.className = 'pm-timer-opts';
    opts.classList.toggle('hidden', !currentTimer || currentTimer === TIMER.NONE);
    const secsIn = document.createElement('input');
    secsIn.type = 'number'; secsIn.min = '5'; secsIn.max = '3600'; secsIn.value = String(timerSecs || 15); secsIn.className = 'pm-num-input pm-secs-input'; secsIn.setAttribute('aria-label', 'Seconds');
    const secsLbl = document.createElement('span'); secsLbl.className = 'pm-small-label'; secsLbl.textContent = 'seconds';
    const labelIn = document.createElement('input');
    labelIn.type = 'text'; labelIn.value = timerLabel || ''; labelIn.className = 'pm-input pm-timer-lbl'; labelIn.placeholder = 'Tray label…'; labelIn.maxLength = 50;
    labelIn.classList.toggle('hidden', currentTimer !== TIMER.LONG);
    opts.appendChild(secsIn); opts.appendChild(secsLbl); opts.appendChild(labelIn);
    return { opts, secsIn, labelIn };
}

function resolveTimerFields(type, secsIn, labelIn, fallbackLabel) {
    if (type === 'short') return { timer: TIMER.SHORT, timerSeconds: Math.max(5, parseInt(secsIn.value, 10) || 15) };
    if (type === 'long')  return { timer: TIMER.LONG,  timerSeconds: Math.max(5, parseInt(secsIn.value, 10) || 60), timerLabel: labelIn.value.trim() || fallbackLabel };
    return { timer: TIMER.NONE };
}

// ── Gear button ───────────────────────────────────────────────────────────────

function makeGearBtn(packId) {
    const btn = document.createElement('button');
    btn.className = 'pack-gear-btn';
    btn.setAttribute('aria-label', 'Edit pack');
    btn.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>';
    btn.addEventListener('click', e => { e.stopPropagation(); openPackManager(packId); });
    return btn;
}

// ── Init ──────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('pm-close').addEventListener('click', closePackManager);
    document.getElementById('pm-overlay').addEventListener('click', function (e) {
        if (e.target === this) closePackManager();
    });
    document.querySelectorAll('.pm-tab').forEach(t => {
        t.addEventListener('click', () => switchPMTab(t.dataset.tab));
    });
});
