var RegionTests = (function (my) {

    my.runTests = function(QUnit) {

        QUnit.module("Region:");

        QUnit.test("Verify Region constructor", function( assert ) {
            const region = new Region({index: 3, points: [{x:2, y:4}], center: {x:5, y:6}});
            assert.equal(region.index, 3);
            assert.equal(region.points.length, 1);
            assert.equal(region.center.y, 6);
        });

       QUnit.test("Verify Region.distanceFrom", function( assert ) {
           const regionA = new Region({index: 0, neighbors: [1,2,4]});
           const regionB = new Region({index: 6, neighbors: [2]});
           const regions = [
               regionA,
               {index: 1, neighbors: [0], distanceTo: []},
               {index: 2, neighbors: [0,6,5,4,3], distanceTo: []},
               {index: 3, neighbors: [2,5,7,8], distanceTo: []},
               {index: 4, neighbors: [0,2,5], distanceTo: []},
               {index: 5, neighbors: [2,4,3,7], distanceTo: []},
               regionB,
               {index: 7, neighbors: [5,3,8], distanceTo: []},
               {index: 8, neighbors: [3,7], distanceTo: []},
           ];

           const distance = regionA.distanceFrom(regionB, regions);

           assert.equal(distance, 2);
       });
    }

    return my;
} (RegionTests || {}));

