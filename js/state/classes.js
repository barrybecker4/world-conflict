
// global counter for the number of soldiers
var soldierId = 0;
var stateId = 0;


class Player {

    // params: index, name, colorStart, colorEnd, highlightStart, highlightEnd
    constructor(obj) {
        this.index = obj.index;
        this.name = obj.name;
        this.colorStart = obj.colorStart;
        this.colorEnd = obj.colorEnd;
        this.highlightStart = obj.highlightStart;
        this.highlightEnd = obj.highlightEnd;
        this.personality = null;
    }
}

class Upgrade {

    // params: name, desc, cost, level, backgroundColor
    constructor(obj) {
        this.name = obj.name;
        this.desc = obj.desc;
        this.cost = obj.cost;
        this.level = obj.level;
        this.bgColor = obj.backgroundColor;
    }
}


class Temple {

    // params: regionIndex, upgrade, level, element
    constructor(obj) {
        this.regionIndex = obj.regionIndex;
        this.upgrade = obj.upgrade;
        this.level = obj.level;
        this.element = obj.element;
    }
}


// Describes the behavior of an AI
class AiPersonality {

    /**
     * @param soldierEagerness how eagerly it builds soldiers
     * @param preferredUpgrades an array of which upgrades it prefers (if any)
     */
    constructor(obj) {
        this.soldierEagerness = obj.soldierEagerness;
        this.preferredUpgrades = obj.preferredUpgrades;
    }

    // If we don't want more upgrades, our preference becomes 1.
    getSoldierEagerness() {
        return this.preferredUpgrades.length ? this.soldierEagerness : 1;
    }

    copy() {
        return new AiPersonality({
            soldierEagerness: this.soldierEagerness,
            preferredUpgrades: this.preferredUpgrades.slice(),
        });
    }
}


class GameState {

    // The simulatingPlayer is used during min/max search so we do not show the computer thinking.
    constructor(obj) {
        this.turnIndex = obj.turnIndex;
        this.playerIndex = obj.playerIndex;
        this.movesRemaining = obj.movesRemaining;
        this.owners = obj.owners || [];
        this.temples = obj.temples || [];
        this.soldiersByRegion = obj.soldiersByRegion || [];
        this.cash = obj.cash || {}; // Cash is equal to "faith" in the game
        this.simulatingPlayer = obj.simulatingPlayer;
        this.floatingText = obj.floatingText;
        this.moveDecision = null;
        this.soundCue = null;
        this.undoDisabled = false;
        this.numBoughtSoldiers = obj.numBoughtSoldiers;
        this.prevPlayerIndex = obj.prevPlayerIndex;
        this.conqueredRegions = obj.conqueredRegions;
        this.id = obj.stateId || stateId++;
    }

    advanceToNextPlayer() {
        const playerCount = gameData.players.length;
        const playerIndex = (this.playerIndex + 1) % playerCount;
        const upcomingPlayer = gameData.players[playerIndex];
        const turnNumber = this.turnIndex + (playerIndex ? 0 : 1);
        const numMoves = CONSTS.BASE_MOVES_PER_TURN + this.upgradeLevel(upcomingPlayer, UPGRADES.AIR);
        this.turnIndex = turnNumber;
        this.prevPlayerIndex = this.playerIndex;
        this.playerIndex = playerIndex;
        this.movesRemaining = numMoves;
        this.conqueredRegions = null;
        this.numBoughtSoldiers = null;
        return upcomingPlayer;
    }

    soldierCount(region) {
        let idx = (typeof region == 'number') ? region : region.index;
        return this.soldiersAtRegion(idx).length;
    }

    income(player, aiLevel) {
        // no income with no temples
        var playerTemples = this.templesForPlayer(player);
        if (!playerTemples.length) return 0;

        // 1 faith per region
        var fromRegions = this.regionCount(player);

        // 1 faith per each soldier at a temple
        const self = this;
        var fromTemples = sequenceUtils.sum(playerTemples, function(temple) {
            return self.soldierCount(temple.regionIndex);
        });
        var multiplier = 1.0 + 0.01 * this.upgradeLevel(player, UPGRADES.WATER);
        if (player.personality && (aiLevel == CONSTS.AI_EVIL))
            multiplier += 0.4; // cheating - cause its evil...
        return Math.ceil(multiplier * (fromRegions + fromTemples));
    }

    regionHasActiveArmy(player, region) {
        let regionIdx = (typeof region == 'number') ? region : region.index;
        return (this.movesRemaining > 0) &&
            (this.owner(regionIdx) == player) && this.soldierCount(regionIdx) &&
            !sequenceUtils.contains(this.conqueredRegions, regionIdx);
    }

    regionCount(player) {
        var total = 0;
        const self = this;
        gameData.regions.map(region => {
            if (self.owner(region) == player)
                total++;
        });
        return total;
    }

    templesForPlayer(player) {
        var playerTemples = [];
        let self = this;
        utils.forEachProperty(this.temples, function(temple, regionIndex) {
            if (self.owner(regionIndex) == player)
                playerTemples.push(temple);
        });
        return playerTemples;
    }

    activePlayer() {
        return gameData.players[this.playerIndex];
    }

    prevPlayer() {
       return this.prevPlayerIndex ? gameData.players[this.prevPlayerIndex] : null;
    }

    owner(region) {
        let idx = (typeof region == 'number') ? region : region.index;
        return gameData.players[this.owners[idx]];
    }

    cashForPlayer(player) {
        return this.cash[player.index];
    }

    rawUpgradeLevel(player, upgradeType) {
        return sequenceUtils.max(this.templesForPlayer(player).map(function(temple) {
            if (temple.upgrade && temple.upgrade == upgradeType)
                return temple.level + 1;
            else
                return 0;
        }).concat(0));
    }

