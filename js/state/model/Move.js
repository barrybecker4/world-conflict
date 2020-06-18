export {
    Move,
    ArmyMove,
    BuildMove,
    EndMove,
};

// Represents a player move in a game.
// A player is allowed some number of moves per turn.
class Move {
    constructor() {
        this.buttons = [
            { t: 'Cancel move', h:1 },
            { t: 'End turn' },
        ];
    }

    isBuildMove() {
        return false;
    }
    isArmyMove() {
        return false;
    }
    isEndMove() {
        return false;
    }
}

class ArmyMove extends Move {

    constructor(turnIndex, playerIndex, movesRemaining, source, destination, count) {
        super();
        this.turnIndex = turnIndex;
        this.playerIndex = playerIndex;
        this.movesRemaining = movesRemaining;
        this.source = source;
        this.destination = destination;
        this.count = count;
    }
    isArmyMove() {
        return true;
    }
}

class BuildMove extends Move {

    constructor(desiredUpgrade, temple, buttons) {
        super();
        this.upgrade = desiredUpgrade;
        this.temple = temple;
        this.region = temple.region;
        this.buttons = buttons;
    }
    isBuildMove() {
        return true;
    }
}

class EndMove extends Move {

    isEndMove() {
        return true;
    }
}

