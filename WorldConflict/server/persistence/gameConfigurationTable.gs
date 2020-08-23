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
     * @param newGameConfiguration the json for the new game
     * @return the new game configuration doc (which contains the gameId)
     */
    function createGameConfiguration(newGameConfiguration) {
        return firestore.createDocument('/' + GAME_CONFIGURATION_TABLE, newGameConfiguration);
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
    function upsert(gameData, gameId) {
        if (gameId) {
            const doc = getGameConfiguration(gameId);
            // Logger.log("doc.name = " + doc.name);
            gameData.gameId = gameId;
            doc.fields = gameData;
            updateGameConfiguration(doc);
        } else {
            const doc = createGameConfiguration(gameData);
            // Logger.log("persisted gameData = " + JSON.stringify(doc));
            gameData.gameId = getGameIdFromDoc(doc);
            gameData.initialGameState.gameId = gameData.gameId;
        }
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
        upsert,
    };
}