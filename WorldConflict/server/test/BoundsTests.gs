
var BoundsTests = (function (my) {

    my.runTests = function(QUnit) {

        QUnit.module("Bounds:");

        QUnit.test("Verify Bounds copy", function( assert ) {
            const bounds = new Bounds(1, 2, 3, 4);
            const boundsCopy = bounds.copy();

            assert.equal(bounds == boundsCopy, false);
            assert.equal(boundsCopy.left, 1);
            assert.equal(boundsCopy.top, 2);
            assert.equal(boundsCopy.width, 3);
            assert.equal(boundsCopy.height, 4);
        });

        QUnit.test("Verify Bounds shrink down", function( assert ) {
            const bounds = new Bounds(11, 12, 13, 14);
            const minRegionArea = 16;
            let overlapBitmap = 1;
            bounds.shrink(minRegionArea, overlapBitmap);

            assert.equal(bounds.left, 11);
            assert.equal(bounds.top, 13);
            assert.equal(bounds.width, 13);
            assert.equal(bounds.height, 13);

            overlapBitmap = 5; // overlaps on top and left
            bounds.shrink(minRegionArea, overlapBitmap);
            assert.equal(bounds.left, 11);
            assert.equal(bounds.top, 14);
            assert.equal(bounds.width, 13);
            assert.equal(bounds.height, 12);
        });

        QUnit.test("Verify Bounds shrink up", function( assert ) {
            const bounds = new Bounds(11, 12, 13, 14);
            const minRegionArea = 16;
            let overlapBitmap = 2; // BOTTOM_OVERLAP
            bounds.shrink(minRegionArea, overlapBitmap);

            assert.equal(bounds.left, 11);
            assert.equal(bounds.top, 12);
            assert.equal(bounds.width, 13);
            assert.equal(bounds.height, 13);
        });

        QUnit.test("Verify Bounds shrink left", function( assert ) {
            const bounds = new Bounds(11, 12, 13, 14);
            const minRegionArea = 16;
            let overlapBitmap = 8; // RIGHT_OVERLAP
            bounds.shrink(minRegionArea, overlapBitmap);

            assert.equal(bounds.left, 11);
            assert.equal(bounds.top, 12);
            assert.equal(bounds.width, 12);
            assert.equal(bounds.height, 14);
        });

        QUnit.test("Verify Bounds shrink right", function( assert ) {
            const bounds = new Bounds(11, 12, 13, 14); // left, top, width, height
            const minRegionArea = 16;
            let overlapBitmap = 4; // LEFT_OVERLAP
            bounds.shrink(minRegionArea, overlapBitmap);

            assert.equal(bounds.left, 12);
            assert.equal(bounds.top, 12);
            assert.equal(bounds.width, 12);
            assert.equal(bounds.height, 14);
        });
    }

    return my;
} (BoundsTests || {}));

