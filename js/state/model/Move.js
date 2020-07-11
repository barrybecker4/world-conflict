import utils from '../../utils/utils.js';
import sequenceUtils from '../../utils/sequenceUtils.js';
import CONSTS from '../CONSTS.js';
import SOUNDS from '../consts/SOUNDS.js';
const { UPGRADES } = CONSTS;

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

    constructor(state, source, destination, count) {
        super();
        if (source && typeof source !== 'number') throw new Error("source not an index: " + source);
        if (destination && typeof destination !== 'number') throw new Error("destination not an index: " + destination);
        this.source = source;
        this.destination = destination;
        this.count = count;
        if (destination)
            this.attackSequence = this.createAttackSequenceIfFight(state);
    }

    isArmyMove() {
        return true;
    }

    setDestination(dest, state) {
        this.destination = dest;
        this.attackSequence = this.createAttackSequenceIfFight(state);
    }

    // Private - do not call from outside (no way to enforce in ES6)
    // adds the attackSequence property if there is a fight.
    // This must be added here, and not done on client, because it has non-determinism.
    // If there is fight, produce a sequence of troop reductions that can be sent back to the client and shown later.
    createAttackSequenceIfFight(origState) {
        const state = origState.copy();
        const fromRegion = this.source;
        const toRegion = this.destination;
        let incomingSoldiers = this.count;
        const fromList = state.soldiersAtRegion(fromRegion);
        const toList = state.soldiersAtRegion(toRegion);

        const fromOwner = state.owner(fromRegion);
        const toOwner = state.owner(toRegion);

        if (fromOwner == toOwner) {
            return null; // no fight needed
        }

        let defendingSoldiers = toList.length;
        let attackSequence = null;

        // earth upgrade - preemptive damage on defense. Auto kills the first "level" incoming solders.
        var preemptiveDamage = sequenceUtils.min([incomingSoldiers, state.upgradeLevel(toOwner, UPGRADES.EARTH)]);

        if (preemptiveDamage || defendingSoldiers) {
            attackSequence = [];
        }

        if (preemptiveDamage) {
            attackSequence.push({
                soundCue: SOUNDS.OURS_DEAD,
                delay: 50,
                floatingText: [{
                    soldier: fromList[0],
                    text: "Earth kills " + preemptiveDamage + "!",
                    color: UPGRADES.EARTH.bgColor,
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
                state.soundCue = SOUNDS.DEFEAT;
                const color = toOwner ? toOwner.highlightStart : '#fff';
                state.floatingText = [{ regionIdx: toRegion, color, text: "Defended!", width: 7 }];
            }
        }

        return attackSequence;


        function recordFight() {
            const incomingStrength = incomingSoldiers * (1 + state.upgradeLevel(fromOwner, UPGRADES.FIRE) * 0.01);
            const defendingStrength = defendingSoldiers * (1 + state.upgradeLevel(toOwner, UPGRADES.EARTH) * 0.01);

            const repeats = sequenceUtils.min([incomingSoldiers, defendingSoldiers]);
            const attackerWinChance = 100 * Math.pow(incomingStrength / defendingStrength, 1.6);
            let invincibility = state.upgradeLevel(toOwner, UPGRADES.FIRE);

            function randomNumberForFight(index) {
                var maximum = 120 + attackerWinChance;
                if (state.simulatingPlayer) {
                    // Simulated fight - return some numbers that exaggerate any advantage/
                    // They're clustered about the center of the range to make the AI more "decisive"
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
                            soundCue: SOUNDS.OURS_DEAD,
                            delay: 250,
                        });
                    } else {
                        attackSequence.push({
                            soundCue: SOUNDS.OURS_DEAD,
                            delay: 800,
                            floatingText: [{
                                soldier: fromList[0],
                                text: "Protected by Fire!",
                                color: UPGRADES.FIRE.bgColor,
                                width: 11
                            }],
                        });
                    }
                } else {
                    // attacker wins, kill defender and pay the martyr bonus
                    attackSequence.push({
                        defenderCasualties: 1,
                        soundCue: SOUNDS.ENEMY_DEAD,
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

