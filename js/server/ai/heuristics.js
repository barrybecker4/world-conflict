import utils from '../../utils/utils.js';
import sequenceUtils from '../../utils/sequenceUtils.js';
import gameData from '../../state/consts/gameData.js';
import gameInitialization from '../../client/gameInitialization.js';

export default {
    heuristicForPlayer,
    templeDangerousness,
}

function heuristicForPlayer(player, state) {
    var soldierBonus = slidingBonus(state, 0.25, 0, 0.83),
        threatOpportunityMultiplier = slidingBonus(state, 1.0, 0.0, 0.83);

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

    var regionTotal = sequenceUtils.sum(state.regions, function (region) {
        return (state.owner(region) == player) ? adjustedRegionValue(region) : 0;
    });
    var faithTotal = state.income(player) * soldierBonus / 12; // each point of faith counts as 1/12th of a soldier
    return regionTotal + faithTotal;
}

function regionFullValue(state, region) {
    var temple = state.temples[region.index];
    if (temple) {
        var templeBonus = slidingBonus(state, 6, 0, 0.5);
        var upgradeBonus = slidingBonus(state, 4, 0, 0.9);
        var upgradeValue = temple.upgrade ? (temple.level + 1) : 0;
        return 1 + templeBonus + upgradeBonus * upgradeValue;
    } else {
        return 1;slidingBon
    }
}

function templeDangerousness(state, temple) {
    var templeOwner = state.owner(temple.region);
    return regionThreat(state, templeOwner, temple.region) +
           regionOpportunity(state, templeOwner, temple.region);
}

function regionThreat(state, player, region) {
    var aiLevel = gameInitialization.gameSetup.aiLevel;
    if (gameInitialization.gameSetup.aiLevel === gameData.AI_NICE) return 0; // 'nice' AI doesn't consider threat

    var ourPresence = state.soldierCount(region);
    var enemyPresence = sequenceUtils.max(utils.map(region.neighbors, function(neighbour) {
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
                utils.map(entry.region.neighbors.filter(function(candidate) {
                    return (!sequenceUtils.contains(visited, candidate)) &&
                        (state.owner(candidate) == nOwner);
                }), function(region) {
                    queue.push({region, depth: entry.depth - 1});
                });
            }
        }

        return total;
    }));
    return utils.clamp((enemyPresence / (ourPresence + 0.0001) - 1) / 1.5, 0, (aiLevel === gameData.AI_RUDE) ? 0.5 : 1.1);
}

function regionOpportunity(state, player, region) {
    // the 'nice' AI doesn't see opportunities
    if (gameInitialization.gameSetup.aiLevel === gameData.AI_NICE) return 0;

    // how much conquest does this region enable?
    var attackingSoldiers = state.soldierCount(region);
    if (!attackingSoldiers)
        return 0;

    return sequenceUtils.sum(region.neighbors, function(neighbour) {
        if (state.owner(neighbour) != player) {
            var defendingSoldiers = state.soldierCount(neighbour);
            return utils.clamp((attackingSoldiers / (defendingSoldiers + 0.01) - 0.9) * 0.5, 0, 0.5) * regionFullValue(state, neighbour);
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
    return (startOfGameValue + (endOfGameValue - startOfGameValue) * alpha);
}