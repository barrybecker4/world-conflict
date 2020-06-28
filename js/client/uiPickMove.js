import utils from '../utils/utils.js';
import domUtils from './utils/domUtils.js';
import sequenceUtils from '../utils/sequenceUtils.js';
import gameData from '../state/consts/gameData.js';
import undoManager from './undoManager.js';
import gameRenderer from './rendering/gameRenderer.js';
import uiCallbacks from './uiCallbacks.js';
import { Move, ArmyMove, BuildMove, EndMove } from '../state/model/Move.js';
import UPGRADES from '../state/consts/UPGRADES.js';


/**
 * This is one of the "player controller" methods - the one that is responsible for picking a move for a player.
 * It does that using a human and some UI, and calls reportMoveCallback with an object describing the move once
 * it is decided
 */
var uiState = {};

export default function uiPickMove(player, state, reportMoveCallback) {

    uiCallbacks.setRegionSelectedCB(function(region) {
        if (!region || state.moveDecision.isBuildMove())
            setCleanState();

        if (!state.moveDecision.source && region) {
            // no move in progress - start a new move if this is legal
            if (state.regionHasActiveArmy(player, region)) {
                setCleanState();
                state.moveDecision = new ArmyMove(region, null, state.soldierCount(region));
                state.moveDecision.buttons[0].hidden = false;
                state.moveDecision.highlitRegions = region.neighbors.concat(region);
            }
        } else if (region) {
            // we already have a move in progress
            var moveDecision = state.moveDecision;
            // what region did we click?
            if (region == moveDecision.source) {
                // the one we're moving an army from - tweak number of selected soldiers
                moveDecision.count = moveDecision.count % state.soldierCount(region) + 1;
            } else if (moveDecision.source.neighbors.indexOf(region) > -1) {
                // one of the neighbours - let's finalize the move
                uiCallbacks.clearAll();
                moveDecision.destination = region;
                return reportMoveCallback(moveDecision);
            } else {
                // some random region - cancel move
                setCleanState();
            }
        }
        gameRenderer.updateDisplay(state);
    });

    uiCallbacks.setTempleSelectedCB(function(region) {
        var temple = state.temples[region.index];
        state.moveDecision = new BuildMove(null, temple, makeUpgradeButtons(temple));
        gameRenderer.updateDisplay(state);
    });

    uiCallbacks.setSoldierSelectedCB(function(soldier) {
        // delegate to the region click handler, after finding out which region it is
        var soldierRegion = null;
        state.regions.map(function(region) {
            if (sequenceUtils.contains(state.soldiersAtRegion(region.index), soldier))
                soldierRegion = region;
        });
        if (soldierRegion)
            uiCallbacks.regionsSelected(soldierRegion);
    });

    uiCallbacks.setBuildCB(function(which) {
        if (state.moveDecision && state.moveDecision.isBuildMove()) {
            // build buttons handled here
            if (which >= UPGRADES.length) {
                setCleanState();
            } else {
                // build an upgrade!
                state.moveDecision.upgrade = UPGRADES[which];
                // if its a soldier, store UI state so it can be kept after the move is made
                if (state.moveDecision.upgrade === UPGRADES.SOLDIER)
                    uiState[player.index] = state.regions[state.moveDecision.regionIndex];
                // report the move
                reportMoveCallback(state.moveDecision);
            }
        } else {
            // move action buttons handled here
            if (which === 1) {
                // end turn
                uiCallbacks.clearAll();
                reportMoveCallback(new EndMove());
            } else {
                // cancel move
                setCleanState();
            }
        }
    });

    uiCallbacks.setUndoCB(() => undoManager.performUndo(state));

    setCleanState();
    if (uiState[player.index]) {
        uiCallbacks.setTempleSelectedCB(uiState[player.index]);
        delete uiState[player.index];
    }

    function setCleanState() {  // maybe move first two lines to method on state
        state.moveDecision = new Move();
        state.moveDecision.highlitRegions = state.regions.filter(region => state.regionHasActiveArmy(player, region));
        gameRenderer.updateDisplay(state);
    }

    function makeUpgradeButtons(temple) {
        var templeOwner = state.owner(temple.regionIndex);
        var upgradeButtons = UPGRADES.map(function(upgrade) {
            // current upgrade level (either the level of the temple or number of soldiers bought already)
            var level = (temple.upgrade == upgrade) ?
                (temple.level + 1) : ((upgrade === UPGRADES.SOLDIER) ? (state.numBoughtSoldiers || 0) : 0);

            var cost = upgrade.cost[level];
            var text = utils.template(upgrade.name, gameData.LEVELS[level]) + domUtils.elem('b', {}, " (" + cost + "&#9775;)");
            var description = utils.template(upgrade.desc, upgrade.level[level]);

            let curUpgrade = temple.upgrade;
            let inconsistentUpgrade = // the temple is already upgraded with a different upgrade
                curUpgrade && curUpgrade != upgrade && upgrade != UPGRADES.SOLDIER && upgrade != UPGRADES.RESPECT;
            var hidden =
                (upgrade === UPGRADES.RESPECT && !curUpgrade) // respect only available if temple is upgraded
                || inconsistentUpgrade
                || level >= upgrade.cost.length // highest level reached
                || level < state.rawUpgradeLevel(templeOwner, upgrade) // another temple has this upgrade already
                || templeOwner != player; // we're looking at an opponent's temple

            return {text, description, disabled: cost > state.cashForPlayer(player), hidden};
        });
        upgradeButtons.push({text: "Done"});
        return upgradeButtons;
    }
}