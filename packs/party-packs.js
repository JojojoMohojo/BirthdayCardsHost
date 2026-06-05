'use strict';

const PARTY_PACKS = [
    {
        id: 'beer-fest',
        name: 'Beer Fest',
        description: 'A pack for the beer festivals',
        drawRules: [
            "You go to the loo",
            "You point at someone",
            "Place your drink within a thumb's length of the table"
        ],
        othersDrawRules: [
            "You finish your drink",
            "You get a sticker on the dog mascot"
        ],
        cards: [
            {
                number: 1,
                timer: 'none',
                good: false,
                title: "It's the Police",
                text: "Stop you violated the law! You must be handcuffed to whoever last drew this card. If you're the first you must wait for someone else to draw it"
            },
            {
                number: 2,
                timer: 'short',
                timerSeconds: 30,
                good: false,
                title: "Down That Beer",
                text: "Down that tiny glass soldier. You have 30s"
            },
            {
                number: 3,
                timer: 'long',
                timerSeconds: 600,
                good: true,
                title: "The Heaven Master",
                text: "You are the heaven master. After you point to the sky the last player to do so must take 2 sips"
            },
            {
                number: 4,
                timer: 'none',
                good: true,
                title: "What'll it be me lord",
                text: "Everyone looks to you for guidance, what should everyone's next drink be"
            },
            {
                number: 5,
                timer: 'none',
                good: false,
                title: "Epic Gamer Moment",
                text: "You must wear the cringe gamer top until someone else draws this card"
            },
            {
                number: 6,
                timer: 'none',
                good: false,
                title: "Evil Beer Twin",
                text: "The person opposite you gets to choose your next drink"
            },
            {
                number: 7,
                timer: 'none',
                title: "CHANGE PLACES!!",
                text: "Okay don't change places, just move everyone's beer one place to the left"
            },
            {
                number: 8,
                timer: 'none',
                good: false,
                title: "Sticker Ninja",
                text: "You must put a sticker on a random person without them noticing or down your drink"
            },
            {
                number: 9,
                timer: 'none',
                good: false,
                title: "You Must Confess",
                text: "Go tell a person not playing the game a deep secret, if the stranger doesn't agree it is juicy then you must draw another card and down your drink"
            },
            {
                number: 10,
                timer: 'long',
                timerSeconds: 300,
                good: false,
                title: "You So Dumb Dumb",
                text: "You can only speak in monosyllabic words for 5 mins. Take a drink per extra syllable"
            },
            {
                number: 11,
                timer: 'none',
                title: "Categories",
                text: "Play a game of categories, last person standing gives out 3X3 sips"
            },
            {
                number: 12,
                timer: 'none',
                good:false,
                title: "Gotta Let Your Nails Dry",
                text: "No touching your drink, someone must feed you the rest of your drink"
            },
            {
                number: 13,
                timer: 'none',
                good:true,
                title: "Michelangelo",
                text: "Your art skills are impeccable, you get to draw a tattoo on a player of your choice"
            },
            {
                number: 14,
                timer: 'none',
                good: true,
                title: "Potion Master",
                text: "Mix your drink into someone else's to create a new drink for them"
            },            
            {
                number: 15,
                timer: 'long',
                timerSeconds: 180,
                title: "Everyone's Medusa",
                text: "If you look anyone in the eyes, they must draw a card"
            }
        ]
    }
];
