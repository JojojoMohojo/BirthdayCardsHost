// Add these functions at the beginning of your file
function saveStateToCookies() {
    document.cookie = "cardList=" + JSON.stringify(cardList) + "; path=/";
    document.cookie = "remainingCards=" + cardList.length + "; path=/";
}

function getCookie(name) {
    let cookieArr = document.cookie.split(";");
    for (let i = 0; i < cookieArr.length; i++) {
        let cookiePair = cookieArr[i].split("=");
        if (name == cookiePair[0].trim()) {
            return decodeURIComponent(cookiePair[1]);
        }
    }
    return null;
}

function loadStateFromCookies() {
    const savedCardList = getCookie("cardList");
    if (savedCardList) {
        cardList = JSON.parse(savedCardList);
    } else {
        cardList = defaultCardList;
    }
    document.getElementById("remainingCards").textContent = cardList.length;
}

// Call this function after every state change
document.getElementById("draw").addEventListener("click", function() {
    const drawButton = this;
    document.getElementById("Rules").classList.add("hidden");
    var card;
    if (cardList.length == 0) {
        card = {
            title: "Out of Cards",
            text: "You get a free pass while the deck is reloaded",
            number: "??"
        };
    } else {
        const ranNum = getRandomObjectFromArray(cardList);
        card = cardList[ranNum];
        cardList.splice(ranNum, 1);
    }
    document.getElementById("CardTitle").textContent = card.title;
    document.getElementById("CardText").textContent = card.text;
    document.getElementById("CardNumber").textContent = "#" + card.number;
    document.getElementById("Card").classList.remove("hidden");
    document.getElementById("rules").classList.remove("hidden");
    document.getElementById("remainingCards").textContent = cardList.length;

    // Save state to cookies
    saveStateToCookies();

    // Disable the button for 5 seconds
    drawButton.disabled = true;
    setTimeout(function() {
        console.log("button is back online");
        drawButton.disabled = false;
    }, 5000); // 5 seconds in milliseconds
});

document.getElementById("rules").addEventListener("click", function() {
    document.getElementById("Card").classList.add("hidden");
    document.getElementById("Rules").classList.remove("hidden");
    document.getElementById("rules").classList.add("hidden");
});

function getRandomObjectFromArray(array) {
    return Math.floor(Math.random() * array.length);
}

// function return random Pokemon generation for card 5
function getRandomNumber(min, max) {
    switch (Math.floor(Math.random() * (max - min + 1)) + min) {
        case 1:
            return "1st";
        case 2:
            return "2nd";
        case 3:
            return "3rd";
    }
}

