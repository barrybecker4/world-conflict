
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