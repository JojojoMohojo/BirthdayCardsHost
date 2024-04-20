document.getElementById("draw").addEventListener("click", function() {
    const drawbutton = this;
    document.getElementById("Rules").classList.add("hidden");
    var card;
    if(cardList.length == 0){
        card = {
            "title":"Out of Cards",
            "text":"You get a free pass while the deck is reloaded",
            "number":"??"
        }
    } else {
        const ranNum = getRandomObjectFromArray(cardList);
        card = cardList[ranNum];
        cardList.splice(ranNum,1);
    }
    document.getElementById("CardTitle").textContent = card.title;
    document.getElementById("CardText").textContent = card.text;
    document.getElementById("CardNumber").textContent = "#" + card.number;
    document.getElementById("Card").classList.remove("hidden");
    document.getElementById("rules").classList.remove("hidden");
    document.getElementById("remainingCards").textContent = cardList.length;

    // Disable the button for 10 seconds
    drawbutton.disabled = true;
    setTimeout(function(e) {
        console.log("button is back online")
        drawbutton.disabled = false;
    }, 5000); // 5 seconds in milliseconds
});

document.getElementById("rules").addEventListener("click", function() {
    document.getElementById("Card").classList.add("hidden");
    document.getElementById("Rules").classList.remove("hidden");
    document.getElementById("rules").classList.add("hidden");
});

function getRandomObjectFromArray(array) {
    return randomIndex = Math.floor(Math.random() * array.length);
}

