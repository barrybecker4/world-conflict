
var erisk = (function(my) {

    // Helps organize game flow so things are displayed in order taking animation into account.
    var oaatQueue = [];

    // Used to ensure that all animations from previous moves complete before a new one is played
    my.oneAtaTime = function(duration, fn) {
        oaatQueue.push({duration, fn});
        if (oaatQueue.length == 1)
            runOneTask();

        function runOneTask() {
            // start the first scheduled task
            var task = oaatQueue[0];
            task.fn();
            // and wait for it to expire
            setTimeout(function() {
                // task done, remove from queue
                oaatQueue.shift();
                // is there something more to do?
                if (oaatQueue.length)
                    runOneTask();
            }, task.duration);
        }
    }

    return my;
}(erisk || {}));