    upgradeLevel(player, upgradeType) {
        if (!player) {
            // neutral forces always have upgrade level 0;
            return 0;
        }

        let self = this;
        return sequenceUtils.max(gameData.regions.map(function(region) {
            // does it have a temple?
            var temple = self.temples[region.index];
            if (!temple) return 0;
            // does it belong to us?
            if (self.owner(region) != player) return 0;
            // does it have the right type of upgrade?
            return (temple.upgrade == upgradeType) ? upgradeType.level[temple.level] : 0;
        }));
    }

    totalSoldiers(player) {
        let self = this;
        return sequenceUtils.sum(gameData.regions, function(region) {
            return (self.owner(region.index) == player) ? self.soldierCount(region.index) : 0;
        });
    }

    soldierCost() {
        return UPGRADES.SOLDIER.cost[this.numBoughtSoldiers || 0];
    }

    templeInfo(temple) {
        if (!temple.upgrade) {
            var name = this.owner(temple.regionIndex) ? "Basic Temple" : "Neutral Temple";
            return { name, description: "No upgrades" };
        } else {
            let upgrade = temple.upgrade;
            let level = temple.level;
            let description = utils.template(upgrade.desc, upgrade.level[level]);
            return {name: utils.template(upgrade.name, CONSTS.LEVELS[level]), description};
        }
    }

    addSoldiers(regionIndex, count) {
        const self = this;
        utils.range(0, count).map(function() {
            var soldierList = self.soldiersAtRegion(regionIndex);
            soldierList.push({ i: soldierId++ });
        });
    }

    soldiersAtRegion(regionIndex) {
        return this.soldiersByRegion[regionIndex] || (this.soldiersByRegion[regionIndex] = []);
    }

    // Some properties are omitted - like 'moveDecision', 'undoDisabled', and 'soundCue'
    copy(simulatingPlayer) {
        return new GameState({
            turnIndex: this.turnIndex,
            playerIndex: this.playerIndex,
            movesRemaining: this.movesRemaining,
            owners: utils.deepCopy(this.owners, 1),
            temples: utils.deepCopy(this.temples, 2),
            soldiersByRegion: utils.deepCopy(this.soldiersByRegion, 3),
            cash: utils.deepCopy(this.cash, 1),
            simulatingPlayer: this.simulatingPlayer || simulatingPlayer,
            floatingText: this.floatingText,
            numBoughtSoldiers: this.numBoughtSoldiers,
            conqueredRegions: this.conqueredRegions ? utils.deepCopy(this.conqueredRegions, 1) : undefined,
        });
    }
}


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

    // params: state, source, destination, count
    constructor(obj) {
        super();
        if (obj.source && typeof obj.source !== 'number')
            throw new Error("source not an index: " + obj.source);
        if (obj.destination && typeof obj.destination !== 'number')
            throw new Error("destination not an index: " + obj.destination);

        this.source = obj.source;
        this.destination = obj.destination;
        this.count = obj.count;
        if (obj.destination) {
            this.attackSequence = this.createAttackSequenceIfFight(obj.state);
        }
    }

    isArmyMove() {
        return true;
    }

    setDestination(dest, state) {
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
            // Jakub says that this should be fromOwner, but I believe that toOwner is correct.
            // See https://github.com/krajzeg/compact-conflict/issues/3
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

    // desiredUpgrade, temple, buttons
    constructor(obj) {
        super();
        this.upgrade = obj.desiredUpgrade;
        this.temple = obj.temple;
        this.regionIndex = obj.temple.regionIndex;
        this.buttons = obj.buttons;
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


class Region {

    /**
     * @param index region index
     * @param points array of points that define the region's border
     * @param distanceTo (optional) array of distances to other regions
     * @param neighbors (optional) an array of neighboring regions (by region index)
     */
    constructor(obj) {
        this.index = obj.index;
        this.points = obj.points;
        this.distanceTo = obj.distanceTo ? obj.distanceTo : [];
        this.neighbors = obj.neighbors ? obj.neighbors : [];
        this.center = null;
        this.element = null;
    }

    // regionArray is optional. Needed only if we don't have the map yet.
    distanceFrom(regionB, regions) {
        return Region.distance(this, regionB, regions);
    }

    centerDistanceFrom(regionB) {
        return Math.abs(this.center[0] - regionB.center[0]) + Math.abs(this.center[1] - regionB.center[1]);
    }

    // Use breadth-first search and memoization to find distance from this (regionA) to some other regionB.
    static distance(regionA, regionB, regions) {
        let queue = [{region: regionA, distance: 0}];
        let visited = [regionA];
        let answer = -1;
        let bound = 100;

        while (answer < 0) {
            let item = queue.shift();
            let region = item.region;
            let distanceFromA = item.distance;
            if (region == regionB) {
                // we've found the region!
                answer = distanceFromA;
            }
            else if (distanceFromA >= bound) {
                // we've reached our established upper bound - return it
                answer = bound;
            }
            else {
                // use memoized values to establish an upper bound (we still might do better, but we can't do worse)
                if (region.distanceTo[regionB.index])
                    bound = sequenceUtils.min([bound, region.distanceTo[regionB.index] + distanceFromA]);

                // look in all unvisited neighbors
                region.neighbors.map(function (neighborIdx) {
                    let neighbor = regions[neighborIdx];
                    if (!sequenceUtils.contains(visited, neighbor)) {
                        queue.push({region: neighbor, distance: distanceFromA + 1});
                    }
                });
                visited.push(region);
            }
        }

        // memoize result for later and return
        regionA.distanceTo[regionB.index] = answer;
        regionB.distanceTo[regionA.index] = answer;
        return answer;
    }
}
