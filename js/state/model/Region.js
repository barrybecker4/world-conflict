import utils from '../../utils/utils.js';
import sequenceUtils from '../../utils/sequenceUtils.js';
import map from '../../client/map.js';

export default class Region {

    /**
     * @param index region index
     * @param points array of points that define the region's border
     * @param distanceTo array of distances to other regions
     * @param neighbors an array of neighboring regions (by region index)
     */
    constructor (index, points, distanceTo, neighbors) {
        this.index = index;
        this.points = points;
        this.distanceTo = distanceTo ? distanceTo : [];
        this.neighbors = neighbors ? neighbors : [];
        this.center = null;
        this.element = null;
    }

    // regionArray is optional. Needed only if we don't have the map yet.
    distanceFrom(regionB, regions) {
        return Region.distance(this, regionB, regions);
    }

    centerDistanceFrom(regionB) {
        return Math.abs(this.center[0] - regionB.center[0]) + Math.abs(this.center[1] - regionB.center[1]);
    }

    // Use breadth-first search and memoization to find distance from this (regionA) to some other regionB.
    static distance(regionA, regionB, regions) {
        let queue = [{region: regionA, distance: 0}];
        let visited = [regionA];
        let answer = -1;
        let bound = 100;

        while (answer < 0) {
            let item = queue.shift();
            let region = item.region;
            let distanceFromA = item.distance;
            if (region == regionB) {
                // we've found the region!
                answer = distanceFromA;
            }
            else if (distanceFromA >= bound) {
                // we've reached our established upper bound - return it
                answer = bound;
            }
            else {
                // use memoized values to establish an upper bound (we still might do better, but we can't do worse)
                if (region.distanceTo[regionB.index])
                    bound = sequenceUtils.min([bound, region.distanceTo[regionB.index] + distanceFromA]);

                // look in all unvisited neighbors
                region.neighbors.map(function (neighborIdx) {
                    let neighbor = regions[neighborIdx];
                    if (!sequenceUtils.contains(visited, neighbor)) {
                        queue.push({region: neighbor, distance: distanceFromA + 1});
                    }
                });
                visited.push(region);
            }
        }

        // memoize result for later and return
        regionA.distanceTo[regionB.index] = answer;
        regionB.distanceTo[regionA.index] = answer;
        return answer;
    }
}