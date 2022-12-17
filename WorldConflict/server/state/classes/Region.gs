
class Region {

    /**
     * Also stored, but not part of constructor - center and elementId
     * @param obj containing
     *   index - region index
     *   points - array of points that define the region's border
     *   distanceTo - (optional) array of distances to other regions
     *   neighbors (optional) an array of neighboring regions (by region index)
     */
    constructor(obj) {
        this.index = obj.index;
        this.points = obj.points;
        this.distanceTo = obj.distanceTo ? obj.distanceTo : [];
        this.neighbors = obj.neighbors ? obj.neighbors : [];
        this.center = obj.center;
    }

    /** @return string containing everything about the region except for its array of points */
    toString() {
       return `{index: ${this.index}, neighbors: [${this.neighbors}], distanceTo: [${this.distanceTo}]}`;
    }

    distanceFrom(regionB, regions) {
        return Region.distance(this, regionB, regions);
    }

    centerDistanceFrom(regionB) {
        return Math.abs(this.center.x - regionB.center.x) + Math.abs(this.center.y - regionB.center.y);
    }

    /**
     * Use breadth-first search and memoization to find distance from this (regionA) to some other regionB.
     * @return distance distance is defined by the minimum number of hops between two regions.
     */
    static distance(regionA, regionB, regions) {
        if (!regionA || !regionB) {
            throw new Error("Both regionA, " + regionA + ", and regionB, " + regionB + ", must be specified.");
        }
        let queue = new Queue();
        queue.enqueue({region: regionA, distance: 0});
        const visited = new Set();
        visited.add(regionA);
        let answer = -1;
        let bound = 100;

        while (answer < 0 && !queue.isEmpty) {
            let item = queue.dequeue();
            let region = item.region;
            let distanceFromA = item.distance;
            if (region === regionB) {
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
                region.neighbors.map(function(neighborIdx) {
                    let neighbor = regions[neighborIdx];
                    if (!visited.has(neighbor)) {
                        queue.enqueue({ region: neighbor, distance: distanceFromA + 1 });
                    }
                });
                visited.add(region);
            }
        }

        // memoize result for later and return
        if (answer < 0) {
            throw new Error("we could not find a path between " + regionA + " and " + regionB);
        }
        regionA.distanceTo[regionB.index] = answer;
        regionB.distanceTo[regionA.index] = answer;
        return answer;
    }
}
