import audio from './audio.js';
import utils from './utils.js';
import gameInitialization from './gameInitialization.js';
import gameController from './gameController.js';
import gameRenderer from './rendering/gameRenderer.js';
const $ = utils.$

// This modules is responsible for the title screen.
export default {
   setupTitleScreen,
};

function setupTitleScreen() {
    utils.map(['o','tutorial-button','sound'], function(id) { utils.showOrHide(id, 1); });

    utils.onClickOrTap($('cancel-button'), setTitleScreenVisibility.bind(0, false));
    utils.onClickOrTap($('next'), switchTutorialCard.bind(0, 1));
    utils.onClickOrTap($('prev'), switchTutorialCard.bind(0, -1));

    utils.onClickOrTap($('tutorial-button'), setTitleScreenVisibility.bind(0, true));
    utils.onClickOrTap($('sound'), audio.toggleSound);
    utils.onClickOrTap($('undo-button'), gameController.invokeUICallback.bind(0, 0, 'un'));
    utils.onClickOrTap($('restart'), function() {
        gameController.uiCallbacks = {};
        gameRenderer.updateDisplay();
        gameInitialization.runSetupScreen();
    });

    switchTutorialCard(0);

    setTimeout(setTitleScreenVisibility.bind(0,true), 10);
}

var currentCard = 0;
var totalCards = 5;

function switchTutorialCard(direction) {
    currentCard = utils.clamp(currentCard + direction, 0, totalCards-1);

    utils.setTransform($('tutorial-card'), "translate3d(" + (-currentCard * 100 / totalCards) + "%, 0, 0)");
    utils.showOrHide('prev', currentCard > 0);
    utils.showOrHide('next', currentCard < totalCards - 1);
}

function setTitleScreenVisibility(visible) {
    if (visible) {
        $('title-screen').style.display = 'block';
    }

    setTimeout(function() {
        utils.toggleClass('title-screen', 'h', !visible);
    }, 50);

    if (!visible) {
        setTimeout(function () {
            $('title-screen').style.display = 'none';
        }, 500);
    }
}