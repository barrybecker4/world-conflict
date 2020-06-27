import utils from '../../utils/utils.js';
import sequenceUtils from '../../utils/sequenceUtils.js';
import gameData from '../../state/consts/gameData.js';
import { ArmyMove, EndMove } from '../../state/model/Move.js';
import heuristics from './heuristics.js';
import makeMove from '../../client/makeMove.js';
import Node from './Node.js';

export default function miniMaxSearch(forPlayer, fromState, depth, moveCallback) {
    var simulation = fromState.copy(forPlayer);
    var initialNode = new Node(null, forPlayer, depth, null, simulation, possibleMoves(fromState));
    var currentNode = initialNode;
    var unitOfWork = 100;
    var timeStart = Date.now();

    setTimeout(doSomeWork, 0); // was 1

    function doSomeWork() {
        var stepsRemaining = unitOfWork;
        while (stepsRemaining--) {
            // do some thinking
            currentNode = minMaxDoSomeWork(currentNode);

            // cap thinking time
            var elapsedTime = Date.now() - timeStart;

            if (elapsedTime > gameData.maximumAIThinkingTime) {  // this can be simplified
                currentNode = null;
            }

            if (!currentNode) {
                // we're done, let's see what's the best move we found!
                var bestMove = initialNode.bestMove;
                if (!bestMove) {
                    bestMove = new EndMove();
                }

                // perform the move (after a timeout if the minimal 'thinking time' wasn't reached
                // so that whatever the AI does is easy to understand
                const thinkTime = Math.max(gameData.minimumAIThinkingTime - elapsedTime, 1);
                setTimeout(() => moveCallback(bestMove), thinkTime);
                return;
            }
        }
        // schedule some more work, we're not done yet
        // but we want to let some events happen
        setTimeout(doSomeWork, 0); // was 1
    }
}

function minMaxDoSomeWork(node) {
    if (node.depth === 0) {
        // terminal node, evaluate and return
        node.value = heuristics.heuristicForPlayer(node.activePlayer, node.state);
        return minMaxReturnFromChild(node.parent, node);
    }

    var move = node.possibleMoves.shift();
    if (!move) {
        // we're done analyzing here, return value to parent
        return minMaxReturnFromChild(node.parent, node);
    } else {
        // spawn a child node
        var childState = makeMove(node.state, move);
        return new Node(node, node.activePlayer, node.depth - 1, move, childState, possibleMoves(childState));
    }
}

function minMaxReturnFromChild(node, child) {
    if (node) {
        // what sort of a node are we?
        var activePlayer = node.state.players[node.state.playerIndex];
        var maximizingNode = activePlayer == node.activePlayer;
        // is the value from child better than what we have?
        var better =
            !node.bestMove || (maximizingNode && child.value > node.value) || (!maximizingNode && child.value < node.value);
        if (better) {
            node.bestMove = child.move;
            node.value = child.value;
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
    if (!state.movesRemaining)
        return moves; // yup, just end of turn available

    // add the move to the list, if it doesn't qualify as an obviously dumb one
    function addArmyMove(source, dest, count) {

        // suicide moves, for example, are dumb.
        if ((state.owner(dest) != player) && (state.soldierCount(dest) > count))
            return;

        // not *obviously* dumb, so add it to the list!
        moves.push(new ArmyMove(source, dest, count));
    }

    // let's see what moves we have available
    state.regions.map(function(region) {
       if (state.regionHasActiveArmy(player, region)) {
           // There is a move from here!
           // Iterate over all possible neighbours, and add two moves for each:
           // moving the entire army there, and half of it
           var soldiers = state.soldierCount(region);
           region.neighbors.map(function(neighbour) {
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
