import gameRenderer from './rendering/gameRenderer.js';
import gameInitialization from './gameInitialization.js';
import tutorialScreen from './tutorialScreen.js';
import storage from './storage.js';


// keep the aspect of the gameplay area correct
(window.onresize = gameRenderer.preserveAspect)();

// start the game
window.onload = function() {
    setTimeout(function() {
        gameInitialization.gameSetup = storage.retrieveSetup();
        gameInitialization.runSetupScreen();
        tutorialScreen();
    }, 10);
};
