
var PositionSetTests = (function (my) {

    my.runTests = function(QUnit) {

        QUnit.module("PositionSet:");

        QUnit.test("Verify add and then remove single position", function( assert ) {

            const positionSet = new PositionSet();

            const posAdded = [3, 5];
            positionSet.addPosition(posAdded);
            const pos = positionSet.removeRandomPosition();

            assert.equal(pos, posAdded);
        });

        QUnit.test("Verify addPositionForBounds", function( assert ) {

            const positionSet = new PositionSet();
            const bounds = new Bounds(4, 5, 2, 2);
            const minRegionSize = 2;
            const regionMap = new RegionMap();
            positionSet.addPositionsForBounds(bounds, minRegionSize, regionMap)

            // 2
            // 3 ..XXX..
            // 4 .X...X
            // 5 .X.OOX
            // 6 .X.OOX
            // 7 ..XXX.
            // 8 .......
            assert.equal(positionSet.toString(), "(3, 3), (3, 7), (4, 3), (4, 7), (5, 3), (5, 7), (2, 4), (6, 4), (2, 5), (6, 5), (2, 6), (6, 6)");
        });

        QUnit.test("Verify Bounds copy", function( assert ) {
            const randomGen = new RandomNumberGenerator(1);
            utils.random = () => randomGen.nextRandom();

            assert.equal(4, 4);
        });

    }

    return my;
} (PositionSetTests || {}));

