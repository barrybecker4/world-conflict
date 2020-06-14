import utils from './utils/utils.js';
import gameData from './state/gameData.js';

// Generates a new procedural map for a given number of players.
export default function generateMap(playerCount) {
    var maxRegionSize = 11 - playerCount;
    var neededRegions = 13 + playerCount * 3;
    var perturbConst = utils.rint(10000, 100000);

    var regionMap, regions, count, retries;

    // Repeat until we get a workable map
    do {
        regionMap = utils.range(0, gameData.mapWidth).map(function(){return []});
        regions = []; count = 0; retries = 2500;

        // The main loop is repeated only a limited number of times to
        // handle cases where the map generator runs into a dead end.
        while ((count < neededRegions) && (--retries > 0)) {
            // create a random region
            var bounds = {
                l: utils.rint(1, gameData.mapWidth - maxRegionSize + 1),
                t: utils.rint(1, gameData.mapHeight - maxRegionSize + 1),
                w: utils.rint(3, maxRegionSize), h: utils.rint(3, maxRegionSize)
            };
            // it has to overlap one of the existing ones
            if (count && !overlaps(bounds)) continue;

            // we shrink it until it no longer overlaps - this guarantees
            // that it will border at least one other region, making the map
            // contiguous
            while (!shrink(bounds)) {
                if (!overlaps(bounds)) {
                    regions.push(makeRegionAt(count++, bounds));
                    break;
                }
            }
        }
    } while (!retries);

    fillNeighbourLists();
    return regions;

    // Shrink the region given by 'bounds' in a random direction
    function shrink(bounds) {
        var r = utils.rint(0, 4);
        if (r % 2) bounds.w--; else bounds.h--;
        if (r == 2) bounds.t++;
        if (r == 3) bounds.l++;
        return (bounds.w * bounds.h < 9);
    }

    // Checks if the region given by 'bounds' overlaps any existing region.
    function overlaps(bounds) {
        var rv = false;
        utils.for2d(bounds.l, bounds.t, bounds.l + bounds.w, bounds.t + bounds.h, function(x, y) {
            rv = rv || regionMap[x][y];
        });
        return rv;
    }

    // Puts a new rectangular region at the position given in bounds {Left, Top, Width, Height}.
    function makeRegionAt(index, bounds) {
        // make points for the region
        var l=bounds.l,t=bounds.t,w=bounds.w,h=bounds.h;
        var points = [];
        utils.map(utils.range(0, w), function(i) {
            points[i] = perturbedPoint(l+i,t);
            points[w+h+i] = perturbedPoint(l+w-i,t+h);
        });
        utils.map(utils.range(0, h), function(i) {
            points[w+i] = perturbedPoint(l+w,t+i);
            points[w+h+w+i] = perturbedPoint(l,t+h-i);
        });
        var region = {i: index, p: points, d:[]};

        // mark it in the map
        utils.for2d(bounds.l, bounds.t, bounds.l + bounds.w, bounds.t + bounds.h, function(x, y){
            regionMap[x][y] = region;
        });

        // return
        return region;
    }

    // Perturbs a point to give the region borders a natural feel.
    function perturbedPoint(x,y) {
        var angle = (Math.sin(x * x * y * y * 600 + perturbConst * 357)) * 6.28;
        var dist = (Math.sin(x * y * 600 + perturbConst * 211)) / 2;
        return [x + Math.sin(angle) * dist, y + Math.cos(angle) * dist];
    }

    // Figures out who borders with who, using the 2d grid in 'regionMap'.
    function fillNeighbourLists() {
        utils.for2d(1, 1, gameData.mapWidth - 1, gameData.mapHeight - 1, function(x, y) {
            var region = regionMap[x][y];
            if (region) {
                if (!region.n) region.n = [];
                utils.map([[-1, 0],[1, 0],[0, -1],[0, 1]],function(d) {
                    var potentialNeighbour = regionMap[x + d[0]][y + d[1]];
                    if (potentialNeighbour && (potentialNeighbour != region) && (region.n.indexOf(potentialNeighbour) == -1))
                        region.n.push(potentialNeighbour);
                });
            }
        });
    }
}