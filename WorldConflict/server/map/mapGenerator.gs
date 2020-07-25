var mapGenerator = (function(my) {
    const MAX_REGION_SIZE = 11;
    const BASE_NUM_REGIONS = 13;
    const REGIONS_PER_PLAYER_ALLOCATION = 3;

    const MIN_REGION_SIZE = 3;

    class Bounds {

        constructor(maxRegionSize, mapWidth, mapHeight) {
            this.left = utils.rint(1, mapWidth - maxRegionSize + 1);
            this.top = utils.rint(1, mapHeight - maxRegionSize + 1);
            this.width = utils.rint(MIN_REGION_SIZE, maxRegionSize);
            this.height = utils.rint(MIN_REGION_SIZE, maxRegionSize);
        }

        markInMap(region, regionMap) {
            utils.for2d(this.left, this.top, this.left + this.width, this.top + this.height, function(x, y) {
                regionMap[x][y] = region;
            });
        }

        // Shrink the region given by 'bounds' in a random direction
        shrink() {
            var r = utils.rint(0, 4);
            if (r % 2) this.width--;
            else this.height--;
            if (r === 2) this.top++;
            if (r === 3) this.left++;
            return (this.width * this.height < 9);
        }

        // Checks if the region given by 'bounds' overlaps any existing region.
        overlaps(regionMap) {
            var rv = false;
            utils.for2d(this.left, this.top, this.left + this.width, this.top + this.height, function(x, y) {
                rv = rv || regionMap[x][y];
            });
            return rv;
        }

        // Puts a new rectangular region at the position given in bounds {Left, Top, Width, Height}.
        makeRegion(index) {
            const left = this.left;
            const top = this.top;
            var width = this.width;
            var height = this.height;

            var points = [];
            utils.range(0, width).map(function(i) {
                points[i] = perturbPoint(left + i, top);
                points[width + height + i] = perturbPoint(left + width - i, top + height);
            });
            utils.range(0, height).map(function(i) {
                points[width + i] = perturbPoint(left + width, top + i);
                points[width + height + width + i] = perturbPoint(left, top + height - i);
            });
            return new Region({ index, points });
        }
    }

    let perturbConst = null; // don't access directly
    function getPerturbConst() {
      if (perturbConst == null) {
          perturbConst = utils.rint(10000, 100000);
      }
      return perturbConst;
    }

    // Perturbs a point to give the region borders a natural feel.
    function perturbPoint(x, y) {
        const pc = getPerturbConst();
        var angle = (Math.sin(x * x * y * y * 600 + pc * 357)) * 2 * Math.PI;
        var dist = (Math.sin(x * y * 600 + pc * 211)) / 2;
        return [x + Math.sin(angle) * dist, y + Math.cos(angle) * dist];
    }

    /**
     * Generates a new procedural map for a given number of players.
     * @return an array of Regions that will define the initial map.
     */
    my.generateMap = function(playerCount, mapWidth, mapHeight) {
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

    return my;
}(mapGenerator || {}));
