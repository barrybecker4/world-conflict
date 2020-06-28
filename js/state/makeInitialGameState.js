import utils from '../utils/utils.js';
import sequenceUtils from '../utils/sequenceUtils.js';
import gameData from './consts/gameData.js';
import aiPlay from '../server/ai/aiPlay.js';
import generateMap from '../server/map/generateMap.js';
import uiPickMove from '../client/uiPickMove.js';
import Temple from './model/Temple.js';
import GameState from './model/GameState.js';
import Region from './model/Region.js';
import { ArmyMove } from './model/Move.js';
import AI_PERSONALITIES from './consts/AI_PERSONALITIES.js';
import PLAYERS from './consts/PLAYERS.js';
const { deepCopy, rint, range, sum } = utils;

// Create game state based on setup configuration
export default function makeInitialGameState(setup) {

    let players = [];

    setup.players.map(function(playerController, playerIndex) {
        if (playerController === gameData.PLAYER_OFF) return;
        var player = deepCopy(PLAYERS[playerIndex], 1);

        // set up as AI or human
        player.pickMove = (playerController == gameData.PLAYER_HUMAN) ? uiPickMove : aiPlay.aiPickMove;

        // pick a random personality if we're AI
        if (playerController == gameData.PLAYER_AI) {
            player.personality = AI_PERSONALITIES[rint(0, AI_PERSONALITIES.length)].copy();
        }

        player.index = players.length;
        players.push(player);
    });

    var regions = generateMap(players.length);
    var gameState = new GameState(players, regions, 1, 0, gameData.movesPerTurn);

    setupTemples(3);

    return gameState;

    function distanceScore(regions) {
        return sequenceUtils.min(sequenceUtils.pairwise(regions, Region.distance));
    }

    /**
     * @param initialSoldierCount number of solders to place at each temple location initially
     */
    function setupTemples(initialSoldierCount) {

        var homes = findHomeRegions();

        setupPlayersWithTheirTemples(players, homes);
        setupNeutralTemples(players, homes);

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

        function setupNeutralTemples(players, homes) {
            var distancesToTemples = homes.map(function() { return 0; });
            var templeRegions = [];
            var neutralTempleCount = [3, 3, 4][players.length - 2];

            range(0, neutralTempleCount).map(function() {
                var bestRegion = sequenceUtils.max(gameState.regions, function(region) {
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
                var templeDistances = distanceScore(templeRegions.concat(homes).concat(newTemple));
                if (!templeDistances)
                    templeDistances = -5;

                return templeDistances - inequality;
            }

            function updatedDistances(newTempleRegion) {
                return homes.map(function(home, index) {
                    return distancesToTemples[index] + home.distanceFrom(newTempleRegion);
                });
            }
        }
    }


    // pick regions that are as far away as possible from each other for the players' initial temples
    function findHomeRegions() {
        const possibleSetups = range(0, 1000).map(function() {
            return gameState.players.map(() => regions[rint(0, regions.length)]);
        });
        const homes = sequenceUtils.max(possibleSetups, distanceScore);
        return homes;
    }

    function putTemple(region, soldierCount) {
        var index = region.index;
        gameState.temples[index] = new Temple(index, region);
        gameState.addSoldiers(region, soldierCount);
    }
}
