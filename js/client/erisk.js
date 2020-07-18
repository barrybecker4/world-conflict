

// keep the aspect of the gameplay area correct
(window.onresize = erisk.gameRenderer.preserveAspect)();

// start the game
window.onload = function() {
    setTimeout(function() {
        erisk.runSetupScreen();
        erisk.tutorialScreen();
    }, 10);
};
