import utils from './utils/utils.js';
import sequenceUtils from './utils/sequenceUtils.js';
import gameData from './state/gameData.js';
import storage from './state/storage.js';
import appState from './state/appState.js';
import makeInitialGameState from './state/makeInitialGameState.js';
import PLAYERS from './state/model/PLAYERS.js';
import gameController from './gameController.js';
import gameRenderer from './rendering/gameRenderer.js';
const $ = utils.$

export default {
    gameSetup,
    runSetupScreen,
};

var gameSetup = storage.retrieveSetup();

function prepareSetupUI() {
    // player box area
    var html = utils.div({c: 'sc ds'}, "Player setup");
    var playerBoxes = utils.map(PLAYERS, function(player) {
        var pid = player.index;
        return buttonPanel(player.name, "sb" + player.index, ["AI", "Human", "Off"], {
            i: 'pl' + pid,
            c: 'pl',
            s: 'background: ' + player.colorEnd
        });
    }).join("");
    html += utils.div({i: 'pd', c: 'sc un'}, playerBoxes);
    html += buttonPanel("AI", "ai", ["Evil", "Mean", "Rude", "Nice"]);
    html += buttonPanel("Turns", "turn-count", ["Endless", "15", "12", "9"]);

    // realize the UI
    $('d').innerHTML = html;

    // hide stat box and undo button
    utils.map(['mv', 'undo-button', 'restart'], utils.hide);

    // setup callbacks for players
    utils.for2d(0, 0, PLAYERS.length, 3, function(playerIndex, buttonIndex) {
        utils.onClickOrTap(
            $('sb' + playerIndex + buttonIndex),
            gameController.invokeUICallback.bind(0, {p: playerIndex, b: buttonIndex}, 'sb')
        );
    });
    utils.map(utils.range(0, 4), function(index) {
        utils.onClickOrTap(
            $('ai' + index),
            gameController.invokeUICallback.bind(0, index, 'ai')
        );
        utils.onClickOrTap(
            $('turn-count' + index),
            gameController.invokeUICallback.bind(0, gameData.TURN_COUNTS[index], 'turn-count')
        );
    });

    function buttonPanel(title, buttonIdPrefix, buttonLabels, additionalProperties) {
        var buttons = utils.map(buttonLabels, function(label, index) {
            var id = buttonIdPrefix + (buttonLabels.length - 1 - index);
            return utils.elem('a', {i: id, c: 'rt', href: '#', s: 'font-size: 90%'}, label);
        }).join("");
        var properties = {i: buttonIdPrefix, c: 'sc ds', s: 'padding-right: 0.5em'}; // not sure about i: buttonIdPrefix
        utils.forEachProperty(additionalProperties, function(value, name) {
            properties[name] = value;
        });
        return utils.div(properties, title + buttons);
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
    gameController.uiCallbacks.b = function(which) {
        if (!isSetupValid()) return;
        if (which === 0) {
            regenerateMap();
        } else {
            prepareIngameUI(gameState);
            gameRenderer.updateDisplay(gameState);
            gameController.playOneMove(gameState);
        }
    };
    // callback for player setup buttons
    gameController.uiCallbacks.sb = function(event) {
        // set the controller type for the player
        gameSetup.p[event.p] = event.b;
        updateConfigButtons();
        updateBottomButtons();
        regenerateMap();
    };
    // callback for config buttons
    gameController.uiCallbacks.ai = function(aiLevel) {
        gameSetup.l = aiLevel;
        updateConfigButtons();
    };
    gameController.uiCallbacks['turn-count'] = function(turnCount) {
        gameSetup.turnCount = turnCount;
        updateConfigButtons();
    };


    // Prepares the whole sidebar on the left for gameplay use.
    function prepareIngameUI(gameState) {
        // turn counter
        var html = utils.div({i: 'turn-count', c: 'sc'});

        // player box area
        html += utils.div({i: 'pd', c: 'sc un'}, utils.map(gameState.players, function(player) {
            var pid = player.index;
            return utils.div({
                i: 'pl' + pid,
                c: 'pl',
                style: 'background: ' + player.colorEnd
            }, player.name +
                utils.div({c: 'ad', i: 'particle' + pid}) +
                utils.div({c: 'ad', i: 'player-cash' + pid})
            );
        }).join(''));

        // info box
        html += utils.div({c: 'sc un ds', i: 'in'});

        // set it all
        $('d').innerHTML = html;

        // show stat box and undo button
        utils.map(['mv', 'undo-button', 'restart'], utils.show);
    }

    function isSetupValid() {
        var enabledPlayers = sequenceUtils.sum(gameSetup.p, function(playerState) {
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
        utils.map(gameSetup.p, function(controller, playerIndex) {
           utils.map(utils.range(0, 3), function(buttonIndex) {
               utils.toggleClass('sb' + playerIndex + buttonIndex, 'sl', (controller == buttonIndex));
           })
        });

        // update AI and turn count buttons
        utils.map(utils.range(0, 4), function(index) {
            utils.toggleClass('ai' + index, 'sl', index == gameSetup.l);
            utils.toggleClass('turn-count' + index, 'sl', gameData.TURN_COUNTS[index] == gameSetup.turnCount);
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
