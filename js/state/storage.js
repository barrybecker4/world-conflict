import gameData from './gameData.js';
import utils from '../utils/utils.js';

const STORAGE_KEY = 'world-conflict';

// the game setup screen config
var defaultSetup = {
    players: [gameData.PLAYER_HUMAN, gameData.PLAYER_AI, gameData.PLAYER_AI, gameData.PLAYER_OFF],
    aiLevel: gameData.AI_NICE,
    sound: true,
    turnCount: 12,
    tt: {},  // tooltips?
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