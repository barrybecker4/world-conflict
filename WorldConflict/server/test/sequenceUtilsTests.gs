var sequenceUtilsTests = (function (my) {

    my.runTests = function(QUnit) {

        QUnit.module("sequenceUtils:");

        QUnit.test("Verify min when no key function", function( assert ) {
            const seq = ["frog", "dzog", "baz", "Barry", "foo", 4, "aaron", "bar"];
            assert.equal(sequenceUtils.min(seq), "Barry");
        });

        QUnit.test("Verify min given key function", function( assert ) {
             const seq = ["frog", "dzog", "baz", "Barry", "foo", "aaron", "bar"];
             const keyFn = (v) => v.substring(1);
             assert.equal(sequenceUtils.min(seq, keyFn), "bar");
        });

        QUnit.test("Verify min/max for numerics", function( assert ) {
             const seq = [4, 3, 17, 23, 21, 12, 1, 11];
             assert.equal(sequenceUtils.min(seq), 1);
             assert.equal(sequenceUtils.max(seq), 23);
        });

        QUnit.test("Verify min/max given key function and numerics", function( assert ) {
             const seq = [4, 3, 17, 23, 21, 12, 1, 11];
             const keyFn = (v) => Math.pow(v - 10, 2);
             assert.equal(sequenceUtils.min(seq, keyFn), 11);
             assert.equal(sequenceUtils.max(seq, keyFn), 23);
        });

        QUnit.test("Verify pairwise distance", function( assert ) {
             const seq = [4, 3, 17, 2, 10, 12];
             const distanceFn = (a, b) => Math.abs(a - b);
             assert.deepEqual(sequenceUtils.pairwise(seq, distanceFn),
                 [1, 13, 2, 6, 8, 14, 1, 7, 9, 15, 7, 5, 8, 10, 2]
             );
        });

        QUnit.test("Verify pairwise concat", function( assert ) {
             const seq = ["cat", "dog", "foo", "bar"];
             const concatFn = (a, b) => a + ':' + b;
             assert.deepEqual(sequenceUtils.pairwise(seq, concatFn),
                 ["cat:dog", "cat:foo", "cat:bar", "dog:foo", "dog:bar", "foo:bar"]
             );
        });

        QUnit.test("Verify shuffle", function( assert ) {
             const seq = [4, 3, 17, 2, 10, 12];
             // must make a copy of the array because shuffle happens in-place.
             const shuffled = sequenceUtils.shuffle(seq.concat());
             assert.equal(shuffled.length, seq.length);
             assert.notDeepEqual(seq, shuffled);
        });

        QUnit.test("Verify contains", function( assert ) {
             const item1 = { a: 'cat', b: 'dog' };
             const item2 = { a: 'hammer', b: 'nail' };
             const seq = [item1, item2];

             assert.equal(sequenceUtils.contains(seq, item1), true);
             assert.equal(sequenceUtils.contains(seq, item2), true);
             assert.equal(sequenceUtils.contains(seq, { a: "cat", b: "dog" }), false);
             assert.equal(sequenceUtils.contains(null, item1), false);
        });
    }

    return my;
} (sequenceUtilsTests || {}));

