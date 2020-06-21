import utils from '../../utils/utils.js';
import Region from '../../state/model/Region.js';

const MIN_REGION_SIZE = 3;

export default class Bounds {

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
        utils.map(utils.range(0, width), function(i) {
            points[i] = perturbPoint(left + i, top);
            points[width + height + i] = perturbPoint(left + width - i, top + height);
        });
        utils.map(utils.range(0, height), function(i) {
            points[width + i] = perturbPoint(left + width, top + i);
            points[width + height + width + i] = perturbPoint(left, top + height - i);
        });
        return new Region(index, points);
    }
}

var perturbConst = utils.rint(10000, 100000);

// Perturbs a point to give the region borders a natural feel.
function perturbPoint(x, y) {
    var angle = (Math.sin(x * x * y * y * 600 + perturbConst * 357)) * 6.28;
    var dist = (Math.sin(x * y * 600 + perturbConst * 211)) / 2;
    return [x + Math.sin(angle) * dist, y + Math.cos(angle) * dist];
}
