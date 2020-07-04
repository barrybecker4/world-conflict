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


// Deals with responding to user actions.
export default function playOneMove(state) {

    oneAtaTime(CONSTS.MOVE_DELAY, function() {

        // keep track of the states and last player, and when the player changes, if that player is an AI,
        // play forward all the moves/state changes all at once.
        // 1) if controllingPlayer is human, then do as below (but store the newStats in an array).
        //    when done simulate call out to server where we pass the human moves just made
        // 2) if not human, then call out to server with []
        // 3) when returning from server call, wait 1 second, then request the latest moves from the server
        // 4) play forward whatever moves are retrieved and keep requesting more, until the state indicates
        //    that the controlling player is human again.
        var controllingPlayer = state.activePlayer();

        // let the player pick their move using UI or AI
        pickMove(controllingPlayer, state, function(move) {
            // AI makes sounds when playing
            if (controllingPlayer.personality)
                audio.playSound(SOUNDS.CLICK);

            // the move is chosen - update state to a new immutable copy
            var newState = makeMove(state, move);

            if (newState.endResult) { // did the game end?
                showEndGame(newState);
                return;
            }
            else {
                undoManager.setPreviousState(state.copy());
                // still more of the game to go - next move, please!
                setTimeout(() => playOneMove(newState), 1);   // recursive call
            }
        });

        gameRenderer.updateDisplay(state);
    });
}

function showEndGame(state) {
    oneAtaTime(CONSTS.MOVE_DELAY, () => gameRenderer.updateDisplay(state));
    oneAtaTime(CONSTS.MOVE_DELAY, function() {
        var winner = state.endResult;
        if (winner != CONSTS.DRAWN_GAME) {
            gameRenderer.showBanner(winner.colorEnd, winner.name + " wins the game!");
        } else {
            gameRenderer.showBanner('#333', "The game ends in a draw!");
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

/**
 * Asks the UI (for humans) or the AI (for CPU players) to pick
 * the next move to make in the game. This happens asynchronously.
 *
 * @param player the player to move
 * @param state the state in which to make the move
 * @param reportMoveCallback should be called with the desired move as parameter once the decision is made
 */
function pickMove(player, state, reportMoveCallback) {
    // automatically end the turn of dead players
    if (!state.regionCount(player))
        return reportMoveCallback(new EndMove());

    // delegate to whoever handles this player
    let doPickMove = player.personality ? aiPlay.aiPickMove : uiPickMove;
    doPickMove(player, state, reportMoveCallback);
}
