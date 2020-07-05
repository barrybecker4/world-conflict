// This should eventually be replaced by a real firestore nosql database.
// See https://github.com/barrybecker4/world-conflict/issues/5 for info.

// map from gameId to list of game states. A players move can consist of multiple game states.
const gameCollection = {};

export default {
    getTransitionsForGame,
    appendTransitionsForGame,
}

/**
 * @return all game states for the specified gameId since the lastStateId
 */
function getTransitionsForGame(gameId, lastStateId) {
    let transitions = gameCollection[gameId];
    return lastStateId ? states.filter(trans => trans.state.id > lastStateId) : transitions;
}

/**
 * Add games transitions for a particular game.
 * A transition consists of a state and move that will transform it to the next state.
 */
function appendTransitionsForGame(gameId, newGameTransitions) {
    if (newGameTransitions && newGameTransitions.length > 0) {
        let transitions = gameCollection[gameId] || [];
        gameCollection[gameId] = transitions.concat(newGameTransitions);
    }
}
