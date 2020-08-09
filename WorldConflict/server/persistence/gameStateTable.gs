// encapsulate access to the persistent "game state" table that contains
// all the states of all games - whether played or in progress.
var gameStateTable = getGameStateTableAccessor();

function getGameStateTableAccessor() {
    const firestore = getFirestore().getInstance();
    const GAME_STATE_TABLE = 'gameStates';

    /**
     * @return all game states for the specified gameId since the lastStateId
     */
    function getStatesForGame(gameId, lastStateId) {
        let states = [];
        // Logger.log("retrieving gameStates for gameId = " + gameId + " and lastStateId = " +
        //    lastStateId + " lastId type = " + (typeof lastStateId));
        try {
            states = firestore.query(GAME_STATE_TABLE)
               .Where('gameId', '==', gameId)
               .Where('id', '>', lastStateId)
               .OrderBy("id")
               .Execute();
        }
        catch (err) {
            Logger.log("err: " + err);
            Logger.log('No states found for gameId ' + gameId);
        }
        // Logger.log("retrieved " + states.length + " states");
        states = states.map(state => state.obj); //.fields
        return states;
    }

    /**
     * Add games States - typically for a particular game, but doesn't have to be.
     * A State contains a moveDecision that describes how to transform it to the next state.
     */
    function appendGameStates(gameStates) {
        // const gameId = (gameStates && gameStates.length) ? gameStates[0].gameId : -1;
        //Logger.log("about to append " + gameStates.length);

        const appendedStates = [];
        gameStates.forEach(gameState => {
            appendedStates.push(appendGameState(gameState));
        });
        return appendedStates;
    }

    function appendGameState(gameState) {
        return firestore.createDocument('/' + GAME_STATE_TABLE, gameState);
    }

    return {
        getStatesForGame,
        appendGameStates,
        appendGameState,
    };
}