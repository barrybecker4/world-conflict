import oneAtaTime from './utils/oneAtaTime.js';
import undoManager from './undoManager.js';
import gameRenderer from './rendering/gameRenderer.js';
import runSetupScreen from './runSetupScreen.js';
import aiPlay from '../server/ai/aiPlay.js';    // cannot access from client - needs server API
import uiCallbacks from './uiCallbacks.js';
import uiPickMove from './uiPickMove.js';
import makeMove from './makeMove.js';
const $ = domUtils.$;

var humanStates = [];

// Deals with responding to user actions - whether human or AI.
export default function playOneMove(state) {

    oneAtaTime(CONSTS.MOVE_DELAY, function() {

        const player = state.activePlayer();

        //  player changed from human to AI or vv
        //  later this will look for the transition from the player on this client and everyone else.
        if (!state.prevPlayer() || player.personality != state.prevPlayer().personality) {
            if (humanStates.length) {
                firestore.appendStatesForGame(gameData.gameId, humanStates);
            }
            if (player.personality) {
                // request that the computer make the AI moves (asynchronously, and also store them in firestore) but do not actually show them.
                aiPlay.aiPickMove(player, state, function(move) {
                    state.modeDecision = move; // here?
                    audio.playSound(SOUNDS.CLICK); // this will happen on playback
                    const newState = makeMove(state, move); // plays a transition forward. A transition consists of a move and a state.
                    if (newState.endResult) { // did the game end?
                        showEndGame(newState); // this will happen on playback
                        return;
                    }
                    else setTimeout(() => playOneMove(newState), 1); // recursive call
                });
            }
            humanStates = [];
        }

        if (!player.personality) {
            uiPickMove(player, state, function(move) {
                state.moveDecision = move; // here?
                const newState = makeMove(state, move);
                humanStates.push(state);

                if (newState.endResult) { // did the game end?
                    showEndGame(newState);
                    return;
                } else {
                    undoManager.setPreviousState(state.copy()); // only humans can undo
                    setTimeout(() => playOneMove(newState), 1); // recursive call
                }
            });
        } else {
            // wait 1 second, then request from the server, whatever moves were made from the last state that we saw.
            // In the resultHandler, play back those moves visually (by calling oneAtATime).
            // This continues until the state indicates that the player is human again.
        }

        gameRenderer.updateDisplay(state);
    });
}

function showEndGame(state) {
    oneAtaTime(CONSTS.MOVE_DELAY, () => gameRenderer.updateDisplay(state));
    oneAtaTime(CONSTS.MOVE_DELAY, function() {
        const winner = state.endResult;
        const delay = 200;
        const duration = 4000;
        if (winner != CONSTS.DRAWN_GAME) {
            gameRenderer.showBanner(winner.colorEnd, winner.name + " wins the game!", delay, duration);
        } else {
            gameRenderer.showBanner('#333', "The game ends in a draw!", delay, duration);
        }

        gameRenderer.updateDisplay(state);

        $('turn-count').innerHTML = "Game complete";
        $('info').innerHTML = domUtils.elem('p', {}, "Click the button below to start a new game.");
        $('info').style.background = '#555';
        $('move-info').style.display = 'none';
        gameRenderer.updateButtons([ {text: "New game"} ]);

        uiCallbacks.setBuildCB(runSetupScreen);
    });
}
