const MIN_REGION_SIZE_MAP = {Small: 7, Medium: 4, Large: 3};
const MAX_REGION_SIZE_MAP = {Small: 16, Medium: 12, Large: 10};
const BASE_NUM_REGIONS_MAP = {Small: 3, Medium: 14, Large: 36};
const REGIONS_PER_PLAYER_ALLOCATION_MAP = {Small: 2, Medium: 3, Large: 4};

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
        const maxWidth = Math.min(maxRegionSize - 1, CONSTS.GRID_WIDTH - left - 1);
        const maxHeight = Math.min(maxRegionSize - 1, CONSTS.GRID_HEIGHT - top - 1);
        const width = utils.rint(minRegionSize + 1, maxWidth);
        const height = utils.rint(minRegionSize + 1, maxHeight);
        if (left + width >= CONSTS.GRID_WIDTH || top + height >= CONSTS.GRID_HEIGHT) {
            throw new Error(`region out of bounds = ${left} + ${width}, ${top} + ${height}`);
        }
        return new Bounds(left, top, width, height);
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
        let regionMap = new RegionMap();
        regions = [];
        regionCount = 0;
        const positionSet = new PositionSet();

        // start with a region in the middle, then add positions for the border of that region.
        let bounds = this.createBoundsAtCenter(minRegionSize, maxRegionSize);
        positionSet.addPositionsForBounds(bounds, minRegionSize, regionMap);
        regionCount = MapGenerator.addRegion(bounds, regionCount, regions, regionMap);

        while (regionCount < neededRegions && !positionSet.isEmpty()) {
            const pos = positionSet.removeRandomPosition();
            if (!regionMap.get(pos[0], pos[1])) {
                bounds = MapGenerator.createBoundsAtPosition(pos[0], pos[1], minRegionSize, maxRegionSize);
                let overlapBitmap = bounds.overlaps(regionMap);
                while (overlapBitmap > 0 && !bounds.shrink(minRegionArea, overlapBitmap)) {
                    overlapBitmap = bounds.overlaps(regionMap);
                }
                if (overlapBitmap == 0) {
                    regionCount = MapGenerator.addRegion(bounds, regionCount, regions, regionMap);
                    positionSet.addPositionsForBounds(bounds, minRegionSize, regionMap);
                }
            }
        }

        regionMap.fillNeighborLists();
        return regions;
    }

    createBoundsAtCenter(minRegionSize, maxRegionSize) {
        const left = Math.floor((CONSTS.GRID_WIDTH - maxRegionSize + 1) / 2);
        const top = Math.floor((CONSTS.GRID_HEIGHT - maxRegionSize + 1) / 2);
        return MapGenerator.createBoundsAtPosition(left, top, minRegionSize, maxRegionSize);
    }

}
