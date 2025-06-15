var erisk = (function(my) {

    class Node {
        constructor(parent, activePlayer, depth, command, state, possibleCommands) {
            this.parent = parent;
            this.activePlayer = activePlayer;
            this.depth = depth;
            this.command = command;
            this.state = state;
            this.possibleCommands = possibleCommands;
            this.bestCommand = null;
            this.value = null;
        }
    }

    my.miniMaxSearch = function(forPlayer, fromState, depth, commandCallback, maxTime) {
        let simulation = fromState.copy(forPlayer);
        let initialNode = new Node(null, forPlayer, depth, null, simulation, possibleCommands(fromState));
        let currentNode = initialNode;
        let unitOfWork = 100;
        let timeStart = Date.now();

        doSomeWork();

        function doSomeWork() {
            let stepsRemaining = unitOfWork;
            while (stepsRemaining--) {
                // do some thinking
                currentNode = minMaxDoSomeWork(currentNode);

                // cap thinking time
                let elapsedTime = Date.now() - timeStart;

                if (!currentNode || elapsedTime > maxTime) {  // this can be simplified
                    // we're done, let's see what's the best command we found!
                    let bestCommand = initialNode.bestCommand;
                    if (!bestCommand) {
                        bestCommand = new EndMoveCommand(fromState, forPlayer);
                    }

                    // perform the command
                    commandCallback(bestCommand);
                    return;
                }
            }
            // Used to have setTimeout here. We're not done yet but we want to let some events happen.
            doSomeWork();
        }
    }

    function minMaxDoSomeWork(node) {
        if (node.depth === 0) {
            // terminal node, evaluate and return
            node.value = heuristics.heuristicForPlayer(node.activePlayer, node.state);
            return minMaxReturnFromChild(node.parent, node);
        }

        let command = node.possibleCommands.shift();
        if (!command) {
            // we're done analyzing here, return value to parent
            return minMaxReturnFromChild(node.parent, node);
        } else {
            // spawn a child node
            let childState = executeCommand(node.state, command);
            return new Node(node, node.activePlayer, node.depth - 1, command, childState, possibleCommands(childState));
        }
    }

    function minMaxReturnFromChild(node, child) {
        if (node) {
            // what sort of a node are we?
            let activePlayer = gameData.players[node.state.playerIndex];
            let maximizingNode = activePlayer.index === node.activePlayer.index;
            // is the value from child better than what we have?
            let better =
                !node.bestCommand ||
                (maximizingNode && child.value > node.value) ||
                (!maximizingNode && child.value < node.value);
            if (better) {
                node.bestCommand = child.command;
                node.value = child.value;
            }
        }

        // work will resume in this node on the next iteration
        return node;
    }

    function possibleCommands(state) {
        // ending your turn is always an option
        let commands = [new EndMoveCommand(state, state.activePlayer())];
        let player = state.activePlayer();

        // are we out of move points?
        if (!state.movesRemaining)
            return commands;

        // add the command to the list, if it isn't dumb or illegal
        function addArmyCommand(source, dest, soldierCount) {
            // suicide moves, for example, are dumb.
            if (!state.isOwnedBy(dest, player) && state.soldierCount(dest) > soldierCount)
                return;

            // not *obviously* dumb, so add it to the list!
            commands.push(new ArmyMoveCommand(state, player, source.index, dest.index, soldierCount));
        }

        // let's see what commands we have available
        gameData.regions.map(function(region) {
           if (state.regionHasActiveArmy(player, region)) {
               // There is a move from here!
               // Iterate over all possible neighbors, and add two moves for each:
               // Add a move for moving the entire army there, and another one with half the army.
               let soldiers = state.soldierCount(region);
               region.neighbors.map(function(neighborIdx) {
                   let neighbor = gameData.regions[neighborIdx];
                   addArmyCommand(region, neighbor, soldiers);
                   if (soldiers > 1)
                       addArmyCommand(region, neighbor, Math.floor(soldiers / 2));
               });
           }
        });

        // return the list, shuffled (so there is no bias due to command generation order)
        sequenceUtils.shuffle(commands);
        return commands;
    }

    // Execute a command for AI simulation
    function executeCommand(state, command) {
        try {
            const commandProcessor = new CommandProcessor();
            const result = commandProcessor.process(command);

            if (!result.success) {
                console.error("AI simulation command failed:", result.error);
                // Return the original state if command failed
                return state;
            }

            return result.newState;
        } catch (error) {
            console.error("Error executing AI command:", error);
            return state;
        }
    }

    return my;
}(erisk || {}));