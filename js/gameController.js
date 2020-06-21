import audio from './utils/audio.js';
import utils from './utils/utils.js';
import sequenceUtils from './utils/sequenceUtils.js';
import oneAtaTime from './utils/oneAtaTime.js';
import gameData from './state/gameData.js';
import undoManager from './state/undoManager.js';
import appState from './state/appState.js';
import gameRenderer from './rendering/gameRenderer.js';
import gameInitialization from './gameInitialization.js';
import aiPlay from './server/aiPlay.js';
import { Move, ArmyMove, BuildMove, EndMove } from './state/model/Move.js';
import UPGRADES from './state/model/UPGRADES.js';
const $ = utils.$

// All the game logic that runs in main loop resides in this module.

var uiCallbacks = {};

// Deals with responding to user actions.
export default {
    playOneMove,
    makeMove,
    invokeUICallback,
    uiPickMove,
    oneAtaTime,
    uiCallbacks,
};


function playOneMove(state) {

    appState.setInGame(true); // playing the game now

    oneAtaTime(150, function() {
        var controllingPlayer = state.activePlayer();

        // let the player pick their move using UI or AI
        pickMove(controllingPlayer, state, function(move) {
            // AI makes sounds when playing
            if (controllingPlayer.pickMove == aiPlay.aiPickMove)
                audio.playSound(audio.sounds.CLICK);

            // the move is chosen - update state to a new immutable copy
            var newState = makeMove(state, move);

            if (newState.endResult) { // did the game end?
                oneAtaTime(150, gameRenderer.updateDisplay.bind(0, newState));
                showEndGame(newState);
                return;
            } else {
                undoManager.setPreviousState(state.copy());
                // still more of the game to go - next move, please!
                setTimeout(playOneMove.bind(0, newState), 1);
            }
        });

        gameRenderer.updateDisplay(state);
    });
}

/**
 * Asks the UI (for humans) or the AI (for CPU players) to pick
 * the next move to make in the game. This happens asynchronously.
 *
 * @param player the player to move
 * @param state the state in which to make the move
 * @param reportMoveCallback should be called with the desired move as parameter once the decision is made
 */
function pickMove(player, state, reportMoveCallback) {
    // automatically end the turn of dead players
    if (!state.regionCount(player))
        return reportMoveCallback(new EndMove());

    // delegate to whoever handles this player
    player.pickMove(player, state, reportMoveCallback);
}


/**
 * Takes an existing state and a move, and returns a new game state with the move
 * already applied. The object returned is a copy and the original is left untouched.
 *
 * @param state an existing game state
 * @param move the move to be applied by the active players
 * @returns {GameState} the game state after this move
 */
function makeMove(state, move) {
    const newState = state.copy();

    if (move.isArmyMove()) {
        moveSoldiers(newState, move.source, move.destination, move.count);
    } else if (move.isBuildMove()) {
        buildUpgrade(newState, move.region, move.upgrade);
    } else if (move.isEndMove()) {
        nextTurn(newState);
    } else {
        throw new Error("Unexpected move: " + move);
    }

    // updates that happen after each move (checking for players losing, etc.)
    afterMoveChecks(newState);

    return newState;
}

/**
 * This is the handler that gets attached to most DOM elements.
 * Delegation through UI callbacks allows us to react differently depending on game-state.
 */
function invokeUICallback(object, type, event) {
    var callback = uiCallbacks[type];
    if (callback) {
        audio.playSound(audio.sounds.CLICK);
        callback(object);
    }
    if (event.target.href && event.target.href != "#")
        return 1;

    event.stopPropagation();
    return 0;
}

/**
 * This is one of the "player controller" methods - the one that is responsible for picking a move for a player.
 * It does  that using a human and some UI, and calls reportMoveCallback with an object describing the move once
 * it is decided
 */
