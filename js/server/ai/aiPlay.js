import sequenceUtils from '../../utils/sequenceUtils.js';
import { BuildMove } from '../../state/model/Move.js';
import UPGRADES from '../../state/consts/UPGRADES.js';
import miniMaxSearch from './miniMaxSearch.js'
import heuristics from './heuristics.js';

const MIN_THINK_TIME = 1000;
const MAX_THINK_TIME = 5000;

// Logic for AI (non-human) players
export default {
    aiPickMove,
};

function aiPickMove(player, state, reportMoveCallback) {
    // check for upgrade options first start with soldiers
    if (shouldBuildSoldier(player, state)) {
        var move = buildSoldierAtBestTemple(player, state);
        return setTimeout(() => reportMoveCallback(move), MIN_THINK_TIME);
    }

    // we don't need soldiers, maybe we can upgrade a temple?
    var upgrade = upgradeToBuild(player, state);
    if (upgrade) {
        return setTimeout(() => reportMoveCallback(upgrade), MIN_THINK_TIME);
    }

    // the AI only analyzes its own moves (threats are handled in heuristic)
    var depth = state.movesRemaining || 1;

    // use a min-max search to find the best move looking a few steps forward
    miniMaxSearch(player, state, depth, reportMoveCallback, MIN_THINK_TIME, MAX_THINK_TIME);
}

function shouldBuildSoldier(player, state) {
    // do we have a temple to build it in?
    if (!state.templesForPlayer(player).length)
        return false;

    // Get preference for soldiers from our personality.
    var soldierEagerness = player.personality.getSoldierEagerness();

    // Calculate the relative cost of buying a soldier now.
    var relativeCost = state.soldierCost() / state.cash[player.index];
    if (relativeCost > 1)
        return false;

    // See how far behind on soldier number we are.
    var forces = state.players.map(player => force(state, player));
    var forceDisparity = sequenceUtils.max(forces) / force(state, player);

    // This calculates whether we should build now - the further we are behind other players,
    // the more likely we are to spend a big chunk of our cash on it
    var decisionFactor = forceDisparity * soldierEagerness - relativeCost;

    return decisionFactor >= 0;
}

function force(state, player) {
    return state.regionCount(player) * 2 + state.totalSoldiers(player);
}

function upgradeToBuild(player, state) {
    // do we still want something?
    if (!player.personality.preferredUpgrades.length)
        return;
    var desire = player.personality.preferredUpgrades[0];
    var currentLevel = state.rawUpgradeLevel(player, desire);

    // can we afford it?
    if (state.cash[player.index] < desire.cost[currentLevel])
        return;

    // do we have a place to build it?
    var possibleTemplesToUpgrade = state.templesForPlayer(player).filter(function(temple) {
        return ((!temple.upgrade) && (!currentLevel)) || (temple.upgrade == desire);
    });
    if (!possibleTemplesToUpgrade.length)
        return;

    // pick the safest temple
    var temple = sequenceUtils.min(possibleTemplesToUpgrade, (t) => heuristics.templeDangerousness(state, t));

    // build the upgrade!
    player.personality.preferredUpgrades.shift();
    return new BuildMove(desire, temple);
}

function buildSoldierAtBestTemple(player, state) {
    var temple = sequenceUtils.max(state.templesForPlayer(player), (t) => heuristics.templeDangerousness(state, t));
    return new BuildMove(UPGRADES.SOLDIER, temple);
}
