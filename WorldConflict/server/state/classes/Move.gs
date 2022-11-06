
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
            this.attackSequence = this.createAttackSequenceIfFight(obj.state);
        }
        this.type = 'army-move';
    }

    isArmyMove() {
        return true;
    }

    setDestination(dest, state) {
        if (typeof dest !== 'number') throw new Error(`dest=${dest} not a number`);
        this.destination = dest;
        this.attackSequence = this.createAttackSequenceIfFight(state);
    }

    /**
     * Private - do not call from outside (no way to enforce in ES6)
     * Adds the attackSequence property if there is a fight.
     * This must be added on server, and not done on client, because it has non-determinism.
     * If there is fight, produce a sequence of troop reductions that can be sent back to the client and shown later.
     */
    createAttackSequenceIfFight(origState) {
        const state = origState.copy();
        const fromRegion = this.source;
        const toRegion = this.destination;
        let incomingSoldiers = this.count;
        const fromList = state.soldiersAtRegion(fromRegion);
        const toList = state.soldiersAtRegion(toRegion);

        const fromOwner = state.owner(fromRegion);
        const toOwner = state.owner(toRegion);

        if (fromOwner === toOwner) {
            return undefined; // no fight needed
        }

        let defendingSoldiers = toList.length;
        let attackSequence = undefined;

        // earth upgrade - preemptive damage on defense. Auto kills the first "level" incoming solders.
        const preemptiveDamage = sequenceUtils.min([incomingSoldiers, state.upgradeLevel(toOwner, CONSTS.UPGRADES.EARTH)]);

        if (preemptiveDamage || defendingSoldiers) {
            attackSequence = [];
        }

        if (preemptiveDamage) {
            attackSequence.push({
                soundCue: CONSTS.SOUNDS.OURS_DEAD,
                delay: 50,
                floatingText: [{
                    regionIdx: toRegion,
                    text: "Earth kills " + preemptiveDamage + "!",
                    color: CONSTS.UPGRADES.EARTH.bgColor,
                    width: 9
                }]
            });
            utils.range(0, preemptiveDamage).map(function () {
                fromList.shift();
                incomingSoldiers--;
            });
            attackSequence.push({
                attackerCasualties: preemptiveDamage,
            });
        }

        // if there is still defense and offense, let's record a fight
        if (defendingSoldiers && incomingSoldiers) {

            recordFight();

            // are there defenders left?
            if (toList.length) {
                state.soundCue = CONSTS.SOUNDS.DEFEAT;
                const color = toOwner ? toOwner.highlightStart : '#fff';
                state.floatingText = [{ regionIdx: toRegion, color, text: "Defended!", width: 7 }];
            }
        }

        return attackSequence;


        function recordFight() {
            const incomingStrength = incomingSoldiers * (1 + state.upgradeLevel(fromOwner, CONSTS.UPGRADES.FIRE) * 0.01);
            const defendingStrength = defendingSoldiers * (1 + state.upgradeLevel(toOwner, CONSTS.UPGRADES.EARTH) * 0.01);

            const repeats = sequenceUtils.min([incomingSoldiers, defendingSoldiers]);

            // This will be a number in a range like [0.01, 1000] depending on the ratio of incoming to defending
            const attackerWinChance = 100 * Math.pow(incomingStrength / defendingStrength, 1.6);

            let invincibility = state.upgradeLevel(fromOwner, CONSTS.UPGRADES.FIRE);

            // A high random number means the attacker is more likely to win the skirmish
            function randomNumberForFight(index) {
                var maximum = 120 + attackerWinChance;
                if (state.simulatingPlayer) {
                    // Simulated fight - return some numbers that exaggerates any advantage.
                    // They're clustered about the center of the range to make the AI more "decisive".
                    return (index + 3) * maximum / (repeats + 5);
                } else {
                    // Not a simulated fight - return a real random number.
                    // We're not using the full range 0 to maximum to make sure that randomness doesn't
                    // give a feel-bad experience when we attack with a giant advantage.
                    return utils.rint(maximum * 0.12, maximum * 0.88);
                }
            }

            utils.range(0, repeats).map(function(index) {
                if (randomNumberForFight(index) <= 120) {
                    // defender wins!
                    if (invincibility-- <= 0) {
                        fromList.shift();
                        incomingSoldiers--;
                        attackSequence.push({
                            attackerCasualties: 1,
                            soundCue: CONSTS.SOUNDS.OURS_DEAD,
                            delay: 250,
                        });
                    } else {
                        attackSequence.push({
                            soundCue: CONSTS.SOUNDS.OURS_DEAD,
                            delay: 800,
                            floatingText: [{
                                regionIdx: fromRegion,
                                text: "Protected by Fire!",
                                color: CONSTS.UPGRADES.FIRE.bgColor,
                                width: 11
                            }],
                        });
                    }
                } else {
                    // attacker wins, kill defender and pay the martyr bonus
                    attackSequence.push({
                        defenderCasualties: 1,
                        soundCue: CONSTS.SOUNDS.ENEMY_DEAD,
                        delay: 250,
                        martyrBonus: CONSTS.MARTYR_BONUS,
                    });
                    toList.shift();
                }
            });
        }
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
