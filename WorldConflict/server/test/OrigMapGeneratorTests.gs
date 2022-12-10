var OrigMapGeneratorTests = (function (my) {
    my.runTests = function(QUnit) {

        QUnit.test("OrigMapGenerator: Verify generating small map", function( assert ) {
            const randomGen = new RandomNumberGenerator(1);
            utils.random = () => randomGen.nextRandom();

            const mapGenerator = new OrigMapGenerator();
            const playerCount = 2;
            const mapSize = "Small";
            const startTime = Date.now();
            const regions = mapGenerator.generateMap(playerCount, mapSize);
            const elapsed = Date.now() - startTime;
            console.log("Time to generate small map = " + elapsed);
            //console.log("Small map: \n" + JSON.stringify(regions));

            assert.equal(regions.length, 6);
            assert.equal(elapsed < 800, true, "Too slow: " + elapsed);
        });

        QUnit.test("OrigMapGenerator: Verify generating medium map", function( assert ) {
            const randomGen = new RandomNumberGenerator(1);
            utils.random = () => randomGen.nextRandom();

            const mapGenerator = new OrigMapGenerator();
            const playerCount = 3;
            const mapSize = "Medium";
            const startTime = Date.now();
            const regions = mapGenerator.generateMap(playerCount, mapSize);
            const elapsed = Date.now() - startTime;
            console.log("Time to generate medium map = " + elapsed);

            assert.equal(regions.length, 19);
            assert.equal(elapsed < 400, true, "Too slow: " + elapsed);
        });

        QUnit.test("OrigMapGenerator: Verify generating large map", function( assert ) {
            const randomGen = new RandomNumberGenerator(1);
            utils.random = () => randomGen.nextRandom();

            const mapGenerator = new OrigMapGenerator();
            const playerCount = 3;
            const mapSize = "Large";
            const startTime = Date.now();
            const regions = mapGenerator.generateMap(playerCount, mapSize);
            const elapsed = Date.now() - startTime;
            console.log("Time to generate large map = " + elapsed);

            assert.equal(regions.length, 29);
            assert.equal(elapsed < 1000, true, "Too slow: " + elapsed);
        });

        function printRegions(regions) {
            console.log("regions = \n" + regions.map(r => r.toString()).join('\n'));
        }
    }

    return my;
} (OrigMapGeneratorTests || {}));

