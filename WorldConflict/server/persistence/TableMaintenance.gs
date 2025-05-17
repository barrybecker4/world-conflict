/**
 * A module for database maintenance operations in the WorldConflict application.
 * This centralizes all cleanup and maintenance operations for Firestore tables.
 */
var tableMaintenance = getTableMaintenance();
function getTableMaintenance() {

    /**
     * Performs asynchronous cleanup of games
     * This runs in the background after retrieving open games
     */
    function cleanupGamesAsync() {
        const promise = new Promise(function(resolve, reject) {
            try {
                gameConfigurationTable.cleanupOldGames();
                //gameMoveTable.cleanupOrphanedMoves(); // normally should not be any
                resolve("Cleanup completed successfully");
            } catch (err) {
                Logger.error("Error during cleanup: " + err);
                reject(err);
            }
        });

        return;
    }

    function removeGamesWithNoHumansAsync(gameDataDocs) {
        const promise = new Promise(function(resolve, reject) {
            try {
                gameConfigurationTable.removeGamesWithNoHumans(gameDataDocs);
                resolve("Successfully removed games with no human players");
            } catch (err) {
                Logger.error("Error during cleanup of games with no humans: " + err);
                reject(err);
            }
        });

        return;
    }

    return {
        cleanupGamesAsync,
        removeGamesWithNoHumansAsync,
    };
};
