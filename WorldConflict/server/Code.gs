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

// for testing only. Can be removed.
function testMakeGameData() {
    const setup = {
      players: [0,2,0,2],
      aiLevel: 1,
      sound: true,
      turnCount: 9,
      firstTimeInstructions: {
        "Click this region again to change the number of soldiers.": 1,
        "Click a bordering region to move.": 1,
        "Armies that conquer a new region cannot move again.": 1,
        "Once you're done, click 'End turn' here.": 1,
        "If you want to undo a move or check the rules, use the buttons here.": 1
      },
      mapWidth: 30,
      mapHeight: 20.
    };
    makeGameData(setup);
}

function makeGameData(setup) {
    CONSTS = CONSTS.initialize();
    return erisk.makeGameData(setup);
}