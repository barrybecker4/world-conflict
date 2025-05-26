var heuristics = (function(my) {

    my.heuristicForPlayer = function(player, state) {
        const soldierBonus = slidingBonus(state, 0.25, 0, 0.83);
        const threatOpportunityMultiplier = slidingBonus(state, 1.0, 0.0, 0.83);

        function adjustedRegionValue(region) {
            // count the value of the region itself
            let value = regionFullValue(state, region.index);
            // but also take into account the threat other players pose to it, and the opportunities it offers
            value += regionOpportunity(state, player, region.index) * threatOpportunityMultiplier -
                     regionThreat(state, player, region.index) * threatOpportunityMultiplier * value;
            // and the soldiers on it
            value += state.soldierCount(region) * soldierBonus;

            return value;
        }

        const regionTotal = sequenceUtils.sum(gameData.regions, region => {
            return state.isOwnedBy(region, player) ? adjustedRegionValue(region) : 0;
        });
        // each point of faith counts as 1/12th of a soldier
        const faithTotal = state.income(player, gameData.aiLevel) * soldierBonus / 12;
        return regionTotal + faithTotal;
    }

    my.templeDangerousness = function(state, temple) {
            const templeOwner = state.owner(temple.regionIndex);
            return regionThreat(state, templeOwner, temple.regionIndex) +
                   regionOpportunity(state, templeOwner, temple.regionIndex);
        }

    function regionFullValue(state, regionIdx) {
        const temple = state.temples[regionIdx];
        if (temple) {
            const templeBonus = slidingBonus(state, 6, 0, 0.5);
            const upgradeBonus = slidingBonus(state, 4, 0, 0.9);
            const upgradeValue = temple.upgradeIndex ? (temple.level + 1) : 0;
            return 1 + templeBonus + upgradeBonus * upgradeValue;
        } else {
            return 1;
        }
    }

    function regionThreat(state, player, regionIndex) {
        const aiLevel = gameData.aiLevel;
        if (gameData.aiLevel === CONSTS.AI_NICE)
            return 0; // 'nice' AI doesn't consider threat

        let ourPresence = state.soldierCount(regionIndex);
        let region = gameData.regions[regionIndex];
        let enemyPresence = sequenceUtils.max(region.neighbors.map(function(neighborIdx) {
            // is this an enemy region?
            var nbrOwner = state.owner(neighborIdx);
            if (!nbrOwner || state.isOwnedBy(neighborIdx, player)) return 0;

            // count soldiers that can reach us in 3 moves from this direction using a breadth-first search.
            // 'rude' AI only looks at direct neighbors, harder AIs look at all soldiers that can reach us.
            var depth = (aiLevel === CONSTS.AI_RUDE) ? 0 : 2;
            var queue = [{region: gameData.regions[neighborIdx], depth}], visited = [];
            var total = 0;
            while (queue.length) {
                var entry = queue.shift();
                // soldiers further away count for less (at least if you are AI_MEAN)
                total += state.soldierCount(entry.region) * ((aiLevel > CONSTS.AI_RUDE) ? (2 + entry.depth) / 4 : 1);
                visited.push(entry.region);

                if (entry.depth) {
                    // go deeper with the search
                    let unvisitedNeighbors =
                        entry.region.neighbors.filter(function(candidateIdx) {
                            return !sequenceUtils.contains(visited, gameData.regions[candidateIdx]) &&
                                state.isOwnedBy(candidateIdx, nbrOwner);
                        });
                    unvisitedNeighbors.map(i => queue.push({region: gameData.regions[i], depth: entry.depth - 1}));
                }
            }

            return total;
        }));
        const clampHigh = (aiLevel === CONSTS.AI_RUDE) ? 0.5 : 1.1
        const threatLevel = (enemyPresence / (ourPresence + 0.0001) - 1) / 1.5;
        return utils.clamp(threatLevel, 0, clampHigh);
    }

    function regionOpportunity(state, player, regionIndex) {
        // the 'nice' AI doesn't see opportunities
        if (gameData.aiLevel === CONSTS.AI_NICE) return 0;

        // how much conquest does this region enable?
        const attackingSoldiers = state.soldierCount(regionIndex);
        if (!attackingSoldiers)
            return 0;

        let region = gameData.regions[regionIndex];
        return sequenceUtils.sum(region.neighbors, function(neighborIdx) {
            if (state.isOwnedBy(neighborIdx, player)) {
                const defendingSoldiers = state.soldierCount(neighborIdx);
                const opp = (attackingSoldiers / (defendingSoldiers + 0.01) - 0.9) * 0.5;
                return utils.clamp(opp, 0, 0.5) * regionFullValue(state, neighborIdx);
            } else {
                return 0;
            }
        });
    }

    function slidingBonus(state, startOfGameValue, endOfGameValue, dropOffPoint) {
        const dropOffTurn = dropOffPoint * gameData.turnCount;
        let alpha = (state.turnIndex - dropOffTurn) / (gameData.turnCount - dropOffTurn);
        if (alpha < 0.0)
            alpha = 0.0;
        return startOfGameValue + (endOfGameValue - startOfGameValue) * alpha;
    }

    return my;
}(heuristics || {}));
