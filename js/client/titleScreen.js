import audio from './utils/audio.js';
import utils from '../utils/utils.js';
import domUtils from './utils/domUtils.js';
import gameInitialization from './gameInitialization.js';
import gameController from './gameController.js';
import gameRenderer from './rendering/gameRenderer.js';
const { $, onClickOrTap } = domUtils;

// This modules is responsible for the title screen.
export default {
   setupTitleScreen,
};

function setupTitleScreen() {
    utils.map(['o','tutorial-button','sound'], function(id) { domUtils.showOrHide(id, 1); });

    onClickOrTap($('cancel-button'), setTitleScreenVisibility.bind(0, false));
    onClickOrTap($('next'), switchTutorialCard.bind(0, 1));
    onClickOrTap($('prev'), switchTutorialCard.bind(0, -1));

    onClickOrTap($('tutorial-button'), setTitleScreenVisibility.bind(0, true));
    onClickOrTap($('sound'), audio.toggleSound);
    onClickOrTap($('undo-button'), gameController.invokeUICallback.bind(0, 0, 'undo'));
    onClickOrTap($('restart'), function() {
        gameController.uiCallbacks = {};
        gameRenderer.updateDisplay();
        gameInitialization.runSetupScreen();
    });

    switchTutorialCard(0);

    setTimeout(setTitleScreenVisibility.bind(0, true), 10);
}

var currentCard = 0;
var totalCards = 5;

function switchTutorialCard(direction) {
    currentCard = utils.clamp(currentCard + direction, 0, totalCards-1);

    domUtils.setTransform($('tutorial-card'), "translate3d(" + (-currentCard * 100 / totalCards) + "%, 0, 0)");
    domUtils.showOrHide('prev', currentCard > 0);
    domUtils.showOrHide('next', currentCard < totalCards - 1);
}

function setTitleScreenVisibility(visible) {
    if (visible) {
        $('title-screen').style.display = 'block';
    }

    setTimeout(function() {
        domUtils.toggleClass('title-screen', 'h', !visible);
    }, 50);

    if (!visible) {
        setTimeout(function () {
            $('title-screen').style.display = 'none';
        }, 500);
    }
}