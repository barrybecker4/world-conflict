import audio from '../utils/audio.js';
import utils from '../../utils/utils.js';
import domUtils from '../utils/domUtils.js';
import sequenceUtils from '../../utils/sequenceUtils.js';
import gameData from '../../state/consts/gameData.js';
import storage from '../storage.js';
import appState from '../appState.js';
import gameInitialization from '../gameInitialization.js';
import undoManager from '../undoManager.js';
import uiCallbacks from '../uiCallbacks.js';
import oneAtaTime from '../utils/oneAtaTime.js';
import makeGradient from './makeGradient.js';
import geomUtils from './geomUtils.js';
import uiPickMove from '../uiPickMove.js';
import map from '../map.js';
const { range, rint, sum, lerp, forEachProperty } = utils;
const { elem, div, $,  append, onClickOrTap,  toggleClass, setTransform } = domUtils;
const { projectPoint, makePolygon, centerOfWeight, transformPoints } = geomUtils

export default {
   preserveAspect,
   showMap,
   updateMapDisplay,
   updateButtons,
   updateDisplay,
   showBanner,
};

// Creates the rendering of the game map as an SVG object.
// Takes the map (regions) stored in gameState.region, and creates an SVG map out of it.
function showMap(container, gameState, regions) {

    // define gradients and clipping paths for rendering
    var defs = elem('defs', {},
            makeClipPaths() +
            makeGradient('b', '#69e', '#48b') +
            makeGradient('l',  '#dba', '#b98') +
            makeGradient('lh', '#fb7', '#741') +
            makeGradient('d', '#210', '#000') +
            makeGradient('w', '#55f', '#003') +
            gameState.players.map(function(player, index) {
                return makeGradient('p' + index, player.colorStart, player.colorEnd) +
                    makeGradient('p' + index + 'h', player.highlightStart, player.highlightEnd);
            }).join(''));

    // create all the layers (5 per region)
    var ocean = makePolygon(
        [[0,0], [geomUtils.MAP_WIDTH, 0], [geomUtils.MAP_WIDTH, geomUtils.MAP_HEIGHT], [0, geomUtils.MAP_HEIGHT]],
        'b', 'b'
    );
    var tops = makeRegionPolys('r', 'l', 1, 1, 0, 0);
    var bottoms = makeRegionPolys('d', 'd', 1, 1, .05, .05);
    var shadows = makeRegionPolys('w', 'w', 1.05, 1.05, .2, .2, ' ');
    var highlighters = makeRegionPolys('hl', '', 1, 1, 0, 0, 'stroke:#fff;stroke-width:1.5;opacity:0.0;', 'clip');

    // replace the map container contents with the new map
    container.innerHTML = elem('svg', {
        viewbox: '0 0 100 100',
        preserveAspectRatio: 'none'
    }, defs + ocean + shadows + bottoms + tops + highlighters);

    // clean some internal structures used to track HTML nodes
    soldierDivsById = {};

    // hook up region objects to their HTML elements
    regions.map(function(region, index) {
        region.element = $('r' + index);
        region.center = projectPoint(centerOfWeight(region.points));

        region.hl = $('hl' + index);
        onClickOrTap(region.hl, event => uiCallbacks.invokeCallback(region, 'regionSelected', event));
    });

    // additional callbacks for better UI
    onClickOrTap(document.body, event => uiCallbacks.invokeCallback(null, 'regionSelected', event));

    // make the temple <div>s
    makeTemples();

    // makes clipping paths for the "highlight" polygons
    function makeClipPaths() {
        return regions.map((region, index) => {
            elem('clipPath', {i: 'clip' + index}, makePolygon(region.points, 'cp' + index, 'l', ''));
        }).join('');
    }

    // a helper for creating a polygon with a given setup for all regions
    function makeRegionPolys(idPrefix, gradient, xm, ym, xd, yd, stroke, clip) {

        return elem('g', {}, regions.map((region, index) => {
            const clipRegion = clip ? 'url(#' + clip + index + ')' : '';
            return makePolygon(
                transformPoints(region.points, xm, ym, xd, yd),
                idPrefix + index, gradient, stroke, clipRegion
            );
        }).join(''));
    }

    // makes temple, which are just <div>s with nested <div>s (the towers)
    function makeTemples() {
        forEachProperty(gameState.temples, function(temple) {

            var center = regions[temple.regionIndex].center,
                style = 'left:' + (center[0] - 1.5) + '%; top:' + (center[1] - 4) + '%';

            // create the temple <div>s
            var templeHTML = div({
                c: 'o',
                s: style
            }, div({c: 'i'}, div({c: 'i'}, div({c: 'i'}, div({c: 'i'})))));
            temple.element = append('m', templeHTML);

            onClickOrTap(temple.element, event =>
                uiCallbacks.invokeCallback(regions[temple.regionIndex], 'templeSelected', event)
            );
        });
    }
}

