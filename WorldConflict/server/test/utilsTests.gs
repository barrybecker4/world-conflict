var utilsTests = (function (my) {

    my.runTests = function(QUnit) {

        QUnit.module("utils:");

        QUnit.test("Verify Set", function( assert ) {
            const set = new Set();
            set.add(1);
            set.add(5);
            set.add(5);
            assert.equal(set.has(1), true);
            assert.equal(set.has(3), false);
            assert.equal(set.has(5), true);
        });

        QUnit.test("Verify rint", function( assert ) {
            for (let i = 0; i < 20; i++) {
                const min = i;
                const max = 2 * (i + 1);
                const randomInt = utils.rint(min, max);
                assert.equal(randomInt >= min, true, "Value must be >= " + min);
                assert.equal(randomInt < max, true, "Value must be greater than " + max);
            }
        });

        QUnit.test("Verify rint if low > high", function( assert ) {
            const randomInt = utils.rint(20, 10);
            assert.equal(randomInt, 20);
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

        QUnit.test("Verify forEachProperty when array", function( assert ) {
            let str = "";
            const arr = ["foo", "bar"]
            const fn = (value, prop) => { str += prop + ":" + value + ";" }
            utils.forEachProperty(arr, fn);

            assert.equal(str, "0:foo;1:bar;");
        });

        QUnit.test("Verify forEachProperty when object", function( assert ) {
            let str = "";
            const obj = { foo: "bar", baz: 42, cat: "dog" };

            const fn = function(value, prop) {
                return str += prop + ":" + value + ";";
            }
            utils.forEachProperty(obj, fn);

            assert.equal(str, "foo:bar;baz:42;cat:dog;");

            let str2 = ""
            const fn2 = function(value) {
                return str2 += value + ";";
            }
            utils.forEachProperty(obj, fn2);
            assert.equal(str2, "bar;42;dog;");
        });

        QUnit.test("Verify for2d", function( assert ) {
            let str = "";
            const fn = function(x, y) {
                return str += `(${x}, ${y}) `;
            }
            utils.for2d(1, 3, 2, 4, fn);

            assert.equal(str, "(1, 2) (1, 3) (2, 2) (2, 3) ");
        });
    }

    return my;
} (utilsTests || {}));
