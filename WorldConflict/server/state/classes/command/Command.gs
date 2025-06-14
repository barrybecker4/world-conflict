class Command {

    constructor(gameState, player) {
        this.gameState = gameState;
        this.player = player;
        this.timestamp = new Date().toISOString();
        this.id = this.generateId();
    }

    /**
     * Validates if this command can be executed
     * @returns {Object} {valid: boolean, error?: string}
     */
    validate() {
        throw new Error("Subclasses must implement validate()");
    }

    /**
     * Executes the command and returns the new game state
     * @returns {GameState} The new game state after execution
     */
    execute() {
        throw new Error("Subclasses must implement execute()");
    }

    /**
     * Undoes the command and returns the previous game state
     * @returns {GameState} The game state before this command
     */
    undo() {
        throw new Error("Subclasses must implement undo()");
    }

    /**
     * Returns a serializable representation of this command
     * @returns {Object}
     */
    serialize() {
        return {
            type: this.constructor.name,
            playerId: this.player.index,
            timestamp: this.timestamp,
            id: this.id
        };
    }

    generateId() {
        return `${this.gameState.id}-${this.player.index}`;
    }
}


//------------------------------------------------------------------------------------------------------------------
class ArmyMoveCommand extends Command {

    constructor(gameState, player, source, destination, count) {
        super(gameState, player);
        this.source = source;
        this.destination = destination;
        this.count = count;
        this.previousState = null;
        this.attackSequence = null;
    }

    validate() {
        const errors = [];

        if (!this.gameState.isOwnedBy(this.source, this.player)) {
            errors.push("You don't own the source region");
        }

        const availableSoldiers = this.gameState.soldierCount(this.source);
        if (this.count > availableSoldiers) {
            errors.push(`Only ${availableSoldiers} soldiers available`);
        }

        const sourceRegion = gameData.regions[this.source];
        if (!sourceRegion.neighbors.includes(this.destination)) {
            errors.push("Destination must be a neighboring region");
        }

        if (this.gameState.conqueredRegions?.includes(this.source)) {
            errors.push("Armies that conquered a region cannot move again this turn");
        }

        if (this.gameState.movesRemaining <= 0) {
            errors.push("No moves remaining");
        }

        return {
            valid: errors.length === 0,
            errors: errors
        };
    }

    execute() {
        // Store state for undo
        this.previousState = this.gameState.copy();

        const newState = this.gameState.copy();

        if (!this.gameState.isOwnedBy(this.destination, this.player)) {
            const generator = new AttackSequenceGenerator({
                source: this.source,
                destination: this.destination,
                count: this.count
            });
            this.attackSequence = generator.createAttackSequenceIfFight(newState);
        }

        this.executeMoveLogic(newState);

        return newState;
    }

    executeMoveLogic(state) {
        const fromList = state.soldiersAtRegion(this.source);
        const toList = state.soldiersAtRegion(this.destination);

        if (this.attackSequence) {
            this.processCombat(state, fromList, toList);
        } else {
            this.transferSoldiers(state, fromList, toList, this.count);
        }

        state.movesRemaining--;
    }

    processCombat(state, fromList, toList) {
        let incomingSoldiers = this.count;
        const numDefenders = toList.length;
        state.undoDisabled = true;

        // Show soldiers moved halfway for animation (if not simulating)
        if (!state.simulatingPlayer) {
            this.showSoldiersMovedHalfway(state, incomingSoldiers, fromList);
        }

        // Process each frame of the attack sequence
        this.attackSequence.forEach(frame => {
            incomingSoldiers = this.showStepInAttackSequence(frame, state, incomingSoldiers, fromList, toList);
        });

        // Check if defenders survived
        if (toList.length > 0) {
            incomingSoldiers = 0; // prevent anybody from moving in
            this.showDefended(state);
        }

        // Reset attack status on remaining soldiers
        this.resetAttackStatus(fromList);

        // Move remaining soldiers if any
        if (incomingSoldiers > 0) {
            this.moveRemainingSoldiers(state, fromList, toList, incomingSoldiers, numDefenders);
        }
    }

