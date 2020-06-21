export default {
    setInGame,
    isInGame,
};

const APP_SETUP_SCREEN = 0;
const APP_IN_GAME = 1;

var currentState = APP_SETUP_SCREEN;

function setInGame(inGame) {
    currentState = inGame ? APP_IN_GAME : APP_SETUP_SCREEN;
}

function isInGame() {
    return currentState === APP_IN_GAME;
}
