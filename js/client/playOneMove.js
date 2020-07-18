var erisk = (function(my) {
    const $ = domUtils.$;
    var humanStates = [];

    // Deals with responding to user actions - whether human or AI.
    my.playOneMove = function(state) {

        erisk.oneAtaTime(CONSTS.MOVE_DELAY, function() {

            const player = state.activePlayer();

            //  player changed from human to AI or vv
            //  later this will look for the transition from the player on this client and everyone else.
            if (!state.prevPlayer() || player.personality != state.prevPlayer().personality) {
                if (humanStates.length) {
                    firestore.appendStatesForGame(gameData.gameId, humanStates);
                }
                if (player.personality) {
                    // request that the computer make the AI moves (asynchronously, and also store them in firestore) but do not actually show them.
                    erisk.aiPickMove(player, state, function(move) {
                        state.modeDecision = move; // here?
                        audio.playSound(SOUNDS.CLICK); // this will happen on playback
                        const newState = erisk.makeMove(state, move); // plays a transition forward. A transition consists of a move and a state.
                        if (newState.endResult) { // did the game end?
                            showEndGame(newState); // this will happen on playback
                            return;
                        }
                        else setTimeout(() => my.playOneMove(newState), 1); // recursive call
                    });
                }
                humanStates = [];
            }

            if (!player.personality) {
                erisk.uiPickMove(player, state, function(move) {
                    state.moveDecision = move; // here?
                    const newState = erisk.makeMove(state, move);
                    humanStates.push(state);

                    if (newState.endResult) { // did the game end?
                        showEndGame(newState);
                        return;
                    } else {
                        erisk.setPreviousState(state.copy()); // only humans can undo
                        setTimeout(() => my.playOneMove(newState), 1); // recursive call
                    }
                });
            } else {
                // wait 1 second, then request from the server, whatever moves were made from the last state that we saw.
                // In the resultHandler, play back those moves visually (by calling oneAtATime).
                // This continues until the state indicates that the player is human again.
            }

            erisk.gameRenderer.updateDisplay(state);
        });
    }

    function showEndGame(state) {
        erisk.oneAtaTime(CONSTS.MOVE_DELAY, () => erisk.gameRenderer.updateDisplay(state));
        erisk.oneAtaTime(CONSTS.MOVE_DELAY, function() {
            const winner = state.endResult;
            const delay = 200;
            const duration = 4000;
            if (winner != CONSTS.DRAWN_GAME) {
                erisk.gameRenderer.showBanner(winner.colorEnd, winner.name + " wins the game!", delay, duration);
            } else {
                erisk.gameRenderer.showBanner('#333', "The game ends in a draw!", delay, duration);
            }

            erisk.gameRenderer.updateDisplay(state);

            $('turn-count').innerHTML = "Game complete";
            $('info').innerHTML = domUtils.elem('p', {}, "Click the button below to start a new game.");
            $('info').style.background = '#555';
            $('move-info').style.display = 'none';
            erisk.gameRenderer.updateButtons([ {text: "New game"} ]);

            uiCallbacks.setBuildCB(erisk.runSetupScreen);
        });
    }

    return my;
}(erisk || {}));
