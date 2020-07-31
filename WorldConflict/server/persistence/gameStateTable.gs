// encapsulate access to the persistent "game state" table that contains
// all the states of all games - whether played or in progress.
var gameStateTable = getGameStateTableAccessor();

function getGameStateTableAccessor() {
    var firestore = getFirestore().getInstance();
    const GAME_STATE_TABLE = "gameStates";

    /**
     * @return all game states for the specified gameId since the lastStateId
     */
    function getStatesForGame(gameId, lastStateId) {
        let states = null;
        try {
            states = firestore.query('/' + GAME_STATE_TABLE)
                .where('gameId', '==', gameId)
                .where('lastStateId' > lastStateId)
                .execute();
        }
        catch (err) {
            Logger.log('No states found for gameId ' + gameId);
        }
        return states
    }

    /**
     * Add games States - typically for a particular game, but doesn't have to be.
     * A State contains a moveDecision that describes how to transform it to the next state.
     */
    function appendGameStates(gameStates) {
        // const gameId = (gameStates && gameStates.length) ? gameStates[0].gameId : -1;
        Logger.log("about to append. = \n" + gameStates.length);

        const appendedStates = [];
        gameStates.forEach(gameState => {
            //Logger.log("now appending " + JSON.stringify(gameState));
            appendedStates.push(firestore.createDocument('/' + GAME_STATE_TABLE, gameState));
        });
        return appendedStates;
    }

    return {
        getStatesForGame,
        appendGameStates,
    };
}