# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A static, single-page drinking card game built for Tom's birthday. No build step, no framework, no dependencies — open `index.html` directly in a browser. The three files are the entire app:

- `index.html` — structure and all UI elements
- `site.js` — all game logic
- `site.css` — all styles

## Architecture

### Card definitions (`site.js:83`)
All 34 cards live in the `DEFAULT_CARDS` array. Each card object has:
- `number` — unique integer (used for pip display and deduplication across timers)
- `title`, `text` — displayed on the card face
- `textFn` — optional function returning a string, used instead of `text` when the card text needs runtime randomness (e.g. card 5 picks a random Pokémon generation)
- `timer` — one of `TIMER.NONE`, `TIMER.SHORT` (15s inline), or `TIMER.LONG` (background tray timer)
- `timerSeconds`, `timerLabel` — only on `TIMER.LONG` cards

### Player list (`site.js:6`)
`PLAYERS` is a plain array of strings at the top of `site.js`. Edit this before a new event. Players appear as chips on the name-picker inside each drawn card.

### State
- `deck` — cards remaining, stored in `localStorage` as JSON under `birthdayDeckState`; persists across page reloads
- `history` — drawn cards (newest first), stored under `birthdayHistory`; includes the resolved card text and assignee name
- `activeLongTimers` — in-memory only; resets on page reload
- `lastCard` — the currently displayed card entry `{ cardDef, resolvedText, assignee }`

### Timer system
Two timer types, entirely separate:
- **SHORT** — 15s SVG ring countdown shown inline on the card; only one at a time; starts via the "Start 15s timer" button on the card
- **LONG** — background countdown shown in the `#timer-tray` at the top; multiple can run simultaneously; dismissed individually; lost on page reload

### View management
Two mutually exclusive panels inside `.main`: `#rules-panel` and `#card-panel`. Footer buttons (`#rules-toggle`, `#back-to-card`) toggle between them. The draw button becomes "Reload Deck" when the deck is empty, wiring directly into `resetAll()` via `this.dataset.mode`.

### Draw cooldown
After drawing, the draw button is disabled for 5 seconds (`startDrawCooldown`) to prevent accidental rapid draws.

## How to customise for a new event

1. Update `PLAYERS` at the top of `site.js`
2. Edit the card `text`/`title` values in `DEFAULT_CARDS` as needed
3. Update the rules in `index.html` (`#rules-panel`)
4. Change the `<title>` and `.header-title` in `index.html`
