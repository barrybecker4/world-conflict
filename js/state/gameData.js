import utils from '../utils/utils.js';
import Player from './model/Player.js';


// Player properties
const PLAYER_TEMPLATES = [
    new Player(0, 'Amber', '#fd8', '#960', '#fd8', '#a80'),
    new Player(1, 'Crimson', '#f88', '#722', '#faa', '#944'),
    new Player(2, 'Lavender', '#d9d', '#537', '#faf', '#759'),
    new Player(3, 'Emerald', '#9d9','#262', '#bfb', '#484'),
];

const UNLIMITED_TURNS = 1000000;

export default {
    mapWidth: 30,
    mapHeight: 20,
    movesPerTurn: 3,
    minimumAIThinkingTime: 1000,
    maximumAIThinkingTime: 5000,

    PLAYER_TEMPLATES,

    LEVELS: ["Temple", "Cathedral"],

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
};








