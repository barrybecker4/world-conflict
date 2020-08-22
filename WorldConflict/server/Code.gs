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
  const temp = HtmlService.createTemplateFromFile(pageName).evaluate()
      .setSandboxMode(HtmlService.SandboxMode.IFRAME);
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  Logger.log("temp = " + temp);
  return temp;
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

function makeGameData(setup, gameId) {
    Logger.log("in makeGameData with gameId = " + gameId);
    Logger.log("setup = " + setup);
    CONSTS = CONSTS.PLAYERS ? CONSTS : CONSTS.initialize();
    return erisk.makeGameData(setup, gameId);
}

function appendGameMoves(moves) {
    gameMoveTable.appendGameMoves(moves);
}

// Get the recent states (since lastGameState) that were stored on the server
function getGameMoves(gameId, lastGameStateId) {
    const moves = gameMoveTable.getMovesForGame(gameId, lastGameStateId);
    Logger.log("found " + moves.length + " moves that were computed on the server");
    return moves;
}


/**
 * Make AiMoves until it is no longer an Ai that is moving
 * store those states (with moveDecisions) in firestore as they are determined.
 * At some point later, they will be requested by the client.
 * @param state - an array containing a single state. Not sure why GAS cannot pass the object directly
 */
async function makeComputerMoves(state, clientGameData) {
    CONSTS = CONSTS.PLAYERS ? CONSTS : CONSTS.initialize();

    gameData.initializeFrom(clientGameData);
    let newState = new GameState(state[0]);
    let player = gameData.players[newState.playerIndex];
    Logger.log("Making AI moves for " + JSON.stringify(player));

    while (player.personality && !newState.endResult) {
        newState = await makeAndSaveMove(player, newState);
        console.log(`new newState playerIndex=${newState.playerIndex}  = ` + JSON.stringify(newState));
        player = gameData.players[newState.playerIndex];
    }
}

async function makeAndSaveMove(player, state) {
    let promise = new Promise(function(resolve, reject) {
        erisk.aiPickMove(player, state, function(move) {
            resolve(move);
        });
    });

    const move = await promise;

    const newState = erisk.makeMove(state, move);

    move.gameId = newState.gameId;
    move.stateId = newState.id;
    Logger.log("picked AI move = \n" + JSON.stringify(move));
    gameMoveTable.appendGameMove(move);
    return newState;
}


