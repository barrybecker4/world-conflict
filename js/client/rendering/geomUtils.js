
var geomUtils = (function(my) {
    my.MAP_WIDTH = 30;
    my.MAP_HEIGHT = 20;

    /**
     * Optional 3d projection for the map.
     * The alpha value can be used to pseudo rotate the map.
     * The transformation leaves space on the left for the side-panel.
     */
    my.projectPoint = function(pt) {
        var x = pt[0] / my.MAP_WIDTH;
        var y = pt[1] / my.MAP_HEIGHT;
        // var alpha = x * .2 + .6;
        // y = y * alpha + 0.5 * (1 - alpha);
        return [x * 97 + 3, y * 100];
    }

    // Creates a new polygon with the given fill, stroke, and clipping path.
    my.makePolygon = function(points, id, fill, stroke, clip) {
        stroke = stroke || "stroke:#000;stroke-width:0.25;";
        fill = fill ? "url(#" + fill + ")" : 'transparent';

        var properties = {
            i: id,
            points: points.map(my.projectPoint).join(' '),
            s: 'fill:' + fill + ";" + stroke + ';'
        };

        if (clip) {
           properties['clip-path'] = clip;
        }

        return domUtils.elem('polygon', properties);
    }


    // Returns the center of weight of a given set of [x, y] points.
    my.centerOfWeight = function(points) {
        let xc = 0.0;
        let yc = 0.0;
        let len = points.length;
        points.map(function(p) {
            xc += p[0];
            yc += p[1];
        });
        return [xc / len, yc / len];
    }

    // Affine transform of a sequence of points: [x*xm+xd,y*ym+yd]
    my.transformPoints = function(points, xm, ym, xd, yd) {
        var c = my.centerOfWeight(points);
        return points.map(p => [c[0] + (p[0] - c[0]) * xm + xd, c[1] + (p[1] - c[1]) * ym + yd] );
    }

    return my;
} (geomUtils || {}))

