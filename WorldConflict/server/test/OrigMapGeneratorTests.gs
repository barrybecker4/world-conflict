var OrigMapGeneratorTests = (function (my) {

    my.runTests = function(QUnit) {

        QUnit.test("OrigMapGenerator: Verify generating small map", function( assert ) {
            const randomGen = new RandomNumberGenerator(1);
            utils.random = () => randomGen.nextRandom();

            const mapGenerator = new OrigMapGenerator();
            const playerCount = 2;
            const mapWidth = 30;
            const mapHeight = 20;
            const mapSize = "Small";
            const regions = mapGenerator.generateMap(playerCount, mapWidth, mapHeight, mapSize);
            console.log("Small map: \n" + JSON.stringify(regions));
            console.log("Time to generate small map = " + elapsed);

            assert.equal(regions.length, 6);
        });

        QUnit.test("OrigMapGenerator: Verify generating medium map", function( assert ) {
            const randomGen = new RandomNumberGenerator(1);
            utils.random = () => randomGen.nextRandom();

            const mapGenerator = new OrigMapGenerator();
            const playerCount = 3;
            const mapWidth = 60;
            const mapHeight = 40;
            const mapSize = "Medium";
            const startTime = Date.now();
            const regions = mapGenerator.generateMap(playerCount, mapWidth, mapHeight, mapSize);
            const elapsed = Date.now() - startTime;
            console.log("Time to generate medium map = " + elapsed);

            assert.equal(regions.length, 22);
            assert.equal(elapsed < 300, true);
        });

        QUnit.test("OrigMapGenerator: Verify generating large map", function( assert ) {
            const randomGen = new RandomNumberGenerator(1);
            utils.random = () => randomGen.nextRandom();

            const mapGenerator = new OrigMapGenerator();
            const playerCount = 3;
            const mapWidth = 30;
            const mapHeight = 20;
            const mapSize = "Large";
            const startTime = Date.now();
            const regions = mapGenerator.generateMap(playerCount, mapWidth, mapHeight, mapSize);
            const elapsed = Date.now() - startTime;
            console.log("Time to generate large map = " + elapsed);

            assert.equal(regions.length, 29);
            assert.equal(elapsed < 1000, true);
        });

        function printRegions(regions) {
            console.log("regions = \n" + regions.map(r => r.toString()).join('\n'));
        }
    }

    return my;
} (OrigMapGeneratorTests || {}));

