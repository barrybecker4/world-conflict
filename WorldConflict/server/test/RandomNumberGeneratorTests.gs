var RandomNumberGeneratorTests = (function (my) {

    my.runTests = function(QUnit) {

        QUnit.module("RandomNumberGenerator:");

        QUnit.test("Verify RandomNumberGenerator", function( assert ) {
            const generator = new RandomNumberGenerator(2);
            assert.equal(generator.nextRandom(), 0.7342509443406016);
        });

        QUnit.test("Verify deterministic random numbers", function( assert ) {
            injectRandom(1);
            let str = '';
            for (let i = 0; i < 5; i++) {
                const r = utils.random();
                str += r + ', ';
            }
            assert.equal(str, '0.6270739405881613, 0.7342509443406016, 0.7202267837710679, 0.9236361971125007, 0.6897749109193683, ');
        });

        QUnit.test("Verify deterministic random integers", function( assert ) {
            injectRandom(1);
            let str = '';
            for (let i = 0; i < 30; i++) {
                const r = utils.rint(0, 1000);
                if (i > 20) {
                    str += r + ', ';
                }
            }
            assert.equal(str, '621, 92, 332, 597, 511, 403, 428, 210, 861, ');
        });

        QUnit.test("Verify roughly uniform distribution", function( assert ) {
            injectRandom(1);
            const histogram = [];
            for (let i = 0; i < 10; i++) {
                histogram.push(0);
            }
            for (let i = 0; i < 10000; i++) {
                const r = 10.0 * utils.random();
                histogram[Math.floor(r)]++;
            }
            assert.equal(JSON.stringify(histogram), '[986,1014,1028,972,1012,1004,974,995,1014,1001]');
        });

        function injectRandom(seed) {
            const generator = new RandomNumberGenerator(seed);
            utils.random = () => generator.nextRandom();
        }
    }

    return my;
} (RandomNumberGeneratorTests || {}));

