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
            { text: 'Cancel move', hidden: true },
            { text: 'End turn' },
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

    constructor(source, destination, count) {
        super();
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
        this.regionIndex = temple.regionIndex;
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

