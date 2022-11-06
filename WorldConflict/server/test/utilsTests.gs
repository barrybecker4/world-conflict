
var utilsTests = (function (my) {

    my.runTests = function(QUnit) {

        QUnit.test("Verify rint", function( assert ) {
            for (let i = 0; i < 20; i++) {
                const min = i;
                const max = 2 * (i + 1);
                const randomInt = utils.rint(min, max);
                assert.equal(randomInt >= min, true, "Value must be >= " + min);
                assert.equal(randomInt < max, true, "Value must be greater than " + max);
            }
        });

        QUnit.test("Verify range", function( assert ) {
            const aRange = utils.range(10, 22);
            assert.equal(aRange[0], 10, "low must be 10");
            assert.equal(aRange.length, 12, "length must be 12");
            assert.equal(aRange[11], 21, "low must be 11");
        });

        QUnit.test("Verify clamp", function( assert ) {
            assert.equal(utils.clamp(3, 10, 20), 10);
            assert.equal(utils.clamp(10, 10, 20), 10);
            assert.equal(utils.clamp(14, 10, 20), 14);
            assert.equal(utils.clamp(20, 10, 20), 20);
            assert.equal(utils.clamp(100, 10, 20), 20);
        });

        QUnit.test("Verify lerp", function( assert ) {
            assert.equal(utils.lerp(0.5, 10, 20), 15.0);
            assert.equal(utils.lerp(0.6, -10, 30), 14.0);
            assert.equal(utils.lerp(0.0, -5, 20), -5);
            assert.equal(utils.lerp(1.0, 50, 100), 100);
            assert.equal(utils.lerp(-1.0, 50, 100), 50);
            assert.equal(utils.lerp(2.0, 5, 10), 10);
        });
    }

    return my;
} (utilsTests || {}));

