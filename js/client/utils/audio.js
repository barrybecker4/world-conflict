
var audio = (function(my) {
    const audioCtx = window.AudioContext && new AudioContext();
    const soundMap = {};

    my.setupAudio = function() {
        if (!audioCtx) // do we have WebAudio?
            return;

        soundMap['CLICK'] = makeBuffer(adsr(0.01, 0.03, 0.01, 0.01, 0.2,
            wSin(110)
        ), 0.1);
        soundMap['ENEMY_DEAD'] = makeBuffer(adsr(0.01, 0.05, 0.05, 0.05, 0.5,
            wSlide(1.0, 0.3, 0.1, wSin(300))
        ), 0.2, 0.6);
        soundMap['OURS_DEAD'] = makeBuffer(adsr(0.01, 0.05, 0.05, 0.05, 0.5,
            wSlide(1.0, 0.3, 0.1, wSin(200))
        ), 0.2, 0.6);
        soundMap['TAKE_OVER'] = makeBuffer(wNotes([
            {t:0, p:261, d:1}, {t:0.1, p:329, d:2}     // C-E
        ]), 0.6, 0.2);
        soundMap['VICTORY'] = makeBuffer(wNotes([
            {t:0, p:261,d:1}, {t:0.0, p:329, d:2}, {t:0.0, p:392, d:3},     // C-E-G
            {t:0.2, p:261,d:1}, {t:0.2, p:349, d:2}, {t:0.2, p:440, d:3}    // C-F-A
        ]), 0.6, 0.2);
        soundMap['DEFEAT'] = makeBuffer(wNotes([
            {t:0, p:392, d:3},{t:0.15, p:329, d: 2}, {t:0.3, p:261, d:1}
        ]), 0.6, 0.2);

        // update the mute button
        updateSoundControls();
    }

    my.playSound = function(soundKey) {
        const sound = soundMap[soundKey];
        let soundEnabled = sound && storage.gameSetup.sound;
        if (!soundEnabled)
            return;

        var source = audioCtx.createBufferSource();
        source.buffer = sound;
        source.connect(audioCtx.destination);
        source.start();
    }

    my.toggleSound = function() {
        storage.gameSetup.sound = !storage.gameSetup.sound;
        updateSoundControls();
    }

    function updateSoundControls() {
        domUtils.$('sound').innerHTML = storage.gameSetup.sound ? '♪' : ' ';
        storage.storeSetup();
    }

    function adsr(a, d, s, r, sl, fn) {
        var t = 0.0;
        return function(dt) {
            var f = fn(dt);
            t += dt;

            if (t < a)
                return utils.lerp(t / a, 0, 1) * f;
            if (t < a + d)
                return utils.lerp((t - a) / d, 1, sl) * f;
            if (t < a + d + s)
                return sl * f;
            return utils.lerp((t - a - s - d) / r, sl, 0) * f;
        }
    }

    function wSin(pitch) {
        var t = 0.0;
        return function(dt) {
            t += dt;
            return Math.sin(t * pitch * 6.283);
        }
    }

    function wSlide(from, to, time, fn) {
        var t = 0.0;
        return function(dt) {
            t += dt;
            var passedDT = dt * utils.lerp(t / time, from, to);
            return fn(passedDT);
        }
    }

    function wRamp(from, to, after, fn) {
        var t = 0.0;
        return function(dt) {
            t += dt;
            return fn(t > after ? dt * to : dt * from);
        }
    }

    function wNotes(notes) {
        notes.map(function(note) {
            note.f = adsr(0.01, 0.03, 0.03 * note.d, 0.03 * note.d, 0.7, wSin(note.p));
        });
        var t = 0.0;
        return function(dt) {
            t += dt;
            var v = 0.0;
            notes.map(function(note) {
                if (t >= note.t)
                    v += note.f(dt);
            });
            return v;
        }
    }

    function makeBuffer(fn, len, vol) {
        var vol = vol || 1;

        var sampleRate = audioCtx.sampleRate;
        var samples = sampleRate * len;
        var buffer = audioCtx.createBuffer(1, samples, sampleRate);

        var dt = 1 / sampleRate;
        var bufferData = buffer.getChannelData(0);
        for (var i = 0; i < samples; i++) {
            bufferData[i] = fn(dt) * vol;
        }

        return buffer;
    }

    return my;
}(audio || {}));
