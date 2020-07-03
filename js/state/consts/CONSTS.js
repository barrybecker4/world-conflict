const UNLIMITED_TURNS = 1000000;

export default {

    BASE_MOVES_PER_TURN: 3,

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
    DRAWN_GAME: {},
};








