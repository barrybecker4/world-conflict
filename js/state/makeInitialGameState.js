import utils from '../utils/utils.js';
import sequenceUtils from '../utils/sequenceUtils.js';
import gameData from './gameData.js';
import gameController from '../gameController.js';
import aiPlay from '../server/aiPlay.js';
import generateMap from '../map/generateMap.js';
import Temple from './model/Temple.js';
import GameState from './model/GameState.js';
import Region from './model/Region.js';
import { ArmyMove } from './model/Move.js';
import AI_PERSONALITIES from './model/AI_PERSONALITIES.js';
import PLAYERS from './model/PLAYERS.js';
const { map, deepCopy, rint, range, sum } = utils;

// initial game state happens here
export default function makeInitialGameState(setup) {

    let players = [];

    map(setup.p, function(playerController, playerIndex) {
        if (playerController == gameData.PLAYER_OFF) return;
        var player = deepCopy(PLAYERS[playerIndex], 1);

        // set up as AI/human
        player.u = (playerController == gameData.PLAYER_HUMAN) ? gameController.uiPickMove : aiPlay.aiPickMove;

        // pick a random personality if we're AI
        if (playerController == gameData.PLAYER_AI) {
            player.p = AI_PERSONALITIES[rint(0, AI_PERSONALITIES.length)].copy();
        }

        player.index = players.length;
        players.push(player);
    });

    var regions = generateMap(players.length);
    let move = new ArmyMove(1, 0, gameData.movesPerTurn);
    var gameState = new GameState(players, regions, {}, {}, {}, {}, {}, move);

    setupTemples();

    return gameState;

    function distanceScore(regions) {
        return sequenceUtils.min(sequenceUtils.pairwise(regions, Region.distance));
    }

    function randomRegion() {
        return regions[rint(0, regions.length)];
    }

    function setupTemples() {
        // give the players some cash (or not)
        map(players, function(player, index) {
            gameState.c[index] = 0;
            gameState.l[index] = 0;
        });

        // pick three regions that are as far away as possible from each other
        // for the players' initial temples
        var possibleSetups = map(range(0, 1000), function() {
            return map(gameState.p, randomRegion);
        });
        var homes = sequenceUtils.max(possibleSetups, distanceScore);

        // we have the regions, set up each player
        map(players, function(player, index) {
            var region = homes[index];
            // make one of the regions your own
            gameState.o[region.i] = player;
            // put a temple and 3 soldiers in it
            putTemple(region, 3);
        });

        // setup neutral temples
        var distancesToTemples = map(homes, function() { return 0; });
        var templeRegions = [];
        var templeCount = [3,3,4][players.length-2];

        map(range(0, templeCount), function() {
            var bestRegion = sequenceUtils.max(gameState.r, function(region) {
                return templeScore(region);
            });

            putTemple(bestRegion, 3);

            templeRegions.push(bestRegion);
            distancesToTemples = updatedDistances(bestRegion);
        });

        function updatedDistances(newTempleRegion) {
            return map(homes, function(home, index) {
                return distancesToTemples[index] + home.distanceFrom(newTempleRegion);
            });
        }

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
    }

    function putTemple(region, soldierCount) {
        var index = region.i;
        gameState.t[index] = new Temple(index, region);
        gameState.addSoldiers(region, soldierCount);
    }
}