var cardList = [
    {
        "title":"Baldy baldy baldy ",
        "text":"Male pattern baldness got you down, just shave it all off. Wear the bald cap, if you remove the bald cap before someone else draws this card you must do a shot",
        "number":1
    },
    {
        "title":"Ellen's Quiz Time",
        "text":"Duh duh duh, it's Ellen quiz time. She will ask a question about Matt, get it wrong but someone else then gets it correct, you must drink half your drink",
        "number":2
    },
    {
        "title":"Tattoo time",
        "text":"You are jealous of Matt's sick ink, get one of Matt's tattoos done with a Sharpie, your choice which one and where",
        "number":3
    },
    {
        "title":"King of Burghfield",
        "text":"You're the king of a small village, time to throw your weight around. Choose a drink, everyone has to order that as their next drink",
        "number":4
    },
    {
        "title":"God tier Moustache",
        "text":"Matt has an amazing tache, you should draw one on to be just like him. If you already have one you don't have to do anything ... except remove that beard. Forfitting this is worth 2 shots",
        "number":5
    },
    {
        "title":"Dj Lil Honks",
        "text":"Wicka wicka, let the group record a new ring tone for you and leave your phone on loud for the rest of the night or down your drinks and another person's",
        "number":6
    },
    {
        "title":"Where's my phone?",
        "text":"ooopies you left your phone alone in a room with Matt, he can send one text to anyone on your phone (excluding work and parents). If you refuse take a shot",
        "number":7
    },
    {
        "title":"Matt facts",
        "text":"Matt's facts have a tendency to be fake, give him a cool new fact on the topic of his choice. If he likes your fact you can give out a drink, else you must drink.",
        "number":8
    },
    {
        "title":"Lil honkys training school",
        "text":"Everything you say for the next 10 mins must be spoken in rhymes, each time you fail take a sip, or a shot to remove this curse",
        "number":9
    },
    {
        "title":"Lil froggy boy",
        "text":"Matt likes frogs, frogs like water and so do you. Neck a pint of water, you must finish it in one go or else you have to do a shot you naughty frog.",
        "number":10
    },
    {
        "title":"I go to the gym, do you?",
        "text":"Matt goes to the gym and is super buff. For each push up over 10 you can do, give out that many sips. For each one under 10 drink that many.",
        "number":11
    },
    {
        "title":"Matt has Fridays off ",
        "text":"So should you, but it's a Saturday, either way chill, this card is a freebie",
        "number":12
    },
    {
        "title":"Al does the griddy",
        "text":"If Al is here he must do the griddy, otherwise you have to and you have to take 3 sips as you have lost Al",
        "number":13
    },
    {
        "title":"Chat mpt",
        "text":"Ask chat gpt to make a drinking game for us to play given our current situation and we must all play it. You are the games leader, let the games begin",
        "number":14
    },
    {
        "title":"You are gay",
        "text":"If you read this card you are gay, order a fancy drink at the bar and let Matt have half cause he's half gay (unless you're monty and then you can have the whole pint) #BiErasure",
        "number":15
    },
    {
        "title":"Change places",
        "text":"You get to swap everyone's drinks around, everyone must end up with a different drink. Choose who gets whose.",
        "number":16
    },
    {
        "title":"Only child",
        "text":"Matt's an only child and so now are you. You must go finish your drink on a table by yourself and you can't come back until it's finished",
        "number":17
    },
    {
        "title":"You've skipped leg day",
        "text":"Matt always skips leg day but not today. Choose someone to carry to the next pub. They cannot have been picked before. 1 sip per time you stop. You're not allowed to move without carrying them",
        "number":18
    },
    {
        "title":"Naughty vapers",
        "text":"Won't you think of the planet, if you bought a vape out today you must finish your drink. Unless someone has asked for some of it, then they must finish your drink",
        "number":19
    },
    {
        "title":"Vest time",
        "text":"Matt loves a vest so wear one for him (one will be supplied), this vest cannot be removed until someone else draws this. The vest must be the top layer. If you choose to wear the vest over the top of your clothes you must draw another card",
        "number":20
    },
    {
        "title":"Ooooh so spicy",
        "text":"Matt loves his spice cause he's so hard. Prove that you are hard by doing a shot of hot sauce (or the closest condiment)",
        "number":21
    },
    {
        "title":"Ben Ten Time",
        "text":"It's a game of categories but the only category allowed is Ben10 aliens, you start",
        "number":22
    },
    {
        "title":"Fallen soldiers",
        "text":"It's sad to see so many fallen soldiers, you must take a drink for each person who has now gone home. Chris and Lewis count as they died before the battle even started",
        "number":23
    },
    {
        "title":"Sneeze Sneeze Cough Cough",
        "text":"Oh no you've just got a cat but you're allergic. What a stupid thing to do! Better get a glass of milk for that cat tho (and drink it, the cat doesn't deserve any milk)",
        "number":24
    },
    {
        "title":"How many plants??",
        "text":"Matt has lots of plants but you should get some too, order a salad and eat the whole thing!",
        "number":25
    },
    {
        "title":"Brainy boy chess time",
        "text":"Ask the barman for the 'Queen of drinks', you must drink whatever they get you",
        "number":26
    },
    {
        "title":"Ahoy nerds it's DND time",
        "text":"I cast fireball, roll a D20, that's how many time you must drink",
        "number":27
    },
    {
        "title":"Your are Matt's friend",
        "text":"If you're Matt's friend you probably have autism. Avoid eye contact, if anyone looks you in the eyes for the next 15 mins they must take (n+1) drinks where n is the number of people who have previously looked you in the eyes",
        "number":28
    },
    {
        "title":"Food Snob",
        "text":"Eww you little food snob, order a vodka and cordial you posh boy",
        "number":29
    },
    {
        "title":"Insurance Payout",
        "text":"Matt has just had his insurance pay out for his car, time to share that wealth, he'll buy you a drink",
        "number":30
    },
    {
        "title":"Yikes you're losing muscle mass",
        "text":"Bro you're becoming so skinny, pick someone to feed you the rest of your drink as it's too heavy for your little arms",
        "number": 31
    },
    {
        "title":"Snap you're back working at the pub",
        "text":"Finish anyone who's got 2 fingers or less, finish them and take them to the bar",
        "number": 32
    },
    {
        "title":"Look after the Grand Autismo",
        "text":"Trouble in lego city, Mr Paul has fallen in the big sads, any time he would have to drink you have to instead",
        "number": 33
    },
    {
        "title":"7 years of straight pain",
        "text":"Matt lived with the pooper for 7 years, but now he's your room mate. Link arms with K-Dwag until you both finish your drinks",
        "number": 34
    },
    {
        "title":"It's Ellen's birthday too",
        "text":"It's the little goblins birthday, pub her a drink at this pub and she'll get your next one",
        "number":35
    }
]