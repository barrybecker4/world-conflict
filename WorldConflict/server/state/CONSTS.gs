
var CONSTS = (function(my) {

    const DEBUG = false;
    const SOLDIER_COSTS = calcCosts(8, 16);

    const UNLIMITED_TURNS = 1000000;

    const PLAYER_OFF = 'Off';
    const PLAYER_HUMAN_SET = 'Set';
    const PLAYER_HUMAN_OPEN = 'Open';
    const PLAYER_AI = 'AI';

    const AI_NICE = 0;
    const AI_RUDE = 1;
    const AI_MEAN = 2;
    const AI_EVIL = 3;

    function calcCosts(initial, n) {
        const costs = [];
        let current = initial;
        for (let i = 1; i < n; i++) {
            costs.push(current);
            current += i;
        }
        return costs;
    }

    my.initialize = function() {
        const SOUNDS = {
            CLICK: 'CLICK',
            ENEMY_DEAD: 'ENEMY_DEAD',
            OURS_DEAD: 'OURS_DEAD',
            TAKE_OVER: 'TAKE_OVER',
            VICTORY: 'VICTORY',
            DEFEAT: 'DEFEAT',
        };

        // Possible temple upgrades
        const UPGRADES = [
            null,
            new Upgrade({
                name: 'Extra soldier',
                desc: '',
                cost: SOLDIER_COSTS,
                level: [],
                index: 1,
            }),
            new Upgrade({
                name: 'X of Water',
                desc: 'Income: X% more each turn.',
                cost: [15, 25],
                level: [20, 40],
                bgColor: '#66f',
                index: 2,
            }),
            new Upgrade({
                name: 'X of Fire',
                desc: 'Attack: X invincible soldier(s).',
                cost: [20, 30],
                level: [1, 2], bgColor: '#f88',
                index: 3,
            }),
            new Upgrade({
                name: 'X of Air',
                desc: 'Move: X extra move(s) per turn.',
                cost: [25, 35],
                level: [1, 2],
                bgColor: '#ffa',
                index: 4,
            }),
            new Upgrade({
                name: 'X of Earth',
                desc: 'Defense: Always kill X invader(s).',
                cost: [30, 45],
                level: [1, 2],
                bgColor: '#696',
                index: 5,
            }),
            new Upgrade({
                name: 'Rebuild temple',
                desc: 'Switch to a different upgrade.',
                cost: [0],
                level: [],
                index: 6,
            })
        ];

        UPGRADES.SOLDIER = UPGRADES[1];
        UPGRADES.WATER = UPGRADES[2];
        UPGRADES.FIRE = UPGRADES[3];
        UPGRADES.AIR = UPGRADES[4];
        UPGRADES.EARTH = UPGRADES[5];
        UPGRADES.REBUILD = UPGRADES[6];

        // These are the possible Players. Each can be human or AI.
        const PLAYERS = [
            new Player({
                index: 0,
                defaultName: 'Amber',
                colorStart: '#fe8', colorEnd: '#c81',
                highlightStart: '#fd8', highlightEnd: '#a80'
            }),
            new Player({
                index: 1,
                defaultName: 'Crimson',
                colorStart: '#f88', colorEnd: '#a44',
                highlightStart: '#faa', highlightEnd: '#944'
            }),
            new Player({
                index: 2,
                defaultName: 'Lavender',
                colorStart: '#d9d', colorEnd: '#838',
                highlightStart: '#faf', highlightEnd: '#759'
            }),
            new Player({
                index: 3,
                defaultName: 'Emerald',
                colorStart: '#9d9', colorEnd: '#282',
                highlightStart: '#bfb', highlightEnd: '#4a4'
            }),
        ];

        const WATER = UPGRADES.WATER.index;
        const EARTH = UPGRADES.EARTH.index;
        const FIRE = UPGRADES.FIRE.index;

        // AI personalities - how eagerly it builds soldiers, and what upgrades it prefers.
        // If the value of a a preferred upgrade is 2, then it should build to second level before getting the next type
        const AI_PERSONALITIES = [
            null,
            new AiPersonality({
                soldierEagerness: 1,
                preferredUpgrades: [],
            }),
            new AiPersonality({
                soldierEagerness: 0.2,
                preferredUpgrades: [ {index: WATER, level: 1}, {index: EARTH, level: 1} ],
            }),
            new AiPersonality({
                soldierEagerness: 0.25,
                preferredUpgrades: [ {index: WATER, level: 1}, {FIRE, level: 2} ],
            }),
            new AiPersonality({
                soldierEagerness: 0.15,
                preferredUpgrades: [ {index: WATER, level: 2}, {EARTH, level: 2} ],
            }),
            new AiPersonality({
                soldierEagerness: 0.4,
                preferredUpgrades: [ {index: WATER, level: 1} ],
            }),
            new AiPersonality({
                soldierEagerness: 0.3,
                preferredUpgrades: [ {index: WATER, level: 2} ],
            }),
            new AiPersonality({
                soldierEagerness: 0.25,
                preferredUpgrades: [ {index: FIRE, level: 2} ],
            }),
            new AiPersonality({
                soldierEagerness: 0.2,
                preferredUpgrades: [ {index: EARTH, level: 2} ],
            }),
        ];

        my = {
            ...my,
            UPGRADES,
            PLAYERS,
            SOUNDS,
            AI_PERSONALITIES,
            DEBUG,

            BASE_MOVES_PER_TURN: 3,
            NUM_UPGRADES: UPGRADES.length - 1,

            // Constants for setup screen
            PLAYER_OFF, PLAYER_HUMAN_SET, PLAYER_HUMAN_OPEN, PLAYER_AI,
            PLAYER_TYPES: [PLAYER_OFF, PLAYER_HUMAN_SET, PLAYER_HUMAN_OPEN, PLAYER_AI],

            AI_NICE, AI_RUDE, AI_MEAN, AI_EVIL,
            AI_LEVELS: [AI_NICE, AI_RUDE, AI_MEAN, AI_EVIL],

            UNLIMITED_TURNS,
            TURN_COUNTS: [2, 12, 15, UNLIMITED_TURNS],

            // === Special "player" for signifying a draw game
            DRAWN_GAME: {},

            // pause before move in milliseconds
            MOVE_DELAY: 500,
            // pause between moves when doing play-back of server moves
            PLAYBACK_DELAY: 1000,

            // amount of faith added when soldiers are killed defending a region
            MARTYR_BONUS: 4,

            TEMPLE_LEVELS: ["Temple", "Cathedral"],

            // Status (from server when making game data)
            WAITING_FOR_PLAYERS: 'waitingForPlayers',
            READY_TO_START: 'readyToStart',
        };
        return my;
    }

    return my;
}(CONSTS || {}));
