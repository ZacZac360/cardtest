const ELEMENTS = ["Fire", "Water", "Lightning", "Earth", "Wind", "Wood"];

const STRONG_AGAINST = {
  Fire: "Wood",
  Water: "Fire",
  Lightning: "Water",
  Earth: "Lightning",
  Wind: "Earth",
  Wood: "Wind"
};

const CARD_COLORS = {
  Fire: ["#ff8a65", "#b71c1c"],
  Water: ["#64b5f6", "#0d47a1"],
  Lightning: ["#ffe082", "#f9a825"],
  Earth: ["#c7a16a", "#6d4c41"],
  Wind: ["#80deea", "#006064"],
  Wood: ["#81c784", "#1b5e20"],
  Wild: ["#d1c4e9", "#512da8"]
};

function makeId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

function createNormalCard(element, value) {
  return {
    id: makeId(),
    kind: "normal",
    element,
    value,
    name: `${element} ${value}`
  };
}

function createPlus2(element) {
  return {
    id: makeId(),
    kind: "plus2",
    element,
    value: null,
    name: `+2 ${element}`
  };
}

function createPlus4() {
  return {
    id: makeId(),
    kind: "plus4",
    element: "Wild",
    value: null,
    name: "+4 Wild"
  };
}

function shuffle(array) {
  const a = [...array];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildDeck() {
  const deck = [];

  // 60 normal cards: 6 elements x 1..10
  for (const element of ELEMENTS) {
    for (let value = 1; value <= 10; value++) {
      deck.push(createNormalCard(element, value));
    }
  }

  // 12 duplicate normals to help hit 80 total
  for (const element of ELEMENTS) {
    deck.push(createNormalCard(element, 5));
    deck.push(createNormalCard(element, 8));
  }

  // 6 +2 element cards
  for (const element of ELEMENTS) {
    deck.push(createPlus2(element));
  }

  // 4 +4 wild cards
  deck.push(createPlus4());
  deck.push(createPlus4());
  deck.push(createPlus4());
  deck.push(createPlus4());

  return shuffle(deck);
}

function getCardGradient(card) {
  if (card.kind === "plus4") {
    if (!card.chosenElement) {
      return `linear-gradient(180deg, #181818, #000000)`;
    }

    const [a, b] = CARD_COLORS[card.chosenElement] || CARD_COLORS.Wild;
    return `linear-gradient(180deg, ${a}, ${b})`;
  }

  const key = card.element === "Wild" ? "Wild" : card.element;
  const [a, b] = CARD_COLORS[key] || CARD_COLORS.Wild;
  return `linear-gradient(180deg, ${a}, ${b})`;
}

function compareElements(challenger, defender) {
  if (!challenger || !defender) return "neutral";
  if (challenger === "Wild" || defender === "Wild") return "neutral";
  if (STRONG_AGAINST[challenger] === defender) return "strong";
  if (STRONG_AGAINST[defender] === challenger) return "weak";
  return "neutral";
}