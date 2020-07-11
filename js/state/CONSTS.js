import utils from '../utils/utils.js';
import Upgrade from './model/Upgrade.js';
import Player from './model/Player.js';
import AiPersonality from './model/AiPersonality.js';

const UNLIMITED_TURNS = 1000000;

// Possible temple upgrades
const UPGRADES = [
    new Upgrade('Extra soldier', '', utils.range(0, 100).map(n => 8 + n * 4 ), []),
    new Upgrade('X of Water', 'Income: X% more each turn.', [15, 25], [20, 40], '#66f'),
    new Upgrade('X of Fire', 'Attack: X invincible soldier(s).', [20, 30], [1, 2], '#f88'),
    new Upgrade('X of Air', 'Move: X extra move(s) per turn.', [25, 35], [1, 2], '#ffa'),
    new Upgrade('X of Earth', 'Defense: Always kill X invader(s).', [30, 45], [1, 2], '#696'),
    new Upgrade('Rebuild temple', 'Switch to a different upgrade.', [0], []),
];

UPGRADES.SOLDIER = UPGRADES[0];
UPGRADES.WATER = UPGRADES[1];
UPGRADES.FIRE = UPGRADES[2];
UPGRADES.AIR = UPGRADES[3];
UPGRADES.EARTH = UPGRADES[4];
UPGRADES.REBUILD = UPGRADES[5];

// There are up to 4 possible Players. Each can be human or AI.
const PLAYERS = [
    new Player(0, 'Amber', '#fe8', '#c81', '#fd8', '#a80'),
    new Player(1, 'Crimson', '#f88', '#a44', '#faa', '#944'),
    new Player(2, 'Lavender', '#d9d', '#838', '#faf', '#759'),
    new Player(3, 'Emerald', '#9d9','#282', '#bfb', '#4a4'),
];

const WATER = UPGRADES.WATER;
const EARTH = UPGRADES.EARTH;
const FIRE = UPGRADES.FIRE;

// AI personalities - how eagerly it builds soldiers, and what upgrades it prefers
const AI_PERSONALITIES = [
    new AiPersonality(1, []),
    new AiPersonality(0.2, [WATER, EARTH]),
    new AiPersonality(0.25, [WATER, FIRE, FIRE]),
    new AiPersonality(0.15, [WATER, WATER, EARTH, EARTH]),
    new AiPersonality(0.4, [WATER]),
    new AiPersonality(0.3, [WATER, WATER]),
    new AiPersonality(0.25, [FIRE, FIRE]),
    new AiPersonality(0.2, [EARTH, EARTH]),
];

const SOUNDS = {
    CLICK: 'CLICK',
    ENEMY_DEAD: 'ENEMY_DEAD',
    OURS_DEAD: 'OURS_DEAD',
    TAKE_OVER: 'TAKE_OVER',
    VICTORY: 'VICTORY',
    DEFEAT: 'DEFEAT',
};

export default {

    BASE_MOVES_PER_TURN: 3,

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
    DRAWN_GAME: {},

    // pause before move in milliseconds
    MOVE_DELAY: 100,

    // amount of faith added when soldiers are killed defending a region
    MARTYR_BONUS: 4,

    LEVELS: ["Temple", "Cathedral"],
    UPGRADES,
    PLAYERS,
    SOUNDS,
    AI_PERSONALITIES,
};







