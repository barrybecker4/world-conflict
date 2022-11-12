
/**
 * The world map (regions) and players get initialized during game setup.
 * Once the game starts, this global information does not change.
 */
var gameData = (function (my) {

    // @param obj plain object containing props.
    // Need to reconstitute the regions because they are only simple objects without methods
    my.initializeFrom = function(obj) {
        my.regions = obj.regions ? obj.regions.map(r => new Region(r)) : null;
        my.players = obj.players.map(p => new Player(p));
        my.gameId = obj.gameId;
        my.initialGameState = new GameState(obj.initialGameState);
        my.aiLevel = obj.aiLevel;
        my.turnCount = obj.turnCount;
        my.humanTimeLimit = obj.humanTimeLimit;
        my.mapSize = obj.mapSize;
        my.eliminatedPlayers = obj.eliminatedPlayers || {};
    }

    my.numHumanPlayers = function() {
        return my.players.filter(p => !p.personality).length;
    }

    // GAS does not allow transferring properties that have function type
    my.getSimpleObject = function() {
        return {
            regions: my.regions,
            players: my.players,
            gameId: my.gameId,
            initialGameState: my.initialGameState,
            aiLevel: my.aiLevel,
            turnCount: my.turnCount,
            humanTimeLimit: my.humanTimeLimit,
            mapSize: my.mapSize,
            eliminatedPlayers: my.eliminatedPlayers,
        }
    }

    return my;
} (gameData || {}));

