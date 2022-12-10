var FastMapGeneratorTests = (function (my) {

    my.runTests = function(QUnit) {

        QUnit.test("FastMapGenerator: Verify generating small map", function( assert ) {
            const randomGen = new RandomNumberGenerator(1);
            utils.random = () => randomGen.nextRandom();

            const mapGenerator = new FastMapGenerator();
            const playerCount = 2;
            const mapSize = "Small";
            const startTime = Date.now();
            const regions = mapGenerator.generateMap(playerCount, mapSize);
            const elapsed = Date.now() - startTime;
            console.log("Time to generate small map (fast) = " + elapsed);

            assert.equal(regions.length, 5); // want 6
            assert.equal(elapsed < 100, true);
        });

        QUnit.test("FastMapGenerator: Verify generating medium map", function( assert ) {
            const randomGen = new RandomNumberGenerator(1);
            utils.random = () => randomGen.nextRandom();

            const mapGenerator = new FastMapGenerator();
            const playerCount = 3;
            const mapSize = "Medium";
            const startTime = Date.now();
            const regions = mapGenerator.generateMap(playerCount, mapSize);
            const elapsed = Date.now() - startTime;
            console.log("Time to generate medium map (fast) = " + elapsed);

            assert.equal(regions.length, 11); // want 19
            assert.equal(elapsed < 60, true);
        });

        QUnit.test("FastMapGenerator: Verify generating large map", function( assert ) {
            const randomGen = new RandomNumberGenerator(1);
            utils.random = () => randomGen.nextRandom();

            const mapGenerator = new FastMapGenerator();
            const playerCount = 3;
            const mapSize = "Large";
            const startTime = Date.now();
            const regions = mapGenerator.generateMap(playerCount, mapSize);
            const elapsed = Date.now() - startTime;
            console.log("Time to generate large map (fast) = " + elapsed);

            assert.equal(regions.length, 25); // want 29
            assert.equal(elapsed < 60, true);
        });

        function printRegions(regions) {
            console.log("regions = \n" + regions.map(r => r.toString()).join('\n'));
        }
    }

    return my;
} (FastMapGeneratorTests || {}));

