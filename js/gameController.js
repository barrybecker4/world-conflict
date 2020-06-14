import audio from './utils/audio.js';
import utils from './utils/utils.js';
import sequenceUtils from './utils/sequenceUtils.js';
import oneAtaTime from './utils/oneAtaTime.js';
import gameData from './state/gameData.js';
import undoManager from './state/undoManager.js';
import appState from './state/appState.js';
import gameRenderer from './rendering/gameRenderer.js';
import gameInitialization from './gameInitialization.js';
import aiPlay from './aiPlay.js';
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
    // we're playing the game now
    appState.setInGame(true);

    // oneAtaTime is used to ensure that all animations from previous moves complete before a new one is played
    oneAtaTime(150, function() {
        var controllingPlayer = state.activePlayer();

        // let the player pick their move using UI or AI
        pickMove(controllingPlayer, state, function(move) {
            // AI makes sounds when playing
            if (controllingPlayer.u == aiPlay.aiPickMove)
                audio.playSound(audio.sounds.CLICK);

            // the move is chosen - update state to a new immutable copy
            var newState = makeMove(state, move);
            // did the game end?
            if (newState.e) {
                // yes, the game has ended
                oneAtaTime(150, gameRenderer.updateDisplay.bind(0, newState));
                showEndGame(newState);
                return;
            } else {
                // remember state for undo purposes
                undoManager.setPreviousState(state.copy());
                // still more of the game to go - next move, please!
                setTimeout(playOneMove.bind(0, newState), 1);
            }
        });

        // update display before the move happens
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
        return reportMoveCallback({t: gameData.END_TURN});

    // delegate to whoever handles this player
    player.u(player, state, reportMoveCallback);
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

    var moveType = move.t;
    if (moveType == gameData.MOVE_ARMY) {
        moveSoldiers(newState, move.s, move.d, move.c);
    } else if (moveType == gameData.BUILD_ACTION) {
        buildUpgrade(newState, move.r, move.u);
    } else if (moveType == gameData.END_TURN) {
        nextTurn(newState);
    }

    // updates that happen after each move (checking for players losing, etc.)
    afterMoveChecks(newState);

    return newState;
}

// This is the handler that gets attached to most DOM elements.
// Delegation through UI callbacks allows us to react differently
// depending on game-state.
function invokeUICallback(object, type, event) {
    var cb = uiCallbacks[type];
    if (cb) {
        audio.playSound(audio.sounds.CLICK);
        cb(object);
    }
    if (event.target.href && event.target.href != "#")
        return 1;

    event.stopPropagation();
    return 0;
}

// This is one of the "player controller" methods - the one that
// is responsible for picking a move for a player. This one does
// that using a human and some UI, and calls reportMoveCallback
// with an object describing the move once its decided.
var uiState = {};
function uiPickMove(player, state, reportMoveCallback) {
    var cleanState = {
        b: [
            {t: 'Cancel move', h:1},
            {t: 'End turn'}
        ]
    };

    uiCallbacks.c = function(region) {
        if ((!region) || (state.d.t == gameData.BUILD_ACTION))
            setCleanState();

        if (!state.d.s && region) {
            // no move in progress - start a new move if this is legal
            if (state.regionHasActiveArmy(player, region)) {
                setCleanState();
                state.d.t = gameData.MOVE_ARMY;
                state.d.s = region;
                state.d.c = state.soldierCount(region);
                state.d.b[0].h = 0;
                state.d.h = region.n.concat(region);
            }
        } else if (region) {
            // we already have a move in progress
            var decisionState = state.d;
            // what region did we click?
            if (region == decisionState.s) {
                // the one we're moving an army from - tweak soldier count
                decisionState.c = decisionState.c % state.soldierCount(region) + 1;
            } else if (decisionState.s.n.indexOf(region) > -1) {
                // one of the neighbours - let's finalize the move
                uiCallbacks = {};
                decisionState.d = region;
                return reportMoveCallback(decisionState);
            } else {
                // some random region - cancel move
                setCleanState();
            }
        }
        gameRenderer.updateDisplay(state);
    };

    uiCallbacks.t = function(region) {
        var temple = state.t[region.i];
        state.d = {
            t: gameData.BUILD_ACTION,
            w: temple, r: region,
            b: makeUpgradeButtons(temple)
        };
        gameRenderer.updateDisplay(state);
    };

    uiCallbacks.s = function(soldier) {
        // delegate to the region click handler, after finding out which region it is
        var soldierRegion = null;
        utils.map(state.r, function(region) {
            if (sequenceUtils.contains(state.s[region.i], soldier))
                soldierRegion = region;
        });
        if (soldierRegion)
            uiCallbacks.c(soldierRegion);
    };

    uiCallbacks.b = function(which) {
        if (state.d && state.d.t == gameData.BUILD_ACTION) {
            // build buttons handled here
            if (which >= gameData.UPGRADES.length) {
                setCleanState();
            } else {
                // build an upgrade!
                state.d.u = gameData.UPGRADES[which];
                // if its a soldier, store UI state so it can be kept after the move is made
                if (state.d.u == gameData.SOLDIER)
                    uiState[player.i] = state.d.r;
                // report the move
                reportMoveCallback(state.d);
            }
        } else {
            // move action buttons handled here
            if (which == 1) {
                // end turn
                uiCallbacks = {};
                reportMoveCallback({t: gameData.END_TURN});
            } else {
                // cancel move
                setCleanState();
            }
        }
    };

    uiCallbacks.un = function() {
        undoManager.performUndo(state);
    };

    setCleanState();
    if (uiState[player.i]) {
        uiCallbacks.t(uiState[player.i]);
        delete uiState[player.i];
    }

    function setCleanState() {
        state.d = utils.deepCopy(cleanState, 3);
        state.d.h = state.r.filter(region => state.regionHasActiveArmy(player, region));
        gameRenderer.updateDisplay(state);
    }

    function makeUpgradeButtons(temple) {
        var templeOwner = state.owner(temple.r);
        var upgradeButtons = utils.map(gameData.UPGRADES, function(upgrade) {
            // current upgrade level (either the level of the temple or number of soldiers bought already)
            var level = (temple.u == upgrade) ? (temple.l+1) : ((upgrade == gameData.SOLDIER) ? (state.m.h || 0) : 0);

            var cost = upgrade.cost[level];
            var text = utils.template(upgrade.name, gameData.LEVELS[level]) + utils.elem('b', {}, " (" + cost + "&#9775;)");
            var description = utils.template(upgrade.desc, upgrade.level[level]);

            var hidden = false;
            hidden = hidden || (upgrade == gameData.RESPECT && (!temple.u)); // respect only available if temple is upgraded
            hidden = hidden || (temple.u && temple.u != upgrade && upgrade != gameData.SOLDIER && upgrade != gameData.RESPECT); // the temple is already upgraded with a different upgrade
            hidden = hidden || (level >= upgrade.cost.length); // highest level reached
            hidden = hidden || (level < state.rawUpgradeLevel(templeOwner, upgrade)); // another temple has this upgrade already
            hidden = hidden || (templeOwner != player); // we're looking at an opponent's temple

            return {t: text, d: description, o: cost > state.cash(player), h: hidden};
        });
        upgradeButtons.push({t: "Done"});
        return upgradeButtons;
    }
}

function afterMoveChecks(state) {
    // check for game loss by any of the players
    utils.map(state.p, function(player) {
        var totalSoldiers = sequenceUtils.sum(state.r, function(region) {
            return state.owner(region) == player ? state.soldierCount(region) : 0;
        });
        if (!totalSoldiers && state.regionCount(player)) {
            // lost!
            utils.forEachProperty(state.o, function(p, r) {
                if (player == p)
                    delete state.o[r];
            });
            // dead people get no more moves
            if (state.activePlayer() == player)
                state.m.l = 0;
            // show the world the good (or bad) news
            if (!state.a) {
                oneAtaTime(150, gameRenderer.updateDisplay.bind(0, state));
                gameRenderer.showBanner('#222', player.n + " has been eliminated!", 900);
            }
        }
    });

    // do we still have more than one player?
    var gameStillOn = state.p.filter(player => state.regionCount(player)).length > 1;
    if (!gameStillOn) {
        // oh gosh, it's done - by elimination!
        state.e = determineGameWinner(state);
        return;
    }
}


function moveSoldiers(state, fromRegion, toRegion, incomingSoldiers) {
    var fromList = state.s[fromRegion.i];
    var toList = state.s[toRegion.i] || (state.s[toRegion.i] = []);
    var fromOwner = state.owner(fromRegion);
    var toOwner = state.owner(toRegion);

    // do we have a fight?
    if (fromOwner != toOwner) {
        var defendingSoldiers = toList.length;

        // earth upgrade - preemptive damage on defense
        var preemptiveDamage = sequenceUtils.min([incomingSoldiers, state.upgradeLevel(toOwner, gameData.EARTH)]);
        var invincibility = state.upgradeLevel(fromOwner, gameData.FIRE);

        if (preemptiveDamage || defendingSoldiers) {
            // there will be a battle - move the soldiers halfway for animation
            if (!state.a) {
                utils.map(fromList.slice(0, incomingSoldiers), function (soldier) {
                    soldier.a = toRegion;
                });
            }
            battleAnimationKeyframe(state);
        }

        if (preemptiveDamage) {
            // animate it
            battleAnimationKeyframe(state, 50, audio.audioOursDead,
                [{s: fromList[0], t: "Earth kills " + preemptiveDamage + "!", c: gameData.EARTH.b, w: 9}]
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

            var incomingStrength = incomingSoldiers * (1 + state.upgradeLevel(fromOwner, gameData.FIRE) * 0.01);
            var defendingStrength = defendingSoldiers * (1 + state.upgradeLevel(toOwner, gameData.EARTH) * 0.01);

            var repeats = sequenceUtils.min([incomingSoldiers, defendingSoldiers]);
            var attackerWinChance = 100 * Math.pow(incomingStrength / defendingStrength, 1.6);

            function randomNumberForFight(index) {
                var maximum = 120 + attackerWinChance;
                if (state.a) {
                    // simulated fight - return some numbers
                    // they're clustered about the center of the range to
                    // make the AI more "decisive" (this exaggerates any advantages)
                    return (index + 3) * maximum / (repeats + 5);
                } else {
                    // not a simulated fight - return a real random number
                    // we're not using the full range 0 to maximum to make sure
                    // that randomness doesn't give a feel-bad experience when
                    // we attack with a giant advantage
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
                            [{s: fromList[0], t: "Protected by Fire!", c: gameData.FIRE.b, w: 11}]
                        );
                    }
                } else {
                    // attacker wins, kill defender and pay the martyr bonus
                    toList.shift();
                    if (toOwner)
                        state.c[toOwner.i] += 4;
                    battleAnimationKeyframe(state, 250, audio.sounds.ENEMY_DEAD);
                }
            });

            // are there defenders left?
            if (toList.length) {
                // and prevent anybody from moving in
                incomingSoldiers = 0;
                state.sc = audio.sounds.DEFEAT;
                state.flt = [{r: toRegion, c: toOwner ? toOwner.h : '#fff', t: "Defended!", w: 7}];
            }
        }

        // reset "attacking status" on the soldiers - at this point they will
        // move back to the source region or occupy the destination
        utils.map(fromList, function(soldier) {
            soldier.a = 0;
        });
    }

    if (incomingSoldiers > 0) {
        // move the (remaining) soldiers
        utils.map(utils.range(0, incomingSoldiers), function() {
            toList.push(fromList.shift());
        });

        // if this didn't belong to us, it now does
        if (fromOwner != toOwner) {
            state.o[toRegion.i] = fromOwner;
            // mark as conquered to prevent moves from this region in the same turn
            state.m.z = (state.m.z || []).concat(toRegion);
            // if there was a temple, reset its upgrades
            var temple = state.t[toRegion.i];
            if (temple)
                delete temple.u;
            // play sound, launch particles!
            state.prt = toRegion;
            state.flt = [{r: toRegion, c: fromOwner.h, t: "Conquered!", w: 7}];
            state.sc = defendingSoldiers ? audio.sounds.VICTORY : audio.sounds.TAKE_OVER;
        }
    }

    // use up the move
    state.m.l--;
}


