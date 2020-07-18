import audio from './utils/audio.js';

class UiCallbacks {

    constructor() {
    }
    setRegionSelectedCB(regionSelected) {
        this.regionSelected = regionSelected;
    }
    setTempleSelectedCB(templeSelected) {
        this.templeSelected = templeSelected;
    }
    setSoldierSelectedCB(soldierSelected) {
        this.soldierSelected = soldierSelected;
    }
    setBuildCB(build) {
        this.build = build;
    }
    setUndoCB(undo) {
        this.undo = undo;
    }
    setSetupButtonsCB(setupButtons) {
        this.setupButtons = setupButtons;
    }
    setAiCB(ai) {
        this.ai = ai;
    }
    setTurnCountCB(turnCount) {
        this.turnCount = turnCount;
    }

    /**
     * This is the handler that gets attached to most DOM elements.
     * Delegation through UI callbacks allows us to react differently depending on game-state.
     */
    invokeCallback(object, type, event) {
        var callback = this[type];
        if (callback) {
            audio.playSound(SOUNDS.CLICK);
            callback(object);
        }
        if (event.target.href && event.target.href != "#")
            return 1;

        event.stopPropagation();
        return 0;
    }

    clearAll() {
         for (const prop in this) {
             if (this.hasOwnProperty(prop)){
                 delete this[prop];
             }
         }
    }

}

const uiCallbacks = new UiCallbacks();

export default uiCallbacks;