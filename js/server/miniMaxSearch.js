import utils from '../utils/utils.js';
import sequenceUtils from '../utils/sequenceUtils.js';
import gameData from '../state/gameData.js';
import gameController from '../gameController.js';
import { ArmyMove, EndMove } from '../state/model/Move.js';
import heuristics from './heuristics.js';

export default function miniMaxSearch(forPlayer, fromState, depth, moveCallback) {
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

function minMaxDoSomeWork(node) {
    if (node.d === 0) {
        // terminal node, evaluate and return
        node.v = heuristics.heuristicForPlayer(node.a, node.s);
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
            p: node,
            a: node.a,
            d: node.d - 1,
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
