var MapGeneratorTests = (function (my) {

    my.runTests = function(QUnit) {

        QUnit.test("MapGenerator: Verify generating small map", function( assert ) {
            const randomGen = new RandomNumberGenerator(1);
            utils.random = () => randomGen.nextRandom();

            const mapGenerator = new MapGenerator();
            const playerCount = 2;
            const mapWidth = 30;
            const mapHeight = 20;
            const mapSize = "Small";
            const regions = mapGenerator.generateMap(playerCount, mapWidth, mapHeight, mapSize);

            //printRegions(regions);
            assert.equal(regions.length, 8);
        });

        QUnit.test("MapGenerator: Verify generating medium map", function( assert ) {
            const randomGen = new RandomNumberGenerator(1);
            utils.random = () => randomGen.nextRandom();

            const mapGenerator = new MapGenerator();
            const playerCount = 3;
            const mapWidth = 60;
            const mapHeight = 40;
            const mapSize = "Medium";
            const startTime = Date.now();
            const regions = mapGenerator.generateMap(playerCount, mapWidth, mapHeight, mapSize);
            const elapsed = Date.now() - startTime;
            console.log("Time to generate medium map = " + elapsed);
            //printRegions(regions);
            assert.equal(regions.length, 22);
            assert.equal(elapsed < 500, true);
        });

        QUnit.test("MapGenerator: Verify generating large map", function( assert ) {
            const randomGen = new RandomNumberGenerator(1);
            utils.random = () => randomGen.nextRandom();

            const mapGenerator = new MapGenerator();
            const playerCount = 3;
            const mapWidth = 30;
            const mapHeight = 20;
            const mapSize = "Large";
            const startTime = Date.now();
            const regions = mapGenerator.generateMap(playerCount, mapWidth, mapHeight, mapSize);
            const elapsed = Date.now() - startTime;
            console.log("Time to generate large map = " + elapsed);
            //printRegions(regions);
            assert.equal(regions.length, 32);
            assert.equal(elapsed < 500, true);
        });

        function printRegions(regions) {
            console.log("regions = \n" + regions.map(r => r.toString()).join('\n'));
        }
    }

    return my;
} (MapGeneratorTests || {}));