    transferSoldiers(state, fromList, toList, soldierCount) {
        // Simple transfer for friendly moves
        if (fromList.length < soldierCount) {
            throw new Error(`Trying to move ${soldierCount} soldiers but only ${fromList.length} available`);
        }

        // Move soldiers from source to destination
        utils.range(0, soldierCount).forEach(() => {
            toList.push(fromList.shift());
        });
    }

    showStepInAttackSequence(frame, state, incomingSoldiers, fromList, toList) {
        if (frame.attackerCasualties) {
            const casualtiesToProcess = Math.min(frame.attackerCasualties, fromList.length);
            if (casualtiesToProcess > 0) {
                fromList.splice(0, casualtiesToProcess);
                incomingSoldiers -= casualtiesToProcess;
            }
        } else if (frame.defenderCasualties) {
            const toOwner = state.owner(this.destination);
            utils.range(0, frame.defenderCasualties).forEach(() => toList.shift());
            if (toOwner && frame.martyrBonus) {
                state.cash[toOwner.index] += frame.martyrBonus;
            }
        }

        this.battleAnimationKeyframe(state, frame.delay, frame.soundCue, frame.floatingText);
        return incomingSoldiers;
    }

    showSoldiersMovedHalfway(state, incomingSoldiers, fromList) {
        // Mark soldiers as attacking for animation
        fromList.slice(0, incomingSoldiers).forEach(soldier => {
            soldier.attackedRegion = this.destination;
        });
        this.battleAnimationKeyframe(state);
    }

    showDefended(state) {
        const toOwner = state.owner(this.destination);
        state.soundCue = CONSTS.SOUNDS.DEFEAT;
        const color = toOwner ? toOwner.highlightStart : '#fff';
        state.floatingText = [{
            regionIdx: this.destination,
            color: color,
            text: "Defended!",
            width: 7
        }];
    }

    resetAttackStatus(fromList) {
        // Reset "attacking status" on soldiers
        fromList.forEach(soldier => {
            delete soldier.attackedRegion;
        });
    }

    moveRemainingSoldiers(state, fromList, toList, incomingSoldiers, numDefenders) {
        const fromOwner = state.owner(this.source);
        const toOwner = state.owner(this.destination);

        if (fromList.length < incomingSoldiers) {
            throw new Error(`Trying to move ${incomingSoldiers} from ${this.source} to ${this.destination} but only ${fromList.length} available`);
        }

        // Move the soldiers
        utils.range(0, incomingSoldiers).forEach(() => {
            toList.push(fromList.shift());
        });

        // If this didn't belong to us before, it does now
        if (fromOwner !== toOwner) {
            this.conquerRegion(fromOwner, toOwner, numDefenders, state);
        }
    }

    conquerRegion(fromOwner, toOwner, numDefenders, state) {
        state.owners[this.destination] = fromOwner.index;

        // Mark as conquered to prevent moves from this region in the same turn
        state.conqueredRegions = (state.conqueredRegions || []).concat(this.destination);

        // If there was a temple, reset its upgrades
        const temple = state.temples[this.destination];
        if (temple) {
            delete temple.upgradeIndex;
        }

        // Add visual and audio effects
        state.particleTempleRegion = gameData.regions[this.destination];
        const color = fromOwner.highlightStart;
        state.floatingText = [{
            regionIdx: this.destination,
            color: color,
            text: "Conquered!",
            width: 7
        }];
        state.soundCue = numDefenders ? CONSTS.SOUNDS.VICTORY : CONSTS.SOUNDS.TAKE_OVER;
    }

    battleAnimationKeyframe(state, delay, soundCue, floatingTexts) {
        // Only add animation keyframes if not on server
        if (this.isOnServer(state)) return;

        const keyframe = state.copy();
        keyframe.soundCue = soundCue;
        keyframe.floatingText = floatingTexts;
        erisk.oneAtaTime(delay || 500, () => erisk.gameRenderer.updateDisplay(keyframe));
    }

    isOnServer(state) {
        return state.simulatingPlayer || !erisk.gameRenderer;
    }

    undo() {
        if (!this.previousState) {
            throw new Error("Cannot undo - no previous state stored");
        }
        return this.previousState;
    }

    serialize() {
        return {
            ...super.serialize(),
            source: this.source,
            destination: this.destination,
            count: this.count,
            attackSequence: this.attackSequence
        };
    }
}

//------------------------------------------------------------------------------------------------------------------
class BuildUpgradeCommand extends Command {

