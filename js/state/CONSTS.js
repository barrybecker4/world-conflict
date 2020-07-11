import utils from '../utils/utils.js';
import Upgrade from './model/Upgrade.js';

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
};







