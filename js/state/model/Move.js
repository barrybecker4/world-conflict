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
        this.b = [
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

    constructor(turnIndex, playerIndex, movesPerTurn, source, dest, count) {
        super();
        this.t = turnIndex;
        this.p = playerIndex;
        this.l = movesPerTurn;
        this.s = source;
        this.d = dest;
        this.c = count;
    }
    isArmyMove() {
        return true;
    }
}

class BuildMove extends Move {

    constructor(desire, temple, templeRegion, buttons) {
        super();
        this.u = desire;
        this.w = temple;
        this.r = temple.r;
        this.b = buttons;
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

