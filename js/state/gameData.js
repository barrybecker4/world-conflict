// The world map (regions) and players get initialized during game setup.
// Once the game starts, they do not change.
var gameData = (function (my) {

    my.gameId = undefined;
    my.players = undefined;
    my.regions = undefined;

    return my;
} (gameData || {}));

