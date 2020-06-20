import utils from '../utils/utils.js';
import sequenceUtils from '../utils/sequenceUtils.js';
import gameData from '../state/gameData.js';
import gameInitialization from '../gameInitialization.js';
import gameController from '../gameController.js';
import { ArmyMove, BuildMove, EndMove } from '../state/model/Move.js';
import UPGRADES from '../state/model/UPGRADES.js';

// The AI running CPU players resides below.

export default {
    aiPickMove,
};

function aiPickMove(player, state, reportMoveCallback) {
    // check for upgrade options first
    // start with soldiers
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
    performMinMax(player, state, depth, reportMoveCallback);
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
    var temple = sequenceUtils.min(possibleUpgrades, templeDangerousness.bind(0, state));

    // build the upgrade!
    player.personality.preferredUpgrades.shift();
    return new BuildMove(desire, temple);
}

function templeDangerousness(state, temple) {
    var templeOwner = state.owner(temple.region);
    return regionThreat(state, templeOwner, temple.region) +
           regionOpportunity(state, templeOwner, temple.region);
}

function buildSoldierAtBestTemple(player, state) {
    var temple = sequenceUtils.max(state.templesForPlayer(player), templeDangerousness.bind(0, state));
    return new BuildMove(UPGRADES.SOLDIER, temple);
}

function minMaxDoSomeWork(node) {
    if (node.d === 0) {
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
        var childState = gameController.makeMove(node.s, move);
        return {
            p: node, a: node.a, d: node.d - 1,
            m: move,
            s: childState, u: possibleMoves(childState)
        };
    }
}

function minMaxReturnFromChild(node, child) {
    if (node) {
        // what sort of a node are we?
        var activePlayer = node.s.players[node.s.move.playerIndex];
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
    var simulation = fromState.copy(forPlayer);
    var initialNode = {
        p: null, a: forPlayer, s: simulation, d: depth,
        u: possibleMoves(fromState)
    };
    var currentNode = initialNode;
    var unitOfWork = 100;
    var timeStart = Date.now();

    setTimeout(doSomeWork, 1);

    function doSomeWork() {
        var stepsRemaining = unitOfWork;
        while (stepsRemaining--) {
            // do some thinking
            currentNode = minMaxDoSomeWork(currentNode);

            // cap thinking time
            var elapsedTime = Date.now() - timeStart;
            if (elapsedTime > gameData.maximumAIThinkingTime) {
                currentNode = null;
            }

            if (!currentNode) {
                // we're done, let's see what's the best move we found!
                var bestMove = initialNode.b;
                if (!bestMove) {
                    bestMove = new EndMove();
                }

                // perform the move (after a timeout if the minimal 'thinking time' wasn't reached
                // so that whatever the AI does is easy to understand
                const thinkTime = Math.max(gameData.minimumAIThinkingTime - elapsedTime, 1);
                setTimeout(moveCallback.bind(0, bestMove), thinkTime);
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
    var moves = [new EndMove()];
    var player = state.activePlayer();

    // are we out of move points?
    if (!state.move.movesRemaining)
        return moves; // yup, just end of turn available

    function addArmyMove(source, dest, count) {
        // add the move to the list, if it doesn't qualify as an obviously stupid one

        // suicide moves, for example:
        if ((state.owner(dest) != player) && (state.soldierCount(dest) > count))
            return;

        // not *obviously* stupid, so it to the list!
        moves.push(new ArmyMove(null, null, null, source, dest, count));
    }

    // let's see what moves we have available
    utils.map(state.regions, function(region) {
       if (state.regionHasActiveArmy(player, region)) {
           // there is a move from here!
           // iterate over all possible neighbours, and add two moves for each:
           // moving the entire army there, and half of it
           var soldiers = state.soldierCount(region);
           utils.map(region.neighbors, function(neighbour) {
               addArmyMove(region, neighbour, soldiers);
               if (soldiers > 1)
                   addArmyMove(region, neighbour, Math.floor(soldiers / 2));
           });
       }
    });

    // return the list, shuffled (so there is no bias due to move generation order)
    sequenceUtils.shuffle(moves);
    return moves;
}

function slidingBonus(state, startOfGameValue, endOfGameValue, dropOffPoint) {
    var dropOffTurn = dropOffPoint * gameInitialization.gameSetup.turnCount;
    var alpha = (state.move.turnIndex - dropOffTurn) / (gameInitialization.gameSetup.turnCount - dropOffTurn);
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
        return 1;
    }
}

function regionThreat(state, player, region) {
    var aiLevel = gameInitialization.gameSetup.l;
    if (gameInitialization.gameSetup.l === gameData.AI_NICE) return 0; // 'nice' AI doesn't consider threat

    var ourPresence = state.soldierCount(region);
    var enemyPresence = sequenceUtils.max(utils.map(region.neighbors, function(neighbour) {
        // is this an enemy region?
        var nOwner = state.owner(neighbour);
        if ((nOwner == player) || !nOwner) return 0;

        // count soldiers that can reach us in 3 moves from this direction
        // using a breadth-first search
        var depth = (aiLevel === gameData.AI_RUDE) ? 0 : 2; // 'rude' AI only looks at direct neighbours, harder AIs look at all soldiers that can reach us
        var queue = [{r: neighbour, d: depth}], visited = [];
        var total = 0;
        while (queue.length) {
            var entry = queue.shift();
            total += state.soldierCount(entry.r) * ((aiLevel > gameData.AI_RUDE) ? (2 + entry.d) / 4 : 1); // soldiers further away count for less (at least if your AI_MEAN)
            visited.push(entry.r);

            if (entry.d) {
                // go deeper with the search
                utils.map(entry.r.neighbor.filter(function(candidate) {
                    return (!sequenceUtils.contains(visited, candidate)) &&
                        (state.owner(candidate) == nOwner);
                }), function(r) {
                    queue.push({r: r, d: entry.d - 1});
                });
            }
        }

        return total;
    }));
    return utils.clamp((enemyPresence / (ourPresence+0.0001) - 1) / 1.5, 0, (aiLevel === gameData.AI_RUDE) ? 0.5 : 1.1);
}

function regionOpportunity(state, player, region) {
    // the 'nice' AI doesn't see opportunities
    if (gameInitialization.gameSetup.l === gameData.AI_NICE) return 0;

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