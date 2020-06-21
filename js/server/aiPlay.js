import utils from '../utils/utils.js';
import sequenceUtils from '../utils/sequenceUtils.js';
import gameData from '../state/gameData.js';
import gameController from '../gameController.js';
import { BuildMove } from '../state/model/Move.js';
import UPGRADES from '../state/model/UPGRADES.js';
import miniMaxSearch from './miniMaxSearch.js'
import heuristics from './heuristics.js';

// Logic for AI (non-human) players .
export default {
    aiPickMove,
};

function aiPickMove(player, state, reportMoveCallback) {
    // check for upgrade options first start with soldiers
    if (shouldBuildSoldier(player, state)) {
        var move = buildSoldierAtBestTemple(player, state);
        return setTimeout(reportMoveCallback.bind(0, move), gameData.minimumAIThinkingTime);
    }

    // we don't need soldiers, maybe we can upgrade a temple?
    var upgrade = upgradeToBuild(player, state);
    if (upgrade) {
        return setTimeout(reportMoveCallback.bind(0, upgrade), gameData.minimumAIThinkingTime);
    }

    // the AI only analyzes its own moves (threats are handled in heuristic)
    var depth = state.move.movesRemaining || 1;

    // use a min-max search to find the best move looking a few steps forward
    miniMaxSearch(player, state, depth, reportMoveCallback);
}

function shouldBuildSoldier(player, state) {
    // do we have a temple to build it in?
    if (!state.templesForPlayer(player).length)
        return false;

    // get preference for soldiers from our personality
    // if we don't want more upgrades, our preference becomes 1
    var soldierEagerness = player.personality.getSoldierEagerness();

    // calculate the relative cost of buying a soldier now
    var relativeCost = state.soldierCost() / state.cash[player.index];
    if (relativeCost > 1)
        return false;

    // see how far behind on soldier number we are
    var forces = utils.map(state.players, force.bind(0, state));
    var forceDisparity = sequenceUtils.max(forces) / force(state, player);

    // This calculates whether we should build now - the further we are behind other players,
    // the more likely we are to spend a big chunk of our cash  on it
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
    var possibleUpgrades = state.templesForPlayer(player).filter(function(temple) {
        return ((!temple.upgrade) && (!currentLevel)) || (temple.upgrade == desire);
    });
    if (!possibleUpgrades.length)
        return;

    // pick the safest temple
    var temple = sequenceUtils.min(possibleUpgrades, heuristics.templeDangerousness.bind(0, state));

    // build the upgrade!
    player.personality.preferredUpgrades.shift();
    return new BuildMove(desire, temple);
}

function buildSoldierAtBestTemple(player, state) {
    var temple = sequenceUtils.max(state.templesForPlayer(player), heuristics.templeDangerousness.bind(0, state));
    return new BuildMove(UPGRADES.SOLDIER, temple);
}
