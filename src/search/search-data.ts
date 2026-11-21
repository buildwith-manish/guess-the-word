// Content for the "Guess the Character from Their Search History" video.
// Clue order: searches[0] is the hardest clue, searches[3] is the easiest.

export type Level = "EASY" | "MEDIUM" | "HARD";

export type Round = {
  id: number; // 1-30
  name: string;
  from: string; // the movie, show, game or franchise it comes from
  level: Level;
  searches: [string, string, string, string];
  hint: [string, string]; // exactly 2 emoji
};

export type Bonus = {
  afterRound: 10 | 20 | 30;
  answer: string;
  from: string;
  searches: [string, string, string];
  options: [string, string, string, string];
  correctIndex: number; // index of the answer inside options
};

export const ROUNDS: Round[] = [
  // EASY
  {
    id: 1,
    name: "Spider-Man",
    from: "Marvel",
    level: "EASY",
    hint: ["🕷️", "🕸️"],
    searches: [
      "how to get sticky stuff off a ceiling",
      "can you swing to work without being late",
      "my aunt thinks I'm always late for a reason",
      "red and blue suit shrinks in the wash",
    ],
  },
  {
    id: 2,
    name: "Batman",
    from: "DC",
    level: "EASY",
    hint: ["🦇", "🌃"],
    searches: [
      "best black paint that hides in the dark",
      "how to hide a cave under a mansion",
      "my butler keeps asking where I go at night",
      "do bats ever get tired of the night",
    ],
  },
  {
    id: 3,
    name: "Mickey Mouse",
    from: "Disney",
    level: "EASY",
    hint: ["🐭", "🏰"],
    searches: [
      "where to buy white gloves in bulk",
      "best cheese for a mouse",
      "round ears hair clip size",
      "how to turn a cartoon mouse into a global brand",
    ],
  },
  {
    id: 4,
    name: "SpongeBob SquarePants",
    from: "Nickelodeon",
    level: "EASY",
    hint: ["🧽", "🍍"],
    searches: [
      "how to keep a sponge from drying out",
      "can a fry cook get a boating license",
      "best jobs for a very cheerful sea creature",
      "pineapple house maintenance",
    ],
  },
  {
    id: 5,
    name: "Harry Potter",
    from: "Harry Potter",
    level: "EASY",
    hint: ["⚡", "🦉"],
    searches: [
      "how to get letters delivered by owl",
      "can you sleep under the stairs comfortably",
      "round glasses repair near me",
      "train platform between nine and ten missing",
    ],
  },
  {
    id: 6,
    name: "Elsa",
    from: "Frozen",
    level: "EASY",
    hint: ["❄️", "👑"],
    searches: [
      "how to stop freezing everything when I'm nervous",
      "best gloves for people who freeze things",
      "ice castle building permit",
      "how to build a palace out of snow",
    ],
  },
  {
    id: 7,
    name: "Shrek",
    from: "Shrek",
    level: "EASY",
    hint: ["🟢", "🧅"],
    searches: [
      "how to get strangers out of a swamp",
      "swamp real estate prices",
      "best green face cream",
      "how to evict fairy-tale creatures from my house",
    ],
  },
  {
    id: 8,
    name: "Mario",
    from: "Super Mario",
    level: "EASY",
    hint: ["🍄", "🔧"],
    searches: [
      "best plumber near me that jumps",
      "how to get past a pipe full of plants",
      "red cap and mustache combo ideas",
      "how many coins before I can retire",
    ],
  },
  {
    id: 9,
    name: "Pikachu",
    from: "Pokémon",
    level: "EASY",
    hint: ["⚡", "🐭"],
    searches: [
      "how to charge a yellow thing without a plug",
      "best ketchup brands",
      "can a mouse have lightning cheeks",
      "why does only my name come out when I talk",
    ],
  },
  {
    id: 10,
    name: "Woody",
    from: "Toy Story",
    level: "EASY",
    hint: ["🤠", "🧸"],
    searches: [
      "how to stop being left behind when kids move",
      "best hats for pull-string toys",
      "my friend from space thinks he can fly",
      "boots with spurs for cowboy toys",
    ],
  },

  // MEDIUM
  {
    id: 11,
    name: "Iron Man",
    from: "Marvel",
    level: "MEDIUM",
    hint: ["🤖", "🔴"],
    searches: [
      "how to fix a glowing chest battery",
      "can billionaires patent flying suits",
      "best AI butler software",
      "metal suit rust prevention",
    ],
  },
  {
    id: 12,
    name: "Darth Vader",
    from: "Star Wars",
    level: "MEDIUM",
    hint: ["🌌", "⚔️"],
    searches: [
      "best black cape dry cleaner",
      "how to breathe less loudly",
      "family reunion advice when it's complicated",
      "red laser sword safety rules",
    ],
  },
  {
    id: 13,
    name: "Simba",
    from: "The Lion King",
    level: "MEDIUM",
    hint: ["🦁", "🌅"],
    searches: [
      "how to return to a kingdom after running away",
      "can lions rule from rocks",
      "my uncle is acting suspicious",
      "best friends: a meerkat and a warthog",
    ],
  },
  {
    id: 14,
    name: "Buzz Lightyear",
    from: "Toy Story",
    level: "MEDIUM",
    hint: ["🚀", "🧸"],
    searches: [
      "can toys fly if they believe hard enough",
      "how to charge a laser on my wrist",
      "space ranger costume reviews",
      "wing buttons keep sticking",
    ],
  },
  {
    id: 15,
    name: "Joker",
    from: "DC",
    level: "MEDIUM",
    hint: ["🃏", "🟣"],
    searches: [
      "best white face paint that doesn't crack",
      "how many card decks does it take to get a laugh",
      "purple suit tailor in Gotham",
      "why does my rival never find it funny",
    ],
  },
  {
    id: 16,
    name: "Lightning McQueen",
    from: "Cars",
    level: "MEDIUM",
    hint: ["🏎️", "🏁"],
    searches: [
      "how to explain a fast car to a small town",
      "best tires for racing",
      "number 95 stickers",
      "what is a Piston Cup",
    ],
  },
  {
    id: 17,
    name: "Elmo",
    from: "Sesame Street",
    level: "MEDIUM",
    hint: ["🔴", "👀"],
    searches: [
      "best red fur shampoo",
      "how to teach numbers on a busy street",
      "why do I talk about myself in third person",
      "how to get to a street with furry neighbors",
    ],
  },
  {
    id: 18,
    name: "Sonic",
    from: "Sonic the Hedgehog",
    level: "MEDIUM",
    hint: ["💨", "🔵"],
    searches: [
      "fastest shoes for a hedgehog",
      "how to collect gold rings without stopping",
      "blue hair gel recommendations",
      "how fast is too fast for a speeding ticket",
    ],
  },
  {
    id: 19,
    name: "Homer Simpson",
    from: "The Simpsons",
    level: "MEDIUM",
    hint: ["🍩", "😮"],
    searches: [
      "can donuts count as a food group",
      "how to nap at a nuclear power plant",
      "best way to get my kids to stop arguing",
      "how to avoid my overly nice neighbor",
    ],
  },
  {
    id: 20,
    name: "Moana",
    from: "Moana",
    level: "MEDIUM",
    hint: ["🌊", "🛶"],
    searches: [
      "how to sail across an ocean with a rooster",
      "best coconut recipes for an island",
      "how to hire a navigator for a small island",
      "how to bargain with a demigod over fishhooks",
    ],
  },

  // HARD
  {
    id: 21,
    name: "Gollum",
    from: "The Lord of the Rings",
    level: "HARD",
    hint: ["💍", "🕳️"],
    searches: [
      "how to find a lost ring",
      "cave apartment rentals",
      "is raw fish good for you",
      "why do I talk to myself in the dark",
    ],
  },
  {
    id: 22,
    name: "WALL-E",
    from: "WALL-E",
    level: "HARD",
    hint: ["🤖", "🗑️"],
    searches: [
      "best trash compactor repair",
      "how to organize old things I find on the ground",
      "plant care for a lonely robot",
      "can robots fall in love with a visiting probe",
    ],
  },
  {
    id: 23,
    name: "Yoda",
    from: "Star Wars",
    level: "HARD",
    hint: ["🟢", "🌌"],
    searches: [
      "best swamp planets for retirement",
      "how to train young students in a swamp",
      "why do I put words in a different order",
      "how to hide pointy green ears",
    ],
  },
  {
    id: 24,
    name: "Scooby-Doo",
    from: "Scooby-Doo",
    level: "HARD",
    hint: ["🐶", "🔍"],
    searches: [
      "how to make a sandwich bigger than my head",
      "best dog snacks for solving mysteries",
      "how to scare away haunted-house caretakers",
      "van insurance for four teenagers and a dog",
    ],
  },
  {
    id: 25,
    name: "Garfield",
    from: "Garfield",
    level: "HARD",
    hint: ["🐱", "🍝"],
    searches: [
      "lasagna delivery open 24 hours",
      "why are Mondays so hard for cats",
      "how to sleep 20 hours a day",
      "how to get my owner's dog to stop being annoying",
    ],
  },
  {
    id: 26,
    name: "Bugs Bunny",
    from: "Looney Tunes",
    level: "HARD",
    hint: ["🐰", "🥕"],
    searches: [
      "carrot subscription box",
      "how to dig tunnels that come out in the wrong place",
      "disguise ideas that always fool a hunter",
      "is it rude to chew a carrot while talking",
    ],
  },
  {
    id: 27,
    name: "Link",
    from: "The Legend of Zelda",
    level: "HARD",
    hint: ["🗡️", "🛡️"],
    searches: [
      "green tunic that never wears out",
      "how many hearts is too many",
      "best way to open a treasure chest",
      "how to save a princess without talking",
    ],
  },
  {
    id: 28,
    name: "Steve",
    from: "Minecraft",
    level: "HARD",
    hint: ["⛏️", "🟫"],
    searches: [
      "how to survive the first night in a square world",
      "best pickaxe for beginners",
      "why is everything around me made of blocks",
      "how to build a house before it gets dark",
    ],
  },
  {
    id: 29,
    name: "Dora",
    from: "Dora the Explorer",
    level: "HARD",
    hint: ["🗺️", "🎒"],
    searches: [
      "how to explore with a talking map",
      "best backpack with a built-in everything",
      "can a monkey wear red boots",
      "how to stop a sneaky fox from taking things",
    ],
  },
  {
    id: 30,
    name: "Sherlock Holmes",
    from: "Sherlock Holmes stories",
    level: "HARD",
    hint: ["🔎", "🎩"],
    searches: [
      "how to tell someone's job from their hat",
      "best violin for thinking",
      "apartment at 221B rent",
      "my partner keeps publishing stories about my cases",
    ],
  },
];

export const BONUS: Bonus[] = [
  {
    afterRound: 10,
    answer: "Winnie the Pooh",
    from: "Winnie the Pooh",
    searches: [
      "how many honey pots is too many",
      "best red shirt with no pants",
      "how to cheer up a very gloomy donkey",
    ],
    options: ["Winnie the Pooh", "Paddington", "Mickey Mouse", "Elmo"],
    correctIndex: 0,
  },
  {
    afterRound: 20,
    answer: "Dory",
    from: "Finding Nemo",
    searches: [
      "how to remember anything for more than a minute",
      "best ocean GPS for forgetful fish",
      "blue tang fan club near me",
    ],
    options: ["Dory", "Ariel", "SpongeBob SquarePants", "Moana"],
    correctIndex: 0,
  },
  {
    afterRound: 30,
    answer: "Pac-Man",
    from: "Pac-Man",
    searches: [
      "how to eat dots without stopping",
      "tips for avoiding ghosts in a maze",
      "yellow circle costume ideas",
    ],
    options: ["Pac-Man", "Sonic", "Mario", "Link"],
    correctIndex: 0,
  },
];

export const getRound = (index: number): Round => ROUNDS[index];
