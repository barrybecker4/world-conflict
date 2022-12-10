var utils = (function (my) {

    // We may want to substitute a seeded random number generator here
    my.random = () => Math.random();

    // Returns a random number between low (inclusive) and high (exclusive).
    // If low > high then, return low
    my.rint = function(low, high) {
        return (low > high) ? low : Math.floor(low + my.random() * (high - low));
    }

    // Returns an array of integers [low, high).
    my.range = function(low, high) {
        const r = [];
        for (var i = low; i < high; i++)
            r.push(i);
        return r;
    }

    // Identity function (useful as a default for callback accepting functions like min).
    my.identity = function(x) { return x; }

    // Creates a deep copy of an object, handling nested objects and arrays. Depth controls how deep
    // the copy goes - the number of nesting levels that should be replicated.
    my.deepCopy = function(obj, depth) {
        if (!depth || typeof obj != 'object') return obj;

        const isArray = obj.length !== undefined;
        const copy = isArray ? [] : {};
        my.forEachProperty(obj, function(value, key) {
            copy[key] = my.deepCopy(value, depth - 1);
        });
        return copy;
    }

    // Clamps a number - if it's lower than low or higher than high, it's brought into range.
    my.clamp = function(number, low, high) {
        return (number < low) ? low : ((number > high) ? high : number);
    }

    my.lerp = function(alpha, from, to) {
        alpha = my.clamp(alpha, 0, 1);
        return to * alpha + from * (1 - alpha);
    }

    // Treats a given text as a template, replacing 'X' with the second parameter.
    my.template = function(text, replacement) {
        return text.replace(/X/g, replacement);
    }

    // Iterates over all properties of an object, and calls the callback with (value, propertyName).
    my.forEachProperty = function (obj, fn) {
        const isArray = Array.isArray(obj)
        for (const property in obj)
            fn(obj[property], isArray ? +property : property);
    }

    // Iterates over a rectangle (x1, y1) - (x2, y2), and calls fn with (x, y) of each integer point.
    my.for2d = function(x1, x2, y1, y2, fn) {
        my.range(x1, x2).map((x) => {
            my.range(y1, y2).map(y => fn(x, y));
        });
    }

    my.sleep = function(millis) {
      return new Promise(resolve => setTimeout(resolve, millis));
    }

    return my;
} (utils || {}));

