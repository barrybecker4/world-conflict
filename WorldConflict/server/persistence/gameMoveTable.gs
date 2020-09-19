// encapsulate access to the persistent "game state" table that contains
// all the states of all games - whether played or in progress.
var gameMoveTable = getGameMoveTableAccessor();

function getGameMoveTableAccessor() {
    const firestore = getFirestore().getInstance();
    const GAME_MOVE_TABLE = 'gameMoves';

    /**
     * @return all game moves for the specified gameId since the lastStateId
     */
    function getMovesForGame(gameId, lastStateId) {
        let moves = [];
        try {
            moves = firestore.query(GAME_MOVE_TABLE)
               .Where('gameId', '==', gameId)
               .Where('stateId', '>', lastStateId)
               .OrderBy("stateId")
               .Execute();
        }
        catch (err) {
            Logger.log("err: " + err);
            Logger.log('No moves found for gameId ' + gameId);
        }
        // Logger.log("retrieved " + moves.length + " moves");
        moves = moves.map(move => move.obj);
        return moves;
    }

    /**
     * Add games moves - typically for a particular game, but doesn't have to be.
     */
    function appendGameMoves(gameMoves) {
        const appendedMoves = [];
        gameMoves.forEach(move => {
            appendedMoves.push(appendGameMove(move));
        });
        return appendedMoves;
    }

    function appendGameMove(move) {
        if (!move.stateId) {
            throw new Error("No stateId for move!");
        }
        return firestore.createDocument('/' + GAME_MOVE_TABLE, move);
    }

    return {
        getMovesForGame,
        appendGameMoves,
        appendGameMove,
    };
}