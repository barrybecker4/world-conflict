import utils from '../../utils/utils.js';

// Describes the behavior of an AI
export default class AiPersonality {

    /**
     * @param soldierEagerness how eagerly it builds soldiers
     * @param preferredUpgrades an array of which upgrades it prefers (if any)
     */
    constructor(soldierEagerness, preferredUpgrades) {
        this.soldierEagerness = soldierEagerness;
        this.preferredUpgrades = preferredUpgrades;
    }

    getSoldierPreference() {
        return this.preferredUpgrades.length ? this.soldierEagerness : 1;
    }

    copy() {
        return new AiPersonality(
            this.soldierEagerness,
            this.preferredUpgrades.slice(),
        );
    }
}
