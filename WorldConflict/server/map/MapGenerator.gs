const MIN_REGION_SIZE_MAP = {Small: 5, Medium: 3, Large: 3};
const MAX_REGION_SIZE_MAP = {Small: 14, Medium: 11, Large: 8};
const BASE_NUM_REGIONS_MAP = {Small: 4, Medium: 13, Large: 25};
const REGIONS_PER_PLAYER_ALLOCATION_MAP = {Small: 2, Medium: 3, Large: 3};

/**
 * Procedural map generation.
 * Some interesting ideas here http://www-cs-students.stanford.edu/~amitp/game-programming/polygon-map-generation/
 * Perhaps consider https://www.jasondavies.com/poisson-disc/
 */
class MapGenerator {

    constructor() {}

    /**
     * Generates a new procedural map for a given number of players.
     * @return an array of Regions that will define the map.
     */
    generateMap(playerCount, mapSize) {
      console.log("not implemented");
    }

    static addRegion(bounds, regionCount, regions, regionMap) {
        const region = bounds.makeRegion(regionCount);
        if (!region) throw new Error("Failed to create region with bounds " + bounds);
        regions.push(region);
        bounds.markInMap(region, regionMap);
        return regionCount + 1;
    }

    static createBounds(minRegionSize, maxRegionSize) {
        const left = utils.rint(1, CONSTS.GRID_WIDTH - maxRegionSize);
        const top = utils.rint(1, CONSTS.GRID_HEIGHT - maxRegionSize);
        const width = utils.rint(minRegionSize + 1, maxRegionSize - 1);
        const height = utils.rint(minRegionSize + 1, maxRegionSize - 1);
        return new Bounds(left, top, width, height);
    }

    static createBoundsAtPosition(left, top, minRegionSize, maxRegionSize) {
        const width = utils.rint(minRegionSize + 1, maxRegionSize - 1);
        const height = utils.rint(minRegionSize + 1, maxRegionSize - 1);
        return new Bounds(left, top, width, height);
    }

    // Figures out who borders with who, using the 2d grid in 'regionMap'.
    static fillNeighborLists(regionMap) {
        utils.for2d(1, CONSTS.GRID_WIDTH - 1, 1, CONSTS.GRID_HEIGHT - 1, (x, y) => {
            const region = regionMap[x][y];
            if (region) {
                [[-1, 0], [1, 0], [0, -1], [0, 1]].map((d) => {
                    const potentialNeighbor = regionMap[x + d[0]][y + d[1]];
                    if (potentialNeighbor && (potentialNeighbor !== region)
                        && (region.neighbors.indexOf(potentialNeighbor.index) === -1)) {
                        region.neighbors.push(potentialNeighbor.index);
                    }
                });
            }
        });
    }
}


class OrigMapGenerator extends MapGenerator {

    constructor() {
        super();
    }

    /**
     * Generates a new procedural map for a given number of players. Its currently fairly slow.
     * @return an array of Regions that will define the map.
     */
    generateMap(playerCount, mapSize) {
        const minRegionSize = MIN_REGION_SIZE_MAP[mapSize];
        const maxRegionSize = MAX_REGION_SIZE_MAP[mapSize] - playerCount;
        const neededRegions = BASE_NUM_REGIONS_MAP[mapSize] + playerCount * REGIONS_PER_PLAYER_ALLOCATION_MAP[mapSize];
        const minRegionArea = Math.pow(minRegionSize, 2);
        let regionCount;
        let numIterations = 0;
        let regions = [];
        let regionMap = [];
        let bestRegions = [];
        let bestRegionMap = [];

        // Repeat until we get a workable map
        do {
            regionMap = utils.range(0, CONSTS.GRID_WIDTH).map(() => []);
            regions = [];
            regionCount = 0;
            let retries = 1000;

            // The main loop is repeated only a limited number of times to
            // handle cases where the map generator runs into a dead end.
            while (regionCount < neededRegions && --retries > 0) {
                const bounds = MapGenerator.createBounds(minRegionSize, maxRegionSize);

                // It has to overlap one of the existing ones
                if (regionCount && (bounds.overlaps(regionMap) == 0)) continue;

                // Shrink it until it no longer overlaps - this guarantees
                // that it will border at least one other region, making the map contiguous
                while (!bounds.shrink(minRegionArea)) {
                    if (bounds.overlaps(regionMap) == 0) {
                        regionCount = MapGenerator.addRegion(bounds, regionCount, regions, regionMap);
                        break;
                    }
                }
            }
            if (regionCount > bestRegions.length) {
                bestRegions = regions;
                bestRegionMap = regionMap;
            }

        } while (bestRegions.length < neededRegions && numIterations++ < 100);

        if (!bestRegions.length) {
            throw new Error("no regions generated!");
        }

        MapGenerator.fillNeighborLists(bestRegionMap);
        return bestRegions;
    }
}


class FastMapGenerator extends MapGenerator {

    constructor() {
        super();
    }

    /**
     * Generates a new procedural map for a given number of players.
     * @return an array of Regions that will define the map.
     */
    generateMap(playerCount, mapSize) {
        const minRegionSize = MIN_REGION_SIZE_MAP[mapSize];
        const maxRegionSize = MAX_REGION_SIZE_MAP[mapSize] - playerCount;
        const neededRegions = BASE_NUM_REGIONS_MAP[mapSize] + playerCount * REGIONS_PER_PLAYER_ALLOCATION_MAP[mapSize];
        const minRegionArea = Math.pow(minRegionSize, 2);
        const maxRegionArea = Math.pow(maxRegionSize, 2);

        let regionCount;
        let numIterations = 0;
        let regions = [];
        let regionMap = [];

        regionMap = utils.range(0, CONSTS.GRID_WIDTH).map(() => []);
        regions = [];
        regionCount = 0;

        const regionPositions = this.createCandidatePositions(maxRegionSize);

        // The main loop is repeated only a limited number of times to
        // handle cases where the map generator runs into a dead end.
        while (regionCount < neededRegions && regionPositions.length > 0) {
            const nextPosition = regionPositions.pop();
            const bounds = MapGenerator.createBoundsAtPosition(nextPosition[0], nextPosition[1], minRegionSize, maxRegionSize);

            if (bounds.overlaps(regionMap) == 0) {
                if (regionCount < neededRegions / 2) {
                    // just add the region wherever it falls
                    regionCount = MapGenerator.addRegion(bounds, regionCount, regions, regionMap);
                } else {
                   // try to grow it to see if it can touch another region
                   let prevSmallerBounds = bounds.copy()
                   while (!bounds.grow(maxRegionArea)) {
                       if (bounds.overlaps(regionMap) > 0) {
                           regionCount = MapGenerator.addRegion(prevSmallerBounds, regionCount, regions, regionMap);
                           break;
                       } else {
                           prevSmallerBounds = bounds.copy();
                       }
                   }
                }
            }
            else {
                // Shrink it until it no longer overlaps in an attempt to make regions contiguous
                while (!bounds.shrink(minRegionArea)) {
                    if (bounds.overlaps(regionMap) == 0) {
                        regionCount = MapGenerator.addRegion(bounds, regionCount, regions, regionMap);
                        break;
                    }
                }
            }
        }

        MapGenerator.fillNeighborLists(regionMap);
        return regions;
    }

    createCandidatePositions(regionSize) {
        const positions = [];
        utils.for2d(1, CONSTS.GRID_WIDTH - regionSize, 1, CONSTS.GRID_HEIGHT - regionSize, (x, y) => {
            positions.push([x, y]);
        });
        sequenceUtils.shuffle(positions);
        return positions;
    }
}


