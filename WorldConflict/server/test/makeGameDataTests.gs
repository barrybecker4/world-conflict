var makeGameDataTests = (function (my) {

    my.runTests = function(QUnit) {

        QUnit.module("makeGameData:");

        QUnit.test("Verify distanceScore", function( assert ) {
            const generator = new RandomNumberGenerator(1);
            utils.random = () => generator.nextRandom();

            const region1 = new Region({index: 3, neighbors: [2, 5, 7, 8], distanceTo: []});
            const region2 = new Region({index: 7, neighbors: [5, 3, 8], distanceTo: []});
            const region3 = new Region({index: 0, neighbors: [1, 2, 4], distanceTo: []});
            const regions = [
                region1,
                new Region({index: 1, neighbors: [0], distanceTo: []}),
                new Region({index: 2, neighbors: [0, 6, 5, 4, 3], distanceTo: []}),
                region2,
                new Region({index: 4, neighbors: [0, 2, 5], distanceTo: []}),
                new Region({index: 5, neighbors: [2, 4, 3, 7], distanceTo: []}),
                new Region({index: 6, neighbors: [2], distanceTo: []}),
                region3,
                new Region({index: 8, neighbors: [3, 7], distanceTo: []})
            ];

            const score = erisk.distanceScore([region1, region2, region3], regions);
            assert.equal(score, 1);
        });

        QUnit.test("Verify findHomeRegions for 2 players and few regions", function( assert ) {
            const players = [
                new Player({ index: 0, name: "Player1"}),
                new Player({ index: 1, name: "Player2"}),
            ];
            // Inject a generator that will yield a fixed sequence of random numbers.
            const generator = new RandomNumberGenerator(1);
            utils.random = () => generator.nextRandom();

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
              '[{"index":1,"distanceTo":[null,null,null,null,null,null,null,null,4],"neighbors":[0]},{"index":8,"distanceTo":[null,4],"neighbors":[3,7]}]'
            );
        });

        QUnit.test("Verify findHomeRegions for 3 players and many regions", function( assert ) {

            const players = [
                new Player({ index: 0, name: "Player1"}),
                new Player({ index: 1, name: "Player2"}),
                new Player({ index: 2, name: "Player3"}),
            ];
            const generator = new RandomNumberGenerator(1);
            utils.random = () => generator.nextRandom();

            const regions = [
                new Region({index: 0, neighbors: [3,10,16,13,1], distanceTo: []}),
                new Region({index: 1, neighbors: [10,0,2,13,28], distanceTo: []}),
                new Region({index: 2, neighbors: [10,4,9,28,1], distanceTo: []}),
                new Region({index: 3, neighbors: [15,22,6,7,0], distanceTo: []}),
                new Region({index: 4, neighbors: [5,9,2], distanceTo: []}),
                new Region({index: 5, neighbors: [8,14,4], distanceTo: []}),
                new Region({index: 6, neighbors: [21,22,3], distanceTo: []}),
                new Region({index: 7, neighbors: [3,16], distanceTo: []}),
                new Region({index: 8, neighbors: [11,21,14,5], distanceTo: []}),
                new Region({index: 9, neighbors: [4,2], distanceTo: []}),
                new Region({index: 10, neighbors: [2,0,1], distanceTo: []}),
                new Region({index: 11, neighbors: [12,29,8], distanceTo: []}),
                new Region({index: 12, neighbors: [26,23,18,11], distanceTo: []}),
                new Region({index: 13, neighbors: [0,16,1], distanceTo: []}),
                new Region({index: 14, neighbors: [29,8,5], distanceTo: []}),
                new Region({index: 15, neighbors: [17,22,3], distanceTo: []}),
                new Region({index: 16, neighbors: [7,0,13], distanceTo: []}),
                new Region({index: 17, neighbors: [19,20,15], distanceTo: []}),
                new Region({index: 18, neighbors: [26,12], distanceTo: []}),
                new Region({index: 19, neighbors: [17,20], distanceTo: []}),
                new Region({index: 20, neighbors: [19,17,21,22], distanceTo: []}),
                new Region({index: 21, neighbors: [20,8,6], distanceTo: []}),
                new Region({index: 22, neighbors: [20,15,6,3], distanceTo: []}),
                new Region({index: 23, neighbors: [25,24,12], distanceTo: []}),
                new Region({index: 24, neighbors: [23], distanceTo: []}),
                new Region({index: 25, neighbors: [23], distanceTo: []}),
                new Region({index: 26, neighbors: [27,18,12], distanceTo: []}),
                new Region({index: 27, neighbors: [26], distanceTo: []}),
                new Region({index: 28, neighbors: [2,1], distanceTo: []}),
                new Region({index: 29, neighbors: [11,14], distanceTo: []}),
            ];

            const startTime = Date.now();
            const homes = erisk.findHomeRegions(players, regions, 50);
            const elapsed = Date.now() - startTime;
            console.log("Time to find home regions = " + elapsed);
            assert.equal(homes.length, 3, "Unexpected number of homes: " + homes.length);
            assert.equal(JSON.stringify(homes),
              '[{"index":18,"distanceTo":[7,7,null,null,null,null,null,null,null,6,null,null,null,null,null,null,null,null,null,6,5,4,6,null,3,null,null,null,7,3],"neighbors":[26,12]},{"index":19,"distanceTo":[null,null,null,3,null,null,null,null,null,6,null,null,5,null,null,null,null,1,6,null,null,null,null,null,7,7,null,null,6],"neighbors":[17,20]},{"index":28,"distanceTo":[2,1,null,3,2,null,null,null,null,null,2,null,null,2,null,null,null,null,7,6,null,5,4,7,null,null,null,8,null,5],"neighbors":[2,1]}]'
            );
            // before optimization, it takes about .05 seconds.
            assert.equal(elapsed < 100, true, "Took too long. Elapsed time was " + elapsed + "ms");
        });

    }

    return my;
} (makeGameDataTests || {}));

