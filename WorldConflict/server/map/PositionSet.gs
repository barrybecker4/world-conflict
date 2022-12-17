
class PositionSet {

    constructor() {
        this.positions = [];
    }

    addPosition(position) {
        this.positions.push(position);
    }

    addPositionIfValid(x, y, minRegionSize, regionMap) {
        const maxX = CONSTS.GRID_WIDTH - minRegionSize - 1;
        const maxY = CONSTS.GRID_HEIGHT - minRegionSize - 1;
        const inbounds = x > 0 && y > 0 && x < maxX && y < maxY;
        if (inbounds && !regionMap.hasColumn(x)) {
            throw new Error("invalid x pos: " + x + " in regionMap " + regionMap);
        }
        if (inbounds && regionMap.hasColumn(x) && !regionMap.get(x, y)) {
            this.addPosition([x, y]);
        }
    }

    removeRandomPosition() {
        if (this.isEmpty()) {
            throw new Error("Cannot remove a position when the set is empty");
        }
        const len = this.positions.length;
        const idx = utils.rint(0, len);
        const value = this.positions[idx];
        if (idx < len - 1) {
            this.positions[idx] = this.positions[len - 1];
        }
        this.positions.pop();
        return value;
    }

    addPositionsForBounds(bounds, minRegionSize, regionMap) {
        const left = bounds.left - minRegionSize + 1;
        const top = bounds.top - minRegionSize + 1;
        const right = bounds.left + bounds.width - 1;
        const bottom = bounds.top + bounds.height - 1;

        for (let x = left; x <= right; x++) {
            this.addPositionIfValid(x, top - 1, minRegionSize, regionMap);
            this.addPositionIfValid(x, bottom + 1, minRegionSize, regionMap);
        }
        for (let y = top; y <= bottom; y++) {
            this.addPositionIfValid(left - 1, y, minRegionSize, regionMap);
            this.addPositionIfValid(right + 1, y, minRegionSize, regionMap);
        }
    }

    toString() {
        return this.positions.map(p => `(${p[0]}, ${p[1]})`).join(', ');
    }

    isEmpty() {
        return this.positions.length == 0;
    }
}