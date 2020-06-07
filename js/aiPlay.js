// ==========================================================
// The AI running CPU players resides below.
// ==========================================================

function aiPickMove(player, state, reportMoveCallback) {
    // check for upgrade options first
    // start with soldiers
    if (shouldBuildSoldier(player, state)) {
        var move = buildSoldierAtBestTemple(player, state);
        return setTimeout(reportMoveCallback.bind(0,move), minimumAIThinkingTime);
    }

    // we don't need soldiers, maybe we can upgrade a temple?
    var upgrade = upgradeToBuild(player, state);
    if (upgrade) {
        return setTimeout(reportMoveCallback.bind(0, upgrade), minimumAIThinkingTime);
    }

    // the AI only analyzes its own moves (threats are handled in heuristic)
    var depth = state.m.l || 1;

    // use a min-max search to find the best move looking a few steps forward
    performMinMax(player, state, depth, reportMoveCallback);
}

function shouldBuildSoldier(player, state) {
    // do we have a temple to build it in?
    if (!temples(state, player).length)
        return false;

    // get preference for soldiers from our personality
    // if we don't want more upgrades, our preference becomes 1
    var soldierPreference = player.p.u.length ? player.p.s : 1;

    // calculate the relative cost of buying a soldier now
    var relativeCost = soldierCost(state) / state.c[player.i];
    if (relativeCost > 1)
        return false;

    // see how far behind on soldier number we are
    var forces = map(state.p, force.bind(0,state));
    var forceDisparity = max(forces) / force(state, player);

    // this calculates whether we should build now - the further we are behind
    // other players, the more likely we are to spend a big chunk of our cash
    // on it
    var decisionFactor = forceDisparity * soldierPreference - relativeCost;

    return decisionFactor >= 0;
}

function force(state, player) {
    return regionCount(state, player) * 2 + totalSoldiers(state, player);
}

function upgradeToBuild(player, state) {
    // do we still want something?
    if (!player.p.u.length)
        return;
    var desire = player.p.u[0];
    var currentLevel = rawUpgradeLevel(state, player, desire);
    // can we afford it?
    if (state.c[player.i] < desire.c[currentLevel])
        return;

    // do we have a place to build it?
    var possibleUpgrades = temples(state, player).filter(function(temple) {
        return ((!temple.u) && (!currentLevel)) || (temple.u == desire);
    });
    if (!possibleUpgrades.length)
        return;

    // pick the safest temple
    var temple = min(possibleUpgrades, templeDangerousness.bind(0, state));

    // build the upgrade!
    player.p.u.shift();
    return {t: BUILD_ACTION, u: desire, w: temple, r: temple.r};
}

function templeDangerousness(state, temple) {
    var templeOwner = owner(state, temple.r);
    return regionThreat(state, templeOwner, temple.r) +
           regionOpportunity(state, templeOwner, temple.r);
}

function buildSoldierAtBestTemple(player, state) {
    var temple = max(temples(state, player), templeDangerousness.bind(0, state));
    return {t: BUILD_ACTION, u: SOLDIER, w: temple, r: temple.r};
}

function minMaxDoSomeWork(node) {
    if (node.d == 0) {
        // terminal node, evaluate and return
        node.v = heuristicForPlayer(node.a, node.s);
        return minMaxReturnFromChild(node.p, node);
    }

    var move = node.u.shift();
    if (!move) {
        // we're done analyzing here, return value to parent
        return minMaxReturnFromChild(node.p, node);
    } else {
        // spawn a child node
        var childState = makeMove(node.s, move);
        return {
            p: node, a: node.a, d: node.d-1,
            m: move,
            s: childState, u: possibleMoves(childState)
        };
    }
}

function minMaxReturnFromChild(node, child) {
    if (node) {
        // what sort of a node are we?
        var activePlayer = node.s.p[node.s.m.p];
        var maximizingNode = activePlayer == node.a;
        // is the value from child better than what we have?
        var better = (!node.b) || (maximizingNode && (child.v > node.v)) || ((!maximizingNode) && (child.v < node));
        if (better) {
            node.b = child.m;
            node.v = child.v;
        }
    }

    // work will resume in this node on the next iteration
    return node;
}

function performMinMax(forPlayer, fromState, depth, moveCallback) {
    var simulation = copyState(fromState, forPlayer);
    var initialNode = {
        p: null, a: forPlayer, s: simulation, d: depth,
        u: possibleMoves(fromState)
    };
    var currentNode = initialNode;
    var unitOfWork = 100;
    var timeStart = now();

    setTimeout(doSomeWork, 1);

    function doSomeWork() {
        var stepsRemaining = unitOfWork;
        while (stepsRemaining--) {
            // do some thinking
            currentNode = minMaxDoSomeWork(currentNode);

            // cap thinking time
            var elapsedTime = now() - timeStart;
            if (elapsedTime > maximumAIThinkingTime) {
                currentNode = null;
            }

            if (!currentNode) {
                // we're done, let's see what's the best move we found!
                var bestMove = initialNode.b;
                if (!bestMove) {
                    bestMove = {t: END_TURN};
                }

                // perform the move (after a timeout if the minimal 'thinking time' wasn't reached
                // so that whatever the AI does is easy to understand
                setTimeout(moveCallback.bind(0, bestMove), max([minimumAIThinkingTime - elapsedTime, 1]));
                return;
            }
        }
        // schedule some more work, we're not done yet
        // but we want to let some events happen
        setTimeout(doSomeWork, 1);
    }
}

