var AppStateTests = (function (my) {

    my.runTests = function(QUnit) {

        QUnit.module("AppState:");

        QUnit.test("Create AppState instance", function(assert) {
            // Create a test instance
            const testState = new AppState();
            assert.ok(testState, "Should create AppState instance");
            assert.equal(testState.getCurrentState(), testState.STATES.NOT_STARTED,
                        "New instance should start in NOT_STARTED state");
        });

        QUnit.test("State transitions in isolated instance", function(assert) {
            const state = new AppState();

            // Test basic transitions
            assert.ok(state.setInSetup(), "Should transition to SETUP_SCREEN");
            assert.equal(state.getCurrentState(), state.STATES.SETUP_SCREEN, "Current state should be SETUP_SCREEN");

            assert.ok(state.setInOpenGamesDialog(), "Should transition to OPEN_GAMES_DIALOG");
            assert.equal(state.getCurrentState(), state.STATES.OPEN_GAMES_DIALOG, "Current state should be OPEN_GAMES_DIALOG");

            // Test invalid transition
            state.reset();
            assert.notOk(state.setInGame(), "Should not allow invalid transition");
            assert.equal(state.getCurrentState(), state.STATES.NOT_STARTED, "State should remain unchanged");
        });

        QUnit.test("History tracking in isolated instance", function(assert) {
            const state = new AppState();

            state.setInSetup();
            state.setInOpenGamesDialog();
            state.setInSetup();

            const history = state.getStateHistory();
            assert.equal(history.length, 3, "History should have 3 entries");
            assert.equal(history[0].from, state.STATES.NOT_STARTED, "First transition should be from NOT_STARTED");
            assert.equal(history[0].to, state.STATES.SETUP_SCREEN, "First transition should be to SETUP_SCREEN");
        });

        QUnit.test("Complete game flow in isolated instance", function(assert) {
            const state = new AppState();

            // Full game flow
            assert.ok(state.setInSetup(), "Setup");
            assert.ok(state.setWaitingForPlayersToJoin(), "Wait for players");
            assert.ok(state.setInGame(), "Game start");
            assert.ok(state.setWaitingForPlayersToMove(), "Wait for moves");
            assert.ok(state.setInGame(), "Back to game");
            assert.ok(state.setWaitingForPlayersToMove(), "Wait again");
            assert.ok(state.setInGame(), "Back to game again");
            assert.ok(state.setInSetup(), "End game");

            assert.equal(state.getCurrentState(), state.STATES.SETUP_SCREEN, "Should end in SETUP_SCREEN");
            assert.equal(state.getStateHistory().length, 8, "Should have 8 transitions");
        });
    }

    return my;
} (AppStateTests || {}));