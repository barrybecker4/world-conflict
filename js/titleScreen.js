import audio from './audio.js';
import utils from './utils.js';
import gameInitialization from './gameInitialization.js';
import gameController from './gameController.js';
import gameRenderer from './gameRenderer.js';
const $ = utils.$

// This modules is responsible for the title screen.

export default {
   setupTitleScreen,
};

function setupTitleScreen() {
    utils.map(['o','tub','sound'], function(id) { utils.showOrHide(id, 1); });

    utils.onClickOrTap($('cb'), setTitleScreenVisibility.bind(0, false));
    utils.onClickOrTap($('next'), switchTutorialCard.bind(0, 1));
    utils.onClickOrTap($('prev'), switchTutorialCard.bind(0, -1));

    utils.onClickOrTap($('tub'), setTitleScreenVisibility.bind(0, true));
    utils.onClickOrTap($('sound'), audio.toggleSound);
    utils.onClickOrTap($('und'), gameController.invokeUICallback.bind(0, 0, 'un'));
    utils.onClickOrTap($('restart'), function() {
        gameController.uiCallbacks = {};
        gameRenderer.updateDisplay();
        gameInitialization.runSetupScreen();
    });

    switchTutorialCard(0);

    setTimeout(setTitleScreenVisibility.bind(0,true), 10);
}

var currentCard = 0, totalCards = 5;
function switchTutorialCard(direction) {
    currentCard = utils.clamp(currentCard + direction, 0, totalCards-1);

    utils.setTransform($('tuc'), "translate3d(" + (-currentCard * 100 / totalCards) + "%,0,0)");
    utils.showOrHide('prev', currentCard > 0);
    utils.showOrHide('next', currentCard < totalCards - 1);
}

function setTitleScreenVisibility(visible) {
    if (visible) {
        $('ts').style.display = 'block';
    }

    setTimeout(function() {
        utils.toggleClass('ts', 'h', !visible);
    }, 50);

    if (!visible) {
        setTimeout(function () {
            $('ts').style.display = 'none';
        }, 500);
    }
}