function battleAnimationKeyframe(state, delay, soundCue, floatingTexts) {
    if (state.a) return;
    const keyframe = state.copy();
    keyframe.sc = soundCue;
    keyframe.flt = floatingTexts;
    oneAtaTime(delay || 500, gameRenderer.updateDisplay.bind(0, keyframe));
}


function buildUpgrade(state, region, upgrade) {
    var temple = state.t[region.i];
    var templeOwner = state.owner(region);

    if (upgrade == gameData.SOLDIER) {
        // soldiers work diferently - they get progressively more expensive the more you buy in one turn
        if (!state.m.h)
            state.m.h = 0;
        state.c[templeOwner.i] -= upgrade.cost[state.m.h++];
        return state.addSoldiers(region, 1);
    }
    if (upgrade == gameData.RESPECT) {
        // respecting is also different
        delete temple.u;
        return;
    }

    // upgrade the temple
    if (temple.u != upgrade) {
        // fresh level 1 upgrade!
        temple.u = upgrade;
        temple.l = 0;
    } else {
        // upgrade to a higher level
        temple.l++;
    }

    // you have to pay for it, unfortunately
    state.c[templeOwner.i] -= upgrade.cost[temple.l];

    // particles!
    state.prt = temple.r;

    // the AIR upgrade takes effect immediately
    if (upgrade == gameData.AIR)
        state.m.l++;
}


