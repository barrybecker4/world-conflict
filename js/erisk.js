


// ==========================================================
// All the game logic and the machinery that runs its main
// loop reside below.
// ==========================================================

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
    if (!regionCount(state, player))
        return reportMoveCallback({t: END_TURN});

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
    state = copyState(state);
    
    var moveType = move.t;
    if (moveType == MOVE_ARMY) {
        moveSoldiers(state, move.s, move.d, move.c);
    } else if (moveType == BUILD_ACTION) {
        buildUpgrade(state, move.r, move.u);
    } else if (moveType == END_TURN) {
        nextTurn(state);
    }

    // updates that happen after each move (checking for players losing, etc.)
    afterMoveChecks(state);

    return state;
}

function copyState(state, simulatingPlayer) {
    return {
        // some things are constant and can be shallowly copied
        r: state.r, 
        p: state.p,
        a: state.a || simulatingPlayer,
        // some others... less so
        m: deepCopy(state.m, 1),
        o: deepCopy(state.o, 1),
        t: deepCopy(state.t, 2),
        s: deepCopy(state.s, 3),
        c: deepCopy(state.c, 1),
        l: deepCopy(state.l, 1),
        flt: state.flt
        // and some others are completely omitted - namely 'd', the current 'move decision' partial state
    };
}

function playOneMove(state) {
    // we're playing the game now
    appState = APP_INGAME;

    // oneAtATime is used to ensure that all animations from previous moves complete before a new one is played
    oneAtATime(150, function() {
        var controllingPlayer = activePlayer(state); // who is the active player to make some kind of move?

        // let the player pick their move using UI or AI
        pickMove(controllingPlayer, state, function(move) {
            // AI makes sounds when playing
            if (controllingPlayer.u == aiPickMove)
                playSound(audioClick);

            // the move is chosen - update state to a new immutable copy
            var newState = makeMove(state, move);
            // did the game end?
            if (newState.e) {
                // yes, the game has ended
                oneAtATime(150, updateDisplay.bind(0, newState));
                showEndGame(newState);
                return;
            } else {
                // remember state for undo purposes
                previousState = copyState(state);
                // still more of the game to go - next move, please!
                setTimeout(playOneMove.bind(0, newState), 1);
            }
        });

        // update display before the move happens
        updateDisplay(state);
    });
}

function afterMoveChecks(state) {
    // check for game loss by any of the players
    map(state.p, function(player) {
        var totalSoldiers = sum(state.r, function(region) {
            return owner(state, region) == player ? soldierCount(state, region) : 0;
        });
        if (!totalSoldiers && regionCount(state, player)) {
            // lost!
            forEachProperty(state.o, function(p, r) {
                if (player == p)
                    delete state.o[r];
            });
            // dead people get no more moves
            if (activePlayer(state) == player)
                state.m.l = 0;
            // show the world the good (or bad) news
            if (!state.a) {
                oneAtATime(150, updateDisplay.bind(0, state));
                showBanner('#222', player.n + " has been eliminated!", 900);
            }
        }
    });

    // do we still have more than one player?
    var gameStillOn = state.p.filter(regionCount.bind(0, state)).length > 1;
    if (!gameStillOn) {
        // oh gosh, it's done - by elimination!
        state.e = determineGameWinner(state);
        return;
    }
}

var soldierCounter;
function addSoldiers(state, region, count) {
    map(range(0,count), function() {
        soldierCounter = (soldierCounter + 1) || 0;

        var soldierList = state.s[region.i];
        if (!soldierList)
            soldierList = state.s[region.i] = [];

        soldierList.push({
            i: soldierCounter++
        });
    });
}

