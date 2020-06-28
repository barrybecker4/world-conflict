import utils from '../utils/utils.js';
import audio from './utils/audio.js';
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
import map from './map.js';
const { $, div } = domUtils;

export default {
    gameSetup,
    runSetupScreen,
};

var gameSetup = storage.retrieveSetup();

function runSetupScreen() {
    audio.setupAudio();
    appState.setInGame(false); // in setup
    let { gameState, regions } = regenerateInitialState({});
    createSetupUI(gameSetup);

    // callback for the buttons on the bottom
    uiCallbacks.setBuildCB(function(which) {
        if (!isSetupValid()) return;
        if (which === 0) {
            ({ gameState, regions } = regenerateInitialState({gameState, regions}));
        } else {
            map.regions = regions;
            prepareIngameUI(gameState);
            gameRenderer.updateDisplay(gameState);
            playOneMove(gameState); // start the game
        }
    });
    // callback for player setup buttons
    uiCallbacks.setSetupButtonsCB(function(event) {
        // set the controller type for the player
        gameSetup.players[event.playerIndex] = event.buttonIndex;
        updateConfigButtons();
        updateBottomButtons();
        ({ gameState, regions } = regenerateInitialState({gameState, regions}));
    });
    // callback for AI config buttons
    uiCallbacks.setAiCB(function(aiLevel) {
        gameSetup.aiLevel = aiLevel;
        updateConfigButtons();
    });
    uiCallbacks.setTurnCountCB(function(turnCount) {
        gameSetup.turnCount = turnCount;
        updateConfigButtons();
    });
}

function createSetupUI(gameState) {
    prepareSetupUI();
    updateBottomButtons();
    updateConfigButtons();
}

// Prepares the whole sidebar on the left for gameplay use.
function prepareIngameUI(gameState) {
    // turn counter
    var html = div({i: 'turn-count', c: 'sc'});

    // player box area
    html += div({i: 'pd', c: 'sc un'}, gameState.players.map(player => {
        var pid = player.index;
        return div({ i: 'pl' + pid, c: 'pl', style: 'background: ' + player.colorEnd },
            player.name +
            div({ c: 'ad', i: 'region-count' + pid, tt: 'number of countries owned' }) +
            div({ c: 'ad', i: 'player-cash' + pid, tt: 'amount of faith' })
        );
    }).join(''));

    // info box
    html += div({c: 'sc un description', i: 'in'});

    // set it all
    $('d').innerHTML = html;

    // show stat box and undo button
    ['mv', 'undo-button', 'restart'].map(domUtils.show);
}

function regenerateInitialState(stateAndRegions) {
    let newStateAndRegions = stateAndRegions;
    if (isSetupValid()) {
        newStateAndRegions = makeInitialGameState(gameSetup);
        gameRenderer.showMap($('m'), newStateAndRegions.gameState, newStateAndRegions.regions);
        gameRenderer.updateMapDisplay(newStateAndRegions.gameState, newStateAndRegions.regions);
    }
    return newStateAndRegions;
}

function updateConfigButtons() {
    // somebody changed something, so store the new setup
    storage.storeSetup(gameSetup);

    // update player buttons
    gameSetup.players.map(function(controller, playerIndex) {
       utils.range(0, 3).map(buttonIndex =>
           domUtils.toggleClass('sb' + playerIndex + buttonIndex, 'sl', (controller == buttonIndex))
       )
    });

    // update AI and turn count buttons
    utils.range(0, 4).map(function(index) {
        domUtils.toggleClass('ai' + index, 'sl', index == gameSetup.aiLevel);
        domUtils.toggleClass('turn-count' + index, 'sl', gameData.TURN_COUNTS[index] == gameSetup.turnCount);
    });
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
        {text: "Change map", disabled: buttonsDisabled},
        {text: "Start game", disabled: buttonsDisabled}
    ]);
}

// UI to configure the game to be played before it is played
function prepareSetupUI() {
    createPlayerBoxArea();

    // hide stat box and undo button
    ['mv', 'undo-button', 'restart'].map(domUtils.hide);

    setupButtonHandlersForPlayers();
}

function createPlayerBoxArea() {
    var html = div({c: 'sc description'}, "Player setup");
    var playerBoxes = PLAYERS.map(function(player) {
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

    $('d').innerHTML = html;
}

function buttonPanel(title, buttonIdPrefix, buttonLabels, additionalProperties) {
    var buttons = buttonLabels.map(function(label, index) {
        var id = buttonIdPrefix + (buttonLabels.length - 1 - index);
        return domUtils.elem('a', {i: id, c: 'rt', href: '#', s: 'font-size: 90%'}, label);
    }).join("");
    var properties = {i: buttonIdPrefix, c: 'sc description', s: 'padding-right: 0.5em'}; // not sure about i: buttonIdPrefix
    utils.forEachProperty(additionalProperties, function(value, name) {
        properties[name] = value;
    });
    return div(properties, title + buttons);
}

// setup callbacks for buttons in the player setup panel
function setupButtonHandlersForPlayers() {
    utils.for2d(0, 0, PLAYERS.length, 3, function(playerIndex, buttonIndex) {
        domUtils.onClickOrTap(
            $('sb' + playerIndex + buttonIndex),
            (event) => uiCallbacks.invokeCallback({ playerIndex, buttonIndex }, 'setupButtons', event)
        );
    });
    utils.range(0, 4).map(function(index) {
        domUtils.onClickOrTap(
            $('ai' + index),
            (event) => uiCallbacks.invokeCallback(index, 'ai', event)
        );
        domUtils.onClickOrTap(
            $('turn-count' + index),
            (event) => uiCallbacks.invokeCallback(gameData.TURN_COUNTS[index], 'turnCount', event)
        );
    });
}
