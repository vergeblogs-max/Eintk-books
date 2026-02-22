
// Game Data for EINTK Arcade

// --- 1. FLAGS DATA ---
export const FLAGS = [
    { name: "Nigeria", code: "ng" }, { name: "United States", code: "us" }, { name: "United Kingdom", code: "gb" },
    { name: "Canada", code: "ca" }, { name: "France", code: "fr" }, { name: "Germany", code: "de" },
    { name: "Italy", code: "it" }, { name: "Japan", code: "jp" }, { name: "China", code: "cn" },
    { name: "India", code: "in" }, { name: "Brazil", code: "br" }, { name: "South Africa", code: "za" },
    { name: "Russia", code: "ru" }, { name: "Australia", code: "au" }, { name: "Ghana", code: "gh" },
    { name: "Kenya", code: "ke" }, { name: "Egypt", code: "eg" }, { name: "Morocco", code: "ma" },
    { name: "Saudi Arabia", code: "sa" }, { name: "South Korea", code: "kr" }, { name: "Spain", code: "es" },
    { name: "Argentina", code: "ar" }, { name: "Mexico", code: "mx" }, { name: "Sweden", code: "se" },
    { name: "Norway", code: "no" }, { name: "Turkey", code: "tr" }, { name: "Greece", code: "gr" },
    { name: "Portugal", code: "pt" }, { name: "Netherlands", code: "nl" }, { name: "Belgium", code: "be" },
    { name: "Switzerland", code: "ch" }, { name: "Austria", code: "at" }, { name: "Denmark", code: "dk" },
    { name: "Finland", code: "fi" }, { name: "Poland", code: "pl" }, { name: "Ukraine", code: "ua" },
    { name: "Vietnam", code: "vn" }, { name: "Thailand", code: "th" }, { name: "Indonesia", code: "id" },
    { name: "New Zealand", code: "nz" }, { name: "Ireland", code: "ie" }, { name: "Iran", code: "ir" }
];

// --- 2. WORD SEARCH WORDS ---
export const WORD_SEARCH_LISTS = [
    { topic: "Biology", words: ["CELL", "GENE", "DNA", "ATOM", "LIFE", "PLANT", "ROOT", "LEAF", "STEM", "SEED"] },
    { topic: "Physics", words: ["FORCE", "WORK", "HEAT", "WAVE", "LIGHT", "SOUND", "MASS", "SPEED", "VOLT", "WATT"] },
    { topic: "Chemistry", words: ["ACID", "BASE", "ATOM", "BOND", "IRON", "GOLD", "GAS", "ION", "ZINC", "LEAD"] },
    { topic: "Geography", words: ["MAP", "CITY", "LAKE", "HILL", "ROAD", "ZONE", "EAST", "WEST", "NORTH", "SOUTH"] },
    { topic: "Math", words: ["SUM", "AREA", "MEAN", "MODE", "UNIT", "RATE", "LINE", "PLOT", "AXIS", "DATA"] },
    { topic: "Space", words: ["STAR", "MOON", "SUN", "MARS", "ORBIT", "VOID", "DUST", "NOVA"] }
];

// --- 3. TRIVIA QUESTIONS (General Knowledge) ---
export const TRIVIA_QUESTIONS = [
    { q: "What involves the study of celestial bodies?", a: "Astronomy", options: ["Astronomy", "Geology", "Biology", "Ecology"] },
    { q: "What is the chemical symbol for Gold?", a: "Au", options: ["Au", "Ag", "Fe", "Pb"] },
    { q: "Who wrote 'Romeo and Juliet'?", a: "Shakespeare", options: ["Shakespeare", "Dickens", "Hemingway", "Orwell"] },
    { q: "What is the largest planet in our solar system?", a: "Jupiter", options: ["Jupiter", "Saturn", "Earth", "Mars"] },
    { q: "What is the capital of France?", a: "Paris", options: ["Paris", "London", "Berlin", "Rome"] },
    { q: "Which gas do plants absorb?", a: "Carbon Dioxide", options: ["Carbon Dioxide", "Oxygen", "Nitrogen", "Helium"] },
    { q: "How many continents are there?", a: "7", options: ["5", "6", "7", "8"] },
    { q: "What involves the study of living organisms?", a: "Biology", options: ["Biology", "Physics", "Chemistry", "Math"] },
    { q: "Which element is needed for strong bones?", a: "Calcium", options: ["Calcium", "Iron", "Potassium", "Zinc"] },
    { q: "What is the square root of 64?", a: "8", options: ["6", "7", "8", "9"] },
    { q: "Who painted the Mona Lisa?", a: "Da Vinci", options: ["Da Vinci", "Picasso", "Van Gogh", "Rembrandt"] },
    { q: "What is the longest river in the world?", a: "Nile", options: ["Nile", "Amazon", "Yangtze", "Mississippi"] },
    { q: "Which planet is known as the Red Planet?", a: "Mars", options: ["Mars", "Venus", "Jupiter", "Saturn"] },
    { q: "What is the hardest natural substance?", a: "Diamond", options: ["Diamond", "Gold", "Iron", "Steel"] },
    { q: "How many degrees are in a circle?", a: "360", options: ["180", "360", "90", "270"] }
];

