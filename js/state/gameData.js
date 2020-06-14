import utils from '../utils/utils.js';
import Upgrade from './Upgrade.js';

// ==========================================================
// Game-controlling constants
// ==========================================================

// === Possible temple upgrades
const UPGRADES = [
    new Upgrade('Extra soldier', '', utils.map(utils.range(0, 100), function(n) { return 8 + n * 4; }), []),
    new Upgrade('X of Water', 'Income: X% more each turn.', [15, 25], [20, 40], '#66f'),
    new Upgrade('X of Fire', 'Attack: X invincible soldier(s).', [20, 30], [1, 2], '#f88'),
    new Upgrade('X of Air', 'Move: X extra move(s) per turn.', [25, 35], [1, 2], '#ffa'),
    new Upgrade('X of Earth', 'Defense: Always kill X invader(s).', [30, 45], [1, 2], '#696'),
    new Upgrade('Rebuild temple', 'Switch to a different upgrade.', [0], []),
];

const SOLDIER = UPGRADES[0];
const WATER = UPGRADES[1];
const FIRE = UPGRADES[2];
const AIR = UPGRADES[3];
const EARTH = UPGRADES[4];
const RESPEC = UPGRADES[5];

const UNLIMITED_TURNS = 1000000;

export default {
    mapWidth: 30,
    mapHeight: 20,
    movesPerTurn: 3,
    minimumAIThinkingTime: 1000,
    maximumAIThinkingTime: 5000,
    // === The possible move types
    MOVE_ARMY: 1,
    BUILD_ACTION: 2,
    END_TURN: 3,
    // === Player properties
    PLAYER_TEMPLATES: [
        {i:0, n: 'Amber', l: '#fd8', d:'#960', h: '#fd8', hd:'#a80'},
        {i:1, n: 'Crimson', l: '#f88', d:'#722', h: '#faa', hd:'#944'},
        {i:2, n: 'Lavender', l: '#d9d', d:'#537', h: '#faf', hd:'#759'},
        {i:3, n: 'Emerald', l: '#9d9', d:'#262', h: '#bfb', hd:'#484'}
    ],
    UPGRADES,
    LEVELS: ["Temple", "Cathedral"],
    SOLDIER, WATER, FIRE, AIR, EARTH, RESPEC,

    // === Constants for setup screen
    PLAYER_OFF: 0,
    PLAYER_HUMAN: 1,
    PLAYER_AI: 2,

    AI_NICE: 0,
    AI_RUDE: 1,
    AI_MEAN: 2,
    AI_EVIL: 3,

    UNLIMITED_TURNS,
    TURN_COUNTS: [9, 12, 15, UNLIMITED_TURNS],

    // == Special "player" for signifying a draw game
    DRAW_GAME: {},

    // == AI personalities - how eagerly it builds soldiers, and what upgrades it prefers
    AI_PERSONALITIES: [
        {s: 1, u:[]},
        {s: 0.2, u: [WATER, EARTH]},
        {s: 0.25, u: [WATER, FIRE, FIRE]},
        {s: 0.15, u: [WATER, WATER, EARTH, EARTH]},
        {s: 0.4, u: [WATER]},
        {s: 0.3, u: [WATER, WATER]},
        {s: 0.25, u: [FIRE, FIRE]},
        {s: 0.2, u: [EARTH, EARTH]}
    ],
};








