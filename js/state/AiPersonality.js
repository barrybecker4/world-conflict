
// AI personalities
export default class AiPersonality {

    /**
     * @param soldierEagerness how eagerly it builds soldiers
     * @param preferredUpgrades which upgrades it prefers
     */
    constructor(soldierEagerness, preferredUpgrades) {
        this.s = soldierEagerness;
        this.u = preferredUpgrades;
    }
}
