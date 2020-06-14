import audio from './utils/audio.js';
import gameRenderer from './rendering/gameRenderer.js';
import gameInitialization from './gameInitialization.js';
import titleScreen from './titleScreen.js';
import storage from './state/storage.js';


// keep the aspect of the gameplay area correct
(window.onresize = gameRenderer.preserveAspect)();

// start the game
window.onload = function() {
    setTimeout(function() {
        gameInitialization.gameSetup = storage.retrieveSetup();
        audio.setupAudio();
        gameInitialization.runSetupScreen();
        titleScreen.setupTitleScreen();
    }, 500);
};
