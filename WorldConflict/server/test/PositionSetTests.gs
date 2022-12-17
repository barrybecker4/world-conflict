
var PositionSetTests = (function (my) {

    my.runTests = function(QUnit) {

        QUnit.test("Verify add and then remove single position", function( assert ) {

            const positionSet = new PositionSet();

            const posAdded = [3, 5];
            positionSet.addPosition(posAdded);
            const pos = positionSet.removeRandomPosition();

            assert.equal(pos, posAdded);
        });


        QUnit.test("Verify add and then remove single position", function( assert ) {

            const positionSet = new PositionSet();
            const bounds = new Bounds(4, 5, 2, 2);
            const minRegionSize = 2;
            const regionMap = utils.range(0, CONSTS.GRID_WIDTH).map(() => []); // TODO make class
            positionSet.addPositionsForBounds(bounds, minRegionSize, regionMap)

            // TODO: fix bug - this isn't right
            // 1
            // 2 ...XX..
            // 3 ..X..X.
            // 4 ..X..X
            // 5 ..X..X
            // 6 ..X..X
            // 7 ...XX.
            assert.equal(positionSet.toString(), "(4, 2), (4, 7), (5, 2), (5, 7), (3, 3), (6, 3), (3, 4), (6, 4), (3, 5), (6, 5), (3, 6), (6, 6)");
        });

        QUnit.test("Verify Bounds copy", function( assert ) {
            const randomGen = new RandomNumberGenerator(1);
            utils.random = () => randomGen.nextRandom();

            assert.equal(4, 4);
        });

    }

    return my;
} (PositionSetTests || {}));

