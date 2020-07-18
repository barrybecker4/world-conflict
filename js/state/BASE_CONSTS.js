
const UNLIMITED_TURNS = 1000000;

var CONSTS = {

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
};