// Updating the display to match the current game state.

var soldierDivsById = {};

function updateMapDisplay(gameState, regions) {
    regions.map(updateRegionDisplay);
    forEachProperty(gameState.temples, updateTempleDisplay);

    var soldiersStillAlive = [];
    forEachProperty(gameState.soldiers, function(soldiers, regionIndex) {
        soldiers.map((soldier, i) => updateSoldierDisplay(regions[regionIndex], soldier, i));
    });

    forEachProperty(soldierDivsById, function(div, id) {
        if (soldiersStillAlive.indexOf(parseInt(id)) < 0) {
            // this is an ex-div - in other words, the soldier it represented is dead
            $('m').removeChild(div);
            // surprisingly, this should be safe to do during iteration - http://stackoverflow.com/a/19564686
            delete soldierDivsById[id];

            // spawn some particles
            var x = parseFloat(div.style.left), y = parseFloat(div.style.top);
            let numParticles = 20;
            range(0, numParticles).map(function() {
                var angle = Math.random() * 6.28, dist = rint(0,100) / 80;
                spawnParticle(x + Math.sin(angle) * dist, y + Math.cos(angle) * dist, 0, -1, '#000');
            });
        }
    });

    updateFloatingText();
    updateTooltips();
    updateSoldierTooltips();

    function updateRegionDisplay(region) {
        var regionOwner = gameState.owner(region);
        var gradientName = (regionOwner ? 'p' + regionOwner.index : 'l');

        // a region is highlighted if it has an available move, or belongs to the winner
        // (end game display highlights the winner)
        const hasAvailableMove =
            sequenceUtils.contains(gameState.moveDecision && gameState.moveDecision.highlitRegions || [], region.index);
        var highlighted = hasAvailableMove || (gameState.endResult && regionOwner == gameState.endResult);

        // highlighting
        if (highlighted) {
            gradientName += 'h';
        }
        var highlightedOpacity = 0.1 + region.center[0] * 0.003;
        if (gameState.endResult || (gameState.moveDecision && gameState.moveDecision.source == region.index))
            highlightedOpacity *= 2;
        region.hl.style.opacity = highlighted ? highlightedOpacity : 0.0;
        region.hl.style.cursor = highlighted ? 'pointer' : 'default';

        // particles
        if (gameState.particleTempleRegion == region) {
            gameState.particleTempleRegion = 0; // only once
            region.points.map(function(point) {
                point = projectPoint(point);
                var center = region.center;
                var alpha = rint(30, 100) / 100;
                var startPoint = [lerp(alpha, center[0], point[0]), lerp(alpha, center[1], point[1])];
                var vx = (startPoint[0] - center[0]) / 2, vy = (startPoint[1] - center[1]) / 2 - 0.15;
                spawnParticle(startPoint[0], startPoint[1], vx, vy, '#fff');
            });
        }

        // fill
        region.element.style.fill = 'url(#' + gradientName + ')';
    }

    function updateTooltips() {
        [].slice.call(document.querySelectorAll('.ttp')).map(element => $('m').removeChild(element));
        if (gameState.activePlayer().pickMove != uiPickMove) return;

        // "how to move" tooltips
        const hasSource = gameState.moveDecision && typeof gameState.moveDecision.source == 'number';
        if (hasSource)  {
            const source = map.regions[gameState.moveDecision.source];
            showTooltipOver(source, "Click this region again to change the number of soldiers.");
            // pick the furthest neighbor
            var furthest = sequenceUtils.max(source.neighbors, (nbr) => source.centerDistanceFrom(map.regions[nbr]));
            showTooltipOver(furthest, "Click a bordering region to move.");
        }
        else {
            // "conquering armies cannot move" tooltips
            var inactiveArmies = gameState.conqueredRegions;
            if (inactiveArmies) {
                showTooltipOver(inactiveArmies[inactiveArmies.length - 1], "Armies that conquer a new region cannot move again.")
                showTooltipOver({center: [-2, 80]},
                    "Once you're done, click 'End turn' here.");
            }
        }
        if (gameState.turnIndex == 2 && gameState.movesRemaining == 2) {
            showTooltipOver({ center:[90, 93] },
                "If you want to undo a move or check the rules, use the buttons here.", 15);
        }
    }

    function showTooltipOver(region, text, width) {
        if (gameInitialization.gameSetup.firstTimeInstructions[text]) return;
        setTimeout(function() {
            // don't display it again (timeout to handle multiple updateDisplays() in a row)
            gameInitialization.gameSetup.firstTimeInstructions[text] = 1;
            storage.storeSetup(gameInitialization.gameSetup);
        }, 500);

        width = width || 7;
        var left = region.center[0] - (width + 1) * 0.5, bottom = 102 - region.center[1];
        var styles = 'bottom: ' + bottom + '%; left: ' + left + '%; width: ' + width + '%';

        append('m', div({c: 'tt ttp', s: styles}, text));
    }

    function updateTempleDisplay(temple) {
        var element = temple.element;

        // right color and right number of levels (corresponding to upgrade level)
        var templeLevels = temple.upgrade ? (temple.level + 3) : 2;
        while (element) {
            element.style.display = (templeLevels > 0) ? 'block' : 'none';
            element.style.background = temple.upgrade ? temple.upgrade.bgColor : '#999';

            templeLevels--;
            element = element.firstChild;
        }

        // which cursor should we use?
        let templeOwner = gameState.owner(temple.regionIndex);
        let activePlayerIsTempleOwner = templeOwner == gameState.activePlayer();
        temple.element.style.cursor = appState.isInGame() ?
            (activePlayerIsTempleOwner ? 'zoom-in' : 'help') : 'default';

        // highlight?
        var selected = gameState.moveDecision && gameState.moveDecision.temple == temple;
        toggleClass(temple.element, 'l', selected);
    }

    function updateSoldierDisplay(region, soldier, index) {
        // we're still alive, so no removing our <div>
        soldiersStillAlive.push(soldier.i);

        // find or create a <div> for showing the soldier
        var domElement = soldierDivsById[soldier.i];
        if (!domElement) {
            var html = div({c: 's', s: 'display: none'});

            domElement = soldierDivsById[soldier.i] = append('m', html);
            onClickOrTap(domElement, (event) => uiCallbacks.invokeCallback(soldier, 'soldierSelected', event));
        }

        // (re)calculate where the <div> should be
        var center = region.center;
        var totalSoldiers = gameState.soldierCount(region);

        var columnWidth = sequenceUtils.min([totalSoldiers, 4]);
        var rowHeight = sequenceUtils.min([2 / Math.ceil(totalSoldiers / 4), 1]);

        var x = index % 4, y = Math.floor(index / 4);
        var xOffset = (-0.6 * columnWidth + x * 1.2);
        var yOffset = y * rowHeight + (gameState.temples[region.index] ? 1.5 : 0);
        var xPosition = center[0] + xOffset - yOffset * 0.2;
        var yPosition = center[1] + xOffset * 0.2 + yOffset;

        if (soldier.attackedRegion) {
            // we're attacking right now - move us closer to target region
            var targetCenter = soldier.attackedRegion.center;
            xPosition = (xPosition + targetCenter[0]) / 2;
            yPosition = (yPosition + targetCenter[1]) / 2;
        }
        domElement.style.left = xPosition + '%';
        domElement.style.top  = yPosition + '%';
        domElement.style.zIndex = 20 + y * 5 + x;
        domElement.style.display = 'block';

        // selected?
        var decisionState = gameState.moveDecision || {};
        toggleClass(domElement, 'l', (decisionState.source == region.index && index < decisionState.count));
    }

    function updateSoldierTooltips() {
        regions.map(function(region, regionIndex) {
            var tooltipId = 'sc' + regionIndex;
            // delete previous tooltip, if present
            var tooltip = $(tooltipId);

            // should we have a tooltip?
            var count = gameState.soldierCount(region);
            if (count > 8) {
                const moveSourceIsRegion = (gameState.moveDecision && (gameState.moveDecision.source == region.index));
                var selected = moveSourceIsRegion ? gameState.moveDecision.count : 0;
                selected += sequenceUtils.sum(gameState.soldiersAtRegion(regionIndex), function(soldier) {
                    return soldier.attackedRegion ? 1 : 0;
                });
                if (selected)
                    count = selected + "<hr>" + count;

                if (!tooltip) {
                    var tooltipHTML = div({
                        i: tooltipId,
                        c: 'tt stt',
                        s: "left:" + (region.center[0] - 1.5) + '%;top:' + (region.center[1] + 1.2) + '%'
                    }, '');
                    tooltip = append('m', tooltipHTML);
                }
                tooltip.innerHTML = count;
            } else if (tooltip) {
                tooltip.parentNode.removeChild(tooltip);
            }
        });
    }

    function updateFloatingText() {
        let floaters = gameState.floatingText || [];
        floaters.map(function(floater) {
            var x, y;
            if (floater.region) {
                x = floater.region.center[0];
                y = floater.region.center[1];
            } else if (floater.soldier) {
                var node = soldierDivsById[floater.soldier.i];
                x = parseFloat(node.style.left) + 0.2;
                y = parseFloat(node.style.top) + 0.2;
            } else {
                throw new Error("The floater had niether region, nor soldier:\n" + JSON.stringify(floater));
            }

            x -= floater.width / 2 + 0.5; y -= 4;

            var styles = "left: " + x + "%;top:" + y + "%;color:" + floater.center + ";width:" + floater.width + "%";
            var floatingNode = append('m', div({c: 'tt', s: styles}, floater.text));
            setTransform(floatingNode, "translate3d(0,0,0)");
            floatAway(floatingNode, 0, -3);
        });
        gameState.floatingText = 0;
    }
}

