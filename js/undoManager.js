import stateManager from './stateManager.js';
import gameController from './gameController.js';

export default {
    undoEnabled,
    performUndo,
    setPreviousState,
};

var previousState = null;

function setPreviousState(state) {
    previousState = state;
}

function undoEnabled(gameState) {
    return previousState && // there is a state to return to
        (stateManager.activePlayer(previousState) == stateManager.activePlayer(gameState)) &&  // it was actually our move
        (!gameState.u) && // undo wasn't expressly disabled after a battle
        (stateManager.activePlayer(gameState).u == gameController.uiPickMove); // no using Undo on behalf of the AI!
}

function performUndo(currentState) {
    if (!undoEnabled(currentState))
        return;

    // clear the callbacks from previous UI interaction
    gameController.uiCallbacks = {};

    // roll-back the state to "previous"
    var restoredState = previousState;
    previousState = null;
    gameController.playOneMove(restoredState);
}
