import undoManager from '../undoManager.js';
import uiCallbacks from '../uiCallbacks.js';
import makeGradient from './makeGradient.js';
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

var soldierDivsById = {};

// Initial rendering of the game map (regions) as an SVG object.
function showMap(container, gameState) {

    // define gradients and clipping paths for rendering
    const defs = elem('defs', {},
            makeClipPaths() +
            makeGradient('ocean', '#69e', '#48b') +
            makeGradient('land', '#dcb', '#a98') +
            makeGradient('land-highlight', '#fb7', '#741') +
            makeGradient('bottom', '#210', '#000') +
            makeGradient('shadow', '#55d', '#134') +
            gameData.players.map(function(player, index) {
                return makeGradient('p' + index, player.colorStart, player.colorEnd) +
                    makeGradient('p' + index + '-highlight', player.highlightStart, player.highlightEnd);
            }).join(''));

    // create all the layers (5 per region)
    const ocean = makePolygon(
        [[0,0], [geomUtils.MAP_WIDTH, 0], [geomUtils.MAP_WIDTH, geomUtils.MAP_HEIGHT], [0, geomUtils.MAP_HEIGHT]],
        'ocean', 'ocean'
    );
    const tops = makeRegionPolys('region', 'land', 1, 1, 0, 0);
    const bottoms = makeRegionPolys('bottom', 'bottom', 1, 1, .05, .05);
    const shadows = makeRegionPolys('shadow', 'shadow', 1.05, 1.05, .2, .2, ' ');
    const highlighters = makeRegionPolys('highlight', '', 1, 1, 0, 0, 'stroke:#fff;stroke-width:1.5;opacity:0.0;', 'clip');

    // replace the map container contents with the new map
    container.innerHTML = elem('svg', {
        viewbox: '0 0 100 100',
        preserveAspectRatio: 'none'
    }, defs + ocean + shadows + bottoms + tops + highlighters);

    // clean some internal structures used to track HTML nodes
    soldierDivsById = {};

    // hook up region objects to their HTML elements
    gameData.regions.map(function(region, index) {
        region.element = $('region' + index);
        region.center = projectPoint(centerOfWeight(region.points));

        region.highlight = $('highlight' + index);
        onClickOrTap(region.highlight, event => uiCallbacks.invokeCallback(region, 'regionSelected', event));
    });

    // additional callbacks for better UI
    onClickOrTap(document.body, event => uiCallbacks.invokeCallback(null, 'regionSelected', event));

    // make the temple <div>s
    makeTemples();

    // makes clipping paths for the "highlight" polygons
    function makeClipPaths() {
        return gameData.regions.map((region, index) => {
            return elem('clipPath', {i: 'clip' + index}, makePolygon(region.points, 'cp' + index, 'land', ''));
        }).join('');
    }

    // a helper for creating a polygon with a given setup for all regions
    function makeRegionPolys(idPrefix, gradient, xm, ym, xd, yd, stroke, clip) {

        return elem('g', {}, gameData.regions.map((region, index) => {
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

            const center = gameData.regions[temple.regionIndex].center,
                style = 'left:' + (center[0] - 1.5) + '%; top:' + (center[1] - 4) + '%';

            const obj = {c: 'temple-level'};
            const templeHTML = div({
                c: 'temple',
                s: style
            }, div(obj, div(obj, div(obj, div(obj)))));
            temple.element = append('map', templeHTML);

            onClickOrTap(temple.element, event =>
                uiCallbacks.invokeCallback(gameData.regions[temple.regionIndex], 'templeSelected', event)
            );
        });
    }
}

// Updating the display to match the current game state.
function updateMapDisplay(gameState) {
    gameData.regions.map(updateRegionDisplay);
    forEachProperty(gameState.temples, updateTempleDisplay);

    var soldiersStillAlive = [];
    forEachProperty(gameState.soldiersByRegion, function(soldiers, regionIndex) {
        soldiers.map((soldier, i) => updateSoldierDisplay(gameData.regions[regionIndex], soldier, i));
    });

    forEachProperty(soldierDivsById, function(div, id) {
        if (soldiersStillAlive.indexOf(parseInt(id)) < 0) {
            // this is an ex-div - in other words, the soldier it represented is dead.
            $('map').removeChild(div);
            // surprisingly, this should be safe to do during iteration - http://stackoverflow.com/a/19564686
            delete soldierDivsById[id];

            spawnSmokeParticles(div)
        }
    });

    updateFloatingText();
    updateTooltips();
    updateSoldierTooltips();

    function updateRegionDisplay(region) {
        const regionOwner = gameState.owner(region);
        let gradientName = (regionOwner ? 'p' + regionOwner.index : 'land');

        // a region is highlighted if it has an available move, or belongs to the winner
        // (end game display highlights the winner)
        const hasAvailableMove =
            sequenceUtils.contains(gameState.moveDecision && gameState.moveDecision.highlitRegions || [], region.index);
        const highlighted = hasAvailableMove || (gameState.endResult && regionOwner == gameState.endResult);

        if (highlighted) {
            gradientName += '-highlight';
        }
        let highlightedOpacity = 0.1 + region.center[0] * 0.003;
        if (gameState.endResult || (gameState.moveDecision && gameState.moveDecision.source == region.index))
            highlightedOpacity *= 2;
        region.highlight.style.opacity = highlighted ? highlightedOpacity : 0.0;
        region.highlight.style.cursor = highlighted ? 'pointer' : 'default';

        if (gameState.particleTempleRegion == region) {
            gameState.particleTempleRegion = undefined; // only once (was 0)
            spawnCelebratoryParticles(region);
        }

        region.element.style.fill = 'url(#' + gradientName + ')';
    }

    function updateTooltips() {
        [].slice.call(document.querySelectorAll('.ttp')).map(element => $('map').removeChild(element));
        if (gameState.activePlayer().personality) return;

        // "how to move" tooltips
        const hasSource = gameState.moveDecision && typeof gameState.moveDecision.source == 'number';
        if (hasSource)  {
            showHowToMoveTips();
        }
        else {
            showConqueringCannotMoveTip();
        }
        if (gameState.turnIndex == 2 && gameState.movesRemaining == 2) {
            showTooltipOver({ center:[90, 93] },
                "If you want to undo a move or check the rules, use the buttons here.", 15);
        }
    }

    function showHowToMoveTips() {
        const source = gameData.regions[gameState.moveDecision.source];
        showTooltipOver(source, "Click this region again to change the number of soldiers.");
        // pick the furthest neighbor
        const furthestIdx = sequenceUtils.max(source.neighbors, (nbr) => source.centerDistanceFrom(gameData.regions[nbr]));
        showTooltipOver(gameData.regions[furthestIdx], "Click a bordering region to move.");
    }

    function showConqueringCannotMoveTip() {
        const inactiveArmies = gameState.conqueredRegions;
        if (inactiveArmies) {
            showTooltipOver(gameData.regions[inactiveArmies[inactiveArmies.length - 1]],
                "Armies that conquer a new region cannot move again.");
            showTooltipOver({ center: [-2, 80] }, "Once you're done, click 'End turn' here.");
        }
    }

    function showTooltipOver(region, text, width) {
        if (storage.gameSetup.firstTimeInstructions[text]) return;
        setTimeout(function() {
            // don't display it again (timeout to handle multiple updateDisplays() in a row)
            storage.gameSetup.firstTimeInstructions[text] = 1;
            storage.storeSetup();
        }, 500);

        width = width || 7;
        var left = region.center[0] - (width + 1) * 0.5, bottom = 102 - region.center[1];
        var styles = 'bottom: ' + bottom + '%; left: ' + left + '%; width: ' + width + '%';

        append('map', div({c: 'tt ttp', s: styles}, text));
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

        var selected = gameState.moveDecision && gameState.moveDecision.temple == temple;
        toggleClass(temple.element, 'selected', selected);
    }

    function updateSoldierDisplay(region, soldier, index) {
        // we're still alive, so no removing our <div>
        soldiersStillAlive.push(soldier.i);

        // find or create a <div> for showing the soldier
        let domElement = soldierDivsById[soldier.i];
        if (!domElement) {
            var html = div({c: 'soldier', s: 'display: none'});
            domElement = append('map', html);
            soldierDivsById[soldier.i] = domElement;
            onClickOrTap(domElement, (event) => uiCallbacks.invokeCallback(soldier, 'soldierSelected', event));
        }

        // (re)calculate where the <div> should be
        const center = region.center;
        const totalSoldiers = gameState.soldierCount(region);

        const columnWidth = sequenceUtils.min([totalSoldiers, 4]);
        const rowHeight = sequenceUtils.min([2 / Math.ceil(totalSoldiers / 4), 1]);

        const x = index % 4, y = Math.floor(index / 4);
        const xOffset = (-0.6 * columnWidth + x * 1.2);
        const yOffset = y * rowHeight + (gameState.temples[region.index] ? 1.5 : 0);
        let xPosition = center[0] + xOffset - yOffset * 0.2;
        let yPosition = center[1] + xOffset * 0.2 + yOffset;

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

        var decisionState = gameState.moveDecision || {};
        toggleClass(domElement, 'selected', (decisionState.source == region.index && index < decisionState.count));
    }

    function updateSoldierTooltips() {
        gameData.regions.map(function(region, regionIndex) {
            var tooltipId = 'side-control' + regionIndex;
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
                        c: 'tt soldier-tt',
                        s: "left:" + (region.center[0] - 1.5) + '%;top:' + (region.center[1] + 1.2) + '%'
                    }, '');
                    tooltip = append('map', tooltipHTML);
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
            if (typeof floater.regionIdx === 'number') {
                const region = gameData.regions[floater.regionIdx]
                x = region.center[0];
                y = region.center[1];
            } else if (floater.soldier) {
                var node = soldierDivsById[floater.soldier.i];
                x = parseFloat(node.style.left) + 0.2;
                y = parseFloat(node.style.top) + 0.2;
            } else {
                throw new Error("The floater had niether region, nor soldier:\n" + JSON.stringify(floater));
            }

            x -= floater.width / 2 + 0.5; y -= 4;

            var styles = "left: " + x + "%;top:" + y + "%;color:" + floater.center + ";width:" + floater.width + "%";
            var floatingNode = append('map', div({c: 'tt', s: styles}, floater.text));
            setTransform(floatingNode, "translate3d(0,0,0)");
            floatAway(floatingNode, 0, -3);
        });
        gameState.floatingText = undefined;
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
            ((storage.gameSetup.turnCount != CONSTS.UNLIMITED_TURNS) ? ' / ' + storage.gameSetup.turnCount : '');
    }

    // player data
    gameData.players.map(function(player, index) {
        $('player-box' + index).className = (index == gameState.playerIndex) ? 'player-box active' : 'player-box inactive';
        var hasRegions = gameState.regionCount(player);
        var gameWinner = gameState.endResult;

        if (hasRegions) {
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
    if (!activePlayer.personality) {
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
    $('info').innerHTML = moveInfo;
    $('info').style.background = activePlayer.colorEnd;

    // activePlayer stats
    $('pd').style.display =  buildingMode ? 'none' : 'block';
    $('move-count').innerHTML = gameState.movesRemaining + elem('span', {s: 'font-size: 80%'}, '&#10138;');
    $('faith').innerHTML = gameState.cash[activePlayer.index] +  elem('span', {s: 'font-size: 80%'}, '&#9775;');

    // buttons
    updateButtons(decisionState && decisionState.buttons);

    // undo
    $('undo-button').innerHTML = undoManager.undoEnabled(gameState) ? "&#x21b6;" : "";
}

function updateButtons(buttons) {
    $('footer-buttons').innerHTML = '';
    (buttons || []).map(function(button, index) {
        if (button.hidden) return;

        var buttonContents = div({}, button.text);
        if (button.description)
            buttonContents += div({c: 'description'}, button.description);

        var buttonHTML = elem('a', {href: '#', c: button.disabled ? 'off' : ''}, buttonContents);
        var buttonNode = append('footer-buttons', buttonHTML);
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

    updateMapDisplay(displayedState);
    updateIngameUI(displayedState);

    if (displayedState.soundCue) {
        audio.playSound(displayedState.soundCue);
        displayedState.soundCue = null; // probably not needed
    }
}

function showBanner(background, text, delay, duration) {
    delay = delay || 1;
    duration = duration || 1600;
    erisk.oneAtaTime(delay, function() {
        // create a new banner div
        let banner = append('container', div({c: 'button'}, text));
        let styles = banner.style;

        styles.background = background;
        styles.opacity = 0.0;
        setTransform(banner, transform(-1));

        setTimeout(function() { styles.opacity = 1.0; setTransform(banner, transform(1)); }, 0.1 * duration);
        setTimeout(function() { styles.opacity = 1.0; }, 0.5 * duration);
        setTimeout(function() { styles.opacity = 0.0; }, 0.7 * duration);
        setTimeout(function() { banner.parentNode.removeChild(banner); }, duration);
    });

    function transform(offset) {
        return "translate3d(1.2em, " + offset + "em, 0) rotateY(" + (10 + offset * 2) + "deg)";
    }
}

function spawnSmokeParticles(div) {
    const x = parseFloat(div.style.left);
    const y = parseFloat(div.style.top);
    const numParticles = 20;
    range(0, numParticles).map(function() {
        const angle = Math.random() * 6.28;
        const dist = rint(0, 200) / 80;
        spawnParticle(x + Math.sin(angle) * dist, y + Math.cos(angle) * dist, 0, -1, '#112');
    });
}

function spawnCelebratoryParticles(region) {
    region.points.map(point => {
        point = projectPoint(point);
        const center = region.center;
        const alpha = rint(30, 150) / 100;
        const startPoint = [lerp(alpha, center[0], point[0]), lerp(alpha, center[1], point[1])];
        const vx = (startPoint[0] - center[0]) / 2;
        const vy = (startPoint[1] - center[1]) / 2 - 0.15;
        spawnParticle(startPoint[0], startPoint[1], vx, vy, '#fff');
    });
}

function spawnParticle(x, y, vx, vy, color) {
    // box-shadow:  x-offset, y-offset, blur radius, spread radius, color
    var styleString = "opacity:1; left: " + x + "%;top: " + y + "%; box-shadow: 0 0 4px 4px " + color;
    var particle = append('map', div({c: 'particle', s: styleString}, ''));
    floatAway(particle, vx, vy);
}

function floatAway(elem, vx, vy) {
    setTimeout(function() {
        setTransform(elem, "translate3d(" + vx + "em," + vy + "em,0)");
        elem.style.opacity = 0.0;
    }, 100);
    setTimeout(function() {
        if ($('map').contains(elem))
            $('map').removeChild(elem);
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