function updateIngameUI(gameState) {
    var decisionState = gameState.moveDecision;
    var buildingMode = decisionState && decisionState.isBuildMove();
    var movingArmy = decisionState && decisionState.isArmyMove();

    var activePlayer = gameState.activePlayer();

    // turn counter/building name
    if (buildingMode) {
        var info = gameState.templeInfo(decisionState.temple);
        $('turn-count').innerHTML = div({}, info.name) + div({c: 'description'}, info.description);
    } else {
        $('turn-count').innerHTML =
            'Turn <b>' + gameState.turnIndex + '</b>' +
            ((gameInitialization.gameSetup.turnCount != gameData.UNLIMITED_TURNS) ? ' / ' + gameInitialization.gameSetup.turnCount : '');
    }

    // player data
    gameState.players.map(function(player, index) {
        //$('pl' + index).className = (index == gameState.player) ? 'pl' : 'pi'; // activePlayer or not?
        var regions = gameState.regionCount(player);
        var gameWinner = gameState.endResult;

        if (regions) {
            $('region-count' + index).innerHTML = gameState.regionCount(player) + '&#9733;';
            if (gameWinner) {
                $('player-cash' + index).innerHTML = (gameWinner == player) ? '&#9819;' : '';
            } else {
                $('player-cash' + index).innerHTML = gameState.cash[player.index] + '&#9775;'; // faith
            }
        } else {
            $('region-count' + index).innerHTML = '&#9760;'; // skull and crossbones, you're dead
            $('player-cash' + index).innerHTML = '';
        }
    });

    let moveInfo;
    if (activePlayer.pickMove == uiPickMove) {
        if (buildingMode) {
            if (gameState.owner(decisionState.regionIndex) == activePlayer)
                moveInfo = elem('p', {}, 'Choose an upgrade to build.');
            else
                moveInfo = '';
        } else if (movingArmy) {
            moveInfo = elem('p', {}, 'Click on this region again to choose how many to move.') +
                elem('p', {}, 'Click on a target region to move the army.');

        } else {

            moveInfo = elem('p', {}, 'Click on a region to move or attack with its army.') +
                elem('p', {}, 'Click on a temple to buy soldiers or upgrades with &#9775;.');
        }
    } else {
        moveInfo = elem('p', {}, activePlayer.name + ' is taking her turn.');
    }
    $('in').innerHTML = moveInfo;
    $('in').style.background = activePlayer.colorEnd;

    // activePlayer stats
    $('pd').style.display =  buildingMode ? 'none' : 'block';
    $('mc').innerHTML = gameState.movesRemaining + elem('span', {s: 'font-size: 80%'}, '&#10138;');
    $('ft').innerHTML = gameState.cash[activePlayer.index] +  elem('span', {s: 'font-size: 80%'}, '&#9775;');

    // buttons
    updateButtons(decisionState && decisionState.buttons);

    // undo
    $('undo-button').innerHTML = undoManager.undoEnabled(gameState) ? "&#x21b6;" : "";
}

