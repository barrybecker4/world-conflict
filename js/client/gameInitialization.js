import utils from '../utils/utils.js';
import domUtils from './utils/domUtils.js';
import sequenceUtils from '../utils/sequenceUtils.js';
import gameData from '../state/consts/gameData.js';
import storage from './storage.js';
import appState from './appState.js';
import makeInitialGameState from '../state/makeInitialGameState.js';
import PLAYERS from '../state/consts/PLAYERS.js';
import playOneMove from './playOneMove.js';
import gameRenderer from './rendering/gameRenderer.js';
import uiCallbacks from './uiCallbacks.js';
const { $, div } = domUtils;

export default {
    gameSetup,
    runSetupScreen,
};

var gameSetup = storage.retrieveSetup();

function prepareSetupUI() {
    // player box area
    var html = div({c: 'sc description'}, "Player setup");
    var playerBoxes = utils.map(PLAYERS, function(player) {
        var pid = player.index;
        return buttonPanel(player.name, "sb" + player.index, ["AI", "Human", "Off"], {
            i: 'pl' + pid,
            c: 'pl',
            s: 'background: ' + player.colorEnd
        });
    }).join("");
    html += div({i: 'pd', c: 'sc un'}, playerBoxes);
    html += buttonPanel("AI", "ai", ["Evil", "Mean", "Rude", "Nice"]);
    html += buttonPanel("Turns", "turn-count", ["Endless", "15", "12", "9"]);

    // realize the UI
    $('d').innerHTML = html;

    // hide stat box and undo button
    utils.map(['mv', 'undo-button', 'restart'], domUtils.hide);

    // setup callbacks for players
    utils.for2d(0, 0, PLAYERS.length, 3, function(playerIndex, buttonIndex) {
        domUtils.onClickOrTap(
            $('sb' + playerIndex + buttonIndex),
            (event) => uiCallbacks.invokeCallback({p: playerIndex, b: buttonIndex}, 'setupButtons', event)
        );
    });
    utils.map(utils.range(0, 4), function(index) {
        domUtils.onClickOrTap(
            $('ai' + index),
            (event) => uiCallbacks.invokeCallback(index, 'ai', event)
        );
        domUtils.onClickOrTap(
            $('turn-count' + index),
            (event) => uiCallbacks.invokeCallback(gameData.TURN_COUNTS[index], 'turn-count', event)
        );
    });

    function buttonPanel(title, buttonIdPrefix, buttonLabels, additionalProperties) {
        var buttons = utils.map(buttonLabels, function(label, index) {
            var id = buttonIdPrefix + (buttonLabels.length - 1 - index);
            return domUtils.elem('a', {i: id, c: 'rt', href: '#', s: 'font-size: 90%'}, label);
        }).join("");
        var properties = {i: buttonIdPrefix, c: 'sc description', s: 'padding-right: 0.5em'}; // not sure about i: buttonIdPrefix
        utils.forEachProperty(additionalProperties, function(value, name) {
            properties[name] = value;
        });
        return div(properties, title + buttons);
    }
}

function runSetupScreen() {
    // we're in setup now
    appState.setInGame(false);

    // generate initial setup and game state
    var gameState;
    regenerateMap();

    // prepare UI
    prepareSetupUI();
    updateBottomButtons();
    updateConfigButtons();

    // callback for the buttons on the bottom
    uiCallbacks.build = function(which) {
        if (!isSetupValid()) return;
        if (which === 0) {
            regenerateMap();
        } else {
            prepareIngameUI(gameState);
            gameRenderer.updateDisplay(gameState);
            playOneMove(gameState);
        }
    };
    // callback for player setup buttons
    uiCallbacks.setupButtons = function(event) {
        // set the controller type for the player
        gameSetup.players[event.p] = event.b;
        updateConfigButtons();
        updateBottomButtons();
        regenerateMap();
    };
    // callback for config buttons
    uiCallbacks.ai = function(aiLevel) {
        gameSetup.aiLevel = aiLevel;
        updateConfigButtons();
    };
    uiCallbacks['turn-count'] = function(turnCount) {
        gameSetup.turnCount = turnCount;
        updateConfigButtons();
    };


    // Prepares the whole sidebar on the left for gameplay use.
    function prepareIngameUI(gameState) {
        // turn counter
        var html = div({i: 'turn-count', c: 'sc'});

        // player box area
        html += div({i: 'pd', c: 'sc un'}, utils.map(gameState.players, function(player) {
            var pid = player.index;
            return div({
                i: 'pl' + pid,
                c: 'pl',
                style: 'background: ' + player.colorEnd
            }, player.name +
                div({c: 'ad', i: 'particle' + pid}) +
                div({c: 'ad', i: 'player-cash' + pid})
            );
        }).join(''));

        // info box
        html += div({c: 'sc un description', i: 'in'});

        // set it all
        $('d').innerHTML = html;

        // show stat box and undo button
        utils.map(['mv', 'undo-button', 'restart'], domUtils.show);
    }

    function isSetupValid() {
        var enabledPlayers = sequenceUtils.sum(gameSetup.players, function(playerState) {
            return (playerState != gameData.PLAYER_OFF) ? 1 : 0;
        });
        return enabledPlayers > 1;
    }

    function updateBottomButtons() {
        var buttonsDisabled = !isSetupValid();
        gameRenderer.updateButtons([
            {t: "Change map", o: buttonsDisabled},
            {t: "Start game", o: buttonsDisabled}
        ]);
    }

    function updateConfigButtons() {
        // somebody changed something, so store the new setup
        storage.storeSetup(gameSetup);

        // update player buttons
        utils.map(gameSetup.players, function(controller, playerIndex) {
           utils.map(utils.range(0, 3), function(buttonIndex) {
               domUtils.toggleClass('sb' + playerIndex + buttonIndex, 'sl', (controller == buttonIndex));
           })
        });

        // update AI and turn count buttons
        utils.map(utils.range(0, 4), function(index) {
            domUtils.toggleClass('ai' + index, 'sl', index == gameSetup.aiLevel);
            domUtils.toggleClass('turn-count' + index, 'sl', gameData.TURN_COUNTS[index] == gameSetup.turnCount);
        });
    }

    function regenerateMap() {
        if (isSetupValid()) {
            gameState = makeInitialGameState(gameSetup);
            gameRenderer.showMap($('m'), gameState);
            gameRenderer.updateMapDisplay(gameState);
        }
    }
}