var uiState = {};
function uiPickMove(player, state, reportMoveCallback) {

    uiCallbacks.regionSelected = function(region) {
        if (!region || state.moveDecision.isBuildMove())
            setCleanState();

        if (!state.moveDecision.source && region) {
            // no move in progress - start a new move if this is legal
            if (state.regionHasActiveArmy(player, region)) {
                setCleanState();
                state.moveDecision = new ArmyMove(null, null, null, region, null, state.soldierCount(region));
                state.moveDecision.buttons[0].h = 0;
                state.moveDecision.h = region.neighbors.concat(region);
            }
        } else if (region) {
            // we already have a move in progress
            var moveDecision = state.moveDecision;
            // what region did we click?
            if (region == moveDecision.source) {
                // the one we're moving an army from - tweak soldier count
                moveDecision.count = moveDecision.count % state.soldierCount(region) + 1;
            } else if (moveDecision.source.neighbors.indexOf(region) > -1) {
                // one of the neighbours - let's finalize the move
                uiCallbacks = {};
                moveDecision.destination = region;
                return reportMoveCallback(moveDecision);
            } else {
                // some random region - cancel move
                setCleanState();
            }
        }
        gameRenderer.updateDisplay(state);
    };

    uiCallbacks.templeSelected = function(region) {
        var temple = state.temples[region.index];
        state.moveDecision = new BuildMove(null, temple, makeUpgradeButtons(temple));
        gameRenderer.updateDisplay(state);
    };

    uiCallbacks.soldierSelected = function(soldier) {
        // delegate to the region click handler, after finding out which region it is
        var soldierRegion = null;
        utils.map(state.regions, function(region) {
            if (sequenceUtils.contains(state.soldiers[region.index], soldier))
                soldierRegion = region;
        });
        if (soldierRegion)
            uiCallbacks.regionsSelected(soldierRegion);
    };

    uiCallbacks.build = function(which) {
        if (state.moveDecision && state.moveDecision.isBuildMove()) {
            // build buttons handled here
            if (which >= UPGRADES.length) {
                setCleanState();
            } else {
                // build an upgrade!
                state.moveDecision.upgrade = UPGRADES[which];
                // if its a soldier, store UI state so it can be kept after the move is made
                if (state.moveDecision.upgrade === UPGRADES.SOLDIER)
                    uiState[player.index] = state.moveDecision.region;
                // report the move
                reportMoveCallback(state.moveDecision);
            }
        } else {
            // move action buttons handled here
            if (which === 1) {
                // end turn
                uiCallbacks = {};
                reportMoveCallback(new EndMove());
            } else {
                // cancel move
                setCleanState();
            }
        }
    };

    uiCallbacks.undo = function() {
        undoManager.performUndo(state);
    };

    setCleanState();
    if (uiState[player.index]) {
        uiCallbacks.templeSelected(uiState[player.index]);
        delete uiState[player.index];
    }

    function setCleanState() {  // maybe move first two lines to method on state
        state.moveDecision = new Move();
        state.moveDecision.h = state.regions.filter(region => state.regionHasActiveArmy(player, region));
        gameRenderer.updateDisplay(state);
    }

    function makeUpgradeButtons(temple) {
        var templeOwner = state.owner(temple.region);
        var upgradeButtons = utils.map(UPGRADES, function(upgrade) {
            // current upgrade level (either the level of the temple or number of soldiers bought already)
            var level = (temple.upgrade == upgrade) ? (temple.level + 1) : ((upgrade === UPGRADES.SOLDIER) ? (state.move.h || 0) : 0);

            var cost = upgrade.cost[level];
            var text = utils.template(upgrade.name, gameData.LEVELS[level]) + utils.elem('b', {}, " (" + cost + "&#9775;)");
            var description = utils.template(upgrade.desc, upgrade.level[level]);

            var hidden =
                (upgrade === UPGRADES.RESPECT && (!temple.upgrade)) // respect only available if temple is upgraded
                || (temple.upgrade && temple.upgrade != upgrade && upgrade != UPGRADES.SOLDIER && upgrade != UPGRADES.RESPECT) // the temple is already upgraded with a different upgrade
                || (level >= upgrade.cost.length) // highest level reached
                || (level < state.rawUpgradeLevel(templeOwner, upgrade)) // another temple has this upgrade already
                || (templeOwner != player); // we're looking at an opponent's temple

            return {t: text, d: description, o: cost > state.cashForPlayer(player), h: hidden};
        });
        upgradeButtons.push({t: "Done"});
        return upgradeButtons;
    }
}

function afterMoveChecks(state) {
    // check for game loss by any of the players
    utils.map(state.players, function(player) {
        var totalSoldiers = sequenceUtils.sum(state.regions, function(region) {
            return state.owner(region) == player ? state.soldierCount(region) : 0;
        });
        if (!totalSoldiers && state.regionCount(player)) {
            // lost!
            utils.forEachProperty(state.owners, function(p, r) {
                if (player == p)
                    delete state.owners[r];
            });
            // dead people get no more moves
            if (state.activePlayer() == player)
                state.move.movesRemaining = 0;
            // show the world the good (or bad) news
            if (!state.simulatingPlayer) {
                oneAtaTime(150, gameRenderer.updateDisplay.bind(0, state));
                gameRenderer.showBanner('#222', player.name + " has been eliminated!", 900);
            }
        }
    });

    // do we still have more than one player?
    var gameStillOn = state.players.filter(player => state.regionCount(player)).length > 1;
    if (!gameStillOn) {
        // oh gosh, it's done - by elimination!
        state.endResult = determineGameWinner(state);
        return;
    }
}


