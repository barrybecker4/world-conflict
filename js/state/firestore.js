// This should eventually be replaced by a real firestore nosql database.
// See https://github.com/barrybecker4/world-conflict/issues/5 for info.

// map from gameId to list of game states. A players move can consist of multiple game states.
const gameCollection = {};

export default {
    getStatesForGame,
    appendStatesForGame,
}

/**
 * @return all game states for the specified gameId since the lastStateId
 */
function getStatesForGame(gameId, lastStateId) {
    let states = gameCollection[gameId];
    return lastStateId ? states.filter(trans => trans.state.id > lastStateId) : states;
}

/**
 * Add games States for a particular game.
 * A State contains a moveDecision that will transform it to the next state.
 */
function appendStatesForGame(gameId, newGameStates) {
    if (newGameStates && newGameStates.length > 0) {
        let states = gameCollection[gameId] || [];
        gameCollection[gameId] = states.concat(newGameStates);
    }
}
