import SOUNDS from '../state/consts/SOUNDS.js';
import utils from '../utils/utils.js';
import audio from './utils/audio.js';
import domUtils from './utils/domUtils.js';
import oneAtaTime from './utils/oneAtaTime.js';
import CONSTS from '../state/consts/CONSTS.js';
import undoManager from './undoManager.js';
import gameRenderer from './rendering/gameRenderer.js';
import gameInitialization from './gameInitialization.js';
import aiPlay from '../server/ai/aiPlay.js';    // cannot access from client - needs server API
import uiCallbacks from './uiCallbacks.js';
import uiPickMove from './uiPickMove.js';
import makeMove from './makeMove.js';
const $ = domUtils.$;

var humanMoveStates = [];
var lastPlayer = undefined;

// Deals with responding to user actions - whterh human or AI.
export default function playOneMove(state) {

    oneAtaTime(CONSTS.MOVE_DELAY, function() {

        const player = state.activePlayer();
        if (!lastPlayer || player.personality != lastPlayer.personality) { // player changed from human to AI or vv
            if (humanMoveStates.length) {
                // send the moves to the server to be recorded in firestore
            }
            if (player.personality) {
                // request that the computer make the AI moves (asynchronously, and also store them in firestore) but do not actually show them.
                aiPlay.aiPickMove(player, state, function(move) {
                    audio.playSound(SOUNDS.CLICK);
                    const newState = makeMove(state, move);

                    if (newState.endResult) { // did the game end?
                        showEndGame(newState);
                        return;
                    }
                    else setTimeout(() => playOneMove(newState), 1); // recursive call
                });
            }
            humanMoveStates = [];
            lastPlayer == player;
        }

        // automatically end the turn of dead players
        if (!state.regionCount(player))
            return reportMoveCallback(new EndMove());

        if (!player.personality) {
            uiPickMove(player, state, function(move) {
                const newState = makeMove(state, move);

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
            // in the resultHandler, play back those moves visually (by calling oneAtATime). This continues until the state indicatest that the player is human again.
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
        $('in').innerHTML = domUtils.elem('p', {}, "Click the button below to start a new game.");
        $('in').style.background = '#555';
        $('mv').style.display = 'none';
        gameRenderer.updateButtons([ {text: "New game"} ]);

        uiCallbacks.setBuildCB(gameInitialization.runSetupScreen);
    });
}