function moveSoldiers(state, fromRegion, toRegion, incomingSoldiers) {
    var fromList = state.soldiers[fromRegion.index];
    var toList = state.soldiers[toRegion.index] || (state.soldiers[toRegion.index] = []);
    var fromOwner = state.owner(fromRegion);
    var toOwner = state.owner(toRegion);

    // do we have a fight?
    if (fromOwner != toOwner) {   // move to separate method
        var defendingSoldiers = toList.length;

        // earth upgrade - preemptive damage on defense
        var preemptiveDamage = sequenceUtils.min([incomingSoldiers, state.upgradeLevel(toOwner, UPGRADES.EARTH)]);
        var invincibility = state.upgradeLevel(fromOwner, UPGRADES.FIRE);

        if (preemptiveDamage || defendingSoldiers) {
            // there will be a battle - move the soldiers halfway for animation
            if (!state.simulatingPlayer) {
                utils.map(fromList.slice(0, incomingSoldiers), function (soldier) {
                    soldier.attackedRegion = toRegion;
                });
            }
            battleAnimationKeyframe(state);
        }

        if (preemptiveDamage) {
            // animate it
            battleAnimationKeyframe(state, 50, audio.audioOursDead,
                [{soldier: fromList[0], text: "Earth kills " + preemptiveDamage + "!", color: UPGRADES.EARTH.b, weight: 9}]
            );
            // apply it
            utils.map(utils.range(0, preemptiveDamage), function () {
                fromList.shift();
                incomingSoldiers--;
            });
            battleAnimationKeyframe(state);
        }

        // if there is still defense and offense, let's have a fight
        if (defendingSoldiers && incomingSoldiers) {
            // at this point, the outcome becomes random - so you can't undo your way out of it
            state.u = 1;

            var incomingStrength = incomingSoldiers * (1 + state.upgradeLevel(fromOwner, UPGRADES.FIRE) * 0.01);
            var defendingStrength = defendingSoldiers * (1 + state.upgradeLevel(toOwner, UPGRADES.EARTH) * 0.01);

            var repeats = sequenceUtils.min([incomingSoldiers, defendingSoldiers]);
            var attackerWinChance = 100 * Math.pow(incomingStrength / defendingStrength, 1.6);

            function randomNumberForFight(index) {
                var maximum = 120 + attackerWinChance;
                if (state.simulatingPlayer) {
                    // Simulated fight - return some numbers
                    // They're clustered about the center of the range to make the AI more "decisive"
                    // (this exaggerates any advantage)
                    return (index + 3) * maximum / (repeats + 5);
                } else {
                    // Not a simulated fight - return a real random number.
                    // We're not using the full range 0 to maximum to make sure that randomness doesn't
                    // give a feel-bad experience when we attack with a giant advantage
                    return utils.rint(maximum * 0.12, maximum * 0.88);
                }
            }

            utils.map(utils.range(0, repeats), function(index) {
                if (randomNumberForFight(index) <= 120)
                {
                    // defender wins!
                    if (invincibility-- <= 0) {
                        fromList.shift();
                        incomingSoldiers--;
                        battleAnimationKeyframe(state, 250, audio.audioOursDead);
                    } else {
                        battleAnimationKeyframe(state, 800, audio.audioOursDead,
                            [{soldier: fromList[0], text: "Protected by Fire!", color: UPGRADES.FIRE.b, weight: 11}]
                        );
                    }
                } else {
                    // attacker wins, kill defender and pay the martyr bonus
                    toList.shift();
                    if (toOwner)
                        state.cash[toOwner.index] += 4;
                    battleAnimationKeyframe(state, 250, audio.sounds.ENEMY_DEAD);
                }
            });

            // are there defenders left?
            if (toList.length) {
                // and prevent anybody from moving in
                incomingSoldiers = 0;
                state.soundCue = audio.sounds.DEFEAT;
                state.floatingText = [{region: toRegion, color: toOwner ? toOwner.highlightStart : '#fff', text: "Defended!", weight: 7}];
            }
        }

        // reset "attacking status" on the soldiers - at this point they will
        // move back to the source region or occupy the destination
        utils.map(fromList, function(soldier) {
            soldier.attackedRegion = null; // 0;
        });
    }

    if (incomingSoldiers > 0) {
        // move the (remaining) soldiers
        utils.map(utils.range(0, incomingSoldiers), function() {
            toList.push(fromList.shift());
        });

        // if this didn't belong to us, it now does
        if (fromOwner != toOwner) {
            state.owners[toRegion.index] = fromOwner;
            // mark as conquered to prevent moves from this region in the same turn
            state.move.z = (state.move.z || []).concat(toRegion);
            // if there was a temple, reset its upgrades
            var temple = state.temples[toRegion.index];
            if (temple)
                delete temple.upgrade;
            // play sound, launch particles!
            state.prt = toRegion;
            state.floatingText = [{region: toRegion, color: fromOwner.highlightStart, text: "Conquered!", weight: 7}];
            state.soundCue = defendingSoldiers ? audio.sounds.VICTORY : audio.sounds.TAKE_OVER;
        }
    }

    state.move.movesRemaining--;
}


