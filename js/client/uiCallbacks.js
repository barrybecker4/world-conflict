import audio from './utils/audio.js';
import SOUNDS from '../state/consts/SOUNDS.js';

class UiCallbacks {

    // TODO: enforce that only these methods can be set
    constructor(regionSelected, templeSelected, soldierSelected, build, undo) {
        this.regionSelected = regionSelected;
        this.templeSelected = templeSelected;
        this.soldierSelected = soldierSelected;
        this.build = build;
        this.undo = undo;
        this.setupButtons = null;
        this.ai = null;
        this['turn-count'] = null;
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