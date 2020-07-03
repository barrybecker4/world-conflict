// This should eventually be replaced by a real firestore nosql database.
// See https://github.com/barrybecker4/world-conflict/issues/5 for info.

// map from gameId to list of game states. A players move can consist of multiple game states.
const gameCollection = {};

export default {
    getStatesForGame,
}

/**
 * @return all game states for the specified gameId since the lastStateId
 */
function getStatesForGame(gameId, lastStateId) {
    let states = gameCollection[gameId];
    return lastStateId ? states.filter(s => s.id > lastStateId) : states;
}

/**
 * Add games states for a particular game
 */
function appendStatesForGame(gameId, newGameStates) {
    if (gameStates && gameStates.length > 0) {
        let states = gameCollection[gameId];
        gameCollection[gameId] = states.concat(newGameStates);
    }
}
