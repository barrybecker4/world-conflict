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

            console.log("regions = " + JSON.stringify(regions));
            assert.equal(regions.length, 8);
        });

    }

    return my;
} (MapGeneratorTests || {}));

