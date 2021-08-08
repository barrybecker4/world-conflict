
class Player {
    constructor(obj) {
        this.index = obj.index;
        this.originalIndex = obj.originalIndex || obj.index; // index into setup.playerTypes
        this.type = obj.type;
        this.name = obj.name;
        this.defaultName = obj.defaultName;
        this.colorStart = obj.colorStart;
        this.colorEnd = obj.colorEnd;
        this.highlightStart = obj.highlightStart;
        this.highlightEnd = obj.highlightEnd;
        this.personality = obj.personality;
    }

    getName() {
        const textName = this.getTextName();
        return textName === CONSTS.OPEN_LABEL ? '<span style="color: #ccc;"><i>' + textName + '</i></span>' : textName;
    }

    getTextName() {
        // this is a hack. should find better way. Use type if it exists, else fall back to what is in storage
        const pType = (typeof this.type === 'string') ? this.type : storage.gameSetup.playerTypes[this.originalIndex];
        switch(pType) {
            case CONSTS.PLAYER_OFF:
                return '&nbsp;';
            case CONSTS.PLAYER_HUMAN_SET:
                return getTrimmedName(this.name || domUtils.userid());
            case CONSTS.PLAYER_HUMAN_OPEN:
                return CONSTS.OPEN_LABEL;
            default: return this.defaultName;
        }
        function getTrimmedName(name) {
            return (name.length > 16) ? name.substring(0, 15) + '&#8230;' : name;
        }
    }
}

class Upgrade {
    constructor(obj) {
        this.name = obj.name;
        this.desc = obj.desc;
        this.cost = obj.cost;
        this.level = obj.level;
        this.bgColor = obj.bgColor;
        this.index = obj.index;
    }
}

class Temple {
    constructor(obj) {
        this.regionIndex = obj.regionIndex;
        this.upgradeIndex = obj.upgradeIndex;
        this.level = obj.level;
        this.elementId = obj.elementId;
    }
}


// Describes the behavior of an AI
class AiPersonality {