// --- 4. HANGMAN WORDS ---
export const HANGMAN_WORDS = [
    { word: "PHOTOSYNTHESIS", hint: "Process by which plants make food" },
    { word: "MITOCHONDRIA", hint: "Powerhouse of the cell" },
    { word: "DEMOCRACY", hint: "Government by the people" },
    { word: "REVOLUTION", hint: "A forcible overthrow of a government" },
    { word: "GRAVITY", hint: "Force that attracts a body toward the earth" },
    { word: "LITERATURE", hint: "Written works of artistic value" },
    { word: "CALCULUS", hint: "Branch of mathematics dealing with rates of change" },
    { word: "GEOGRAPHY", hint: "Study of the physical features of the earth" },
    { word: "ECONOMICS", hint: "Study of production, consumption, and wealth" },
    { word: "CHEMISTRY", hint: "Scientific study of the properties of matter" },
    { word: "VACCINATION", hint: "Injection to provide immunity" },
    { word: "EVAPORATION", hint: "Liquid turning into gas" },
    { word: "CONSTIPATION", hint: "Difficulty emptying the bowels" }, // Medical term relevant to bio
    { word: "AMPHIBIAN", hint: "Animal living on land and water" }
];

// --- 5. TIMELINE EVENTS ---
export const TIMELINE_EVENTS = [
    { id: "1", text: "Nigeria Independence", year: 1960 },
    { id: "2", text: "Start of WWII", year: 1939 },
    { id: "3", text: "Moon Landing", year: 1969 },
    { id: "4", text: "Invention of the Web", year: 1989 },
    { id: "5", text: "Discovery of America", year: 1492 },
    { id: "6", text: "End of WWII", year: 1945 },
    { id: "7", text: "Covid-19 Pandemic", year: 2020 },
    { id: "8", text: "First Airplane Flight", year: 1903 },
    { id: "9", text: "Fall of Berlin Wall", year: 1989 },
    { id: "10", text: "Nelson Mandela Released", year: 1990 }
];

// --- 6. MEMORY MATCH ICONS (Lucide Names) ---
export const MEMORY_ICONS = [
    "Atom", "Beaker", "Calculator", "Dna", "Globe", "Microscope", "Book", "Brain", "Cpu", "FlaskConical", "Leaf", "Magnet"
];

// --- 7. CROSSWORD DATA (Simple 5x5 Templates) ---
export const CROSSWORD_TEMPLATES = [
    {
        id: 1,
        grid: [
            ['A', 'T', 'O', 'M', 'S'],
            ['R', '.', '.', '.', 'O'],
            ['E', 'A', 'R', 'T', 'H'],
            ['A', '.', '.', '.', 'O'],
            ['.', '.', 'M', 'A', 'P']
        ],
        clues: {
            across: [
                { num: 1, text: "Basic units of matter (5)" },
                { num: 3, text: "The planet we live on (5)" },
                { num: 5, text: "Chart of an area (3)" }
            ],
            down: [
                { num: 1, text: "Region or expanse (4)" },
                { num: 2, text: "Short for SO (2)" } 
            ]
        }
    },
    {
        id: 2,
        grid: [
            ['.', 'G', 'A', 'S', '.'],
            ['M', 'A', 'S', 'S', '.'],
            ['.', 'P', 'H', '.', '.'],
            ['A', 'C', 'I', 'D', 'S'],
            ['.', '.', '.', '.', '.']
        ],
        clues: {
            across: [
                { num: 1, text: "State of matter (3)" },
                { num: 2, text: "Amount of matter (4)" },
                { num: 4, text: "Sour substances (5)" }
            ],
            down: [
                { num: 1, text: "Empty space (3)" },
                { num: 2, text: "Product of burning (3)" }
            ]
        }
    }
];

// --- 8. CAPITALS DATA ---
export const CAPITALS = [
    { country: "Nigeria", city: "Abuja" },
    { country: "France", city: "Paris" },
    { country: "Japan", city: "Tokyo" },
    { country: "Germany", city: "Berlin" },
    { country: "Canada", city: "Ottawa" },
    { country: "Brazil", city: "Brasilia" },
    { country: "Australia", city: "Canberra" },
    { country: "Egypt", city: "Cairo" },
    { country: "India", city: "New Delhi" },
    { country: "Italy", city: "Rome" },
    { country: "Spain", city: "Madrid" },
    { country: "Russia", city: "Moscow" },
    { country: "China", city: "Beijing" },
    { country: "South Africa", city: "Pretoria" },
    { country: "Kenya", city: "Nairobi" }
];

