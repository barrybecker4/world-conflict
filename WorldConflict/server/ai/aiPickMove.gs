var erisk = (function(my) {

    my.aiPickMove = function(player, state, reportMoveCallback) {

        if (!state.regionCount(player)) // skip players that are no longer in the game
            return reportMoveCallback(new EndMove());

        // check for upgrade options. Start first with soldiers.
        if (shouldBuildSoldier(player, state)) {
            const move = buildSoldierAtBestTemple(player, state);
            return reportMoveCallback(move);
        }

        // If we don't need soldiers, maybe we can upgrade a temple?
        const upgrade = upgradeToBuild(player, state);
        if (upgrade) {
            return reportMoveCallback(upgrade);
        }

        // The AI only analyzes its own moves (threats are handled in heuristic)
        const depth = state.movesRemaining || 1;

        // use a min-max search to find the best move looking a few steps forward
        erisk.miniMaxSearch(player, state, depth, reportMoveCallback, CONSTS.MAX_THINK_TIME);
    }

    function shouldBuildSoldier(player, state) {
        // Do we have a temple to build it in?
        if (!state.templesForPlayer(player).length)
            return false;

        // Get preference for soldiers from our personality.
        const soldierEagerness = CONSTS.AI_PERSONALITIES[player.personality].getSoldierEagerness();

        // Calculate the relative cost of buying a soldier now.
        const relativeCost = state.soldierCost() / state.cash[player.index];
        if (relativeCost > 1)
            return false;

        // See how far behind on soldiers we are.
        const forces = gameData.players.map(player => force(state, player));
        const forceDisparity = sequenceUtils.max(forces) / force(state, player);

        // This calculates whether we should build now - the further we are behind other players,
        // the more likely we are to spend a big chunk of our cash on it
        const decisionFactor = forceDisparity * soldierEagerness - relativeCost;
        return decisionFactor >= 0;
    }

    function force(state, player) {
        return state.regionCount(player) * 2 + state.totalSoldiers(player);
    }

    function upgradeToBuild(player, state) {
        const personality = CONSTS.AI_PERSONALITIES[player.personality];

        // Do we still want something?
        const desiredUpgrade = findDesiredUpgrade(personality.preferredUpgrades, player, state);
        if (!desiredUpgrade)
            return;

        const desiredLevel = state.rawUpgradeLevel(player, desiredUpgrade);

        // Can we afford it?
        if (state.cash[player.index] < desiredUpgrade.cost[desiredLevel])
            return;

        // Do we have a place to build it?
        const possibleTemplesToUpgrade = state.templesForPlayer(player).filter(function(temple) {
            return (!temple.upgradeIndex && !desiredLevel) || (CONSTS.UPGRADES[temple.upgradeIndex] === desiredUpgrade);
        });
        if (!possibleTemplesToUpgrade.length)
            return;

        // Pick the safest temple
        const temple = sequenceUtils.min(possibleTemplesToUpgrade, t => heuristics.templeDangerousness(state, t));

        // Build the upgrade!
        return new BuildMove({ upgradeIndex: desiredUpgrade.index, regionIndex: temple.regionIndex });
    }

    function buildSoldierAtBestTemple(player, state) {
        const temple = sequenceUtils.max(state.templesForPlayer(player), t => heuristics.templeDangerousness(state, t));
        return new BuildMove({ upgradeIndex: CONSTS.UPGRADES.SOLDIER.index, regionIndex: temple.regionIndex });
    }

    /** @return the upgrade that is desired by this AI based on the preferredUpgrades array */
    function findDesiredUpgrade(preferredUpgrades, player, state) {
        // first see what the AI has already
        const playerTemples = state.templesForPlayer(player);

        // find the first preferred upgrade for which we do not have the desired max level
        const desiredUpgradeDef = preferredUpgrades.find(upgradeDef => {
            const templeWithUpgrade = playerTemples.find(temple => temple.upgradeIndex === upgradeDef.index);

            if (templeWithUpgrade) {
                Logger.log("Found temple with desired upgrade: " + JSON.stringify(upgradeDef) + " temple level: " + templeWithUpgrade.level);
                return (templeWithUpgrade.level + 1) < upgradeDef.level;
            } else {
               return true;
            }
        });

        Logger.log("Found desired upgrade for player: " + player.getName()
            + " desiredUpgradeDef: " + JSON.stringify(desiredUpgradeDef));
        return desiredUpgradeDef ? CONSTS.UPGRADES[desiredUpgradeDef.index] : undefined;
    }

    return my;
}(erisk || {}));
