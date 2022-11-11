const WIN_THRESHOLD = 120;

// Represents a player's move in a game.
// A player is allowed some number of moves per turn.
class AttackSequenceGenerator {

    constructor(armyMove) {
       this.fromRegion = armyMove.source;
       this.toRegion = armyMove.destination;
       this.soldiers = armyMove.count;
    }

    /**
     * Private - do not call from outside (no way to enforce in ES6)
     * Adds the attackSequence property if there is a fight.
     * This must be added on server, and not done on client, because it has non-determinism.
     * If there is fight, produce a sequence of troop reductions that can be sent back to the client and shown later.
     */
    createAttackSequenceIfFight(origState) {
        this.state = origState.copy();
        this.incomingSoldiers = this.soldiers;
        this.fromList = this.state.soldiersAtRegion(this.fromRegion);
        this.toList = this.state.soldiersAtRegion(this.toRegion);
        this.fromOwner = this.state.owner(this.fromRegion);
        this.toOwner = this.state.owner(this.toRegion);

        if (this.fromOwner === this.toOwner) {
            return undefined; // no fight needed
        }

        let defendingSoldiers = this.toList.length;
        let attackSequence = undefined;

        // earth upgrade - preemptive damage on defense. Auto kills the first "level" incoming solders.
        const preemptiveDamage = sequenceUtils.min([this.incomingSoldiers, this.state.upgradeLevel(this.toOwner, CONSTS.UPGRADES.EARTH)]);

        if (preemptiveDamage || defendingSoldiers) {
            attackSequence = [];
            if (preemptiveDamage) {
                this.recordPreemptiveDamage(preemptiveDamage, attackSequence);
            }
        }

        // if there is still defense and offense, let's record a fight
        if (defendingSoldiers && this.incomingSoldiers) {

            this.recordFight(defendingSoldiers, attackSequence);

            // are there defenders left?
            if (this.toList.length) {
                this.state.soundCue = CONSTS.SOUNDS.DEFEAT;
                const color = this.toOwner ? this.toOwner.highlightStart : '#fff';
                this.state.floatingText = [{ regionIdx: this.toRegion, color, text: "Defended!", width: 7 }];
            }
        }

        return attackSequence;
    }

    recordPreemptiveDamage(preemptiveDamage, attackSequence) {
        attackSequence.push({
            soundCue: CONSTS.SOUNDS.OURS_DEAD,
            delay: 50,
            floatingText: [{
                regionIdx: this.toRegion,
                text: "Earth kills " + preemptiveDamage + "!",
                color: CONSTS.UPGRADES.EARTH.bgColor,
                width: 9
            }]
        });
        utils.range(0, preemptiveDamage).map(() => {
            this.fromList.shift();
            this.incomingSoldiers--;
        });
        attackSequence.push({
            attackerCasualties: preemptiveDamage,
        });
    }

    recordFight(defendingSoldiers, attackSequence) {
        const incomingStrength = this.incomingSoldiers * (1 + this.state.upgradeLevel(this.fromOwner, CONSTS.UPGRADES.FIRE) * 0.01);
        const defendingStrength = defendingSoldiers * (1 + this.state.upgradeLevel(this.toOwner, CONSTS.UPGRADES.EARTH) * 0.01);

        const repeats = sequenceUtils.min([this.incomingSoldiers, defendingSoldiers]);

        // This will be a number in a range like [0.01, 1000] depending on the ratio of incoming to defending
        const attackerWinChance = 100 * Math.pow(incomingStrength / defendingStrength, 1.6);

        let invincibility = this.state.upgradeLevel(this.fromOwner, CONSTS.UPGRADES.FIRE);

        utils.range(0, repeats).map(index => {
            const rndNum = this.randomNumberForFight(index, attackerWinChance, repeats);
            if (rndNum <= WIN_THRESHOLD) {
                // defender wins!
                if (invincibility-- <= 0) {
                    this.fromList.shift();
                    this.incomingSoldiers--;
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
                            regionIdx: this.fromRegion,
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
                this.toList.shift();
            }
        });
    }

    // A high random number means the attacker is more likely to win the skirmish
    randomNumberForFight(index, attackerWinChance, repeats) {
        var maximum = WIN_THRESHOLD + attackerWinChance;
        if (this.state.simulatingPlayer) {
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
}