function moveSoldiers(state, fromRegion, toRegion, incomingSoldiers) {
    var fromList = state.s[fromRegion.i];
    var toList = state.s[toRegion.i] || (state.s[toRegion.i] = []);
    var fromOwner = owner(state, fromRegion);
    var toOwner = owner(state, toRegion);

    // do we have a fight?
    if (fromOwner != toOwner) {
        var defendingSoldiers = toList.length;

        // earth upgrade - preemptive damage on defense
        var preemptiveDamage = min([incomingSoldiers, upgradeLevel(state, toOwner, EARTH)]);
        var invincibility = upgradeLevel(state, fromOwner, FIRE);

        if (preemptiveDamage || defendingSoldiers) {
            // there will be a battle - move the soldiers halfway for animation
            if (!state.a) {
                map(fromList.slice(0, incomingSoldiers), function (soldier) {
                    soldier.a = toRegion;
                });
            }
            battleAnimationKeyframe(state);
        }

        if (preemptiveDamage) {
            // animate it
            battleAnimationKeyframe(state, 50, audioOursDead, [{s: fromList[0], t: "Earth kills " + preemptiveDamage + "!", c: EARTH.b, w: 9}]);
            // apply it
            map(range(0, preemptiveDamage), function () {
                fromList.shift();
                incomingSoldiers--;
            });
            battleAnimationKeyframe(state);
        }

        // if there is still defense and offense, let's have a fight
        if (defendingSoldiers && incomingSoldiers) {
            // at this point, the outcome becomes random - so you can't undo your way out of it
            state.u = 1;

            var incomingStrength = incomingSoldiers * (1 + upgradeLevel(state, fromOwner, FIRE) * 0.01);
            var defendingStrength = defendingSoldiers * (1 + upgradeLevel(state, toOwner, EARTH) * 0.01);

            var repeats = min([incomingSoldiers, defendingSoldiers]);
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
                    return rint(maximum * 0.12, maximum * 0.88);
                }
            }

            map(range(0,repeats), function(index) {
                if (randomNumberForFight(index) <= 120)
                {
                    // defender wins!
                    if (invincibility-- <= 0) {
                        fromList.shift();
                        incomingSoldiers--;
                        battleAnimationKeyframe(state, 250, audioOursDead);
                    } else {
                        battleAnimationKeyframe(state, 800, audioOursDead, [{s: fromList[0], t: "Protected by Fire!", c: FIRE.b, w: 11}]);
                    }
                } else {
                    // attacker wins, kill defender and pay the martyr bonus
                    toList.shift();
                    if (toOwner)
                        state.c[toOwner.i] += 4;
                    battleAnimationKeyframe(state, 250, audioEnemyDead);
                }
            });

            // are there defenders left?
            if (toList.length) {
                // and prevent anybody from moving in
                incomingSoldiers = 0;
                state.sc = audioDefeat;
                state.flt = [{r: toRegion, c: toOwner ? toOwner.h : '#fff', t: "Defended!", w: 7}];
            }
        }

        // reset "attacking status" on the soldiers - at this point they will
        // move back to the source region or occupy the destination
        map(fromList, function(soldier) {
            soldier.a = 0;
        });
    }

    if (incomingSoldiers > 0) {
        // move the (remaining) soldiers
        map(range(0, incomingSoldiers), function() {
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
            state.sc = defendingSoldiers ? audioVictory : audioTakeOver;
        }
    }

    // use up the move
    state.m.l--;
}

function battleAnimationKeyframe(state, delay, soundCue, floatingTexts) {
    if (state.a) return;
    var keyframe = copyState(state);
    keyframe.sc = soundCue;
    keyframe.flt = floatingTexts;
    oneAtATime(delay || 500, updateDisplay.bind(0, keyframe));
}

