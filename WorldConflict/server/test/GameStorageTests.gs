var GameStorageTests = (function (my) {

    my.runTests = function(QUnit) {

        QUnit.module("GameStorage Tests", {
            beforeEach: function() {
                // Create a test instance
                this.storage = new GameStorage();

                // Mock localStorage
                this.originalLocalStorage = window.localStorage;
                this.mockStorage = {};
                window.localStorage = {
                    getItem: (key) => this.mockStorage[key] || null,
                    setItem: (key, value) => { this.mockStorage[key] = value; },
                    removeItem: (key) => { delete this.mockStorage[key]; }
                };
            },
            afterEach: function() {
                // Restore original localStorage
                window.localStorage = this.originalLocalStorage;
            }
        });

        QUnit.test("Default setup is valid", function(assert) {
            const defaultSetup = this.storage.getDefaultSetup();
            assert.ok(this.storage.isSetupValidObj(defaultSetup), "Default setup should be valid");
        });

        QUnit.test("Store and retrieve setup", function(assert) {
            // Modify a setting
            this.storage.gameSetup.aiLevel = CONSTS.AI_EVIL;
            this.storage.gameSetup.sound = false;

            // Store it
            assert.ok(this.storage.storeSetup(), "Should store successfully");

            // Create a new instance that should load the stored settings
            const newStorage = new GameStorage();
            assert.equal(newStorage.gameSetup.aiLevel, CONSTS.AI_EVIL, "Should retrieve stored aiLevel");
            assert.equal(newStorage.gameSetup.sound, false, "Should retrieve stored sound setting");
        });

        QUnit.test("Setup validation", function(assert) {
            // Valid setup (from default)
            const validSetup = this.storage.getDefaultSetup();
            assert.ok(this.storage.isSetupValidObj(validSetup), "Default setup should be valid");

            // Invalid setup - no enabled players
            const invalidSetup1 = { ...validSetup, playerTypes: [CONSTS.PLAYER_OFF, CONSTS.PLAYER_OFF, CONSTS.PLAYER_OFF, CONSTS.PLAYER_OFF] };
            assert.notOk(this.storage.isSetupValidObj(invalidSetup1), "Setup with no enabled players should be invalid");

            // Invalid setup - no human players
            const invalidSetup2 = { ...validSetup, playerTypes: [CONSTS.PLAYER_AI, CONSTS.PLAYER_AI, CONSTS.PLAYER_OFF, CONSTS.PLAYER_OFF] };
            assert.notOk(this.storage.isSetupValidObj(invalidSetup2), "Setup with no human players should be invalid");

            // Invalid setup - only one player
            const invalidSetup3 = { ...validSetup, playerTypes: [CONSTS.PLAYER_HUMAN_SET, CONSTS.PLAYER_OFF, CONSTS.PLAYER_OFF, CONSTS.PLAYER_OFF] };
            assert.notOk(this.storage.isSetupValidObj(invalidSetup3), "Setup with only one player should be invalid");
        });

        QUnit.test("Reset to default setup", function(assert) {
            // Modify setup
            this.storage.gameSetup.aiLevel = CONSTS.AI_EVIL;
            this.storage.gameSetup.sound = false;

            // Reset to default
            this.storage.setDefaultSetup();

            // Check that values are reset
            assert.equal(this.storage.gameSetup.aiLevel, CONSTS.AI_NICE, "aiLevel should be reset to default");
            assert.equal(this.storage.gameSetup.sound, true, "sound should be reset to default");
        });

        // Add tests for the new methods
        QUnit.test("Get and set setup properties", function(assert) {
            assert.equal(this.storage.getSetupProperty('aiLevel', null), CONSTS.AI_NICE, "Should get aiLevel");
            assert.equal(this.storage.getSetupProperty('nonExistentProp', 'default'), 'default', "Should return default for missing properties");

            this.storage.setSetupProperty('aiLevel', CONSTS.AI_EVIL);
            assert.equal(this.storage.gameSetup.aiLevel, CONSTS.AI_EVIL, "Should set aiLevel");
        });

        QUnit.test("Export and import settings", function(assert) {
            // Modify setup
            this.storage.gameSetup.aiLevel = CONSTS.AI_EVIL;
            this.storage.gameSetup.sound = false;

            // Export to JSON
            const json = this.storage.exportSettings();

            this.storage.setDefaultSetup();

            // Import from JSON
            assert.ok(this.storage.importSettings(json), "Should import successfully");

            // Check imported values
            assert.equal(this.storage.gameSetup.aiLevel, CONSTS.AI_EVIL, "aiLevel should be imported");
            assert.equal(this.storage.gameSetup.sound, false, "sound should be imported");
        });
    }

    return my;
} (GameStorageTests || {}));
