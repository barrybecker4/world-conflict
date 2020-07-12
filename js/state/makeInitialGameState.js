import utils from '../utils/utils.js';
import sequenceUtils from '../utils/sequenceUtils.js';
import CONSTS from './CONSTS.js';
import aiPlay from '../server/ai/aiPlay.js';
import generateMap from '../server/map/generateMap.js';
import uiPickMove from '../client/uiPickMove.js';
import Temple from './model/Temple.js';
import GameState from './model/GameState.js';
import Region from './model/Region.js';
import { ArmyMove } from './model/Move.js';
import gameData from './gameData.js';
const { deepCopy, rint, range, sum } = utils;
const { AI_PERSONALITIES, PLAYERS } = CONSTS;

var gameId = 0;

// Create game state, regions, and players based on setup configuration
// Update regions and players in the global gameData
export default function makeInitialGameState(setup) {

    let players = [];

    setup.players.map(function(playerController, playerIndex) {
        if (playerController === CONSTS.PLAYER_OFF) return;
        var player = deepCopy(PLAYERS[playerIndex], 1);

        if (playerController == CONSTS.PLAYER_AI) {
            player.personality = AI_PERSONALITIES[setup.aiLevel].copy();
        }

        player.index = players.length;
        players.push(player);
    });

    let regions = generateMap(players.length, setup.mapWidth, setup.mapHeight);
    let gameState = new GameState({turnIndex: 1, playerIndex: 0, movesRemaining: CONSTS.BASE_MOVES_PER_TURN});

    setupTemples(3, regions);

    gameData.regions = regions;
    gameData.players = players;
    gameData.gameId = gameId++;
    return gameState;

    function distanceScore(regions, allRegions) {
        return sequenceUtils.min(sequenceUtils.pairwise(regions, Region.distance, allRegions));
    }

    /**
     * @param initialSoldierCount number of solders to place at each temple location initially
     */
    function setupTemples(initialSoldierCount, regions) {

        var homes = findHomeRegions(regions);

        setupPlayersWithTheirTemples(players, homes);
        setupNeutralTemples(players, homes, regions);

        // we have the regions, set up each player
        function setupPlayersWithTheirTemples(players, homes) {
            players.map(function(player, playerIndex) {
                // give the players some cash (or not)
                gameState.cash[playerIndex] = 0;
                var region = homes[playerIndex];
                // make one of the regions your own
                gameState.owners[region.index] = playerIndex;
                // put a temple and 3 soldiers in it
                putTemple(region, initialSoldierCount);
            });
        }

        function setupNeutralTemples(players, homes, regions) {
            var distancesToTemples = homes.map(function() { return 0; });
            var templeRegions = [];
            var neutralTempleCount = [3, 3, 4][players.length - 2];

            range(0, neutralTempleCount).map(function() {
                var bestRegion = sequenceUtils.max(regions, function(region) {
                    return templeScore(region);
                });

                putTemple(bestRegion, initialSoldierCount);

                templeRegions.push(bestRegion);
                distancesToTemples = updatedDistances(bestRegion);
            });

            function templeScore(newTemple) {
                if (sequenceUtils.contains(templeRegions, newTemple))
                    return -100;

                var updated = updatedDistances(newTemple);
                var inequality = sequenceUtils.max(updated) - sequenceUtils.min(updated);
                var templeDistances = distanceScore(templeRegions.concat(homes).concat(newTemple), regions);
                if (!templeDistances)
                    templeDistances = -5;

                return templeDistances - inequality;
            }

            function updatedDistances(newTempleRegion) {
                return homes.map(function(home, index) {
                    return distancesToTemples[index] + home.distanceFrom(newTempleRegion, regions);
                });
            }
        }
    }


    // pick regions that are as far away as possible from each other for the players' initial temples
    function findHomeRegions(regions) {
        const possibleSetups = range(0, 1000).map(function() {
            return players.map(() => regions[rint(0, regions.length)]);
        });
        const homes = sequenceUtils.max(possibleSetups, setup => distanceScore(setup, regions));
        return homes;
    }

    function putTemple(region, soldierCount) {
        var regionIndex = region.index;
        gameState.temples[regionIndex] = new Temple(regionIndex);
        gameState.addSoldiers(regionIndex, soldierCount);
    }
}