// Initialize the state
var defaultCardList = [
    {
        title: "It's not 11 o'clock yet!",
        text: "Tom is still working overtime and can't drink. Everyone down his drink for him so he can focus on work",
        number: 1
    },
    {
        title :"The Classic Attire",
        text: "He never leaves the house without it. You have to wear Tom's hawaiian shirt. Or take a shot of spirit",
        number: 2
    },
    {
        title: "Hannah's quiz time",
        text: "Hannah asks question about Tom, if you get it wrong someone else can answer, then you have to down half your drink",
        number :3
    },
    {
        title: "Big man's choice",
        text: "You and Tom decide the next drink everyone has to order at the next pub",
        number: 4
    },
    {
        title: "Who's that pokemon?",
        text: "You must pretend to be a pokemon from the " + getRandomNumber(1, 3) + " generation, so Tom can guess. If Tom can't guess correctly within 15 seconds, Tom must draw the pokemon onto your arm",
        number: 5
    },
    {
        title: "Guitar Hero pro",
        text: "Tom loves to belt out some tunes on the Wii. Let the group record a new ring tone for you and leave your phone on loud speaker for the rest of the night, or down your drink and the drink of someone else",
        number: 6
    },
    {
        title: "You gotta open that case boy",
        text: "You just opened a CS2 case, but since it's Tom's birthday he deserves a reward. Transfer Tom a skin from your inventory. (If you do not play CS2, buy Tom a drink)",
        number: 7
    },
    {
        title: "Squirtle squirtle!",
        text: "You little squirtle. Neck a pint of water in one go or take a shot",
        number: 8
    },
    {
        title: "Chance time!",
        text: "You landed on a Chance time space. Swap everyone's drinks around, you get to choose who gets what",
        number: 9
    },
    {
        title: "In the doghouse",
        text: "You've drank too much and are snoring loudly. Hannah is making you sleep on the sofa tonight. You have to finish your drink on a table by yourself",
        number: 10
    },
    {
        title: "Back in action",
        text: "Just like Tom, your legs are now stronger than ever! Choose someone to carry to the next pub. They cannot have been picked before",
        number: 11
    },
    {
        title: "Epic gamer moment",
        text: "You are an epic gamer my guy. You must wear the gamer shirt until someone else draws this card or decides to wear it themselves. If you decline, take a shot of spirit. (You are NOT allowed to say the gamer word)",
        number: 12
    },
    {
        title:"Super Smash Bros.",
        text: "It's a game of categories, but the only category allowed is Super Smash Bros characters. You start. Loser takes 3 drinks",
        number: 13
    },
    {
        title: "Drink for the fallen",
        text: "Take a drink for each person who has gone home. If no-one has left yet, down your drink as a toast in advance",
        number: 14
    },
    {
        title: "Strong bones!",
        text: "Don't end up like Tom with rickets. Drink a glass of milk, and you must finish it before you can return to your drink",
        number: 15
    },
    {
        title: "No. 5 Large",
        text: "Tom has gotten too drunk. Perk him up with the saviour food, Mr Cod. (Or similar if not possible)",
        number: 16
    },
    {
        title: "Liam's round",
        text: "Liam is buying your next drink but has forgotten your order. Drink whatever he brings back for you. (Liam does not have to pay for you unless he's feeling nice)",
        number: 17
    },
    {
        title:"Tommy says",
        text:"The group must only drink with your non-dominant hand for this pub. Anyone caught out takes a drink. (With their non-dominant hand you mug)",
        number:18
    },
    {
        title: "Sleeping with both eyes open",
        text: "You drank so much last night you slept with your eyes open, now they're all sticky and bloodshot. Anyone who looks you in the eyes for the next 5 minutes must take a drink",
        number: 19
    },
    {
        title: "Here's my spout",
        text: "Top up Tom's drink with your own, acting like a teapot",
        number: 20
    },
    {
        title: "Well that's written off...",
        text: "Tom just hit ANOTHER deer on the road and now his car is totalled. He must buy you a drink as thanks for driving him around",
        number: 21
    },
    {
        title: "Rawr xD",
        text: "No one really understood secondary school emo Tom, but you can feel a little closer to how he felt if you don the wig and sing/shout 'Can you feel my heart'",
        number: 22
    },
    {
        title: "Absolute bullshit",
        text: "It's time for a Mario Party mini-game! Give your best impression of a Mario Party character, and Tom has to guess. If Tom can't guess correctly within 15 seconds, you must both take 3 drinks",
        number: 23
    },
    {
        title: "Monttttyyyyyy!",
        text: "Monty burnt a penis into the roof of Tom's car, now he's drawing one on you. Let Monty draw a penis onto a place of your choosing. (Must be visible)",
        number: 24
    },
    {
        title: "Horses don't have hands!",
        text: "Tom is a horse. Horses, don't have hands. Feed Tom the rest of his drink",
        number: 25
    },
    {
        title: "Bloody bastard",
        text: "You tried to give Tom birthday beats, but you've realized you're Ed Brown! Tom gets to give you 26 birthday beats",
        number: 26
    },
    {
        title: "Pokemon trivia",
        text: "Ask Tom a question about Pokemon. If he gets it right, you have to buy him his favourite drink. If he gets it wrong, you can buy him any drink",
        number: 27
    },
    {
        title: "Back at BCOT",
        text: "Tom's used to love his white chocolate starbucks at college. Order and drink a white mocha from the bar. If you can't get one, order and drink a black coffee, Tom loves those now",
        number :28
    },
    {
        title: "Pummel Party",
        text: "You picked up an Arcade Challenge! Challenge someone to a game of pong, loser buys the winner a drink (Joe has the app on his phone)",
        number:29
    },
    {
        title: "Short shorts",
        text: "Tom wore his tight chino shorts out and has ripped them, revealing his bussy. Poke him in the arse quick!",
        number: 30
    },
    {
        title: "Blue moon!",
        text: "Tom has finally shown up on Discord! What a treat! Buy yourself a Blue Moon or a Blue Lagoon to drink",
        number: 31
    },
    {
        title: "5v5",
        text: "Challenge the person sat closest opposite to you to Rock, Paper, Scissors. Loser downs their drink. Best of 3",
        number: 32
    },
    {
        title: "Tom's favourite meme",
        text: "Keep your toddlers on a leash! Go ask for 'The Pitbull of Drinks' at the bar and enjoy it",
        number: 33
    },
    {
        title: "Butt text, sorry!",
        text: "Tom sat on your phone and somehow managed to send a text on it. Tom is allowed to send one text to anyone on your phone (excluding work and parents). If you refuse, take a shot",
        number : 34
    }
];

var cardList = defaultCardList;

// Load the initial state
loadStateFromCookies();

window.onload = function() {
    loadStateFromCookies();
};
