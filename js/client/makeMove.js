import SOUNDS from '../state/consts/SOUNDS.js';
import utils from '../utils/utils.js';
import domUtils from './utils/domUtils.js';
import sequenceUtils from '../utils/sequenceUtils.js';
import oneAtaTime from './utils/oneAtaTime.js';
import gameData from '../state/consts/gameData.js';
import gameRenderer from './rendering/gameRenderer.js';
import gameInitialization from './gameInitialization.js';
import { Move, ArmyMove, BuildMove, EndMove } from '../state/model/Move.js';
import UPGRADES from '../state/consts/UPGRADES.js';
const $ = domUtils.$;

/**
 * Takes an existing state and a move, and returns a new game state with the move
 * already applied. The object returned is a copy, and the original is left untouched.
 *
 * @param state an existing game state
 * @param move the move to be applied by the active players
 * @returns {GameState} the game state after this move
 */
export default function makeMove(state, move) {
    const newState = state.copy();

    if (move.isArmyMove()) {
        // for this case, if there is a fight, then it will be added to the move
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

// Check to see if the game is over
function afterMoveChecks(state) {
    updatePlayerRegions(state);

    // do we still have more than one player?
    var gameStillOn = state.players.filter(player => state.regionCount(player)).length > 1;
    if (!gameStillOn) {
        // oh gosh, it's done - by elimination!
        state.endResult = determineGameWinner(state);
        return;
    }
}

// update region ownership and notify if any players eliminated
function updatePlayerRegions(state) {
    utils.map(state.players, function(player) {
        var totalSoldiers = sequenceUtils.sum(state.regions, function(region) {
            return state.owner(region) == player ? state.soldierCount(region) : 0;
        });
        if (!totalSoldiers && state.regionCount(player)) {
            // lost!
            utils.forEachProperty(state.owners, function(owner, regionIdx) {
                if (player == owner)
                    delete state.owners[regionIdx];
            });
            // dead people get no more moves
            if (state.activePlayer() == player)
                state.movesRemaining = 0;
            // show the world the good (or bad) news
            if (!state.simulatingPlayer) {
                oneAtaTime(150, () => gameRenderer.updateDisplay(state));
                gameRenderer.showBanner('#222', player.name + " has been eliminated!", 900);
            }
        }
    });
}



function moveSoldiers(state, fromRegion, toRegion, incomingSoldiers) {

    let fromList = state.soldiersAtRegion(fromRegion.index);
    let toList = state.soldiersAtRegion(toRegion.index);
    const numDefenders = toList.length;

    let remainingSoldiers = fightIfNeeded(state, fromRegion, toRegion, fromList, toList, incomingSoldiers);

    if (remainingSoldiers > 0) {
        moveRemainingSoldiers(state, fromRegion, toRegion, fromList, toList, remainingSoldiers, numDefenders)
    }

    state.movesRemaining--;
}

// maybe move battle simulation out to separate file
// The fight should produce a sequence of actions that can be sent back to the client and played forward in the UI.
function fightIfNeeded(state, fromRegion, toRegion, fromList, toList, incomingSoldiers) {

    var fromOwner = state.owner(fromRegion);
    var toOwner = state.owner(toRegion);

    if (fromOwner == toOwner) {
        return incomingSoldiers; // no fight needed
    }

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
        battleAnimationKeyframe(state, 50, SOUNDS.OURS_DEAD,
            [{soldier: fromList[0], text: "Earth kills " + preemptiveDamage + "!", color: UPGRADES.EARTH.b, width: 9}]
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
        state.undoDisabled = true;

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
                    battleAnimationKeyframe(state, 250, SOUNDS.OURS_DEAD);
                } else {
                    battleAnimationKeyframe(state, 800, SOUNDS.OURS_DEAD,
                        [{soldier: fromList[0], text: "Protected by Fire!", color: UPGRADES.FIRE.b, width: 11}]
                    );
                }
            } else {
                // attacker wins, kill defender and pay the martyr bonus
                toList.shift();
                if (toOwner)
                    state.cash[toOwner.index] += 4;
                battleAnimationKeyframe(state, 250, SOUNDS.ENEMY_DEAD);
            }
        });

        // are there defenders left?
        if (toList.length) {
            // and prevent anybody from moving in
            incomingSoldiers = 0;
            state.soundCue = SOUNDS.DEFEAT;
            state.floatingText = [{region: toRegion, color: toOwner ? toOwner.highlightStart : '#fff', text: "Defended!", width: 7}];
        }
    }

    // reset "attacking status" on the soldiers - at this point they have either
    // moved back to the source region or occupy the destination
    utils.map(fromList, function(soldier) {
        soldier.attackedRegion = null;
    });
    return incomingSoldiers;
}

// move the (remaining) soldiers into the toRegion
function moveRemainingSoldiers(state, fromRegion, toRegion, fromList, toList, incomingSoldiers, numDefenders) {

    var fromOwner = state.owner(fromRegion);
    var toOwner = state.owner(toRegion);

    utils.map(utils.range(0, incomingSoldiers), function() {
        toList.push(fromList.shift());
    });

    // if this didn't belong to us, it now does
    if (fromOwner != toOwner) {
        state.owners[toRegion.index] = fromOwner;
        // mark as conquered to prevent moves from this region in the same turn
        state.conqueredRegions = (state.conqueredRegions || []).concat(toRegion);
        // if there was a temple, reset its upgrades
        var temple = state.temples[toRegion.index];
        if (temple)
            delete temple.upgrade;
        // play sound, launch particles!
        state.particleTempleRegion = toRegion;
        state.floatingText = [{region: toRegion, color: fromOwner.highlightStart, text: "Conquered!", width: 7}];
        state.soundCue = numDefenders ? SOUNDS.VICTORY : SOUNDS.TAKE_OVER;
    }
}

// Make this a class, and then a sequence of instances will constitute a re-playable battle.
// Required state properties are simulatingPlayer, soldiers
function battleAnimationKeyframe(state, delay, soundCue, floatingTexts) {
    if (state.simulatingPlayer) return;
    const keyframe = state.copy();
    keyframe.soundCue = soundCue;
    keyframe.floatingText = floatingTexts;
    oneAtaTime(delay || 500, () => gameRenderer.updateDisplay(keyframe));
}


function buildUpgrade(state, region, upgrade) {
    var temple = state.temples[region.index];
    var templeOwner = state.owner(region);

    if (upgrade === UPGRADES.SOLDIER) {
        // soldiers work differently - they get progressively more expensive the more you buy in one turn
        if (!state.numBoughtSoldiers)
            state.numBoughtSoldiers = 0;
        state.cash[templeOwner.index] -= upgrade.cost[state.numBoughtSoldiers++];
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

    // particles!
    state.particleTempleRegion = temple.region;

    // the AIR upgrade takes effect immediately
    if (upgrade == UPGRADES.AIR)
        state.movesRemaining++;
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
            width: 5
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
        var playerIndex = (state.playerIndex + 1) % playerCount, upcomingPlayer = state.players[playerIndex],
            turnNumber = state.turnIndex + (playerIndex ? 0 : 1);
        var numMoves = gameData.movesPerTurn + state.upgradeLevel(upcomingPlayer, UPGRADES.AIR);
        state.turnIndex = turnNumber;
        state.playerIndex = playerIndex;
        state.movesRemaining = numMoves;
    } while (!state.regionCount(upcomingPlayer));

    // did the game end by any chance?
    if (state.turnIndex > gameInitialization.gameSetup.turnCount) {
        // end the game!
        state.turnIndex = gameInitialization.gameSetup.turnCount;
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