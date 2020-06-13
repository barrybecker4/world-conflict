import audio from './audio.js';
import gameRenderer from './gameRenderer.js';
import gameInitialization from './gameInitialization.js';
import titleScreen from './titleScreen.js';


// keep the aspect of the gameplay area correct
(window.onresize = gameRenderer.preserveAspect)();

// start the game
window.onload = function() {
    setTimeout(function() {
        gameInitialization.gameSetup = gameInitialization.getSetupFromStorage();
        audio.setupAudio();
        gameInitialization.runSetupScreen();
        titleScreen.setupTitleScreen();
    }, 500);
};
