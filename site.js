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
        document.getElementById("remainingCards").textContent = cardList.length;
    } else {
        cardList = defaultCardList;
    }
}

// Call this function after every state change
document.getElementById("draw").addEventListener("click", function() {
    const drawbutton = this;
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
    drawbutton.disabled = true;
    setTimeout(function() {
        console.log("button is back online");
        drawbutton.disabled = false;
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
    // Your existing card definitions...
];

var cardList = defaultCardList;

// Load the initial state
loadStateFromCookies();

window.onload = function() {
    loadStateFromCookies();
};
