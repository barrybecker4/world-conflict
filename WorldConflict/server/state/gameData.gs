
// The world map (regions) and players get initialized during game setup.
// Once the game starts, this information does not change.
var gameData = (function (my) {

    my.gameId = undefined;
    my.players = undefined;
    my.regions = undefined;
    my.initialGameState = undefined;

    return my;
} (gameData || {}));

