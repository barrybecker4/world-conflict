import utils from '../utils/utils.js';
import Upgrade from './model/Upgrade.js';
import Player from './model/Player.js';
import AiPersonality from './model/AiPersonality.js';

const UNLIMITED_TURNS = 1000000;

// Possible temple upgrades
const UPGRADES = [
    new Upgrade({
        name: 'Extra soldier',
        desc: '',
        cost: utils.range(0, 100).map(n => 8 + n * 4 ),
        level: []
    }),
    new Upgrade({
        name: 'X of Water',
        desc: 'Income: X% more each turn.',
        cost: [15, 25],
        level: [20, 40],
        backgroundColor: '#66f'
    }),
    new Upgrade({
        name: 'X of Fire',
        desc: 'Attack: X invincible soldier(s).',
        cost: [20, 30],
        level: [1, 2], backgroundColor: '#f88'
    }),
    new Upgrade({
        name: 'X of Air',
        desc: 'Move: X extra move(s) per turn.',
        cost: [25, 35],
        level: [1, 2],
        backgroundColor: '#ffa'
    }),
    new Upgrade({
        name: 'X of Earth',
        desc: 'Defense: Always kill X invader(s).',
        cost: [30, 45],
        level: [1, 2],
        backgroundColor: '#696'
    }),
    new Upgrade({
        name: 'Rebuild temple',
        desc: 'Switch to a different upgrade.',
        cost: [0],
        level: []
    })
];

UPGRADES.SOLDIER = UPGRADES[0];
UPGRADES.WATER = UPGRADES[1];
UPGRADES.FIRE = UPGRADES[2];
UPGRADES.AIR = UPGRADES[3];
UPGRADES.EARTH = UPGRADES[4];
UPGRADES.REBUILD = UPGRADES[5];

// These are the possible Players. Each can be human or AI.

// index, name, colorStart, colorEnd, highlightStart, highlightEnd
const PLAYERS = [
    new Player({
        index: 0, name: 'Amber',
        colorStart: '#fe8', colorEnd: '#c81',
        highlightStart: '#fd8', highlightEnd: '#a80'
    }),
    new Player({
        index: 1, name: 'Crimson',
        colorStart: '#f88', colorEnd: '#a44',
        highlightStart: '#faa', highlightEnd: '#944'
    }),
    new Player({
        index: 2, name: 'Lavender',
        colorStart: '#d9d', colorEnd: '#838',
        highlightStart: '#faf', highlightEnd: '#759'
    }),
    new Player({
        index: 3, name: 'Emerald',
        colorStart: '#9d9', colorEnd: '#282',
        highlightStart: '#bfb', highlightEnd: '#4a4'
    }),
];

const WATER = UPGRADES.WATER;
const EARTH = UPGRADES.EARTH;
const FIRE = UPGRADES.FIRE;

// AI personalities - how eagerly it builds soldiers, and what upgrades it prefers
const AI_PERSONALITIES = [
    new AiPersonality({ soldierEagerness: 1, preferredUpgrades: [] }),
    new AiPersonality({ soldierEagerness: 0.2, preferredUpgrades: [WATER, EARTH] }),
    new AiPersonality({ soldierEagerness: 0.25, preferredUpgrades: [WATER, FIRE, FIRE] }),
    new AiPersonality({ soldierEagerness: 0.15, preferredUpgrades: [WATER, WATER, EARTH, EARTH] }),
    new AiPersonality({ soldierEagerness: 0.4, preferredUpgrades: [WATER] }),
    new AiPersonality({ soldierEagerness: 0.3, preferredUpgrades: [WATER, WATER] }),
    new AiPersonality({ soldierEagerness: 0.25, preferredUpgrades: [FIRE, FIRE] }),
    new AiPersonality({ soldierEagerness: 0.2, preferredUpgrades: [EARTH, EARTH] }),
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