    constructor(gameState, player, regionIndex, buttons) {
        super(gameState, player);
        this.regionIndex = regionIndex;
        this.buttons = buttons;
        //this.upgradeIndex = upgradeIndex;
        this.previousState = null;
    }

    validate() {
        const errors = [];
        const temple = this.gameState.temples[this.regionIndex];
        const upgradeIndex = temple.upgradeIndex || -1;
        const upgrade = CONSTS.UPGRADES[this.upgradeIndex];

        if (!temple) {
            errors.push("No temple at this region");
        }

        if (!this.gameState.isOwnedBy(this.regionIndex, this.player)) {
            errors.push("You don't own this temple");
        }

        const cost = this.calculateCost(upgradeIndex);
        if (this.gameState.cash[this.player.index] < cost) {
            errors.push(`Insufficient faith. Need ${cost}, have ${this.gameState.cash[this.player.index]}`);
        }

        return {
            valid: errors.length === 0,
            errors: errors
        };
    }

    calculateCost(upgradeIndex) {
        if (this.upgradeIndex === -1) {
            return 0;
        }
        const upgrade = CONSTS.UPGRADES[upgradeIndex];
        const temple = this.gameState.temples[this.regionIndex];

        if (upgrade.name === CONSTS.UPGRADES.SOLDIER.name) {
            const numBought = this.gameState.numBoughtSoldiers || 0;
            return upgrade.cost[numBought];
        } else {
            const level = temple.level || 0;
            return upgrade.cost[level];
        }
    }

    execute() {
        this.previousState = this.gameState.copy();
        const newState = this.gameState.copy();

        const upgrade = CONSTS.UPGRADES[this.upgradeIndex];
        const temple = newState.temples[this.regionIndex];
        const upgradeIndex = temple.upgradeIndex || -1;
        const cost = this.calculateCost(upgradeIndex);
        newState.cash[this.player.index] -= cost;

        if (upgrade.name === CONSTS.UPGRADES.SOLDIER.name) {
            // Buy soldier
            newState.numBoughtSoldiers = (newState.numBoughtSoldiers || 0) + 1;
            newState.addSoldiers(this.regionIndex, 1);
        } else if (upgrade.name === CONSTS.UPGRADES.REBUILD.name) {
            // Rebuild temple
            delete temple.upgradeIndex;
            temple.level = 0;
        } else {
            // Upgrade temple
            if (temple.upgradeIndex === upgradeIndex) {
                temple.level++;
            } else {
                temple.upgradeIndex = upgradeIndex;
                temple.level = 0;
            }

            // Air upgrade takes effect immediately
            if (upgrade.name === CONSTS.UPGRADES.AIR.name) {
                newState.movesRemaining++;
            }
        }

        return newState;
    }

    undo() {
        return this.previousState;
    }
}

//------------------------------------------------------------------------------------------------------------------
class EndMoveCommand extends Command {

    constructor(gameState, player) {
        super(gameState, player);
        this.previousState = null;
        this.income = 0;
        this.generatedSoldiers = [];
    }

    validate() {
        const errors = [];

        if (this.gameState.activePlayer().index !== this.player.index) {
            errors.push("Not your turn");
        }

        return {
            valid: errors.length === 0,
            errors: errors
        };
    }

    execute() {
        this.previousState = this.gameState.copy();
        const newState = this.gameState.copy();

        this.income = newState.income(this.player, gameData.aiLevel);
        newState.cash[this.player.index] += this.income;

        this.generateSoldiersAtTemples(newState);

        // Add floating text for income
        if (this.income > 0 && newState.templesForPlayer(this.player).length > 0) {
            newState.floatingText = [{
                regionIdx: newState.templesForPlayer(this.player)[0].regionIndex,
                text: `+${this.income}&#9775;`,
                color: '#fff',
                width: 5
            }];
        }

        this.findNextPlayer(newState);

        if (newState.turnIndex > gameData.turnCount) {
            newState.endResult = this.determineGameWinner(newState);
        }

        return newState;
    }

    generateSoldiersAtTemples(state) {
        utils.forEachProperty(state.temples, (temple) => {
            if (state.isOwnedBy(temple.regionIndex, this.player)) {
                state.addSoldiers(temple.regionIndex, 1);
                this.generatedSoldiers.push(temple.regionIndex);
            }
        });
    }