function buildUpgrade(state, region, upgrade) {
    var temple = state.t[region.i];
    var templeOwner = owner(state, region);

    if (upgrade == SOLDIER) {
        // soldiers work diferently - they get progressively more expensive the more you buy in one turn
        if (!state.m.h)
            state.m.h = 0;
        state.c[templeOwner.i] -= upgrade.c[state.m.h++];
        return addSoldiers(state, region, 1);
    }
    if (upgrade == RESPEC) {
        // respeccing is also different
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
    state.c[templeOwner.i] -= upgrade.c[temple.l];

    // particles!
    state.prt = temple.r;

    // the AIR upgrade takes effect immediately
    if (upgrade == AIR)
        state.m.l++;
}

function nextTurn(state) {
    var player = activePlayer(state);
    
    // cash is produced
    var playerIncome = income(state, player);
    state.c[player.i] += playerIncome;
    if (playerIncome) {
        state.flt = [{r: temples(state, player)[0].r, t: "+" + playerIncome + "&#9775;", c: '#fff', w: 5}];
    }

    // temples produce one soldier per turn automatically
    forEachProperty(state.t, function(temple, regionIndex) {
        if (state.o[regionIndex] == player) {
            // this is our temple, add a soldier of the temple's element
            addSoldiers(state, temple.r, 1);
        }
    });

    // go to next player (skipping dead ones)
    do {
        var playerCount = state.p.length;
        var playerIndex = (state.m.p + 1) % playerCount, upcomingPlayer = state.p[playerIndex],
            turnNumber = state.m.t + (playerIndex ? 0 : 1);
        state.m = {t: turnNumber, p: playerIndex, m: MOVE_ARMY, l: movesPerTurn + upgradeLevel(state, upcomingPlayer, AIR)};
    } while (!regionCount(state, upcomingPlayer));

    // did the game end by any chance?
    if (state.m.t > gameSetup.tc) {
        // end the game!
        state.m.t = gameSetup.tc;
        state.e = determineGameWinner(state);
        return;
    }

    // if this is not simulated, we'd like a banner
    if (!state.a) {
        // show next turn banner
        showBanner(activePlayer(state).d, activePlayer(state).n + "'s turn");
    }
}

function determineGameWinner(state) {
    var pointsFn = regionCount.bind(0, state);
    var winner = max(state.p, pointsFn);
    var otherPlayers = state.p.filter(function(player) { return player != winner; });
    var runnerUp = max(otherPlayers, pointsFn);

    return (pointsFn(winner) != pointsFn(runnerUp)) ? winner : DRAW_GAME;
}

function showEndGame(state) {
    oneAtATime(1, function() {
        var winner = state.e;
        if (winner != DRAW_GAME) {
            showBanner(winner.d, winner.n + " wins the game!");
        } else {
            showBanner('#333', "The game ends in a draw!");
        }

        updateDisplay(state);

        $('tc').innerHTML = "Game complete";
        $('in').innerHTML = elem('p', {}, "Click the button below to start a new game.");
        $('in').style.background = '#555';
        $('mv').style.display = 'none';
        updateButtons([{t: "New game"}]);

        uiCallbacks.b = runSetupScreen;
    });
}

// ==========================================================
// Various simple helpers for working with the game state.
// ==========================================================

function soldierCount(state, region) {
    var list = state.s[region.i];
    return list ? list.length : 0;
}

function income(state, player) {
    // no income with no temples
    var playerTemples = temples(state,player);
    if (!playerTemples.length) return 0;

    // 1 faith per region
    var fromRegions = regionCount(state, player);
    // 1 faith per each soldier at temple (too much?)
    var fromTemples = sum(playerTemples, function(temple) {
        return soldierCount(state, temple.r);
    });
    var multiplier = 1.0 + 0.01 * upgradeLevel(state, player, WATER);
    if ((player.u == aiPickMove) && (gameSetup.l == AI_EVIL))
        multiplier += 0.4;
    return ceil(multiplier * (fromRegions + fromTemples));
}

function regionHasActiveArmy(state, player, region) {
    return (state.m.l > 0) && (owner(state, region) == player) && soldierCount(state, region) && (!contains(state.m.z, region));
}

function regionCount(state, player) {
    var total = 0;
    map(state.r, function(region) {
        if (owner(state, region) == player)
            total++;
    });
    return total;
}

function temples(state, player) {
    var temples = [];
    forEachProperty(state.t, function(temple, regionIndex) {
        if (state.o[regionIndex] == player)
            temples.push(temple);
    });
    return temples;
}

function activePlayer(state) {
    return state.p[state.m.p];
}

function owner(state, region) {
    return state.o[region.i];
}

function cash(state, player) {
    return state.c[player.i];
}

function rawUpgradeLevel(state, player, upgradeType) {
    return max(map(temples(state, player), function(temple) {
        if (temple.u && temple.u == upgradeType)
            return temple.l + 1;
        else
            return 0;
    }).concat(0));
}

function upgradeLevel(state, player, upgradeType) {
    if (!player) {
        // neutral forces always have upgrade level 0;
        return 0;
    }

    return max(map(state.r, function(region) {
        // does it have a temple?
        var temple = state.t[region.i];
        if (!temple) return 0;
        // does it belong to us?
        if (owner(state, region) != player) return 0;
        // does it have the right type of upgrade?
        return (temple.u == upgradeType) ? upgradeType.x[temple.l] : 0;
    }));
}

function totalSoldiers(state, player) {
    return sum(state.r, function(region) {
        return (owner(state, region) == player) ? soldierCount(state, region) : 0;
    });
}

function soldierCost(state) {
    return SOLDIER.c[state.m.h || 0];
}

function templeInfo(state, temple) {
    if (!temple.u) {
        var name = owner(state, temple.r) ? "Basic Temple" : "Neutral Temple";
        return {n: name, d: "No upgrades."};
    } else {
        var upgrade = temple.u, level = temple.l,
            description = template(upgrade.d, upgrade.x[level]);
        return {n: template(upgrade.n, LEVELS[level]), d: description};
    }
}

// ==========================================================
// Undo functionality
// ==========================================================

var previousState = null;

function undoEnabled(gameState) {
    return previousState && // there is a state to return to
        (activePlayer(previousState) == activePlayer(gameState)) &&  // and it was actually our move
        (!gameState.u) && // and undo wasn't expressly disabled after a battle
        (activePlayer(gameState).u == uiPickMove); // and no using Undo on behalf of the AI!
}

function performUndo(currentState) {
    if (!undoEnabled(currentState))
        return;

    // clear the callbacks from previous UI interaction
    uiCallbacks = {};

    // roll back the state to "previous"
    var restoredState = previousState;
    previousState = null;
    playOneMove(restoredState);
}

// ==========================================================
// This is the code for the game setup screen.
// ==========================================================

var defaultSetup = {
    p: [PLAYER_HUMAN, PLAYER_AI, PLAYER_AI, PLAYER_OFF],
    l: AI_NICE,
    s: true,
    tc: 12,
    tt: {}
};
var gameSetup = getSetupFromStorage();
var appState = 0;

// Gets user preferences from local storage, or returns false if there aren't any.
function getSetupFromStorage() {
    if (localStorage) {
        var stored = localStorage.getItem("s");
        if (stored) {
            stored = JSON.parse(stored);
            forEachProperty(defaultSetup, function (value, name) {
                if (stored[name] === undefined)
                    stored[name] = value;
            });
            return stored;
        }
    }

    return defaultSetup;
}

// Tries to store user preferences in local storage.
function storeSetupInLocalStorage() {
    if (localStorage) {
        localStorage.setItem("s", JSON.stringify(gameSetup));
    }
}

function prepareSetupUI() {
    // player box area
    var html = div({c: 'sc ds'}, "Player setup");
    var playerBoxes = map(PLAYER_TEMPLATES, function(player) {
        var pid = player.i;
        return buttonPanel(player.n, "sb" + player.i, ["AI", "Human", "Off"], {
            i: 'pl' + pid,
            c: 'pl',
            s: 'background: ' + player.d
        });
    }).join("");
    html += div({i: 'pd', c: 'sc un'}, playerBoxes);
    html += buttonPanel("AI", "ai", ["Evil", "Mean", "Rude", "Nice"]);
    html += buttonPanel("Turns", "tc", ["Endless", "15", "12", "9"]);

    // realize the UI
    $('d').innerHTML = html;

    // hide stat box and undo button
    map(['mv', 'und', 'end'], hide);

    // setup callbacks for players
    for2d(0, 0, PLAYER_TEMPLATES.length, 3, function(playerIndex, buttonIndex) {
        onClickOrTap($('sb' + playerIndex + buttonIndex), invokeUICallback.bind(0, {p: playerIndex, b: buttonIndex}, 'sb'));
    });
    map(range(0,4), function(index) {
        onClickOrTap($('ai' + index), invokeUICallback.bind(0, index, 'ai'));
        onClickOrTap($('tc' + index), invokeUICallback.bind(0, TURN_COUNTS[index], 'tc'));
    });

    function buttonPanel(title, buttonIdPrefix, buttonLabels, additionalProperties) {
        var buttons = map(buttonLabels, function(label, index) {
            var id = buttonIdPrefix + (buttonLabels.length-1-index);
            return elem('a', {i: id, c: 'rt', href: '#', s: 'font-size: 90%'}, label);
        }).join("");
        var properties = {c: 'sc ds', s: 'padding-right: 0.5em'};
        forEachProperty(additionalProperties, function(value, name) {
            properties[name] = value;
        });
        return div(properties, title + buttons);
    }
}

function runSetupScreen() {
    // we're in setup now
    appState = APP_SETUP_SCREEN;

    // generate initial setup and game state
    var game;
    regenerateMap();

    // prepare UI
    prepareSetupUI();
    updateBottomButtons();
    updateConfigButtons();

    // callback for the buttons on the bottom
    uiCallbacks.b = function(which) {
        if (!setupValid()) return;
        if (which == 0) {
            regenerateMap();
        } else {
            prepareIngameUI(game);
            updateDisplay(game);
            playOneMove(game);
        }
    };
    // callback for player setup buttons
    uiCallbacks.sb = function(event) {
        // set the controller type for the player
        gameSetup.p[event.p] = event.b;
        updateConfigButtons();
        updateBottomButtons();
        regenerateMap();
    };
    // callback for config buttons
    uiCallbacks.ai = function(aiLevel) {
        gameSetup.l = aiLevel;
        updateConfigButtons();
    };
    uiCallbacks.tc = function(turnCount) {
        gameSetup.tc = turnCount;
        updateConfigButtons();
    };

    function setupValid() {
        var enabledPlayers = sum(gameSetup.p, function(playerState) {
            return (playerState != PLAYER_OFF) ? 1 : 0;
        });
        return enabledPlayers > 1;
    }

    function updateBottomButtons() {
        var buttonsDisabled = !setupValid();
        updateButtons([
            {t: "Change map", o: buttonsDisabled},
            {t: "Start game", o: buttonsDisabled}
        ]);
    }

    function updateConfigButtons() {
        // somebody changed something, so store the new setup
        storeSetupInLocalStorage(gameSetup);

        // update player buttons
        map(gameSetup.p, function(controller, playerIndex) {
           map(range(0,3), function(buttonIndex) {
               toggleClass('sb' + playerIndex + buttonIndex, 'sl', (controller == buttonIndex));
           })
        });

        // update AI and turn count buttons
        map(range(0,4), function(index) {
            toggleClass('ai' + index, 'sl', index == gameSetup.l);
            toggleClass('tc' + index, 'sl', TURN_COUNTS[index] == gameSetup.tc);
        });
    }

    function regenerateMap() {
        if (setupValid()) {
            game = makeInitialState(gameSetup);
            showMap($('m'), game);
            updateMapDisplay(game);
        }
    }
}

// ==========================================================
// This part of the code is responsible for the meager functionality
// of the title screen.
// ==========================================================

function setupTitleScreen() {
    map(['o','tub','snd'], function(id) {showOrHide(id,1);});

    onClickOrTap($('cb'), setTitleScreenVisibility.bind(0,false));
    onClickOrTap($('nxt'), switchTutorialCard.bind(0,1));
    onClickOrTap($('prv'), switchTutorialCard.bind(0,-1));

    onClickOrTap($('tub'), setTitleScreenVisibility.bind(0,true));
    onClickOrTap($('snd'), toggleSound);
    onClickOrTap($('und'), invokeUICallback.bind(0, 0, 'un'));
    onClickOrTap($('end'), function() {
        uiCallbacks = {};
        updateDisplay(displayedState);
        runSetupScreen();
    });

    switchTutorialCard(0);

    setTimeout(setTitleScreenVisibility.bind(0,true), 10);
}

var currentCard = 0, totalCards = 5;
function switchTutorialCard(direction) {
    currentCard = clamp(currentCard + direction, 0, totalCards-1);

    setTransform($('tuc'), "translate3d(" + (-currentCard * 100 / totalCards) + "%,0,0)");
    showOrHide('prv', currentCard > 0);
    showOrHide('nxt', currentCard < totalCards - 1);
}

function setTitleScreenVisibility(visible) {
    if (visible) {
        $('ts').style.display = 'block';
    }

    setTimeout(function() {
        toggleClass('ts', 'h', !visible);
    }, 50);

    if (!visible) {
        setTimeout(function () {
            $('ts').style.display = 'none';
        }, 500);
    }
}

// ==========================================================
// This part of the code does audio.
// ==========================================================

function lerp(alpha, from, to) {
    alpha = clamp(alpha, 0, 1);
    return to * alpha + from * (1 - alpha);
}
function adsr(a, d, s, r, sl, fn) {
    var t = 0.0;
    return function(dt) {
        var f = fn(dt);
        t += dt;

        if (t < a)
            return lerp(t / a, 0, 1) * f;
        if (t < a+d)
            return lerp((t-a) / d, 1, sl) * f;
        if (t < a+d+s)
            return sl * f;
        return lerp((t-a-s-d) / r, sl, 0) * f;
    }
}

function wSin(pitch) {
    var t = 0.0;
    return function(dt) {
        t += dt;
        return Math.sin(t * pitch * 6.283);
    }
}

function wSlide(from, to, time, fn) {
    var t = 0.0;
    return function(dt) {
        t += dt;
        var passedDT = dt * lerp(t / time, from, to);
        return fn(passedDT);
    }
}

function wRamp(from, to, after, fn) {
    var t = 0.0;
    return function(dt) {
        t += dt;
        return fn(t > after ? dt * to : dt * from);
    }
}

function wNotes(notes) {
    map(notes, function(note) {
        note.f = adsr(0.01, 0.03, 0.03 * note.d, 0.03 * note.d, 0.7, wSin(note.p));
    });
    var t = 0.0;
    return function(dt) {
        t += dt;
        var v = 0.0;
        map(notes, function(note) {
            if (t >= note.t)
                v += note.f(dt);
        });
        return v;
    }
}

function makeBuffer(fn, len, vol) {
    var vol = vol || 1;

    var sampleRate = audioCtx.sampleRate;
    var samples = sampleRate * len;
    var buffer = audioCtx.createBuffer(1, samples, sampleRate);

    var dt = 1 / sampleRate;
    var bufferData = buffer.getChannelData(0);
    for (var i = 0; i < samples; i++) {
        bufferData[i] = fn(dt) * vol;
    }

    return buffer;
}

var audioCtx = window.AudioContext && (new AudioContext());
var audioClick, audioEnemyDead, audioOursDead, audioVictory, audioDefeat, audioTakeOver;
function setupAudio() {
    // do we have WebAudio?
    if (!audioCtx)
        return;

    // generate sounds
    audioClick = makeBuffer(adsr(0.01, 0.03, 0.01, 0.01, 0.2,
        wSin(110)
    ), 0.1);
    audioEnemyDead = makeBuffer(adsr(0.01, 0.05, 0.05, 0.05, 0.5,
        wSlide(1.0, 0.3, 0.1, wSin(300))
    ), 0.2, 0.6);
    audioOursDead = makeBuffer(adsr(0.01, 0.05, 0.05, 0.05, 0.5,
        wSlide(1.0, 0.3, 0.1, wSin(200))
    ), 0.2, 0.6);
    audioTakeOver = makeBuffer(wNotes([
        {t:0, p:261,d:1},{t:0.1, p:329, d:2}     // C-E
    ]), 0.6, 0.2);
    audioVictory = makeBuffer(wNotes([
        {t:0, p:261,d:1},{t:0.0, p:329, d:2},{t:0.0, p:392, d:3},     // C-E-G
        {t:0.2, p:261,d:1},{t:0.2, p:349, d:2},{t:0.2, p:440, d:3}    // C-F-A
    ]), 0.6, 0.2);
    audioDefeat = makeBuffer(wNotes([
        {t:0, p:392,d:3},{t:0.15, p:329, d: 2}, {t:0.3, p:261, d:1}
    ]), 0.6, 0.2);

    // update the mute button
    updateSoundControls();
}

function playSound(sound) {
    if (!(sound && gameSetup.s))
        return;

    var source = audioCtx.createBufferSource();
    source.buffer = sound;
    source.connect(audioCtx.destination);
    source.start();
}

function updateSoundControls() {
    $('snd').innerHTML = gameSetup.s ? '♪' : ' ';
    storeSetupInLocalStorage(gameSetup);
}

function toggleSound() {
    gameSetup.s = !gameSetup.s;
    updateSoundControls();
}

// ==========================================================
// This part of the code initalizes a new game.
// ==========================================================

// keep the aspect of the gameplay area correct
(wnd.onresize = preserveAspect)();

// start the game
window.onload = function() {
    setTimeout(function() {
        gameSetup = getSetupFromStorage();
        setupAudio();
        runSetupScreen();
        setupTitleScreen();
    }, 500);
};

