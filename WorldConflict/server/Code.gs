/**
 * Main entry point of GAS web application. Called by the framework.
 * Serves HTML of the application for HTTP GET requests.
 * Get "LandingPage", or a requested page using 'page' parameter in query string.
 *
 * @param {Object} e event parameter that can contain information about any URL parameters provided.
 * @returns {String/html} Html to be served
 */
function doGet(e) {

  const pageName = e.parameter.page ? e.parameter['page'] : 'client/html/LandingPage';

  // Build and return HTML in IFRAME sandbox mode.
  return HtmlService.createTemplateFromFile(pageName).evaluate()
      .setSandboxMode(HtmlService.SandboxMode.IFRAME);
}

/**
 * Use a templated HTML printing scriptlet to import javascript or css stylesheets.
 * @return the html to show from the specified file
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * @return the email of the current user using the app
 * See https://developers.google.com/apps-script/reference/base/session
 */
function getUserEmail() {
  return Session.getEffectiveUser().getEmail();
}

/**
 * @return the user's id. Its the first part of the email.
 */
function getUserId() {
  const email = getUserEmail();
  return email.substring(0, email.indexOf("@"));
}

/**
 * Creates the game configuration data that will remain fixed for the duration of the game, once started.
 * The setup defines how the player wants the game configured.
 * If a gameId is specified, the old game data corresponding to that id will be deleted
 * before creating a new one (with new gameId).
 */
function makeGameData(setup, firstTime, clientGameData) {
    CONSTS = CONSTS.PLAYERS ? CONSTS : CONSTS.initialize();
    if (clientGameData) {
        gameData.initializeFrom(clientGameData);
    }
    return erisk.makeGameData(setup, firstTime, clientGameData);
}

/**
 * Retrieve the configuration for the specified gameId,
 * and if the players are different (IOW new ones have joined the game),
 * then return that new configuration so that it can be shown on the client.
 */
function getGameData(gameId, players) {
    CONSTS = CONSTS.PLAYERS ? CONSTS : CONSTS.initialize(); // need?
    const gameDataDoc = gameConfigurationTable.getGameConfiguration(gameId);

    if (gameDataDoc) {
        const gameData = gameDataDoc.obj;
        if (!gameData) {
            throw new Error("Could not find gameData for gameId: " + gameId);
        }

        return (playersDiffer(gameData.players, players)) ? erisk.addStatus(gameData) : null;
    }
    return null;
}

/**
 * Persist the specified gameData into firestore.
 * There seems to be some limit on the size of the first argument, so I made the payload the second arg,
 */
function persistGameData(unused, clientGameData) {
      CONSTS = CONSTS.PLAYERS ? CONSTS : CONSTS.initialize();
      if (clientGameData) {
          gameData.initializeFrom(clientGameData);
      }
      gameData = gameConfigurationTable.upsert(gameData);
      return gameData.gameId;
}

function playersDiffer(newPlayers, oldPlayers) {
    if (newPlayers.length != oldPlayers.length) {
        throw new Error('The number of players were unexpectedly different\n.' +
            ' newPlayers:\n' + JSON.stringify(newPlayers) + '\n oldPlayers:\n' + JSON.stringify(oldPlayers));
    }
    return oldPlayers.some((player, i) => player.name != newPlayers[i].name);
}

function appendGameMoves(moves) {
    Logger.log("appending human moves: " + moves.map(move => move.stateId));
    gameMoveTable.appendGameMoves(moves);
}

// Get the recent states (since lastGameState) that were stored on the server
function getGameMoves(gameId, lastGameStateId) {
    const moves = gameMoveTable.getMovesForGame(gameId, lastGameStateId);
    Logger.log("found " + moves.length + " new moves in firestore: " + moves.map(m => m.stateId));
    return moves;
}

/**
 * Make AiMoves until it is no longer an Ai that is moving (or end of game reached).
 * Store those states (with moveDecisions) in firestore as they are determined.
 * At some point later, they will be requested by the client.
 * @param state - an array containing a single state. Not sure why GAS cannot pass the object directly
 */
async function makeAiMovesOnServer(state, clientGameData) {
    CONSTS = CONSTS.PLAYERS ? CONSTS : CONSTS.initialize();

    gameData.initializeFrom(clientGameData);

    let newState = new GameState(state[0]);
    Logger.log("state.soldiersByRegion = " + JSON.stringify(state[0].soldiersByRegion));

    let player = gameData.players[newState.playerIndex];
    Logger.log("Making AI moves for " + JSON.stringify(player));

    while (player.personality && !newState.endResult) {
        newState = await makeAndSaveMove(player, newState);
        Logger.log(`new newState playerIndex=${newState.playerIndex}  = ${newState.id}`);
        player = gameData.players[newState.playerIndex];
    }
}

async function makeAndSaveMove(player, state) {
    let promise = new Promise(function(resolve, reject) {
        erisk.aiPickMove(player, state, resolve);
    });

    const move = await promise;

    const newState = erisk.makeMove(state, move);

    move.gameId = newState.gameId;
    move.stateId = newState.id;
    Logger.log("picked AI move = \n" + JSON.stringify(move));
    gameMoveTable.appendGameMove(move);
    return newState;
}


