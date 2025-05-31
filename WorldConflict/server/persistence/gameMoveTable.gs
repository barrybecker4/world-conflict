// Encapsulate access to the persistent "game state" table that contains
// all the states of all games - whether played or in progress.
// See gameMoves in firestore database
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

    /**
     * Deletes all game moves associated with specified game IDs
     * @param {Array} gameIds - Array of game IDs to delete moves for
     */
    function deleteGameMovesByGameIds(gameIds) {
        if (!gameIds || gameIds.length === 0) return;

        try {
            gameIds.forEach(gameId => {
                const moves = firestore.query(GAME_MOVE_TABLE)
                    .Where('gameId', '==', gameId)
                    .Limit(300)
                    .Execute();

                moves.forEach(move => {
                    const gameMoveId = move.name.split('/').pop();
                    const docPath = `${GAME_MOVE_TABLE}/${gameMoveId}`;
                    firestore.deleteDocument(docPath);
                });

                Logger.log(`Deleted ${moves.length} moves for game ${gameId}`);
            });
        } catch (err) {
            console.error("Error deleting game moves: " + err);
        }
    }

    /**
     * Cleanup any moves that are not associated with a game configuration.
     * This could be made more efficient if only Firestore were to support batch deletes.
     */
    function cleanupOrphanedMoves() {
        const GAME_CONFIGURATION_TABLE = "gameConfigurations";

        try {
            const moves = firestore.query(GAME_MOVE_TABLE)
                .Limit(100)
                .Execute();

            Logger.log(`Retrieved ${moves.length} moves.`);

            const gameIds = new Set();
            moves.forEach(move => {
                if (move.obj && move.obj.gameId) {
                    gameIds.add(move.obj.gameId);
                }
            });

            Logger.log(`Found ${gameIds.size} unique game IDs`);
            let orphanedMoveCount = 0;
            let existingGames = 0;

            for (const gameId of gameIds) {
                try {
                    const configPath = `${GAME_CONFIGURATION_TABLE}/${gameId}`;
                    const config = firestore.getDocument(configPath);
                    existingGames++;
                } catch (err) {
                    // No config found - delete all moves for this game
                    const orphanedMoves = firestore.query(GAME_MOVE_TABLE)
                        .Where("gameId", "==", gameId)
                        .Execute();


                    if (orphanedMoves.length > 0) {
                        Logger.log(`Deleting ${orphanedMoves.length} orphaned moves for game ${gameId}`);

                        orphanedMoves.forEach(move => {
                            const docPath = `${GAME_MOVE_TABLE}/${move.name.split('/').pop()}`;
                            firestore.deleteDocument(docPath);
                        });

                        orphanedMoveCount += orphanedMoves.length;
                    }
                }
            }

            Logger.log(`Orphaned Move cleanup complete. Found ${existingGames} existing games and deleted ${orphanedMoveCount} orphaned moves`);
            return orphanedMoveCount;

        } catch (err) {
            Logger.log(`Error in quick cleanup: ${err}`);
            return 0;
        }
    }

    return {
        getMovesForGame,
        appendGameMoves,
        appendGameMove,
        deleteGameMovesByGameIds,
        cleanupOrphanedMoves,
    };
}