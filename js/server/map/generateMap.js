import utils from '../../utils/utils.js';
import Bounds from './Bounds.js';

const MAX_REGION_SIZE = 11;
const BASE_NUM_REGIONS = 13;
const REGIONS_PER_PLAYER_ALLOCATION = 3;

/**
 * Generates a new procedural map for a given number of players.
 * @return an array of Regions that will define the initial map.
 */
export default function generateMap(playerCount, mapWidth, mapHeight) {
    const maxRegionSize = MAX_REGION_SIZE - playerCount;
    const neededRegions = BASE_NUM_REGIONS + playerCount * REGIONS_PER_PLAYER_ALLOCATION;
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
            const bounds = new Bounds(maxRegionSize, mapWidth, mapHeight);

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
        utils.for2d(1, 1, mapWidth - 1, mapHeight - 1, function(x, y) {
            var region = regionMap[x][y];
            if (region) {
                [[-1, 0], [1, 0], [0, -1], [0, 1]].map(function(d) {
                    var potentialNeighbor = regionMap[x + d[0]][y + d[1]];
                    if (potentialNeighbor && (potentialNeighbor != region) && (region.neighbors.indexOf(potentialNeighbor.index) == -1))
                        region.neighbors.push(potentialNeighbor.index);
                });
            }
        });
    }
}