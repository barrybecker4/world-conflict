import gameRenderer from './rendering/gameRenderer.js';
import runSetupScreen from './runSetupScreen.js';
import tutorialScreen from './tutorialScreen.js';


// keep the aspect of the gameplay area correct
(window.onresize = gameRenderer.preserveAspect)();

// start the game
window.onload = function() {
    setTimeout(function() {
        runSetupScreen();
        tutorialScreen();
    }, 10);
};