function possibleMoves(state) {
    // ending your turn is always an option
    var moves = [{t: END_TURN}];
    var player = activePlayer(state);

    // are we out of move points?
    if (!state.m.l)
        return moves; // yup, just end of turn available

    function addArmyMove(source, dest, count) {
        // add the move to the list, if it doesn't qualify as an obviously stupid one

        // suicide moves, for example:
        if ((owner(state, dest) != player) && (soldierCount(state, dest) > count))
            return;

        // not *obviously* stupid, add it to the list!
        moves.push({t: MOVE_ARMY, s: source, d: dest, c: count});
    }

    // let's see what moves we have available
    map(state.r, function(region) {
       if (regionHasActiveArmy(state, player, region)) {
           // there is a move from here!
           // iterate over all possible neighbours, and add two moves for each:
           // moving the entire army there, and half of it
           var soldiers = soldierCount(state, region);
           map(region.n, function(neighbour) {
               addArmyMove(region, neighbour, soldiers);
               if (soldiers > 1)
                   addArmyMove(region, neighbour, floor(soldiers / 2));
           });
       }
    });

    // return the list, shuffled (so there is no bias due to move generation order)
    shuffle(moves);
    return moves;
}

function slidingBonus(state, startOfGameValue, endOfGameValue, dropOffPoint) {
    var dropOffTurn = dropOffPoint * gameSetup.tc;
    var alpha = (state.m.t - dropOffTurn) / (gameSetup.tc - dropOffTurn);
    if (alpha < 0.0)
        alpha = 0.0;
    return (startOfGameValue + (endOfGameValue - startOfGameValue) * alpha);
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
        value += soldierCount(state, region) * soldierBonus;

        return value;
    }

    var regionTotal = sum(state.r, function (region) {
        return (owner(state, region) == player) ? adjustedRegionValue(region) : 0;
    });
    var faithTotal = income(state, player) * soldierBonus / 12; // each point of faith counts as 1/12th of a soldier
    return regionTotal + faithTotal;
}

function regionFullValue(state, region) {
    var temple = state.t[region.i];
    if (temple) {
        var templeBonus = slidingBonus(state, 6, 0, 0.5);
        var upgradeBonus = slidingBonus(state, 4, 0, 0.9);
        var upgradeValue = temple.u ? (temple.l + 1) : 0;
        return 1 + templeBonus + upgradeBonus * upgradeValue;
    } else {
        return 1;
    }
}

function regionThreat(state, player, region) {
    var aiLevel = gameSetup.l;
    if (gameSetup.l == AI_NICE) return 0; // 'nice' AI doesn't consider threat

    var ourPresence = soldierCount(state, region);
    var enemyPresence = max(map(region.n, function(neighbour) {
        // is this an enemy region?
        var nOwner = owner(state, neighbour);
        if ((nOwner == player) || !nOwner) return 0;

        // count soldiers that can reach us in 3 moves from this direction
        // using a breadth-first search
        var depth = (aiLevel == AI_RUDE) ? 0 : 2; // 'rude' AI only looks at direct neighbours, harder AIs look at all soldiers that can reach us
        var queue = [{r: neighbour, d: depth}], visited = [];
        var total = 0;
        while (queue.length) {
            var entry = queue.shift();
            total += soldierCount(state, entry.r) * ((aiLevel > AI_RUDE) ? (2 + entry.d) / 4 : 1); // soldiers further away count for less (at least if your AI_MEAN)
            visited.push(entry.r);

            if (entry.d) {
                // go deeper with the search
                map(entry.r.n.filter(function(candidate) {
                    return (!contains(visited, candidate)) &&
                        (owner(state, candidate) == nOwner);
                }), function(r) {
                    queue.push({r: r, d: entry.d-1});
                });
            }
        }

        return total;
    }));
    return clamp((enemyPresence / (ourPresence+0.0001) - 1) / 1.5, 0, (aiLevel == AI_RUDE) ? 0.5 : 1.1);
}

function regionOpportunity(state, player, region) {
    // the 'nice' AI doesn't see opportunities
    if (gameSetup.l == AI_NICE) return 0;

    // how much conquest does this region enable?
    var attackingSoldiers = soldierCount(state, region);
    if (!attackingSoldiers)
        return 0;

    return sum(region.n, function(neighbour) {
        if (owner(state, neighbour) != player) {
            var defendingSoldiers = soldierCount(state, neighbour);
            return clamp((attackingSoldiers / (defendingSoldiers + 0.01) - 0.9) * 0.5, 0, 0.5) * regionFullValue(state, neighbour);
        } else {
            return 0;
        }
    });
}