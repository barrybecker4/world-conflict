
class RegionMap {

    constructor() {
        this.positionToRegion = utils.range(0, CONSTS.GRID_WIDTH).map(() => []);
    }

    get(x, y) {
        return this.positionToRegion[x][y];
    }

    set(x, y, region) {
        this.positionToRegion[x][y] = region;
    }

    hasColumn(x) {
        return !!this.positionToRegion[x];
    }

    // Figures out who borders with who, using the 2d grid in 'regionMap'.
    fillNeighborLists() {
        utils.for2d(1, CONSTS.GRID_WIDTH - 1, 1, CONSTS.GRID_HEIGHT - 1, (x, y) => {
            const region = this.positionToRegion[x][y];
            if (region) {
                [[-1, 0], [1, 0], [0, -1], [0, 1]].map((d) => {
                    const potentialNeighbor = this.positionToRegion[x + d[0]][y + d[1]];
                    if (potentialNeighbor && (potentialNeighbor !== region)
                        && (region.neighbors.indexOf(potentialNeighbor.index) === -1)) {
                        region.neighbors.push(potentialNeighbor.index);
                    }
                });
            }
        });
    }

    toString() {
        return this.positionToRegion.map((a, i) => a.map((r, j) => `${i},${j}: ` + r.toString()).join('\n'));
    }
}