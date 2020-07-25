
// The world map (regions) and players get initialized during game setup.
// Once the game starts, this information does not change.
var gameData = (function (my) {

    // @param obj plain object containing props.
    // Need to reconstitute the regions because they are only simple objects without methods
    my.initializeFrom(obj) {
        my.regions = obj.regions.map(r => new Region(r));
        my.players = obj.players;
        my.gameId = obj.gameId;
        my.initialGameState = new GameState(obj.initialGameState);
    }

    my.gameId = undefined;
    my.players = undefined;
    my.regions = undefined;
    my.initialGameState = undefined;

    return my;
} (gameData || {}));