    /**
     * soldierEagerness - how eagerly it builds soldiers
     * preferredUpgrades - an array of which upgrades it prefers (if any)
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
            preferredUpgrades: this.preferredUpgrades,
        });
    }
}


class GameState {

    // The simulatingPlayer is used during min/max search so we do not show the computer thinking.
    // Also stored, but not part of constructor: moveDecision, soundCue
    constructor(obj) {
        this.turnIndex = obj.turnIndex;
        this.playerIndex = obj.playerIndex;
        this.movesRemaining = obj.movesRemaining;
        this.owners = obj.owners || {};
        this.temples = obj.temples || {};
        this.soldiersByRegion = obj.soldiersByRegion || {};
        this.cash = obj.cash || {}; // Cash is equal to "faith" in the game
        this.simulatingPlayer = obj.simulatingPlayer;
        this.floatingText = obj.floatingText;
        this.undoDisabled = false;
        this.numBoughtSoldiers = obj.numBoughtSoldiers;
        this.conqueredRegions = obj.conqueredRegions;
        this.id = obj.id || 1;
        this.gameId = obj.gameId;
    }

    advanceToNextPlayer() {
        const playerIndex = this.getNextPlayerIndex();
        const upcomingPlayer = gameData.players[playerIndex];
        const turnNumber = this.turnIndex + (playerIndex ? 0 : 1);
        const numMoves = CONSTS.BASE_MOVES_PER_TURN + this.upgradeLevel(upcomingPlayer, CONSTS.UPGRADES.AIR);
        this.turnIndex = turnNumber;
        this.playerIndex = playerIndex;
        this.movesRemaining = numMoves;
        this.conqueredRegions = undefined;
        this.numBoughtSoldiers = undefined;
        return upcomingPlayer;
    }

    getNextPlayer() {
        return gameData.players[this.getNextPlayerIndex()];
    }

    getNextPlayerIndex() {
        const playerCount = gameData.players.length;
        return (this.playerIndex + 1) % playerCount;
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
        const fromTemples = sequenceUtils.sum(playerTemples, function(temple) {
            return self.soldierCount(temple.regionIndex);
        });
        let multiplier = 1.0 + 0.01 * this.upgradeLevel(player, CONSTS.UPGRADES.WATER);
        if (player.personality && (aiLevel === CONSTS.AI_EVIL))
            multiplier += 0.4; // cheating - cause its evil...
        return Math.ceil(multiplier * (fromRegions + fromTemples));
    }

    regionHasActiveArmy(player, region) {
        let regionIdx = (typeof region == 'number') ? region : region.index;
        return (this.movesRemaining > 0) &&
            this.isOwnedBy(regionIdx, player) && this.soldierCount(regionIdx) &&
            !sequenceUtils.contains(this.conqueredRegions, regionIdx);
    }

    regionCount(player) {
        let total = 0;
        gameData.regions.map(region => {
            if (this.isOwnedBy(region, player))
                total++;
        });
        return total;
    }

    templesForPlayer(player) {
        const playerTemples = [];
        utils.forEachProperty(this.temples, temple => {
            if (this.isOwnedBy(temple.regionIndex, player))
                playerTemples.push(temple);
        });
        return playerTemples;
    }

    templeForRegion(region) {
        const regionIdx = (typeof region == 'number') ? region : region.index;
        return this.temples[regionIdx];
    }

    activePlayer() {
        return gameData.players[this.playerIndex];
    }

    owner(region) {
        const idx = (typeof region === 'number') ? region : region.index;
        return gameData.players[this.owners[idx]];
    }

    isOwnedBy(region, player) {
        const owner = this.owner(region);
        return owner && owner.index === player.index;
    }

    cashForPlayer(player) {
        return this.cash[player.index];
    }

    /** @return the current upgrade level for specified player and upgradeType */
    rawUpgradeLevel(player, upgradeType) {
        return sequenceUtils.max(this.templesForPlayer(player).map(function(temple) {
            if (temple.upgradeIndex && CONSTS.UPGRADES[temple.upgradeIndex].name === upgradeType.name)
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

        return sequenceUtils.max(gameData.regions.map(region => {
            const temple = this.temples[region.index];

            if (temple && this.isOwnedBy(region, player)) {
                // return the level if its the right type of upgrade
                return (temple.upgradeIndex && CONSTS.UPGRADES[temple.upgradeIndex].name == upgradeType.name) ?
                                upgradeType.level[temple.level] : 0;
            }
            return 0;
        }));
    }

    totalSoldiers(player) {
        return sequenceUtils.sum(gameData.regions, region => {
            return this.isOwnedBy(region, player) ? this.soldierCount(region.index) : 0;
        });
    }

    soldierCost() {
        return CONSTS.UPGRADES.SOLDIER.cost[this.numBoughtSoldiers || 0];
    }

    templeInfo(temple) {
        if (!temple.upgradeIndex) {
            const name = this.owner(temple.regionIndex) ? "Basic Temple" : "Neutral Temple";
            return { name, description: "No upgrades" };
        } else {
            let upgrade = CONSTS.UPGRADES[temple.upgradeIndex];
            let level = temple.level;
            let description = utils.template(upgrade.desc, upgrade.level[level]);
            return {name: utils.template(upgrade.name, CONSTS.TEMPLE_LEVELS[level]), description};
        }
    }

    addSoldiers(regionIndex, count) {
        const self = this;
        const soldierList = self.soldiersAtRegion(regionIndex);
        utils.range(0, count).map(function() {
            const soldierId = utils.rint(1, 1000000000000000);    // slight chance of duplicates?
            soldierList.push({ i: soldierId });   // can't use counter if generated in multiple places
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
            // the id will be monotonically increasing, but not necessarily sequential
            id: this.id + 1,
            gameId: this.gameId,
        });
    }
}


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


class Region {

    /**
     * Also stored, but not part of constructor - center and elementId
     * @param obj containing
     *   index - region index
     *   points - array of points that define the region's border
     *   distanceTo - (optional) array of distances to other regions
     *   neighbors (optional) an array of neighboring regions (by region index)
     */
    constructor(obj) {
        this.index = obj.index;
        this.points = obj.points;
        this.distanceTo = obj.distanceTo ? obj.distanceTo : [];
        this.neighbors = obj.neighbors ? obj.neighbors : [];
        this.center = obj.center;
    }

    // regionArray is optional. Needed only if we don't have the map yet.
    distanceFrom(regionB, regions) {
        return Region.distance(this, regionB, regions);
    }

    centerDistanceFrom(regionB) {
        return Math.abs(this.center.x - regionB.center.x) + Math.abs(this.center.y - regionB.center.y);
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
            if (region === regionB) {
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
