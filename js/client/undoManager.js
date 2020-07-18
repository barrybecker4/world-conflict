var erisk = (function(my) {

    var previousState = null;

    my.setPreviousState = function(state) {
        previousState = state;
    }

    my.undoEnabled = function(gameState) {
        return previousState && // there is a state to return to
            (previousState.activePlayer() == gameState.activePlayer()) &&  // it was actually our move
            (!gameState.undoDisabled) && // undo wasn't expressly disabled after a battle
            (!gameState.activePlayer().personality); // no using Undo on behalf of the AI!
    }

    my.performUndo = function(currentState) {
        if (!my.undoEnabled(currentState))
            return;

        // clear the callbacks from previous UI interaction
        uiCallbacks.clearAll();

        // roll-back the state to "previous"
        var restoredState = previousState;
        previousState = null;
        erisk.playOneMove(restoredState);
    }

    return my;
}(erisk || {}));
