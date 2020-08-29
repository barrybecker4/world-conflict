var erisk = (function(my) {

    /**
     * If there is an open game use that, otherwise
     * create the game state, regions, and players based on setup configuration.
     * Update regions and players in the global gameData.
     *
     * If games exist with open slots, and this is the very first request from the client (gameId not set),
     * then we will try to use them first instead of creating a new game with the specified configuration.
     * A status flag will be returned with the gameData object that specifies if the game is
     * "waitingForPlayers" (meaning some human player have yet to join),
     * or "readyToStart" (meaning all human players have joined).
     *
     * @param setup the new setup configuration from the user
     * @param gameId (optional) if present then the setup for this gameId will be updated, else created
     * @param keepCurrentMap if true, then do not generate a new map (use the one already in the gameData)
     * @return fully fleshed out gameData that is persisted in firestore
     */
    my.makeGameData = function(setup, gameId, keepCurrentMap) {

        const openGames = gameConfigurationTable.getOpenGameConfigurations();
        const userId = getUserId();
        Logger.log("makeGameData userId = " + userId + " gameId = " + gameId + " openGames.length = " + openGames.length);

        if (!gameId && openGames.length) {
            return gameDataFromExistingGame(openGames[0], userId);
        }
        else {
            return createNewGameData(setup, gameId, keepCurrentMap, userId);
        }
    }

    /**
     * Given an existing game with an open human player slot, fill that slot with that user and return the result.
     * Set the status to either "waitingForPlayers" or "readyToStart" based on whether there are still open slots remaining.
     */
    function gameDataFromExistingGame(openGame, userId) {

        Logger.log("Found open game with id = " + openGame.gameId);

        openGame.players.forEach((player, i) => {
            if (player.type === CONSTS.PLAYER_HUMAN_OPEN) {
                player.name = userId;
                player.type = CONSTS.PLAYER_HUMAN_SET;
            }
            console.log("player " + i + " = " + player.name + " type = " + player.type);
        });

        gameData = gameConfigurationTable.upsert(openGame);

        const stillHasOpenSpots = gameData.players.some(p => p.type === CONSTS.PLAYER_HUMAN_OPEN);
        gameData.status = stillHasOpenSpots ? CONSTS.WAITING_FOR_PLAYERS : CONSTS.READY_TO_START;

        return gameData;
    }

    /**
     * Create new gameData given setup information.
     */
    function createNewGameData(setup, gameId, keepCurrentMap, userId) {
        let gameState = new GameState({
            turnIndex: 1,
            playerIndex: 0,
            movesRemaining: CONSTS.BASE_MOVES_PER_TURN,
            gameId
        });

        const oldNumPlayers = ((gameData.players && gameData.players.length) || 0);
        const players = createPlayers(setup);

        // we cannot keep the old map if the number of players has changed.
        keepCurrentMap = keepCurrentMap && players.length === oldNumPlayers;

        gameData.players = players;
        if (!keepCurrentMap) {
            const regions = mapGenerator.generateMap(players.length, setup.mapWidth, setup.mapHeight);
            setupTemples(3, regions);
            gameData.regions = regions;
            gameData.initialGameState = gameState;
        }
        gameData.aiLevel = setup.aiLevel;
        gameData.turnCount = setup.turnCount;

        if (gameId) {
            gameConfigurationTable.deleteGameConfiguration(gameId);
        }
        gameData = gameConfigurationTable.insert(gameData);

        return gameData;

        function distanceScore(regions, allRegions) {
            return sequenceUtils.min(sequenceUtils.pairwise(regions, Region.distance, allRegions));
        }

        function createPlayers(setup) {
            const players = [];

            setup.playerTypes.map(function(playerType, playerIndex) {
                if (playerType === CONSTS.PLAYER_OFF) {
                    return;
                }
                const player = utils.deepCopy(CONSTS.PLAYERS[playerIndex], 1);

                if (playerType === CONSTS.PLAYER_AI) {
                    player.personality = CONSTS.AI_PERSONALITIES[utils.rint(0, CONSTS.AI_PERSONALITIES.length)].copy();
                }

                player.index = players.length;
                player.type = setup.playerTypes[playerIndex];
                if (player.type === CONSTS.PLAYER_HUMAN_SET) {
                    player.name = userId;
                }
                players.push(player);
            });
            return players;
        }

        /**
         * @param initialSoldierCount number of solders to place at each temple location initially
         */
        function setupTemples(initialSoldierCount, regions) {

            const homes = findHomeRegions(regions);

            setupPlayersWithTheirTemples(players, homes);
            setupNeutralTemples(players, homes, regions);

            // we have the regions, set up each player
            function setupPlayersWithTheirTemples(players, homes) {
                players.map(function(player, playerIndex) {
                    // give the players some cash (or not)
                    gameState.cash[playerIndex] = 0;
                    const region = homes[playerIndex];
                    // make one of the regions your own
                    gameState.owners[region.index] = playerIndex;
                    // put a temple and 3 soldiers in it
                    putTemple(region, initialSoldierCount);
                });
            }

            function setupNeutralTemples(players, homes, regions) {
                let distancesToTemples = homes.map(function() { return 0; });
                const templeRegions = [];
                const neutralTempleCount = [3, 3, 4][players.length - 2];

                utils.range(0, neutralTempleCount).map(function() {
                    const bestRegion = sequenceUtils.max(regions, function(region) {
                        return templeScore(region);
                    });

                    putTemple(bestRegion, initialSoldierCount);

                    templeRegions.push(bestRegion);
                    distancesToTemples = updatedDistances(bestRegion);
                });

                function templeScore(newTemple) {
                    if (sequenceUtils.contains(templeRegions, newTemple))
                        return -100;

                    const updated = updatedDistances(newTemple);
                    const inequality = sequenceUtils.max(updated) - sequenceUtils.min(updated);
                    let templeDistances = distanceScore(templeRegions.concat(homes).concat(newTemple), regions);
                    if (!templeDistances)
                        templeDistances = -5;

                    return templeDistances - inequality;
                }

                function updatedDistances(newTempleRegion) {
                    return homes.map(function(home, index) {
                        return distancesToTemples[index] + home.distanceFrom(newTempleRegion, regions);
                    });
                }
            }
        }

        // pick regions that are as far away as possible from each other for the players' initial temples
        function findHomeRegions(regions) {
            const possibleSetups = utils.range(0, 1000).map(function() {
                return players.map(() => regions[utils.rint(0, regions.length)]);
            });
            return sequenceUtils.max(possibleSetups, regionSetup => distanceScore(regionSetup, regions));
        }

        function putTemple(region, soldierCount) {
            const regionIndex = region.index;
            gameState.temples[regionIndex] = new Temple({ regionIndex });
            gameState.addSoldiers(regionIndex, soldierCount);
        }
    }

    return my;
}(erisk || {}));
