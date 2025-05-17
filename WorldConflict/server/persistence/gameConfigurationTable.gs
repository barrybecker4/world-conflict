// Encapsulate access to the persistent "gameConfigurations" table that contains
// all the states of all games - whether played or in progress.
// See gameConfigurations in firestore database.
var gameConfigurationTable = getGameConfigurationTableAccessor();

function getGameConfigurationTableAccessor() {
    var firestore = getFirestore().getInstance();
    const GAME_CONFIGURATION_TABLE = "gameConfigurations";

    /**
     * @return document for the game configuration for the specified gameId
     *   Note: you need to do .obj to get the actual gameData object
     */
    function getGameConfiguration(gameId) {
        let doc = null;
        try {
            doc = firestore.getDocument(GAME_CONFIGURATION_TABLE + '/' + gameId);
        }
        catch (err) {
            Logger.log('No gameConfiguration found for gameId ' + gameId);
        }
        return doc;
    }

    /**
     * @return the set of game configurations for which there are open player slots to be filled
     */
    function getOpenGameConfigurations() {
        let gameConfigs = [];

        try {
            gameConfigs = firestore.query(GAME_CONFIGURATION_TABLE)
               .Where('playerTypes', 'contains', CONSTS.PLAYER_HUMAN_OPEN)
               .Execute();
        }
        catch (err) {
            Logger.log("err: " + err);
        }

        gameConfigs = gameConfigs.map(gameConfig => gameConfig.obj);
        return gameConfigs;
    }

    /**
     * @param newGameData the json for the new game
     * @return the new game configuration doc (which contains the gameId)
     */
    function createGameConfiguration(newGameData) {

        addPlayerTypes(newGameData);

        // assign our own id instead of letting firestore do it - that way we can persist it in the object
        const guid = getGuid();
        newGameData.initialGameState.gameId = guid;
        newGameData.gameId = guid;
        return firestore.createDocument(GAME_CONFIGURATION_TABLE + '/' + guid, newGameData);
    }

    /**
     * Since firestore does not currently allow filtering based on properties of objects in arrays,
     * add an array with the playerTypes that we will need to filter on.
     * See https://stackoverflow.com/questions/52351321/how-to-query-documents-containing-array-of-objects-in-firestore-collection-using
     */
    function addPlayerTypes(gameData) {
        gameData.playerTypes = gameData.players.map(p => p.type);
    }

    function getGuid() {
        return Utilities.getUuid().replace(/-/g, '');
    }

    /**
     * @doc - the configuration doc to update. Has name and fields properties. The fields prop is the json for the game.
     */
    function updateGameConfiguration(doc) {
        if (!doc) {
            throw new Error("Calling updateGameConfiguration with null doc");
        }
        firestore.updateDocument(getPathFromDoc(doc), doc.fields);
    }

    /**
     * @param gameIds ids of the game to delete
     */
    function deleteGameConfigurations(gameIds) {
        gameIds.forEach(id => deleteGameConfiguration(id));
    }

    /**
     * @param gameId id of the game to delete
     */
    function deleteGameConfiguration(gameId) {
        firestore.deleteDocument(GAME_CONFIGURATION_TABLE + '/' + gameId);
    }

    /**
     * @param gameData the new game data to persist.
     *     If gameData has gameID property, then the existing gameData for that id is updated.
     */
    function upsert(gameData) {
        if (gameData.gameId) {
            const doc = getGameConfiguration(gameData.gameId);
            if (!doc) {
                throw new Error("Could not retrieve game with gameId = " + gameData.gameId);
            }
            addPlayerTypes(gameData);
            doc.fields = gameData;
            updateGameConfiguration(doc);
        } else {
            gameData = insert(gameData);
        }
        return gameData;
    }

    function insert(gameData) {
        gameData.createdAt = new Date().toISOString();
        const doc = createGameConfiguration(gameData);
        gameData.gameId = getGameIdFromDoc(doc);
        gameData.initialGameState.gameId = gameData.gameId;
        return gameData;
    }

    function getPathFromDoc(doc) {
        return doc.name.substr(doc.name.indexOf(GAME_CONFIGURATION_TABLE + '/'));
    }

    function getGameIdFromDoc(doc) {
        return getPathFromDoc(doc).substr(GAME_CONFIGURATION_TABLE.length + 1);
    }

    /**
     * @return an available game with open slots where this user is not already seated, else null
     */
    function availableOpenGame(openGames, userId) {
        return openGames.find(game => playerNotSeated(game, userId));
    }

    /**
     * @return all available games with open slots where this user is not already seated, else null
     */
    function availableOpenGames(openGames, userId) {
        return openGames.filter(game => playerNotSeated(game, userId) && getNumSeatedPlayers(game) > 0);
    }

    /**
     * @return all available games with open slots where this user is already seated, else null
     */
    function availableOpenGamesWhereSeated(openGames, userId) {
        return openGames.filter(game => playerIsSeated(game, userId));
    }

    function playerNotSeated(game, userId) {
        return !game.players.some(p => p.name === userId);
    }

    function playerIsSeated(game, userId) {
        return game.players.some(p => p.name === userId);
    }

    /**
     * @return number of human seated players (AI's excluded)
     */
    function getNumSeatedPlayers(game) {
        return game.players.filter(p => p.type === CONSTS.PLAYER_HUMAN_SET).length;
    }

    /**
     * For any games in the list where there are no human players, asynchronously remove them.
     */
    function removeGamesWithNoHumans(games) {
        const gamesToDelete = games.filter(game => getNumSeatedPlayers(game) === 0);
        const gameIdsToDelete = gamesToDelete.map(g => g.gameId);
        Logger.log("Deleting " + gameIdsToDelete.length + " games where there are no human players.");
        const startTime = new Date();
        deleteGameConfigurations(gameIdsToDelete);
        const elapsed = new Date() - startTime;
        Logger.log("Deleted in "+ elapsed + " milliseconds.");
    }


    /**
     * Removes old game configurations and their associated moves
     */
    function cleanupOldGames() {
        const MAX_HOURS_OLD = 12;
        try {
            const thresholdAgo = new Date();
            thresholdAgo.setHours(thresholdAgo.getHours() - MAX_HOURS_OLD);
            const thresholdAgoIso = thresholdAgo.toISOString();

            const completedGames = firestore.query(GAME_CONFIGURATION_TABLE)
                .Where('createdAt', '<', thresholdAgoIso)
                .Limit(100)
                .Execute();

            if (completedGames.length > 0) {
                Logger.log(`Found ${completedGames.length} completed games older than ${MAX_HOURS_OLD} hours to clean up`);

                const completedIdsToDelete = completedGames.map(game => game.obj.gameId);
                deleteGameConfigurations(completedIdsToDelete);
                gameMoveTable.deleteGameMovesByGameIds(completedIdsToDelete);
            }
        } catch (err) {
            console.error("Error cleaning up old games: " + err);
        }
    }


    return {
        getGameConfiguration,
        updateGameConfiguration,
        deleteGameConfiguration,
        deleteGameConfigurations,
        getOpenGameConfigurations,
        upsert,
        availableOpenGame,
        availableOpenGames,
        availableOpenGamesWhereSeated,
        getNumSeatedPlayers,
        removeGamesWithNoHumans,
        cleanupOldGames,
    };
}
