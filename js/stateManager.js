


// ==========================================================
// Preparing the initial game state happens here
// ==========================================================

function makeInitialState(setup) {
    var players = [];
    map(setup.p, function(playerController, playerIndex) {
        if (playerController == PLAYER_OFF) return;
        var player = deepCopy(PLAYER_TEMPLATES[playerIndex], 1);

        // set up as AI/human
        player.u = (playerController == PLAYER_HUMAN) ? uiPickMove : aiPickMove;
        // pick a random personality if we're AI
        if (playerController == PLAYER_AI) {
            player.p = deepCopy(AI_PERSONALITIES[rint(0, AI_PERSONALITIES.length)], 2);
        }

        player.i = players.length;
        players.push(player);
    });

    var regions = generateMap(players.length);
    var gameState = {
        p: players,
        r: regions,
        o: {}, t: {}, s: {}, c: {}, l: {},
        m: {t: 1, p: 0, m: MOVE_ARMY, l: movesPerTurn}
    };

    setupTemples();

    return gameState;



    function distance(regionA, regionB) {
        // breadth-first search!
        var queue = [{r: regionA, d:0}], visited = [regionA], answer = -1, bound = 100;

        while (answer < 0) {
            var item = queue.shift(), region = item.r, distanceFromA = item.d;
            if (region == regionB) {
                // we've found the region!
                answer = distanceFromA;
            } else if (distanceFromA >= bound) {
                // we've reached our established upper bound - return it
                answer = bound;
            } else {
                // use memoized values to establish an upper bound (we still might do better,
                // but we can't do worse)
                if (region.d[regionB.i])
                    bound = min([bound, region.d[regionB.i] + distanceFromA]);

                // look in all unvisited neighbours
                map(region.n, function (neighbour) {
                    if (!contains(visited, neighbour))
                        queue.push({r: neighbour, d: distanceFromA + 1});
                });
                visited.push(region);
            }
        }

        // memoize result for later and return
        regionA.d[regionB.i] = regionB.d[regionA.i] = answer;
        return answer;
    }

    function distanceScore(regions) {
        return min(pairwise(regions, distance));
    }

    function randomRegion() {
        return regions[rint(0, regions.length)];
    }

    function setupTemples() {
        // give the players some cash (or not)
        map(players, function(player, index) {
            gameState.c[index] = gameState.l[index] = 0;
        });

        // pick three regions that are as far away as possible from each other
        // for the players' initial temples
        var possibleSetups = map(range(0,1000), function() {
            return map(gameState.p, randomRegion);
        });
        var homes = max(possibleSetups, distanceScore);

        // we have the regions, set up each player
        map(players, function(player, index) {
            var region = homes[index];
            // make one of the regions your own
            gameState.o[region.i] = player;
            // put a temple and 3 soldiers in it
            putTemple(region, 3);
        });

        // setup neutral temples
        var distancesToTemples = map(homes, function() { return 0; });
        var templeRegions = [];
        var templeCount = [3,3,4][players.length-2];

        map(range(0,templeCount), function() {
            var bestRegion = max(gameState.r, function(region) {
                return templeScore(region);
            });

            putTemple(bestRegion, 3);

            templeRegions.push(bestRegion);
            distancesToTemples = updatedDistances(bestRegion);
        });

        function updatedDistances(newTemple) {
            return map(homes, function(home, index) {
                return distancesToTemples[index] + distance(home, newTemple);
            });
        }

        function templeScore(newTemple) {
            if (contains(templeRegions, newTemple))
                return -100;

            var updated = updatedDistances(newTemple);
            var inequality = max(updated) - min(updated);
            var templeDistances = distanceScore(templeRegions.concat(homes).concat(newTemple));
            if (!templeDistances)
                templeDistances = -5;

            return templeDistances - inequality;
        }
    }

    function putTemple(region, soldierCount) {
        var index = region.i;
        gameState.t[index] = {r: region, i: index};
        addSoldiers(gameState, region, soldierCount);
    }
}



// ==========================================================
// Various simple helpers for working with the game state.
// ==========================================================

function soldierCount(state, region) {
    var list = state.s[region.i];
    return list ? list.length : 0;
}

function income(state, player) {
    // no income with no temples
    var playerTemples = temples(state,player);
    if (!playerTemples.length) return 0;

    // 1 faith per region
    var fromRegions = regionCount(state, player);
    // 1 faith per each soldier at temple (too much?)
    var fromTemples = sum(playerTemples, function(temple) {
        return soldierCount(state, temple.r);
    });
    var multiplier = 1.0 + 0.01 * upgradeLevel(state, player, WATER);
    if ((player.u == aiPickMove) && (gameSetup.l == AI_EVIL))
        multiplier += 0.4;
    return ceil(multiplier * (fromRegions + fromTemples));
}

function regionHasActiveArmy(state, player, region) {
    return (state.m.l > 0) && (owner(state, region) == player) && soldierCount(state, region) && (!contains(state.m.z, region));
}

function regionCount(state, player) {
    var total = 0;
    map(state.r, function(region) {
        if (owner(state, region) == player)
            total++;
    });
    return total;
}

function temples(state, player) {
    var temples = [];
    forEachProperty(state.t, function(temple, regionIndex) {
        if (state.o[regionIndex] == player)
            temples.push(temple);
    });
    return temples;
}

function activePlayer(state) {
    return state.p[state.m.p];
}

function owner(state, region) {
    return state.o[region.i];
}

function cash(state, player) {
    return state.c[player.i];
}

function rawUpgradeLevel(state, player, upgradeType) {
    return max(map(temples(state, player), function(temple) {
        if (temple.u && temple.u == upgradeType)
            return temple.l + 1;
        else
            return 0;
    }).concat(0));
}

function upgradeLevel(state, player, upgradeType) {
    if (!player) {
        // neutral forces always have upgrade level 0;
        return 0;
    }

    return max(map(state.r, function(region) {
        // does it have a temple?
        var temple = state.t[region.i];
        if (!temple) return 0;
        // does it belong to us?
        if (owner(state, region) != player) return 0;
        // does it have the right type of upgrade?
        return (temple.u == upgradeType) ? upgradeType.x[temple.l] : 0;
    }));
}

function totalSoldiers(state, player) {
    return sum(state.r, function(region) {
        return (owner(state, region) == player) ? soldierCount(state, region) : 0;
    });
}

function soldierCost(state) {
    return SOLDIER.c[state.m.h || 0];
}

function templeInfo(state, temple) {
    if (!temple.u) {
        var name = owner(state, temple.r) ? "Basic Temple" : "Neutral Temple";
        return {n: name, d: "No upgrades."};
    } else {
        var upgrade = temple.u, level = temple.l,
            description = template(upgrade.d, upgrade.x[level]);
        return {n: template(upgrade.n, LEVELS[level]), d: description};
    }
}

// ==========================================================
// Undo functionality
// ==========================================================

var previousState = null;

function undoEnabled(gameState) {
    return previousState && // there is a state to return to
        (activePlayer(previousState) == activePlayer(gameState)) &&  // and it was actually our move
        (!gameState.u) && // and undo wasn't expressly disabled after a battle
        (activePlayer(gameState).u == uiPickMove); // and no using Undo on behalf of the AI!
}

function performUndo(currentState) {
    if (!undoEnabled(currentState))
        return;

    // clear the callbacks from previous UI interaction
    uiCallbacks = {};

    // roll back the state to "previous"
    var restoredState = previousState;
    previousState = null;
    playOneMove(restoredState);
}
