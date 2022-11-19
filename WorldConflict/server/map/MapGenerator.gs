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

    constructor() {
    }

    /**
     * Generates a new procedural map for a given number of players. Its currently fairly slow.
     * @return an array of Regions that will define the map.
     */
    generateMap(playerCount, mapWidth, mapHeight, mapSize) {
        const maxRegionSize = MAX_REGION_SIZE_MAP[mapSize] - playerCount;
        const neededRegions = BASE_NUM_REGIONS_MAP[mapSize] + playerCount * REGIONS_PER_PLAYER_ALLOCATION_MAP[mapSize];
        const minRegionArea = Math.pow(MIN_REGION_SIZE_MAP[mapSize], 2);
        let regionCount;
        let numIterations = 0;
        let regions = [];
        let regionMap = [];
        let bestRegions = [];
        let bestRegionMap = [];

        // Repeat until we get a workable map
        do {
            regionMap = utils.range(0, mapWidth).map(() => []);
            regions = [];
            regionCount = 0;
            let retries = 1000;

            // The main loop is repeated only a limited number of times to
            // handle cases where the map generator runs into a dead end.
            while (regionCount < neededRegions && --retries > 0) {
                const bounds = MapGenerator.createBounds(maxRegionSize, mapWidth, mapHeight, mapSize);

                // It has to overlap one of the existing ones
                if (regionCount && !bounds.overlaps(regionMap)) continue;

                // We shrink it until it no longer overlaps - this guarantees
                // that it will border at least one other region, making the map contiguous
                while (!bounds.shrink(minRegionArea)) {
                    //console.log("Shrank bounds to " + bounds);
                    if (!bounds.overlaps(regionMap)) {
                        const region = bounds.makeRegion(regionCount);
                        regions.push(region);
                        //console.log("added region: " + region.toString());
                        regionCount++;
                        //console.log("Created region = " + region);
                        bounds.markInMap(region, regionMap);
                        break;
                    }
                }
            }
            if (regionCount > bestRegions.length) {
                bestRegions = regions;
                bestRegionMap = regionMap;
            }

        } while (bestRegions.length < neededRegions && numIterations++ < 100);

        //console.log("regionCount = " + bestRegions.length + " neededRegions = " + neededRegions + " iter = " + numIterations);
        //console.log("regionMap: " + this.regionMap.map(a => a.map(r => r.toString())));
        if (!bestRegions.length) {
             throw new Error("no regions generated!");
        }

        MapGenerator.fillNeighborLists(mapWidth, mapHeight, bestRegionMap);
        return bestRegions;
    }

    static createBounds(maxRegionSize, mapWidth, mapHeight, mapSize) {
        const left = utils.rint(1, mapWidth - maxRegionSize);
        const top = utils.rint(1, mapHeight - maxRegionSize);
        const width = maxRegionSize; // - 1; // utils.rint(minRegionSize, maxRegionSize);
        const height = maxRegionSize; // - 1; //utils.rint(minRegionSize, maxRegionSize);
        return new Bounds(left, top, width, height);
    }

    // Figures out who borders with who, using the 2d grid in 'regionMap'.
    static fillNeighborLists(mapWidth, mapHeight, regionMap) {
        utils.for2d(1, mapWidth - 1, 1, mapHeight - 1, (x, y) => {
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
