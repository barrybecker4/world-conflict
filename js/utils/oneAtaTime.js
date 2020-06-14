
// Helps organize game flow so things are displayed in order taking animation into account.
var oaatQueue = [];

export default function oneAtaTime(duration, fn) {
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