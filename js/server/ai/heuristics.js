import utils from '../../utils/utils.js';
import sequenceUtils from '../../utils/sequenceUtils.js';
import gameData from '../../state/consts/gameData.js';
import gameInitialization from '../../client/gameInitialization.js';
import map from '../../client/map.js';

export default {
    heuristicForPlayer,
    templeDangerousness,
}

function heuristicForPlayer(player, state) {
    const soldierBonus = slidingBonus(state, 0.25, 0, 0.83);
    const threatOpportunityMultiplier = slidingBonus(state, 1.0, 0.0, 0.83);

    function adjustedRegionValue(region) {
        // count the value of the region itself
        var value = regionFullValue(state, region);
        // but also take into account the threat other players pose to it, and the opportunities it offers
        value += regionOpportunity(state, player, region) * threatOpportunityMultiplier -
                 regionThreat(state, player, region) * threatOpportunityMultiplier * value;
        // and the soldiers on it
        value += state.soldierCount(region) * soldierBonus;

        return value;
    }

    const regionTotal = sequenceUtils.sum(map.regions, function (region) {
        return (state.owner(region) == player) ? adjustedRegionValue(region) : 0;
    });
    var faithTotal = state.income(player) * soldierBonus / 12; // each point of faith counts as 1/12th of a soldier
    return regionTotal + faithTotal;
}

function regionFullValue(state, region) {
    const temple = state.temples[region.index];
    if (temple) {
        const templeBonus = slidingBonus(state, 6, 0, 0.5);
        const upgradeBonus = slidingBonus(state, 4, 0, 0.9);
        const upgradeValue = temple.upgrade ? (temple.level + 1) : 0;
        return 1 + templeBonus + upgradeBonus * upgradeValue;
    } else {
        return 1;
    }
}

function templeDangerousness(state, temple) {
    const templeOwner = state.owner(temple.regionIndex);
    return regionThreat(state, templeOwner, temple.regionIndex) +
           regionOpportunity(state, templeOwner, temple.regionIndex);
}

function regionThreat(state, player, regionIndex) {
    const aiLevel = gameInitialization.gameSetup.aiLevel;
    if (gameInitialization.gameSetup.aiLevel === gameData.AI_NICE)
        return 0; // 'nice' AI doesn't consider threat

    let ourPresence = state.soldierCount(regionIndex);
    let region = map.regions[regionIndex];
    let enemyPresence = sequenceUtils.max(region.neighbors.map(function(neighbour) {
        // is this an enemy region?
        var nOwner = state.owner(neighbour);
        if ((nOwner == player) || !nOwner) return 0;

        // count soldiers that can reach us in 3 moves from this direction using a breadth-first search.
        // 'rude' AI only looks at direct neighbours, harder AIs look at all soldiers that can reach us.
        var depth = (aiLevel === gameData.AI_RUDE) ? 0 : 2;
        var queue = [{region: neighbour, depth}], visited = [];
        var total = 0;
        while (queue.length) {
            var entry = queue.shift();
            // soldiers further away count for less (at least if your AI_MEAN)
            total += state.soldierCount(entry.region) * ((aiLevel > gameData.AI_RUDE) ? (2 + entry.depth) / 4 : 1);
            visited.push(entry.region);

            if (entry.depth) {
                // go deeper with the search
                let unvisitedNeighbors =
                    entry.region.neighbors.filter(function(candidate) {
                        return (!sequenceUtils.contains(visited, candidate)) &&
                            (state.owner(candidate) == nOwner);
                    });
                unvisitedNeighbors.map(region => queue.push({region, depth: entry.depth - 1}));
            }
        }

        return total;
    }));
    const clampHigh = (aiLevel === gameData.AI_RUDE) ? 0.5 : 1.1
    const threatLevel = (enemyPresence / (ourPresence + 0.0001) - 1) / 1.5;
    return utils.clamp(threatLevel, 0, clampHigh);
}

function regionOpportunity(state, player, regionIndex) {
    // the 'nice' AI doesn't see opportunities
    if (gameInitialization.gameSetup.aiLevel === gameData.AI_NICE) return 0;

    // how much conquest does this region enable?
    var attackingSoldiers = state.soldierCount(regionIndex);
    if (!attackingSoldiers)
        return 0;

    let region = map.regions[regionIndex];
    return sequenceUtils.sum(region.neighbors, function(neighbour) {
        if (state.owner(neighbour) != player) {
            var defendingSoldiers = state.soldierCount(neighbour);
            const opp = (attackingSoldiers / (defendingSoldiers + 0.01) - 0.9) * 0.5;
            return utils.clamp(opp, 0, 0.5) * regionFullValue(state, neighbour);
        } else {
            return 0;
        }
    });
}

function slidingBonus(state, startOfGameValue, endOfGameValue, dropOffPoint) {
    var dropOffTurn = dropOffPoint * gameInitialization.gameSetup.turnCount;
    var alpha = (state.turnIndex - dropOffTurn) / (gameInitialization.gameSetup.turnCount - dropOffTurn);
    if (alpha < 0.0)
        alpha = 0.0;
    return startOfGameValue + (endOfGameValue - startOfGameValue) * alpha;
}