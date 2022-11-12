var mapGenerator = (function(my) {

    const MIN_REGION_SIZE_MAP = {Small: 6, Medium: 3, Large: 3};
    const MAX_REGION_SIZE_MAP = {Small: 12, Medium: 11, Large: 8};
    const BASE_NUM_REGIONS_MAP = {Small: 4, Medium: 13, Large: 21};
    const REGIONS_PER_PLAYER_ALLOCATION_MAP = {Small: 2, Medium: 3, Large: 3};

    function createBounds(maxRegionSize, mapWidth, mapHeight, mapSize) {
        const left = utils.rint(1, mapWidth - maxRegionSize + 1);
        const top = utils.rint(1, mapHeight - maxRegionSize + 1);
        const width = utils.rint(MIN_REGION_SIZE_MAP[mapSize], maxRegionSize);
        const height = utils.rint(MIN_REGION_SIZE_MAP[mapSize], maxRegionSize);
        return new Bounds(left, top, width, height);
    }

    /**
     * Generates a new procedural map for a given number of players.
     * @return an array of Regions that will define the initial map.
     */
    my.generateMap = function(playerCount, mapWidth, mapHeight, mapSize) {
        const maxRegionSize = MAX_REGION_SIZE_MAP[mapSize] - playerCount;
        const neededRegions = BASE_NUM_REGIONS_MAP[mapSize] + playerCount * REGIONS_PER_PLAYER_ALLOCATION_MAP[mapSize];
        let regionMap, regions, count, retries;

        // Repeat until we get a workable map
        do {
            regionMap = utils.range(0, mapWidth).map(() => []);
            regions = [];
            count = 0;
            retries = 2500;

            // The main loop is repeated only a limited number of times to
            // handle cases where the map generator runs into a dead end.
            while (count < neededRegions && --retries > 0) {
                // create a random bounded region
                const bounds = createBounds(maxRegionSize, mapWidth, mapHeight, mapSize);

                // it has to overlap one of the existing ones
                if (count && !bounds.overlaps(regionMap)) continue;

                // we shrink it until it no longer overlaps - this guarantees
                // that it will border at least one other region, making the map contiguous
                while (!bounds.shrink()) {
                    if (!bounds.overlaps(regionMap)) {
                        const region = bounds.makeRegion(count++);
                        regions.push(region);
                        bounds.markInMap(region, regionMap);
                        break;
                    }
                }
            }
        } while (!retries);

        fillNeighborLists();
        return regions;


        // Figures out who borders with who, using the 2d grid in 'regionMap'.
        function fillNeighborLists() {
            utils.for2d(1, mapWidth - 1, 1, mapHeight - 1, function(x, y) {
                const region = regionMap[x][y];
                if (region) {
                    [[-1, 0], [1, 0], [0, -1], [0, 1]].map(function(d) {
                        const potentialNeighbor = regionMap[x + d[0]][y + d[1]];
                        if (potentialNeighbor && (potentialNeighbor !== region)
                            && (region.neighbors.indexOf(potentialNeighbor.index) === -1))
                            region.neighbors.push(potentialNeighbor.index);
                    });
                }
            });
        }
    }

    return my;
}(mapGenerator || {}));
