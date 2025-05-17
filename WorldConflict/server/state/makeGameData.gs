var erisk = (function(my) {

    /**
     * Create a new game state, regions, and players based on setup configuration.
     * Update regions and players in the global gameData.
     *
     * @param setup the new setup configuration from the user
     * @param keepCurrentMap if true, then do not generate new map
     * @return fully fleshed out gameData
     */
    my.makeNewGameData = function(setup, keepCurrentMap) {
        const userId = getUserId();
        return createNewGameData(setup, keepCurrentMap, userId);
    }

    /**
     * Seat the specified player at the specified game at the specified position.
     * Set the status to either "waitingForPlayers" or "readyToStart"
     * depending on whether there are still open slots after this player is seated.
     */
    my.seatPlayerAtExistingGame = function(openGameId, playerPosition, userId) {
        const game = gameConfigurationTable.getGameConfiguration(openGameId).obj;
        Logger.log(`About to seat player ${userId} at pos=${playerPosition} for game id ${game.gameId}`);
        Logger.log("existing game players = " + JSON.stringify(game.players));
        const player = game.players[playerPosition];
        if (player.type !== CONSTS.PLAYER_HUMAN_OPEN) {
            throw new Error(`Sorry - another player (${player.name}) sat there first! seat status = ${player.type}`);
        }
        player.name = userId;
        player.type = CONSTS.PLAYER_HUMAN_SET;
        gameData = gameConfigurationTable.upsert(game);

        return my.addStatus(gameData);
    }

    /**
     * If the player (userId) is already seated at an open game, then
     * they should be unseated because a user can only be seated at one game.
     * If this is the only player at the game and they are leaving, then the game will be deleted.
     */
    function unseatFromOpenGames(userId) {
        // get all open games where this player is seated
        const gameDataDocs = gameConfigurationTable.getOpenGameConfigurations();
        const openGames = gameConfigurationTable.availableOpenGamesWhereSeated(gameDataDocs, userId);

        openGames.forEach(game => unseatPlayerFromOpenGame(userId, game));
    }

    /**
     * Given an existing open game with at least one open human player slot and the specified player seated there,
     * remove that player so that their spot becomes open. Persist the new state.
     */
    my.unseatPlayerFromOpenGameById = function(userId, openGameId) {
        const openGameConfig = gameConfigurationTable.getGameConfiguration(openGameId);
        if (openGameConfig) {
            console.log("Unseating " + openGameId)
            const openGame = openGameConfig.obj;
            unseatPlayerFromOpenGame(userId, openGame);
        } else {
            console.log("Could not find game config for " + openGameId);
        }
    }

    function unseatPlayerFromOpenGame(userId, openGame) {
        Logger.log("Unseating player " + userId + " from open game " + openGame.gameId);
        unseatPlayer(openGame.players, userId);
        // Delete if this is not an active game, otherwise update it
        if  (gameConfigurationTable.getNumSeatedPlayers(openGame) == 0) {
            gameConfigurationTable.deleteGameConfiguration(openGame.gameId);
        } else {
            gameData = gameConfigurationTable.upsert(openGame);
        }
    }

    function unseatPlayer(players, userId) {
        const player = players.find(player => player.name === userId);
        if (player) {
            player.name = '';
            player.type = CONSTS.PLAYER_HUMAN_OPEN;
        } else {
            // This could happen if they click the "leave" button more than once before the page refreshes.
            console.log("Warning: Did not find player " + userId + " among " + JSON.stringify(players));
        }
    }

    /**
     * Add a status enum to the passed gameData.
     * @returns updated gameData
     */
    my.addStatus = function(gameData) {
        const stillHasOpenSpots = gameData.players.some(p => p.type === CONSTS.PLAYER_HUMAN_OPEN);
        gameData.status = stillHasOpenSpots ? CONSTS.WAITING_FOR_PLAYERS : CONSTS.READY_TO_START;
        return gameData;
    }

    /**
     * Create new gameData given setup information.
     */
    function createNewGameData(setup, keepCurrentMap, userId) {
        let gameState = new GameState({
            turnIndex: 1,
            playerIndex: 0,
            movesRemaining: CONSTS.BASE_MOVES_PER_TURN,
        });

        const oldNumPlayers = ((gameData.players && gameData.players.length) || 0);
        const players = createPlayers(setup);

        // we cannot keep the old map if the number of players has changed.
        keepCurrentMap = keepCurrentMap && players.length === oldNumPlayers;

        gameData.players = players;
        if (!keepCurrentMap) {
            const regions = new FastMapGenerator().generateMap(players.length, setup.mapSize);
            setupTemples(3, regions);
            gameData.regions = regions;
            gameData.initialGameState = gameState;
        }
        gameData.aiLevel = setup.aiLevel;
        gameData.turnCount = setup.turnCount;
        gameData.humanTimeLimit = setup.humanTimeLimit;
        gameData.mapSize = setup.mapSize;
        gameData.status = CONSTS.WAITING;

        return gameData;

        function createPlayers(setup) {
            const players = [];

            setup.playerTypes.map(function(playerType, playerIndex) {
                if (playerType === CONSTS.PLAYER_OFF) {
                    return;
                }
                const player = utils.deepCopy(CONSTS.PLAYERS[playerIndex], 1);

                if (playerType === CONSTS.PLAYER_AI) {
                    player.personality = utils.rint(1, CONSTS.AI_PERSONALITIES.length);
                }

                player.index = players.length;
                player.type = setup.playerTypes[playerIndex];
                const playerFromGameData = getPlayerFromGameData(playerIndex);

                if (player.type === CONSTS.PLAYER_HUMAN_SET) {
                    player.name = (playerFromGameData && playerFromGameData.name) || userId;
                }
                if (player.type === CONSTS.PLAYER_HUMAN_OPEN && playerFromGameData && playerFromGameData.name) {
                    // if the gameData has a name for this player,
                    // then someone has joined for this open slot and we want to preserve that.
                    player.type = CONSTS.PLAYER_HUMAN_SET;
                    player.name = playerFromGameData.name;
                }
                players.push(player);
            });
            return players;

            /** @return the corresponding player from the gameData if there is one, else null */
            function getPlayerFromGameData(playerIndex) {
                if (gameData.players) {
                    return gameData.players.find(p => p.originalIndex === playerIndex);
                }
                return null;
            }
        }

        /**
         * @param initialSoldierCount number of solders to place at each temple location initially
         */
        function setupTemples(initialSoldierCount, regions) {

            const homes = my.findHomeRegions(players, regions);

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
                    let templeDistances = my.distanceScore(templeRegions.concat(homes).concat(newTemple), regions);
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

        function putTemple(region, soldierCount) {
            const regionIndex = region.index;
            gameState.temples[regionIndex] = new Temple({ regionIndex });
            gameState.addSoldiers(regionIndex, soldierCount);
        }
    }

    /**
     * @return player home regions that are as far away as possible from each other
     *         based on players' initial temples.
     */
    my.findHomeRegions = function(players, regions, numSetupsToTry) {
        //checkForNullRegions(regions);
        if (regions.length == 0) {
            throw new Error("No regions!");
        }
        //console.log("orig regions = " + regions.map(r => r ? r.toString() : 'null').join("\n"));
        let regionIndices = utils.range(0, regions.length);
        let numSetups = numSetupsToTry ? numSetupsToTry : 10;

        const possibleSetups = utils.range(0, numSetups).map(() => {
            regionIndices = sequenceUtils.shuffle(regionIndices);
            regionSetup =  players.map((player, i) => regions[regionIndices[i]]);
            return regionSetup
        });
        return sequenceUtils.max(possibleSetups, regionSetup => my.distanceScore(regionSetup, regions));
    }

    my.distanceScore = function(regions, allRegions) {
        checkForNullRegions(regions);
        const allPairs = sequenceUtils.pairwise(regions, Region.distance, allRegions);
        return sequenceUtils.min(allPairs);
    }

    function checkForNullRegions(regions) {
        let regionNull = false;
        regions.forEach(region => {
            if (!region) {
                regionNull = true;
            }
        });
        if (regionNull)
            throw new Error("Some regions were null:\n" + regions.map(r => r ? r.toString() : 'null').join("\n"));
    }

    return my;
}(erisk || {}));