    findNextPlayer(state) {
        let upcomingPlayer;
        do {
            upcomingPlayer = state.advanceToNextPlayer();
        } while (!state.regionCount(upcomingPlayer));
    }

    determineGameWinner(state) {
        const pointsFn = player => (1000 * state.regionCount(player) + state.totalSoldiers(player));
        const winner = sequenceUtils.max(gameData.players, pointsFn);
        const otherPlayers = gameData.players.filter(player => player !== winner);
        const runnerUp = sequenceUtils.max(otherPlayers, pointsFn);

        return (pointsFn(winner) !== pointsFn(runnerUp)) ? winner : CONSTS.DRAWN_GAME;
    }

    undo() {
        if (!this.previousState) {
            throw new Error("Cannot undo - no previous state stored");
        }
        throw new Error("Undoing EndMoveCommand is not supported.");
    }

    serialize() {
        return {
            ...super.serialize(),
            income: this.income,
            generatedSoldiers: this.generatedSoldiers
        };
    }
}


//------------------------------------------------------------------------------------------------------------------
class ResignationCommand extends Command {

    constructor(gameState, player) {
        super(gameState, player);
        this.previousState = null;
        this.removedRegions = [];
        this.removedSoldiers = {};
    }

    validate() {
        const errors = [];

        if (!this.gameState.regionCount(this.player)) {
            errors.push("Player was already eliminated! You can only resign if you're still in the game");
        }

        if (this.gameState.activePlayer().index !== this.player.index) {
            errors.push("Can only resign during your turn");
        }

        return {
            valid: errors.length === 0,
            errors: errors
        };
    }

    execute() {
        this.previousState = this.gameState.copy();
        const newState = this.gameState.copy();

        // Store what we're removing for undo
        this.storeRemovedAssets(newState);

        // Remove all player's regions
        utils.forEachProperty(newState.owners, (ownerIdx, regionIdx) => {
            if (this.player.index === gameData.players[ownerIdx].index) {
                delete newState.owners[regionIdx];
            }
        });

        // Remove all player's soldiers
        utils.forEachProperty(newState.soldiersByRegion, (soldiers, regionIdx) => {
            if (this.previousState.isOwnedBy(regionIdx, this.player)) {
                delete newState.soldiersByRegion[regionIdx];
            }
        });

        // Clear moves if it's their turn
        if (newState.activePlayer().index === this.player.index) {
            newState.movesRemaining = 0;
            // Advance to next player
            this.findNextPlayer(newState);
        }

        // Mark player as eliminated
        if (!gameData.eliminatedPlayers) {
            gameData.eliminatedPlayers = {};
        }
        gameData.eliminatedPlayers[this.player.index] = true;

        // Check if game should end (only one player left)
        const remainingPlayers = gameData.players.filter(
            player => newState.regionCount(player) > 0
        );

        if (remainingPlayers.length <= 1) {
            newState.endResult = remainingPlayers[0] || CONSTS.DRAWN_GAME;
        }

        return newState;
    }

    storeRemovedAssets(state) {
        this.storeRegionsOwned(state);
        this.storeSoldiers(state);
    }

    storeRegionsOwned(state) {
        utils.forEachProperty(state.owners, (ownerIdx, regionIdx) => {
            if (this.player.index === gameData.players[ownerIdx].index) {
                this.removedRegions.push(regionIdx);
            }
        });
    }

    storeSoldiers(state) {
        this.removedRegions.forEach(regionIdx => {
            const soldiers = state.soldiersByRegion[regionIdx];
            if (soldiers) {
                this.removedSoldiers[regionIdx] = [...soldiers];
            }
        });
    }

    findNextPlayer(state) {
        let upcomingPlayer;
        do {
            upcomingPlayer = state.advanceToNextPlayer();
        } while (!state.regionCount(upcomingPlayer));
    }

    undo() {
        throw new Error("Cannot undo resignation");
    }

    serialize() {
        return {
            ...super.serialize(),
            removedRegions: this.removedRegions,
            removedSoldierCounts: Object.keys(this.removedSoldiers).reduce((acc, key) => {
                acc[key] = this.removedSoldiers[key].length;
                return acc;
            }, {})
        };
    }
}
