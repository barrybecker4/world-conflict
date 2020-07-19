/**
 * Serves HTML of the application for HTTP GET requests.
 * Get "LandingPage", or a requested page using 'page' parameter in query string.
 *
 * @param {Object} e event parameter that can contain information about any URL parameters provided.
 * @returns {String/html} Html to be served
 */
function doGet(e) {
  const pageName = e.parameter.page ? e.parameter['page'] : 'landing/LandingPage';

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
 * ! This is no longer supported by GAS unfortunately !
 * Given an array of .gs file names, get the source and return them concatenated for insertion into htmlservice.
 * Allows sharing the same code between client and server side.
 * In client html do:
 *  <?!= requireGs (&#91;'usefulThings' , 'clientJs'&#93;); ?>
 * @param {string[]} scripts the names of all the scripts needed
 * @return {string} the code inside script tags
 *
function requireGs(scripts) {
    return '<script>\n' + scripts.map (function (d) {
        return ScriptApp.getResource(d).getDataAsString();
    })
    .join('\n\n') + '</script>\n';
}*/