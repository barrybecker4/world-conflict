
// Represents a player's move in a game.
// A player is allowed some number of moves per turn.
class Move {

    constructor() {
        this.buttons = [
            { text: 'Cancel move', hidden: true },
            { text: 'End turn' },
        ];
    }

    // When the move is passed over GAS, the methods are lost, so reconstitute the object with this factory
    static reconstitute(obj) {
        switch (obj.type) {
            case 'army-move':
                if (obj.state) {
                    obj.state = new GameState(obj.state);
                }
                return new ArmyMove(obj);
            case 'build-move':
                return new BuildMove(obj);
            case 'end-move':
                return new EndMove(obj);
            case 'resignation-move':
                return new ResignationMove(obj);
            default: alert("Unexpected move type: " + obj.type);
        }
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
    isResignationMove() {
        return false;
    }
}

class ArmyMove extends Move {

    constructor(obj) {
        super();
        if (obj.source && typeof obj.source !== 'number')
            throw new Error("source not an index: " + obj.source);
        if (obj.destination && typeof obj.destination !== 'number')
            throw new Error("destination not an index: " + obj.destination);

        this.source = obj.source;
        this.destination = obj.destination;
        this.count = obj.count;

        if (obj.attackSequence) { // it may already be there if reconstituting
            this.attackSequence = obj.attackSequence;
        }
        else if (obj.destination >= 0 && obj.state) {
            this.attackSequence =
                new AttackSequenceGenerator(this).createAttackSequenceIfFight(obj.state);
        }
        this.type = 'army-move';
    }

    isArmyMove() {
        return true;
    }

    setDestination(dest, state) {
        if (typeof dest !== 'number')
            throw new Error(`dest=${dest} not a number`);
        this.destination = dest;
        this.attackSequence =
            new AttackSequenceGenerator(this).createAttackSequenceIfFight(state);
    }
}

class BuildMove extends Move {

    constructor(obj) {
        super();
        this.upgradeIndex = obj.upgradeIndex;
        this.regionIndex = obj.regionIndex;
        this.buttons = obj.buttons;
        this.type = 'build-move';
    }
    isBuildMove() {
        return true;
    }
}

class EndMove extends Move {

    constructor(obj) {
        super();
        this.type = 'end-move';
    }
    isEndMove() {
        return true;
    }
}

class ResignationMove extends Move {

    constructor(obj) {
        super();
        this.type = 'resignation-move';
    }
    isResignationMove() {
        return true;
    }
}
