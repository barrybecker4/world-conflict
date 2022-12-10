let perturbConst = null;
const PERTURB_SCALE = 0.4;

// bitmap for overlapping part
const TOP_OVERLAP = 1;
const BOTTOM_OVERLAP = 2;
const LEFT_OVERLAP = 4;
const RIGHT_OVERLAP = 8;
const CENTER_OVERLAP = 16;

class Bounds {

    constructor(left, top, width, height) {
        this.left = left;
        this.top = top;
        this.width = width;
        this.height = height;
    }

    copy() {
        return new Bounds(this.left, this.top, this.width, this.height);
    }

    toString() {
        return `{ left: ${this.left}, top: ${this.top}, width: ${this.width}, height: ${this.height} }`;
    }

    markInMap(region, regionMap) {
        utils.for2d(this.left, this.left + this.width, this.top, this.top + this.height, function(x, y) {
            regionMap[x][y] = region;
        });
    }

    // Shrink the region given by 'bounds' in a random direction.
    // Return true if the shrunk region became smaller than the minRegionArea specified.
    shrink(minRegionArea) {
        var r = utils.rint(0, 4);
        if (r % 2) this.width--;
        else this.height--;
        if (r === 2) this.top++;
        if (r === 3) this.left++;
        return (this.width * this.height < minRegionArea);
    }

    // Grow the region given by 'bounds' in a random direction.
    // Return true if the grown region became larger than the maxRegionArea specified.
    grow(maxRegionArea) {
        var r = utils.rint(0, 4);
        if (r % 2) this.width++;
        else this.height++;
        if (r === 2) this.top--;
        if (r === 3) this.left--;
        return (this.width * this.height > maxRegionArea);
    }

    // Checks if the region given by 'bounds' overlaps any existing region.
    // Returns a bitmap of which edges (or center) overlap
    overlaps(regionMap) {
        let topOverlap = false;
        let bottomOverlap = false;
        let leftOverlap = false;
        let rightOverlap = false;
        let overlapBitmap = 0;
        const right = this.left + this.width - 1;
        const bottom = this.top + this.height - 1;
        for (let i = this.left; i <= right; i++) {
            topOverlap = topOverlap || !!regionMap[i][this.top];
            bottomOverlap = bottomOverlap || !!regionMap[i][bottom];
        }
        if (topOverlap) {
            overlapBitmap += TOP_OVERLAP;
        }
        if (bottomOverlap) {
            overlapBitmap += BOTTOM_OVERLAP;
        }

        for (let j = this.top; j <= bottom; j++) {
            leftOverlap = leftOverlap || !!regionMap[this.left][j];
            rightOverlap = rightOverlap || !!regionMap[right][j];
        }
        if (leftOverlap) {
            overlapBitmap += LEFT_OVERLAP;
        }
        if (rightOverlap) {
            overlapBitmap += RIGHT_OVERLAP;
        }

        const centerOverlap = !!regionMap[Math.floor((this.left + right) / 2)][Math.floor((this.top + bottom) / 2)];
        if (centerOverlap) {
            overlapBitmap += CENTER_OVERLAP;
        }
        //console.log("returning " + overlapBitmap + " topOver=" + topOverlap + " bottomOver=" + bottomOverlap + " leftOver=" + leftOverlap + " rightOver=" + rightOverlap + " center=" + centerOverlap);
        return overlapBitmap;
    }

    // Puts a new rectangular region with perturbed borders at the position given in bounds {Left, Top, Width, Height}.
    makeRegion(index) {
        const left = this.left;
        const top = this.top;
        var width = this.width;
        var height = this.height;

        var points = [];
        utils.range(0, width).map(function(i) {
            points[i] = Bounds.perturbPoint(left + i, top);
            points[width + height + i] = Bounds.perturbPoint(left + width - i, top + height);
        });
        utils.range(0, height).map(function(i) {
            points[width + i] = Bounds.perturbPoint(left + width, top + i);
            points[width + height + width + i] = Bounds.perturbPoint(left, top + height - i);
        });
        return new Region({ index, points });
    }

    static getPerturbConst() {
      if (perturbConst == null) {
          perturbConst = utils.rint(10000, 100000);
      }
      return perturbConst;
    }

    // Perturbs a point to give the region borders a natural feel.
    static perturbPoint(x, y) {
        //return { x, y };
        const pc = Bounds.getPerturbConst();
        const angle = (Math.sin(x * x * y * y * 600 + pc * 357)) * 2 * Math.PI;
        const dist = PERTURB_SCALE * (Math.sin(x * y * 600 + pc * 211));
        const xPos = x + Math.sin(angle) * dist;
        const yPos = y + Math.cos(angle) * dist;
        return { x: xPos, y: yPos };
    }
}