function updateButtons(buttons) {
    $('u').innerHTML = '';
    (buttons || []).map(function(button, index) {
        if (button.hidden) return;

        var buttonContents = div({}, button.text);
        if (button.description)
            buttonContents += div({c: 'description'}, button.description);

        var buttonHTML = elem('a', {href: '#', c: button.disabled ? 'off' : ''}, buttonContents);
        var buttonNode = append('u', buttonHTML);
        if (!button.disabled) {
            onClickOrTap(buttonNode, (event) => uiCallbacks.invokeCallback(index, 'build', event));
        }
    });
}

var displayedState;
function updateDisplay(gameState) {
    // just for debugging
    if (gameState) {
        displayedState = gameState;
    }

    updateMapDisplay(displayedState, map.regions);
    updateIngameUI(displayedState);

    if (displayedState.soundCue) {
        audio.playSound(displayedState.soundCue);
        displayedState.soundCue = null;
    }
}

function showBanner(background, text, delay) {
    delay = delay || 1;
    oneAtaTime(delay, function() {
        // create a new banner div
        let banner = append('container', div({c: 'button'}, text));
        let styles = banner.style;

        styles.background = background;
        styles.opacity = 0.0;
        setTransform(banner, transform(-1));

        setTimeout(function() { styles.opacity = 1.0; setTransform(banner, transform(1)); }, 100),
        setTimeout(function() { styles.opacity = 1.0; }, 600),
        setTimeout(function() { styles.opacity = 0.0; }, 1100),
        setTimeout(function() { banner.parentNode.removeChild(banner); }, 1600)
    });

    function transform(offset) {
        return "translate3d(1.2em, " + offset + "em, 0) rotateY(" + (10 + offset * 2) + "deg)";
    }
}

function spawnParticle(x, y, vx, vy, color) {
    var styleString = "opacity:1; left: " + x + "%;top: " + y + "%; box-shadow: 0 0 1px 1px " + color;
    var particle = append('m', div({c: 'particle', s: styleString}, ''));
    floatAway(particle, vx, vy);
}

function floatAway(elem, vx, vy) {
    setTimeout(function() {
        setTransform(elem, "translate3d(" + vx + "em," + vy + "em,0)");
        elem.style.opacity = 0.0;
    }, 100);
    setTimeout(function() {
        if ($('m').contains(elem))
            $('m').removeChild(elem);
    }, 3050);
}

function preserveAspect() {
    setTimeout(function() {
        let w = window.innerWidth;
        let h = window.innerHeight;
        let aspect = 1.65, px = 'px';

        if (w / h > aspect) {
            w = h * aspect;
        } else {
            h = w / aspect;
        }

        var styles = $('container').style;
        styles.width = w + px;
        styles.height = h + px;
        styles.fontSize = 0.025 * h + px;
    }, 0);
}
