import utils from './utils.js';
import sequenceUtils from './sequenceUtils.js';
import gameData from './gameData.js';
import stateManager from './stateManager.js';
import gameController from './gameController.js';
import gameRenderer from './gameRenderer.js';
const $ = utils.$

// the game setup screen config
var defaultSetup = {
    p: [gameData.PLAYER_HUMAN, gameData.PLAYER_AI, gameData.PLAYER_AI, gameData.PLAYER_OFF],
    l: gameData.AI_NICE,
    sound: true,
    tc: 12,
    tt: {},
};

var gameSetup = getSetupFromStorage();
var appState = 0;

export default {
    gameSetup,
    getSetupFromStorage,
    runSetupScreen,
    storeSetupInLocalStorage,
    appState,
};

// Gets user preferences from local storage, or returns false if there aren't any.
function getSetupFromStorage() {
    if (localStorage) {
        var stored = localStorage.getItem("s");
        if (stored) {
            stored = JSON.parse(stored);
            utils.forEachProperty(defaultSetup, function (value, name) {
                if (stored[name] === undefined)
                    stored[name] = value;
            });
            return stored;
        }
    }

    return defaultSetup;
}

// Tries to store user preferences in local storage.
function storeSetupInLocalStorage() {
    if (localStorage) {
        localStorage.setItem("s", JSON.stringify(gameSetup));
    }
}

function prepareSetupUI() {
    // player box area
    var html = utils.div({c: 'sc ds'}, "Player setup");
    var playerBoxes = utils.map(gameData.PLAYER_TEMPLATES, function(player) {
        var pid = player.i;
        return buttonPanel(player.n, "sb" + player.i, ["AI", "Human", "Off"], {
            i: 'pl' + pid,
            c: 'pl',
            s: 'background: ' + player.d
        });
    }).join("");
    html += utils.div({i: 'pd', c: 'sc un'}, playerBoxes);
    html += buttonPanel("AI", "ai", ["Evil", "Mean", "Rude", "Nice"]);
    html += buttonPanel("Turns", "tc", ["Endless", "15", "12", "9"]);

    // realize the UI
    $('d').innerHTML = html;

    // hide stat box and undo button
    utils.map(['mv', 'und', 'end'], utils.hide);

    // setup callbacks for players
    utils.for2d(0, 0, gameData.PLAYER_TEMPLATES.length, 3, function(playerIndex, buttonIndex) {
        utils.onClickOrTap($('sb' + playerIndex + buttonIndex), gameController.invokeUICallback.bind(0, {p: playerIndex, b: buttonIndex}, 'sb'));
    });
    utils.map(utils.range(0, 4), function(index) {
        utils.onClickOrTap($('ai' + index), gameController.invokeUICallback.bind(0, index, 'ai'));
        utils.onClickOrTap($('tc' + index), gameController.invokeUICallback.bind(0, gameData.TURN_COUNTS[index], 'tc'));
    });

    function buttonPanel(title, buttonIdPrefix, buttonLabels, additionalProperties) {
        var buttons = utils.map(buttonLabels, function(label, index) {
            var id = buttonIdPrefix + (buttonLabels.length-1-index);
            return utils.elem('a', {i: id, c: 'rt', href: '#', s: 'font-size: 90%'}, label);
        }).join("");
        var properties = {c: 'sc ds', s: 'padding-right: 0.5em'};
        utils.forEachProperty(additionalProperties, function(value, name) {
            properties[name] = value;
        });
        return utils.div(properties, title + buttons);
    }
}

function runSetupScreen() {
    // we're in setup now
    appState = gameData.APP_SETUP_SCREEN;

    // generate initial setup and game state
    var game;
    regenerateMap();

    // prepare UI
    prepareSetupUI();
    updateBottomButtons();
    updateConfigButtons();

    // callback for the buttons on the bottom
    gameController.uiCallbacks.b = function(which) {
        if (!setupValid()) return;
        if (which == 0) {
            regenerateMap();
        } else {
            prepareIngameUI(game);
            gameRenderer.updateDisplay(game);
            gameController.playOneMove(game);
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
    gameController.uiCallbacks.tc = function(turnCount) {
        gameSetup.tc = turnCount;
        updateConfigButtons();
    };


    // Prepares the whole sidebar on the left for gameplay use.
    function prepareIngameUI(gameState) {
        // turn counter
        var html = utils.div({i: 'tc', c: 'sc'});

        // player box area
        html += utils.div({i: 'pd', c: 'sc un'}, utils.map(gameState.p, function(player) {
            var pid = player.i;
            return utils.div({
                i: 'pl' + pid,
                c: 'pl',
                style: 'background: ' + player.d
            }, player.n +
                utils.div({c: 'ad', i: 'pr' + pid}) +
                utils.div({c: 'ad', i: 'pc' + pid})
            );
        }).join(''));

        // info box
        html += utils.div({c: 'sc un ds', i: 'in'});

        // set it all
        $('d').innerHTML = html;

        // show stat box and undo button
        utils.map(['mv', 'und', 'end'], utils.show);
    }

    function setupValid() {
        var enabledPlayers = sequenceUtils.sum(gameSetup.p, function(playerState) {
            return (playerState != gameData.PLAYER_OFF) ? 1 : 0;
        });
        return enabledPlayers > 1;
    }

    function updateBottomButtons() {
        var buttonsDisabled = !setupValid();
        gameRenderer.updateButtons([
            {t: "Change map", o: buttonsDisabled},
            {t: "Start game", o: buttonsDisabled}
        ]);
    }

    function updateConfigButtons() {
        // somebody changed something, so store the new setup
        storeSetupInLocalStorage(gameSetup);

        // update player buttons
        utils.map(gameSetup.p, function(controller, playerIndex) {
           utils.map(utils.range(0, 3), function(buttonIndex) {
               utils.toggleClass('sb' + playerIndex + buttonIndex, 'sl', (controller == buttonIndex));
           })
        });

        // update AI and turn count buttons
        utils.map(utils.range(0, 4), function(index) {
            utils.toggleClass('ai' + index, 'sl', index == gameSetup.l);
            utils.toggleClass('tc' + index, 'sl', gameData.TURN_COUNTS[index] == gameSetup.tc);
        });
    }

    function regenerateMap() {
        if (setupValid()) {
            game = stateManager.makeInitialState(gameSetup);
            gameRenderer.showMap($('m'), game);
            gameRenderer.updateMapDisplay(game);
        }
    }
}
