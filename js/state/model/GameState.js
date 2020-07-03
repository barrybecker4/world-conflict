import gameInitialization from '../../client/gameInitialization.js';
import CONSTS from '../consts/CONSTS.js';
import utils from '../../utils/utils.js';
import sequenceUtils from '../../utils/sequenceUtils.js';
import aiPlay from '../../server/ai/aiPlay.js';
import UPGRADES from '../consts/UPGRADES.js';
import gameData from '../../client/gameData.js';

// global counter for the number of soldiers
var soldierCounter;

export default class GameState {

    constructor(turnIndex, playerIndex, movesRemaining, owners, temples, soldiers, cash,
                simulatingPlayer, floatingText, conqueredRegions) {
        this.turnIndex = turnIndex;
        this.playerIndex = playerIndex;
        this.movesRemaining = movesRemaining;
        this.owners = owners || [];
        this.temples = temples || [];
        this.soldiers = soldiers || [];
        this.cash = cash || {}; // Cash is equal to "faith" in the game
        this.simulatingPlayer = simulatingPlayer;
        this.floatingText = floatingText;
        this.moveDecision = null;
        this.soundCue = null;
        this.undoDisabled = false;
        this.conqueredRegions = conqueredRegions;
    }

    advanceToNextPlayer() {
        const playerCount = gameData.players.length;
        const playerIndex = (this.playerIndex + 1) % playerCount;
        const upcomingPlayer = gameData.players[playerIndex];
        const turnNumber = this.turnIndex + (playerIndex ? 0 : 1);
        const numMoves = CONSTS.BASE_MOVES_PER_TURN + this.upgradeLevel(upcomingPlayer, UPGRADES.AIR);
        this.turnIndex = turnNumber;
        this.playerIndex = playerIndex;
        this.movesRemaining = numMoves;
        this.conqueredRegions = null;
        return upcomingPlayer;
    }

    soldierCount(region) {
        let idx = (typeof region == 'number') ? region : region.index;
        return this.soldiersAtRegion(idx).length;
    }

    income(player) {
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
        if (player.personality && (gameInitialization.gameSetup.aiLevel == CONSTS.AI_EVIL))
            multiplier += 0.4;
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
            soldierCounter = (soldierCounter + 1) || 0;
            var soldierList = self.soldiersAtRegion(regionIndex);
            soldierList.push({ i: soldierCounter++ });
        });
    }

    soldiersAtRegion(regionIndex) {
        return this.soldiers[regionIndex] || (this.soldiers[regionIndex] = []);
    }

    // Some properties are omitted - like 'moveDecision', 'undoDisabled', and 'soundCue'
    copy(simulatingPlayer) {
        return new GameState(
            this.turnIndex,
            this.playerIndex,
            this.movesRemaining,
            utils.deepCopy(this.owners, 1),
            utils.deepCopy(this.temples, 2),
            utils.deepCopy(this.soldiers, 3),
            utils.deepCopy(this.cash, 1),
            this.simulatingPlayer || simulatingPlayer,
            this.floatingText,
            this.conqueredRegions ? utils.deepCopy(this.conqueredRegions, 1) : undefined,
        );
    }
}
