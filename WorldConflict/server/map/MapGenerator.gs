const MIN_REGION_SIZE_MAP = {Small: 6, Medium: 3, Large: 3};
const MAX_REGION_SIZE_MAP = {Small: 12, Medium: 11, Large: 8};
const BASE_NUM_REGIONS_MAP = {Small: 4, Medium: 13, Large: 21};
const REGIONS_PER_PLAYER_ALLOCATION_MAP = {Small: 2, Medium: 3, Large: 3};

class MapGenerator {

    constructor() {
        this.regionMap = [];
        this.regions = [];
    }

    /**
     * Generates a new procedural map for a given number of players.
     * @return an array of Regions that will define the map.
     */
    generateMap(playerCount, mapWidth, mapHeight, mapSize) {
        const maxRegionSize = MAX_REGION_SIZE_MAP[mapSize] - playerCount;
        const neededRegions = BASE_NUM_REGIONS_MAP[mapSize] + playerCount * REGIONS_PER_PLAYER_ALLOCATION_MAP[mapSize];
        let regionCount;
        let numIterations = 0;

        // Repeat until we get a workable map
        do {
            this.regionMap = utils.range(0, mapWidth).map(() => []);
            this.regions = [];
            regionCount = 0;
            let retries = 1000;

            // The main loop is repeated only a limited number of times to
            // handle cases where the map generator runs into a dead end.
            while (regionCount < neededRegions && --retries > 0) {
                // Create a random bounded region that is the size of the whole map initially
                const bounds = MapGenerator.createBounds(maxRegionSize, mapWidth, mapHeight, mapSize);

                // It has to overlap one of the existing ones
                if (regionCount && !bounds.overlaps(this.regionMap)) continue;

                // We shrink it until it no longer overlaps - this guarantees
                // that it will border at least one other region, making the map contiguous
                while (!bounds.shrink()) {
                    //console.log("Shrank bounds to " + bounds);
                    if (!bounds.overlaps(this.regionMap)) {
                        const region = bounds.makeRegion(regionCount++);
                        this.regions.push(region);
                        //console.log("Created region = " + region);
                        bounds.markInMap(region, this.regionMap);
                        break;
                    }
                }
            }
            //console.log("regionCount = " + regionCount + " neededRegions = " + neededRegions + " iter = " + numIterations +"  num regions = " + this.regions.length);
        } while (regionCount < neededRegions && numIterations++ < 5);

        this.fillNeighborLists(mapWidth, mapHeight);
        return this.regions;
    }

    static createBounds(maxRegionSize, mapWidth, mapHeight, mapSize) {
        const left = utils.rint(1, mapWidth - maxRegionSize + 1);
        const top = utils.rint(1, mapHeight - maxRegionSize + 1);
        const width = utils.rint(MIN_REGION_SIZE_MAP[mapSize], maxRegionSize);
        const height = utils.rint(MIN_REGION_SIZE_MAP[mapSize], maxRegionSize);
        return new Bounds(left, top, width, height);
    }

    // Figures out who borders with who, using the 2d grid in 'regionMap'.
    fillNeighborLists(mapWidth, mapHeight) {
        utils.for2d(1, mapWidth - 1, 1, mapHeight - 1, (x, y) => {
            const region = this.regionMap[x][y];
            if (region) {
                [[-1, 0], [1, 0], [0, -1], [0, 1]].map((d) => {
                    const potentialNeighbor = this.regionMap[x + d[0]][y + d[1]];
                    if (potentialNeighbor && (potentialNeighbor !== region)
                        && (region.neighbors.indexOf(potentialNeighbor.index) === -1))
                        region.neighbors.push(potentialNeighbor.index);
                });
            }
        });
    }
}
