
var sequenceUtilsTests = (function (my) {

    my.runTests = function(QUnit) {

        QUnit.test("Verify min when no key function", function( assert ) {
            const seq = ["frog", "dzog", "baz", "Barry", "foo", 4, "aaron", "bar"];
            assert.equal(sequenceUtils.min(seq), "Barry");
        });

        QUnit.test("Verify min given key function", function( assert ) {
             const seq = ["frog", "dzog", "baz", "Barry", "foo", "aaron", "bar"];
             const keyFn = (v) => v.substring(1);
             assert.equal(sequenceUtils.min(seq, keyFn), "bar");
        });

        QUnit.test("Verify min/max given key function and numerics", function( assert ) {
             const seq = [4, 3, 17, 23, 21, 12, 1, 11];
             const keyFn = (v) => Math.pow(v - 10, 2);
             assert.equal(sequenceUtils.min(seq, keyFn), 11);
             assert.equal(sequenceUtils.max(seq, keyFn), 23);
        });

        QUnit.test("Verify pairwise", function( assert ) {
             const seq = [4, 3, 17, 2, 10, 12];
             const distanceFn = (a, b) => Math.abs(a - b);
             assert.deepEqual(sequenceUtils.pairwise(seq, distanceFn), [1, 13, 2, 6, 8, 14, 1, 7, 9, 15, 7, 5, 8, 10, 2]);
        });

        QUnit.test("Verify shuffle", function( assert ) {
             const seq = [4, 3, 17, 2, 10, 12];
             const shuffled = sequenceUtils.shuffle(seq)
             assert.equals(shuffled.length, seq.length);
             assert.notDeepEqual(seq, shuffled);
        });

    }

    return my;
} (sequenceUtilsTests || {}));

