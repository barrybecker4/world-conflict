import gameInitialization from '../../client/gameInitialization.js';
import gameData from '../gameData.js';
import utils from '../../utils/utils.js';
import sequenceUtils from '../../utils/sequenceUtils.js';
import aiPlay from '../../server/ai/aiPlay.js';
import UPGRADES from './UPGRADES.js';

// global counter for the number of soldiers
var soldierCounter;

export default class GameState {

    constructor(players, regions, owners, temples, soldiers, cash, levels, move, simulatingPlayer, floatingText) {
        this.players = players;
        this.regions = regions;
        this.owners = owners;
        this.temples = temples;
        this.soldiers = soldiers;
        this.cash = cash; // Cash is equal to "faith" in the game
        this.levels = levels;
        this.move = move;
        this.simulatingPlayer = simulatingPlayer;
        this.floatingText = floatingText;
        this.moveDecision = null;
        this.soundCue = null;
        this.undoDisabled = false;
    }

    soldierCount(region) {
        return this.soldiersAtRegion(region.index).length;
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
            return self.soldierCount(temple.region);
        });
        var multiplier = 1.0 + 0.01 * this.upgradeLevel(player, UPGRADES.WATER);
        if ((player.pickMove == aiPlay.aiPickMove) && (gameInitialization.gameSetup.aiLevel == gameData.AI_EVIL))
            multiplier += 0.4;
        return Math.ceil(multiplier * (fromRegions + fromTemples));
    }

    regionHasActiveArmy(player, region) {
        return (this.move.movesRemaining > 0) &&
            (this.owner(region) == player) && this.soldierCount(region) &&
            (!sequenceUtils.contains(this.move.z, region));
    }

    regionCount(player) {
        var total = 0;
        const self = this;
        utils.map(this.regions, function(region) {
            if (self.owner(region) == player)
                total++;
        });
        return total;
    }

    templesForPlayer(player) {
        var playerTemples = [];
        let self = this;
        utils.forEachProperty(this.temples, function(temple, regionIndex) {
            if (self.owners[regionIndex] == player)
                playerTemples.push(temple);
        });
        return playerTemples;
    }

    activePlayer() {
        return this.players[this.move.playerIndex];
    }

    owner(region) {
        return this.owners[region.index];
    }

    cashForPlayer(player) {
        return this.cash[player.index];
    }

    rawUpgradeLevel(player, upgradeType) {
        return sequenceUtils.max(utils.map(this.templesForPlayer(player), function(temple) {
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
        return sequenceUtils.max(utils.map(this.regions, function(region) {
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
        return sequenceUtils.sum(this.regions, function(region) {
            return (self.owner(region) == player) ? self.soldierCount(region) : 0;
        });
    }

    soldierCost() {
        return UPGRADES.SOLDIER.cost[this.move.h || 0];
    }

    templeInfo(temple) {
        if (!temple.upgrade) {
            var name = this.owner(temple.region) ? "Basic Temple" : "Neutral Temple";
            return { name, description: "No upgrades." };
        } else {
            let upgrade = temple.upgrade;
            let level = temple.level;
            let description = utils.template(upgrade.desc, upgrade.level[level]);
            return {name: utils.template(upgrade.name, gameData.LEVELS[level]), description};
        }
    }

    addSoldiers(region, count) {
        const self = this;
        utils.map(utils.range(0, count), function() {
            soldierCounter = (soldierCounter + 1) || 0;
            var soldierList = self.soldiersAtRegion(region.index);
            soldierList.push({ i: soldierCounter++ });
        });
    }

    soldiersAtRegion(regionIndex) {
        return this.soldiers[regionIndex] || (this.soldiers[regionIndex] = []);
    }

    // Some properties are omitted - like 'moveDecision', 'undoDisabled', and 'soundCue'
    copy(simulatingPlayer) {
        return new GameState(
            this.players,
            this.regions,
            utils.deepCopy(this.owners, 1),
            utils.deepCopy(this.temples, 2),
            utils.deepCopy(this.soldiers, 3),
            utils.deepCopy(this.cash, 1),
            utils.deepCopy(this.levels, 1),
            utils.deepCopy(this.move, 1),
            this.simulatingPlayer || simulatingPlayer,
            this.floatingText
        );
    }
}
