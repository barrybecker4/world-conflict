import audio from '../utils/audio.js';
import utils from '../utils/utils.js';
import sequenceUtils from '../utils/sequenceUtils.js';
import gameData from '../state/gameData.js';
import storage from '../state/storage.js';
import appState from '../state/appState.js';
import gameInitialization from '../gameInitialization.js';
import undoManager from '../state/undoManager.js';
import gameController from '../gameController.js';
import oneAtaTime from '../utils/oneAtaTime.js';
import makeGradient from './makeGradient.js';
import geomUtils from './geomUtils.js';
const {
    elem, div, map, $, range, rint, sum, append, lerp,
    onClickOrTap, forEachProperty, toggleClass, setTransform,
} = utils;
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
function showMap(container, gameState) {
    var regions = gameState.regions;

    // define gradients and clipping paths for rendering
    var defs = elem('defs', {},
            makeClipPaths() +
            makeGradient('b', '#69e', '#48b') +
            makeGradient('l',  '#dba', '#b98') + //  '#da8', '#ba7') + // '#fa6', '#530') +//
            makeGradient('lh', '#fb7', '#741') +
            makeGradient('d', '#210', '#000') +
            makeGradient('w', '#55f', '#003') +
            map(gameState.players, function(player, index) {
                return makeGradient('p' + index, player.colorStart, player.colorEnd) +
                    makeGradient('p' + index + 'h', player.highlightStart, player.highlightEnd);
            }).join(''));

    // create all the layers (5 per region)
    var ocean = makePolygon(
        [[0,0], [gameData.mapWidth,0], [gameData.mapWidth, gameData.mapHeight], [0, gameData.mapHeight]],
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
    map(regions, function(region, index) {
        region.e = $('r' + index);
        region.c = projectPoint(centerOfWeight(region.points));

        region.hl = $('hl' + index);
        onClickOrTap(region.hl, gameController.invokeUICallback.bind(0, region, 'regionSelected'));
    });

    // additional callbacks for better UI
    onClickOrTap(document.body, gameController.invokeUICallback.bind(0, null, 'regionSelected'));

    // make the temple <div>s
    makeTemples();

    // makes clipping paths for the "highlight" polygons
    function makeClipPaths() {
        return map(regions, function(region, index) {
            return elem('clipPath', {i: 'clip' + index}, makePolygon(region.points, 'cp' + index, 'l', ''));
        }).join('');
    }

    // a helper for creating a polygon with a given setup for all regions
    function makeRegionPolys(idPrefix, gradient, xm, ym, xd, yd, stroke, clip) {

        return elem('g', {}, map(regions, function(region, index) {
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

            var center = temple.region.c,
                style = 'left:' + (center[0] - 1.5) + '%; top:' + (center[1] - 4) + '%';

            // create the temple <div>s
            var templeHTML = div({
                c: 'o',
                s: style
            }, div({c: 'i'}, div({c: 'i'}, div({c: 'i'}, div({c: 'i'})))));
            temple.element = append('m', templeHTML);

            // retrieve elements and bind callbacks
            onClickOrTap(temple.element, gameController.invokeUICallback.bind(0, temple.region, 'templeSelected'));
        });
    }
}

// Updating the display to match the current game state.

var soldierDivsById = {};

function updateMapDisplay(gameState) {
    map(gameState.regions, updateRegionDisplay);
    forEachProperty(gameState.temples, updateTempleDisplay);

    var soldiersStillAlive = [];
    forEachProperty(gameState.soldiers, function(soldiers, regionIndex) {
        map(soldiers, updateSoldierDisplay.bind(0, gameState.regions[regionIndex]));
    });

    forEachProperty(soldierDivsById, function(div, id) {
        if (soldiersStillAlive.indexOf(parseInt(id)) < 0) {
            // this is an ex-div - in other words, the soldier it represented is dead
            $('m').removeChild(div);
            delete soldierDivsById[id]; // surprisingly, this should be safe to do during iteration - http://stackoverflow.com/a/19564686

            // spawn some particles
            var x = parseFloat(div.style.left), y = parseFloat(div.style.top);
            map(range(0, 20), function() {
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
        const hasAvailableMove = sequenceUtils.contains(gameState.moveDecision && gameState.moveDecision.h || [], region)
        var highlighted = hasAvailableMove || (gameState.endResult && regionOwner == gameState.endResult);

        // highlighting
        if (highlighted) {
            gradientName += 'h';
        }
        var highlightedOpacity = 0.1 + region.c[0] * 0.003;
        if (gameState.endResult || (gameState.moveDecision && gameState.moveDecision.source == region))
            highlightedOpacity *= 2;
        region.hl.style.opacity = highlighted ? highlightedOpacity : 0.0;
        region.hl.style.cursor = highlighted ? 'pointer' : 'default';

        // particles
        if (gameState.prt == region) {
            gameState.prt = 0; // only once
            map(region.points, function(point) {
                point = projectPoint(point);
                var center = region.c;
                var alpha = rint(30, 100) / 100;
                var startPoint = [lerp(alpha, center[0], point[0]), lerp(alpha, center[1], point[1])];
                var vx = (startPoint[0] - center[0]) / 2, vy = (startPoint[1] - center[1]) / 2 - 0.15;
                spawnParticle(startPoint[0], startPoint[1], vx, vy, '#fff');
            });
        }

        // fill
        region.e.style.fill = 'url(#' + gradientName + ')';
    }

    function updateTooltips() {
        map(document.querySelectorAll('.ttp'), $('m').removeChild.bind($('m')));
        if (gameState.activePlayer().pickMove != gameController.uiPickMove) return;

        // "how to move" tooltips
        var source = gameState.moveDecision && gameState.moveDecision.source;
        if (source)  {
            showTooltipOver(source, "Click this region again to change the number of soldiers.");
            // pick the furthest neighbour
            var furthest = sequenceUtils.max(source.neighbors, function(neighbor) {
                return Math.abs(source.c[0] - neighbor.c[0]) + Math.abs(source.c[1] - neighbor.c[1]);
            });
            showTooltipOver(furthest, "Click a bordering region to move.");
        }
        if (!source) {
            // "conquering armies cannot move" tooltips
            var inactiveArmies = gameState.move.z;
            if (inactiveArmies) {
                showTooltipOver(inactiveArmies[inactiveArmies.length-1], "Armies that conquer a new region cannot move again.")
                showTooltipOver({c: [-2, 80]}, "Once you're done, click 'End turn' here.");
            }
        }
        if (gameState.move.turnIndex == 2 && gameState.move.movesRemaining == 2) {
            showTooltipOver({ c:[90,93] }, "If you want to undo a move or check the rules, use the buttons here.", 15);
        }
    }

    function showTooltipOver(region, text, width) {
        if (gameInitialization.gameSetup.tt[text]) return;
        setTimeout(function() {
            // don't display it again (timeout to handle multiple updateDisplays() in a row)
            gameInitialization.gameSetup.tt[text] = 1;
            storage.storeSetup(gameInitialization.gameSetup);
        }, 500);

        width = width || 7;
        var left = region.c[0] - (width+1) * 0.5, bottom = 102 - region.c[1];
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
        let templeOwner = gameState.owner(temple.region);
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
            onClickOrTap(domElement, gameController.invokeUICallback.bind(0, soldier, 'soldierSelected'));
        }

        // (re)calculate where the <div> should be
        var center = region.c;
        var totalSoldiers = gameState.soldierCount(region);

        var columnWidth = sequenceUtils.min([totalSoldiers, 4]);
        var rowHeight = sequenceUtils.min([2 / Math.ceil(totalSoldiers / 4), 1]);

        var x = index % 4, y = Math.floor(index / 4);
        var xOffset = (-0.6 * columnWidth + x * 1.2);
        var yOffset = y * rowHeight + (gameState.temples[region.index] ? 1.5 : 0);
        var xPosition = center[0] + xOffset - yOffset * 0.2;
        var yPosition = center[1] + xOffset * 0.2 + yOffset;

        if (soldier.a) {
            // we're attacking right now - move us closer to target region
            var targetCenter = soldier.a.c;
            xPosition = (xPosition + targetCenter[0]) / 2;
            yPosition = (yPosition + targetCenter[1]) / 2;
        }
        domElement.style.left = xPosition + '%';
        domElement.style.top  = yPosition + '%';
        domElement.style.zIndex = 20 + y * 5 + x;
        domElement.style.display = 'block';

        // selected?
        var decisionState = gameState.moveDecision || {};
        toggleClass(domElement, 'l', (decisionState.source == region) && (index < decisionState.count));
    }

    function updateSoldierTooltips() {

        map(gameState.regions, function(region, regionIndex) {
            var tooltipId = 'sc' + regionIndex;
            // delete previous tooltip, if present
            var tooltip = $(tooltipId);

            // should we have a tooltip?
            var count = gameState.soldierCount(region);
            if (count > 8) {
                var selected = (gameState.moveDecision && (gameState.moveDecision.source == region)) ? gameState.moveDecision.count : 0;
                selected += sequenceUtils.sum(gameState.soldiers[regionIndex], function(soldier) {
                    return soldier.a ? 1 : 0;
                });
                if (selected)
                    count = selected + "<hr>" + count;

                if (!tooltip) {
                    var tooltipHTML = div({
                        i: tooltipId,
                        c: 'tt stt',
                        s: "left:" + (region.c[0] - 1.5) + '%;top:' + (region.c[1] + 1.2) + '%'
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
        map(gameState.floatingText || [], function(floater) {
            var x, y;
            if (floater.r) {
                x = floater.r.c[0]; y = floater.r.c[1];
            } else {
                var node = soldierDivsById[floater.s.i];
                x = parseFloat(node.style.left) + 0.2, y = parseFloat(node.style.top) + 0.2;
            }

            x -= floater.w / 2 + 0.5; y -= 4;

            var styles = "left: " + x + "%;top:" + y + "%;color:" + floater.c + ";width:" + floater.w + "%";
            var floatingNode = append('m', div({c: 'tt', s: styles}, floater.t));
            setTransform(floatingNode, "translate3d(0,0,0)");
            floatAway(floatingNode, 0, -3);
        });
        gameState.floatingText = 0;
    }
}

function updateIngameUI(gameState) {
    var moveState = gameState.move;
    var decisionState = gameState.moveDecision;
    var buildingMode = decisionState && decisionState.isBuildMove();
    var movingArmy = decisionState && decisionState.isArmyMove();

    var activePlayer = gameState.activePlayer();

    // turn counter/building name
    if (buildingMode) {
        var info = gameState.templeInfo(decisionState.temple);
        $('turn-count').innerHTML = div({}, info.name) + div({c: 'ds'}, info.description);
    } else {
        $('turn-count').innerHTML =
            'Turn <b>' + gameState.move.turnIndex + '</b>' +
            ((gameInitialization.gameSetup.turnCount != gameData.UNLIMITED_TURNS) ? ' / ' + gameInitialization.gameSetup.turnCount : '');
    }

    // player data
    map(gameState.players, function(player, index) {
        //$('pl' + index).className = (index == moveState.player) ? 'pl' : 'pi'; // activePlayer or not?
        var regions = gameState.regionCount(player);
        var gameWinner = gameState.endResult;

        if (regions) {
            $('particle' + index).innerHTML = gameState.regionCount(player) + '&#9733;'; // region count
            if (gameWinner) {
                $('player-cash' + index).innerHTML = (gameWinner == player) ? '&#9819;' : '';
            } else {
                $('player-cash' + index).innerHTML = gameState.cash[player.index] + '&#9775;'; // cash on hand
            }
        } else {
            $('particle' + index).innerHTML = '&#9760;'; // skull and crossbones, you're dead
            $('player-cash' + index).innerHTML = '';
        }
    });

    let moveInfo;
    if (activePlayer.pickMove == gameController.uiPickMove) {
        if (buildingMode) {
            if (gameState.owner(decisionState.region) == activePlayer)
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
    $('mc').innerHTML = moveState.movesRemaining + elem('span', {s: 'font-size: 80%'}, '&#10138;');
    $('ft').innerHTML = gameState.cash[activePlayer.index] +  elem('span', {s: 'font-size: 80%'}, '&#9775;');

    // buttons
    updateButtons(decisionState && decisionState.buttons);

    // undo
    $('undo-button').innerHTML = undoManager.undoEnabled(gameState) ? "&#x21b6;" : "";
}

function updateButtons(buttons) {
    $('u').innerHTML = '';
    map(buttons || [], function(button, index) {
        if (button.h) return;

        var buttonContents = div({}, button.t);
        if (button.d)
            buttonContents += div({c: 'ds'}, button.d);

        var buttonHTML = elem('a', {href: '#', c: button.o ? 'off' : ''}, buttonContents);
        var buttonNode = append('u', buttonHTML);
        if (!button.o) {
            onClickOrTap(buttonNode, gameController.invokeUICallback.bind(0, index, 'build'));
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
    }, 50);
    setTimeout(function() {
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
