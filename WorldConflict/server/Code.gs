/**
 * Entry point of this GAS web application. Called by the framework.
 * Serves HTML of the application for HTTP GET requests.
 * Get "LandingPage", or a requested page using 'page' parameter in query string.
 * If you access the URL with "test" (e.g. "/dev?test=true" on the end of the URL) then QUnit tests will be run.
 *
 * @param {Object} e event parameter that can contain information about any URL parameters provided.
 * @returns {String/html} Html to be served
 */
function doGet(e) {
  let pageName = e.parameter.page ? e.parameter['page'] : 'client/html/LandingPage';

  if (e.parameter.test) {
    return unitTests.getUnitTestHtml();
  } else if (e.parameter.clientTest) {
    pageName = 'client/html/clientUnitTests';
  }

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
 * @return the user's id. It's the first part of the email.
 */
function getUserId() {
  const email = getUserEmail();
  return email.substring(0, email.indexOf("@"));
}

/**
 * @return all games with open slots where this player is not already seated.
 *         If there are games where no human players are seated, then they will be deleted asynchronously.
 */
function retrieveOpenGames() {
    CONSTS = CONSTS.PLAYERS ? CONSTS : CONSTS.initialize();
    tableMaintenance.cleanupGamesAsync();

    const gameDataDocs = gameConfigurationTable.getOpenGameConfigurations();
    const userId = getUserId();
    const openGames = gameConfigurationTable.availableOpenGames(gameDataDocs, userId);
    Logger.log("Retrieved " + openGames.length + " open games for " + userId);

    tableMaintenance.removeGamesWithNoHumansAsync(gameDataDocs);

    return openGames;
}

/**
 * Creates the game configuration data that will remain fixed for the duration of the game, once started.
 * The setup defines how the player wants the game configured.
 */
function makeNewGameData(setup, clientGameData) {
    CONSTS = CONSTS.PLAYERS ? CONSTS : CONSTS.initialize();
    if (clientGameData) {
        gameData.initializeFrom(clientGameData);
    }
    return erisk.makeNewGameData(setup, clientGameData);
}

function seatPlayerAtGame(gameId, playerPosition) {
    CONSTS = CONSTS.PLAYERS ? CONSTS : CONSTS.initialize();
    const userId = getUserId();
    return erisk.seatPlayerAtExistingGame(gameId, playerPosition, userId);
}

function unseatPlayerFromOpenGame(userId, gameId) {
    CONSTS = CONSTS.PLAYERS ? CONSTS : CONSTS.initialize();
    erisk.unseatPlayerFromOpenGameById(userId, gameId);
}

/**
 * Retrieve the configuration for the specified gameId.
 * If the players are different (IOW, new ones have joined or left the game),
 * then return that new configuration so that it can be shown on the client.
 */
function getGameData(gameId, players) {
    CONSTS = CONSTS.PLAYERS ? CONSTS : CONSTS.initialize();
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
 * Persist the specified gameData into Firestore.
 * There is a limit on the size of the first argument, so I made the payload the second arg.
 */
function persistGameData(unused, clientGameData) {
      CONSTS = CONSTS.PLAYERS ? CONSTS : CONSTS.initialize();
      if (clientGameData) {
          gameData.initializeFrom(clientGameData);
      }
      gameData = gameConfigurationTable.upsert(gameData);
      return gameData.gameId;
}

/**
 * The players will be considered changed if either
 * - a human player joins (or leaves) an open slot (name change), or
 * - an open slot becomes an AI (type change: open -> ai)
 */
function playersDiffer(newPlayers, oldPlayers) {
    if (newPlayers.length !== oldPlayers.length) {
        const msg = 'The number of players were unexpectedly different\n.' +
                    ' newPlayers:\n' + JSON.stringify(newPlayers) + '\n oldPlayers:\n' + JSON.stringify(oldPlayers)
        throw new Error(msg);
    }
    return oldPlayers.some((player, i) => player.name != newPlayers[i].name || player.type != newPlayers[i].type);
}

/**
  * Get the recent states (since lastGameState) that were stored on the server.
  */
function getGameMoves(gameId, lastGameStateId) {
    const moves = gameMoveTable.getMovesForGame(gameId, lastGameStateId);
    Logger.log("found " + moves.length + " new moves in firestore: " + moves.map(m => m.stateId));
    return moves;
}

/**
 * First persist any humanMoves, then play all AI players until the next human player.
 * Can all the local human moves be persisted atomically?
 * This may be throwing 409 (conflict) error if we try to persist a move with the same id as one already there.
 */
async function persistLocalMovesIfAnyAndPlayAi(humanMoves, state, clientGameData, suppressAi) {
    Logger.log("appending human moves: " + humanMoves.map(move => move.stateId));

    gameMoveTable.appendGameMoves(humanMoves);

    if (!suppressAi) {
        await makeAiMovesOnServer(state, clientGameData);
    }
}

/**
 * Make AiMoves (if any) until it is no longer an AI that is moving (or end of game reached).
 * Store the moves in Firestore as they are determined.
 * At some point later, they will be requested by the client.
 * @param state - an array containing a single state. Not sure why GAS cannot pass the object directly
 * @param clientGameData current state of the game
 */
async function makeAiMovesOnServer(state, clientGameData) {
    CONSTS = CONSTS.PLAYERS ? CONSTS : CONSTS.initialize();
    appState = null; // appState not used on server, only client

    gameData.initializeFrom(clientGameData);
    let newState = new GameState(state[0]);

    let player = gameData.players[newState.playerIndex];
    Logger.log("Making AI moves for " + JSON.stringify(player));

    // Process AI moves in batches, but keep processing until we hit a human or game ends
    const MAX_AI_MOVES_PER_BATCH = 7;
    let aiMovesProcessed = 0;

    while (player.personality && !newState.endResult && aiMovesProcessed < MAX_AI_MOVES_PER_BATCH) {
        newState = await makeAndSaveMove(player, newState);
        aiMovesProcessed++;

        if (CONSTS.DEBUG)
            Logger.log(`AI move ${aiMovesProcessed}: newState playerIndex=${newState.playerIndex} = ${newState.id}`);

        player = gameData.players[newState.playerIndex];
    }

    Logger.log(`Processed ${aiMovesProcessed} AI moves in this batch. Next player: ${player.getName()}, is AI: ${!!player.personality}`);
}


async function makeAndSaveMove(player, state) {
    CONSTS = CONSTS.PLAYERS ? CONSTS : CONSTS.initialize();
    let promise = new Promise(function(resolve, reject) {
        erisk.aiPickMove(player, state, resolve);
    });

    const move = await promise;
    const newState = erisk.makeMove(state, move);

    move.gameId = newState.gameId;
    move.stateId = newState.id;
    if (CONSTS.DEBUG)
        Logger.log("picked AI move = \n" + JSON.stringify(move));
    gameMoveTable.appendGameMove(move);
    return newState;
}
