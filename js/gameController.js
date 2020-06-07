// ==========================================================
// This part of the code deals with responding to user actions.
// ==========================================================

var uiCallbacks = {};

// This is the handler that gets attached to most DOM elements.
// Delegation through UI callbacks allows us to react differently
// depending on game-state.
function invokeUICallback(object, type, event) {
    var cb = uiCallbacks[type];
    if (cb) {
        playSound(audioClick);
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
        if ((!region) || (state.d.t == BUILD_ACTION))
            setCleanState();

        if (!state.d.s && region) {
            // no move in progress - start a new move if this is legal
            if (regionHasActiveArmy(state, player, region)) {
                setCleanState();
                state.d.t = MOVE_ARMY;
                state.d.s = region;
                state.d.c = soldierCount(state, region);
                state.d.b[0].h = 0;
                state.d.h = region.n.concat(region);
            }
        } else if (region) {
            // we already have a move in progress
            var decisionState = state.d;
            // what region did we click?
            if (region == decisionState.s) {
                // the one we're moving an army from - tweak soldier count
                decisionState.c = decisionState.c % soldierCount(state, region) + 1;
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
        updateDisplay(state);
    };

    uiCallbacks.t = function(region) {
        var temple = state.t[region.i];
        state.d = {
            t: BUILD_ACTION,
            w: temple, r: region,
            b: makeUpgradeButtons(temple)
        };
        updateDisplay(state);
    };

    uiCallbacks.s = function(soldier) {
        // delegate to the region click handler, after finding out which region it is
        var soldierRegion = null;
        map(state.r, function(region) {
            if (contains(state.s[region.i], soldier))
                soldierRegion = region;
        });
        if (soldierRegion)
            uiCallbacks.c(soldierRegion);
    };

    uiCallbacks.b = function(which) {
        if (state.d && state.d.t == BUILD_ACTION) {
            // build buttons handled here
            if (which >= UPGRADES.length) {
                setCleanState();
            } else {
                // build an upgrade!
                state.d.u = UPGRADES[which];
                // if its a soldier, store UI state so it can be kept after the move is made
                if (state.d.u == SOLDIER)
                    uiState[player.i] = state.d.r;
                // report the move
                reportMoveCallback(state.d);
            }
        } else {
            // move action buttons handled here
            if (which == 1) {
                // end turn
                uiCallbacks = {};
                reportMoveCallback({t: END_TURN});
            } else {
                // cancel move
                setCleanState();
            }
        }
    };

    uiCallbacks.un = function() {
        // undo!
        performUndo(state);
    };

    setCleanState();
    if (uiState[player.i]) {
        uiCallbacks.t(uiState[player.i]);
        delete uiState[player.i];
    }

    function setCleanState() {
        state.d = deepCopy(cleanState, 3);
        state.d.h = state.r.filter(regionHasActiveArmy.bind(0, state, player));
        updateDisplay(state);
    }

    function makeUpgradeButtons(temple) {
        var templeOwner = owner(state, temple.r);
        var upgradeButtons = map(UPGRADES, function(upgrade) {
            // current upgrade level (either the level of the temple or number of soldiers bought already)
            var level = (temple.u == upgrade) ? (temple.l+1) : ((upgrade == SOLDIER) ? (state.m.h || 0) : 0);

            var cost = upgrade.c[level];
            var text = template(upgrade.n, LEVELS[level]) + elem('b', {}, " (" + cost + "&#9775;)");
            var description = template(upgrade.d, upgrade.x[level]);

            var hidden = false;
            hidden = hidden || (upgrade == RESPEC && (!temple.u)); // respec only available if temple is upgraded
            hidden = hidden || (temple.u && temple.u != upgrade && upgrade != SOLDIER && upgrade != RESPEC); // the temple is already upgraded with a different upgrade
            hidden = hidden || (level >= upgrade.c.length); // highest level reached
            hidden = hidden || (level < rawUpgradeLevel(state, templeOwner, upgrade)); // another temple has this upgrade already
            hidden = hidden || (templeOwner != player); // we're looking at an opponent's temple

            return {t: text, d: description, o: cost > cash(state, player), h: hidden};
        });
        upgradeButtons.push({t: "Done"});
        return upgradeButtons;
    }
}

// ==========================================================
// This part of the code helps organize game flow so things are displayed
// in order taking animation into account.
// ==========================================================

var oaatQueue = [];
function oneAtATime(duration, fn) {
    oaatQueue.push({d: duration, f: fn});
    if (oaatQueue.length == 1)
        runOneTask();

    function runOneTask() {
        // start the first scheduled task
        var task = oaatQueue[0];
        task.f();
        // and wait for it to expire
        setTimeout(function() {
            // task done, remove from queue
            oaatQueue.shift();
            // is there something more to do?
            if (oaatQueue.length)
                runOneTask();
        }, task.d);
    }
}