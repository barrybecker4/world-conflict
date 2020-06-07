// ==========================================================
// This part of the code creates the initial rendering of the
// game map as an SVG object.
// ==========================================================

// Returns the center of weight of a given set of [x,y] points.
function centerOfWeight(points) {
    var xc = 0.0, yc = 0.0, l = points.length;
    map(points, function(p) {
        xc += p[0]; yc += p[1];
    });
    return [xc/l, yc/l];
}

// Affine transform of a sequence of points: [x*xm+xd,y*ym+yd]
function transformPoints(points, xm, ym, xd, yd) {
    var c = centerOfWeight(points);
    return map(points, function(p) {
        return [c[0] + (p[0]-c[0]) * xm + xd, c[1] + (p[1]-c[1]) * ym + yd];
    });
}

// 3d projection for the map
// The alpha value can be used to pseudo rotate the map
function projectPoint(p) {
    var x = p[0] / mapWidth;
    var y = p[1] / mapHeight;
    // var alpha = x * .2 + .6;
    // y = y * alpha + 0.5 * (1 - alpha);
    return [x * 97 + 3, y * 100];
}

// Generate a SVG gradient stop tag.
function gradientStop(percent, color) {
    return elem('stop', {
        offset: percent + '%',
        s: 'stop-color:' + color
    });
}

// Generate a SVG gradient tag for the map.
function makeGradient(id, light, dark) {
    return elem('radialGradient', {
        i: id,
        cx: '-100%', cy: '50%',
        fx: '-100%', fy: '50%',
        r: '200%',
        gradientUnits: 'userSpaceOnUse' // we want it to scale with the map, not the region it's applied to
    }, gradientStop(60, dark) + gradientStop(100, light));
}

// Creates a new polygon with the given fill, stroke and clipping path.
function makePolygon(points, id, fill, stroke, clip) {
    stroke = stroke || "stroke:#000;stroke-width:0.25;";
    fill = fill ? "url(#" + fill + ")" : 'transparent';

    var properties = {
        i: id,
        points: map(points, projectPoint).join(' '),
        s: 'fill:' + fill + ";" + stroke + ';'
    };

    if (clip)
        properties['clip-path'] = clip

    return elem('polygon', properties);
}

// Takes the map (regions) stored in gameState.r, and creates an SVG map out of it.
function showMap(container, gameState) {
    var regions = gameState.r;

    // define gradients and clipping paths for rendering
    var defs = elem('defs', {},
            makeClipPaths() +
            makeGradient('b', '#8af', '#478') +
            makeGradient('l', '#fa6', '#530') +
            makeGradient('lh', '#fb7', '#741') +
            makeGradient('d', '#210', '#000') +
            makeGradient('w', '#55f', '#003') +
            map(gameState.p, function(player, index) {
                return makeGradient('p' + index, player.l, player.d) +
                    makeGradient('p' + index + 'h', player.h, player.hd);
            }).join(''));

    // create all the layers (5 per region)
    var ocean = makePolygon([[0,0],[mapWidth,0],[mapWidth,mapHeight],[0,mapHeight]], 'b', 'b');
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
        region.c = projectPoint(centerOfWeight(region.p));

        region.hl = $('hl' + index);
        onClickOrTap(region.hl, invokeUICallback.bind(0, region, 'c'));
    });

    // additional callbacks for better UI
    onClickOrTap(doc.body, invokeUICallback.bind(0, null, 'c'));

    // make the temple <div>s
    makeTemples();


    // makes clipping paths for the "highlight" polygons
    function makeClipPaths() {
        return map(regions, function(region, index) {
            return elem('clipPath', {i: 'clip' + index}, makePolygon(region.p, 'cp' + index, 'l', ''));
        }).join('');
    }

    // a helper for creating a polygon with a given setup for all regions
    function makeRegionPolys(idPrefix, gradient, xm, ym, xd, yd, stroke, clip) {
        return elem('g', {}, map(regions, function(region, index) {
            return makePolygon(transformPoints(region.p, xm, ym, xd, yd), idPrefix + index, gradient, stroke, clip ? 'url(#' + clip + index + ')' : '');
        }).join(''));
    }

    // makes temple, which are just <div>s with nested <div>s (the towers)
    function makeTemples() {
        forEachProperty(gameState.t, function(temple) {

            var center = temple.r.c,
                style = 'left:' + (center[0]-1.5) + '%;top:' + (center[1]-4) + '%';

            // create the temple <div>s
            var templeHTML = div({
                c: 'o',
                s: style
            }, div({c: 'i'}, div({c: 'i'}, div({c: 'i'}, div({c: 'i'})))));
            temple.e = append('m', templeHTML);

            // retrieve elements and bind callbacks
            onClickOrTap(temple.e, invokeUICallback.bind(0, temple.r, 't'));
        });
    }
}

// Prepares the whole sidebar on the left for gameplay use.
function prepareIngameUI(gameState) {
    // turn counter
    var html = div({i: 'tc', c: 'sc'});

    // player box area
    html += div({i: 'pd', c: 'sc un'}, map(gameState.p, function(player) {
        var pid = player.i;
        return div({
            i: 'pl' + pid,
            c: 'pl',
            style: 'background: ' + player.d
        }, player.n +
            div({c: 'ad', i: 'pr' + pid}) +
            div({c: 'ad', i: 'pc' + pid})
        );
    }).join(''));

    // info box
    html += div({c: 'sc un ds', i: 'in'});

    // set it all
    $('d').innerHTML = html;

    // show stat box and undo button
    map(['mv', 'und', 'end'], show);
}