// --- 9. SYNONYMS DATA ---
export const SYNONYMS = [
    { word: "Happy", synonym: "Joyful", options: ["Sad", "Joyful", "Angry", "Tired"] },
    { word: "Big", synonym: "Huge", options: ["Tiny", "Huge", "Small", "Weak"] },
    { word: "Fast", synonym: "Quick", options: ["Slow", "Quick", "Heavy", "Late"] },
    { word: "Smart", synonym: "Intelligent", options: ["Dull", "Intelligent", "Silly", "Weak"] },
    { word: "Start", synonym: "Begin", options: ["End", "Begin", "Stop", "Finish"] },
    { word: "Difficult", synonym: "Hard", options: ["Easy", "Hard", "Simple", "Soft"] },
    { word: "Wealthy", synonym: "Rich", options: ["Poor", "Rich", "Broke", "Needy"] },
    { word: "Scared", synonym: "Afraid", options: ["Brave", "Afraid", "Calm", "Happy"] },
    { word: "Angry", synonym: "Furious", options: ["Calm", "Furious", "Happy", "Kind"] },
    { word: "Help", synonym: "Assist", options: ["Hinder", "Assist", "Block", "Stop"] }
];

// --- 10. ODD ONE OUT DATA ---
export const ODD_ONE_OUT = [
    { options: ["Apple", "Banana", "Carrot", "Orange"], answer: "Carrot", reason: "Carrot is a vegetable, others are fruits." },
    { options: ["Lion", "Tiger", "Leopard", "Eagle"], answer: "Eagle", reason: "Eagle is a bird, others are cats." },
    { options: ["Physics", "Chemistry", "Biology", "History"], answer: "History", reason: "History is Arts, others are Science." },
    { options: ["Circle", "Square", "Triangle", "Red"], answer: "Red", reason: "Red is a color, others are shapes." },
    { options: ["Lagos", "Kano", "Ibadan", "Ghana"], answer: "Ghana", reason: "Ghana is a country, others are cities." },
    { options: ["Eye", "Nose", "Ear", "Shoe"], answer: "Shoe", reason: "Shoe is clothing, others are body parts." },
    { options: ["Car", "Bus", "Truck", "Boat"], answer: "Boat", reason: "Boat travels on water, others on land." },
    { options: ["Monday", "January", "Tuesday", "Friday"], answer: "January", reason: "January is a month, others are days." }
];

// --- 11. TUTORIAL DATA ---
export const TUTORIAL_DATA: Record<string, { step: number; text: string; highlight?: string }[]> = {
    'sudoku': [
        { step: 1, text: "Welcome to Sudoku! Fill the 9x9 grid so that each column, row, and 3x3 box contains the digits 1 to 9." },
        { step: 2, text: "Tap an empty cell to select it, then type a number." },
        { step: 3, text: "Don't repeat numbers in the same row, column, or box!" }
    ],
    'flags': [
        { step: 1, text: "Welcome to Flag Master! A country's flag will appear on the screen." },
        { step: 2, text: "You will see 4 country names. Tap the one that matches the flag." },
        { step: 3, text: "Get 5 correct answers in a row to win the level." }
    ],
    'word-search': [
        { step: 1, text: "Find the hidden educational words in the grid of letters." },
        { step: 2, text: "Tap letters to highlight them. Words can be horizontal, vertical, or diagonal." },
        { step: 3, text: "Find all words on the list to complete the level." }
    ],
    'hangman': [
        { step: 1, text: "Guess the hidden educational word before the drawing is complete." },
        { step: 2, text: "Tap letters to make a guess. Each wrong guess adds a part to the drawing." },
        { step: 3, text: "If the drawing finishes before you guess the word, you lose!" }
    ],
    'crossword': [
        { step: 1, text: "Tap a white square to select it." },
        { step: 2, text: "Read the clue for that row (Across) or column (Down)." },
        { step: 3, text: "Type the answer. Black squares cannot be typed in." }
    ],
    'tic-tac-trivia': [
        { step: 1, text: "Play Tic-Tac-Toe against a smart Bot." },
        { step: 2, text: "To place your X, you must first answer a trivia question correctly." },
        { step: 3, text: "Get 3 in a row to win!" }
    ],
    'memory': [
        { step: 1, text: "Flip cards to find matching pairs." },
        { step: 2, text: "Memorize the locations of icons." },
        { step: 3, text: "Clear the board with the fewest moves possible." }
    ],
    'timeline': [
        { step: 1, text: "Drag and drop events to order them chronologically." },
        { step: 2, text: "Oldest events go at the top, newest at the bottom." },
        { step: 3, text: "Click 'Check Order' when you are done." }
    ],
    'capital-city': [
        { step: 1, text: "Test your geography knowledge! We show you a country." },
        { step: 2, text: "You choose the correct Capital City from the options." },
        { step: 3, text: "Get 5 in a row to advance." }
    ],
    'synonym-blast': [
        { step: 1, text: "Expand your vocabulary. We show you a word." },
        { step: 2, text: "Pick the word that means the same thing (Synonym)." },
        { step: 3, text: "Race against time to find the right matches." }
    ],
    'odd-one-out': [
        { step: 1, text: "Analyze the four options presented." },
        { step: 2, text: "Identify the one that does NOT belong in the group." },
        { step: 3, text: "Tap the odd one out to win." }
    ]
};
