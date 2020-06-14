import utils from '../utils/utils.js';
import Player from './model/Player.js';
import Upgrade from './model/Upgrade.js';
import AiPersonality from './model/AiPersonality.js';

// Game-controlling constants

// Possible temple upgrades
const UPGRADES = [
    new Upgrade('Extra soldier', '', utils.map(utils.range(0, 100), function(n) { return 8 + n * 4; }), []),
    new Upgrade('X of Water', 'Income: X% more each turn.', [15, 25], [20, 40], '#66f'),
    new Upgrade('X of Fire', 'Attack: X invincible soldier(s).', [20, 30], [1, 2], '#f88'),
    new Upgrade('X of Air', 'Move: X extra move(s) per turn.', [25, 35], [1, 2], '#ffa'),
    new Upgrade('X of Earth', 'Defense: Always kill X invader(s).', [30, 45], [1, 2], '#696'),
    new Upgrade('Rebuild temple', 'Switch to a different upgrade.', [0], []),
];

// Player properties
const PLAYER_TEMPLATES = [
    new Player(0, 'Amber', '#fd8', '#960', '#fd8', '#a80'),
    new Player(1, 'Crimson', '#f88', '#722', '#faa', '#944'),
    new Player(2, 'Lavender', '#d9d', '#537', '#faf', '#759'),
    new Player(3, 'Emerald', '#9d9','#262', '#bfb', '#484'),
];

const SOLDIER = UPGRADES[0];
const WATER = UPGRADES[1];
const FIRE = UPGRADES[2];
const AIR = UPGRADES[3];
const EARTH = UPGRADES[4];
const RESPECT = UPGRADES[5];

const UNLIMITED_TURNS = 1000000;

export default {
    mapWidth: 30,
    mapHeight: 20,
    movesPerTurn: 3,
    minimumAIThinkingTime: 1000,
    maximumAIThinkingTime: 5000,

    PLAYER_TEMPLATES,

    UPGRADES,
    LEVELS: ["Temple", "Cathedral"],
    SOLDIER, WATER, FIRE, AIR, EARTH, RESPECT,

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
        new AiPersonality(1, []),
        new AiPersonality(0.2, [WATER, EARTH]),
        new AiPersonality(0.25, [WATER, FIRE, FIRE]),
        new AiPersonality(0.15, [WATER, WATER, EARTH, EARTH]),
        new AiPersonality(0.4, [WATER]),
        new AiPersonality(0.3, [WATER, WATER]),
        new AiPersonality(0.25, [FIRE, FIRE]),
        new AiPersonality(0.2, [EARTH, EARTH]),
    ],
};








