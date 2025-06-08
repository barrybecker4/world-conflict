class CommandProcessor {

    constructor() {
        this.executedCommands = [];
        this.undoneCommands = [];
    }

    /**
     * Processes a command
     * @param {Command} command
     * @returns {Object} {success: boolean, newState?: GameState, error?: string}
     */
    process(command) {

        const validation = command.validate();
        if (!validation.valid) {
            return {
                success: false,
                errors: validation.errors
            };
        }

        try {
            const newState = command.execute();

            this.executedCommands.push(command);
            this.undoneCommands = []; // Clear redo stack

            this.checkGameEnd(newState);

            return {
                success: true,
                newState: newState
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }

        if (command instanceof ResignationCommand) {
            command.canUndo = false;
        }
    }

    /**
     * @returns {Object} {success: boolean, newState?: GameState, error?: string}
     */
    undo() {
        if (this.executedCommands.length === 0) {
            return {
                success: false,
                error: "No commands to undo"
            };
        }

        const command = this.executedCommands.pop();
        try {
            const previousState = command.undo();
            this.undoneCommands.push(command);

            return {
                success: true,
                newState: previousState
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * @returns {Object} {success: boolean, newState?: GameState, error?: string}
     */
    redo() {
        if (this.undoneCommands.length === 0) {
            return {
                success: false,
                error: "No commands to redo"
            };
        }

        const command = this.undoneCommands.pop();
        return this.process(command);
    }

    /**
     * @returns {Array<Object>} Serialized commands
     */
    getHistory() {
        return this.executedCommands.map(cmd => cmd.serialize());
    }

    /**
     * Replays commands from a serialized history
     * @param {Array<Object>} history
     * @param {GameState} initialState
     * @returns {GameState} Final state after replay
     */
    replay(history, initialState) {
        let currentState = initialState;

        for (const serializedCmd of history) {
            const command = this.deserializeCommand(serializedCmd, currentState);
            const result = this.process(command);

            if (!result.success) {
                throw new Error(`Failed to replay command: ${result.error}`);
            }

            currentState = result.newState;
        }

        return currentState;
    }

    deserializeCommand(data, gameState) {
        const player = gameData.players[data.playerId];

        switch (data.type) {
            case 'ArmyMoveCommand':
                return new ArmyMoveCommand(
                    gameState,
                    player,
                    data.source,
                    data.destination,
                    data.count
                );
            case 'BuildUpgradeCommand':
                return new BuildUpgradeCommand(
                    gameState,
                    player,
                    data.regionIndex,
                    data.upgradeIndex
                );
            case 'EndMoveCommand':
                return new EndMoveCommand(
                    gameState,
                    player,
                    data.buttons
                );
            case 'ResignationCommand':
                return new ResignationCommand(
                    gameState,
                    player
                );
            default:
                throw new Error(`Unknown command type: ${data.type}`);
        }
    }

    checkGameEnd(state) {
        if (state.turnIndex > gameData.turnCount) {
            state.endResult = this.determineWinner(state);
        }
    }
}
