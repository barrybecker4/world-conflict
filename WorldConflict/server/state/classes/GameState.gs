
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

    /**
     * @return an object containing
     *  {nextHumanPlayer: <player>, numSkippedAIs: <number of AIs> } or null if none.
     * Where nextHumanPlayer is the next non-eliminated human player after the specified player,
     * and numSkippedAIs is the number of AIs after the specified player, but before nextHumanPlayer (0, 1, or 2).
     * It's possible that there could be no next human player, if there is only one human playing.
     * In that case, that player is returned is returned.
     */
    getHumanPlayerAfter(player) {
        const next = { humanPlayer: null, numSkippedAIs: 0 };
        const playerCount = gameData.players.length;
        let idx = (player.index + 1) % playerCount;
        next.player = gameData.players[idx];
        if (!player.personality && gameData.remainingHumanPlayers() === 1) {
            console.log("No other human players other than the current player: " + player)
            next.humanPlayer = player;
            return next;
        }
        while (next.player.personality || gameData.eliminatedPlayers[idx]) {
            if (next.player.personality) {
                next.numSkippedAIs += 1;
            }
            idx = (idx + 1) % playerCount;
            next.player = gameData.players[idx];
            if (idx === player.index) {
                console.log("No other human player found after " + player.name);
                return null;
            }
        }
        if (next.player.name === player.name) {
             throw new Error("Player and human player after that were unexpectedly both " + player.name);
        }
        next.humanPlayer = next.player;
        return next;
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
