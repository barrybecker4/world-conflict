var erisk = (function(my) {

    /**
     * Takes an existing state and a move, and returns a new game state with the move applied.
     * The object returned is a copy, and the original is left untouched.
     *
     * Furthermore, this will show the move being applied visually. That means
     * that the move must deterministically define the transition.
     *
     * @param state an existing game state
     * @param move the move to be applied by the active players
     * @returns {GameState} the game state after this move
     */
    my.makeMove = function(state, move) {
        const newState = state.copy();

        if (CONSTS.DEBUG) {
            console.log("Making move: " + move.type + " for player " + newState.activePlayer().getName());
        }
        if (move.isArmyMove()) {
            moveSoldiers(newState, move);
        } else if (move.isBuildMove()) {
            buildUpgrade(newState, move.regionIndex, move.upgradeIndex);
        } else if (move.isEndMove()) {
            nextTurn(newState);
        } else if (move.isResignationMove()) {
            eliminatePlayer(newState);
            nextTurn(newState);
        } else {
            throw new Error("Unexpected move: " + move);
        }

        return afterMoveChecks(newState);
    }

    // If there is a fight while moving, then add the fight sequence to the move.
    function moveSoldiers(state, move) {
        // avoid input while playing movement/fight (if on client)
        if (appState && !appState.isWaitingForPlayersToMove()) {
             appState.setWaitingForPlayersToMove();
        }
        const fromRegion = move.source;
        const toRegion = move.destination;
        const incomingSoldiers = move.count;
        const fromList = state.soldiersAtRegion(fromRegion);
        const toList = state.soldiersAtRegion(toRegion);
        const numDefenders = toList.length;

        const remainingSoldiers = move.attackSequence ?
            showFight(state, fromRegion, toRegion, fromList, toList, incomingSoldiers, move.attackSequence) :
            incomingSoldiers;

        if (remainingSoldiers > 0) {
            moveRemainingSoldiers(state, fromRegion, toRegion, fromList, toList, remainingSoldiers, numDefenders);
        }

        state.movesRemaining--;
    }

    // Show the fight using the attackSequence that was generated on the server.
    function showFight(state, fromRegion, toRegion, fromList, toList, incomingSoldiers, attackSequence) {
        state.undoDisabled = true; // fights cannot be undone
        showSoldiersMovedHalfway(state, incomingSoldiers, fromList, toRegion);

        attackSequence.forEach(function(frame) {
            incomingSoldiers = showStepInAttackSequence(frame, state, incomingSoldiers, fromList, toList, toRegion);
        });

        // are there defenders left?
        if (toList.length) {
            incomingSoldiers = 0; // prevent anybody from moving in
            showDefended(state, toRegion);
        }

        resetAttackStatus(fromList);
        return incomingSoldiers;
    }

    function showStepInAttackSequence(frame, state, incomingSoldiers, fromList, toList, toRegion) {
        if (frame.attackerCasualties) {
            const casualtiesToProcess = Math.min(frame.attackerCasualties, fromList.length);
            if (casualtiesToProcess > 0) {
                fromList.splice(0, casualtiesToProcess);  // Remove from start
                incomingSoldiers -= casualtiesToProcess;
            }
        }
        else if (frame.defenderCasualties) {
            const toOwner = state.owner(toRegion);
            utils.range(0, frame.defenderCasualties).map(() => toList.shift());
            if (toOwner && frame.martyrBonus) {
                state.cash[toOwner.index] += frame.martyrBonus;
            }
        }
        battleAnimationKeyframe(state, frame.delay, frame.soundCue, frame.floatingText);
        return incomingSoldiers
    }

    function showDefended(state, toRegion) {
        const toOwner = state.owner(toRegion);
        state.soundCue = CONSTS.SOUNDS.DEFEAT;
        const color = toOwner ? toOwner.highlightStart : '#fff';
        state.floatingText = [
            { regionIdx: toRegion, color, text: "Defended!", width: 7 }
        ];
    }

    // move the soldiers halfway for animation
    function showSoldiersMovedHalfway(state, incomingSoldiers, fromList, toRegion) {
        if (!state.simulatingPlayer) {
            fromList.slice(0, incomingSoldiers)
                .map(soldier => {
                    soldier.attackedRegion = gameData.regions[toRegion].index;
                });
        }
        battleAnimationKeyframe(state);
    }

    // Reset "attacking status" on the soldiers.
    // They have either moved back to the source region or occupy the destination.
    function resetAttackStatus(fromList) {
        fromList.map(function(soldier) {
            delete soldier.attackedRegion;
        });
    }

    // move the (remaining) soldiers into the toRegion
    function moveRemainingSoldiers(state, fromRegion, toRegion, fromList, toList, incomingSoldiers, numDefenders) {

        const fromOwner = state.owner(fromRegion);
        const toOwner = state.owner(toRegion);

        if (fromList.length < incomingSoldiers) {
            throw new Error("We are trying to move " + incomingSoldiers + " from " + fromRegion + " to " +
                toRegion + " but there are only:" + JSON.stringify(fromList));
        }
        utils.range(0, incomingSoldiers).map(() => toList.push(fromList.shift()));

        // if this didn't belong to us, it now does
        if (fromOwner !== toOwner) {
            conquerRegion(fromOwner, toOwner, toRegion, numDefenders, state);
        }
    }

    function conquerRegion(fromOwner, toOwner, toRegion, numDefenders, state) {
        state.owners[toRegion] = fromOwner.index;
        // mark as conquered to prevent moves from this region in the same turn
        state.conqueredRegions = (state.conqueredRegions || []).concat(toRegion);
        // if there was a temple, reset its upgrades
        const temple = state.temples[toRegion];
        if (temple) {
            delete temple.upgradeIndex;
        }
        // play sound, launch particles!
        state.particleTempleRegion = gameData.regions[toRegion].index;
        const color = fromOwner.highlightStart;
        state.floatingText = [{regionIdx: toRegion, color, text: "Conquered!", width: 7}];
        state.soundCue = numDefenders ? CONSTS.SOUNDS.VICTORY : CONSTS.SOUNDS.TAKE_OVER;
    }

    function battleAnimationKeyframe(state, delay, soundCue, floatingTexts) {
        if (isOnServer(state)) return;

        const keyframe = state.copy();
        keyframe.soundCue = soundCue;
        keyframe.floatingText = floatingTexts;
        erisk.oneAtaTime(delay || 500, () => erisk.gameRenderer.updateDisplay(keyframe));
    }

    function buildUpgrade(state, regionIndex, upgradeIndex) {
        const upgrade = CONSTS.UPGRADES[upgradeIndex];
        const temple = state.temples[regionIndex];
        const templeOwner = state.owner(regionIndex);

        if (!templeOwner) {
            console.log("Warning: Attempted to build upgrade at unowned region " + regionIndex);
            return;
        }

        if (upgrade.name === CONSTS.UPGRADES.SOLDIER.name) {
            buySoldier(state, templeOwner, upgrade, regionIndex);
        }
        else if (upgrade.name === CONSTS.UPGRADES.REBUILD.name) {
            delete temple.upgradeIndex; // remove current upgrade
        }
        else upgradeTemple(state, temple, templeOwner, upgrade);
    }

    // soldiers work differently - they get progressively more expensive the more you buy in one turn
    function buySoldier(state, templeOwner, upgrade, regionIndex) {
        if (!state.numBoughtSoldiers)
            state.numBoughtSoldiers = 0;
        state.cash[templeOwner.index] -= upgrade.cost[state.numBoughtSoldiers++];
        state.addSoldiers(regionIndex, 1);
    }

    function upgradeTemple(state, temple, templeOwner, upgrade) {
        if (!temple.upgradeIndex || CONSTS.UPGRADES[temple.upgradeIndex].name !== upgrade.name) { // virgin upgrade
            temple.upgradeIndex = upgrade.index;
            temple.level = 0;
        }
        else temple.level++; // upgrade to a higher level

        // you have to pay for it, unfortunately
        state.cash[templeOwner.index] -= upgrade.cost[temple.level];

        // particles to celebrate upgrading!
        state.particleTempleRegion = gameData.regions[temple.regionIndex].index;

        // the AIR upgrade takes effect immediately
        if (upgrade.name === CONSTS.UPGRADES.AIR.name)
            state.movesRemaining++;
    }

    function nextTurn(state) {
        const player = state.activePlayer();

        const playerIncome = state.income(player, gameData.aiLevel);
        state.cash[player.index] += playerIncome;

        if (playerIncome) {
            state.floatingText = [{
                regionIdx: state.templesForPlayer(player)[0].regionIndex,
                text: "+" + playerIncome + "&#9775;",
                color: '#fff',
                width: 5
            }];
        }

        generateSoldersAtTemples(state, player);
        const upcomingPlayer = findNextPlayer(state);

        // did the game end by any chance?
        if (state.turnIndex > gameData.turnCount) {
            endTheGame(state);
        }
        else if (!isOnServer(state)) {
            // if this is not simulated (as during search), we'd like a "next turn" banner
            erisk.gameRenderer.showPlayerBanner(state.activePlayer());
        }
    }

    function eliminatePlayer(state) {
        const player = state.activePlayer();
        console.log("Player " + player.getName() + " was eliminated! ");
        updateEliminatedPlayer(player, state);
    }

    // temples produce one soldier per turn automatically
    function generateSoldersAtTemples(state, player) {
        utils.forEachProperty(state.temples, (temple) => {
            if (state.isOwnedBy(temple.regionIndex, player)) {
                // this is our temple, add a soldier to the temple's element
                state.addSoldiers(temple.regionIndex, 1);
            }
        });
    }

    // go to next player (skipping dead ones)
    function findNextPlayer(state) {
        let upcomingPlayer;
        do {
            upcomingPlayer = state.advanceToNextPlayer();
        } while (!state.regionCount(upcomingPlayer));
        return upcomingPlayer;
    }

    function endTheGame(state) {
       state.turnIndex = gameData.turnCount;
       state.endResult = determineGameWinner(state);
    }

    function determineGameWinner(state) {
        const pointsFn = player => (1000 * state.regionCount(player) + state.totalSoldiers(player));
        const winner = sequenceUtils.max(gameData.players, pointsFn);
        const otherPlayers = gameData.players.filter(function(player) { return player !== winner; });
        const runnerUp = sequenceUtils.max(otherPlayers, pointsFn);

        return (pointsFn(winner) !== pointsFn(runnerUp)) ? winner : CONSTS.DRAWN_GAME;
    }

    // Updates that happen after each move (checking for players losing, etc.)
    function afterMoveChecks(state) {
        updatePlayerRegions(state);

        // do we still have more than one player?
        const gameStillOn = gameData.players.filter(player => state.regionCount(player)).length > 1;
        if (!gameStillOn) {
            // oh gosh, it's done - by elimination!
            state.endResult = determineGameWinner(state);
        }
        return state;
    }

    // update region ownership and notify if any players are eliminated
    function updatePlayerRegions(state) {
        gameData.players.map((player) => {
            const totalSoldiers = sequenceUtils.sum(gameData.regions, function(region) {
                return state.isOwnedBy(region, player) ? state.soldierCount(region) : 0;
            });
            if (!totalSoldiers && !gameData.eliminatedPlayers[player.index]) {
                console.log("Player " + player.getName() + " lost!   isOnServer = " + isOnServer(state));
                updateEliminatedPlayer(player, state);
            }
        });
    }

    function updateEliminatedPlayer(player, state) {
        utils.forEachProperty(state.owners, (ownerIdx, regionIdx) => {
            if (player.index === gameData.players[ownerIdx].index)
                delete state.owners[regionIdx];
        });
        // dead people get no more moves
        if (state.activePlayer() === player) {
            state.movesRemaining = 0;
        }
        notifyOfPlayerElimination(player, state);
    }

    // show the world the good (or bad) news
    function notifyOfPlayerElimination(player, state) {
        if (!isOnServer(state) && !gameData.eliminatedPlayers[player.index]) {
            gameData.eliminatedPlayers[player.index] = true; // lost!
            erisk.oneAtaTime(CONSTS.MOVE_DELAY, () => erisk.gameRenderer.updateDisplay(state));
            erisk.gameRenderer.showBanner('#222', player.getName() + " has been eliminated!", 1000);
        }
    }

    function isOnServer(state) {
        return state.simulatingPlayer || !erisk.gameRenderer;
    }

    return my;
}(erisk || {}));
