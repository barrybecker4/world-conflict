import utils from '../../utils/utils.js';
import sequenceUtils from '../../utils/sequenceUtils.js';

export default class Region {
    constructor (index, points, d, neighbors) {
        this.i = index;
        this.p = points;
        this.d = d;
        this.n = neighbors ? neighbors : [];
    }

    distanceFrom(regionB) {
        return Region.distance(this, regionB);
    }

    // Use breadth-first search and memoization to find distance from this (regionA) to some other regionB.
    static distance(regionA, regionB) {
        let queue = [{r: regionA, d:0}];
        let visited = [regionA];
        let answer = -1;
        let bound = 100;

        while (answer < 0) {
            let item = queue.shift();
            let region = item.r;
            let distanceFromA = item.d;
            if (region == regionB) {
                // we've found the region!
                answer = distanceFromA;
            }
            else if (distanceFromA >= bound) {
                // we've reached our established upper bound - return it
                answer = bound;
            }
            else {
                // use memoized values to establish an upper bound (we still might do better,
                // but we can't do worse)
                if (region.d[regionB.i])
                    bound = sequenceUtils.min([bound, region.d[regionB.i] + distanceFromA]);

                // look in all unvisited neighbours
                utils.map(region.n, function (neighbour) {
                    if (!sequenceUtils.contains(visited, neighbour))
                        queue.push({r: neighbour, d: distanceFromA + 1});
                });
                visited.push(region);
            }
        }

        // memoize result for later and return
        regionA.d[regionB.i] = answer;
        regionB.d[regionA.i] = answer;
        return answer;
    }
}