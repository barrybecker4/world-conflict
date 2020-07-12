
// Describes the behavior of an AI
export default class AiPersonality {

    /**
     * @param soldierEagerness how eagerly it builds soldiers
     * @param preferredUpgrades an array of which upgrades it prefers (if any)
     */
    constructor(obj) {
        this.soldierEagerness = obj.soldierEagerness;
        this.preferredUpgrades = obj.preferredUpgrades;
    }

    // If we don't want more upgrades, our preference becomes 1.
    getSoldierEagerness() {
        return this.preferredUpgrades.length ? this.soldierEagerness : 1;
    }

    copy() {
        return new AiPersonality({
            soldierEagerness: this.soldierEagerness,
            preferredUpgrades: this.preferredUpgrades.slice(),
        });
    }
}
