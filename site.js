'use strict';

// ── Helpers ──────────────────────────────────────────────────────────────────

function randomIndex(arr) {
    return Math.floor(Math.random() * arr.length);
}

function randomOrdinal(min, max) {
    const suffixes = { 1: '1st', 2: '2nd', 3: '3rd' };
    const n = Math.floor(Math.random() * (max - min + 1)) + min;
    return suffixes[n] || n + 'th';
}

// ── Storage ───────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'birthdayDeckState';

function saveState(deck) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(deck));
    } catch (e) {
        console.warn('localStorage unavailable, state not saved.', e);
    }
}

function loadState() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) return JSON.parse(raw);
    } catch (e) {
        console.warn('Failed to load state from localStorage.', e);
    }
    return null;
}

function clearState() {
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
        // silent
    }
}

// ── Card Definitions ──────────────────────────────────────────────────────────
// Cards with dynamic content use a `textFn` property (function) instead of `text`.
// This is called at draw time so randomisation happens live, not at load time.

const DEFAULT_CARDS = [
    {
        number: 1,
        title: "It's not 11 o'clock yet!",
        text: "Tom is still working overtime and can't drink. Everyone down his drink for him so he can focus on work"
    },
    {
        number: 2,
        title: "The Classic Attire",
        text: "He never leaves the house without it. You have to wear Tom's hawaiian shirt. Or take a shot of spirit"
    },
    {
        number: 3,
        title: "Hannah's Quiz Time",
        text: "Hannah asks a question about Tom. If you get it wrong, someone else can answer — then you have to down half your drink"
    },
    {
        number: 4,
        title: "Big Man's Choice",
        text: "You and Tom decide the next drink everyone has to order at the next pub"
    },
    {
        number: 5,
        title: "Who's That Pokémon?",
        textFn: () =>
            `You must pretend to be a Pokémon from the ${randomOrdinal(1, 3)} generation so Tom can guess. If Tom can't guess correctly within 15 seconds, Tom must draw the Pokémon onto your arm`
    },
    {
        number: 6,
        title: "Guitar Hero Pro",
        text: "Tom loves to belt out some tunes on the Wii. Let the group record a new ringtone for you and leave your phone on loudspeaker for the rest of the night — or down your drink and someone else's"
    },
    {
        number: 7,
        title: "You Gotta Open That Case Boy",
        text: "You just opened a CS2 case, but since it's Tom's birthday he deserves a reward. Transfer Tom a skin from your inventory. (If you don't play CS2, buy Tom a drink)"
    },
    {
        number: 8,
        title: "Squirtle Squirtle!",
        text: "You little squirtle. Neck a pint of water in one go or take a shot"
    },
    {
        number: 9,
        title: "Chance Time!",
        text: "You landed on a Chance Time space. Swap everyone's drinks around — you choose who gets what"
    },
    {
        number: 10,
        title: "In the Doghouse",
        text: "You've drank too much and are snoring loudly. Hannah is making you sleep on the sofa tonight. You have to finish your drink at a table by yourself"
    },
    {
        number: 11,
        title: "Back in Action",
        text: "Just like Tom, your legs are now stronger than ever! Choose someone to carry to the next pub. They cannot have been picked before"
    },
    {
        number: 12,
        title: "Epic Gamer Moment",
        text: "You are an epic gamer my guy. You must wear the gamer shirt until someone else draws this card or decides to wear it themselves. If you decline, take a shot of spirit. (You are NOT allowed to say the gamer word)"
    },
    {
        number: 13,
        title: "Super Smash Bros.",
        text: "It's a game of categories, but the only category allowed is Super Smash Bros characters. You start. Loser takes 3 drinks"
    },
    {
        number: 14,
        title: "Drink for the Fallen",
        text: "Take a drink for each person who has gone home. If no one has left yet, down your drink as a toast in advance"
    },
    {
        number: 15,
        title: "Strong Bones!",
        text: "Don't end up like Tom with rickets. Drink a glass of milk, and you must finish it before you can return to your drink"
    },
    {
        number: 16,
        title: "No. 5 Large",
        text: "Tom has gotten too drunk. Perk him up with the saviour food, Mr Cod. (Or similar if not possible)"
    },
    {
        number: 17,
        title: "Liam's Round",
        text: "Liam is buying your next drink but has forgotten your order. Drink whatever he brings back for you. (Liam does not have to pay for you unless he's feeling nice)"
    },
    {
        number: 18,
        title: "Tommy Says",
        text: "The group must only drink with their non-dominant hand for this pub. Anyone caught out takes a drink. (With their non-dominant hand, you mug)"
    },
    {
        number: 19,
        title: "Sleeping with Both Eyes Open",
        text: "You drank so much last night you slept with your eyes open, now they're all sticky and bloodshot. Anyone who looks you in the eyes for the next 5 minutes must take a drink"
    },
    {
        number: 20,
        title: "Here's My Spout",
        text: "Top up Tom's drink with your own, acting like a teapot"
    },
    {
        number: 21,
        title: "Well That's Written Off...",
        text: "Tom just hit ANOTHER deer on the road and now his car is totalled. He must buy you a drink as thanks for driving him around"
    },
    {
        number: 22,
        title: "Rawr xD",
        text: "No one really understood secondary school emo Tom, but you can feel a little closer to how he felt if you don the wig and sing/shout 'Can you feel my heart'"
    },
    {
        number: 23,
        title: "Absolute Bullshit",
        text: "It's time for a Mario Party mini-game! Give your best impression of a Mario Party character and Tom has to guess. If Tom can't guess correctly within 15 seconds, you must both take 3 drinks"
    },
    {
        number: 24,
        title: "Monttttyyyyyy!",
        text: "Monty burnt a penis into the roof of Tom's car, now he's drawing one on you. Let Monty draw a penis onto a place of your choosing. (Must be visible)"
    },
    {
        number: 25,
        title: "Horses Don't Have Hands!",
        text: "Tom is a horse. Horses don't have hands. Feed Tom the rest of his drink"
    },
    {
        number: 26,
        title: "Bloody Bastard",
        text: "You tried to give Tom birthday beats, but you've realised you're Ed Brown! Tom gets to give you 26 birthday beats"
    },
    {
        number: 27,
        title: "Pokémon Trivia",
        text: "Ask Tom a question about Pokémon. If he gets it right, you have to buy him his favourite drink. If he gets it wrong, you can buy him any drink"
    },
    {
        number: 28,
        title: "Back at BCOT",
        text: "Tom used to love his white chocolate Starbucks at college. Order and drink a white mocha from the bar. If you can't get one, order and drink a black coffee — Tom loves those now"
    },
    {
        number: 29,
        title: "Pummel Party",
        text: "You picked up an Arcade Challenge! Challenge someone to a game of pong. Loser buys the winner a drink. (Joe has the app on his phone)"
    },
    {
        number: 30,
        title: "Short Shorts",
        text: "Tom wore his tight chino shorts out and has ripped them, revealing his bussy. Poke him in the arse quick!"
    },
    {
        number: 31,
        title: "Blue Moon!",
        text: "Tom has finally shown up on Discord! What a treat! Buy yourself a Blue Moon or a Blue Lagoon to drink"
    },
    {
        number: 32,
        title: "5v5",
        text: "Challenge the person sat closest opposite you to Rock, Paper, Scissors. Loser downs their drink. Best of 3"
    },
    {
        number: 33,
        title: "Tom's Favourite Meme",
        text: "Keep your toddlers on a leash! Go ask for 'The Pitbull of Drinks' at the bar and enjoy it"
    },
    {
        number: 34,
        title: "Butt Text, Sorry!",
        text: "Tom sat on your phone and somehow managed to send a text on it. Tom is allowed to send one text to anyone on your phone (excluding work and parents). If you refuse, take a shot"
    }
];

