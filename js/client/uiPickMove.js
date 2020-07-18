import utils from '../utils/utils.js';
import domUtils from './utils/domUtils.js';
import sequenceUtils from '../utils/sequenceUtils.js';
import CONSTS from '../state/CONSTS.js';
import undoManager from './undoManager.js';
import gameRenderer from './rendering/gameRenderer.js';
import uiCallbacks from './uiCallbacks.js';
import { Move, ArmyMove, BuildMove, EndMove } from '../state/model/Move.js';
import gameData from '../state/gameData.js';
const { UPGRADES } = CONSTS;


/**
 * This is one of the "player controller" methods - the one that is responsible for picking a move for a player.
 * It does that using a human and some UI, and calls reportMoveCallback with an object describing the move once
 * it is decided
 */
var uiState = {};

export default function uiPickMove(player, state, reportMoveCallback) {

    if (!state.regionCount(player)) // skip players that are not longer in the game
        return reportMoveCallback(new EndMove());

    uiCallbacks.setRegionSelectedCB(function(region) {
        if (!region || state.moveDecision.isBuildMove())
            setCleanState();

        if (typeof state.moveDecision.source == 'undefined' && region) {
            // no move in progress - start a new move if this is legal
            if (state.regionHasActiveArmy(player, region)) {
                setCleanState();
                state.moveDecision = new ArmyMove({ state, source: region.index, count: state.soldierCount(region) });
                state.moveDecision.buttons[0].hidden = false;
                state.moveDecision.highlitRegions = region.neighbors.concat(region.index);
            }
        } else if (region) {
            // we already have a move in progress
            let moveDecision = state.moveDecision;
            // what region did we click?
            if (region.index == moveDecision.source) {
                // the one we're moving an army from - tweak number of selected soldiers
                moveDecision.count = moveDecision.count % state.soldierCount(region) + 1;
            }
            else if (gameData.regions[moveDecision.source].neighbors.indexOf(region.index) > -1) {
                // one of the neighbors - let's finalize the move
                uiCallbacks.clearAll();
                moveDecision.setDestination(region.index, state);
                return reportMoveCallback(moveDecision);
            }
            else {
                // some random region - cancel move
                setCleanState();
            }
        }
        gameRenderer.updateDisplay(state);
    });

    uiCallbacks.setTempleSelectedCB(function(region) {
        var temple = state.temples[region.index];
        state.moveDecision = new BuildMove({ temple, buttons: makeUpgradeButtons(temple) });
        gameRenderer.updateDisplay(state);
    });

    uiCallbacks.setSoldierSelectedCB(function(soldier) {
        // delegate to the region click handler, after finding out which region it is
        var soldierRegion = null;
        gameData.regions.map(function(region) {
            if (sequenceUtils.contains(state.soldiersAtRegion(region.index), soldier))
                soldierRegion = region;
        });
        if (soldierRegion)
            uiCallbacks.regionSelected(soldierRegion);
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
                    uiState[player.index] = gameData.regions[state.moveDecision.regionIndex];
                // report the move
                reportMoveCallback(state.moveDecision);
            }
        } else {
            // move action buttons handled here
            if (which === 1) {
                uiCallbacks.clearAll(); // end turn
                reportMoveCallback(new EndMove());
            } else {
                setCleanState(); // cancel move
            }
        }
    });

    uiCallbacks.setUndoCB(() => undoManager.performUndo(state));

    setCleanState();
    if (uiState[player.index]) {
        uiCallbacks.templeSelected(uiState[player.index]);
        delete uiState[player.index];
    }

    function setCleanState() {
        state.moveDecision = new Move();
        state.moveDecision.highlitRegions =
            gameData.regions.filter(region => state.regionHasActiveArmy(player, region)).map((r) => r.index);
        gameRenderer.updateDisplay(state);
    }

    function makeUpgradeButtons(temple) {
        var templeOwner = state.owner(temple.regionIndex);
        var upgradeButtons = UPGRADES.map(function(upgrade) {
            // current upgrade level (either the level of the temple or number of soldiers bought already)
            const level = (temple.upgrade == upgrade) ?
                (temple.level + 1) : ((upgrade === UPGRADES.SOLDIER) ? (state.numBoughtSoldiers || 0) : 0);


            const cost = upgrade.cost[level];
            const text = utils.template(upgrade.name, CONSTS.LEVELS[level]) +
                       domUtils.elem('b', {}, " (" + cost + "&#9775;)");
            const description = utils.template(upgrade.desc, upgrade.level[level]);

            let curUpgrade = temple.upgrade;
            let inconsistentUpgrade = // the temple is already upgraded with a different upgrade
                curUpgrade && curUpgrade != upgrade && upgrade != UPGRADES.SOLDIER && upgrade != UPGRADES.REBUILD;
            var hidden =
                (upgrade === UPGRADES.REBUILD && !curUpgrade) // rebuild only available if temple is upgraded
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