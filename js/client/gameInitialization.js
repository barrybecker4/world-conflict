import audio from './utils/audio.js';
import storage from './storage.js';
import appState from './appState.js';
import makeInitialGameState from '../state/makeInitialGameState.js'; // server function
import playOneMove from './playOneMove.js';
import gameRenderer from './rendering/gameRenderer.js';
import uiCallbacks from './uiCallbacks.js';
const { $, div } = domUtils;

var gameSetup = storage.retrieveSetup();

export default {
    gameSetup,
    runSetupScreen,
};


function runSetupScreen() {
    audio.setupAudio();
    appState.setInGame(false); // in setup

    let gameState = regenerateInitialState();
    createSetupUI(gameSetup);

    // callback for the buttons on the bottom: new map, or start game
    uiCallbacks.setBuildCB(function(whichButton) {
        if (!isSetupValid()) return;
        if (whichButton === 0) {
            gameState = regenerateInitialState(gameState);
        } else {
            prepareInGameUI(gameState);
            gameRenderer.updateDisplay(gameState);
            appState.setInGame(true); // playing the game now
            playOneMove(gameState);
        }
    });
    // callback for player setup buttons
    uiCallbacks.setSetupButtonsCB(function(event) {
        // set the controller type for the player
        gameSetup.players[event.playerIndex] = event.buttonIndex;
        updateConfigButtons();
        updateBottomButtons();
        gameState = regenerateInitialState(gameState);
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
function prepareInGameUI(gameState) {
    // turn counter
    var html = div({i: 'turn-count', c: 'side-control'});

    // player box area
    html += div({i: 'pd', c: 'side-control user-name'}, gameData.players.map(player => {
        var pid = player.index;
        return div({ i: 'player-box' + pid, c: 'player-box inactive', style: 'background: ' + player.colorEnd },
            player.name +
            div({ c: 'additional-info', i: 'region-count' + pid, tt: 'number of countries owned' }) +
            div({ c: 'additional-info', i: 'player-cash' + pid, tt: 'amount of faith' })
        );
    }).join(''));

    // info box
    html += div({c: 'side-control user-name description', i: 'info'});

    // set it all
    $('d').innerHTML = html;

    // show stat box, undo button, and restart game buttons
    ['move-info', 'undo-button', 'restart'].map(domUtils.show);
}

function regenerateInitialState(gameState) {
    let newGameState = gameState;
    if (isSetupValid()) {
        newGameState = makeInitialGameState(gameSetup);
        gameRenderer.showMap($('map'), newGameState);
        gameRenderer.updateMapDisplay(newGameState);
    }
    return newGameState;
}

function updateConfigButtons() {
    // somebody changed something, so store the new setup
    storage.storeSetup(gameSetup);

    // update player buttons
    gameSetup.players.map(function(controller, playerIndex) {
       utils.range(0, 3).map(buttonIndex =>
           domUtils.toggleClass('sb' + playerIndex + buttonIndex, 'selected', (controller == buttonIndex))
       )
    });

    // update AI and turn count buttons
    utils.range(0, 4).map(function(index) {
        domUtils.toggleClass('ai' + index, 'selected', index == gameSetup.aiLevel);
        domUtils.toggleClass('turn-count' + index, 'selected', CONSTS.TURN_COUNTS[index] == gameSetup.turnCount);
    });
}

function isSetupValid() {
    var enabledPlayers = sequenceUtils.sum(gameSetup.players, function(playerState) {
        return (playerState != CONSTS.PLAYER_OFF) ? 1 : 0;
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
    ['move-info', 'undo-button', 'restart'].map(domUtils.hide);

    setupButtonHandlersForPlayers();
}

function createPlayerBoxArea() {
    var html = div({c: 'side-control description'}, "Player setup");
    var playerBoxes = PLAYERS.map(function(player) {
        var pid = player.index;
        return buttonPanel(player.name, "sb" + player.index, ["AI", "Human", "Off"], {
            i: 'player-box' + pid,
            c: 'player-box inactive',
            s: 'background: ' + player.colorEnd
        });
    }).join("");
    html += div({i: 'pd', c: 'side-control user-name'}, playerBoxes);
    html += buttonPanel("AI", "ai", ["Evil", "Mean", "Rude", "Nice"]);
    const labels = CONSTS.TURN_COUNTS.map(ct => (ct == CONSTS.UNLIMITED_TURNS) ? "Endless" : "" + ct).reverse();
    html += buttonPanel("Turns", "turn-count", labels);

    $('d').innerHTML = html;
}

function buttonPanel(title, buttonIdPrefix, buttonLabels, additionalProperties) {
    var buttons = buttonLabels.map(function(label, index) {
        var id = buttonIdPrefix + (buttonLabels.length - 1 - index);
        return domUtils.elem('a', {i: id, c: 'right', href: '#', s: 'font-size: 90%'}, label);
    }).join("");
    var properties = {i: buttonIdPrefix, c: 'side-control description', s: 'padding-right: 0.5em'}; // not sure about i: buttonIdPrefix
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
            (event) => uiCallbacks.invokeCallback(CONSTS.TURN_COUNTS[index], 'turnCount', event)
        );
    });
}
