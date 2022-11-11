

var makeGameDataTests = (function (my) {

    my.runTests = function(QUnit) {

        QUnit.test("Verify findHomeRegions for 2 players and few regions", function( assert ) {
            const players = [
                new Player({ index: 0, name: "Player1"}),
                new Player({ index: 1, name: "Player2"}),
            ];
            // Inject a generator that will yield a fixed sequence of random numbers.
            const randomGenerator = new RandomNumberGenerator(1);
            utils.random = randomGenerator.nextRandom;

            const regions = [
                new Region({index: 0, neighbors: [1, 2, 4], distanceTo: []}),
                new Region({index: 1, neighbors: [0], distanceTo: []}),
                new Region({index: 2, neighbors: [0, 6, 5, 4, 3], distanceTo: []}),
                new Region({index: 3, neighbors: [2, 5, 7, 8], distanceTo: []}),
                new Region({index: 4, neighbors: [0, 2, 5], distanceTo: []}),
                new Region({index: 5, neighbors: [2, 4, 3, 7], distanceTo: []}),
                new Region({index: 6, neighbors: [2], distanceTo: []}),
                new Region({index: 7, neighbors: [5, 3, 8], distanceTo: []}),
                new Region({index: 8, neighbors: [3, 7], distanceTo: []})
            ];

            assert.equal(erisk.findHomeRegions != null, true);
            const homes = erisk.findHomeRegions(players, regions, 5);
            assert.equal(homes.length, 2);
            assert.equal(JSON.stringify(homes),
              '[{"index":4,"distanceTo":[null,2,null,null,null,null,2],"neighbors":[0,2,5]},{"index":6,"distanceTo":[null,null,null,null,2],"neighbors":[2]}]'
            );
        });

/*
        QUnit.test("Verify findHomeRegions for 3 players and many regions", function( assert ) {
            // findHomeRegions(regions, numSetupsToTry)

            const players = [ {name: "Player1"}, {name: "Player2"}, {name: "Player3"} ];


            const region = new Region({index: 3, points: [{x:2, y:4}], center: {x:5, y:6}});
            assert.equal(region.index, 3);
            assert.equal(region.points.length, 1);
            assert.equal(region.center.y, 6);
        });
        */

    }

    return my;
} (makeGameDataTests || {}));