// ── State ─────────────────────────────────────────────────────────────────────

let deck = [];

function initialiseDeck() {
    const saved = loadState();
    deck = saved !== null ? saved : [...DEFAULT_CARDS];
    updateCounter();
}

function resetDeck() {
    clearState();
    deck = [...DEFAULT_CARDS];
    updateCounter();
    showRules();
}

function updateCounter() {
    document.getElementById('remainingCards').textContent = deck.length;
}

// ── UI ────────────────────────────────────────────────────────────────────────

function showRules() {
    document.getElementById('rules-panel').classList.remove('hidden');
    document.getElementById('card-panel').classList.add('hidden');
    document.getElementById('rules-toggle').classList.add('hidden');
}

function showCard(card) {
    const text = card.textFn ? card.textFn() : card.text;

    document.getElementById('CardNumber').textContent = '#' + card.number;
    document.getElementById('CardTitle').textContent  = card.title;
    document.getElementById('CardText').textContent   = text;

    // Re-trigger animation by cloning the panel
    const panel = document.getElementById('card-panel');
    panel.classList.remove('hidden');
    panel.classList.add('hidden');
    void panel.offsetWidth; // force reflow
    panel.classList.remove('hidden');

    document.getElementById('rules-panel').classList.add('hidden');
    document.getElementById('rules-toggle').classList.remove('hidden');
}

// ── Event Listeners ───────────────────────────────────────────────────────────

document.getElementById('draw').addEventListener('click', function () {
    const btn = this;

    let card;
    if (deck.length === 0) {
        card = {
            number: '??',
            title: 'Out of Cards',
            text: "The deck is empty. You get a free pass while it's reloaded."
        };
    } else {
        const idx = randomIndex(deck);
        card = deck[idx];
        deck.splice(idx, 1);
        saveState(deck);
    }

    updateCounter();
    showCard(card);

    btn.disabled = true;
    setTimeout(() => { btn.disabled = false; }, 5000);
});

document.getElementById('rules-toggle').addEventListener('click', showRules);

document.getElementById('reset').addEventListener('click', function () {
    document.getElementById('confirm-overlay').classList.remove('hidden');
});

document.getElementById('confirm-yes').addEventListener('click', function () {
    document.getElementById('confirm-overlay').classList.add('hidden');
    resetDeck();
});

document.getElementById('confirm-no').addEventListener('click', function () {
    document.getElementById('confirm-overlay').classList.add('hidden');
});

// Close overlay on background tap
document.getElementById('confirm-overlay').addEventListener('click', function (e) {
    if (e.target === this) {
        this.classList.add('hidden');
    }
});

// ── Init ──────────────────────────────────────────────────────────────────────

initialiseDeck();