import CONSTS from '../state/CONSTS.js';
import utils from '../utils/utils.js';
import geomUtils from './rendering/geomUtils.js';

const STORAGE_KEY = 'world-conflict';

// The default game setup screen configuration.
// firstTimeInstructions are shown only the first time the player plays on a given computer (or until cache cleared).
var defaultSetup = {
    players: [CONSTS.PLAYER_HUMAN, CONSTS.PLAYER_AI, CONSTS.PLAYER_OFF, CONSTS.PLAYER_AI],
    aiLevel: CONSTS.AI_NICE,
    sound: true,
    turnCount: 12,
    firstTimeInstructions: {},
    mapWidth: geomUtils.MAP_WIDTH,
    mapHeight: geomUtils.MAP_HEIGHT,
};

export default {
    retrieveSetup,
    storeSetup,
};

// Gets user preferences from local storage, or returns false if there aren't any.
function retrieveSetup() {
    if (localStorage) {
        var stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            stored = JSON.parse(stored);
            utils.forEachProperty(defaultSetup, function (value, name) {
                if (stored[name] === undefined)
                    stored[name] = value;
            });
            return stored;
        }
    }

    return defaultSetup;
}

// Tries to store user preferences in local storage.
function storeSetup(gameSetup) {
    if (localStorage) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(gameSetup));
    }
}