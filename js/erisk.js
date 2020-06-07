
// ==========================================================
// This part of the code initializes a new game.
// ==========================================================

// keep the aspect of the gameplay area correct
(wnd.onresize = preserveAspect)();

// start the game
window.onload = function() {
    setTimeout(function() {
        gameSetup = getSetupFromStorage();
        setupAudio();
        runSetupScreen();
        setupTitleScreen();
    }, 500);
};