function nextTurn(state) {
    var player = state.activePlayer();

    // cash is produced
    var playerIncome = state.income(player);
    state.c[player.i] += playerIncome;
    if (playerIncome) {
        state.flt = [{r: state.temples(player)[0].r, t: "+" + playerIncome + "&#9775;", c: '#fff', w: 5}];
    }

    // temples produce one soldier per turn automatically
    utils.forEachProperty(state.t, function(temple, regionIndex) {
        if (state.o[regionIndex] == player) {
            // this is our temple, add a soldier of the temple's element
            state.addSoldiers(temple.r, 1);
        }
    });

    // go to next player (skipping dead ones)
    do {
        var playerCount = state.p.length;
        var playerIndex = (state.m.p + 1) % playerCount, upcomingPlayer = state.p[playerIndex],
            turnNumber = state.m.t + (playerIndex ? 0 : 1);
        state.m = {
            t: turnNumber,
            p: playerIndex,
            m: gameData.MOVE_ARMY,
            l: gameData.movesPerTurn + state.upgradeLevel(upcomingPlayer, gameData.AIR)
        };
    } while (!state.regionCount(upcomingPlayer));

    // did the game end by any chance?
    if (state.m.t > gameInitialization.gameSetup.turnCount) {
        // end the game!
        state.m.t = gameInitialization.gameSetup.turnCount;
        state.e = determineGameWinner(state);
        return;
    }

    // if this is not simulated, we'd like a banner
    if (!state.a) {
        // show next turn banner
        gameRenderer.showBanner(state.activePlayer().d, state.activePlayer().n + "'s turn");
    }
}

function determineGameWinner(state) {
    var pointsFn = player => state.regionCount(player);
    var winner = sequenceUtils.max(state.p, pointsFn);
    var otherPlayers = state.p.filter(function(player) { return player != winner; });
    var runnerUp = sequenceUtils.max(otherPlayers, pointsFn);

    return (pointsFn(winner) != pointsFn(runnerUp)) ? winner : gameData.DRAW_GAME;
}

function showEndGame(state) {
    oneAtaTime(1, function() {
        var winner = state.e;
        if (winner != gameData.DRAW_GAME) {
            gameRenderer.showBanner(winner.d, winner.n + " wins the game!");
        } else {
            gameRenderer.showBanner('#333', "The game ends in a draw!");
        }

        gameRenderer.updateDisplay(state);

        $('turn-count').innerHTML = "Game complete";
        $('in').innerHTML = utils.elem('p', {}, "Click the button below to start a new game.");
        $('in').style.background = '#555';
        $('mv').style.display = 'none';
        gameRenderer.updateButtons([{t: "New game"}]);

        uiCallbacks.b = gameInitialization.runSetupScreen;
    });
}