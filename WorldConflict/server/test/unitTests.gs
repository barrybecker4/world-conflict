function getResultsFromServer() {
   return QUnitGS2.getResultsFromServer();
}

/**
 * Add all Unit tests here.
 * See https://github.com/artofthesmart/QUnitGS2
 */
var unitTests = (function (my) {

    my.getUnitTestHtml = function() {
        QUnitGS2.init();
        const QUnit = QUnitGS2.QUnit;

        QUnit.test("Verify valid user email", function( assert ) {
            assert.equal(getUserEmail().endsWith("@gmail.com"), true, "The users email must end with @gmail.com");
        });

        QUnit.test("Verify valid user id", function( assert ) {
            const userId = getUserId();
            assert.equal(userId.length > 1, true, "The users id must have non 0 length.");
            assert.equal(getUserEmail().startsWith(userId), true, "The users id should be the first part of their email");
        });

        QUnit.test("Verify CONSTS", function( assert ) {
            CONSTS = CONSTS.PLAYERS ? CONSTS : CONSTS.initialize();
            assert.equal(CONSTS != null, true, "There should be CONSTS.");
            assert.equal(CONSTS.PLAYERS.length > 0, true, "There should be players.");
            assert.equal(CONSTS.AI_PERSONALITIES.length > 0, true, "There should be ai personalities.");
        });

        // storage and db actions are not accessible on the server
        QUnit.test("Verify makeNewGameData when no clientGameData specified", function( assert ) {
            CONSTS = CONSTS.PLAYERS ? CONSTS : CONSTS.initialize();
            const setup = {
                playerTypes: [CONSTS.PLAYER_HUMAN_SET, CONSTS.PLAYER_AI, CONSTS.PLAYER_OFF, CONSTS.PLAYER_AI],
                aiLevel: CONSTS.AI_NICE,
                sound: true,
                turnCount: CONSTS.STANDARD_TURN_COUNT,
                firstTimeInstructions: {},
                mapWidth: 30,
                mapHeight: 20,
                humanTimeLimit: CONSTS.STANDARD_HUMAN_TIME_LIMIT,
            };
            assert.equal(setup != null, true, "Have setup data.");
            const clientGameData = null;

            assert.equal(erisk != null, true, "Have erisk.");
            assert.equal(erisk.makeNewGameData != null, true, "Have makeNewGameData.");
            // can't call this because it accesses firestore
            //const gameData = erisk.makeNewGameData(setup, clientGameData);
            //assert.equal(gameData != null, true, "Unexpected game data.");
        });

        // Run all the other unit test files
        RandomNumberGeneratorTests.runTests(QUnit);
        PositionSetTests.runTests(QUnit);
        BoundsTests.runTests(QUnit);
        makeGameDataTests.runTests(QUnit);
        utilsTests.runTests(QUnit);
        sequenceUtilsTests.runTests(QUnit);
        FastMapGeneratorTests.runTests(QUnit);
        RegionTests.runTests(QUnit);

        QUnit.start();
        return QUnitGS2.getHtml();
    }

    return my;
} (unitTests || {}));

