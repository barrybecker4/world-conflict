import runSetupScreen from './runSetupScreen.js';
import gameRenderer from './rendering/gameRenderer.js';
import uiCallbacks from './uiCallbacks.js';
const { $, onClickOrTap } = domUtils;


export default function tutorialScreen() {
    ['overview-panel','tutorial-button','sound'].map(id => domUtils.showOrHide(id, 1));

    onClickOrTap($('cancel-button'), () => setTutorialScreenVisibility(false));
    onClickOrTap($('next'), () => switchTutorialCard(1));
    onClickOrTap($('prev'), () => switchTutorialCard(-1));

    onClickOrTap($('tutorial-button'), () => setTutorialScreenVisibility(true));
    onClickOrTap($('sound'), audio.toggleSound);
    onClickOrTap($('undo-button'), (event) => uiCallbacks.invokeCallback(0, 'undo', event));
    onClickOrTap($('restart'), function() {
        uiCallbacks.clearAll();
        gameRenderer.updateDisplay();
        runSetupScreen();
    });

    switchTutorialCard(0);
    setTimeout(() => setTutorialScreenVisibility(true), 10);
}

let currentCard = 0;
let totalCards = 5;

function switchTutorialCard(direction) {
    currentCard = utils.clamp(currentCard + direction, 0, totalCards-1);

    domUtils.setTransform($('tutorial-card'), "translate3d(" + (-currentCard * 100 / totalCards) + "%, 0, 0)");
    domUtils.showOrHide('prev', currentCard > 0);
    domUtils.showOrHide('next', currentCard < totalCards - 1);
}

function setTutorialScreenVisibility(visible) {
    if (visible) {
        $('title-screen').style.display = 'block';
    }

    setTimeout(function() {
        domUtils.toggleClass('title-screen', 'h', !visible);
    }, 200);

    if (!visible) {
        $('title-screen').style.display = 'none';
    }
}