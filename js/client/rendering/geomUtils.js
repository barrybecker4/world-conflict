import utils from '../../utils/utils.js';
import domUtils from '../utils/domUtils.js';
import gameData from '../../state/consts/gameData.js';

export default {
    projectPoint, makePolygon, centerOfWeight, transformPoints,
}

// Optional 3d projection for the map.
// The alpha value can be used to pseudo rotate the map.
// The transformation leaves space on the left for the sidepanel.
function projectPoint(pt, width, height) {
    var x = pt[0] / gameData.mapWidth;
    var y = pt[1] / gameData.mapHeight;
    // var alpha = x * .2 + .6;
    // y = y * alpha + 0.5 * (1 - alpha);
    return [x * 97 + 3, y * 100];
}

// Creates a new polygon with the given fill, stroke and clipping path.
function makePolygon(points, id, fill, stroke, clip) {
    stroke = stroke || "stroke:#000;stroke-width:0.25;";
    fill = fill ? "url(#" + fill + ")" : 'transparent';

    var properties = {
        i: id,
        points: utils.map(points, projectPoint).join(' '),
        s: 'fill:' + fill + ";" + stroke + ';'
    };

    if (clip) {
       properties['clip-path'] = clip;
    }

    return domUtils.elem('polygon', properties);
}


// Returns the center of weight of a given set of [x, y] points.
function centerOfWeight(points) {
    let xc = 0.0;
    let yc = 0.0;
    let len = points.length;
    utils.map(points, function(p) {
        xc += p[0];
        yc += p[1];
    });
    return [xc / len, yc / len];
}

// Affine transform of a sequence of points: [x*xm+xd,y*ym+yd]
function transformPoints(points, xm, ym, xd, yd) {
    var c = centerOfWeight(points);
    return utils.map(points, function(p) {
        return [c[0] + (p[0] - c[0]) * xm + xd, c[1] + (p[1] - c[1]) * ym + yd];
    });
}