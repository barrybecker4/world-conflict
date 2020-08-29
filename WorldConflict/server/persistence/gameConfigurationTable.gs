// encapsulate access to the persistent "game state" table that contains
// all the states of all games - whether played or in progress.
var gameConfigurationTable = getGameConfigurationTableAccessor();

function getGameConfigurationTableAccessor() {
    var firestore = getFirestore().getInstance();
    const GAME_CONFIGURATION_TABLE = "gameConfigurations";

    /**
     * @return the game configuration for the specified gameId
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
    function createGameConfiguration(newGameConfiguration) {
        // since firestore does not currently allow filtering based on properties of objects in arrays,
        // add an array with the playerTypes that we will need to filter on.
        // See https://stackoverflow.com/questions/52351321/how-to-query-documents-containing-array-of-objects-in-firestore-collection-using
        newGameConfiguration.playerTypes = newGameConfiguration.players.map(p => p.type);

        // assign our own id instead of letting firestore do it - that way we can persist it in the object
        const guid = getGuid();
        newGameConfiguration.initialGameState.gameId = guid;
        newGameConfiguration.gameId = guid;
        return firestore.createDocument(GAME_CONFIGURATION_TABLE + '/' + guid, newGameConfiguration);
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
     * @param gameId id of the game to delete
     */
    function deleteGameConfiguration(gameId) {
        firestore.deleteDocument(GAME_CONFIGURATION_TABLE + '/' + gameId);
    }

    /**
     * @param gameData the new game data to persist
     * @param gameId (optional) if specified then the existing gameData for that id is updated
     */
    function upsert(gameData) {
        if (gameData.gameId) {
            const doc = getGameConfiguration(gameData.gameId);
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

    return {
        getGameConfiguration,
        createGameConfiguration,
        updateGameConfiguration,
        deleteGameConfiguration,
        getOpenGameConfigurations,
        insert,
        upsert,
    };
}