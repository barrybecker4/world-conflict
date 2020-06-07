// ==========================================================
// Game-controlling constants
// ==========================================================

const mapWidth = 30;
const mapHeight = 20;
const movesPerTurn = 3;
const minimumAIThinkingTime = 1000;
const maximumAIThinkingTime = 5000;

// ==========================================================
// Game data
// ==========================================================

// === The possible move types
const MOVE_ARMY = 1;
const BUILD_ACTION = 2;
const END_TURN = 3;

// === Player properties
var PLAYER_TEMPLATES = [
    {i:0, n: 'Amber', l: '#fd8', d:'#960', h: '#fd8', hd:'#a80'},
    {i:1, n: 'Crimson', l: '#f88', d:'#722', h: '#faa', hd:'#944'},
    {i:2, n: 'Lavender', l: '#d9d', d:'#537', h: '#faf', hd:'#759'},
    {i:3, n: 'Emerald', l: '#9d9', d:'#262', h: '#bfb', hd:'#484'}
];

// === Possible temple upgrades
const UPGRADES = [
    {n: "Extra soldier", d: "", c: map(range(0,100), function(n) { return 8 + n * 4; }), x: []},
    {n: "X of Water", d: "Income: X% more each turn.",
        c: [15, 25], x: [20, 40],
        b: '#66f'},
    {n: "X of Fire",  d: "Attack: X invincible soldier(s).",
        c: [20, 30], x: [1, 2],
        b: '#f88'},
    {n: "X of Air",   d: "Move: X extra move(s) per turn.",
        c: [25, 35], x: [1, 2],
        b: '#ffa'},
    {n: "X of Earth", d: "Defense: Always kill X invader(s).",
        c: [30, 45], x: [1, 2],
        b: '#696'},
    {n: "Rebuild temple", d: "Switch to a different upgrade.",
        c: [0], x: []}
    ];

const LEVELS = ["Temple", "Cathedral"];
const SOLDIER = UPGRADES[0];
const WATER = UPGRADES[1];
const FIRE = UPGRADES[2];
const AIR = UPGRADES[3];
const EARTH = UPGRADES[4];
const RESPEC = UPGRADES[5];

// === Constants for setup screen
const PLAYER_OFF = 0;
const PLAYER_HUMAN = 1;
const PLAYER_AI = 2;

const AI_NICE = 0;
const AI_RUDE = 1;
const AI_MEAN = 2;
const AI_EVIL = 3;

const UNLIMITED_TURNS = 1000000;
const TURN_COUNTS = [9, 12, 15, UNLIMITED_TURNS];

// == Application "states"
const APP_SETUP_SCREEN = 0;
const APP_INGAME = 1;

// == Special "player" for signifying a draw game
const DRAW_GAME = {};

// == AI personalities - how eagerly it builds soldiers, and what upgrades it prefers
const AI_PERSONALITIES = [
    {s: 1, u:[]},
    {s: 0.2, u: [WATER, EARTH]},
    {s: 0.25, u: [WATER, FIRE, FIRE]},
    {s: 0.15, u: [WATER, WATER, EARTH, EARTH]},
    {s: 0.4, u: [WATER]},
    {s: 0.3, u: [WATER, WATER]},
    {s: 0.25, u: [FIRE, FIRE]},
    {s: 0.2, u: [EARTH, EARTH]}
];