import audio from './utils/audio.js';
import utils from '../utils/utils.js';
import domUtils from './utils/domUtils.js';
import oneAtaTime from './utils/oneAtaTime.js';
import gameData from '../state/gameData.js';
import undoManager from './undoManager.js';
import appState from './appState.js';
import gameRenderer from './rendering/gameRenderer.js';
import gameInitialization from './gameInitialization.js';
import aiPlay from '../server/ai/aiPlay.js';    // cannot access from client - needs server API
import uiCallbacks from './uiCallbacks.js';
import makeMove from './makeMove.js';
const $ = domUtils.$;


// Deals with responding to user actions.
export default function playOneMove(state) {

    appState.setInGame(true); // playing the game now

    oneAtaTime(150, function() {
        var controllingPlayer = state.activePlayer();

        // let the player pick their move using UI or AI
        pickMove(controllingPlayer, state, function(move) {
            // AI makes sounds when playing
            if (controllingPlayer.pickMove == aiPlay.aiPickMove)
                audio.playSound(audio.sounds.CLICK);

            // the move is chosen - update state to a new immutable copy
            var newState = makeMove(state, move);

            if (newState.endResult) { // did the game end?
                oneAtaTime(150, () => gameRenderer.updateDisplay(newState));
                showEndGame(newState);
                return;
            } else {
                undoManager.setPreviousState(state.copy());
                // still more of the game to go - next move, please!
                setTimeout(() => playOneMove(newState), 1);
            }
        });

        gameRenderer.updateDisplay(state);
    });
}

function showEndGame(state) {
    oneAtaTime(1, function() {
        var winner = state.endResult;
        if (winner != gameData.DRAW_GAME) {
            gameRenderer.showBanner(winner.colorEnd, winner.name + " wins the game!");
        } else {
            gameRenderer.showBanner('#333', "The game ends in a draw!");
        }

        gameRenderer.updateDisplay(state);

        $('turn-count').innerHTML = "Game complete";
        $('in').innerHTML = domUtils.elem('p', {}, "Click the button below to start a new game.");
        $('in').style.background = '#555';
        $('mv').style.display = 'none';
        gameRenderer.updateButtons([ {t: "New game"} ]);

        uiCallbacks.build = gameInitialization.runSetupScreen;
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
    player.pickMove(player, state, reportMoveCallback);
}
