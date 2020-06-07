


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