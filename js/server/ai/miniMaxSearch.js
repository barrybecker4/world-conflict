import makeMove from '../../client/makeMove.js';
import Node from './Node.js';

export default function miniMaxSearch(forPlayer, fromState, depth, moveCallback, minTime, maxTime) {
    let simulation = fromState.copy(forPlayer);
    let initialNode = new Node(null, forPlayer, depth, null, simulation, possibleMoves(fromState));
    let currentNode = initialNode;
    let unitOfWork = 100;
    let timeStart = Date.now();

    setTimeout(doSomeWork, 0);

    function doSomeWork() {
        let stepsRemaining = unitOfWork;
        while (stepsRemaining--) {
            // do some thinking
            currentNode = minMaxDoSomeWork(currentNode);

            // cap thinking time
            let elapsedTime = Date.now() - timeStart;

            if (!currentNode || elapsedTime > maxTime) {  // this can be simplified
                // we're done, let's see what's the best move we found!
                let bestMove = initialNode.bestMove;
                if (!bestMove) {
                    bestMove = new EndMove();
                }

                // perform the move (after a timeout if the minimal 'thinking time' wasn't reached
                // so that whatever the AI does is easy to understand
                const thinkTime = Math.max(minTime - elapsedTime, 1);
                setTimeout(() => moveCallback(bestMove), thinkTime);
                return;
            }
        }
        // Schedule some more work. We're not done yet but we want to let some events happen
        setTimeout(doSomeWork, 0); // was 1
    }
}

function minMaxDoSomeWork(node) {
    if (node.depth === 0) {
        // terminal node, evaluate and return
        node.value = heuristics.heuristicForPlayer(node.activePlayer, node.state);
        return minMaxReturnFromChild(node.parent, node);
    }

    let move = node.possibleMoves.shift();
    if (!move) {
        // we're done analyzing here, return value to parent
        return minMaxReturnFromChild(node.parent, node);
    } else {
        // spawn a child node
        let childState = makeMove(node.state, move);
        return new Node(node, node.activePlayer, node.depth - 1, move, childState, possibleMoves(childState));
    }
}

function minMaxReturnFromChild(node, child) {
    if (node) {
        // what sort of a node are we?
        let activePlayer = gameData.players[node.state.playerIndex];
        let maximizingNode = activePlayer == node.activePlayer;
        // is the value from child better than what we have?
        let better =
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
    let moves = [new EndMove()];
    let player = state.activePlayer();

    // are we out of move points?
    if (!state.movesRemaining)
        return moves;

    // add the move to the list, if it isn't dumb or illegal
    function addArmyMove(source, dest, soldierCount) {

        // suicide moves, for example, are dumb.
        if ((state.owner(dest) != player) && (state.soldierCount(dest) > soldierCount))
            return;

        // not *obviously* dumb, so add it to the list!
        moves.push(new ArmyMove({ state, source: source.index, destination: dest.index, count: soldierCount }));
    }

    // let's see what moves we have available
    gameData.regions.map(function(region) {
       if (state.regionHasActiveArmy(player, region)) {
           // There is a move from here!
           // Iterate over all possible neighbors, and add two moves for each:
           // Add a move for moving the entire army there, and another one with half the army.
           let soldiers = state.soldierCount(region);
           region.neighbors.map(function(neighborIdx) {
               let neighbor = gameData.regions[neighborIdx];
               addArmyMove(region, neighbor, soldiers);
               if (soldiers > 1)
                   addArmyMove(region, neighbor, Math.floor(soldiers / 2));
           });
       }
    });

    // return the list, shuffled (so there is no bias due to move generation order)
    sequenceUtils.shuffle(moves);
    return moves;
}