function battleAnimationKeyframe(state, delay, soundCue, floatingTexts) {
    if (state.simulatingPlayer) return;
    const keyframe = state.copy();
    keyframe.soundCue = soundCue;
    keyframe.floatingText = floatingTexts;
    oneAtaTime(delay || 500, gameRenderer.updateDisplay.bind(0, keyframe));
}


function buildUpgrade(state, region, upgrade) {
    var temple = state.temples[region.index];
    var templeOwner = state.owner(region);

    if (upgrade === UPGRADES.SOLDIER) {
        // soldiers work differently - they get progressively more expensive the more you buy in one turn
        if (!state.move.h)
            state.move.h = 0;
        state.cash[templeOwner.index] -= upgrade.cost[state.move.h++];
        return state.addSoldiers(region, 1);
    }
    if (upgrade === UPGRADES.RESPECT) {
        // respecting is also different
        delete temple.upgrade;
        return;
    }

    // upgrade the temple
    if (temple.upgrade != upgrade) {
        // fresh level 1 upgrade!
        temple.upgrade = upgrade;
        temple.level = 0;
    } else {
        // upgrade to a higher level
        temple.level++;
    }

    // you have to pay for it, unfortunately
    state.cash[templeOwner.index] -= upgrade.cost[temple.level];

    // particles!  (prt = particalsTempleRegion?)
    state.prt = temple.region;

    // the AIR upgrade takes effect immediately
    if (upgrade == UPGRADES.AIR)
        state.move.movesRemaining++;
}


function nextTurn(state) {
    var player = state.activePlayer();

    // cash is produced
    var playerIncome = state.income(player);
    state.cash[player.index] += playerIncome;
    if (playerIncome) {
        state.floatingText = [{
            region: state.templesForPlayer(player)[0].region,
            text: "+" + playerIncome + "&#9775;",
            color: '#fff',
            weight: 5
        }];
    }

    // temples produce one soldier per turn automatically
    utils.forEachProperty(state.temples, function(temple, regionIndex) {
        if (state.owners[regionIndex] == player) {
            // this is our temple, add a soldier of the temple's element
            state.addSoldiers(temple.region, 1);
        }
    });

    // go to next player (skipping dead ones)
    do {
        var playerCount = state.players.length;
        var playerIndex = (state.move.playerIndex + 1) % playerCount, upcomingPlayer = state.players[playerIndex],
            turnNumber = state.move.turnIndex + (playerIndex ? 0 : 1);
        var numMoves = gameData.movesPerTurn + state.upgradeLevel(upcomingPlayer, UPGRADES.AIR);
        state.move = new ArmyMove(turnNumber, playerIndex, numMoves);
    } while (!state.regionCount(upcomingPlayer));

    // did the game end by any chance?
    if (state.move.turnIndex > gameInitialization.gameSetup.turnCount) {
        // end the game!
        state.move.turnIndex = gameInitialization.gameSetup.turnCount;
        state.endResult = determineGameWinner(state);
        return;
    }

    // if this is not simulated, we'd like a banner
    if (!state.simulatingPlayer) {
        // show next turn banner
        gameRenderer.showBanner(state.activePlayer().colorEnd, state.activePlayer().name + "'s turn");
    }
}

function determineGameWinner(state) {
    var pointsFn = player => state.regionCount(player);
    var winner = sequenceUtils.max(state.players, pointsFn);
    var otherPlayers = state.players.filter(function(player) { return player != winner; });
    var runnerUp = sequenceUtils.max(otherPlayers, pointsFn);

    return (pointsFn(winner) != pointsFn(runnerUp)) ? winner : gameData.DRAW_GAME;
}

function showEndGame(state) {
    oneAtaTime(1, function() {
        var winner = state.endResult;
        if (winner != gameData.DRAW_GAME) {
            gameRenderer.showBanner(winner.colorEnd, winner.name + " wins the game!");
        } else {
            gameRenderer.showBanner('#333', "The game ends in a draw!");
        }

        gameRenderer.updateDisplay(state);

        $('turn-count').innerHTML = "Game complete";
        $('in').innerHTML = utils.elem('p', {}, "Click the button below to start a new game.");
        $('in').style.background = '#555';
        $('mv').style.display = 'none';
        gameRenderer.updateButtons([ {t: "New game"} ]);

        uiCallbacks.build = gameInitialization.runSetupScreen;
    });
}