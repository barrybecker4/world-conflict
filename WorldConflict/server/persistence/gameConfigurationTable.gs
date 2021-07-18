// Encapsulate access to the persistent "game state" table that contains
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

        // firestore does not include the gameId as a prop, so we need to add it
        gameConfigs = gameConfigs.map(gameConfig => gameConfig.obj);

        return gameConfigs;
    }

    /**
     * @param newGameConfiguration the json for the new game
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
     *     If gameData has gaeID property,then the existing gameData for that id is updated.
     */
    function upsert(gameData) {
        if (gameData.gameId) {
            const doc = getGameConfiguration(gameData.gameId);
            addPlayerTypes(gameData);
            doc.fields = gameData;
            updateGameConfiguration(doc);
        } else {
            gameData = insert(gameData);
        }
        return gameData;
    }

    function insert(gameData) {
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
        const gamesToDelete = games.filter(game => getNumSeatedPlayers(game) == 0);
        const gameIdsToDelete = gamesToDelete.map(g => g.gameId);
        console.log("Deleting " + gameIdsToDelete.length + " games where there are no human players.");
        const startTime = new Date();
        deleteGameConfigurations(gameIdsToDelete);
        const elapsed = new Date() - startTime;
        console.log("Deleted in "+ elapsed + " milliseconds.");
    }


    return {
        getGameConfiguration,
        createGameConfiguration,
        updateGameConfiguration,
        deleteGameConfiguration,
        deleteGameConfigurations,
        getOpenGameConfigurations,
        insert,
        upsert,
        availableOpenGame,
        availableOpenGames,
        availableOpenGamesWhereSeated,
        getNumSeatedPlayers,
    };
}
